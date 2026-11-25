import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";
import {Script} from "node:vm";
import worker from "../src/index.js";

const BASE="https://lavafast-teste.invalid";
const FIRST="529.982.247-25";
const SETUP="bootstrap-sintetico-forte-para-testes-sem-uso-em-producao";
const PEPPER="pepper-sintetico-independente-para-testes-do-cloudflare";
const PWD="SenhaForteExemplo!12345";
const TEMP="TrocaObrigatoria#6789";

function cpf(prefix){
 let d=prefix;
 for(let n=9;n<=10;n++){
  let sum=0;for(let i=0;i<n;i++)sum+=Number(d[i])*(n+1-i);
  const x=sum*10%11;d+=String(x===10?0:x);
 }
 return d;
}
function setup(){
 const db=new DatabaseSync(":memory:");
 db.exec("PRAGMA foreign_keys=ON");
 for(const n of ["0001_piloto_lojas.sql","0002_operacoes_estrutura.sql",
 "0003_piloto_operacao.sql","0004_hml_usuarios.sql",
 "0005_login_cpf_bridge.sql","0006_contingencia_independente.sql"])
 db.exec(readFileSync(new URL("../migrations/"+n,import.meta.url),"utf8"));
 const D1={prepare(sql){
  const s=db.prepare(sql);
  return {bind(...a){return {first:async()=>s.get(...a)||null,
   all:async()=>({results:s.all(...a)}),
   run:async()=>({meta:{changes:Number(s.run(...a).changes)}})}},
   first:async()=>s.get()||null,all:async()=>({results:s.all()})};
 }};
 return {db,env:{ENVIRONMENT:"homologacao",DB:D1,CT_BOOTSTRAP_SECRET:SETUP,CT_AUTH_PEPPER:PEPPER}};
}
async function call(e,path,method="GET",value=null,cookie="",origin=BASE){
 const headers={};
 if(cookie)headers.cookie=cookie;
 if(method!=="GET"){headers.Origin=origin;headers["Content-Type"]="application/json";}
 if(path==="/api/contingencia/bootstrap")headers["x-ct-setup"]=SETUP;
 const req=new Request(BASE+path,{method,headers,body:method==="GET"?undefined:JSON.stringify(value||{})});
 const res=await worker.fetch(req,e);
 return {status:res.status,body:await res.json(),cookie:res.headers.get("set-cookie")};
}
async function admin(e){
 const created=await call(e,"/api/contingencia/bootstrap","POST",{cpf:FIRST,nome:"C&O de Exemplo",senha:PWD});
 assert.equal(created.status,201);
 const login=await call(e,"/api/contingencia/login","POST",{cpf:FIRST,senha:PWD});
 assert.equal(login.status,200);
 return login.cookie.split(";")[0];
}
test("cadastro rapido abre com interface limpa e script valido",async()=>{
 const {db,env}=setup();try{
  const page=await worker.fetch(new Request(BASE+"/contingencia/cadastro"),env);
  assert.equal(page.status,200);
  const html=await page.text();
  for(const part of ["id=\"employee-form\"","id=\"saved-password\"","id=\"edit-dialog\"","id=\"reset-dialog\""])
    assert.ok(html.includes(part));
  assert.doesNotMatch(html,/valor_centavos|service_role/);
  const script=await worker.fetch(new Request(BASE+"/contingencia/cadastro.js"),env);
  assert.equal(script.status,200);
  const text=await script.text();new Script(text);
  assert.doesNotMatch(text,/localStorage|sessionStorage|document\.cookie|innerHTML/);
  const production=await worker.fetch(new Request(BASE+"/contingencia/cadastro"),{...env,ENVIRONMENT:"producao"});
  assert.equal(production.status,404);
 }finally{db.close();}
});
test("CPF unico salvo no D1, sem CPF ou senha em texto, acesso restrito",async()=>{
 const {db,env}=setup();try{
  assert.equal((await call(env,"/api/contingencia/funcionarios")).status,401);
  const root=await admin(env),mycpf=cpf("246813579");
  const body={cpf:mycpf,nome:"Funcionario de Exemplo",cargo:"Lavador",loja_codigo:"MOOCA",senha_temporaria:TEMP};
  const created=await call(env,"/api/contingencia/funcionarios","POST",body,root);
  assert.equal(created.status,201);
  const saved=db.prepare("SELECT * FROM ct_funcionarios WHERE id=?").get(created.body.funcionario.id);
  assert.equal(saved.nome,body.nome);
  assert.equal(saved.trocar_senha,1);
  assert.ok(!JSON.stringify(saved).includes(mycpf));
  assert.ok(!JSON.stringify(saved).includes(TEMP));
  const duplicate=await call(env,"/api/contingencia/funcionarios","POST",body,root);
  assert.equal(duplicate.status,409);
  assert.match(duplicate.body.erro,/CPF ja esta cadastrado/);
  const logged=await call(env,"/api/contingencia/login","POST",{cpf:mycpf,senha:TEMP});
  assert.equal(logged.status,200);
  assert.equal(logged.body.usuario.perfil,"OPERACAO");
  assert.equal((await call(env,"/api/contingencia/funcionarios","POST",body,logged.cookie.split(";")[0])).status,403);
 }finally{db.close();}
});
test("Admin tem direito de cadastrar, editar e redefinir senha temporaria",async()=>{
 const {db,env}=setup();try{
  const root=await admin(env);
  const adminCpf=cpf("925371648"),workerCpf=cpf("837261405");
  const a=await call(env,"/api/contingencia/funcionarios","POST",
    {cpf:adminCpf,nome:"Admin Exemplo",cargo:"Admin",loja_codigo:"TODAS",senha_temporaria:TEMP},root);
  assert.equal(a.status,201);
  const login=await call(env,"/api/contingencia/login","POST",{cpf:adminCpf,senha:TEMP});
  assert.equal(login.status,200);
  assert.equal(login.body.usuario.perfil,"CO");
  const restricted=login.cookie.split(";")[0];
  assert.equal((await call(env,"/api/contingencia/funcionarios", "GET",null,restricted)).status,403);
  const changed=await call(env,"/api/contingencia/senha","POST",
    {senha_atual:TEMP,nova_senha:"SenhaNovaAdministrador!123"},restricted);
  assert.equal(changed.status,200);
  const fresh=await call(env,"/api/contingencia/login","POST",
    {cpf:adminCpf,senha:"SenhaNovaAdministrador!123"});
  const adminCookie=fresh.cookie.split(";")[0];
  const created=await call(env,"/api/contingencia/funcionarios","POST",
    {cpf:workerCpf,nome:"Funcionario Inicial",cargo:"Lavador",loja_codigo:"MOOCA",senha_temporaria:TEMP},
    adminCookie);
  assert.equal(created.status,201);
  const id=created.body.funcionario.id;
  const updated=await call(env,"/api/contingencia/funcionarios/atualizar","POST",
    {id,nome:"Funcionario Atualizado",cargo:"Analista",loja_codigo:"TODAS"},adminCookie);
  assert.equal(updated.status,200);
  const everyone=await call(env,"/api/contingencia/funcionarios","GET",null,adminCookie);
  assert.equal(everyone.body.funcionarios.find(x=>x.id===id).cargo,"Analista");
  const reset=await call(env,"/api/contingencia/funcionarios/redefinir-senha","POST",
    {id,senha_temporaria:"OutraSenhaProvisoria!9876"},adminCookie);
  assert.equal(reset.status,200);
  assert.equal(reset.body.requer_troca,true);
  assert.ok(!JSON.stringify(reset.body).includes("OutraSenhaProvisoria!9876"));
  assert.equal((await call(env,"/api/contingencia/login","POST",
    {cpf:workerCpf,senha:TEMP})).status,401);
  const newLogin=await call(env,"/api/contingencia/login","POST",
    {cpf:workerCpf,senha:"OutraSenhaProvisoria!9876"});
  assert.equal(newLogin.status,200);
  assert.equal(newLogin.body.usuario.trocar_senha,true);
  assert.equal(newLogin.body.usuario.perfil,"ANALISTA");
  assert.equal((await call(env,"/api/contingencia/funcionarios/atualizar","POST",
    {id:a.body.funcionario.id,nome:"Tentativa",cargo:"Lavador",loja_codigo:"MOOCA"},adminCookie)).status,403);
  assert.equal(db.prepare("PRAGMA foreign_key_check").all().length,0);
 }finally{db.close();}
});
test("origem externa nao altera equipe",async()=>{
 const {db,env}=setup();try{
  const root=await admin(env);
  for(const path of ["/api/contingencia/funcionarios",
    "/api/contingencia/funcionarios/atualizar",
    "/api/contingencia/funcionarios/redefinir-senha"]){
    const result=await call(env,path,"POST",{id:"inexistente",nome:"Outro",cpf:"123",senha_temporaria:TEMP},root,"https://malicioso.invalid");
    assert.equal(result.status,403);
  }
 }finally{db.close();}
});
