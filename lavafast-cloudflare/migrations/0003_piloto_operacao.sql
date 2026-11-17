-- Apenas homologacao: exemplos FICTICIOS, proibidos em producao.
-- IDs e codigos HML-/HML_ nao correspondem a nenhum cadastro de operacao real.
-- Os dados abaixo nao devem ser copiados na futura importacao do Supabase.
INSERT OR IGNORE INTO op_lojas (id, codigo, nome, cidade, estado, ativa)
VALUES
 ('HML-OP-MOOCA','HML_MOOCA','Mooca [DEMO]','Sao Paulo','SP',1),
 ('HML-OP-CENTRAL','HML_CENTRAL_PLAZA','Central Plaza [DEMO]','Sao Paulo','SP',1);

INSERT OR IGNORE INTO op_tipos_lavagem
 (id, nome, valor_minimo_centavos, valor_maximo_centavos, cor, ativo)
VALUES
 ('HML-TIPO-EXPRESS','Express [DEMO]',0,7000,'#0F766E',1),
 ('HML-TIPO-COMPLETA','Completa [DEMO]',7001,16000,'#2563EB',1);

INSERT OR IGNORE INTO op_solicitacoes_lavagem
 (id, numero_solicitacao, placa, fornecedor, loja_id, valor_centavos, tipo_lavagem_id,
  origem, status, recebida_em, iniciada_em, finalizada_em, observacao)
VALUES
 ('HML-CARD-1', -990001, 'TESTE01', 'LAB-HOMOLOGACAO', 'HML-OP-MOOCA', 5000,
  'HML-TIPO-EXPRESS', 'HOMOLOGACAO', 'SOLICITADO', '2026-11-17T08:00:00.000Z', NULL, NULL, 'DEMO: solicitacao'),
 ('HML-CARD-2', -990002, 'TESTE02', 'LAB-HOMOLOGACAO', 'HML-OP-MOOCA', 9000,
  'HML-TIPO-COMPLETA', 'HOMOLOGACAO', 'EM_LAVAGEM', '2026-11-17T08:01:00.000Z', '2026-11-17T08:10:00.000Z', NULL, 'DEMO: em lavagem'),
 ('HML-CARD-3', -990003, 'TESTE03', 'LAB-HOMOLOGACAO', 'HML-OP-CENTRAL', 5000,
  'HML-TIPO-EXPRESS', 'HOMOLOGACAO', 'AGUARDANDO', '2026-11-17T08:02:00.000Z', NULL, NULL, 'DEMO: aguardando'),
 ('HML-CARD-4', -990004, 'TESTE04', 'LAB-HOMOLOGACAO', 'HML-OP-CENTRAL', 9000,
  'HML-TIPO-COMPLETA', 'HOMOLOGACAO', 'FINALIZADA', '2026-11-17T08:03:00.000Z',
  '2026-11-17T08:15:00.000Z', '2026-11-17T08:30:00.000Z', 'DEMO: finalizada');
