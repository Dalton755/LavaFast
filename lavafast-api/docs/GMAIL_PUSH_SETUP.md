# Gmail Push — LavaFast / Localiza

Este fluxo substitui o polling/Apps Script por Gmail API Push + Google Cloud Pub/Sub.

## Fluxo

Gmail (label `LOCALIZA_LAVAGEM`) -> Pub/Sub -> `POST /api/localiza/gmail/webhook` -> Gmail History -> parser Localiza -> Supabase -> card.

O processamento é idempotente por `message_id` e por `numero_solicitacao`.

## 1. Google Cloud (uma única vez)

No mesmo projeto do OAuth do Gmail, habilite:

- Gmail API
- Cloud Pub/Sub API

Crie um tópico Pub/Sub chamado `lavafast-gmail`.

Conceda ao principal abaixo a função **Pub/Sub Publisher** no tópico:

`gmail-api-push@system.gserviceaccount.com`

O nome completo do tópico será:

`projects/SEU_PROJECT_ID/topics/lavafast-gmail`

## 2. OAuth do Gmail (uma única vez)

O backend utiliza somente o escopo:

`https://www.googleapis.com/auth/gmail.readonly`

Gere um refresh token offline para a conta Gmail que recebe as solicitações da Localiza.

Configure no backend:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_REDIRECT_URI`

Depois disso a renovação do Gmail Watch é automática; não é necessário autorizar diariamente.

## 3. Variáveis do backend

Além das variáveis do Supabase, configure:

- `GMAIL_LOCALIZA_LABEL=LOCALIZA_LAVAGEM`
- `GMAIL_PUBSUB_TOPIC=projects/SEU_PROJECT_ID/topics/lavafast-gmail`
- `GMAIL_PUBSUB_TOKEN=<segredo forte>`
- `GMAIL_ADMIN_SECRET=<segredo forte>`
- `CRON_SECRET=<segredo forte>`

`CRON_SECRET` é usado pela Vercel para autenticar a renovação diária.

## 4. Subscription Pub/Sub

Após o backend estar publicado, crie uma subscription **Push** apontando para:

`https://SEU_DOMINIO_API/api/localiza/gmail/webhook?token=SEU_GMAIL_PUBSUB_TOKEN`

Respostas 2xx confirmam a entrega. Em erro 5xx, o Pub/Sub pode repetir a notificação e o backend continua idempotente.

## 5. Inicialização

Faça uma chamada única:

`POST /api/localiza/gmail/inicializar`

Header:

`x-lavafast-secret: <GMAIL_ADMIN_SECRET>`

Essa chamada:

1. cria/renova o Gmail Watch;
2. salva `historyId` e expiração em `operacoes.gmail_sync_state`;
3. reconcilia mensagens recentes para evitar janela de perda na migração.

## 6. Renovação automática

`vercel.json` agenda `/api/localiza/gmail/renew-watch` diariamente às `06:00 UTC` (03:00 no horário de Brasília quando UTC-3).

A rotina renova o Watch e executa uma reconciliação de segurança dos e-mails recentes.

## 7. Auditoria

- `operacoes.importacoes_email`: mensagem, tentativas, status e erro.
- `operacoes.gmail_sync_state`: historyId, expiração, última sincronização, última renovação e último erro.

Endpoints administrativos:

- `GET /api/localiza/gmail/status`
- `POST /api/localiza/gmail/reconcile`
- `GET /api/localiza/gmail/renew-watch`

Use `x-lavafast-secret` nos endpoints administrativos manuais.

## 8. Desativação do fluxo antigo

Só desligue o Apps Script/polling antigo depois de validar solicitações reais no novo fluxo. Durante a transição, a constraint única de `numero_solicitacao` impede duplicidade de cards.
