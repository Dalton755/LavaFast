import { verificarEstruturaContingencia, prepararEstruturaContingencia } from "./contingenciaSchema.js";
import { extrairSolicitacoesLocaliza, verificarMensagemLocaliza } from "./localizaEmail.js";
// LavaFast Contingencia: sem dependencias de Supabase, Render ou Vercel.
// Apenas estrutura D1 isolada; CPF nunca armazenado em texto, financeiro inexistente.
const PREFIX="/api/contingencia";
const COOKIE="__Host-lfct";
const EXPIRA=60*60*8;
const LOJAS=["MOOCA","CENTRAL_PLAZA"];
const response=(obj,status=200,headers={})=>new Response(JSON.stringify(obj),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff",...headers}});
const now=()=>new Date().toISOString();
const enabled=env=>env.ENVIRONMENT==="homologacao"&&!!env.DB&&typeof env.CT_BOOTSTRAP_SECRET==="string"&&env.CT_BOOTSTRAP_SECRET.length>=32&&typeof env.CT_AUTH_PEPPER==="string"&&env.CT_AUTH_PEPPER.length>=32;
// O cargo permanece controlado pelo responsavel; apenas cargos gerenciais
// explicitamente reconhecidos podem administrar cadastros.
const cargoNormalizado=c=>String(c||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toUpperCase();
const cargoAdmin=c=>["C&O","ADMIN","ADMINISTRADOR"].includes(cargoNormalizado(c));
const role=c=>cargoAdmin(c)?"CO":cargoNormalizado(c)==="ANALISTA"?"ANALISTA":"OPERACAO";
const isAdmin=u=>Boolean(u&&cargoAdmin(u.cargo));
const isManager=u=>isAdmin(u)||role(u?.cargo)==="ANALISTA";
const sameOrigin=r=>r.headers.get("Origin")===new URL(r.url).origin;
const cookie=(token,maxAge)=>COOKIE+"="+token+"; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age="+maxAge;
const validName=n=>typeof n==="string"&&n.trim().length>=3&&n.trim().length<=120;
const validCargo=n=>typeof n==="string"&&n.trim().length>=2&&n.trim().length<=80;
const validPassword=p=>typeof p==="string"&&p.length>=12&&p.length<=128;
const randomHex=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,"0")).join("");
function cpfLimpo(cpfInput){
 const cpf=String(cpfInput||"").replace(/\D/g,"");
 if(cpf.length!==11||/^(\d)\1{10}$/.test(cpf))return null;
 const digit=n=>{let soma=0;for(let i=0;i<n;i++)soma+=Number(cpf[i])*(n+1-i);const d=soma*10%11;return d===10?0:d;};
 return Number(cpf[9])===digit(9)&&Number(cpf[10])===digit(10)?cpf:null;
}
const encode=b=>Array.from(new Uint8Array(b),n=>n.toString(16).padStart(2,"0")).join("");
const sha=async text=>encode(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text)));
async function hmac(key,text){
 const imported=await crypto.subtle.importKey("raw",new TextEncoder().encode(key),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 return encode(await crypto.subtle.sign("HMAC",imported,new TextEncoder().encode(text)));
}
async function secretEq(a,b){
 if(typeof a!=="string"||typeof b!=="string"||a.length<32||b.length<32||a.length>512||b.length>512)return false;
 const [x,y]=await Promise.all([sha(a),sha(b)]);let delta=0;
 for(let i=0;i<x.length;i++)delta|=x.charCodeAt(i)^y.charCodeAt(i);
 return delta===0;
}
// Workers Free limita CPU a 10 ms e workerd rejeita PBKDF2 acima de 100 mil.
// Hash de CONTINGENCIA: HMAC secreto antes de PBKDF2 curto + salt unico.
// Nao utilizar como estrategia de autenticacao permanente sem upgrade de custos.
const ITERACOES_CT=14000;
async function passHash(salt,pwd,pepper){
 const prehash=await hmac(pepper,"LavaFast-CT/password/"+pwd);
 const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(prehash),"PBKDF2",false,["deriveBits"]);
 const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt:new TextEncoder().encode(salt),iterations:ITERACOES_CT,hash:"SHA-256"},k,256);
 return "v2$"+encode(bits);
}
async function passEq(salt,pwd,expected,pepper){
 if(typeof expected!=="string"||!expected.startsWith("v2$"))return false;
 const actual=await passHash(salt,pwd,pepper);
 if(expected.length!==actual.length)return false;
 let diff=0;for(let i=0;i<actual.length;i++)diff|=actual.charCodeAt(i)^expected.charCodeAt(i);
 return diff===0;
}
async function body(r,max=16000){
 const n=Number(r.headers.get("content-length")||0);
 if(n>max)throw Error("Dados grandes demais");
 const str=await r.text();if(str.length>max)throw Error("Dados grandes demais");
 return JSON.parse(str);
}
function userOut(u){return {id:u.id,nome:u.nome,cargo:u.cargo,perfil:role(u.cargo),loja_codigo:u.loja_codigo,ativo:u.ativo===1,trocar_senha:u.trocar_senha===1,cpf_final:u.cpf_final};}
async function audit(env,evento,userId=null,cardId=null){
 await env.DB.prepare("INSERT INTO ct_auditoria(id,evento,funcionario_id,solicitacao_id,horario) VALUES (?,?,?,?,?)").bind(crypto.randomUUID(),evento,userId,cardId,now()).run();
}
async function session(r,env){
 const token=(r.headers.get("Cookie")||"").split(";").map(x=>x.trim()).find(x=>x.startsWith(COOKIE+"="))?.slice(COOKIE.length+1);
 if(!token||!/^[a-f0-9]{64}$/.test(token))return null;
 return env.DB.prepare("SELECT f.* FROM ct_sessoes s JOIN ct_funcionarios f ON f.id=s.funcionario_id WHERE s.token_hash=? AND s.expira_em>? AND f.ativo=1").bind(await sha(token),now()).first();
}
async function newSession(env,u){
 const token=randomHex(),timestamp=now(),expiry=new Date(Date.now()+EXPIRA*1000).toISOString();
 await env.DB.prepare("INSERT INTO ct_sessoes(token_hash,funcionario_id,expira_em,criada_em) VALUES (?,?,?,?)").bind(await sha(token),u.id,expiry,timestamp).run();
 return response({autenticado:true,usuario:userOut(u)},200,{"set-cookie":cookie(token,EXPIRA)});
}
async function bootstrap(r,env){
 if(!sameOrigin(r))return response({erro:"Origem nao autorizada."},403);
 if(!await secretEq(r.headers.get("x-ct-setup"),env.CT_BOOTSTRAP_SECRET))return response({erro:"Chave de configuracao incorreta."},403);
 let b;try{b=await body(r,1800);}catch{return response({erro:"Dados invalidos."},400);}
 const cpf=cpfLimpo(b.cpf),nome=b.nome?.trim();
 if(!cpf||!validName(nome)||!validPassword(b.senha))return response({erro:"CPF valido, nome e senha com 12+ caracteres obrigatorios."},400);
 // Chave administrativa validada: criar schema se migrations do deploy nao rodaram.
 await prepararEstruturaContingencia(env);
 const num=await env.DB.prepare("SELECT COUNT(*) AS n FROM ct_funcionarios").first();
 if(num.n!==0)return response({erro:"Administrador inicial ja cadastrado."},409);
 const salt=randomHex(),pwd=await passHash(salt,b.senha,env.CT_AUTH_PEPPER),id=crypto.randomUUID(),ts=now(),cpfHmac=await hmac(env.CT_AUTH_PEPPER,cpf);
 const added=await env.DB.prepare("INSERT INTO ct_funcionarios(id,cpf_hmac,cpf_final,nome,cargo,loja_codigo,ativo,senha_salt,senha_hash,trocar_senha,criado_em,atualizado_em) SELECT ?,?,?,?,?,?,1,?,?,0,?,? WHERE NOT EXISTS(SELECT 1 FROM ct_funcionarios)").bind(id,cpfHmac,cpf.slice(-4),nome,"C&O","TODAS",salt,pwd,ts,ts).run();
 if(added.meta?.changes!==1)return response({erro:"Administrador ja criado."},409);
 await audit(env,"BOOTSTRAP",id);
 return response({criado:true,mensagem:"Administrador de contingencia criado. Agora faca login."},201);
}
async function failAttempt(env,key){
 const date=new Date(Date.now()+15*60000).toISOString(),ts=now();
 await env.DB.prepare("INSERT INTO ct_tentativas(chave_hmac,falhas,expira_em) VALUES (?,1,?) ON CONFLICT(chave_hmac) DO UPDATE SET falhas=CASE WHEN ct_tentativas.expira_em<=? THEN 1 ELSE ct_tentativas.falhas+1 END,expira_em=CASE WHEN ct_tentativas.expira_em<=? THEN excluded.expira_em ELSE ct_tentativas.expira_em END").bind(key,date,ts,ts).run();
}
async function login(r,env){
 if(!sameOrigin(r))return response({erro:"Origem nao autorizada."},403);
 let b;try{b=await body(r,1200);}catch{return response({erro:"CPF ou senha incorretos."},401);}
 const cpf=cpfLimpo(b.cpf);
 if(!cpf||typeof b.senha!=="string"||b.senha.length<1||b.senha.length>128)return response({erro:"CPF ou senha incorretos."},401);
 const key=await hmac(env.CT_AUTH_PEPPER,"tentativas:"+cpf);
 const rate=await env.DB.prepare("SELECT falhas,expira_em FROM ct_tentativas WHERE chave_hmac=?").bind(key).first();
 if(rate&&rate.expira_em>now()&&rate.falhas>=5)return response({erro:"Muitas tentativas. Aguarde 15 minutos."},429);
 const u=await env.DB.prepare("SELECT * FROM ct_funcionarios WHERE cpf_hmac=? AND ativo=1").bind(await hmac(env.CT_AUTH_PEPPER,cpf)).first();
 if(!u||!await passEq(u.senha_salt,b.senha,u.senha_hash,env.CT_AUTH_PEPPER)){
   await failAttempt(env,key);return response({erro:"CPF ou senha incorretos."},401);
 }
 await env.DB.prepare("DELETE FROM ct_tentativas WHERE chave_hmac=?").bind(key).run();
 return newSession(env,u);
}
async function logout(r,env){
 if(!sameOrigin(r))return response({erro:"Origem nao autorizada."},403);
 const token=(r.headers.get("Cookie")||"").split(";").map(s=>s.trim()).find(s=>s.startsWith(COOKIE+"="))?.slice(COOKIE.length+1);
 if(token&&/^[a-f0-9]{64}$/.test(token))await env.DB.prepare("DELETE FROM ct_sessoes WHERE token_hash=?").bind(await sha(token)).run();
 return response({sucesso:true},200,{"set-cookie":cookie("",0)});
}
async function passwordChange(r,env,u){
 if(!sameOrigin(r))return response({erro:"Origem nao autorizada."},403);
 let b;try{b=await body(r,1200);}catch{return response({erro:"Dados invalidos."},400);}
 if(typeof b.senha_atual!=="string"||!validPassword(b.nova_senha))return response({erro:"Informe senha atual e nova senha de 12+ caracteres."},400);
 if(!await passEq(u.senha_salt,b.senha_atual,u.senha_hash,env.CT_AUTH_PEPPER))return response({erro:"Senha atual incorreta."},403);
 if(b.senha_atual===b.nova_senha)return response({erro:"Escolha uma senha diferente."},400);
 const salt=randomHex(),hash=await passHash(salt,b.nova_senha,env.CT_AUTH_PEPPER);
 await env.DB.prepare("UPDATE ct_funcionarios SET senha_salt=?,senha_hash=?,trocar_senha=0,atualizado_em=? WHERE id=?").bind(salt,hash,now(),u.id).run();
 await env.DB.prepare("DELETE FROM ct_sessoes WHERE funcionario_id=?").bind(u.id).run();
 await audit(env,"ALTERAR_SENHA",u.id);
 return response({sucesso:true,requer_novo_login:true},200,{"set-cookie":cookie("",0)});
}
async function employeeCreate(r,env,u){
 if(!isAdmin(u))return response({erro:"Apenas Admin ou C&O podem cadastrar funcionarios."},403);
 if(!sameOrigin(r))return response({erro:"Origem nao autorizada."},403);
 let b;try{b=await body(r,2500);}catch{return response({erro:"Dados invalidos."},400);}
 const cpf=cpfLimpo(b.cpf),nome=b.nome?.trim(),cargo=b.cargo?.trim(),loja=b.loja_codigo,pwd=b.senha_temporaria;
 if(!cpf||!validName(nome)||!validCargo(cargo)||!validPassword(pwd)||
 ![...LOJAS,"TODAS"].includes(loja)||(role(cargo)==="OPERACAO"&&loja==="TODAS"))
  return response({erro:"Informe CPF, nome, cargo, loja e senha temporaria de 12+ caracteres."},400);
 const cpfHmac=await hmac(env.CT_AUTH_PEPPER,cpf);
 const existente=await env.DB.prepare("SELECT id FROM ct_funcionarios WHERE cpf_hmac=?").bind(cpfHmac).first();
 if(existente)return response({erro:"Este CPF ja esta cadastrado. Use a lista para editar ou reativar o acesso."},409);
 const id=crypto.randomUUID(),salt=randomHex(),hash=await passHash(salt,pwd,env.CT_AUTH_PEPPER),stamp=now();
 try{
  await env.DB.prepare("INSERT INTO ct_funcionarios(id,cpf_hmac,cpf_final,nome,cargo,loja_codigo,ativo,senha_salt,senha_hash,trocar_senha,criado_em,atualizado_em) VALUES (?,?,?,?,?,?,1,?,?,1,?,?)").bind(id,cpfHmac,cpf.slice(-4),nome,cargo,loja,salt,hash,stamp,stamp).run();
 }catch{return response({erro:"Nao foi possivel cadastrar. Confira se o CPF ja existe."},409);}
 await audit(env,"CADASTRAR_FUNCIONARIO",u.id);
 return response({criado:true,funcionario:{id,nome,cargo,loja_codigo:loja,cpf_final:cpf.slice(-4)}},201);
}
async function employeeToggle(r,env,u){
 if(!isAdmin(u))return response({erro:"Somente C&O."},403);
 if(!sameOrigin(r))return response({erro:"Origem nao autorizada."},403);
 let b;try{b=await body(r,600);}catch{return response({erro:"Dados invalidos."},400);}
 if(typeof b.ativo!=="boolean"||typeof b.id!=="string"||u.id===b.id)return response({erro:"Dados invalidos."},400);
 const ret=await env.DB.prepare("UPDATE ct_funcionarios SET ativo=?,atualizado_em=? WHERE id=? AND id<>?").bind(b.ativo?1:0,now(),b.id,u.id).run();
 if(ret.meta?.changes!==1)return response({erro:"Funcionario nao encontrado."},404);
 if(!b.ativo)await env.DB.prepare("DELETE FROM ct_sessoes WHERE funcionario_id=?").bind(b.id).run();
 await audit(env,b.ativo?"REATIVAR_FUNCIONARIO":"INATIVAR_FUNCIONARIO",u.id);
 return response({salvo:true});
}
// Edita somente nome, cargo e loja. CPF/HMAC e identificador permanecem
// estaveis. Toda mudanca administrativa revoga sessoes ja abertas.
async function employeeEdit(r,env,u){
 if(!isAdmin(u))return response({erro:"Acesso exclusivo do Admin ou C&O."},403);
 if(!sameOrigin(r))return response({erro:"Origem nao autorizada."},403);
 let b;try{b=await body(r,1800);}catch{return response({erro:"Dados invalidos."},400);}
 const id=b?.id,nome=b?.nome?.trim(),cargo=b?.cargo?.trim(),loja=b?.loja_codigo;
 if(typeof id!=="string"||id.length>64||!validName(nome)||!validCargo(cargo)||
   ![...LOJAS,"TODAS"].includes(loja)||(role(cargo)==="OPERACAO"&&loja==="TODAS"))
  return response({erro:"Informe nome, cargo e loja validos."},400);
 // Evita bloqueio ou mudanca silenciosa do proprio administrador.
 if(id===u.id)return response({erro:"Para alterar sua propria conta, solicite outro C&O."},403);
 const original=await env.DB.prepare("SELECT id FROM ct_funcionarios WHERE id=?").bind(id).first();
 if(!original)return response({erro:"Funcionario nao encontrado."},404);
 const changed=await env.DB.prepare("UPDATE ct_funcionarios SET nome=?,cargo=?,loja_codigo=?,atualizado_em=? WHERE id=?")
 .bind(nome,cargo,loja,now(),id).run();
 if(changed.meta?.changes!==1)return response({erro:"Cadastro nao atualizado."},409);
 await env.DB.prepare("DELETE FROM ct_sessoes WHERE funcionario_id=?").bind(id).run();
 await audit(env,"ATUALIZAR_FUNCIONARIO",u.id);
 return response({salvo:true,funcionario:{id,nome,cargo,loja_codigo:loja}});
}

