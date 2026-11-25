import test from "node:test";
import assert from "node:assert/strict";
import {
  extrairSolicitacoesLocaliza,
  verificarMensagemLocaliza,
  normalizarRemetente
} from "../src/localizaEmail.js";

// Layout fiel aos e-mails Localiza recebidos em novembro/2026.
// Os valores, placas e numeros a seguir sao totalmente ficticios.
const exemplo = `
Prezado,
Segue abaixo as informações de lavagem do(s) veículo(s) listado(s).
Fornecedor: GLOW FLEET LTDA
Responsável pela Solicitação: Funcionario Ficticio
Agencia da Abertura: ACSMC
Data da Abertura da Solicitação: 25/11/2026 09:41:02
Número da solicitação
Placa
Tipo de Lavagem
Valor
109080709
ABC1D23
R$ 20,00
109080710
DEF2G34
R$ 35,00
Atenciosamente,
Localiza
`;

test("extrai os dois cards no formato original, sem qualquer informacao financeira",()=>{
  const out=extrairSolicitacoesLocaliza(exemplo);
  assert.equal(out.agencia,"ACSMC");
  assert.equal(out.loja_codigo,"MOOCA");
  assert.deepEqual(out.veiculos,[
    {numero:"109080709",placa:"ABC1D23"},
    {numero:"109080710",placa:"DEF2G34"}
  ]);
  assert.doesNotMatch(JSON.stringify(out),/R\$|20,00|35,00|funcionario ficticio/i);
});

test("agencia Central Plaza e variante com numero/placa na mesma linha",()=>{
 const out=extrairSolicitacoesLocaliza(exemplo.replace("ACSMC","ACUCP")
  .replace("109080709\nABC1D23","109080709 ABC1D23"));
 assert.equal(out.loja_codigo,"CENTRAL_PLAZA");
 assert.equal(out.veiculos.length,2);
});

test("numero SL duplicado gera apenas um card",()=>{
 const out=extrairSolicitacoesLocaliza(exemplo+"\n109080709\nABC1D23\n");
 assert.equal(out.veiculos.length,2);
});

test("agencia desconhecida nao e associada por adivinhacao",()=>{
 const out=extrairSolicitacoesLocaliza(exemplo.replace("ACSMC","OUTRA"));
 assert.equal(out.loja_codigo,null);
 assert.equal(out.agencia,"OUTRA");
});

test("remetente e assunto Localiza tem que ser exatos",()=>{
 assert.equal(normalizarRemetente("Localiza <no-reply@localiza.com>"),"no-reply@localiza.com");
 assert.equal(verificarMensagemLocaliza("Localiza <no-reply@localiza.com>","Solicitação de Lavagem"),true);
 assert.equal(verificarMensagemLocaliza("no-reply@localiza.com","Solicitacao de Lavagem"),true);
 for(const [from,subject] of [
  ["localiza@invasor.com","Solicitação de Lavagem"],
  ["no-reply@localiza.com","Cancelamento de Lavagem"],
  ["no-reply@localiza.com.evil.com","Solicitação de Lavagem"],
  ["no-reply@localiza.com","RE: Solicitação de Lavagem"]
 ]){
  assert.equal(verificarMensagemLocaliza(from,subject),false);
 }
});
