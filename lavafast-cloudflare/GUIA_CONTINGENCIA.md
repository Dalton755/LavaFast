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

## 5 — Encaminhamento automático de e-mails (opcional, recomendável)

Esta etapa depende da conta Google **que recebe as mensagens**. Não é
necessário conectar o Supabase nem o Render.

1. Em Workers & Pages → lavafast → Settings → Variables and Secrets,
   crie um Secret `CT_EMAIL_RELAY_SECRET` com 32 ou mais caracteres.
2. Abra `https://script.google.com/` autenticado na conta que recebe as
   solicitações da Localiza e crie um projeto Apps Script.
3. Copie o código de
   `integracoes/GoogleAppsScript_LavaFast_CT.gs` (neste repositório).
4. Em **Project Settings → Script Properties**, cadastre:
   - `LAVAFAST_CT_URL` =
     `https://lavafast.rochadalton00.workers.dev/api/contingencia/email/relay`
   - `LAVAFAST_CT_EMAIL_SECRET` = mesmo valor do segredo do Worker.
5. Execute uma vez a função `instalarLavaFastCT` e aceite as permissões
   necessárias para ler Gmail e enviar HTTPS.
6. Um gatilho verificará as mensagens a cada 5 minutos (não em tempo
   real). Apenas mensagens recebidas **a partir da instalação** entram
   automaticamente.

O script identifica o remetente `no-reply@localiza.com` e os códigos
de agência do aplicativo original: `ACSMC` (Mooca) e
`ACUCP` (Central Plaza). Agências desconhecidas **não são
importadas**, para evitar registros na loja errada.

Para parar a integração, execute `pararLavaFastCT`.

**Atenção:** este fluxo usa GmailApp/Apps Script; confira os gatilhos,
cotas de execução e autorização da conta. O usuário final deve validar
uma SL real em cada loja antes de confiar no recebimento automático.
Em caso de falha do relay, a opção de colar e-mail continua disponível.

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
