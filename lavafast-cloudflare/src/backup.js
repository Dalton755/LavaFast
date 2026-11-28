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
 if(url.pathname!=="/api/contingencia/backup")return null;
 if(!await verificarGestorContingencia(request,env))return json({erro:"Acesso restrito ao administrador."},403);
 if(!configured(env))return json({erro:"Backup ainda nao configurado."},503);
 if(request.method==="GET"){
  const item=await env.BACKUPS.head(keyFor());
  return json({configurado:true,hoje:!!item,arquivo:item?.key||null,bytes:item?.size||0});
 }
 if(request.method!=="POST")return json({erro:"Metodo nao permitido."},405);
 if(request.headers.get("Origin")!==url.origin)return json({erro:"Origem nao autorizada."},403);
 try{return json(await backupDiario(env));}
 catch(e){const code=String(e?.message||"");return json({erro:/^BACKUP_[A-Z_]+$/.test(code)?code:"BACKUP_FALHOU"},503);}
}
