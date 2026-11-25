// Inicializacao protegida da base de contingencia, copiada da migration 0006.
// Executar SOMENTE apos validar CT_BOOTSTRAP_SECRET e origem da requisicao.
const statements = [
  "CREATE TABLE IF NOT EXISTS ct_funcionarios (\n  id TEXT PRIMARY KEY NOT NULL,\n  cpf_hmac TEXT NOT NULL UNIQUE,\n  cpf_final TEXT NOT NULL,\n  nome TEXT NOT NULL,\n  cargo TEXT NOT NULL,\n  loja_codigo TEXT NOT NULL CHECK(loja_codigo IN ('MOOCA','CENTRAL_PLAZA','TODAS')),\n  ativo INTEGER NOT NULL DEFAULT 1 CHECK(ativo IN (0,1)),\n  senha_salt TEXT NOT NULL,\n  senha_hash TEXT NOT NULL,\n  trocar_senha INTEGER NOT NULL DEFAULT 1 CHECK(trocar_senha IN (0,1)),\n  criado_em TEXT NOT NULL,\n  atualizado_em TEXT NOT NULL\n)",
  "CREATE INDEX IF NOT EXISTS idx_ct_funcionarios_ativos ON ct_funcionarios(ativo,loja_codigo)",
  "CREATE TABLE IF NOT EXISTS ct_sessoes (\n  token_hash TEXT PRIMARY KEY NOT NULL,\n  funcionario_id TEXT NOT NULL REFERENCES ct_funcionarios(id) ON DELETE CASCADE,\n  expira_em TEXT NOT NULL,\n  criada_em TEXT NOT NULL\n)",
  "CREATE INDEX IF NOT EXISTS idx_ct_sessoes_expira ON ct_sessoes(expira_em)",
  "CREATE TABLE IF NOT EXISTS ct_tentativas (\n  chave_hmac TEXT PRIMARY KEY NOT NULL,\n  falhas INTEGER NOT NULL DEFAULT 0,\n  expira_em TEXT NOT NULL\n)",
  "CREATE TABLE IF NOT EXISTS ct_solicitacoes (\n  id TEXT PRIMARY KEY NOT NULL,\n  numero_solicitacao TEXT NOT NULL UNIQUE,\n  placa TEXT NOT NULL,\n  loja_codigo TEXT NOT NULL CHECK(loja_codigo IN ('MOOCA','CENTRAL_PLAZA')),\n  tipo_lavagem TEXT NOT NULL DEFAULT 'Nao informado',\n  status TEXT NOT NULL DEFAULT 'SOLICITACAO'\n     CHECK(status IN ('SOLICITACAO','CONCLUIDO')),\n  recebida_em TEXT NOT NULL,\n  finalizada_em TEXT,\n  finalizada_por TEXT REFERENCES ct_funcionarios(id),\n  origem TEXT NOT NULL CHECK(origem IN ('MANUAL','EMAIL','IMPORTACAO_EMAIL')),\n  mensagem_id TEXT,\n  observacao TEXT,\n  criado_em TEXT NOT NULL,\n  atualizado_em TEXT NOT NULL\n)",
  "CREATE INDEX IF NOT EXISTS idx_ct_solicitacoes_loja_status ON ct_solicitacoes(loja_codigo,status,recebida_em DESC)",
  "CREATE INDEX IF NOT EXISTS idx_ct_solicitacoes_placa ON ct_solicitacoes(placa)",
  "CREATE TABLE IF NOT EXISTS ct_auditoria (\n  id TEXT PRIMARY KEY NOT NULL,\n  evento TEXT NOT NULL,\n  funcionario_id TEXT,\n  solicitacao_id TEXT,\n  horario TEXT NOT NULL\n)",
  "CREATE INDEX IF NOT EXISTS idx_ct_auditoria_horario ON ct_auditoria(horario DESC)"
];

export async function verificarEstruturaContingencia(env) {
  if (!env.DB) return false;
  try {
    const query = await env.DB.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name IN ('ct_funcionarios','ct_sessoes','ct_tentativas','ct_solicitacoes','ct_auditoria')").first();
    return Number(query?.n) === 5;
  } catch { return false; }
}

export async function prepararEstruturaContingencia(env) {
  // CREATE IF NOT EXISTS preserva registros ja existentes; nao apaga dados.
  for (const statement of statements) await env.DB.prepare(statement).run();
  if (!(await verificarEstruturaContingencia(env))) throw Error("Estrutura de contingencia incompleta");
}
