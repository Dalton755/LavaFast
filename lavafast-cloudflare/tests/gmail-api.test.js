import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";
import worker from "../src/index.js";

const BASE="https://lavafast.rochadalton00.workers.dev";
const CPF="529.982.247-25"; // CPF ficticio de testes
const PASS="SenhaFicticiaAdmin#123";
const SETUP="ChaveExclusivaExemploHomologacaoNaoUsarNaProducao";
const PEPPER="OutroSegredoExclusivoExemploNaoUsarNaProducao";
const ALLOWED="rochadalton00@gmail.com";
const BODY=[
 "Prezado,","Fornecedor: GLOW FLEET LTDA",
 "Responsável pela Solicitação: Exemplo",
 "Agencia da Abertura: ACUCP",
 "Número da solicitação","Placa","Tipo de Lavagem","Valor",
 "991122334","XYZ3A57","R$ 900,00","Atenciosamente,","Localiza"
].join("\n");
function fixture(){
 const db=new DatabaseSync(":memory:");
 db.exec("PRAGMA foreign_keys=ON");
 const migrations=["0001_piloto_lojas.sql","0002_operacoes_estrutura.sql","0003_piloto_operacao.sql",
  "0004_hml_usuarios.sql","0005_login_cpf_bridge.sql","0006_contingencia_independente.sql",
  "0007_email_importacoes.sql","0008_gmail_oauth.sql"];
 for(const f of migrations)db.exec(readFileSync(new URL("../migrations/"+f,import.meta.url),"utf8"));
 const DB={prepare(sql){const s=db.prepare(sql);
  return {
   bind(...args){return {
    first:async()=>s.get(...args)||null,
    all:async()=>({results:s.all(...args)}),
    run:async()=>({meta:{changes:Number(s.run(...args).changes)}})
   }},
   first:async()=>s.get()||null,
   all:async()=>({results:s.all()}),
   run:async()=>({meta:{changes:Number(s.run().changes)}})
  };
 }};
 const env={ENVIRONMENT:"homologacao",DB,
  CT_BOOTSTRAP_SECRET:SETUP,CT_AUTH_PEPPER:PEPPER,
  CT_GMAIL_CLIENT_ID:"99999999-abcdef.apps.googleusercontent.com",
  CT_GMAIL_CLIENT_SECRET:"segredo-google-ficticio",
  CT_GMAIL_TOKEN_KEY:"segredo-para-criptografia-de-mais-de-32-caracteres",
  CT_GMAIL_ALLOWED_EMAIL:ALLOWED};
 return {db,env};
}
async function call(env,path,method="GET",payload=null,cookie="",headers={}){
 const h={...headers};
 if(method!=="GET"){h.Origin??=BASE;h["content-type"]="application/json";}
 if(cookie)h.cookie=cookie;
 const res=await worker.fetch(new Request(BASE+path,{method,headers:h,
  body:method==="GET"?undefined:JSON.stringify(payload||{})}),env);
 const text=await res.text();
 let result;try{result=JSON.parse(text);}catch{result=text;}
 return {status:res.status,body:result,headers:res.headers};
}
async function admin(env){
 const create=await call(env,"/api/contingencia/bootstrap","POST",
  {cpf:CPF,nome:"Administrador de Exemplo",senha:PASS},"",{"x-ct-setup":SETUP});
 assert.equal(create.status,201);
 const auth=await call(env,"/api/contingencia/login","POST",{cpf:CPF,senha:PASS});
 assert.equal(auth.status,200);
 return auth.headers.get("set-cookie").split(";")[0];
}
function mockedGoogle(){
 const native=globalThis.fetch;
 const data=Buffer.from(BODY).toString("base64url");
 let hits=0,profile=ALLOWED,scope="https://www.googleapis.com/auth/gmail.readonly",historico=false,queries=[];
 globalThis.fetch=async(url,opts)=>{
  const u=String(url);
  if(u==="https://oauth2.googleapis.com/token"){
   hits++;
   const body=new URLSearchParams(opts.body);
   assert.equal(body.get("client_id"),"99999999-abcdef.apps.googleusercontent.com");
   assert.equal(body.get("client_secret"),"segredo-google-ficticio");
   if(body.get("grant_type")==="authorization_code")assert.ok(body.get("code_verifier"));
   if(body.get("grant_type")==="refresh_token")assert.equal(body.get("refresh_token"),"token-de-renovacao-ficticio");
   return Response.json({access_token:"fake-test-access-token",refresh_token:"token-de-renovacao-ficticio",scope});
  }
  assert.match(u,/^https:\/\/gmail\.googleapis\.com\/gmail\/v1\/users\/me\//);
  assert.equal(opts.headers.authorization,"Bearer fake-test-access-token");
  if(u.endsWith("/profile"))return Response.json({emailAddress:profile});
  if(u.includes("/messages?")){
   const p=new URL(u).searchParams;queries.push(p.get("q"));
   if(historico)return Response.json(p.get("pageToken")?{messages:[{id:"aabbccddeeff0033"}]}:{messages:[{id:"aabbccddeeff0011"},{id:"aabbccddeeff0022"}],nextPageToken:"pagina2"});
   return Response.json({messages:[{id:"aabbccddeeff0011",threadId:"ddeeff"}]});
  }
  if(historico&&/messages\/aabbccddeeff00(?:22|33)\?format=full/.test(u))return Response.json({
   internalDate:String(Date.now()-48*3600000),
   payload:{mimeType:"text/plain",body:{data:u.includes("0033")?Buffer.from(BODY.replace("991122334","991122335")).toString("base64url"):data},
    headers:[{name:"From",value:"<no-reply@localiza.com>"},{name:"Subject",value:"Solicitação de Lavagem"}]}
  });
  if(u.includes("/messages/aabbccddeeff0011?format=full"))return Response.json({
   id:"aabbccddeeff0011",internalDate:String(Date.now()),
   payload:{mimeType:"text/plain",body:{data},
    headers:[
     {name:"From",value:"<no-reply@localiza.com>"},
     {name:"Subject",value:"=?utf-8?B?U29saWNpdGHDp8OjbyBkZSBMYXZhZ2Vt?="}
    ]}
  });
  throw Error("URL inesperada no mock");
 };
 return {restore(){globalThis.fetch=native},setWrongAccount(){profile="outro@gmail.com"},getHits(){return hits},setHistory(){historico=true},getQueries(){return queries}};
}
test("autorizacao Gmail CPF Admin, PKCE e senha/token nunca em texto no D1",async()=>{
 const {db,env}=fixture();
 const mock=mockedGoogle();
 try{
  const denied=await call(env,"/api/contingencia/gmail/status");
  assert.equal(denied.status,403);
  const cookie=await admin(env);
  const st=await call(env,"/api/contingencia/gmail/status","GET",null,cookie);
  assert.equal(st.status,200);
  assert.equal(st.body.configurado,true);
  assert.equal(st.body.conectado,false);
  const auth=await call(env,"/api/contingencia/gmail/authorize","POST",{},cookie);
  assert.equal(auth.status,200);
  const link=new URL(auth.body.url);
  assert.equal(link.hostname,"accounts.google.com");
  assert.equal(link.searchParams.get("access_type"),"offline");
  assert.equal(link.searchParams.get("scope"),"https://www.googleapis.com/auth/gmail.readonly");
  assert.equal(link.searchParams.get("code_challenge_method"),"S256");
  assert.equal(link.searchParams.get("redirect_uri"),BASE+"/api/contingencia/gmail/callback");
  const state=link.searchParams.get("state");
  assert.ok(state.length>30);
  const invalid=await call(env,"/api/contingencia/gmail/callback?state=estado-invalido&code=xyz");
  assert.equal(invalid.status,303);
  assert.equal(mock.getHits(),0);
  const callback=await call(env,"/api/contingencia/gmail/callback?state="+state+"&code=autorizado");
  assert.equal(callback.status,303);
  assert.match(callback.headers.get("location"),/gmail=conectado/);
  const row=db.prepare("SELECT * FROM ct_gmail_integracao").get();
  assert.equal(row.gmail,ALLOWED);
  assert.ok(!JSON.stringify(row).includes("token-de-renovacao-ficticio"));
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM ct_gmail_oauth_states").get().n,0);
  assert.equal((await call(env,"/api/contingencia/gmail/callback?state="+state+"&code=autorizado")).status,303);
  const sync=await call(env,"/api/contingencia/gmail/sync","POST",{},cookie);
  assert.equal(sync.status,200);
  assert.equal(sync.body.cards_criados,1);
  const card=db.prepare("SELECT * FROM ct_solicitacoes WHERE numero_solicitacao='991122334'").get();
  assert.equal(card.loja_codigo,"CENTRAL_PLAZA");
  assert.equal(card.placa,"XYZ3A57");
  assert.equal(card.status,"SOLICITACAO");
  assert.equal(card.origem,"IMPORTACAO_EMAIL");
  assert.ok(!JSON.stringify(card).includes("900,00"));
  const again=await call(env,"/api/contingencia/gmail/sync","POST",{},cookie);
  assert.equal(again.status,200);
  assert.equal(again.body.cards_criados,0);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM ct_solicitacoes").get().n,1);
  const updated=await call(env,"/api/contingencia/gmail/status","GET",null,cookie);
  assert.equal(updated.body.cards_criados,1);
  assert.equal(updated.body.mensagens_analisadas,1);
  assert.ok(updated.body.ultimo_sucesso);
  const foreign=await call(env,"/api/contingencia/gmail/sync","POST",{},cookie,{Origin:"https://malicioso.invalid"});
  assert.equal(foreign.status,403);
 }finally{mock.restore();db.close();}
});
test("autorizacao Google recusa conta diferente da permitida",async()=>{
 const {db,env}=fixture(),mock=mockedGoogle();
 try{
  const cookie=await admin(env);
  const auth=await call(env,"/api/contingencia/gmail/authorize","POST",{},cookie);
  const state=new URL(auth.body.url).searchParams.get("state");
  mock.setWrongAccount();
  const res=await call(env,"/api/contingencia/gmail/callback?state="+state+"&code=autorizado");
  assert.equal(res.status,303);
  assert.match(res.headers.get("location"),/gmail=erro/);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM ct_gmail_integracao").get().n,0);
 }finally{mock.restore();db.close();}
});

test("recuperacao de 3 dias pagina historico, nao duplica SL concluida e preserva checkpoint",async()=>{
 const {db,env}=fixture(),mock=mockedGoogle();
 try{
  const cookie=await admin(env);
  const auth=await call(env,"/api/contingencia/gmail/authorize","POST",{},cookie);
  const state=new URL(auth.body.url).searchParams.get("state");
  await call(env,"/api/contingencia/gmail/callback?state="+state+"&code=autorizado");
  assert.equal((await call(env,"/api/contingencia/gmail/sync","POST",{},cookie)).body.cards_criados,1);
  db.prepare("UPDATE ct_solicitacoes SET status='CONCLUIDO' WHERE numero_solicitacao='991122334'").run();
  const original=db.prepare("SELECT * FROM ct_solicitacoes WHERE numero_solicitacao='991122334'").get();
  const checkpoint=db.prepare("SELECT ultima_consulta,ultimo_sucesso FROM ct_gmail_integracao").get();
  mock.setHistory();
  const path="/api/contingencia/gmail/recuperar";
  assert.equal((await call(env,path,"POST",{dias:3})).status,403);
  assert.equal((await call(env,path,"POST",{dias:3},cookie,{Origin:"https://malicioso.invalid"})).status,403);
  assert.equal((await call(env,path,"POST",{dias:30},cookie)).status,400);
  const a=await call(env,path,"POST",{dias:3},cookie);
  assert.equal(a.status,200);
  assert.equal(a.body.cards_criados,0);
  assert.equal(a.body.sl_duplicadas,2);
  assert.equal(a.body.erros,0);
  assert.equal(a.body.proximo,"pagina2");
  const b=await call(env,path,"POST",{dias:3,cursor:a.body.proximo,fim:a.body.fim},cookie);
  assert.equal(b.status,200);
  assert.equal(b.body.cards_criados,1);
  assert.equal(b.body.proximo,null);
  assert.equal(b.body.erros,0);
  const historico=db.prepare("SELECT * FROM ct_solicitacoes WHERE numero_solicitacao='991122335'").get();
  assert.equal(historico.status,"SOLICITACAO");
  assert.ok(Math.abs(Date.parse(historico.recebida_em)-(Date.now()-48*3600000))<60000);
  assert.deepEqual(db.prepare("SELECT * FROM ct_solicitacoes WHERE numero_solicitacao='991122334'").get(),original);
  assert.deepEqual(db.prepare("SELECT ultima_consulta,ultimo_sucesso FROM ct_gmail_integracao").get(),checkpoint);
  assert.equal(mock.getQueries().at(-1),mock.getQueries().at(-2));
  assert.match(mock.getQueries().at(-1),new RegExp("after:"+Math.floor((a.body.fim-3*86400000)/1000)));
  assert.equal((await call(env,path,"POST",{dias:3,cursor:a.body.proximo,fim:a.body.fim},cookie)).body.cards_criados,0);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM ct_solicitacoes").get().n,2);
 }finally{mock.restore();db.close();}
});
