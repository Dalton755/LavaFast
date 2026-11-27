// Gmail API -> Cloudflare D1. OAuth da propria conta de operacao.
// Nao ha Apps Script, credenciais em codigo, dependencias npm ou Supabase.
// Escopo somente leitura. Token de renovacao criptografado AES-GCM no D1.
import { verificarMensagemLocaliza } from "./localizaEmail.js";
import { htmlText } from "./emailRouting.js";
import { receberEmailDoCloudflare, verificarGestorContingencia } from "./contingenciaApi.js";

const PREFIX="/api/contingencia/gmail";
const REDIRECT="https://lavafast.rochadalton00.workers.dev"+PREFIX+"/callback";
const SCOPE="https://www.googleapis.com/auth/gmail.readonly";
const enc=new TextEncoder();
const dec=new TextDecoder();
const json=(o,status=200)=>new Response(JSON.stringify(o),{status,headers:{
 "content-type":"application/json; charset=utf-8","cache-control":"no-store",
 "x-content-type-options":"nosniff","referrer-policy":"no-referrer"}});
const redirect=status=>new Response(null,{status:303,headers:{
 "location":"/contingencia?gmail="+encodeURIComponent(status),
 "cache-control":"no-store","referrer-policy":"no-referrer"}});
const norm=x=>String(x||"").trim().toLowerCase();
const configured=env=>env.ENVIRONMENT==="homologacao"&&!!env.DB&&
 typeof env.CT_GMAIL_CLIENT_ID==="string"&&/\.apps\.googleusercontent\.com$/.test(env.CT_GMAIL_CLIENT_ID)&&
 typeof env.CT_GMAIL_CLIENT_SECRET==="string"&&env.CT_GMAIL_CLIENT_SECRET.length>=8&&
 typeof env.CT_GMAIL_TOKEN_KEY==="string"&&env.CT_GMAIL_TOKEN_KEY.length>=32&&
 /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(norm(env.CT_GMAIL_ALLOWED_EMAIL));
// Diagnostico exclusivo do gestor: nunca retorna valores das credenciais.
function configurationIssues(env){
 const checks=[
  ["CT_GMAIL_CLIENT_ID",v=>typeof v==="string"&&/\.apps\.googleusercontent\.com$/.test(v)],
  ["CT_GMAIL_CLIENT_SECRET",v=>typeof v==="string"&&v.length>=8],
  ["CT_GMAIL_TOKEN_KEY",v=>typeof v==="string"&&v.length>=32],
  ["CT_GMAIL_ALLOWED_EMAIL",v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(norm(v))]
 ];
 const issues=checks.flatMap(([name,valid])=>{
  const v=env[name];
  return valid(v)?[]:[{nome:name,status:v==null||v===""?"ausente":"formato_invalido"}];
 });
 if(env.ENVIRONMENT!=="homologacao")issues.push({nome:"ENVIRONMENT",status:"formato_invalido"});
 if(!env.DB)issues.push({nome:"DB",status:"ausente"});
 return issues;
}
const urlSafe=b=>btoa(Array.from(b,x=>String.fromCharCode(x)).join("")).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const digest=async s=>new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(s)));
const tokenRandom=()=>urlSafe(crypto.getRandomValues(new Uint8Array(32)));
async function keyFor(env){
 const k=await digest(env.CT_GMAIL_TOKEN_KEY);
 return crypto.subtle.importKey("raw",k,{name:"AES-GCM"},false,["encrypt","decrypt"]);
}
async function seal(text,env){
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const b=await crypto.subtle.encrypt({name:"AES-GCM",iv},await keyFor(env),enc.encode(text));
 return urlSafe(iv)+"."+urlSafe(new Uint8Array(b));
}
function decodeBase64Url(s){
 const b64=String(s||"").replace(/-/g,"+").replace(/_/g,"/");
 if(!/^[A-Za-z0-9+/]*={0,2}$/.test(b64)||b64.length>180000)throw Error("BASE64_INVALID");
 return Uint8Array.from(atob(b64.padEnd(Math.ceil(b64.length/4)*4,"=")),c=>c.charCodeAt(0));
}
async function unseal(cipher,env){
 const parts=String(cipher||"").split(".");
 if(parts.length!==2)throw Error("CHAVE_INVALIDA");
 const raw=await crypto.subtle.decrypt({name:"AES-GCM",iv:decodeBase64Url(parts[0])},
  await keyFor(env),decodeBase64Url(parts[1]));
 return dec.decode(raw);
}
async function ensureState(env){
 await env.DB.prepare("CREATE TABLE IF NOT EXISTS ct_gmail_oauth_states (state_hash TEXT PRIMARY KEY NOT NULL,verifier_encrypted TEXT NOT NULL,gestor_id TEXT NOT NULL REFERENCES ct_funcionarios(id),expira_em TEXT NOT NULL)").run();
}
async function ensureConn(env){
 await env.DB.prepare("CREATE TABLE IF NOT EXISTS ct_gmail_integracao (id TEXT PRIMARY KEY NOT NULL CHECK(id='localiza'),gmail TEXT NOT NULL,refresh_token_encrypted TEXT NOT NULL,conectada_em TEXT NOT NULL,ultima_consulta TEXT,ultimo_sucesso TEXT,ultimo_erro_codigo TEXT,lock_owner TEXT,lock_until TEXT,mensagens_analisadas INTEGER NOT NULL DEFAULT 0,cards_criados INTEGER NOT NULL DEFAULT 0,atualizado_em TEXT NOT NULL)").run();
}
async function row(env){await ensureConn(env);return env.DB.prepare("SELECT * FROM ct_gmail_integracao WHERE id='localiza'").first();}
const getErrorStatus=n=>n===429?"GMAIL_LIMITE":n===403?"GMAIL_ACESSO_NEGADO":
 n===401?"TOKEN_INVALIDO":n>=500?"GMAIL_TEMPORARIO":"GMAIL_HTTP_"+n;
