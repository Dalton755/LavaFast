/**
 * LavaFast — Gmail -> Cloudflare D1
 * Verifica novas mensagens da Localiza automaticamente a cada 1 minuto.
 * Nao depende de Supabase, Render ou Vercel.
 *
 * Script Properties OBRIGATORIAS:
 *   LAVAFAST_CT_URL = https://lavafast.rochadalton00.workers.dev/api/contingencia/email/relay
 *   LAVAFAST_CT_EMAIL_SECRET = mesmo Secret CT_EMAIL_RELAY_SECRET do Worker.
 *
 * Executar instalarLavaFastCT() UMA vez na conta Gmail QUE RECEBE as SLs.
 * A primeira instalacao tambem recupera mensagens das ultimas 24h.
 * Apenas emails com remetente no-reply@localiza.com, assunto exato
 * "Solicitacao de Lavagem", agencia ACSMC / ACUCP.
 *
 * Nunca registrar texto integral do email, valores, CPFs ou segredos.
 * Duplicacao impedida no banco Cloudflare pelo numero unico da SL.
 */
const CT_PROPS = PropertiesService.getScriptProperties();
const CT_URL_ESPERADA = "https://lavafast.rochadalton00.workers.dev/api/contingencia/email/relay";
const CT_REMETENTE = "no-reply@localiza.com";
const CT_ATRASO_SEGURANCA_MS = 6 * 3600000;
const CT_JANELA_MAXIMA_MS = 14 * 86400000;
const CT_MAXIMO_POR_EXECUCAO = 40;

