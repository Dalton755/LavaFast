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
