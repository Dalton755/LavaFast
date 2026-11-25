// Extrator OPERACIONAL dos e-mails Localiza.
// Inspirado no parser anterior do LavaFast, sem capturar ou armazenar valores.
// Nao confie em dados de agencia fornecidos pelo navegador: confira o corpo.
const regexNumero = /^\d{7,12}$/;
const regexPlaca = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/i;
const mapAgencias = Object.freeze({ ACSMC:"MOOCA", ACUCP:"CENTRAL_PLAZA" });

export function normalizarRemetente(from) {
  if(typeof from!=="string" || from.length>256)return "";
  const matches=from.match(/<([^<>]+)>\s*$/);
  return (matches ? matches[1] : from).trim().toLowerCase();
}

export function verificarMensagemLocaliza(remetente, assunto) {
  if(normalizarRemetente(remetente)!=="no-reply@localiza.com")return false;
  if(typeof assunto!=="string"||assunto.length>200)return false;
  const subject=assunto.normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
  return subject==="solicitacao de lavagem";
}

export function extrairSolicitacoesLocaliza(raw) {
  const texto=String(raw||"").replace(/\u00a0/g," ").replace(/\*/g,"").replace(/\r/g,"");
  const agencia=texto.match(/Ag[eê]ncia da Abertura\s*:\s*([A-Z0-9]+)/i)?.[1]?.toUpperCase()||"";
  const loja_codigo=mapAgencias[agencia]||null;
  const linhas=texto.split("\n").map(s=>s.trim()).filter(Boolean);
  const veiculos=[];
  const vistos=new Set();
  for(let i=0;i<linhas.length;i++){
    let sl=null,placa=null;
    const mesma=linhas[i].match(/^(\d{7,12})\s+([A-Z]{3}[0-9][A-Z0-9][0-9]{2})(?:\s|$)/i);
    if(mesma){sl=mesma[1];placa=mesma[2];}
    else if(regexNumero.test(linhas[i])&&regexPlaca.test(linhas[i+1]||"")){
      sl=linhas[i];placa=linhas[i+1];
    }
    if(!sl||vistos.has(sl))continue;
    vistos.add(sl);
    // Apenas identificadores operacionais. Nunca trazer R$, valores ou dados
    // sensiveis do texto do e-mail para o banco ou resposta dos cards.
    veiculos.push({numero:sl,placa:placa.toUpperCase()});
    if(veiculos.length>=100)break;
  }
  return {agencia,loja_codigo,veiculos};
}
