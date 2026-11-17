// Piloto de homologacao isolado: somente registros artificiais HML.
const ACTIVE = ["SOLICITADO", "AGUARDANDO", "EM_LAVAGEM"];
const BASE = "/api/piloto/";
const LOJAS = ["", "HML_MOOCA", "HML_CENTRAL_PLAZA"];
const KEY_HEADER = "x-lavafast-demo-key";

function json(dados, status = 200) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store", "x-content-type-options": "nosniff" }
  });
}

function autorizacaoHabilitada(env) {
  return typeof env.HML_FINALIZE_SECRET === "string" && env.HML_FINALIZE_SECRET.length >= 32;
}

async function chaveValida(env, candidata) {
  if (!autorizacaoHabilitada(env) || typeof candidata !== "string" ||
      candidata.length < 32 || candidata.length > 256) return false;
  // Nao compara chave com ===. Nao registra credenciais em logs.
  const encoder = new TextEncoder();
  const [esperado, recebido] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(env.HML_FINALIZE_SECRET)),
    crypto.subtle.digest("SHA-256", encoder.encode(candidata))
  ]);
  const a = new Uint8Array(esperado), b = new Uint8Array(recebido);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function segundos(recebida, finalizada) {
  const ini = Date.parse(recebida || "");
  const fim = Date.parse(finalizada || "");
  return Number.isFinite(ini) && Number.isFinite(fim)
    ? Math.max(0, Math.floor((fim - ini) / 1000))
    : null;
}

function serializarCard(c) {
  // Whitelist: nao selecionar, serializar ou devolver valores financeiros,
  // responsaveis administrativos, emails, observacoes ou outros dados sensiveis.
  return {
    id: c.id,
    numero_solicitacao: c.numero_solicitacao,
    placa: c.placa,
    status: c.status,
    recebida_em: c.recebida_em,
    finalizada_em: c.finalizada_em,
    loja: c.loja,
    codigo_loja: c.codigo_loja,
    tipo_lavagem: c.tipo_lavagem,
    tempo_total_segundos: c.status === "FINALIZADA"
      ? segundos(c.recebida_em, c.finalizada_em) : null
  };
}

const SELECT = `
 SELECT s.id, s.numero_solicitacao, s.placa, s.status,
        s.recebida_em, s.finalizada_em,
        l.nome AS loja, l.codigo AS codigo_loja,
        t.nome AS tipo_lavagem
 FROM op_solicitacoes_lavagem s
 JOIN op_lojas l ON l.id = s.loja_id
 LEFT JOIN op_tipos_lavagem t ON t.id = s.tipo_lavagem_id
 WHERE s.origem = 'HOMOLOGACAO'
   AND s.fornecedor = 'LAB-HOMOLOGACAO'
   AND s.id LIKE 'HML-%'
`;

async function listar(env, url, modo) {
  const loja = url.searchParams.get("loja") || "";
  if (!LOJAS.includes(loja)) return json({ erro: "Loja invalida para homologacao." }, 400);
  let sql = SELECT + " AND (? = '' OR l.codigo = ?)";
  if (modo === "solicitacoes") sql += " AND s.status IN ('SOLICITADO','AGUARDANDO','EM_LAVAGEM')";
  if (modo === "concluidos") sql += " AND s.status = 'FINALIZADA'";
  sql += " ORDER BY s.recebida_em DESC LIMIT 100";
  try {
    const result = await env.DB.prepare(sql).bind(loja, loja).all();
    const cards = (result.results || []).map(serializarCard);
    return json({ ambiente: "homologacao", demonstracao: true, total: cards.length, cards });
  } catch {
    return json({ erro: "Falha na consulta demonstrativa do banco." }, 503);
  }
}

async function finalizar(request, env, id) {
  if (!autorizacaoHabilitada(env)) return json({
    erro: "Finalizacao demonstrativa bloqueada. Configure HML_FINALIZE_SECRET no Worker."
  }, 503);
  // A chave temporaria jamais concede acesso ao sistema real.
  const origem = request.headers.get("Origin");
  if (origem !== new URL(request.url).origin) {
    return json({ erro: "Origem nao autorizada." }, 403);
  }
  if (!(await chaveValida(env, request.headers.get(KEY_HEADER)))) {
    return json({ erro: "Credencial de homologacao invalida." }, 403);
  }
  if (!/^HML-CARD-[0-9]{1,8}$/.test(id)) {
    return json({ erro: "Identificador de demonstracao invalido." }, 400);
  }
  try {
    const agora = new Date().toISOString();
    // UPDATE atomico: apenas registros falsos ativos, sem dupla finalizacao.
    const resultado = await env.DB.prepare(`
      UPDATE op_solicitacoes_lavagem
         SET status = 'FINALIZADA', finalizada_em = ?, updated_at = ?
       WHERE id = ?
         AND id LIKE 'HML-%'
         AND origem = 'HOMOLOGACAO'
         AND fornecedor = 'LAB-HOMOLOGACAO'
         AND status IN ('SOLICITADO','AGUARDANDO','EM_LAVAGEM')
    `).bind(agora, agora, id).run();
    if (resultado.meta?.changes !== 1) {
      return json({ erro: "Solicitacao ja finalizada ou nao encontrada." }, 409);
    }
    const card = await env.DB.prepare(SELECT + " AND s.id = ?")
      .bind(id).first();
    if (!card) return json({ erro: "Finalizada, mas leitura do card indisponivel." }, 503);
    return json({ ambiente: "homologacao", demonstracao: true,
      mensagem: "Lavagem demonstrativa finalizada.", card: serializarCard(card) });
  } catch {
    return json({ erro: "Nao foi possivel finalizar a solicitacao demonstrativa." }, 503);
  }
}

export async function pilotoApi(request, env, url) {
  const path = url.pathname;
  const rotasLeitura = new Map([
    [BASE + "solicitacoes", "solicitacoes"],
    [BASE + "concluidos", "concluidos"],
    [BASE + "cards", "todos"] // Compatibilidade com o piloto anterior, sem valores.
  ]);
  const ehFinalizacao = /^\/api\/piloto\/finalizar\/.+/.test(path);
  const ehConfiguracao = path === BASE + "configuracao";
  if (!rotasLeitura.has(path) && !ehFinalizacao && !ehConfiguracao) return null;

  if (env.ENVIRONMENT !== "homologacao") return json({ erro: "Nao encontrado." }, 404);
  if (ehFinalizacao) {
    if (request.method !== "POST") return json({ erro: "Metodo nao permitido." }, 405);
    if (!env.DB) return json({ erro: "D1 nao configurado." }, 503);
    return finalizar(request, env, path.slice((BASE + "finalizar/").length));
  }
  if (request.method !== "GET") return json({ erro: "Metodo nao permitido." }, 405);
  if (ehConfiguracao) return json({
    ambiente: "homologacao", demonstracao: true,
    finalizacao_habilitada: autorizacaoHabilitada(env),
    financeiro_restrito: true
  });
  if (!env.DB) return json({ erro: "D1 nao configurado." }, 503);
  return listar(env, url, rotasLeitura.get(path));
}
