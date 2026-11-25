import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";
import {Script} from "node:vm";
import worker from "../src/index.js";

const BASE="https://lavafast-teste.invalid";
const ADMIN_CPF="529.982.247-25"; // CPF de exemplo exclusivamente em testes
const OPER_CPF="111.444.777-35"; // CPF de exemplo exclusivamente em testes
const ADMIN_PASSWORD="SenhaDeTeste!12345";
const TEMP_PASSWORD="TrocaObrigatoria#123";
const SECRET="um-segredo-forte-de-exemplo-que-nao-sera-usado-em-producao";
const PEPPER="outro-segredo-exclusivo-para-proteger-o-hmac-de-cpf";
const file=name=>readFileSync(new URL("../migrations/"+name,import.meta.url),"utf8");

function dbLocal(){
 const db=new DatabaseSync(":memory:");
 db.exec("PRAGMA foreign_keys=ON;");
 for(const name of ["0001_piloto_lojas.sql","0002_operacoes_estrutura.sql",
  "0003_piloto_operacao.sql","0004_hml_usuarios.sql","0005_login_cpf_bridge.sql",
  "0006_contingencia_independente.sql"]) db.exec(file(name));
 return db;
}
function bind(db){
 return {prepare(q){
  const s=db.prepare(q);
  return {
   bind(...args){return {first:async()=>s.get(...args)||null,
    all:async()=>({results:s.all(...args)}),
    run:async()=>({meta:{changes:Number(s.run(...args).changes)}})}},
   first:async()=>s.get()||null,all:async()=>({results:s.all()}),
   run:async()=>({meta:{changes:Number(s.run().changes)}})
  };
 }};
}
const env=(db)=>({ENVIRONMENT:"homologacao",DB:bind(db),CT_BOOTSTRAP_SECRET:SECRET,CT_AUTH_PEPPER:PEPPER});
async function call(path,environment,method="GET",payload=null,cookie="",extraHeaders={}){
 const headers={...extraHeaders};
 if(cookie)headers.cookie=cookie;
 if(method!=="GET"){headers.origin=BASE;headers["content-type"]="application/json";}
 const res=await worker.fetch(new Request(BASE+path,{method,headers,
  body:method==="GET"?undefined:JSON.stringify(payload??{})}),environment);
 return {status:res.status,headers:res.headers,result:await res.json()};
}
async function admin(db){
 const e=env(db);
 const bootstrap=await call("/api/contingencia/bootstrap",e,"POST",
  {cpf:ADMIN_CPF,nome:"Administrador de Teste",senha:ADMIN_PASSWORD},"",{"x-ct-setup":SECRET});
 assert.equal(bootstrap.status,201);
 const login=await call("/api/contingencia/login",e,"POST",
  {cpf:ADMIN_CPF,senha:ADMIN_PASSWORD});
 assert.equal(login.status,200);
 return {environment:e,cookie:login.headers.get("set-cookie").split(";")[0]};
}

test("contingencia inicia BLOQUEADA sem segredo e sem depender do Supabase",async()=>{
 const db=dbLocal();
 try{
  const r=await call("/api/contingencia/config",{ENVIRONMENT:"homologacao",DB:bind(db)});
  assert.equal(r.status,200);
  assert.equal(r.result.pronto,false);
  const denied=await call("/api/contingencia/login",{ENVIRONMENT:"homologacao",DB:bind(db)},"POST",
   {cpf:ADMIN_CPF,senha:ADMIN_PASSWORD});
  assert.equal(denied.status,503);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM ct_funcionarios").get().n,0);
  assert.equal((await call("/api/contingencia/config",{...env(db),ENVIRONMENT:"producao"})).result.pronto,false);
 }finally{db.close();}
});

