import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const readMigration = file => readFileSync(new URL(`../migrations/${file}`, import.meta.url), "utf8");

test("SQL da homologacao cria 8 tabelas operacionais e mantem seed piloto", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec(readMigration("0001_piloto_lojas.sql"));
    db.exec(readMigration("0002_operacoes_estrutura.sql"));

    const row = db.prepare(
      "SELECT COUNT(*) AS total FROM sqlite_master WHERE type = 'table' AND name LIKE 'op_%'"
    ).get();
    assert.equal(row.total, 8);

    const shops = db.prepare("SELECT COUNT(*) AS total FROM piloto_lojas").get();
    assert.equal(shops.total, 2);

    const indexes = db.prepare(
      "SELECT COUNT(*) AS total FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_op_%'"
    ).get();
    assert.equal(indexes.total, 16);

    // O SQL pode ser reaplicado sem apagar a estrutura de teste.
    db.exec(readMigration("0001_piloto_lojas.sql"));
    db.exec(readMigration("0002_operacoes_estrutura.sql"));
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM piloto_lojas").get().total, 2);
  } finally {
    db.close();
  }
});

test("dados ficticios exercitam JOINs e integridade sem registros reais", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("PRAGMA foreign_keys = ON;");
    for (const file of ["0001_piloto_lojas.sql", "0002_operacoes_estrutura.sql", "0003_piloto_operacao.sql"]) {
      db.exec(readMigration(file));
    }

    const total = db.prepare(
      "SELECT COUNT(*) AS total FROM op_solicitacoes_lavagem WHERE origem='HOMOLOGACAO'"
    ).get().total;
    assert.equal(total, 4);
    const resume = db.prepare(`
      SELECT l.codigo AS loja, s.status, t.nome AS tipo, s.valor_centavos
      FROM op_solicitacoes_lavagem s
      JOIN op_lojas l ON l.id = s.loja_id
      LEFT JOIN op_tipos_lavagem t ON t.id = s.tipo_lavagem_id
      WHERE s.origem = 'HOMOLOGACAO'
    `).all();
    assert.equal(resume.length, 4);
    assert.equal(new Set(resume.map(x => x.loja)).size, 2);
    assert.deepEqual(resume.map(x => x.valor_centavos).sort(), [5000,5000,9000,9000]);
    assert.equal(db.prepare("PRAGMA foreign_key_check").all().length, 0);

    db.exec(readMigration("0003_piloto_operacao.sql"));
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM op_solicitacoes_lavagem").get().n, 4);
  } finally {
    db.close();
  }
});
