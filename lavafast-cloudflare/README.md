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

## Quadro visual de homologacao (leitura)

Acesse `/piloto/operacao` no Worker `lavafast` para abrir uma interface
responsiva que consulta somente os cards ficticios de `/api/piloto/cards`.
Inclui:
- Contadores por situacao e distribuicao em 4 etapas.
- Filtro por loja e pesquisa por placa/numero de solicitacao.
- Atualizacao automatica a cada 30 segundos quando a pagina esta visivel.
- Formato de moeda em reais e datas em America/Sao_Paulo.
- Tratamento de erros e mensagens explicitas de ambiente demonstrativo.

A interface **nao tem botao de movimento, edicao, exclusao ou conclusao**.
O servidor so serve a pagina quando `ENVIRONMENT=homologacao`, com CSP
que restringe scripts e conexoes a mesma origem. Uma futura interface
operacional real precisara de login, permissoes e camada de servicos segura
antes de habilitar metodos de escrita no D1.

O painel definitivo React/Vite permanece em `lavafast-web/`.
Este piloto serve apenas para validar o fluxo Worker -> D1 -> visualizacao.
