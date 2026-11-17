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
