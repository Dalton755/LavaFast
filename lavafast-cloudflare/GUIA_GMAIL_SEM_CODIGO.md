# LavaFast — Gmail automático SEM Apps Script

**Objetivo:** criar automaticamente um card na aba Solicitações quando chegar
um email da Localiza, com dados operacionais exclusivamente no Cloudflare D1.

**Não é necessário digitar código, usar computador, instalar Google Apps Script,
nem manter o Supabase ativo.** O código do processamento já faz parte do
Worker `lavafast`. A configuração restante é via interfaces Cloudflare e Gmail.

## Fluxo

Localiza → Gmail existente → filtro de encaminhamento do Gmail →
endereço dedicado Cloudflare Email Routing → Worker `lavafast.email()` →
tabela `ct_solicitacoes` → aba Solicitações.

A integração não depende da frequência de um cron. Uma vez
encaminhado pelo Gmail, o Worker processa o email na entrada, sujeito
ao tempo de entrega dos provedores.

## 1. Endereço exclusivo no Cloudflare (sem mexer em caixa de e-mail atual)

Use somente uma **zona DNS já gerenciada na Cloudflare**. Para não
interferir nos MX da raiz, prefira um subdomínio dedicado, por exemplo:

`solicitacoes@lavagens.nethanel.com.br`

**Esse é um endereço sugerido, não criado automaticamente.** Se o domínio
`nethanel.com.br` não estiver no seu Cloudflare, use outro domínio
de sua conta.

No Cloudflare → **Compute → Email Service → Email Routing**, selecione
o domínio. Em **Settings → Subdomains**, ative o subdomínio
`lavagens`. O Cloudflare cuidará dos MX referentes **somente a esse
subdomínio**. Não modifique os MX da raiz se ela já recebe email.

Em **Routing Rules → Create routing rule**, crie o endereço
`solicitacoes@lavagens.nethanel.com.br`, com ação
**Send to a Worker**, destino **lavafast**. Se o domínio/subdomínio não
estiver habilitado para Email Routing, siga as instruções de onboarding
com cautela, pois alterar os MX existentes pode afetar o email do domínio.

## 2. Ajustar variáveis do Worker pelo painel (sem codificar)

Cloudflare → Workers & Pages → `lavafast` → Settings → Variables and Secrets.

Cadastre como **Text**:

- `CT_EMAIL_INBOUND_TO` =
  `solicitacoes@lavagens.nethanel.com.br`
- `CT_EMAIL_VERIFY_FORWARD_TO` = seu Gmail que poderá receber
  a mensagem de confirmação enviada pelo Google.

O segundo endereço precisa ser cadastrado/confirmado como
**Destination Address** no Cloudflare Email Routing, pois o Worker
encaminha somente a confirmação do Gmail para ele.

**Não altere** `CT_AUTH_PEPPER` ou `CT_BOOTSTRAP_SECRET`. A nova
solução não utiliza `CT_EMAIL_RELAY_SECRET` nem scripts.

## 3. Ativar o encaminhamento seletivo do Gmail (uma única vez)

No navegador Chrome do celular, abra
`https://mail.google.com/`, use **⋮ → Site para computador**.

Na conta que recebe os emails:

1. **Configurações → Ver todas as configurações → Encaminhamento e
   POP/IMAP → Adicionar endereço de encaminhamento**.
2. Informe o endereço dedicado
   `solicitacoes@lavagens.nethanel.com.br` e confirme.
3. O Google envia uma mensagem de confirmação para esse endereço.
   O Worker redireciona essa mensagem para o Gmail configurado
   em `CT_EMAIL_VERIFY_FORWARD_TO`. Abra o email e confirme.
4. Volte ao Gmail, recarregue as configurações. Deixe o
   **encaminhamento geral desativado** para não enviar todos os
   emails para o sistema.
5. Na busca avançada, crie um **filtro**:
   **De:** `no-reply@localiza.com`
   **Assunto:** `Solicitação de Lavagem`.
6. Na ação do filtro, marque **Encaminhar para** e escolha
   o endereço Cloudflare confirmado; salve o filtro.
7. **Mantenha uma cópia no Gmail.** O filtro deve incluir
   apenas as mensagens de solicitações, nunca a caixa inteira.

> Essa configuração de encaminhamento não é disponibilizada no aplicativo
> Gmail para Android. Utilize o navegador em modo para computador.
> Não confundir com o botão Encaminhar de uma única mensagem.

## 4. Teste real de recebimento

Entre no LavaFast → aba **✉ E-mail** (Admin ou C&O).

Verifique que `/api/contingencia/config` apresenta
`email_routing_configurado: true`. Esse indicador valida apenas
o endereço configurado no Worker, **não** o filtro do Gmail.

Quando chegar uma nova solicitação da Localiza:

- O Worker valida remetente original `no-reply@localiza.com`,
  assunto e o código da agência no conteúdo.
- `ACSMC` cria cards na loja Mooca; `ACUCP` na Central Plaza.
- Cada par número de SL/placa cria um card sem valores financeiros.
- O número da SL é único; reenvio não cria duplicidade.
- O painel permite acompanhar quantos emails/cards foram processados.
- Finalizar a lavagem continua movendo o card para Concluídos.

**Para os emails que já chegaram antes do filtro**: usar o recurso
manual **✉ E-mail → Importar** enquanto a integração não estiver
validada; o Gmail não retroencaminha automaticamente mensagens antigas.

## Pausar / voltar ao método anterior

Desative o filtro de encaminhamento no Gmail ou a routing rule no
Cloudflare. O D1 preserva cards já importados.

O arquivo `integracoes/GoogleAppsScript_LavaFast_CT.gs` continua no
GitHub apenas como opção alternativa; não é necessário para este método.

## Segurança e limitações

- Cloudflare Email Routing valida autenticação de domínio DMARC antes de
  entregar ao Worker; o código também valida o cabeçalho `From`, assunto
  e agência. Encaminhamentos feitos pelo Gmail devem preservar o
  remetente original no cabeçalho. Faça um teste antes de confiar.
- Sem edição de código no celular e sem acesso aos emails de toda a caixa;
  o Gmail encaminha somente as mensagens que casarem com o filtro.
- Emails possuem dados operacionais e podem incluir dados pessoais; use
  apenas conta e domínios autorizados pela operação.
- O endereço Cloudflare é dedicado a este fluxo; mensagens desconhecidas
  não criam cards. Confirmações do Google só são encaminhadas ao destino
  verificado configurado no Worker.
- Não ativar MX novos no domínio principal sem revisar o serviço de
  email já existente.