function ctEnderecoRemetente_(from) {
  const s = String(from || "").trim().toLowerCase();
  const m = s.match(/<([^<>]+)>\s*$/);
  return m ? m[1].trim() : s;
}
function ctAssuntoCorreto_(subject) {
  return String(subject || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .trim().toLowerCase() === "solicitacao de lavagem";
}
function ctAgencia_(text) {
  const match = String(text || "").match(/Ag[eê]ncia da Abertura\s*:\s*([A-Z0-9]+)/i);
  return String(match ? match[1] : "").toUpperCase();
}
function ctLoja_(codigo) {
  return codigo === "ACSMC" ? "MOOCA" :
    codigo === "ACUCP" ? "CENTRAL_PLAZA" : null;
}
function ctValidarConfiguracao_() {
  const url = CT_PROPS.getProperty("LAVAFAST_CT_URL");
  const secret = CT_PROPS.getProperty("LAVAFAST_CT_EMAIL_SECRET");
  if(url !== CT_URL_ESPERADA)throw Error("Configure LAVAFAST_CT_URL exatamente como no guia.");
  if(!secret || secret.length < 32)throw Error("Configure LAVAFAST_CT_EMAIL_SECRET com 32+ caracteres.");
  return {url,secret};
}

function instalarLavaFastCT() {
  ctValidarConfiguracao_();
  if(!CT_PROPS.getProperty("CT_INICIO_MS")) {
    // Recuperacao controlada: somente ultimas 24 horas na primeira instalacao.
    CT_PROPS.setProperty("CT_INICIO_MS", String(Date.now() - 86400000));
  }
  for(const t of ScriptApp.getProjectTriggers()) {
    if(t.getHandlerFunction() === "sincronizarEmailLavaFastCT")ScriptApp.deleteTrigger(t);
  }
  ScriptApp.newTrigger("sincronizarEmailLavaFastCT").timeBased().everyMinutes(1).create();
  Logger.log("LavaFast CT instalado. Verificacao automatica a cada 1 minuto.");
  // Diagnostico inicial; se o Worker ainda nao estiver pronto, o trigger
  // continua instalado e tentara novamente.
  sincronizarEmailLavaFastCT();
}

function sincronizarEmailLavaFastCT() {
  const lock = LockService.getScriptLock();
  if(!lock.tryLock(5000))return;
  try {
    const config = ctValidarConfiguracao_();
    const inicio = Number(CT_PROPS.getProperty("CT_INICIO_MS"));
    if(!Number.isFinite(inicio) || inicio <= 0)throw Error("Execute instalarLavaFastCT primeiro.");
    const limite = Date.now() - CT_JANELA_MAXIMA_MS;
    const ultimaConcluida = Number(CT_PROPS.getProperty("CT_ULTIMA_BUSCA_OK_MS") || 0);
    const recuo = ultimaConcluida > 0 ? ultimaConcluida - CT_ATRASO_SEGURANCA_MS : inicio;
    const desde = Math.max(inicio,limite,recuo);
    const query='from:'+CT_REMETENTE+' subject:"Solicitação de Lavagem" after:'+Math.floor((desde-60000)/1000);

    const mensagens = [];
    // Examina em paginas para evitar perda quando houver muitos emails.
    for(let inicioPagina = 0; inicioPagina < 500; inicioPagina += 100) {
      const threads = GmailApp.search(query,inicioPagina,100);
      for(const thread of threads) {
        for(const msg of thread.getMessages()) {
          if(msg.getDate().getTime() < desde)continue;
          if(ctEnderecoRemetente_(msg.getFrom()) !== CT_REMETENTE)continue;
          if(!ctAssuntoCorreto_(msg.getSubject()))continue;
          if(CT_PROPS.getProperty("CT_SENT_"+msg.getId()))continue;
          mensagens.push(msg);
        }
      }
      if(threads.length < 100)break;
    }
    mensagens.sort((a,b)=>a.getDate().getTime()-b.getDate().getTime());

    let importados=0,duplicados=0,erros=0,ignorados=0;
    for(const msg of mensagens.slice(0,CT_MAXIMO_POR_EXECUCAO)) {
      const texto=String(msg.getPlainBody()||"");
      const loja=ctLoja_(ctAgencia_(texto));
      if(!loja){ignorados++;continue;} // agencia fora das lojas atendidas

      const payload={
        loja_codigo:loja,
        texto:texto.slice(0,26000),
        message_id:msg.getId(),
        recebido_em:msg.getDate().toISOString(),
        remetente:msg.getFrom(),
        assunto:msg.getSubject()
      };
      try {
        const resposta=UrlFetchApp.fetch(config.url,{
          method:"post",contentType:"application/json; charset=utf-8",
          headers:{"x-lavafast-relay":config.secret},
          payload:JSON.stringify(payload),
          muteHttpExceptions:true
        });
        const status=resposta.getResponseCode();
        const data=JSON.parse(resposta.getContentText()||"{}");
        if(status >= 200 && status < 300 && data.sucesso===true && data.encontrados>0) {
          CT_PROPS.setProperty("CT_SENT_"+msg.getId(),String(Date.now()));
          importados += Number(data.criados)||0;
          duplicados += Number(data.duplicados)||0;
        }else{
          erros++;
          Logger.log("Email CT nao aceito. HTTP "+status+". MsgId "+msg.getId());
          if(status===401||status===403||status===503)break; // configuracao falhou, nao sobrecarregar
        }
      }catch(err){
        erros++;
        Logger.log("Email CT falhou para MsgId "+msg.getId()+" (repetira).");
      }
    }
    CT_PROPS.setProperty("CT_ULTIMA_VERIFICACAO_MS",String(Date.now()));
    // So avanca cursor quando nao houver fila pendente nem falhas.
    if(erros===0 && mensagens.length<=CT_MAXIMO_POR_EXECUCAO) {
      CT_PROPS.setProperty("CT_ULTIMA_BUSCA_OK_MS",String(Date.now()));
    }

    // Evita estourar o limite de propriedades do Apps Script.
    const limitePropriedades=Date.now()-2*86400000;
    for(const [key,val] of Object.entries(CT_PROPS.getProperties())) {
      if(key.startsWith("CT_SENT_") && Number(val)<limitePropriedades)
        CT_PROPS.deleteProperty(key);
    }
    Logger.log("LavaFast Gmail: novos cards="+importados+", SLs duplicadas="+duplicados+
      ", falhas="+erros+", agencias desconhecidas="+ignorados+
      ", pendentes examinados="+mensagens.length);
  }finally{lock.releaseLock();}
}

function recuperarUltimas24hLavaFastCT() {
  ctValidarConfiguracao_();
  // Acao MANUAL e segura: recupera mensagens recentes respeitando a
  // restricao de SL unica no D1. Nao reabre lavagens concluidas.
  CT_PROPS.setProperty("CT_INICIO_MS", String(Date.now()-86400000));
  CT_PROPS.deleteProperty("CT_ULTIMA_BUSCA_OK_MS");
  sincronizarEmailLavaFastCT();
}

function pararLavaFastCT() {
  for(const trigger of ScriptApp.getProjectTriggers()) {
    if(trigger.getHandlerFunction()==="sincronizarEmailLavaFastCT")
      ScriptApp.deleteTrigger(trigger);
  }
  Logger.log("Sincronizacao de e-mails suspensa; cards D1 preservados.");
}
