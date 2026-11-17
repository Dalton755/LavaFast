import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import worker from "../src/index.js";

const ORIGIN="https://lavafast-test.invalid";
const SUPA="https://xgbdurmauhwpbiesdqmi.supabase.co";
const API="https://lavafast-api.onrender.com/api";
const CPF="529.982.247-25"; // Exemplo sintetico, usado somente em mocks sem rede.
const KEY="anon_key_de_teste_sem_valor_real_1234567890";
const SECRET="chave_de_teste_puramente_sintetica_64caracteres_sem_dados";
const realFetch=globalThis.fetch;

function database() {
  const db=new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON");
  for (const name of ["0001_piloto_lojas.sql","0002_operacoes_estrutura.sql",
    "0003_piloto_operacao.sql","0004_hml_usuarios.sql","0005_login_cpf_bridge.sql"]){
    db.exec(readFileSync(new URL("../migrations/"+name,import.meta.url),"utf8"));
  }
  return db;
}
function binding(db) {
  return {prepare(query){
    const prepared=db.prepare(query);
    return {
      bind(...args){return {
        all:async()=>({results:prepared.all(...args)}),
        first:async()=>prepared.get(...args)||null,
        run:async()=>({meta:{changes:Number(prepared.run(...args).changes)}})
      };},
      first:async()=>prepared.get()||null,
      all:async()=>({results:prepared.all()})
    };
  }};
}
const environment=(db)=>({
  ENVIRONMENT:"homologacao",DB:binding(db),
  LAVAFAST_BRIDGE_ENABLED:"true",
  LAVAFAST_SUPABASE_URL:SUPA,
  LAVAFAST_SUPABASE_ANON_KEY:KEY,
  LAVAFAST_SESSION_SECRET:SECRET
});
const stub=(payload,status=200)=>({
  ok:status>=200&&status<300,status,
  json:async()=>payload
});
async function request(path,env,{method="GET",body=null,cookie="",origin=ORIGIN}={}) {
  const headers={};
  if(cookie)headers.Cookie=cookie;
  if(method!=="GET"){headers.Origin=origin;headers["content-type"]="application/json";}
  const req=new Request(ORIGIN+path,{
    method,headers,body:method==="GET"?undefined:JSON.stringify(body||{})
  });
  const response=await worker.fetch(req,env);
  return {status:response.status,json:await response.json(),
    setCookie:response.headers.get("set-cookie")||""};
}
function fakeLegacy(cargo="Lavador",loja="Central Plaza"){
  globalThis.fetch=async (url,opts={})=>{
    const u=String(url);
    if(u===API+"/auth/verificar-cpf"){
      const body=JSON.parse(opts.body);
      assert.equal(body.cpf,CPF);
      return stub({encontrado:true,nome:"Funcionario Teste",email:"teste.ficticio@example.com",
        cargo,possuiAuth:true,possuiEmail:true,cpf:CPF});
    }
    if(u===SUPA+"/auth/v1/token?grant_type=password"){
      assert.equal(opts.headers.apikey,KEY);
      const body=JSON.parse(opts.body);
      assert.equal(body.email,"teste.ficticio@example.com");
      if(body.password!=="senha-ficticia-valida")return stub({msg:"Invalid login credentials"},400);
      return stub({access_token:"jwt-valido-somente-no-mock"});
    }
    if(u===API+"/auth/me"){
      assert.equal(opts.headers.Authorization,"Bearer jwt-valido-somente-no-mock");
      return stub({id:"HML-FUNC-EXEMPLO",nome:"Funcionario Teste",
        cargo,loja,loja_padrao_id:null,email:"teste.ficticio@example.com",
        podeVerValores:cargo==="Analista"||cargo==="C&O"});
    }
    throw Error("Tentativa de buscar um dominio inesperado "+u);
  };
}

test("sem configuracao nao consulta CPF, senha ou dados de funcionarios reais",async()=>{
  const db=database();
  try{
    const env={ENVIRONMENT:"homologacao",DB:binding(db)};
    const conf=await request("/api/seguro/configuracao",env);
    assert.equal(conf.status,200);
    assert.equal(conf.json.login_cpf_ativo,false);
    const login=await request("/api/seguro/entrar",env,{
      method:"POST",body:{cpf:CPF,senha:"senha-ficticia-valida"}
    });
    assert.equal(login.status,503);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM hml_sessoes_cpf").get().n,0);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM hml_login_tentativas").get().n,0);
  }finally{db.close();}
});

