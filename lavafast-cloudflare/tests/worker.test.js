import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

const DB = {
  prepare(sql) {
    if (sql === "SELECT 1 AS ok") {
      return { first: async () => ({ ok: 1 }) };
    }
    if (sql.includes("FROM piloto_lojas")) {
      return { all: async () => ({ results: [
        { id: "HML-MOOCA", codigo: "MOOCA", nome: "Mooca", ativa: 1 },
        { id: "HML-CENTRAL", codigo: "CENTRAL_PLAZA", nome: "Central Plaza", ativa: 1 }
      ] }) };
    }
    throw new Error("Query inesperada no teste");
  }
};

async function chamar(caminho, env = {}, method = "GET") {
  const request = new Request("https://lavafast-hml.invalid" + caminho, { method });
  const resposta = await worker.fetch(request, env);
  return { status: resposta.status, body: await resposta.json() };
}

test("health identifica ambiente isolado e ausencia de banco", async () => {
  const r = await chamar("/api/health");
  assert.equal(r.status, 200);
  assert.equal(r.body.ambiente, "homologacao");
  assert.equal(r.body.banco, "nao_configurado");
});

test("health testa conectividade do D1", async () => {
  const r = await chamar("/api/health", { DB });
  assert.equal(r.status, 200);
  assert.equal(r.body.banco, "ok");
});

test("piloto nao funciona sem vinculo D1", async () => {
  const r = await chamar("/api/piloto/lojas");
  assert.equal(r.status, 503);
});

test("piloto devolve somente lojas demonstrativas", async () => {
  const r = await chamar("/api/piloto/lojas", { DB });
  assert.equal(r.status, 200);
  assert.equal(r.body.demonstracao, true);
  assert.equal(r.body.lojas.length, 2);
});

test("nao aceita alteracoes nem outras rotas", async () => {
  assert.equal((await chamar("/api/health", { DB }, "POST")).status, 405);
  assert.equal((await chamar("/api/solicitacoes", { DB })).status, 404);
});
