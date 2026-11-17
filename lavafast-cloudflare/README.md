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

## Manter CPF + senha atuais durante a migracao

**O novo LavaFast nao exige login Google e nao recria funcionarios.**
A tela `/piloto/seguro` foi adaptada ao mesmo fluxo do app original:

1. Funcionario digita o CPF.
2. Digita **a mesma senha cadastrada no LavaFast**.
3. O Worker consulta `POST /api/auth/verificar-cpf` do backend atual
   (apenas em HTTPS, somente durante autenticacao), resolve o email associado
   internamente e confirma a senha pelo **Supabase Auth existente**.
4. O Worker valida o token no endpoint original `GET /api/auth/me`,
   que verifica o funcionario `Ativo` em `financeiro.funcionarios`.
5. Somente depois disso emite uma sessao temporaria, HttpOnly, Secure,
   SameSite=Strict, com validade de 30 minutos no D1 de **homologacao**.
6. Os cards exibem nome/cargo/loja do cadastro original e **nenhum valor**.

A fonte de permissao durante a transicao continua sendo o cargo real
do empregado: `C&O` e `Analista` veem area financeira separada;
demais cargos ativos usam operacao, exclusivamente da loja autorizada.
A comparacao e feita no servidor, nao em query string.
Os cards e valores da API ainda sao **todos ficticios**.

### Variaveis para ativacao opcional (Cloudflare)

O fluxo vem **desabilitado por padrao**: nao tenta acessar empregados
ou senhas da base real enquanto estas configuracoes nao forem feitas.
Abrir Worker `lavafast` → Settings → Variables and Secrets:

- `LAVAFAST_SUPABASE_URL` (Text):
  `https://xgbdurmauhwpbiesdqmi.supabase.co`
- `LAVAFAST_SUPABASE_ANON_KEY` (**Secret**):
  chave publica `anon`/publishable do projeto Supabase atual.
  **NUNCA usar service_role** para autenticacao.
- `LAVAFAST_SESSION_SECRET` (**Secret**):
  senha aleatoria exclusiva para HML, 32+ caracteres.
- `LAVAFAST_BRIDGE_ENABLED` (Text):
  `true` somente depois que todas as outras variaveis estiverem corretas.

Os testes automatizados usam CPF e senhas **sinteticos**, simulando
endpoints de producao. Nenhuma tentativa de login real e realizada
pelos testes, e nenhum dado pessoal e copiado para o GitHub.
Nunca enviar CPF, senha ou chaves ao ChatGPT.

### Medidas de seguranca

- A API Worker usa CSP, HTTPS e valida `Origin` nas mutacoes.
- A chave do Supabase e usada somente no Worker, nao no navegador.
- CPF, senha, email, token JWT do Supabase e hash de senha **nunca**
  sao persistidos no banco D1 de homologacao.
- So persistem sessoes temporarias e contador de falhas indexado por
  HMAC irreversivel de CPF+IP, com bloqueio apos 5 falhas em 15 minutos.
- Sessao e invalidada no logout e expira em 30 minutos.
- O backend nunca envia `valor_centavos` nos cards operacionais,
  inclusive se o usuario for C&O. Financeiro permanece restrito a
  `GET /api/seguro/financeiro/resumo`.
- A finalizacao e atomica, bloqueia registros reais (apenas `HML-CARD-n`)
  e aplica verificacao de loja no WHERE SQL.
- Nenhuma rota permite CRUD de funcionarios pelo novo piloto. Cargos,
  nomes e lojas sao os do cadastro existente.
- Colaboradores sem senha/auth ou email associado devem continuar
  configurando seu acesso pelo app atual antes de usar o novo.
- O login CPF desta fase depende **temporariamente** do Render e do
  Supabase Auth, que **nao podem ser desativados** antes de existir
  uma alternativa testada para as senhas e sincronizacao de funcionarios.

### Endpoints autenticados

- `GET /api/seguro/configuracao`: informa se a ponte esta configurada.
- `POST /api/seguro/entrar`: valida CPF+senha atuais e cria sessao HML.
- `GET /api/seguro/eu`: nome, cargo, loja e perfil reais da sessao.
- `POST /api/seguro/sair`: invalida sessao HML.
- `GET /api/seguro/solicitacoes`: cards HML de loja autorizada.
- `GET /api/seguro/concluidos`: concluídos HML autorizados.
- `POST /api/seguro/finalizar/:id`: finaliza somente um card de teste.
- `GET /api/seguro/financeiro/resumo`: somente C&O e Analista,
  financeiro **ficticio**, em tela separada.

### Migração definitiva ainda pendente

O Supabase Auth guarda **hashes**, nao senhas legiveis.
Por isso, preservar a senha atual e remover toda dependencia do
Supabase exigira uma fase adicional de migracao de credenciais com
criterios de seguranca, consolidacao de funcionarios e controle de
sincronismo. **Nao copiar dados pessoais, CPF, emails ou hashes de
senha indiscriminadamente.** O sistema antigo so sera desligado
depois de testes funcionais e autorizacao expressa.
