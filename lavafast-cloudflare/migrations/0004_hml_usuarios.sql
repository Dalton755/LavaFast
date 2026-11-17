-- SOMENTE homologacao. Nenhum usuario cadastrado automaticamente.
-- E-mails autorizados sao explicitamente provisionados pelo C&O, ou
-- um unico email bootstrap configurado em segredo do Worker.
-- Google sub identifica a conta; email e usado so no primeiro vinculo.
CREATE TABLE IF NOT EXISTS hml_usuarios (
  email TEXT PRIMARY KEY COLLATE NOCASE NOT NULL,
  google_sub TEXT UNIQUE,
  nome TEXT NOT NULL DEFAULT '',
  perfil TEXT NOT NULL CHECK (perfil IN ('OPERACAO','ANALISTA','CO')),
  loja_codigo TEXT CHECK (
    loja_codigo IS NULL OR loja_codigo IN ('HML_MOOCA','HML_CENTRAL_PLAZA')
  ),
  ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0,1)),
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (perfil <> 'OPERACAO' OR loja_codigo IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_hml_usuarios_perfil ON hml_usuarios(perfil, ativo);
CREATE INDEX IF NOT EXISTS idx_hml_usuarios_loja ON hml_usuarios(loja_codigo, ativo);

-- Nunca incluir senhas, cpf, tokens ou usuarios reais em migrations.
