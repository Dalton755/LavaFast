/**
 * LavaFast Contingencia — encaminha email Gmail para Cloudflare sem Supabase.
 * Google Apps Script vinculado a CONTA QUE RECEBE as SLs.
 *
 * Antes de executar, criar estas Script Properties (segredos nao entram em codigo):
 * LAVAFAST_CT_URL = https://lavafast.rochadalton00.workers.dev/api/contingencia/email/relay
 * LAVAFAST_CT_EMAIL_SECRET = mesmo valor do CT_EMAIL_RELAY_SECRET do Worker
 *
 * 1) Executar instalarLavaFastCT() uma vez (autorizando Gmail e UrlFetch).
 * 2) Um gatilho a cada 5 minutos verifica apenas emails NOVOS apos a instalacao.
 * 3) SL duplicada e ignorada pelo banco D1, com indice UNIQUE.
 *
 * Ao instalar, registra a data inicial. Para recuperar SLs antigas,
 * use a opcao "Importar e-mail" no aplicativo ou revise o marco manualmente.
 *
 * Nao armazena CPF, senhas, valores de lavagem ou texto completo de email.
 */
const PROPS=PropertiesService.getScriptProperties();
const QUERY="from:no-reply@localiza.com newer_than:4d";

function instalarLavaFastCT() {
  const url=PROPS.getProperty("LAVAFAST_CT_URL");
  const secret=PROPS.getProperty("LAVAFAST_CT_EMAIL_SECRET");
  if(!url||!/^https:\/\/[^/]+\/api\/contingencia\/email\/relay$/.test(url)){
    throw new Error("Configure LAVAFAST_CT_URL em Script Properties.");
  }
  if(!secret||secret.length<32){
    throw new Error("Configure LAVAFAST_CT_EMAIL_SECRET com 32+ caracteres.");
  }
  if(!PROPS.getProperty("CT_INICIO_MS"))PROPS.setProperty("CT_INICIO_MS",String(Date.now()));
  const triggers=ScriptApp.getProjectTriggers();
  for(const t of triggers){
    if(t.getHandlerFunction()==="sincronizarEmailLavaFastCT")ScriptApp.deleteTrigger(t);
  }
  ScriptApp.newTrigger("sincronizarEmailLavaFastCT").timeBased().everyMinutes(5).create();
  Logger.log("LavaFast CT instalado: verifica novas mensagens a cada 5 minutos.");
}

function sincronizarEmailLavaFastCT(){
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(1000))return;
  try{
    const url=PROPS.getProperty("LAVAFAST_CT_URL");
    const secret=PROPS.getProperty("LAVAFAST_CT_EMAIL_SECRET");
    const start=Number(PROPS.getProperty("CT_INICIO_MS"));
    if(!url||!secret||secret.length<32||!Number.isFinite(start)||start<=0)
      throw new Error("Execute instalarLavaFastCT primeiro.");

    const threads=GmailApp.search(QUERY,0,70);
    const messages=[];
    for(const thread of threads){
      for(const m of thread.getMessages()){
        if(m.getDate().getTime()<start)continue;
        const from=String(m.getFrom()||"").toLowerCase();
        // Confira o remetente EXATO, evitando contatos parecidos.
        if(!/(?:^|<)no-reply@localiza\.com(?:>|$)/.test(from))continue;
        if(PROPS.getProperty("CT_SENT_"+m.getId()))continue;
        messages.push(m);
      }
    }
    messages.sort((a,b)=>a.getDate().getTime()-b.getDate().getTime());
    let ok=0,erros=0,ignorado=0;
    for(const m of messages.slice(0,40)){
      const texto=String(m.getPlainBody()||"");
      const match=texto.match(/Ag[eê]ncia da Abertura:\s*([A-Z0-9]+)/i);
      const agencia=String(match?.[1]||"").toUpperCase();
      // Codigo da agencia no app original: ACSMC=Mooca; ACUCP=Central Plaza.
      const loja=agencia==="ACSMC"?"MOOCA":agencia==="ACUCP"?"CENTRAL_PLAZA":null;
      if(!loja){ignorado++;continue;}
      const payload=JSON.stringify({
        loja_codigo:loja,
        texto:texto.slice(0,26000),
        message_id:m.getId()
      });
      try{
        const resp=UrlFetchApp.fetch(url,{
          method:"post",
          contentType:"application/json",
          headers:{"x-lavafast-relay":secret},
          payload,
          muteHttpExceptions:true
        });
        if(resp.getResponseCode()>=200&&resp.getResponseCode()<300){
          PROPS.setProperty("CT_SENT_"+m.getId(),String(Date.now()));
          ok++;
        }else{
          erros++;Logger.log("Falha de entrega HTTP "+resp.getResponseCode());
        }
      }catch(err){erros++;Logger.log("Falha de rede ao entregar mensagem.");}
    }
    // Limita crescimento das Script Properties: guarda 7 dias de deduplicacao.
    for(const [key,value] of Object.entries(PROPS.getProperties())){
      if(key.startsWith("CT_SENT_")&&Date.now()-Number(value)>7*86400000){
        PROPS.deleteProperty(key);
      }
    }
    Logger.log("Novas mensagens processadas: "+ok+"; falhas: "+erros+"; agencias desconhecidas: "+ignorado);
  }finally{lock.releaseLock();}
}

function pararLavaFastCT(){
  for(const t of ScriptApp.getProjectTriggers()){
    if(t.getHandlerFunction()==="sincronizarEmailLavaFastCT")ScriptApp.deleteTrigger(t);
  }
  Logger.log("Gatilhos da contingencia removidos. Dados do D1 foram preservados.");
}
