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

// Assuntos recebidos de SMTP podem chegar em RFC 2047 (=?utf-8?B?...?=).
// Esse e exatamente o formato dos e-mails reais de solicitacao Localiza.
// Decodificar APENAS o campo de assunto, sem alterar as regras de privacidade.
export function decodificarAssuntoMime(value) {
 if (typeof value !== "string" || value.length > 512) return "";
 const unfolded=value.replace(/\r?\n[ \t]+/g," ");
 return unfolded.replace(/=\?([a-z0-9_-]{2,32})\?([bq])\?([^?]{1,512})\?=/gi,
  (whole,charset,kind,content)=>{
   try {
    let bytes;
    if(kind.toLowerCase()==="b"){
      if(!/^[A-Za-z0-9+/]*={0,2}$/.test(content))return whole;
      const latin=atob(content);
      bytes=Uint8Array.from(latin,ch=>ch.charCodeAt(0));
    }else{
      const arr=[];
      const q=content.replace(/_/g," ");
      for(let i=0;i<q.length;i++){
       if(q[i]==="="&&/^[0-9a-f]{2}$/i.test(q.slice(i+1,i+3))){
        arr.push(parseInt(q.slice(i+1,i+3),16));i+=2;
       }else arr.push(q.charCodeAt(i));
      }
      bytes=new Uint8Array(arr);
    }
    return new TextDecoder(charset).decode(bytes);
   } catch {return whole;}
  }).replace(/(\S)\s+(?=\S)/g,"$1 ");
}

export function verificarMensagemLocaliza(remetente, assunto) {
  if(normalizarRemetente(remetente)!=="no-reply@localiza.com")return false;
  if(typeof assunto!=="string"||assunto.length>200)return false;
  const subject=decodificarAssuntoMime(assunto).normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
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
