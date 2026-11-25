-- LavaFast contingencia operacional: D1 independente de Supabase, Render e Vercel.
-- Estrutura INICIAL VAZIA; nenhum funcionario ou card real e publicado por migracao.
-- Dados pessoais: CPF apenas como HMAC com secret externo, nunca gravar CPF em claro.
CREATE TABLE IF NOT EXISTS ct_funcionarios (
  id TEXT PRIMARY KEY NOT NULL,
  cpf_hmac TEXT NOT NULL UNIQUE,
  cpf_final TEXT NOT NULL,
  nome TEXT NOT NULL,
  cargo TEXT NOT NULL,
  loja_codigo TEXT NOT NULL CHECK(loja_codigo IN ('MOOCA','CENTRAL_PLAZA','TODAS')),
  ativo INTEGER NOT NULL DEFAULT 1 CHECK(ativo IN (0,1)),
  senha_salt TEXT NOT NULL,
  senha_hash TEXT NOT NULL,
  trocar_senha INTEGER NOT NULL DEFAULT 1 CHECK(trocar_senha IN (0,1)),
  criado_em TEXT NOT NULL,
  atualizado_em TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ct_funcionarios_ativos ON ct_funcionarios(ativo,loja_codigo);
CREATE TABLE IF NOT EXISTS ct_sessoes (
  token_hash TEXT PRIMARY KEY NOT NULL,
  funcionario_id TEXT NOT NULL REFERENCES ct_funcionarios(id) ON DELETE CASCADE,
  expira_em TEXT NOT NULL,
  criada_em TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ct_sessoes_expira ON ct_sessoes(expira_em);
CREATE TABLE IF NOT EXISTS ct_tentativas (
  chave_hmac TEXT PRIMARY KEY NOT NULL,
  falhas INTEGER NOT NULL DEFAULT 0,
  expira_em TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ct_solicitacoes (
  id TEXT PRIMARY KEY NOT NULL,
  numero_solicitacao TEXT NOT NULL UNIQUE,
  placa TEXT NOT NULL,
  loja_codigo TEXT NOT NULL CHECK(loja_codigo IN ('MOOCA','CENTRAL_PLAZA')),
  tipo_lavagem TEXT NOT NULL DEFAULT 'Nao informado',
  status TEXT NOT NULL DEFAULT 'SOLICITACAO'
     CHECK(status IN ('SOLICITACAO','CONCLUIDO')),
  recebida_em TEXT NOT NULL,
  finalizada_em TEXT,
  finalizada_por TEXT REFERENCES ct_funcionarios(id),
  origem TEXT NOT NULL CHECK(origem IN ('MANUAL','EMAIL','IMPORTACAO_EMAIL')),
  mensagem_id TEXT,
  observacao TEXT,
  criado_em TEXT NOT NULL,
  atualizado_em TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ct_solicitacoes_loja_status ON ct_solicitacoes(loja_codigo,status,recebida_em DESC);
CREATE INDEX IF NOT EXISTS idx_ct_solicitacoes_placa ON ct_solicitacoes(placa);
CREATE TABLE IF NOT EXISTS ct_auditoria (
  id TEXT PRIMARY KEY NOT NULL,
  evento TEXT NOT NULL,
  funcionario_id TEXT,
  solicitacao_id TEXT,
  horario TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ct_auditoria_horario ON ct_auditoria(horario DESC);
