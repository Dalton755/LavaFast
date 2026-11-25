-- Auditoria minima do relay Gmail: nao armazena corpo, remetente, placas,
-- CPF nem valores. Historico preservado apos recuperacao do Supabase.
CREATE TABLE IF NOT EXISTS ct_email_importacoes (
  message_id TEXT PRIMARY KEY NOT NULL,
  loja_codigo TEXT NOT NULL CHECK(loja_codigo IN ('MOOCA','CENTRAL_PLAZA')),
  recebido_em TEXT NOT NULL,
  processado_em TEXT NOT NULL,
  identificados INTEGER NOT NULL DEFAULT 0,
  criados INTEGER NOT NULL DEFAULT 0,
  duplicados INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK(status IN ('PROCESSADO','DUPLICADO'))
);
CREATE INDEX IF NOT EXISTS idx_ct_email_importacoes_processado ON ct_email_importacoes(processado_em DESC);