test("bootstrap protegido, senha CPF, sessao HttpOnly, bloqueios e logout",async()=>{
 const db=dbLocal();
 try{
  const e=env(db);
  const noSecret=await call("/api/contingencia/bootstrap",e,"POST",
   {cpf:ADMIN_CPF,nome:"Administrador de Teste",senha:ADMIN_PASSWORD});
  assert.equal(noSecret.status,403);
  const {cookie}=await admin(db);
  assert.match(cookie,/__Host-lfct=/);
  const same=await call("/api/contingencia/bootstrap",e,"POST",
   {cpf:ADMIN_CPF,nome:"Administrador",senha:ADMIN_PASSWORD},"",{"x-ct-setup":SECRET});
  assert.equal(same.status,409);
  const me=await call("/api/contingencia/me",e,"GET",null,cookie);
  assert.equal(me.status,200);
  assert.equal(me.result.usuario.perfil,"CO");
  assert.equal(me.result.usuario.loja_codigo,"TODAS");
  assert.ok(!Object.hasOwn(me.result.usuario,"cpf"));
  const dbUser=db.prepare("SELECT * FROM ct_funcionarios").get();
  assert.ok(!JSON.stringify(dbUser).includes(ADMIN_CPF));
  assert.ok(!JSON.stringify(dbUser).includes(ADMIN_PASSWORD));
  const invalid=await call("/api/contingencia/login",e,"POST",{cpf:ADMIN_CPF,senha:"senha-incorreta"});
  assert.equal(invalid.status,401);
  const logout=await call("/api/contingencia/logout",e,"POST",{},cookie);
  assert.equal(logout.status,200);
  assert.match(logout.headers.get("set-cookie"),/Max-Age=0/);
  assert.equal((await call("/api/contingencia/me",e,"GET",null,cookie)).status,401);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM ct_sessoes").get().n,0);
 }finally{db.close();}
});

test("admin cria colaborador por CPF, troca obrigatoria, papel restrito a loja",async()=>{
 const db=dbLocal();
 try{
  const {environment:e,cookie}=await admin(db);
  const newEmployee=await call("/api/contingencia/funcionarios",e,"POST",{
   cpf:OPER_CPF,nome:"Operador Exemplo",cargo:"Lavador",loja_codigo:"MOOCA",
   senha_temporaria:TEMP_PASSWORD
  },cookie);
  assert.equal(newEmployee.status,201);
  assert.ok(!JSON.stringify(newEmployee.result).includes(OPER_CPF));
  const opLogin=await call("/api/contingencia/login",e,"POST",
    {cpf:OPER_CPF,senha:TEMP_PASSWORD});
  assert.equal(opLogin.status,200);
  const employeeCookie=opLogin.headers.get("set-cookie").split(";")[0];
  assert.equal(opLogin.result.usuario.perfil,"OPERACAO");
  assert.equal(opLogin.result.usuario.trocar_senha,true);
  const blocked=await call("/api/contingencia/cards",e,"GET",null,employeeCookie);
  assert.equal(blocked.status,403);
  const badChange=await call("/api/contingencia/senha",e,"POST",
   {senha_atual:"incorreta",nova_senha:"SenhaNovaSuperForte#123"},employeeCookie);
  assert.equal(badChange.status,403);
  const change=await call("/api/contingencia/senha",e,"POST",
   {senha_atual:TEMP_PASSWORD,nova_senha:"SenhaNovaSuperForte#123"},employeeCookie);
  assert.equal(change.status,200);
  assert.equal((await call("/api/contingencia/me",e,"GET",null,employeeCookie)).status,401);
  const again=await call("/api/contingencia/login",e,"POST",
   {cpf:OPER_CPF,senha:"SenhaNovaSuperForte#123"});
  const cookieOp=again.headers.get("set-cookie").split(";")[0];
  assert.equal(again.result.usuario.trocar_senha,false);
  assert.equal((await call("/api/contingencia/cards?loja=CENTRAL_PLAZA",e,"GET",null,cookieOp)).status,403);
  assert.equal((await call("/api/contingencia/funcionarios",e,"GET",null,cookieOp)).status,403);
  assert.equal((await call("/api/contingencia/exportar",e,"GET",null,cookieOp)).status,403);
  const toggle=await call("/api/contingencia/funcionarios/status",e,"POST",{
   id:newEmployee.result.funcionario.id,ativo:false
  },cookie);
  assert.equal(toggle.status,200);
  assert.equal((await call("/api/contingencia/me",e,"GET",null,cookieOp)).status,401);
 }finally{db.close();}
});