// Recuperacao interna enquanto o Supabase estiver bloqueado.
// Nunca retorna senha em claro: o Admin informa uma senha NOVA temporaria
// que fica visivel somente no proprio navegador no ato do reset.
async function employeeResetPassword(r,env,u){
 if(!isAdmin(u))return response({erro:"Acesso exclusivo do Admin ou C&O."},403);
 if(!sameOrigin(r))return response({erro:"Origem nao autorizada."},403);
 let b;try{b=await body(r,1600);}catch{return response({erro:"Dados invalidos."},400);}
 if(typeof b?.id!=="string"||b.id.length>64||b.id===u.id||!validPassword(b.senha_temporaria))
  return response({erro:"Funcionario ou senha temporaria invalidos."},400);
 const found=await env.DB.prepare("SELECT id FROM ct_funcionarios WHERE id=?").bind(b.id).first();
 if(!found)return response({erro:"Funcionario nao encontrado."},404);
 const salt=randomHex(),hash=await passHash(salt,b.senha_temporaria,env.CT_AUTH_PEPPER);
 const changed=await env.DB.prepare("UPDATE ct_funcionarios SET senha_salt=?,senha_hash=?,trocar_senha=1,atualizado_em=? WHERE id=?")
 .bind(salt,hash,now(),b.id).run();
 if(changed.meta?.changes!==1)return response({erro:"Nao foi possivel redefinir a senha."},409);
 await env.DB.prepare("DELETE FROM ct_sessoes WHERE funcionario_id=?").bind(b.id).run();
 await audit(env,"REDEFINIR_SENHA_TEMPORARIA",u.id);
 return response({salvo:true,requer_troca:true});
}
function store(url,u){
 const requested=url.searchParams.get("loja")||"";
 if(requested&&!LOJAS.includes(requested))return {erro:response({erro:"Loja invalida."},400)};
 if(!isManager(u)){
  if(!LOJAS.includes(u.loja_codigo))return {erro:response({erro:"Sua loja ainda nao esta habilitada."},403)};
  if(requested&&requested!==u.loja_codigo)return {erro:response({erro:"Sem acesso a essa loja."},403)};
  return {code:u.loja_codigo};
 }
 return {code:requested};
}
function displayCard(c){
 const a=Date.parse(c.recebida_em),b=Date.parse(c.finalizada_em);
 return {id:c.id,numero_solicitacao:c.numero_solicitacao,placa:c.placa,loja_codigo:c.loja_codigo,
 tipo_lavagem:c.tipo_lavagem,status:c.status,recebida_em:c.recebida_em,finalizada_em:c.finalizada_em,
 origem:c.origem,observacao:c.observacao,
 tempo_total_segundos:c.status==="CONCLUIDO"&&Number.isFinite(a)&&Number.isFinite(b)?Math.max(0,Math.floor((b-a)/1000)):null};
}
async function listCards(env,u,url){
 const filter=store(url,u);if(filter.erro)return filter.erro;
 const aba=url.searchParams.get("aba")||"solicitacoes";
 if(!["solicitacoes","concluidos"].includes(aba))return response({erro:"Aba invalida."},400);
 const status=aba==="concluidos"?"CONCLUIDO":"SOLICITACAO";
 const data=await env.DB.prepare("SELECT id,numero_solicitacao,placa,loja_codigo,tipo_lavagem,status,recebida_em,finalizada_em,origem,observacao FROM ct_solicitacoes WHERE status=? AND (?='' OR loja_codigo=?) ORDER BY recebida_em DESC LIMIT 300").bind(status,filter.code,filter.code).all();
 return response({aba,total:data.results.length,cards:data.results.map(displayCard)});
}
function cardFields(b,u){
 const numero=String(b.numero_solicitacao||"").trim(),placa=String(b.placa||"").trim().toUpperCase().replace(/-/g,"");
 const loja=b.loja_codigo,tipo=String(b.tipo_lavagem||"Nao informado").trim(),obs=String(b.observacao||"").trim();
 if(!/^\d{5,14}$/.test(numero)||!/^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(placa)||!LOJAS.includes(loja)||
 !tipo||tipo.length>100||obs.length>300)return {erro:"SL, placa, loja ou tipo invalidos."};
 if(u&&!isManager(u)&&u.loja_codigo!==loja)return {erro:"Sem permissao para esta loja.",status:403};
 return {numero,placa,loja,tipo,obs};
}
async function saveCard(env,c,origem,user=null,msgId=null,receivedAt=null){
 const id=crypto.randomUUID(),date=now();
 const sent=receivedAt&&Number.isFinite(Date.parse(receivedAt))&&Date.parse(receivedAt)<=Date.now()+60000&&Date.parse(receivedAt)>=Date.now()-14*86400000?new Date(receivedAt).toISOString():date;
 const ret=await env.DB.prepare("INSERT OR IGNORE INTO ct_solicitacoes(id,numero_solicitacao,placa,loja_codigo,tipo_lavagem,status,recebida_em,origem,mensagem_id,observacao,criado_em,atualizado_em) VALUES (?,?,?,?,?,'SOLICITACAO',?,?,?,?,?,?)").bind(id,c.numero,c.placa,c.loja,c.tipo,sent,origem,msgId,c.obs||null,date,date).run();
 if(ret.meta?.changes===1){await audit(env,"CRIAR_SOLICITACAO",user?.id||null,id);return true;}
 return false;
}
async function createCard(r,env,u){
 if(!sameOrigin(r))return response({erro:"Origem nao autorizada."},403);
 let b;try{b=await body(r,2700);}catch{return response({erro:"JSON invalido."},400);}
 const c=cardFields(b,u);if(c.erro)return response({erro:c.erro},c.status||400);
 const created=await saveCard(env,c,"MANUAL",u);
 return response({criado:created,mensagem:created?"Solicitacao criada.":"SL ja existente."},created?201:409);
}
// A tabela e criada de maneira idempotente somente em chamada AUTORIZADA:
// aguenta Workers que receberam codigo antes da migration D1 ser aplicada.
async function garantirAuditoriaGmail(env) {
 await env.DB.prepare(`CREATE TABLE IF NOT EXISTS ct_email_importacoes (
   message_id TEXT PRIMARY KEY NOT NULL,
   loja_codigo TEXT NOT NULL CHECK(loja_codigo IN ('MOOCA','CENTRAL_PLAZA')),
   recebido_em TEXT NOT NULL, processado_em TEXT NOT NULL,
   identificados INTEGER NOT NULL DEFAULT 0,
   criados INTEGER NOT NULL DEFAULT 0,
   duplicados INTEGER NOT NULL DEFAULT 0,
   status TEXT NOT NULL CHECK(status IN ('PROCESSADO','DUPLICADO'))
 )`).run();
 await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_ct_email_importacoes_processado ON ct_email_importacoes(processado_em DESC)").run();
}

