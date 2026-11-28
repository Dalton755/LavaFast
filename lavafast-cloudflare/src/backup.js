// Snapshot logico da operacao: sem token de API Cloudflare e sem bloquear D1.
import { verificarGestorContingencia } from "./contingenciaApi.js";
const MAX_ROWS=10000,MAX_BYTES=4*1024*1024;
const transient=new Set(["ct_sessoes","ct_tentativas","ct_gmail_oauth_states"]);
const essential=["ct_funcionarios","ct_solicitacoes","ct_auditoria"];
const day=()=>new Date(Date.now()-3*3600000).toISOString().slice(0,10);
const keyFor=()=> "daily/"+day()+".json.enc";
const configured=env=>!!env.DB&&!!env.BACKUPS&&typeof env.CT_AUTH_PEPPER==="string"&&env.CT_AUTH_PEPPER.length>=32;
const json=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
async function encrypt(bytes,pepper){
 const enc=new TextEncoder();
 const material=await crypto.subtle.digest("SHA-256",enc.encode("GlowFleet/backup/v1:"+pepper));
 const key=await crypto.subtle.importKey("raw",material,"AES-GCM",false,["encrypt"]);
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const sealed=await crypto.subtle.encrypt({name:"AES-GCM",iv,additionalData:enc.encode("GlowFleet backup v1")},key,bytes);
 const result=new Uint8Array(16+sealed.byteLength);
 result.set([71,70,66,1]);result.set(iv,4);result.set(new Uint8Array(sealed),16);
 return result;
}
async function latestBackup(env){
 const listing=await env.BACKUPS.list({prefix:"daily/",limit:100});
 // Retencao prevista de 30 dias; nao apresentar lista incompleta como confiavel.
 if(listing.truncated)throw Error("BACKUP_LISTAGEM_INCOMPLETA");
 const items=listing.objects.filter(o=>/^daily\/\d{4}-\d{2}-\d{2}\.json\.enc$/.test(o.key)).sort((a,b)=>b.key.localeCompare(a.key));
 return {latest:items[0]||null,count:items.length};
}
async function validateBackup(env,item){
 if(!item)throw Error("BACKUP_INEXISTENTE");
 if(item.size<32||item.size>MAX_BYTES+32)throw Error("BACKUP_TAMANHO_INVALIDO");
 const object=await env.BACKUPS.get(item.key);
 if(!object)throw Error("BACKUP_INEXISTENTE");
 const bytes=new Uint8Array(await object.arrayBuffer());
 if(bytes.length!==item.size||bytes[0]!==71||bytes[1]!==70||bytes[2]!==66||bytes[3]!==1)throw Error("BACKUP_FORMATO_INVALIDO");
 const enc=new TextEncoder();
 const material=await crypto.subtle.digest("SHA-256",enc.encode("GlowFleet/backup/v1:"+env.CT_AUTH_PEPPER));
 const key=await crypto.subtle.importKey("raw",material,"AES-GCM",false,["decrypt"]);
 let payload;
 try{
  const clear=await crypto.subtle.decrypt({name:"AES-GCM",iv:bytes.slice(4,16),additionalData:enc.encode("GlowFleet backup v1")},key,bytes.slice(16));
  payload=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(clear));
 }catch{throw Error("BACKUP_INTEGRIDADE_INVALIDA");}
 if(payload?.version!==1||payload.scope!=="ct_operacional"||!Number.isFinite(Date.parse(payload.created_at))||!payload.tables||!Array.isArray(payload.schema))throw Error("BACKUP_ESTRUTURA");
 const t=payload.tables;
 const names=Object.keys(t);
 if(names.length>20||names.some(n=>!/^ct_[a-z0-9_]+$/.test(n)||transient.has(n)||!Array.isArray(t[n])||t[n].length>MAX_ROWS||!payload.schema.some(x=>x.type==="table"&&x.name===n)))throw Error("BACKUP_ESTRUTURA");
 if(!essential.every(n=>Object.hasOwn(t,n)))throw Error("BACKUP_ESTRUTURA");
 const ids=new Set(),sl=new Set(),cardIds=new Set();
 for(const u of t.ct_funcionarios){
  if(!u||typeof u.id!=="string"||ids.has(u.id)||typeof u.cpf_hmac!=="string"||typeof u.senha_hash!=="string")throw Error("BACKUP_REGISTROS_INVALIDOS");
  ids.add(u.id);
 }
 for(const c of t.ct_solicitacoes){
  if(!c||typeof c.id!=="string"||cardIds.has(c.id)||typeof c.numero_solicitacao!=="string"||sl.has(c.numero_solicitacao)||!["SOLICITACAO","CONCLUIDO"].includes(c.status)||!["MOOCA","CENTRAL_PLAZA"].includes(c.loja_codigo)||(c.finalizada_por!=null&&!ids.has(c.finalizada_por)))throw Error("BACKUP_REGISTROS_INVALIDOS");
  cardIds.add(c.id);sl.add(c.numero_solicitacao);
 }
 return {sucesso:true,integridade:true,arquivo:item.key,criado_em:payload.created_at,tabelas:names.length,funcionarios:ids.size,solicitacoes:sl.size,auditoria:t.ct_auditoria.length,registros:names.reduce((n,k)=>n+t[k].length,0),bytes:bytes.length};
}
export async function backupDiario(env){
 if(!configured(env))throw Error("BACKUP_NAO_CONFIGURADO");
 const objectKey=keyFor();
 if(await env.BACKUPS.head(objectKey))return {sucesso:true,ja_existe:true,arquivo:objectKey};
 const meta=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'ct_%' ORDER BY name").all();
 const names=meta.results.map(r=>r.name).filter(n=>/^ct_[a-z0-9_]+$/.test(n)&&!transient.has(n));
 if(!essential.every(n=>names.includes(n))||names.length>20)throw Error("BACKUP_ESTRUTURA");
 // D1 batch executa as leituras em uma transacao. Limites falham sem gravar snapshot parcial.
 const queries=[env.DB.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE sql IS NOT NULL AND type IN ('table','index','trigger') AND tbl_name LIKE 'ct_%' ORDER BY type,name"),...names.map(n=>env.DB.prepare('SELECT * FROM "'+n+'" LIMIT '+(MAX_ROWS+1)))];
 const result=await env.DB.batch(queries);
 if(result.length!==queries.length||result.some(r=>!r.success))throw Error("BACKUP_LEITURA");
 const tables={};let total=0;
 for(let i=0;i<names.length;i++){
  const rows=result[i+1].results;
  if(!Array.isArray(rows)||rows.length>MAX_ROWS)throw Error("BACKUP_LIMITE");
  total+=rows.length;tables[names[i]]=rows;
 }
 // Nao restaura trava de sincronizacao ativa.
 for(const row of tables.ct_gmail_integracao||[]){row.lock_owner=null;row.lock_until=null;}
 const data={version:1,created_at:new Date().toISOString(),scope:"ct_operacional",schema:result[0].results,tables,excluded:[...transient]};
 const bytes=new TextEncoder().encode(JSON.stringify(data));
 if(bytes.byteLength>MAX_BYTES)throw Error("BACKUP_LIMITE");
 const encrypted=await encrypt(bytes,env.CT_AUTH_PEPPER);
 const saved=await env.BACKUPS.put(objectKey,encrypted,{onlyIf:{etagDoesNotMatch:"*"},httpMetadata:{contentType:"application/octet-stream"}});
 const verified=await env.BACKUPS.head(objectKey);
 if(!verified||(saved&&verified.size!==encrypted.byteLength))throw Error("BACKUP_GRAVACAO");
 return {sucesso:true,arquivo:objectKey,registros:total,bytes:verified.size,ja_existe:!saved};
}
export async function backupApi(request,env,url){
 if(!["/api/contingencia/backup","/api/contingencia/backup/verificar"].includes(url.pathname))return null;
 if(!await verificarGestorContingencia(request,env))return json({erro:"Acesso restrito ao administrador."},403);
 if(!configured(env))return json({erro:"Backup ainda nao configurado."},503);
 try{
  if(url.pathname.endsWith("/verificar")){
   if(request.method!=="POST")return json({erro:"Metodo nao permitido."},405);
   if(request.headers.get("Origin")!==url.origin)return json({erro:"Origem nao autorizada."},403);
   const {latest}=await latestBackup(env);
   return json(await validateBackup(env,latest));
  }
  if(request.method==="GET"){
   const {latest,count}=await latestBackup(env);
   return json({configurado:true,hoje:latest?.key===keyFor(),arquivo:latest?.key||null,bytes:latest?.size||0,ultimo_backup:latest?.uploaded?.toISOString()||null,quantidade:count});
  }
  if(request.method!=="POST")return json({erro:"Metodo nao permitido."},405);
  if(request.headers.get("Origin")!==url.origin)return json({erro:"Origem nao autorizada."},403);
  return json(await backupDiario(env));
 }catch(e){const code=String(e?.message||"");return json({erro:/^BACKUP_[A-Z_]+$/.test(code)?code:"BACKUP_FALHOU"},503);}
}