test("cartoes por email colado, insercao manual, deduplicacao e finalizacao atomica",async()=>{
 const db=dbLocal();
 try{
  const {environment:e,cookie}=await admin(db);
  const manual=await call("/api/contingencia/cards",e,"POST",{
   numero_solicitacao:"12345678",placa:"ABC1D23",loja_codigo:"MOOCA",
   tipo_lavagem:"Completa",observacao:"Somente operacao"
  },cookie);
  assert.equal(manual.status,201);
  const duplicate=await call("/api/contingencia/cards",e,"POST",{
   numero_solicitacao:"12345678",placa:"ABC1D23",loja_codigo:"MOOCA"
  },cookie);
  assert.equal(duplicate.status,409);
  const imported=await call("/api/contingencia/email/colar",e,"POST",{
   loja_codigo:"CENTRAL_PLAZA",
   texto:"Fornecedor: Localiza\n12345679\nXYZ2A45\nR$ 99,90\n12345680 GHI3J67\nR$ 110,00"
  },cookie);
  assert.equal(imported.status,200);
  assert.deepEqual([imported.result.criados,imported.result.duplicados],[2,0]);
  const retry=await call("/api/contingencia/email/colar",e,"POST",{
   loja_codigo:"CENTRAL_PLAZA",texto:"12345679\nXYZ2A45\n12345680 GHI3J67"
  },cookie);
  assert.equal(retry.result.duplicados,2);
  const open=await call("/api/contingencia/cards?aba=solicitacoes",e,"GET",null,cookie);
  assert.equal(open.result.total,3);
  assert.ok(!JSON.stringify(open.result).includes("valor_centavos"));
  assert.ok(!JSON.stringify(open.result).includes("99,90"));
  const target=open.result.cards.find(x=>x.numero_solicitacao==="12345678");
  assert.ok(target);
  const done=await call("/api/contingencia/finalizar/"+target.id,e,"POST",{},cookie);
  assert.equal(done.status,200);
  const double=await call("/api/contingencia/finalizar/"+target.id,e,"POST",{},cookie);
  assert.equal(double.status,409);
  const completed=await call("/api/contingencia/cards?aba=concluidos",e,"GET",null,cookie);
  assert.equal(completed.result.total,1);
  assert.ok(completed.result.cards[0].tempo_total_segundos>=0);
  const exportResponse=await call("/api/contingencia/exportar",e,"GET",null,cookie);
  assert.equal(exportResponse.result.total,3);
  assert.equal(db.prepare("PRAGMA foreign_key_check").all().length,0);
 }finally{db.close();}
});

test("relay de email bloqueado ate secreto proprio; visual separado e validado",async()=>{
 const db=dbLocal();
 try{
  const e=env(db);
  const relay=await call("/api/contingencia/email/relay",e,"POST",{
   loja_codigo:"MOOCA",texto:"12345679\nABC1D23"
  });
  assert.equal(relay.status,403);
  const page=await worker.fetch(new Request(BASE+"/contingencia"),e);
  assert.equal(page.status,200);
  const html=await page.text();
  assert.match(html,/Operação de lavagens/);
  assert.match(html,/Primeiro administrador/);
  assert.match(html,/id="email-texto"/);
  assert.match(html,/id="equipe-form"/);
  assert.doesNotMatch(html,/valor_centavos|apikey|service_role/);
  const scriptResp=await worker.fetch(new Request(BASE+"/contingencia/app.js"),e);
  assert.equal(scriptResp.status,200);
  const client=await scriptResp.text();
  new Script(client);
  assert.doesNotMatch(client,/localStorage|document\.cookie|innerHTML/);
  assert.match(client,/\/api\/contingencia\/cards/);
 }finally{db.close();}
});
