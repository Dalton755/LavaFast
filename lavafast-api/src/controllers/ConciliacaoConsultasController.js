import supabase from "../config/supabase.js";

const tabela = () => supabase.schema("operacoes").from("conciliacao_consultas");
const colunas = "id,nome,loja,data_inicial,data_final,arquivo_nome,criado_em";
const validar = body => {
  const nome = String(body?.nome ?? "").trim();
  const loja = String(body?.loja ?? "");
  const dataInicial = String(body?.dataInicial ?? "");
  const dataFinal = String(body?.dataFinal ?? "");
  if (!nome || nome.length > 120 || !["MOOCA", "CENTRAL_PLAZA"].includes(loja) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(dataInicial) || !/^\d{4}-\d{2}-\d{2}$/.test(dataFinal) || dataInicial > dataFinal ||
      !Array.isArray(body?.pagamentos) || !body?.resultado || !Array.isArray(body.resultado.linhas)) return null;
  return { nome, loja, data_inicial: dataInicial, data_final: dataFinal,
    arquivo_nome: String(body.arquivoNome ?? "").slice(0, 255), pagamentos: body.pagamentos, resultado: body.resultado };
};

export async function salvar(req, res) {
  const registro = validar(req.body);
  if (!registro) return res.status(400).json({ erro: "Dados da consulta inválidos." });
  try {
    const { data, error } = await tabela().insert({ ...registro, usuario_id: req.usuario.id }).select(colunas).single();
    if (error) throw error;
    return res.status(201).json(data);
  } catch (error) {
    console.error("[Conciliação/salvar]", error);
    return res.status(500).json({ erro: "Não foi possível salvar a consulta." });
  }
}
export async function listar(req, res) {
  try {
    const { data, error } = await tabela().select(colunas).eq("usuario_id", req.usuario.id).order("criado_em", { ascending: false }).limit(100);
    if (error) throw error;
    return res.json(data);
  } catch (error) {
    console.error("[Conciliação/listar]", error);
    return res.status(500).json({ erro: "Não foi possível listar as consultas." });
  }
}
export async function obter(req, res) {
  try {
    const { data, error } = await tabela().select("*").eq("usuario_id", req.usuario.id).eq("id", req.params.id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ erro: "Consulta não encontrada." });
    return res.json(data);
  } catch (error) {
    console.error("[Conciliação/obter]", error);
    return res.status(500).json({ erro: "Não foi possível abrir a consulta." });
  }
}