async function googleToken(env,fields){
 const body=new URLSearchParams({...fields,client_id:env.CT_GMAIL_CLIENT_ID,client_secret:env.CT_GMAIL_CLIENT_SECRET});
 const res=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body});
 if(!res.ok){
  const err=await res.json().catch(()=>({}));
  const known={invalid_client:"GOOGLE_CLIENTE_INVALIDO",invalid_grant:"GOOGLE_AUTORIZACAO_INVALIDA",unauthorized_client:"GOOGLE_CLIENTE_NAO_AUTORIZADO",invalid_scope:"ESCOPO_INSUFICIENTE",access_denied:"GOOGLE_ACESSO_NEGADO"};
  throw Error(Object.hasOwn(known,err.error)?known[err.error]:(res.status===400?"GOOGLE_AUTORIZACAO_INVALIDA":getErrorStatus(res.status)));
 }
 const b=await res.json();
 if(typeof b.access_token!=="string")throw Error("GOOGLE_SEM_TOKEN");
 return b;
}
async function gmailRequest(path,accessToken){
 const res=await fetch("https://gmail.googleapis.com/gmail/v1/users/me/"+path,{
  headers:{"authorization":"Bearer "+accessToken,"accept":"application/json"}});
 if(!res.ok){
  const err=await res.json().catch(()=>({}));
  const reasons=[...(err.error?.errors||[]).map(x=>x.reason),...(err.error?.details||[]).map(x=>x.reason)];
  if(reasons.some(x=>["accessNotConfigured","SERVICE_DISABLED","API_DISABLED"].includes(x)))throw Error("GMAIL_API_DESATIVADA");
  if(reasons.some(x=>["insufficientPermissions","ACCESS_TOKEN_SCOPE_INSUFFICIENT"].includes(x)))throw Error("ESCOPO_INSUFICIENTE");
  throw Error(getErrorStatus(res.status));
 }
 return res.json();
}
function extractHeaders(m){
 const hs=m?.payload?.headers||[];
 const h=name=>hs.find(x=>norm(x.name)===name)?.value||"";
 return {from:h("from"),subject:h("subject")};
}
function gmailText(m){
 const parts=[];
 function walk(node,depth=0){
  if(!node||depth>6||parts.length>12)return;
  const media=norm(node.mimeType);
  if(node.body?.data && (media==="text/plain"||media==="text/html")){
   const bytes=decodeBase64Url(node.body.data);
   if(bytes.byteLength>80000)throw Error("EMAIL_GRANDE");
   const texto=dec.decode(bytes);
   parts.push({plain:media==="text/plain",text:media==="text/html"?htmlText(texto):texto});
  }
  for(const p of (node.parts||[]).slice(0,24))walk(p,depth+1);
 }
 walk(m.payload);
 const chosen=parts.find(p=>p.plain)||parts[0];
 return String(chosen?.text||"").slice(0,26000);
}
function statusRow(record){
 return {
  conectado:!!record,gmail:record?.gmail||null,
  conectado_em:record?.conectada_em||null,
  ultima_consulta:record?.ultima_consulta||null,
  ultimo_sucesso:record?.ultimo_sucesso||null,
  ultimo_erro_codigo:record?.ultimo_erro_codigo||null,
  mensagens_analisadas:record?.mensagens_analisadas||0,
  cards_criados:record?.cards_criados||0
 };
}
async function oauthStart(env,u){
 if(!configured(env))return json({erro:"Configure CT_GMAIL_CLIENT_ID, CT_GMAIL_CLIENT_SECRET, CT_GMAIL_TOKEN_KEY e CT_GMAIL_ALLOWED_EMAIL no Worker."},503);
 await ensureState(env);
 const state=tokenRandom(),verifier=tokenRandom()+tokenRandom();
 const challenge=urlSafe(await digest(verifier));
 const expires=new Date(Date.now()+10*60000).toISOString();
 await env.DB.prepare("DELETE FROM ct_gmail_oauth_states WHERE expira_em < ?").bind(new Date().toISOString()).run();
 await env.DB.prepare("INSERT INTO ct_gmail_oauth_states (state_hash,verifier_encrypted,gestor_id,expira_em) VALUES(?,?,?,?)")
  .bind(urlSafe(await digest(state)),await seal(verifier,env),u.id,expires).run();
 const params=new URLSearchParams({
  client_id:env.CT_GMAIL_CLIENT_ID,redirect_uri:REDIRECT,
  response_type:"code",scope:SCOPE,access_type:"offline",prompt:"consent select_account",
  state,code_challenge:challenge,code_challenge_method:"S256",
  login_hint:norm(env.CT_GMAIL_ALLOWED_EMAIL)
 });
 return json({url:"https://accounts.google.com/o/oauth2/v2/auth?"+params.toString()});
}
async function oauthCallback(url,env){
 if(!configured(env))return redirect("configuracao");
 const state=url.searchParams.get("state")||"",code=url.searchParams.get("code")||"";
 const googleError=url.searchParams.get("error");
 if(googleError)return redirect(googleError==="access_denied"?"GOOGLE_ACESSO_NEGADO":"GOOGLE_RETORNO_INVALIDO");
 if(!/^[A-Za-z0-9_-]{30,150}$/.test(state)||!code||code.length>4096)return redirect("invalido");
 let etapa="OAUTH_ESTADO";
 try{
  await ensureState(env);
  const stateHash=urlSafe(await digest(state)),n=new Date().toISOString();
  const saved=await env.DB.prepare("SELECT verifier_encrypted,gestor_id FROM ct_gmail_oauth_states WHERE state_hash=? AND expira_em>?").bind(stateHash,n).first();
  if(!saved)return redirect("expirado");
  const removed=await env.DB.prepare("DELETE FROM ct_gmail_oauth_states WHERE state_hash=? AND expira_em>?").bind(stateHash,n).run();
  if(removed.meta?.changes!==1)return redirect("expirado");
  etapa="OAUTH_GESTOR";
  const gestor=await env.DB.prepare("SELECT cargo,ativo,trocar_senha FROM ct_funcionarios WHERE id=?").bind(saved.gestor_id).first();
  if(!gestor||gestor.ativo!==1||gestor.trocar_senha===1||
    !["C&O","ADMIN","ADMINISTRADOR"].includes(String(gestor.cargo||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toUpperCase()))
    return redirect("gestor_inativo");
  etapa="OAUTH_CHAVE";
  const verifier=await unseal(saved.verifier_encrypted,env);
  etapa="OAUTH_TOKEN";
  const b=await googleToken(env,{grant_type:"authorization_code",code,redirect_uri:REDIRECT,code_verifier:verifier});
  if(!b.refresh_token)throw Error("GOOGLE_SEM_REFRESH_TOKEN");
  if(typeof b.scope==="string"&&!b.scope.split(" ").includes(SCOPE))throw Error("ESCOPO_INSUFICIENTE");
  etapa="OAUTH_PERFIL";
  const profile=await gmailRequest("profile",b.access_token);
  const mail=norm(profile.emailAddress);
  if(mail!==norm(env.CT_GMAIL_ALLOWED_EMAIL))throw Error("CONTA_NAO_PERMITIDA");
  etapa="OAUTH_CRIPTOGRAFIA";
  const encrypted=await seal(b.refresh_token,env),now=new Date().toISOString();
  etapa="OAUTH_D1";
  await ensureConn(env);
  await env.DB.prepare("INSERT INTO ct_gmail_integracao(id,gmail,refresh_token_encrypted,conectada_em,atualizado_em) VALUES('localiza',?,?,?,?) ON CONFLICT(id) DO UPDATE SET gmail=excluded.gmail,refresh_token_encrypted=excluded.refresh_token_encrypted,conectada_em=excluded.conectada_em,ultima_consulta=NULL,ultimo_sucesso=NULL,ultimo_erro_codigo=NULL,lock_owner=NULL,lock_until=NULL,mensagens_analisadas=0,cards_criados=0,atualizado_em=excluded.atualizado_em")
   .bind(mail,encrypted,now,now).run();
  return redirect("conectado");
 }catch(e){
  // Somente codigos fixos, nunca mensagens brutas, tokens ou dados pessoais.
  const allowed=new Set(["GOOGLE_CLIENTE_INVALIDO","GOOGLE_AUTORIZACAO_INVALIDA","GOOGLE_CLIENTE_NAO_AUTORIZADO","GOOGLE_ACESSO_NEGADO","GOOGLE_SEM_TOKEN","GOOGLE_SEM_REFRESH_TOKEN","ESCOPO_INSUFICIENTE","CONTA_NAO_PERMITIDA","GMAIL_API_DESATIVADA","GMAIL_ACESSO_NEGADO","GMAIL_LIMITE","GMAIL_TEMPORARIO","TOKEN_INVALIDO"]);
  const codigo=allowed.has(e?.message)?e.message:etapa;
  console.warn("Gmail OAuth:",codigo);
  return redirect(codigo);
 }
}
export async function sincronizarGmailContingencia(env){
 if(!configured(env))return {sucesso:false,erro:"CONFIGURACAO_PENDENTE"};
 const existing=await row(env);
 if(!existing)return {sucesso:false,erro:"GOOGLE_NAO_CONECTADO"};
 const now=new Date().toISOString(),owner=tokenRandom();
 const lease=new Date(Date.now()+2*60000).toISOString();
 const acquired=await env.DB.prepare("UPDATE ct_gmail_integracao SET lock_owner=?,lock_until=? WHERE id='localiza' AND (lock_until IS NULL OR lock_until<?)")
  .bind(owner,lease,now).run();
 if(acquired.meta?.changes!==1)return {sucesso:false,erro:"SINCRONIZACAO_EM_ANDAMENTO"};
 let analisadas=0,criadas=0,duplicadas=0;
 try{
  const token=await googleToken(env,{grant_type:"refresh_token",refresh_token:await unseal(existing.refresh_token_encrypted,env)});
  // Primeira consulta traz solicitacoes do DIA OPERACIONAL a partir de 06h
  // em Sao Paulo. Evita criar como abertas lavagens antigas ja concluidas.
  const hoje=new Intl.DateTimeFormat("en-US",{
   timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"
  }).formatToParts(new Date());
  const campo=n=>hoje.find(x=>x.type===n)?.value;
  const inicioTurno=Date.parse(campo("year")+"-"+campo("month")+"-"+campo("day")+"T06:00:00-03:00");
  const start=existing.ultima_consulta?
   Math.max(Date.now()-14*86400000,Date.parse(existing.ultima_consulta)-30*60000):
   Math.min(inicioTurno,Date.now()-5*60000);
  const query='from:no-reply@localiza.com subject:"Solicitação de Lavagem" after:'+Math.floor(start/1000);
  let page="",pages=0,excedeu=false,erros=0;
  do{
   const path="messages?"+new URLSearchParams({q:query,maxResults:"50",...(page?{pageToken:page}:{})}).toString();
   const result=await gmailRequest(path,token.access_token);
   const messages=result.messages||[];
   for(const item of messages){
    if(!/^[a-zA-Z0-9_-]{8,150}$/.test(item.id||""))continue;
    const messageId="gapi-"+item.id;
    const seen=await env.DB.prepare("SELECT 1 FROM ct_email_importacoes WHERE message_id=?").bind(messageId).first();
    if(seen)continue;
    try {
     const m=await gmailRequest("messages/"+encodeURIComponent(item.id)+"?format=full",token.access_token);
     const {from,subject}=extractHeaders(m);
     if(!verificarMensagemLocaliza(from,subject))continue;
     const texto=gmailText(m);
     if(!texto.trim())throw Error("SEM_TEXTO");
     const time=Number(m.internalDate),received=Number.isFinite(time)&&time>Date.now()-14*86400000&&time<Date.now()+60000?
      new Date(time).toISOString():new Date().toISOString();
     const agencia=texto.match(/Ag[eê]ncia da Abertura\s*:\s*([A-Z0-9]+)/i)?.[1]?.toUpperCase();
     const loja=agencia==="ACSMC"?"MOOCA":agencia==="ACUCP"?"CENTRAL_PLAZA":null;
     if(!loja)throw Error("AGENCIA_DESCONHECIDA");
     const saved=await receberEmailDoCloudflare({
      remetente:from,assunto:subject,message_id:messageId,
      texto,loja_codigo:loja,recebido_em:received
     },env);
     if(!saved.sucesso)throw Error("IMPORTACAO_NEGADA");
     analisadas++;criadas+=Number(saved.criados||0);duplicadas+=Number(saved.duplicados||0);
    }catch {
     erros++;
    }
   }
   page=result.nextPageToken||"";pages++;
   if(page&&pages>=4){excedeu=true;break;}
  }while(page);
  if(erros||excedeu)throw Error(excedeu?"LIMITE_PAGINACAO":"MENSAGEM_NAO_PROCESSADA");
  const completed=new Date().toISOString();
  await env.DB.prepare("UPDATE ct_gmail_integracao SET ultima_consulta=?,ultimo_sucesso=?,ultimo_erro_codigo=NULL,mensagens_analisadas=mensagens_analisadas+?,cards_criados=cards_criados+?,atualizado_em=? WHERE id='localiza' AND lock_owner=?")
   .bind(completed,completed,analisadas,criadas,completed,owner).run();
  return {sucesso:true,mensagens_analisadas:analisadas,cards_criados:criadas,sl_duplicadas:duplicadas};
 }catch(e){
  const code=/^(GOOGLE_[A-Z_]+|GMAIL_[A-Z_0-9]+|TOKEN_INVALIDO|LIMITE_PAGINACAO|MENSAGEM_NAO_PROCESSADA)$/.test(e.message)?e.message:"SINCRONIZACAO_FALHOU";
  const dt=new Date().toISOString();
  await env.DB.prepare("UPDATE ct_gmail_integracao SET ultimo_erro_codigo=?,atualizado_em=? WHERE id='localiza' AND lock_owner=?")
   .bind(code,dt,owner).run();
  return {sucesso:false,erro:code};
 }finally{
  await env.DB.prepare("UPDATE ct_gmail_integracao SET lock_owner=NULL,lock_until=NULL WHERE id='localiza' AND lock_owner=?").bind(owner).run();
 }
}
export async function gmailContingenciaApi(request,env,url){
 if(!url.pathname.startsWith(PREFIX+"/"))return null;
 if(env.ENVIRONMENT!=="homologacao")return json({erro:"Indisponivel."},404);
 if(url.pathname===PREFIX+"/callback"&&request.method==="GET")return oauthCallback(url,env);
 const u=await verificarGestorContingencia(request,env);
 if(!u)return json({erro:"Acesso exclusivo de Admin ou C&O autenticado."},403);
 if(url.pathname===PREFIX+"/status"&&request.method==="GET"){
  const r=await row(env);
  return json({...statusRow(r),configurado:configured(env),configuracao_pendencias:configurationIssues(env),conta_permitida:env.CT_GMAIL_ALLOWED_EMAIL||null,
   agendamento:"a cada 5 minutos",redirecionamento_google:REDIRECT});
 }
 if(!["POST"].includes(request.method))return json({erro:"Metodo invalido."},405);
 if(request.headers.get("Origin")!==new URL(request.url).origin)return json({erro:"Origem nao autorizada."},403);
 if(url.pathname===PREFIX+"/authorize")return oauthStart(env,u);
 if(url.pathname===PREFIX+"/sync"){
  const r=await sincronizarGmailContingencia(env);
  return json(r,r.sucesso?200:503);
 }
 if(url.pathname===PREFIX+"/disconnect"){
  await ensureConn(env);
  await env.DB.prepare("DELETE FROM ct_gmail_integracao WHERE id='localiza'").run();
  return json({desconectado:true});
 }
 return json({erro:"Rota desconhecida."},404);
}
