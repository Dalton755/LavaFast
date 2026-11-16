-- Base demonstrativa, sem dados de usuarios ou solicitacoes reais.
-- Nao representa ainda a migracao completa das tabelas de producao.
CREATE TABLE IF NOT EXISTS piloto_lojas (
  id TEXT PRIMARY KEY NOT NULL,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  ativa INTEGER NOT NULL DEFAULT 1 CHECK (ativa IN (0, 1))
);

INSERT OR IGNORE INTO piloto_lojas (id, codigo, nome, ativa) VALUES
  ('HML-MOOCA', 'MOOCA', 'Mooca', 1),
  ('HML-CENTRAL', 'CENTRAL_PLAZA', 'Central Plaza', 1);
