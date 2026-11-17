-- LavaFast CPF + senha: transicao autenticada em homologacao.
-- Nao migra senhas, CPFs, tokens do Supabase, nem altera o app original.
-- Sessao temporaria de teste armazena apenas minimo necessario.
CREATE TABLE IF NOT EXISTS hml_sessoes_cpf (
  chave_hash TEXT PRIMARY KEY NOT NULL,
  funcionario_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  cargo TEXT NOT NULL,
  perfil TEXT NOT NULL CHECK (perfil IN ('OPERACAO','ANALISTA','CO')),
  loja TEXT NOT NULL,
  loja_codigo TEXT,
  expira_em TEXT NOT NULL,
  criada_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_hml_sessoes_cpf_expira ON hml_sessoes_cpf(expira_em);

-- Identificadores HMAC irreversiveis de IP+CPF, sem CPF ou senha em claro.
CREATE TABLE IF NOT EXISTS hml_login_tentativas (
  chave_hash TEXT PRIMARY KEY NOT NULL,
  falhas INTEGER NOT NULL DEFAULT 0 CHECK(falhas>=0),
  expira_em TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hml_login_tentativas_expira ON hml_login_tentativas(expira_em);

-- A tabela hml_usuarios da experiencia anterior Google permanece intacta,
-- mas NAO concede direitos no novo login baseado no registro de funcionarios.
