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
