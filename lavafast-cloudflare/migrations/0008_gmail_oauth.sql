-- OAuth de conta pessoal autorizada para monitoramento Gmail, SEM Supabase.
-- Senhas, token de renovacao e corpo de emails nunca sao salvos em texto.
CREATE TABLE IF NOT EXISTS ct_gmail_oauth_states (
  state_hash TEXT PRIMARY KEY NOT NULL,
  verifier_encrypted TEXT NOT NULL,
  gestor_id TEXT NOT NULL REFERENCES ct_funcionarios(id),
  expira_em TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ct_gmail_states_expiry ON ct_gmail_oauth_states(expira_em);
CREATE TABLE IF NOT EXISTS ct_gmail_integracao (
  id TEXT PRIMARY KEY NOT NULL CHECK(id='localiza'),
  gmail TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  conectada_em TEXT NOT NULL,
  ultima_consulta TEXT,
  ultimo_sucesso TEXT,
  ultimo_erro_codigo TEXT,
  lock_owner TEXT,
  lock_until TEXT,
  mensagens_analisadas INTEGER NOT NULL DEFAULT 0,
  cards_criados INTEGER NOT NULL DEFAULT 0,
  atualizado_em TEXT NOT NULL
);
