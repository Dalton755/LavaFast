# LavaFast Cloudflare — piloto isolado

Este diretorio e um teste tecnico independente. Nao substitui o app atual,
nao se conecta ao Supabase/Render/Vercel e nao processa e-mails da Localiza.

## Incluido

- Cloudflare Worker HTTP: GET /api/health e GET /api/piloto/lojas
- Banco D1 demonstrativo, sem dados reais
- Testes automatizados com Node.js
- Configuracao de deploy somente de homologacao, sem dominio personalizado

## Teste local (Node 18+)

1. Entrar no diretorio lavafast-cloudflare
2. Executar: npm test
3. Criar um D1 **novo e exclusivo para homologacao** com:
   npx wrangler d1 create lavafast-cloudflare-hml-db
4. Copiar wrangler.example.jsonc para wrangler.jsonc (arquivo ignorado pelo Git).
5. Colar no campo database_id o UUID retornado pelo Cloudflare.
6. Aplicar somente no banco LOCAL:
   npx wrangler d1 migrations apply lavafast-cloudflare-hml-db --local
7. Iniciar:
   npx wrangler dev
8. Testar:
   http://localhost:8787/api/health
   http://localhost:8787/api/piloto/lojas

## Proximo passo — ambiente remoto de homologacao

Depois de confirmar que o ID do D1 e exclusivo de testes:

1. Aplicar migracao somente ao D1 de homologacao:
   npx wrangler d1 migrations apply lavafast-cloudflare-hml-db --remote
2. Publicar Worker de teste:
   npx wrangler deploy
3. Conferir a URL terminada em workers.dev, sem vincular dominio atual.

**Nunca rodar importacao de dados de producao ou mover DNS neste piloto.**
O banco de origem continuara intacto ate validarmos a migracao completa.
Leia docs/CLOUDFLARE_MIGRATION.md na raiz do repositorio.

## Teste operacional demonstrativo (sem usuarios reais)

A migracao 0003_piloto_operacao.sql cria 2 lojas de laboratorio,
2 tipos de lavagem e 4 cards ficticios. Identificadores com prefixo HML
e placas TESTE01 a TESTE04. Nao representa dados da Localiza.

O deploy configurado em npm run deploy aplica migracoes remotas de
homologacao. Depois da publicacao, abrir:

- /api/piloto/estrutura (8 tabelas)
- /api/piloto/cards (4 cards ficticios)
- /api/piloto/cards?loja=HML_MOOCA (2 cards ficticios)

**Antes de importar registros reais**: excluir os registros HML e restringir
endpoints de dados reais com autenticacao e autorizacao por loja/perfil.
Nenhum endpoint novo permite criar, editar ou finalizar lavagens.

## Fluxo de homologacao: Solicitações → Concluídos

- O painel visual esta em `/piloto/operacao`.
- Duas abas: **Solicitações** (SOLICITADO, AGUARDANDO e EM_LAVAGEM
  sao status internos legados, **nao etapas visuais**) e **Concluídos**.
- Os cards de demonstracao nao exibem ou retornam valores financeiros.
- A API usa colunas explicitas (whitelist) nos endpoints, inclusive
  no legado `/api/piloto/cards`. Alterar `?perfil=ANALISTA` nao libera dados.
- Timer de solicitacao usa `recebida_em` ate agora. A finalizacao salva
  `finalizada_em`, e o tempo final e calculado a partir dessas datas.
- Filtro por loja e pesquisa local por placa ou numero da solicitacao.
- Layout responsivo com cards elevados, iluminacao sutil e sombras 3D.
- Atualizacao automatica a cada 30 segundos na guia visivel.

### Teste de finalizacao protegido

Nao existe autenticacao de usuarios migrada para Cloudflare ainda.
Para **evitar um endpoint publico que finalize registros**, o POST
`/api/piloto/finalizar/HML-CARD-1` requer um secret de **pelo menos
32 caracteres**. Sem secret, o botao fica bloqueado e a API responde 503.

Configurar no Cloudflare: Worker `lavafast` → Settings →
Variables and Secrets → Add → **Secret** (nao Text).

- Nome do secret: `HML_FINALIZE_SECRET`
- Valor: senha aleatoria forte com 32+ caracteres criada no seu
  gerenciador de senhas. Nao compartilhar no chat nem no GitHub.
- O usuario digita a chave na janela de confirmacao do painel.
  A chave vai em header HTTPS e nao fica gravada em localStorage.
- Servidor exige mesma Origin, secret valido e `ENVIRONMENT=homologacao`.
- Grava somente linhas `HML-CARD-n`, de origem `HOMOLOGACAO`
  e fornecedor `LAB-HOMOLOGACAO`, com status ativo.
- UPDATE atomico impede finalizacao duplicada; somente o D1 de
  homologacao e modificado. Nenhuma acao na Localiza ou Supabase.

**Nao usar essa chave de teste como autenticacao de producao.** Antes de
importar dados reais, implementar login, sessao, revogacao e perfis
verificados no servidor (Operacao/Analista/C&O) e isolar quaisquer
dados financeiros em rotas exclusivas para as permissoes autorizadas.

### Endpoints

