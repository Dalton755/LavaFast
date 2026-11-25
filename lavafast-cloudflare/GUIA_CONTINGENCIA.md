# LavaFast — Continuidade operacional sem Supabase

## Objetivo

Manter o LavaFast operacional mesmo com o Supabase `INACTIVE`, sem
alterar ou perder a possibilidade de restaurar a base original depois.

A contingência está em uma **área separada** do piloto anterior:
`https://lavafast.rochadalton00.workers.dev/contingencia`.

**Importante:** esta solução usa cadastros e senhas de contingência
temporários. Não recupera automaticamente os CPFs, senhas ou históricos do
Supabase bloqueado. O fluxo operacional é funcional depois de ativado,
mas a integração automática com Gmail requer configuração adicional.

## 1 — Ativação (Cloudflare, sem notebook)

Worker: **lavafast** → **Settings** → **Variables and Secrets**.

Cadastrar **dois Secrets diferentes**, ambos gerados de forma aleatória
com pelo menos 32 caracteres cada:

- `CT_BOOTSTRAP_SECRET` — segredo de uso único para criar o primeiro
  C&O. Guarde-o fora do GitHub e do chat.
- `CT_AUTH_PEPPER` — segredo para proteger os CPFs com HMAC.
  **Não perca nem altere esse valor**: ele será necessário para manter
  os logins já cadastrados.

Não é necessário nenhuma chave do Supabase, token Google OAuth ou
variável de autenticação da infraestrutura antiga.

Salve as duas configurações. Abra:
`https://lavafast.rochadalton00.workers.dev/api/contingencia/config`

Esperado: `"pronto": true`.

## 2 — Criar responsável C&O

Abra a tela `/contingencia`. Use
**Primeiro acesso: criar administrador C&O**.

Informe o segredo `CT_BOOTSTRAP_SECRET`, CPF **real do responsável**,
nome e uma **nova senha** de 12 ou mais caracteres. A senha antiga não
pode ser conferida enquanto o Supabase estiver bloqueado.

O cadastro inicial é único: a criação de outro administrador pelo mesmo
formulário é bloqueada. Após isso, faça login com CPF e nova senha.

O CPF é usado somente em memória para criar um HMAC com
`CT_AUTH_PEPPER`. O D1 guarda somente o HMAC e os quatro últimos dígitos,
não o CPF integral.

## 3 — Cadastrar equipe temporariamente

Entre como C&O → aba **Equipe** → informe CPF, nome, cargo, loja e senha
temporária (12+ caracteres). Informe essa senha individualmente por
canal seguro, sem reutilizar para vários funcionários.

No primeiro login o funcionário será obrigado a criar uma nova senha.

Os cargos C&O e Analista possuem visão de todas as lojas; os demais
cargos só veem a loja selecionada. Não existem valores financeiros
nos cards, nem na API deste ambiente.

## 4 — Operação imediata

- **Solicitações:** mostra as SLs ainda não concluídas.
- **+ Nova SL:** inclusão manual com SL, placa, loja e tipo de lavagem.
  Número de SL duplicado é rejeitado.
- **Importar e-mail:** cole o corpo do e-mail recebido da Localiza,
  selecione a loja e importe todas as SLs/placas encontradas.
  Duplicatas são ignoradas. Conteúdo do e-mail **não é guardado**.
- **Finalizar lavagem:** grava `finalizada_em`, quem finalizou e move
  para **Concluídos**, calculando o tempo total.
- **Concluídos → Reabrir solicitação:** corrige movimentações erradas.
- **Equipe → Exportar backup:** gera JSON das solicitações, para
  preservar cópia das operações. Guarda com segurança.

A data/hora da SL criada manualmente ou de email colado usa a data de
inclusão. O relay automático do Gmail utiliza a data original do email.

## 5 — Cards criados automaticamente ao receber email (Gmail)

**Sem Supabase, Render ou Vercel.** O Gmail e monitorado com um Google
Apps Script autorizado na conta que recebe as solicitacoes da Localiza.
O Google permite gatilho agendado a cada **1 minuto**. Nao e acionamento
instantaneo por push; pode haver variacao de horario e cotas do Google.

Fluxo: Gmail (remetente e assunto da Localiza) -> Apps Script ->
Webhook autenticado do Worker -> banco D1 `ct_solicitacoes` ->
aba **Solicitacoes** de Mooca/Central Plaza. A tela de operacao atualiza
os cards a cada 30 segundos enquanto aberta.

### Ativar

1. Acesse **Cloudflare → Workers & Pages → lavafast → Settings →
   Variables and Secrets**. Adicione um **Secret** `CT_EMAIL_RELAY_SECRET`,
   com valor aleatorio exclusivo de pelo menos 32 caracteres. **Nao
   altere** `CT_AUTH_PEPPER` nem `CT_BOOTSTRAP_SECRET`.
2. Na conta Gmail que recebe as solicitacoes, abra
   `https://script.google.com/home/projects/create`. Crie o projeto
   **LavaFast Gmail Contingencia**.
3. No editor do Apps Script, substitua o codigo pelo conteudo do arquivo
   `integracoes/GoogleAppsScript_LavaFast_CT.gs` deste repositorio.
