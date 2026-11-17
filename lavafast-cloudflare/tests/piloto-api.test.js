import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import worker from "../src/index.js";

const migracao = name => readFileSync(new URL("../migrations/" + name, import.meta.url), "utf8");
const SECRET = "segredo-demonstracao-32-caracteres-muito-longo-aleatorio";
const BASE_URL = "https://lavafast-teste.invalid";
const ambiente = (db, segredo = SECRET) => ({
  DB: {
    prepare(sql) {
      const statement = db.prepare(sql);
      return {
        bind(...args) {
          return {
            all: async () => ({ results: statement.all(...args) }),
            first: async () => statement.get(...args) ?? null,
            run: async () => ({ meta: { changes: Number(statement.run(...args).changes) } })
          };
        },
        all: async () => ({ results: statement.all() }),
        first: async () => statement.get() ?? null,
        run: async () => ({ meta: { changes: Number(statement.run().changes) } })
      };
    }
  },
  ENVIRONMENT: "homologacao",
  HML_FINALIZE_SECRET: segredo
});

function criarBanco() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  for (const name of ["0001_piloto_lojas.sql","0002_operacoes_estrutura.sql","0003_piloto_operacao.sql"]) {
    db.exec(migracao(name));
  }
  return db;
}
async function chamar(path, env, opts = {}) {
  const response = await worker.fetch(new Request(BASE_URL + path, opts), env);
  return { status: response.status, dados: await response.json() };
}

test("visao operacional apresenta apenas solicitacoes e concluidos, sem dados financeiros", async () => {
  const db = criarBanco();
  try {
    const env = ambiente(db);
    const [p, c, all, configs] = await Promise.all([
      chamar("/api/piloto/solicitacoes",env),
      chamar("/api/piloto/concluidos",env),
      chamar("/api/piloto/cards?perfil=ANALISTA",env),
      chamar("/api/piloto/configuracao",env)
    ]);
    assert.equal(p.status,200);
    assert.equal(c.status,200);
    assert.equal(p.dados.total,3);
    assert.equal(c.dados.total,1);
    assert.equal(all.dados.total,4);
    assert.ok(p.dados.cards.every(x=>x.status!=="FINALIZADA"));
    assert.ok(c.dados.cards.every(x=>x.status==="FINALIZADA"));
    assert.ok(c.dados.cards[0].tempo_total_segundos>0);
    assert.equal(configs.dados.finalizacao_habilitada,true);
    assert.equal(configs.dados.financeiro_restrito,true);
    for(const payload of [p.dados,c.dados,all.dados]) {
      const texto=JSON.stringify(payload);
      assert.doesNotMatch(texto, /valor_centavos|responsavel_localiza|valor_minimo|caixinha|usuario_id|remetente/);
    }
    assert.ok(!Object.hasOwn(configs.dados,"HML_FINALIZE_SECRET"));
    assert.ok(!JSON.stringify(configs.dados).includes(SECRET));
  } finally {db.close();}
});

test("filtro de loja e validado pelo servidor", async () => {
  const db=criarBanco();
  try {
    const env=ambiente(db);
    const a=await chamar("/api/piloto/solicitacoes?loja=HML_MOOCA",env);
    const b=await chamar("/api/piloto/concluidos?loja=HML_CENTRAL_PLAZA",env);
    const inv=await chamar("/api/piloto/solicitacoes?loja=OUTRA",env);
    assert.equal(a.dados.total,2);
    assert.equal(b.dados.total,1);
    assert.equal(inv.status,400);
  }finally{db.close();}
});

test("POST bloqueara ausencia de secret, origem divergente e chave invalida", async () => {
  const db=criarBanco();
  const path="/api/piloto/finalizar/HML-CARD-1";
  const opts=(chave,origem=BASE_URL)=>({method:"POST",headers:{
    Origin:origem, "x-lavafast-demo-key":chave,"Content-Type":"application/json"
  },body:"{}"});
  try {
    const noSecret=await chamar(path,ambiente(db,""),opts(SECRET));
    const wrongOrigin=await chamar(path,ambiente(db),opts(SECRET,"https://malicioso.invalid"));
    const wrongSecret=await chamar(path,ambiente(db),opts("outro-segredo-invalido-com-mais-de-32-caracteres"));
    const missing=await chamar(path,ambiente(db),{method:"POST",body:"{}"});
    const prod=await chamar(path,{...ambiente(db),ENVIRONMENT:"production"},opts(SECRET));
    assert.equal(noSecret.status,503);
    assert.equal(wrongOrigin.status,403);
    assert.equal(wrongSecret.status,403);
    assert.equal(missing.status,403);
    assert.equal(prod.status,404);
    assert.equal(db.prepare("SELECT status FROM op_solicitacoes_lavagem WHERE id='HML-CARD-1'").get().status,"SOLICITADO");
  }finally{db.close();}
});

test("finalizacao demo atualiza D1, preserva tempo e move card uma unica vez", async () => {
  const db=criarBanco();
  const env=ambiente(db);
  const path="/api/piloto/finalizar/HML-CARD-1";
  const opts={method:"POST",headers:{Origin:BASE_URL,"x-lavafast-demo-key":SECRET},body:"{}"};
  try{
    const result=await chamar(path,env,opts);
    assert.equal(result.status,200);
    assert.equal(result.dados.card.status,"FINALIZADA");
    assert.ok(result.dados.card.tempo_total_segundos>=0);
    assert.ok(!Object.hasOwn(result.dados.card,"valor_centavos"));
    const p=await chamar("/api/piloto/solicitacoes",env);
    const c=await chamar("/api/piloto/concluidos",env);
    assert.equal(p.dados.total,2);
    assert.equal(c.dados.total,2);
    const novaTentativa=await chamar(path,env,opts);
    assert.equal(novaTentativa.status,409);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM op_solicitacoes_lavagem WHERE status='FINALIZADA'").get().n,2);
    assert.equal(db.prepare("PRAGMA foreign_key_check").all().length,0);
  }finally{db.close();}
});

test("recusa escrita em IDs nao demonstrativos e metodo incorreto", async () => {
  const db=criarBanco();
  const env=ambiente(db);
  try{
    const opts={method:"POST",headers:{Origin:BASE_URL,"x-lavafast-demo-key":SECRET},body:"{}"};
    assert.equal((await chamar("/api/piloto/finalizar/9999",env,opts)).status,400);
    assert.equal((await chamar("/api/piloto/finalizar/HML-CARD-1",env)).status,405);
    assert.equal((await chamar("/api/piloto/solicitacoes",env,opts)).status,405);
  }finally{db.close();}
});
