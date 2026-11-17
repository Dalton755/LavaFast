-- LavaFast Cloudflare / D1: primeira conversao estrutural do schema "operacoes"
-- Somente ambiente de HOMOLOGACAO. Nenhum dado real e inserido por esta migracao.
-- Origem auditada: Supabase Lava_Rapido (8 tabelas no schema operacoes).
-- ATENCAO: tipos monetarios PostgreSQL numeric -> INTEGER de centavos.
-- Timestamps PostgreSQL timestamptz -> TEXT ISO 8601 UTC.
-- Relacoes com financeiro.funcionarios / auth.users dependem das proximas etapas.
-- Nao executar em banco de producao.
CREATE TABLE IF NOT EXISTS op_lojas (
  id TEXT PRIMARY KEY NOT NULL,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  cidade TEXT,
  estado TEXT,
  ativa INTEGER NOT NULL DEFAULT 1 CHECK (ativa IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  cor TEXT
);

CREATE TABLE IF NOT EXISTS op_tipos_lavagem (
  id TEXT PRIMARY KEY NOT NULL,
  nome TEXT NOT NULL,
  valor_minimo_centavos INTEGER NOT NULL CHECK (valor_minimo_centavos >= 0),
  valor_maximo_centavos INTEGER NOT NULL CHECK (valor_maximo_centavos >= valor_minimo_centavos),
  cor TEXT,
  ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS op_solicitacoes_lavagem (
  id TEXT PRIMARY KEY NOT NULL,
  numero_solicitacao INTEGER NOT NULL UNIQUE,
  placa TEXT NOT NULL,
  fornecedor TEXT NOT NULL,
  responsavel_localiza TEXT,
  loja_id TEXT NOT NULL REFERENCES op_lojas(id),
  valor_centavos INTEGER NOT NULL CHECK (valor_centavos >= 0),
  tipo_lavagem_id TEXT REFERENCES op_tipos_lavagem(id),
  origem TEXT NOT NULL DEFAULT 'LOCALIZA',
  status TEXT NOT NULL DEFAULT 'AGUARDANDO' CHECK (status IN ('SOLICITADO','AGUARDANDO','EM_LAVAGEM','FINALIZADA','CANCELADA')),
  funcionario_id TEXT, -- Futuro FK: financeiro.funcionarios
  recebida_em TEXT NOT NULL,
  iniciada_em TEXT,
  finalizada_em TEXT,
  motivo_cancelamento TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  codigo_agencia TEXT,
  funcionario_movimentacao_id TEXT, -- Futuro FK: financeiro.funcionarios
  movimentada_em TEXT,
  foto_final_url TEXT,
  observacao TEXT
);

CREATE TABLE IF NOT EXISTS op_solicitacoes_funcionarios (
  id TEXT PRIMARY KEY NOT NULL,
  solicitacao_id TEXT NOT NULL REFERENCES op_solicitacoes_lavagem(id) ON DELETE CASCADE,
  funcionario_id TEXT NOT NULL, -- Futuro FK: financeiro.funcionarios
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  etapa TEXT
);

CREATE TABLE IF NOT EXISTS op_lavagens_avulsas (
  id TEXT PRIMARY KEY NOT NULL,
  placa TEXT NOT NULL,
  lavador TEXT,
  valor_centavos INTEGER NOT NULL CHECK (valor_centavos >= 0),
  status TEXT NOT NULL DEFAULT 'EM_LAVAGEM',
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  finalizada_em TEXT,
  funcionario_id TEXT, -- Futuro relacionamento com funcionario
  caixinha_centavos INTEGER NOT NULL DEFAULT 0 CHECK (caixinha_centavos >= 0),
  forma_pagamento TEXT,
  observacao TEXT
);

CREATE TABLE IF NOT EXISTS op_importacoes_email (
  id TEXT PRIMARY KEY NOT NULL,
  message_id TEXT NOT NULL UNIQUE,
  numero_referencia INTEGER,
  status TEXT NOT NULL DEFAULT 'PROCESSADO',
  erro TEXT,
  processado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  tipo_importacao TEXT,
  assunto TEXT,
  remetente TEXT,
  tentativas INTEGER NOT NULL DEFAULT 0,
  gmail_history_id TEXT,
  quantidade_registros INTEGER NOT NULL DEFAULT 0,
  recebido_em TEXT
);

CREATE TABLE IF NOT EXISTS op_gmail_sync_state (
  source TEXT PRIMARY KEY NOT NULL,
  history_id TEXT,
  watch_expiration TEXT,
  email_address TEXT,
  label_id TEXT,
  last_notification_history_id TEXT,
  last_sync_at TEXT,
  last_watch_at TEXT,
  last_reconciliation_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS op_conciliacao_consultas (
  id TEXT PRIMARY KEY NOT NULL,
  usuario_id TEXT NOT NULL, -- Futuro relacionamento com auth
  nome TEXT NOT NULL,
  loja TEXT NOT NULL,
  data_inicial TEXT NOT NULL,
  data_final TEXT NOT NULL,
  arquivo_nome TEXT NOT NULL,
  pagamentos TEXT NOT NULL CHECK (json_valid(pagamentos)),
  resultado TEXT NOT NULL CHECK (json_valid(resultado)),
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Indices operacionais. O ID de cada tabela ja tem indice pela PRIMARY KEY.
CREATE INDEX IF NOT EXISTS idx_op_lojas_ativa ON op_lojas(ativa);
CREATE INDEX IF NOT EXISTS idx_op_tipos_ativo ON op_tipos_lavagem(ativo);
CREATE INDEX IF NOT EXISTS idx_op_solicitacoes_loja ON op_solicitacoes_lavagem(loja_id);
CREATE INDEX IF NOT EXISTS idx_op_solicitacoes_status ON op_solicitacoes_lavagem(status);
CREATE INDEX IF NOT EXISTS idx_op_solicitacoes_recebida ON op_solicitacoes_lavagem(recebida_em);
CREATE INDEX IF NOT EXISTS idx_op_solicitacoes_funcionario ON op_solicitacoes_lavagem(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_op_solicitacoes_status_finalizada ON op_solicitacoes_lavagem(status,finalizada_em DESC);
CREATE INDEX IF NOT EXISTS idx_op_sf_solicitacao ON op_solicitacoes_funcionarios(solicitacao_id);
CREATE INDEX IF NOT EXISTS idx_op_sf_funcionario ON op_solicitacoes_funcionarios(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_op_avulsas_status ON op_lavagens_avulsas(status);
CREATE INDEX IF NOT EXISTS idx_op_avulsas_created ON op_lavagens_avulsas(created_at);
CREATE INDEX IF NOT EXISTS idx_op_avulsas_status_finalizada ON op_lavagens_avulsas(status, finalizada_em DESC);
CREATE INDEX IF NOT EXISTS idx_op_importacoes_status ON op_importacoes_email(status);
CREATE INDEX IF NOT EXISTS idx_op_importacoes_numero ON op_importacoes_email(numero_referencia);
CREATE INDEX IF NOT EXISTS idx_op_importacoes_status_updated ON op_importacoes_email(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_op_conciliacao_usuario_data ON op_conciliacao_consultas(usuario_id, criado_em DESC);

-- Postgres: triggers set_updated_at e definir_tipo_lavagem NAO foram portadas ainda.
-- Essas regras precisam passar para a API Workers e receber testes antes de gravacoes reais.
-- Esta etapa NAO importa placas, usuarios, historico, valores ou arquivos reais.
