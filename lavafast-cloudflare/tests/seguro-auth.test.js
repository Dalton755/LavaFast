import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { verificarTokenGoogle } from "../src/authGoogle.js";
import worker from "../src/index.js";

const CLIENT="1234567890-test.apps.googleusercontent.com";
const BASE="https://lavafast-hml.invalid";
const oldFetch=globalThis.fetch;
const enc=new TextEncoder();
const base64url=input=>Buffer.from(input).toString("base64url");
const decodeJson=input=>JSON.parse(Buffer.from(input,"base64url").toString("utf8"));
const sql=name=>readFileSync(new URL("../migrations/"+name,import.meta.url),"utf8");

function d1(db){
  return {prepare(query){
    const p=db.prepare(query);
    return {
      bind(...args){return {
        all:async()=>({results:p.all(...args)}),
        first:async()=>p.get(...args)||null,
        run:async()=>({meta:{changes:Number(p.run(...args).changes)}})
      }},
      all:async()=>({results:p.all()}),first:async()=>p.get()||null,
      run:async()=>({meta:{changes:Number(p.run().changes)}})
    };
  }};
}
async function makeSigner(){
  const pair=await webcrypto.subtle.generateKey({
    name:"RSASSA-PKCS1-v1_5",modulusLength:2048,
    publicExponent:Uint8Array.of(1,0,1),hash:"SHA-256"
  },true,["sign","verify"]);
  const publicJwk=await webcrypto.subtle.exportKey("jwk",pair.publicKey);
  publicJwk.kid="hml-test-1";
  publicJwk.alg="RS256";
  publicJwk.use="sig";
  return async (email="admin@gmail.com",extra={})=>{
    const now=Math.floor(Date.now()/1000);
    const claims={
      iss:"https://accounts.google.com",
      aud:CLIENT,sub:email==="admin@gmail.com"?"8888888888888":"9999999999999",
      iat:now-15,exp:now+300,email,email_verified:true,name:"Teste seguro",...extra
    };
    const prefix=base64url(JSON.stringify({typ:"JWT",alg:"RS256",kid:"hml-test-1"}))+"."+
      base64url(JSON.stringify(claims));
    const signature=await webcrypto.subtle.sign("RSASSA-PKCS1-v1_5",pair.privateKey,enc.encode(prefix));
    return prefix+"."+base64url(Buffer.from(signature));
  };
}
function useKeys(keys){
  globalThis.fetch=async uri=>{
    assert.equal(uri,"https://www.googleapis.com/oauth2/v3/certs");
    return {ok:true,headers:{get:()=> "public,max-age=30"},
      json:async()=>({keys})};
  };
}
const request=(url,token,options={})=>worker.fetch(new Request(BASE+url,{
  ...options,headers:{Authorization:"Bearer "+token,
    ...(options.headers||{})}
}),options.env);
const response=async r=>({status:r.status,body:await r.json()});

test("Google RSA: valida assinatura, emissor, audience, expiracao e correo", async () => {
  const pair=await webcrypto.subtle.generateKey({
    name:"RSASSA-PKCS1-v1_5",modulusLength:2048,publicExponent:Uint8Array.of(1,0,1),
    hash:"SHA-256"
  },true,["sign","verify"]);
  const pub=await webcrypto.subtle.exportKey("jwk",pair.publicKey);
  pub.kid="hml-test-1";pub.use="sig";pub.alg="RS256";
  const signer=async (claims={})=>{
    const now=Math.floor(Date.now()/1000);
    const payload={
      iss:"https://accounts.google.com",aud:CLIENT,sub:"1234567890123",
      exp:now+300,iat:now-5,email:"admin@gmail.com",email_verified:true,...claims
    };
    const text=base64url(JSON.stringify({alg:"RS256",kid:"hml-test-1",typ:"JWT"}))+"."+
      base64url(JSON.stringify(payload));
    const sig=await webcrypto.subtle.sign("RSASSA-PKCS1-v1_5",pair.privateKey,enc.encode(text));
    return text+"."+base64url(Buffer.from(sig));
  };
  const fetchKeys=async()=>({ok:true,headers:{get:()=>""},json:async()=>({keys:[pub]})});
  assert.equal((await verificarTokenGoogle(await signer(),CLIENT,fetchKeys)).google_sub,"1234567890123");
  assert.equal((await verificarTokenGoogle(await signer(),CLIENT,fetchKeys)).email_autoritativo,true);
  for(const claims of [
    {aud:"app-falso.apps.googleusercontent.com"},
    {iss:"https://evil.example"},
    {email_verified:false},
    {exp:Math.floor(Date.now()/1000)-10},
    {iat:Math.floor(Date.now()/1000)+300},
    {sub:""},
    {email:"falso@exemplo.com",hd:"outra.org"},
  ]){
    if(claims.email==="falso@exemplo.com"){
      assert.equal((await verificarTokenGoogle(await signer(claims),CLIENT,fetchKeys)).email_autoritativo,false);
    }else await assert.rejects(verificarTokenGoogle(await signer(claims),CLIENT,fetchKeys));
  }
  const good=await signer();
  const fields=good.split(".");
  fields[1]=base64url(JSON.stringify({...decodeJson(fields[1]),email:"fraude@gmail.com"}));
  await assert.rejects(verificarTokenGoogle(fields.join("."),CLIENT,fetchKeys));
  await assert.rejects(verificarTokenGoogle("garbage",CLIENT,fetchKeys));
});

