# LavaFast — conexão direta com Gmail (sem Apps Script)

## O que muda

O Worker `lavafast` lê, COM CONSENTIMENTO DO RESPONSÁVEL C&O,
a conta pessoal que já recebe cópias das solicitações da Localiza.
Não precisa mexer na caixa Gmail do dono do lava-rápido, criar filtros,
encaminhar novamente mensagens nem acessar o Supabase.

Fluxo: Gmail do administrador → Gmail API (somente leitura) →
Cloudflare Worker (a cada 5 minutos ou botão **Buscar agora**) →
Cloudflare D1 `ct_solicitacoes` → **Solicitações**.

Cada veículo cria um único card identificado pela SL; os valores da mensagem
não entram no banco operacional nem aparecem nos cards. A agência
`ACSMC` corresponde à Mooca e `ACUCP` à Central Plaza.

## Preparação Google Cloud (uma única vez)

Use o projeto Google Cloud de sua titularidade que poderá acessar
a conta Gmail `rochadalton00@gmail.com`.

1. Abra **Google Cloud Console → APIs e serviços → Biblioteca**.
2. Ative **Gmail API** para o projeto.
3. Abra **Google Auth Platform / OAuth consent screen**.
4. Configure nome do app **LavaFast Contingência** e email de suporte.
5. Se o app estiver em **Testing**, inclua
   `rochadalton00@gmail.com` em **Test users**.
6. Autorize o escopo
   `https://www.googleapis.com/auth/gmail.readonly` (somente leitura).
7. Em **Clients / Credenciais**, crie **OAuth client ID → Web application**.
8. Cadastre exatamente este URI de redirecionamento autorizado:

```
https://lavafast.rochadalton00.workers.dev/api/contingencia/gmail/callback
```

9. Copie o **Client ID** e o **Client Secret** para os campos protegidos
   do Cloudflare. **Não os envie por chat e não os coloque no GitHub.**

**ATENÇÃO:** `gmail.readonly` é um escopo restrito. Um aplicativo
externo em teste pode manter tokens de renovação válidos por apenas
**7 dias**. Para operação permanente, verifique requisitos de publicação,
verificação do OAuth e política do Google; até lá, o painel avisará caso a
autorização seja revogada e permitirá reconectar. **Não declare a
automação definitiva** enquanto isso não for validado.

## Preparação Cloudflare (uma única vez)

Cloudflare → **Workers & Pages → lavafast → Settings →
Variables and Secrets**. Cadastre:

| Variável | Tipo | Valor |
| --- | --- | --- |
| `CT_GMAIL_CLIENT_ID` | Text | Client ID do Google OAuth |
| `CT_GMAIL_CLIENT_SECRET` | Secret | Client Secret do Google OAuth |
| `CT_GMAIL_TOKEN_KEY` | Secret | Chave ALEATÓRIA de pelo menos 32 caracteres |
| `CT_GMAIL_ALLOWED_EMAIL` | Text | `rochadalton00@gmail.com` |

**Nunca** altere `CT_AUTH_PEPPER` ou `CT_BOOTSTRAP_SECRET`. A
integração usa as sessões administrativas atuais por CPF e senha.

A chave `CT_GMAIL_TOKEN_KEY` protege o refresh token via AES-GCM.
Se for alterada, será necessário reconectar o Google.

A migração `0008_gmail_oauth.sql` cria no D1 tabelas exclusivas
para autorização, estado transitório e monitoramento Gmail. O banco
não guarda emails integrais, valores financeiros, senhas de Google ou
tokens de atualização em texto simples.

## Ativação pelo celular

1. Entre no LavaFast `/contingencia` como **Admin ou C&O**.
2. Abra **✉ E-mail**.
3. No quadro **Gmail direto**, clique **Conectar meu Google**.
4. Escolha somente a sua conta Gmail autorizada; confirme o acesso
   **somente de leitura** aos e-mails.
5. Ao voltar ao LavaFast, entre novamente se necessário e abra
   **E-mail → Buscar solicitações agora**.
6. Veja o total de SLs identificadas, cards novos, cards repetidos
   e o último erro de sincronização.
7. Abra **Solicitações** para verificar os cards.
8. O Worker executará automaticamente a rotina **a cada 5 minutos**
   usando Cloudflare Cron. Eventuais atrasos de propagação de Cron
   são normais logo após publicação.

**Primeira busca:** considera solicitações do DIA OPERACIONAL atual
a partir de 06h (horário de São Paulo). Não cria como abertas SLs
antigas de ontem. As buscas seguintes usam sobreposição de 30 minutos
e deduplicação persistente no D1.

## Segurança e diagnóstico

- Rotas `/api/contingencia/gmail/*` exceto callback exigem
  sessão ativa de Admin/C&O; os métodos que modificam exigem
  origem do mesmo domínio.
- O callback é autorizado por state aleatório de 256 bits, com
  expiração curta, consumo único e verificação PKCE S256.
- O servidor valida que o Gmail autorizado é
  `rochadalton00@gmail.com`, não a conta do proprietário.
- OAuth grant guarda refresh token criptografado com chave
  externa ao D1; nenhuma credencial é enviada ao navegador após conexão.
- Botão **Desconectar** exclui o token local do D1 sem apagar os cards.
- Se a Gmail API estiver indisponível, as SLs ainda podem ser
  lançadas pela opção manual **Importar e-mail**.
- A execução automática ocorre somente com
  `ENVIRONMENT=homologacao`, banco D1 e secrets definidos.
- Os e-mails são apenas LIDOS, não marcados como lidos, excluídos
  nem encaminhados.

## Limites da solução

- O OAuth do Google deve estar configurado e autorizado uma vez.
- Gmail API e Cloudflare são serviços independentes; podem
  apresentar limites/cotas/restrições do plano.
- Publicações da aplicação exigem teste de ponta a ponta com uma SL real
  antes de substituir processos de operação essenciais.
- O Email Routing anterior pode permanecer configurado como reserva;
  ambos usam SL única e não geram duplicidade.
