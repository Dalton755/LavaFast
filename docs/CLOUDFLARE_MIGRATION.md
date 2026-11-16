# LavaFast ERP — plano de migracao Cloudflare

Data do levantamento: 2026-11-16.
Situacao: preparacao de homologacao; sistema de producao inalterado.

## Inventario confirmado

- Fonte: Dalton755/LavaFast, frontend React/Vite em lavafast-web.
- Backend atual: Node/Express em lavafast-api, com scheduler por setInterval.
- Supabase Lava_Rapido: 40 tabelas operacionais/financeiras:
  8 em operacoes e 32 em financeiro.
- Funcoes SQL de negocio: 2 em operacoes e 10 em financeiro.
- Autenticacao: Supabase Auth (login por senha, sessoes, perfis e permissoes).
- Atualizacao de cards: Supabase Realtime em operacoes.solicitacoes_lavagem.
- Recebimento: Gmail API + Google Pub/Sub, Gmail Watch e recuperacao de falhas.
- OCR: implementacao navegador, Node, e servico Python separado.
- Financeiro: historico, conciliacao e consultas salvas.

## Arquitetura alvo

GitHub -> Cloudflare Pages (frontend React/Vite)
                 Cloudflare Workers (API)
                       D1 (dados)
                       R2 (arquivos)
                       Durable Objects (tempo real, se necessario)
                       Cron Triggers/Queues (rotinas e reprocessamento)
Google Cloud Pub/Sub -> Worker webhook -> Queue -> D1

OCR: avaliar navegador primeiro; usar Google Cloud Run para a rotina Python
somente se testes mostrarem que o OCR local nao atende.

## Regras de isolamento

- Manter main, dominios, variaveis e bancos atuais sem alteracao.
- Toda prova de conceito deve rodar em Worker/D1 exclusivos de homologacao.
- Dados iniciais artificiais; nao copiar contas, CPF, placas ou e-mails.
- Nao ativar webhook Gmail/Google PubSub real em homologacao.
- Nao publicar versao final ate teste e autorizacao explicita.
- Nenhum segredo em repositorio. Tokens somente em Secrets do Cloudflare.

## Conversao do banco (pendente)

PostgreSQL -> D1/SQLite nao e copia direta:
- Schemas operacoes e financeiro exigem estrategia de prefixos/namespaces.
- UUID vira TEXT; timestamp com fuso deve preservar ISO-8601 UTC.
- Numeric financeiro deve usar inteiro em centavos quando aplicavel.
- Boolean para INTEGER com CHECK; rever defaults, indices e chaves.
- Funcoes PostgreSQL e politicas RLS precisam ser reimplementadas na API.
- Auditar privilegios em toda rota; nunca confiar no filtro do frontend.
- Gerar esquema D1 completo e migrador reversivel apos auditoria.

## Etapas

1. Piloto isolado: Worker + D1 demonstrativo, GET /api/health e /api/piloto/lojas.
2. Inventario detalhado: tipos, relacionamentos, FKs, indices e tamanho dos dados.
3. Migracao do modelo de dados e importacao controlada em homologacao.
4. API de operacao e camada de autorizacao, com testes por perfil e loja.
5. Login com migracao segura de contas: nao reutilizar hashes sem validar
   compatibilidade e sem plano seguro de reset de senha.
6. Atualizacao em tempo real e integracao Gmail Pub/Sub com idempotencia,
   renovacao Gmail Watch e reconciliacao de falhas.
7. OCR e arquivos R2, relatorios, dashboard e conciliacao financeira.
8. Testes paralelos (origem e destino): totais, status, fotos, lojas,
   permissoes, latencia, recebimento de novas solicitacoes.
9. Cutover com backup, congelamento temporario de gravacoes,
   importacao incremental e plano documentado de rollback.

## Criterios obrigatorios antes de desligar servicos

- Todas as tabelas e regras cobertas e conferidas.
- Nenhuma solicitacao perdida/duplicada na integracao Gmail.
- Funcionarios, permissoes e separacao Mooca/Central Plaza corretos.
- Operacoes, produtividade e conciliação com resultados equivalentes.
- Login e recuperacao de acesso validados, inclusive apos recarga.
- Atualizacoes ao vivo e notificacoes testadas em duas sessoes.
- Backup testado, monitoramento de erros e reversao praticada.
- Aprovacao do responsavel para trocar DNS e encerrar Render/Supabase/Vercel.

### Observacao

Cloudflare D1 usa SQLite e nao substitui automaticamente a semantica de
PostgreSQL. Se a auditoria encontrar dependencia de transacoes complexas,
consultas especiais ou escala incompativel, reavaliar PostgreSQL gerenciado
em Google Cloud para essa parcela em vez de forcar uma conversao insegura.
