// Recebimento direto pela Cloudflare Email Routing (sem Google Apps Script).
// Trata MIME text/plain, multipart e transfer encoding com limites estritos.
// Nenhum corpo de email nem valores financeiros sao persistidos.
import { verificarMensagemLocaliza } from "./localizaEmail.js";
import { receberEmailDoCloudflare } from "./contingenciaApi.js";

const maxBytes=128*1024;
const norm=s=>String(s||"").trim().toLowerCase();
function headerParse(raw){
 const lines=raw.replace(/\r\n?/g,"\n").split("\n"),h={};
 let key="";
 for(const line of lines){
   if(/^[ \t]/.test(line)&&key){h[key]+=" "+line.trim();continue;}
   const m=line.match(/^([a-z0-9-]+)\s*:\s*(.*)$/i);
   if(m){key=m[1].toLowerCase();h[key]=m[2];} else key="";
 }
 return h;
}
function splitHeaders(raw){
 const m=raw.match(/\r?\n\r?\n/);
 if(!m)return {headers:{},body:raw};
 return {headers:headerParse(raw.slice(0,m.index)),body:raw.slice(m.index+m[0].length)};
}
function decodeTransfer(body,encoding,charset="utf-8"){
 const encodingName=norm(encoding);
 let bytes;
 if(encodingName==="base64"){
   const cleaned=body.replace(/\s/g,"");
   if(!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)||cleaned.length>maxBytes*2)throw Error("MIME base64 invalido");
   const raw=atob(cleaned);
   bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
 }else if(encodingName==="quoted-printable"){
   const soft=body.replace(/=\r?\n/g,"");
   const list=[];
   for(let i=0;i<soft.length;i++){
     const pair=soft.slice(i+1,i+3);
     if(soft[i]==="="&&/^[0-9A-F]{2}$/i.test(pair)){
       list.push(parseInt(pair,16));i+=2;
     }else{
       const cp=soft.charCodeAt(i);
       if(cp<128)list.push(cp);
       else list.push(...new TextEncoder().encode(soft[i]));
     }
   }
   bytes=Uint8Array.from(list);
 }else{
   return body;
 }
 const safeCharset=/^[\w-]{1,32}$/i.test(charset)?charset:"utf-8";
 try{return new TextDecoder(safeCharset).decode(bytes);}
 catch{return new TextDecoder("utf-8").decode(bytes);}
}
function typeInfo(contentType){
 const s=String(contentType||"text/plain");
 const type=s.split(";")[0].trim().toLowerCase();
 const boundary=s.match(/boundary\s*=\s*(?:"([^"]+)"|'([^']+)'|([^;\s]+))/i);
 const charset=s.match(/charset\s*=\s*(?:"([^"]+)"|'([^']+)'|([^;\s]+))/i);
 return {type,boundary:(boundary?.[1]||boundary?.[2]||boundary?.[3]||"").trim(),
  charset:(charset?.[1]||charset?.[2]||charset?.[3]||"utf-8").trim()};
}
export function htmlText(html){
 return html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,"")
   .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,"")
   .replace(/<(?:br|\/tr|\/p|\/div|\/li|\/table)\b[^>]*>/gi,"\n")
   .replace(/<\/t[dh]>/gi,"\n")
   .replace(/<[^>]+>/g,"")
   .replace(/&nbsp;|&#160;/gi," ")
   .replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">")
   .replace(/&#(\d+);/g,(_,v)=>String.fromCodePoint(Math.min(65535,Number(v))));
}
function parsePart(raw,depth=0){
 if(depth>4)return null;
 const {headers,body}=splitHeaders(raw);
 const info=typeInfo(headers["content-type"]);
 if(info.type.startsWith("multipart/")&&info.boundary){
  if(info.boundary.length>120)return null;
  const marker="--"+info.boundary;
  const normalized=body.replace(/\r\n/g,"\n").split("\n");
  const parts=[];let current=[],active=false;
  for(const line of normalized){
   if(line===marker||line===marker+"--"){
    if(active&&current.length)parts.push(current.join("\n"));
    current=[];active=line!==marker+"--";
   }else if(active)current.push(line);
  }
  if(active&&current.length)parts.push(current.join("\n"));
  const vals=parts.slice(0,24).map(p=>parsePart(p,depth+1)).filter(Boolean);
  return vals.find(v=>v.isPlain)||vals[0]||null;
 }
 if(info.type!=="text/plain"&&info.type!=="text/html")return null;
 const encoding=headers["content-transfer-encoding"];
 const decoded=decodeTransfer(body,encoding,info.charset);
 return {isPlain:info.type==="text/plain",text:info.type==="text/html"?htmlText(decoded):decoded};
}
function extractMime(raw){
 const parsed=parsePart(raw);
 return parsed?.text?.trim().slice(0,26000)||"";
}
export async function processarEmailRouting(message,env){
 if(env.ENVIRONMENT!=="homologacao"||!env.DB)return "EMAIL_SEM_CONFIGURACAO";
 const configured=norm(env.CT_EMAIL_INBOUND_TO);
 if(!configured||!configured.includes("@"))return "EMAIL_SEM_CONFIGURACAO";
 if(norm(message.to)!==configured)return "DESTINATARIO_DIFERENTE";
 const mimeFrom=message.headers.get("from")||"";
 const subject=message.headers.get("subject")||"";
 const source=norm(mimeFrom);
 const isVerify=/(?:^|<)forwarding-noreply@google\.com>?/.test(source)||
                /(gmail forwarding confirmation)/i.test(subject)&&source.includes("@google.com");
 if(isVerify){
  const dest=norm(env.CT_EMAIL_VERIFY_FORWARD_TO);
  if(dest&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dest)&&typeof message.forward==="function"){
    await message.forward(dest);
  }
  return "VERIFICACAO_GOOGLE";
 }
 if(!verificarMensagemLocaliza(mimeFrom,subject))return "REMETENTE_OU_ASSUNTO_DIFERENTE";
 if(message.rawSize>maxBytes)throw Error("Email excede limite de tamanho para importacao");
 const raw=await new Response(message.raw).text();
 if(raw.length>maxBytes*2)throw Error("Email muito grande");
 const texto=extractMime(raw);
 if(!texto)throw Error("Email Localiza sem texto");
 // ID opaco para nao gravar cabecalhos brutos ou dados pessoais no D1.
 const digest=await crypto.subtle.digest("SHA-256",
  new TextEncoder().encode(message.headers.get("message-id")||raw.slice(0,8000)));
 const message_id="eml-"+[...new Uint8Array(digest)].slice(0,16)
  .map(v=>v.toString(16).padStart(2,"0")).join("");
 const match=texto.match(/Ag[eê]ncia da Abertura\s*:\s*([A-Z0-9]+)/i);
 const agency=String(match?.[1]||"").toUpperCase();
 const loja_codigo=agency==="ACSMC"?"MOOCA":agency==="ACUCP"?"CENTRAL_PLAZA":null;
 if(!loja_codigo)throw Error("Agencia sem mapeamento; nao importar na loja errada");
 const dateHeader=Date.parse(message.headers.get("date")||"");
 const receivedDate=Number.isFinite(dateHeader)&&dateHeader>Date.now()-14*86400000&&dateHeader<=Date.now()+60000?
   new Date(dateHeader).toISOString():new Date().toISOString();
 const result=await receberEmailDoCloudflare({
  remetente:mimeFrom,assunto:subject,message_id,
  texto,loja_codigo,recebido_em:receivedDate
 },env);
 if(!result.sucesso)throw Error("Importacao negada: "+String(result.erro||"falha").slice(0,100));
 // Nao registrar numero SL, placa, email, corpo ou valores nos logs.
 console.log("LavaFast Email Routing: processado, novos="+result.criados+", duplicados="+result.duplicados);
 return result.criados>0?"CARDS_CRIADOS":"SL_DUPLICADA";
}