`GET /api/piloto/solicitacoes`: cards ativos de demonstracao, sem valores.

`GET /api/piloto/concluidos`: finalizados de demonstracao, sem valores,
incluindo o tempo total em segundos.

`GET /api/piloto/configuracao`: informa se o segredo de teste esta configurado
(sem expor seu valor).

`POST /api/piloto/finalizar/:id`: termina uma lavagem de teste somente
quando autorizada pela chave de homologacao.

`GET /api/piloto/cards`: compatibilidade (sem valores financeiros).

### Importante

**Fluxo real de e-mails ainda NAO foi conectado ao Cloudflare.**
O sistema em producao, incluindo recebimento e finalizacao de lavagens,
permanece no ambiente antigo ate testes completos de seguranca,
login, reconciliação e autorizacao de cutover.

## Autenticacao Google + perfis (etapa 4 de homologacao)

Uma segunda interface, `/piloto/seguro`, permite testar a autenticacao
sem substituir a tela demonstrativa publica de `/piloto/operacao`.

O deploy automatico `npm run deploy` cria a tabela `hml_usuarios`
com a migracao `0004_hml_usuarios.sql`. A tabela inicia **vazia**.

### Configuracao pelo proprietario (sem compartilhar credenciais)

1. No Google Cloud Console (APIs e servicos → Credenciais), crie
   **OAuth Client ID → Web application**.
2. Em **Authorized JavaScript origins**, cadastre exatamente:
   `https://lavafast.rochadalton00.workers.dev` (sem barra final).
   O Google Identity Services usa o JavaScript do navegador e
   o client ID; para este fluxo popup nao e necessario URI de callback
   no backend.
3. Cloudflare → Workers & Pages → `lavafast` → Settings →
   Variables and Secrets. Cadastre variaveis:
   - `LAVAFAST_GOOGLE_CLIENT_ID`: Client ID OAuth Web do LavaFast.
     E um identificador publico; **nao** cole o client secret.
   - `LAVAFAST_BOOTSTRAP_EMAIL`: e-mail Google do responsavel C&O,
     configurado somente no painel da Cloudflare, **nunca no GitHub**.
4. Salve as variaveis e verifique nova implantacao das bindings.
5. Abra `/piloto/seguro` e entre com a conta Google configurada
   como bootstrap. O servidor verifica assinatura criptografica
   Google, `iss`, `aud`, `exp`, `iat`, `email_verified` e `sub`.
   O perfil C&O da conta bootstrap e criado no D1 somente
   apos validar Google e quando nao houver cadastro com esse email.

### Controle de perfis no servidor

- **OPERACAO**: acessa apenas a loja autorizada; pode ler e finalizar
  cards ficticios. Nao pode consultar financeiro nem gerenciar usuarios.
- **ANALISTA**: acessa lojas e a rota financeira de homologacao.
  Pode ler/finalizar cards ficticios, sem valores nos proprios cards.
- **CO**: acesso do analista + cadastrar e desativar colaboradores
  em **Acessos**, com perfil e atribuicao de loja.

Importante: perfis **nao** podem ser definidos por campo do navegador,
`?perfil=ANALISTA` ou cabecalho controlado pelo usuario.
O backend consulta o perfil ativo em `hml_usuarios` a cada requisicao
autenticada. Contas nao convidadas recebem HTTP 403.

A primeira associacao de um convite por email a um Google `sub`
so ocorre para Gmail/Google Workspace cujo dominio e autoritativo,
e depois utiliza o identificador imutavel `sub`, nao o email.
Uma conta sem vinculo, desativada ou com loja invalida nao entra.

### Endpoints novos

- `GET /api/seguro/configuracao`: cliente OAuth publico e estado de configuracao.
- `GET /api/seguro/eu`: perfil validado no D1.
- `GET /api/seguro/solicitacoes`: somente cards ficticios abertos,
  filtrados obrigatoriamente por loja para OPERACAO.
- `GET /api/seguro/concluidos`: somente ficticios concluidos.
- `POST /api/seguro/finalizar/:id`: finalizacao atomica de card HML,
  autenticada via ID token, respeitando loja e bloqueando duplicidade.
- `GET /api/seguro/financeiro/resumo`: exclusivo de ANALISTA ou CO,
  valores ficticios em rota separada; **nenhum valor no card**.
- `GET/POST /api/seguro/usuarios`: exclusivo de CO, convidar e atualizar
  papel/loja/status de acesso.

Token Google fica somente na memoria do navegador e expira segundo
a politica Google; em caso de expiracao deve ser renovado por login.
Todos os endpoints de dados protegidos exigem Bearer ID token valido.
Nunca salvar tokens em localStorage, cookies acessiveis por JavaScript
ou no banco D1. Nunca gravar `LAVAFAST_BOOTSTRAP_EMAIL` ou algum segredo
em arquivos `wrangler.jsonc` versionados. Desativar a conta no D1
revoga acesso nas novas requisicoes.

**Atenção**: so ha contas e dados *de homologacao*. Os usuarios
do Supabase em producao nao foram migrados. O processo de importacao
de colaboradores exige reconciliacao de vinculos antigos, autorizacao
administrativa e validacao de identidade antes de liberar dados reais.
