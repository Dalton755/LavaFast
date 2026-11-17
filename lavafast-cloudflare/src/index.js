import { paginaOperacaoHtml, scriptOperacaoJs } from "./pilotoPage.js";

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

    // Apenas dados artificialmente inseridos em homologacao: sem acesso a registros reais.
    if (url.pathname === "/api/piloto/cards") {
      if (env.ENVIRONMENT !== "homologacao") {
        return responder({ erro: "Nao encontrado." }, 404);
      }
      if (!env.DB) {
        return responder({ erro: "D1 de homologacao nao vinculado." }, 503);
      }

      const loja = url.searchParams.get("loja") ?? "";
      const lojasValidas = ["", "HML_MOOCA", "HML_CENTRAL_PLAZA"];
      if (!lojasValidas.includes(loja)) {
        return responder({ erro: "Filtro de loja invalido para homologacao." }, 400);
      }

      try {
        const resultado = await env.DB.prepare(`
          SELECT s.id, s.numero_solicitacao, s.placa, s.status, s.valor_centavos,
                 s.recebida_em, s.iniciada_em, s.finalizada_em,
                 l.nome AS loja, l.codigo AS codigo_loja,
                 t.nome AS tipo_lavagem
            FROM op_solicitacoes_lavagem s
            JOIN op_lojas l ON l.id = s.loja_id
            LEFT JOIN op_tipos_lavagem t ON t.id = s.tipo_lavagem_id
           WHERE s.origem = 'HOMOLOGACAO'
             AND s.fornecedor = 'LAB-HOMOLOGACAO'
             AND s.id LIKE 'HML-%'
             AND (? = '' OR l.codigo = ?)
           ORDER BY s.numero_solicitacao DESC
           LIMIT 20
        `).bind(loja, loja).all();
        const cards = resultado.results ?? [];
        return responder({
          ambiente: "homologacao",
          demonstracao: true,
          total: cards.length,
          cards
        });
      } catch {
        return responder({ erro: "Consulta demonstrativa D1 indisponivel." }, 503);
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
