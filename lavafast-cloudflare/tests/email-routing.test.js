import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import worker from "../src/index.js";

const target="lavagem@inbox.exemplo.com";
function env(){
 const db=new DatabaseSync(":memory:");
 db.exec("PRAGMA foreign_keys=ON;");
 for(const name of ["0001_piloto_lojas.sql","0002_operacoes_estrutura.sql",
  "0003_piloto_operacao.sql","0004_hml_usuarios.sql","0005_login_cpf_bridge.sql",
  "0006_contingencia_independente.sql","0007_email_importacoes.sql"]){
  db.exec(readFileSync(new URL("../migrations/"+name,import.meta.url),"utf8"));
 }
 const D1={prepare(q){
  const s=db.prepare(q);
  return {bind(...args){return {
    first:async()=>s.get(...args)||null,all:async()=>({results:s.all(...args)}),
    run:async()=>({meta:{changes:Number(s.run(...args).changes)}})
   }},first:async()=>s.get()||null,all:async()=>({results:s.all()}),
   run:async()=>({meta:{changes:Number(s.run().changes)}})};
 }};
 return {db,env:{ENVIRONMENT:"homologacao",DB:D1,
  CT_BOOTSTRAP_SECRET:"secret-ficticio-de-32-caracteres-de-contingencia",
  CT_AUTH_PEPPER:"segredo-ficticio-diferente-de-32-caracteres",
  CT_EMAIL_INBOUND_TO:target}};
}
const messageBody=[
 "Prezado,","Fornecedor: GLOW FLEET LTDA",
 "Agencia da Abertura: ACSMC",
 "Número da solicitação","Placa","Tipo de Lavagem","Valor",
 "87654321","ABC1D23","R$ 20,00",
 "87654322","DEF2G34","R$ 45,00",
 "Localiza"
].join("\n");
function email({
  from="Localiza <no-reply@localiza.com>",to=target,
  subject="Solicitação de Lavagem",content=messageBody,
  contentType="text/plain; charset=utf-8",encoding="7bit",
  messageId="<email-original-exemplo@localiza.com>"
}={}){
 const date=new Date().toUTCString();
 const raw=["From: "+from,"To: "+to,"Subject: "+subject,
  "Date: "+date,"Message-ID: "+messageId,"MIME-Version: 1.0",
  "Content-Type: "+contentType,"Content-Transfer-Encoding: "+encoding,
  "",content].join("\r\n");
 const headers=new Headers({"from":from,"subject":subject,"date":date,"message-id":messageId});
 return {from:"no-reply@localiza.com",to,raw:new Blob([raw]).stream(),
  rawSize:Buffer.byteLength(raw),headers,canBeForwarded:true};
}
test("recebe Localiza sem Apps Script, salva cards operacionais no D1 sem valores",async()=>{
 const {db,env:bindings}=env();
 try{
  await worker.email(email(),bindings,{});
  const rows=db.prepare("SELECT * FROM ct_solicitacoes ORDER BY numero_solicitacao").all();
  assert.equal(rows.length,2);
  assert.equal(rows[0].numero_solicitacao,"87654321");
  assert.equal(rows[0].placa,"ABC1D23");
  assert.equal(rows[0].loja_codigo,"MOOCA");
  assert.equal(rows[0].status,"SOLICITACAO");
  assert.equal(rows[0].origem,"IMPORTACAO_EMAIL");
  assert.ok(!JSON.stringify(rows).includes("20,00"));
  assert.ok(!JSON.stringify(rows).includes("45,00"));
  await worker.email(email(),bindings,{});
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM ct_solicitacoes").get().n,2);
  const stat=db.prepare("SELECT criados,duplicados FROM ct_email_importacoes").get();
  assert.equal(stat.criados,2);
  assert.equal(stat.duplicados,2);
 }finally{db.close();}
});
test("nao importa emails que nao sao da Localiza ou para outro endereco",async()=>{
 const {db,env:bindings}=env();
 try{
  await worker.email(email({from:"Outro <invasor@outro.com>"}),bindings,{});
  await worker.email(email({to:"outro@inbox.exemplo.com"}),bindings,{});
  await worker.email(email({subject:"Cancelamento de Lavagem"}),bindings,{});
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM ct_solicitacoes").get().n,0);
 }finally{db.close();}
});
test("email realista HTML/base64 com assunto MIME cria card (regressao 26/11)",async()=>{
 const {db,env:bindings}=env();
 try{
  const encodedSubject="=?utf-8?B?U29saWNpdGHDp8OjbyBkZSBMYXZhZ2Vt?=";
  const html="<html><body><p>Prezado,</p><p>Agencia da Abertura: ACSMC</p>"+
    "<table><tr><td>87654399</td><td>XYZ1A23</td><td>R$ 123,45</td></tr></table>"+
    "</body></html>";
  await worker.email(email({subject:encodedSubject,
     contentType:"text/html; charset=utf-8",
     encoding:"base64",content:Buffer.from(html).toString("base64"),
     messageId:"<teste-base64-MIME@localiza.com>"
  }),bindings,{});
  const cards=db.prepare("SELECT * FROM ct_solicitacoes").all();
  assert.equal(cards.length,1);
  assert.equal(cards[0].numero_solicitacao,"87654399");
  assert.equal(cards[0].placa,"XYZ1A23");
  assert.equal(cards[0].loja_codigo,"MOOCA");
  assert.ok(!JSON.stringify(cards).includes("123,45"));
 }finally{db.close();}
});
test("multipart base64 com agencia Central Plaza cria cards no destino certo",async()=>{
 const {db,env:bindings}=env();
 try{
  const boundary="LAVAFAST_MIME_TEST";
  const content=["--"+boundary,"Content-Type: text/plain; charset=utf-8",
   "Content-Transfer-Encoding: base64","",
   Buffer.from(messageBody.replace("ACSMC","ACUCP")).toString("base64"),
   "--"+boundary+"--"].join("\r\n");
  await worker.email(email({content,contentType:'multipart/alternative; boundary="'+boundary+'"'}),bindings,{});
  const rows=db.prepare("SELECT loja_codigo FROM ct_solicitacoes").all();
  assert.equal(rows.length,2);
  assert.ok(rows.every(r=>r.loja_codigo==="CENTRAL_PLAZA"));
 }finally{db.close();}
});
test("verificacao do Google encaminhada apenas para destino de verificacao",async()=>{
 const {db,env:bindings}=env();
 try{
  bindings.CT_EMAIL_VERIFY_FORWARD_TO="verificacao@example.com";
  const msg=email({from:"Google <forwarding-noreply@google.com>",subject:"Gmail Forwarding Confirmation"});
  let forwarded="";
  msg.forward=async address=>{forwarded=address;};
  await worker.email(msg,bindings,{});
  assert.equal(forwarded,"verificacao@example.com");
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM ct_solicitacoes").get().n,0);
 }finally{db.close();}
});