async function importEmail(r,env,u,relay=false,inboundWorker=false){
 if(inboundWorker){
   // Invocado SOMENTE pelo handler email() interno, nao por rota HTTP.
 }else if(relay){
  if(typeof env.CT_EMAIL_RELAY_SECRET!=="string"||
   !await secretEq(r.headers.get("x-lavafast-relay"),env.CT_EMAIL_RELAY_SECRET))
   return response({erro:"Integracao Gmail nao autorizada."},403);
 }else if(!sameOrigin(r))return response({erro:"Origem nao autorizada."},403);
 let b;
 try{b=await body(r,30000);}catch{return response({erro:"Mensagem invalida ou muito grande."},400);}
 const texto=typeof b?.texto==="string"?b.texto:"";
 if(!texto.trim()||texto.length>26000)
   return response({erro:"Conteudo da solicitacao vazio ou muito grande."},400);
 const extraido=extrairSolicitacoesLocaliza(texto);
 let loja=b?.loja_codigo;
 if(relay||inboundWorker){
   // Remetente, assunto e agencia sao conferidos antes de gravar qualquer SL.
   // O Apps Script associado a conta Gmail manda os cabecalhos originais.
   if(!verificarMensagemLocaliza(b?.remetente,b?.assunto))
     return response({erro:"Remetente ou assunto nao autorizado."},403);
   if(!extraido.loja_codigo || extraido.loja_codigo!==loja)
     return response({erro:"Agencia ausente, desconhecida ou diferente da loja enviada."},422);
   if(typeof b.message_id!=="string"||!/^[a-zA-Z0-9_-]{12,150}$/.test(b.message_id))
     return response({erro:"Gmail message_id invalido."},400);
   if(typeof b.recebido_em!=="string"||!Number.isFinite(Date.parse(b.recebido_em)))
     return response({erro:"Data de recebimento invalida."},400);
   const quando=Date.parse(b.recebido_em);
   if(quando>Date.now()+60000||quando<Date.now()-14*86400000)
     return response({erro:"Data fora da janela de 14 dias."},422);
 }else if(extraido.agencia && extraido.loja_codigo && extraido.loja_codigo!==loja){
   return response({erro:"A agencia no email nao pertence a loja escolhida."},422);
 }
 if(!LOJAS.includes(loja))return response({erro:"Loja invalida."},400);
 if(u&&!isManager(u)&&loja!==u.loja_codigo)return response({erro:"Sem acesso a loja."},403);
 const vehicles=extraido.veiculos;
 if(!vehicles.length)return response({erro:"Nenhuma SL com placa reconhecida."},422);
 const msgId=relay||inboundWorker?b.message_id:null;
 let criados=0,duplicados=0;
 if(relay||inboundWorker)await garantirAuditoriaGmail(env);
 for(const v of vehicles){
  const inserted=await saveCard(env,{...v,loja,tipo:"Nao informado",obs:""},
    "IMPORTACAO_EMAIL",u,msgId,relay||inboundWorker?b.recebido_em:null);
  if(inserted)criados++;else duplicados++;
 }
 if(relay||inboundWorker){
  const processado=now();
  await env.DB.prepare(`INSERT INTO ct_email_importacoes
   (message_id,loja_codigo,recebido_em,processado_em,identificados,criados,duplicados,status)
   VALUES(?,?,?,?,?,?,?,?)
   ON CONFLICT(message_id) DO UPDATE SET
   processado_em=excluded.processado_em,
   identificados=excluded.identificados,
   criados=ct_email_importacoes.criados+excluded.criados,
   duplicados=ct_email_importacoes.duplicados+excluded.duplicados,
   status=excluded.status`)
   .bind(msgId,loja,new Date(b.recebido_em).toISOString(),processado,
     vehicles.length,criados,duplicados,criados?"PROCESSADO":"DUPLICADO").run();
 }
 return response({sucesso:true,criados,duplicados,encontrados:vehicles.length,
   origem:relay||inboundWorker?"GMAIL_AUTOMATICO":"IMPORTACAO_MANUAL",loja_codigo:loja});
}

