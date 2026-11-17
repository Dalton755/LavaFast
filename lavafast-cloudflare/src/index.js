import { paginaOperacaoHtml, scriptOperacaoJs } from "./pilotoPage.js";
import { pilotoApi } from "./pilotoApi.js";
import { seguroApi } from "./seguroApi.js";
import { paginaSeguraHtml, scriptSeguroJs } from "./pilotoSeguroPage.js";

// Piloto isolado. Nunca faz consultas ao Supabase nem recebe eventos de producao.
const responder = (conteudo, status = 200) => new Response(JSON.stringify(conteudo), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  }
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Nova camada autenticada: ID token Google verificado e perfis no D1.
    const respostaAutenticada = await seguroApi(request, env, url);
    if (respostaAutenticada) return respostaAutenticada;

    if (url.pathname === "/piloto/seguro") {
      if (request.method !== "GET") return responder({ erro: "Metodo nao permitido." }, 405);
      if (env.ENVIRONMENT !== "homologacao") return responder({ erro: "Nao encontrado." }, 404);
      return new Response(paginaSeguraHtml, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
          "x-frame-options": "DENY",
          "referrer-policy": "no-referrer",
          "content-security-policy": "default-src 'none'; script-src 'self' https://accounts.google.com/gsi/client; style-src 'self' 'unsafe-inline' https://accounts.google.com; connect-src 'self' https://accounts.google.com; frame-src https://accounts.google.com; img-src 'self' data: https://*.googleusercontent.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
        }
      });
    }
    if (url.pathname === "/piloto/seguro.js") {
      if (request.method !== "GET") return responder({ erro: "Metodo nao permitido." }, 405);
      if (env.ENVIRONMENT !== "homologacao") return responder({ erro: "Nao encontrado." }, 404);
      return new Response(scriptSeguroJs, {
        headers: { "content-type":"text/javascript; charset=utf-8",
          "cache-control":"no-store", "x-content-type-options":"nosniff" }
      });
    }

    // Rotas de demonstracao: acesso sem dados financeiros e escrita condicionada a segredo.
    const respostaDemo = await pilotoApi(request, env, url);
    if (respostaDemo) return respostaDemo;

    if (request.method !== "GET") {
      return responder({ erro: "Metodo nao permitido." }, 405);
    }

    // Demonstracao visual isolada: nao ha alteracao de dados nem integracao externa.
    if (url.pathname === "/piloto" || url.pathname === "/piloto/operacao") {
      if (env.ENVIRONMENT !== "homologacao") return responder({ erro: "Nao encontrado." }, 404);
      return new Response(paginaOperacaoHtml, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
          "x-frame-options": "DENY",
          "referrer-policy": "no-referrer",
          "content-security-policy": "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
        }
      });
    }

    if (url.pathname === "/piloto/operacao.js") {
      if (env.ENVIRONMENT !== "homologacao") return responder({ erro: "Nao encontrado." }, 404);
      return new Response(scriptOperacaoJs, {
        status: 200,
        headers: {
          "content-type": "text/javascript; charset=utf-8",
          "cache-control": "no-store",
          "x-content-type-options": "nosniff"
        }
      });
    }

    if (url.pathname === "/api/health") {
      let banco = "nao_configurado";
      if (env.DB) {
        try {
          await env.DB.prepare("SELECT 1 AS ok").first();
          banco = "ok";
        } catch {
          banco = "indisponivel";
        }
      }

      return responder({
        sistema: "LavaFast Cloudflare",
        ambiente: "homologacao",
        status: banco === "ok" ? "ONLINE" : "AGUARDANDO_BANCO",
        banco
      }, banco === "indisponivel" ? 503 : 200);
    }

    if (url.pathname === "/api/piloto/estrutura") {
      if (!env.DB) {
        return responder({ erro: "D1 de homologacao nao vinculado." }, 503);
      }
      const esperadas = [
        "op_lojas", "op_tipos_lavagem", "op_solicitacoes_lavagem",
        "op_solicitacoes_funcionarios", "op_lavagens_avulsas",
        "op_importacoes_email", "op_gmail_sync_state", "op_conciliacao_consultas"
      ];
      try {
        const resultado = await env.DB.prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'op_%'"
        ).all();
        const presentes = new Set((resultado.results ?? []).map(item => item.name));
        const pendentes = esperadas.filter(nome => !presentes.has(nome));
        return responder({
          ambiente: "homologacao",
          tabelas_esperadas: esperadas.length,
          tabelas_criadas: esperadas.length - pendentes.length,
          estrutura_pronta: pendentes.length === 0,
          tabelas_pendentes: pendentes
        });
      } catch {
        return responder({ erro: "Nao foi possivel verificar a estrutura D1." }, 503);
      }
    }

    if (url.pathname === "/api/piloto/lojas") {
      if (!env.DB) {
        return responder({ erro: "D1 de homologacao nao vinculado." }, 503);
      }
      try {
        const resultado = await env.DB.prepare(
          "SELECT id, codigo, nome, ativa FROM piloto_lojas ORDER BY nome"
        ).all();
        return responder({
          ambiente: "homologacao",
          demonstracao: true,
          lojas: resultado.results ?? []
        });
      } catch {
        return responder({ erro: "Banco D1 de homologacao ainda nao preparado." }, 503);
      }
    }

    return responder({ erro: "Rota nao encontrada." }, 404);
  }
};