4. Em **Configuracoes do projeto → Propriedades do script**, crie
   exatamente estas propriedades:
   - **LAVAFAST_CT_URL**:
     `https://lavafast.rochadalton00.workers.dev/api/contingencia/email/relay`
   - **LAVAFAST_CT_EMAIL_SECRET**: mesmo valor de `CT_EMAIL_RELAY_SECRET`
     salvo como Secret no Cloudflare. **Nao cole nenhum segredo no codigo
     do projeto ou em mensagens de chat.**
5. Salve e execute a funcao **`instalarLavaFastCT`** UMA vez. Aceite
   as permissoes Gmail e UrlFetch na conta que de fato recebe as SLs.
   Esse passo cria o gatilho automaticamente (1 minuto). Tambem
   verifica mensagens recebidas nas **ultimas 24 horas**, para nao perder
   solicitacoes de hoje.
6. No LavaFast, entre como **Admin ou C&O** e abra
   **✉ E-mail → Sincronizacao automatica**. O painel mostra e-mails
   processados, cards criados nas ultimas 24h e a ultima importacao.

### Validacao e resiliencia

- Remetente exato: `no-reply@localiza.com`.
- Assunto: `Solicitação de Lavagem` (acentos normalizados).
- Agencia `ACSMC` vira loja **Mooca**; `ACUCP` vira
  **Central Plaza**. Agencia desconhecida ou discordante e rejeitada.
- Extrai cada numero SL com sua placa. Um email pode gerar varios cards.
  O valor em reais e ignorado e **nunca e gravado no D1 operacional**.
- Cada card com origem **Recebido por e-mail** aparece diretamente em
  Solicitações. O funcionario finaliza e o card vai para Concluidos,
  com registro do tempo total.
- Duplicatas por SL sao impedidas no D1. O script marca mensagem como
  enviada somente apos resposta confirmada do Worker. Se houver falha
  temporaria, tenta novamente; uma importacao repetida nao recria card.
- Usa limite de 40 mensagens por rodada para proteger cotas.
- Para verificar entrega antiga, execute manualmente
  `recuperarUltimas24hLavaFastCT` no Apps Script.
- Para parar a automacao sem apagar cards, execute `pararLavaFastCT`.
- Se Gmail ou relays falharem, a aba **✉ E-mail** continua permitindo
  importar uma mensagem colando seu corpo, sem interromper a operacao.

**OBS:** `GET /api/contingencia/config` com
`email_relay_habilitado: true` confirma somente que o **Worker tem um
secret configurado**. Nao confirma que o Apps Script foi instalado ou
que uma mensagem realmente foi entregue. O diagnostico efetivo e o
painel `GET /api/contingencia/email/status` (Admin/C&O autenticado).

O usuario deve validar uma SL em cada loja antes de depender do
recebimento automatico.

## Regras de segurança e de migração futura

- Ambiente isolado por prefixo de tabelas `ct_`, inicialmente vazio.
- Operações somente com sessão autenticada, cookie Secure+HttpOnly.
- Senhas guardadas como hash PBKDF2 com salt aleatório, nunca em texto.
- Bloqueio após cinco erros de senha em janela de quinze minutos.
- C&O cria/inativa funcionários e exporta histórico.
- Operação comum somente da própria loja.
- Não existe campo financeiro neste banco operacional.
- Nenhum dado original é apagado, alterado ou restaurado.
- **Não compartilhar CPF, senha ou segredos no chat/GitHub**.
- A base de contingência **não é uma cópia do Supabase**. Ao pagar
  para recuperar o banco antigo, será necessário reconciliar
  identificadores/SLs e mesclar cadastros evitando duplicação.

**Não alterar DNS do aplicativo original nem vincular dados reais antes
de validar credenciais, backup e pelo menos um ciclo ponta a ponta.**

## Cadastro rápido de funcionários — Admin ou C&O

Página exclusiva: **`/contingencia/cadastro`**. Também aparece como
**Cadastro rápido** no painel principal, somente para Admin/C&O logado.

1. Entre no LavaFast com CPF/senha de Admin ou C&O.
2. Abra **Cadastro rápido** (menu superior ou aba Equipe).
3. Preencha nome completo, CPF, cargo e loja.
4. O navegador gera uma senha temporária aleatória automaticamente.
5. Clique **Salvar funcionário no Cloudflare**. O servidor verifica
   permissão e CPF único, gera salt/hash e salva no banco **D1**.
6. Na confirmação, copie a senha temporária uma única vez e entregue
   individualmente ao colaborador por canal privado.
7. Clique **Cadastrar outro**: mantém cargo e loja para acelerar a inclusão
   de funcionários do mesmo setor, limpando CPF, nome e senha.

A lista de equipe tem pesquisa por nome, cargo e os quatro últimos
dígitos do CPF. Admin/C&O pode **editar nome, cargo e loja**,
**desativar/reativar** e **redefinir senha temporária** de outra conta.
A atualização da loja/cargo e redefinição de senha invalidam sessões
anteriores da conta alterada. Não é permitido alterar o próprio cargo
por esta tela para evitar bloqueio administrativo.

Segurança: os cadastros não dependem de Supabase; CPF integral não é
gravado (HMAC + final), a senha não é armazenada em texto e exige troca
obrigatória no primeiro login. A API valida perfil no servidor, independentemente
da existência do botão na interface. Não compartilhe CPF ou senhas no chat.

O novo cadastro **não recupera registros históricos bloqueados**.
Os colaboradores devem ser incluídos na contingência por um Admin ou
C&O até futura conciliação com o Supabase restaurado.