// Importacao interna pela funcao email() do Worker. Sem API publica de bypass
// e sem segredo compartilhado; chamada so apos o Email Routing aceitar o email.
export async function receberEmailDoCloudflare(payload,env) {
 if(!enabled(env))return {sucesso:false,erro:"Contingencia indisponivel"};
 const request=new Request("https://lavafast.internal/api/contingencia/email/routing",{
   method:"POST",headers:{"content-type":"application/json"},
   body:JSON.stringify(payload)
 });
 const result=await importEmail(request,env,null,false,true);
 try{return await result.json();}catch{return {sucesso:false,erro:"Falha no parser"};}
}

async function statusGmail(env,u){
 if(!isAdmin(u))return response({erro:"Acesso exclusivo de Admin ou C&O."},403);
 await garantirAuditoriaGmail(env);
 const since=new Date(Date.now()-24*3600000).toISOString();
 const totals=await env.DB.prepare(`SELECT
   COUNT(*) AS mensagens,
   COALESCE(SUM(criados),0) AS cards_criados,
   COALESCE(SUM(duplicados),0) AS duplicados
   FROM ct_email_importacoes WHERE processado_em>=?`).bind(since).first();
 const last=await env.DB.prepare(`SELECT loja_codigo,recebido_em,processado_em,
   identificados,criados,duplicados,status
   FROM ct_email_importacoes ORDER BY processado_em DESC LIMIT 12`).all();
 return response({
   relay_configurado:typeof env.CT_EMAIL_RELAY_SECRET==="string"&&env.CT_EMAIL_RELAY_SECRET.length>=32,
   email_routing_configurado:typeof env.CT_EMAIL_INBOUND_TO==="string"&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.CT_EMAIL_INBOUND_TO),
   periodo:"ultimas_24_horas",
   resumo:{mensagens:totals?.mensagens||0,cards_criados:totals?.cards_criados||0,duplicados:totals?.duplicados||0},
   ultimas:(last.results||[]).map(row=>row)
 });
}