test("CPF e senha existentes geram sessao HttpOnly; perfis e lojas originais controlam acesso",async()=>{
  const db=database();
  fakeLegacy();
  try{
    const env=environment(db);
    const bad=await request("/api/seguro/entrar",env,{
      method:"POST",body:{cpf:CPF,senha:"senha-errada"}
    });
    assert.equal(bad.status,401);
    assert.ok(!bad.json.erro.includes("email"));
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM hml_login_tentativas").get().n,1);

    const login=await request("/api/seguro/entrar",env,{
      method:"POST",body:{cpf:CPF,senha:"senha-ficticia-valida"}
    });
    assert.equal(login.status,200);
    assert.equal(login.json.usuario.nome,"Funcionario Teste");
    assert.equal(login.json.usuario.cargo,"Lavador");
    assert.equal(login.json.usuario.perfil,"OPERACAO");
    assert.equal(login.json.usuario.loja,"Central Plaza");
    assert.match(login.setCookie,/HttpOnly/);
    assert.match(login.setCookie,/SameSite=Strict/);
    assert.match(login.setCookie,/Secure/);
    assert.doesNotMatch(login.setCookie,/senha-ficticia-valida|529|teste\.ficticio/);
    const cookie=login.setCookie.split(";")[0];

    const me=await request("/api/seguro/eu",env,{cookie});
    assert.equal(me.status,200);
    assert.equal(me.json.usuario.loja_codigo,"HML_CENTRAL_PLAZA");
    const list=await request("/api/seguro/solicitacoes",env,{cookie});
    assert.equal(list.status,200);
    assert.equal(list.json.total,1);
    assert.equal(list.json.cards[0].placa,"TESTE03");
    assert.doesNotMatch(JSON.stringify(list.json),/valor_centavos|cpf|email|telefone/);
    assert.equal((await request("/api/seguro/solicitacoes?loja=HML_MOOCA",env,{cookie})).status,403);
    assert.equal((await request("/api/seguro/financeiro/resumo",env,{cookie})).status,403);

    const noOrigin=await request("/api/seguro/finalizar/HML-CARD-3",env,{
      method:"POST",cookie,origin:"https://site-invasor.invalid"
    });
    assert.equal(noOrigin.status,403);
    const wrongStore=await request("/api/seguro/finalizar/HML-CARD-1",env,{
      method:"POST",cookie
    });
    assert.equal(wrongStore.status,409);
    const done=await request("/api/seguro/finalizar/HML-CARD-3",env,{
      method:"POST",cookie
    });
    assert.equal(done.status,200);
    assert.equal(done.json.card.status,"FINALIZADA");
    assert.equal((await request("/api/seguro/solicitacoes",env,{cookie})).json.total,0);
    assert.equal((await request("/api/seguro/concluidos",env,{cookie})).json.total,2);
    assert.equal((await request("/api/seguro/finalizar/HML-CARD-3",env,{
      method:"POST",cookie
    })).status,409);

    const table=db.prepare("SELECT * FROM hml_sessoes_cpf").get();
    assert.equal(table.funcionario_id,"HML-FUNC-EXEMPLO");
    assert.ok(!JSON.stringify(table).includes(CPF));
    assert.ok(!JSON.stringify(table).includes("senha-ficticia"));
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM hml_login_tentativas").get().n,0);

    const logout=await request("/api/seguro/sair",env,{method:"POST",cookie});
    assert.equal(logout.status,200);
    assert.match(logout.setCookie,/Max-Age=0/);
    assert.equal((await request("/api/seguro/eu",env,{cookie})).status,401);
  }finally{
    globalThis.fetch=realFetch;
    db.close();
  }
});

test("cargo C&O atual tem financeiro isolado; email/CPF nunca revelados nos cards",async()=>{
  const db=database();
  fakeLegacy("C&O","Central Plaza");
  try{
    const env=environment(db);
    const login=await request("/api/seguro/entrar",env,{
      method:"POST",body:{cpf:CPF,senha:"senha-ficticia-valida"}
    });
    assert.equal(login.status,200);
    assert.equal(login.json.usuario.perfil,"CO");
    const cookie=login.setCookie.split(";")[0];
    const financeiro=await request("/api/seguro/financeiro/resumo",env,{cookie});
    assert.equal(financeiro.status,200);
    assert.equal(financeiro.json.resumo.length,2);
    assert.ok(financeiro.json.resumo.every(x=>Number.isInteger(x.total_centavos)));
    const lista=await request("/api/seguro/solicitacoes",env,{cookie});
    assert.equal(lista.json.total,3);
    assert.doesNotMatch(JSON.stringify(lista.json),/valor_centavos|email|cpf/);
    assert.equal((await request("/api/seguro/usuarios",env,{cookie})).status,404);
  }finally{globalThis.fetch=realFetch;db.close();}
});

test("rejeita CPF invalido, ausencia de origem e configuracao desativada",async()=>{
  const db=database();
  try{
    const env=environment(db);
    const invalid=await request("/api/seguro/entrar",env,{
      method:"POST",body:{cpf:"111.111.111-11",senha:"qualquer"}
    });
    assert.equal(invalid.status,401);
    const origin=await request("/api/seguro/entrar",env,{
      method:"POST",origin:"https://invasor.invalid",
      body:{cpf:CPF,senha:"qualquer"}
    });
    assert.equal(origin.status,403);
    assert.equal((await request("/api/seguro/eu",env)).status,401);
    assert.equal((await request("/api/seguro/configuracao",{
      ...env,ENVIRONMENT:"production"
    })).status,404);
  }finally{db.close();}
});
