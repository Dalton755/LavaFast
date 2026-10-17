import { Router } from "express";
import { randomUUID } from "node:crypto";
import supabase from "../config/supabase.js";
import { autenticar, autorizarFuncionario, autorizarFinanceiro } from "../middleware/authMiddleware.js";

const router = Router();
const BUCKET = "lavafast-conciliacoes";
const TABELA = () => supabase.schema("financeiro").from("conciliacoes_salvas");
const EXCEL = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
};
const MAX_ARQUIVO = 8 * 1024 * 1024;
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

router.use(autenticar, autorizarFuncionario, autorizarFinanceiro);

function periodoValido(inicio, fim) {
  if (!DATA.test(inicio || "") || !DATA.test(fim || "") || inicio > fim) return false;
  const valida = valor => !Number.isNaN(Date.parse(valor)) && new Date(valor + "T00:00:00Z").toISOString().slice(0, 10) === valor;
  return valida(inicio) && valida(fim);
}

function registroParaLista(registro) {
  return {
    id: registro.id,
    nome_consulta: registro.nome_consulta,
    usuario_nome: registro.usuario_nome,
    usuario_email: registro.usuario_email,
    loja: registro.loja,
    data_inicial: registro.data_inicial,
    data_final: registro.data_final,
    consultado_em: registro.consultado_em,
    arquivo_nome: registro.arquivo_nome,
    resumo: registro.resultado?.resumo || {},
  };
}

async function buscarConsulta(id, usuarioId) {
  if (!UUID.test(id)) return null;
  const { data, error } = await TABELA().select("*").eq("id", id).eq("usuario_auth_id", usuarioId).maybeSingle();
  if (error) throw error;
  return data;
}

function tratarErro(res, erro, contexto) {
  console.error("[Conciliacoes] " + contexto, erro);
  return res.status(500).json({ erro: "Não foi possível " + contexto + ". Tente novamente." });
}

router.get("/", async (req, res) => {
  try {
    const { data, error } = await TABELA()
      .select("id,nome_consulta,usuario_nome,usuario_email,loja,data_inicial,data_final,consultado_em,arquivo_nome,resultado")
      .eq("usuario_auth_id", req.usuario.id)
      .order("consultado_em", { ascending: false })
      .limit(100);
    if (error) throw error;
    return res.json({ dados: (data || []).map(registroParaLista) });
  } catch (erro) {
    return tratarErro(res, erro, "listar as consultas salvas");
  }
});

router.post("/", async (req, res) => {
  const { nome, loja, dataInicial, dataFinal, arquivoNome, arquivoBase64, pagamentos, resultado } = req.body || {};
  const titulo = typeof nome === "string" ? nome.trim() : "";
  const nomeArquivo = typeof arquivoNome === "string" ? arquivoNome.trim() : "";
  const extensao = nomeArquivo.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  if (titulo.length < 2 || titulo.length > 120 ||
      !["MOOCA", "CENTRAL_PLAZA"].includes(loja) ||
      !periodoValido(dataInicial, dataFinal) ||
      nomeArquivo.length > 180 || !EXCEL[extensao] ||
      !Array.isArray(pagamentos) || pagamentos.length > 20000 ||
      !resultado || !Array.isArray(resultado.linhas) || resultado.linhas.length > 20000 ||
      !Array.isArray(resultado.duplicadas) || !resultado.resumo ||
      typeof arquivoBase64 !== "string") {
    return res.status(400).json({ erro: "Dados da consulta ou planilha inválidos." });
  }

  if (arquivoBase64.length > Math.ceil(MAX_ARQUIVO / 3) * 4 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(arquivoBase64)) {
    return res.status(413).json({ erro: "Arquivo Excel inválido ou maior que 8 MB." });
  }
  const arquivo = Buffer.from(arquivoBase64, "base64");
  if (!arquivo.length || arquivo.length > MAX_ARQUIVO || Buffer.byteLength(JSON.stringify({ pagamentos, resultado })) > 6 * 1024 * 1024) {
    return res.status(413).json({ erro: "A planilha ou a consulta excede o limite permitido." });
  }
  const formatoValido = extensao === "xlsx"
    ? arquivo.subarray(0, 2).toString("hex") === "504b"
    : arquivo.subarray(0, 4).toString("hex") === "d0cf11e0";
  if (!formatoValido) return res.status(400).json({ erro: "Formato Excel não reconhecido." });

  const id = randomUUID();
  const caminho = req.usuario.id + "/" + id + "/planilha." + extensao;
  try {
    const { error: erroUpload } = await supabase.storage.from(BUCKET).upload(caminho, arquivo, {
      contentType: EXCEL[extensao],
      cacheControl: "private, no-store",
      upsert: false,
    });
    if (erroUpload) throw erroUpload;

    const { data, error } = await TABELA().insert({
      id,
      usuario_auth_id: req.usuario.id,
      usuario_nome: req.funcionario.nome,
      usuario_email: req.usuario.email,
      nome_consulta: titulo,
      loja,
      data_inicial: dataInicial,
      data_final: dataFinal,
      arquivo_nome: nomeArquivo,
      arquivo_path: caminho,
      pagamentos,
      resultado: { linhas: resultado.linhas, duplicadas: resultado.duplicadas, resumo: resultado.resumo },
    }).select("*").single();

    if (error) {
      await supabase.storage.from(BUCKET).remove([caminho]);
      throw error;
    }
    return res.status(201).json({ consulta: registroParaLista(data) });
  } catch (erro) {
    return tratarErro(res, erro, "salvar a consulta");
  }
});

router.get("/:id/arquivo", async (req, res) => {
  try {
    const consulta = await buscarConsulta(req.params.id, req.usuario.id);
    if (!consulta) return res.status(404).json({ erro: "Consulta não encontrada." });
    const { data, error } = await supabase.storage.from(BUCKET).download(consulta.arquivo_path);
    if (error) throw error;
    const bytes = Buffer.from(await data.arrayBuffer());
    res.set({
      "Content-Type": EXCEL[consulta.arquivo_nome.split(".").pop().toLowerCase()] || "application/octet-stream",
      "Content-Disposition": "attachment; filename*=UTF-8''" + encodeURIComponent(consulta.arquivo_nome),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    });
    return res.send(bytes);
  } catch (erro) {
    return tratarErro(res, erro, "baixar a planilha");
  }
});

router.get("/:id", async (req, res) => {
  try {
    const consulta = await buscarConsulta(req.params.id, req.usuario.id);
    if (!consulta) return res.status(404).json({ erro: "Consulta não encontrada." });
    const { usuario_auth_id: _usuarioAuthId, arquivo_path: _arquivoPath, ...dados } = consulta;
    return res.json({ consulta: dados });
  } catch (erro) {
    return tratarErro(res, erro, "abrir a consulta");
  }
});

export default router;