async function finalize(r,env,u,id){
 if(!sameOrigin(r))return response({erro:"Origem nao autorizada."},403);
 if(!/^[0-9a-f-]{36}$/.test(id))return response({erro:"Identificador invalido."},400);
 const loja=isManager(u)?"":u.loja_codigo,dt=now();
 const result=await env.DB.prepare("UPDATE ct_solicitacoes SET status='CONCLUIDO',finalizada_em=?,finalizada_por=?,atualizado_em=? WHERE id=? AND status='SOLICITACAO' AND (?='' OR loja_codigo=?)").bind(dt,u.id,dt,id,loja,loja).run();
 if(result.meta?.changes!==1)return response({erro:"Ja concluido, nao encontrado ou sem permissao."},409);
 await audit(env,"FINALIZAR_LAVAGEM",u.id,id);
 return response({concluido:true});
}
async function reopen(r,env,u,id){
 if(!sameOrigin(r))return response({erro:"Origem nao autorizada."},403);
 if(!/^[0-9a-f-]{36}$/.test(id))return response({erro:"Identificador invalido."},400);
 const loja=isManager(u)?"":u.loja_codigo,date=now();
 const result=await env.DB.prepare("UPDATE ct_solicitacoes SET status='SOLICITACAO',finalizada_em=NULL,finalizada_por=NULL,atualizado_em=? WHERE id=? AND status='CONCLUIDO' AND (?='' OR loja_codigo=?)").bind(date,id,loja,loja).run();
 if(result.meta?.changes!==1)return response({erro:"Registro nao encontrado, sem acesso ou ja reaberto."},409);
 await audit(env,"REABRIR_LAVAGEM",u.id,id);
 return response({reaberto:true});
}
async function exportCards(env,u){
 if(!isAdmin(u))return response({erro:"Somente C&O."},403);
 const r=await env.DB.prepare("SELECT id,numero_solicitacao,placa,loja_codigo,tipo_lavagem,status,recebida_em,finalizada_em,origem,observacao FROM ct_solicitacoes ORDER BY recebida_em DESC LIMIT 10000").all();
 return response({exportado_em:now(),total:r.results.length,registros:r.results.map(displayCard)});
}
export async function contingenciaApi(r,env,url){
 const path=url.pathname;
 if(!path.startsWith(PREFIX+"/"))return null;
 if(path===PREFIX+"/config"&&r.method==="GET"){
  const pronto=enabled(env);
  const estrutura_pronta=pronto?await verificarEstruturaContingencia(env):false;
  return response({ambiente:"homologacao",independente_supabase:true,pronto,
    estrutura_pronta,instalacao_automatica_com_chave:true,
    email_relay_habilitado:pronto&&typeof env.CT_EMAIL_RELAY_SECRET==="string"&&env.CT_EMAIL_RELAY_SECRET.length>=32,
    email_routing_configurado:pronto&&typeof env.CT_EMAIL_INBOUND_TO==="string"&&env.CT_EMAIL_INBOUND_TO.includes("@")});
 }
 if(!enabled(env))return response({erro:"Ativacao de contingencia pendente no Cloudflare."},503);
 try{
  if(path===PREFIX+"/bootstrap"&&r.method==="POST")return bootstrap(r,env);
  if(path===PREFIX+"/login"&&r.method==="POST")return login(r,env);
  if(path===PREFIX+"/logout"&&r.method==="POST")return logout(r,env);
  if(path===PREFIX+"/email/relay"&&r.method==="POST")return importEmail(r,env,null,true);
  const u=await session(r,env);
  if(!u)return response({erro:"Sessao expirada ou usuario sem acesso."},401);
  if(path===PREFIX+"/me"&&r.method==="GET")return response({usuario:userOut(u)});
  if(path===PREFIX+"/senha"&&r.method==="POST")return passwordChange(r,env,u);
  if(u.trocar_senha===1)return response({erro:"Troque sua senha temporaria antes de usar o sistema.",trocar_senha:true},403);
  if(path===PREFIX+"/funcionarios"&&r.method==="GET"){
   if(!isAdmin(u))return response({erro:"Somente C&O."},403);
   const list=await env.DB.prepare("SELECT * FROM ct_funcionarios ORDER BY nome LIMIT 250").all();
   return response({funcionarios:list.results.map(userOut)});
  }
  if(path===PREFIX+"/funcionarios"&&r.method==="POST")return employeeCreate(r,env,u);
  if(path===PREFIX+"/funcionarios/status"&&r.method==="POST")return employeeToggle(r,env,u);
  if(path===PREFIX+"/funcionarios/atualizar"&&r.method==="POST")return employeeEdit(r,env,u);
  if(path===PREFIX+"/funcionarios/redefinir-senha"&&r.method==="POST")return employeeResetPassword(r,env,u);
  if(path===PREFIX+"/cards"&&r.method==="GET")return listCards(env,u,url);
  if(path===PREFIX+"/cards"&&r.method==="POST")return createCard(r,env,u);
  if(path===PREFIX+"/email/colar"&&r.method==="POST")return importEmail(r,env,u);
  if(path===PREFIX+"/email/status"&&r.method==="GET")return statusGmail(env,u);
  if(path.startsWith(PREFIX+"/finalizar/")&&r.method==="POST")return finalize(r,env,u,path.slice((PREFIX+"/finalizar/").length));
  if(path.startsWith(PREFIX+"/reabrir/")&&r.method==="POST")return reopen(r,env,u,path.slice((PREFIX+"/reabrir/").length));
  if(path===PREFIX+"/exportar"&&r.method==="GET")return exportCards(env,u);
  return response({erro:"Rota ou metodo invalido."},404);
 }catch{return response({erro:"Falha interna na operacao de contingencia."},503);}
}