test("Cloudflare protege usuarios, lojas, financeiro e finalizacao por perfil", async () => {
  const db=new DatabaseSync(":memory:");
  try{
    db.exec("PRAGMA foreign_keys = ON;");
    for(const file of ["0001_piloto_lojas.sql","0002_operacoes_estrutura.sql",
      "0003_piloto_operacao.sql","0004_hml_usuarios.sql"]) db.exec(sql(file));
    const pair=await webcrypto.subtle.generateKey({
      name:"RSASSA-PKCS1-v1_5",modulusLength:2048,
      publicExponent:Uint8Array.of(1,0,1),hash:"SHA-256"
    },true,["sign","verify"]);
    const jwk=await webcrypto.subtle.exportKey("jwk",pair.publicKey);
    Object.assign(jwk,{kid:"hml-test-2",use:"sig",alg:"RS256"});
    globalThis.fetch=async()=>({ok:true,headers:{get:()=>"max-age=300"},
      json:async()=>({keys:[jwk]})});
    const jwt=async(email,sub)=>{
      const now=Math.floor(Date.now()/1000);
      const claims={iss:"https://accounts.google.com",aud:CLIENT,email,
        email_verified:true,sub,iat:now-10,exp:now+300};
      const input=base64url(JSON.stringify({typ:"JWT",alg:"RS256",kid:"hml-test-2"}))+
        "."+base64url(JSON.stringify(claims));
      const sig=await webcrypto.subtle.sign("RSASSA-PKCS1-v1_5",pair.privateKey,enc.encode(input));
      return input+"."+base64url(Buffer.from(sig));
    };
    const env={ENVIRONMENT:"homologacao",DB:d1(db),
      LAVAFAST_GOOGLE_CLIENT_ID:CLIENT,LAVAFAST_BOOTSTRAP_EMAIL:"admin@gmail.com"};
    const call=async(path,token,method="GET",obj=null,origin=BASE)=>{
      const opts={method,headers:{"Authorization":"Bearer "+token,Origin:origin}};
      if(method==="POST"){opts.headers["content-type"]="application/json";opts.body=JSON.stringify(obj||{});}
      return response(await worker.fetch(new Request(BASE+path,opts),env));
    };
    const admin=await jwt("admin@gmail.com","1234567890123");
    const op=await jwt("operador@gmail.com","2345678901234");
    const extraneous=await jwt("visitante@gmail.com","3456789012345");
    assert.equal((await call("/api/seguro/eu",extraneous)).status,403);
    const root=await call("/api/seguro/eu",admin);
    assert.equal(root.status,200);
    assert.equal(root.body.usuario.perfil,"CO");
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM hml_usuarios").get().n,1);

    const create=await call("/api/seguro/usuarios",admin,"POST",{
      email:"operador@gmail.com",nome:"Operação HML",perfil:"OPERACAO",
      loja_codigo:"HML_MOOCA"
    });
    assert.equal(create.status,200);
    const who=await call("/api/seguro/eu",op);
    assert.equal(who.body.usuario.perfil,"OPERACAO");
    assert.equal(who.body.usuario.loja_codigo,"HML_MOOCA");

    const cards=await call("/api/seguro/solicitacoes",op);
    assert.equal(cards.status,200);
    assert.equal(cards.body.total,2);
    assert.ok(cards.body.cards.every(x=>x.codigo_loja==="HML_MOOCA"));
    assert.doesNotMatch(JSON.stringify(cards.body),/valor_centavos|cpf|email/);
    assert.equal((await call("/api/seguro/solicitacoes?loja=HML_CENTRAL_PLAZA",op)).status,403);
    assert.equal((await call("/api/seguro/financeiro/resumo",op)).status,403);
    assert.equal((await call("/api/seguro/usuarios",op)).status,403);
    assert.equal((await call("/api/seguro/usuarios",op,"POST",{
      email:"elevar@gmail.com",perfil:"CO"
    })).status,403);
    assert.equal((await call("/api/seguro/financeiro/resumo",admin)).status,200);
    const amount=await call("/api/seguro/financeiro/resumo",admin);
    assert.ok(amount.body.resumo.every(x=>typeof x.total_centavos==="number"));

    const wrongStore=await call("/api/seguro/finalizar/HML-CARD-3",op,"POST");
    assert.equal(wrongStore.status,409);
    assert.equal(db.prepare("SELECT status FROM op_solicitacoes_lavagem WHERE id='HML-CARD-3'").get().status,"AGUARDANDO");
    assert.equal((await call("/api/seguro/finalizar/HML-CARD-1",op,"POST",null,"https://evil.invalid")).status,403);
    assert.equal((await call("/api/seguro/finalizar/HML-CARD-1",op,"POST")).status,200);
    assert.equal((await call("/api/seguro/finalizar/HML-CARD-1",op,"POST")).status,409);
    assert.equal((await call("/api/seguro/concluidos",op)).body.total,1);
    assert.equal((await call("/api/seguro/usuarios",admin)).body.usuarios.length,2);

    assert.equal((await call("/api/seguro/usuarios",admin,"POST",{
      email:"admin@gmail.com",perfil:"OPERACAO",loja_codigo:"HML_MOOCA"
    })).status,400);
    assert.equal(db.prepare("PRAGMA foreign_key_check").all().length,0);
  }finally{globalThis.fetch=oldFetch;db.close();}
});
