import * as XLSX from "xlsx";

export const LOJAS_CONCILIACAO = {
  MOOCA: ["moca", "mooca"],
  CENTRAL_PLAZA: ["centralplaza", "central plaza"],
};

export const normalizarSL = valor => String(valor ?? "").trim().replace(/\\.0$/, "").replace(/[^0-9A-Za-z]/g, "").toUpperCase();
export const normalizarPlaca = valor => String(valor ?? "").replace(/[^0-9A-Za-z]/g, "").toUpperCase();
const normalizarTexto = valor => String(valor ?? "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-z0-9]/gi, "").toLowerCase();
export const nomeLoja = nome => Object.entries(LOJAS_CONCILIACAO).find(([, aliases]) => aliases.some(a => normalizarTexto(a) === normalizarTexto(nome)))?.[0] ?? null;

function linhasDaAba(aba) {
  const linhas = XLSX.utils.sheet_to_json(aba, { defval: "", raw: false });
  return linhas.map(linha => {
    const campo = (...nomes) => Object.entries(linha).find(([chave]) => nomes.includes(normalizarTexto(chave)))?.[1] ?? "";
    return {
      sl: normalizarSL(campo("sl", "numerosolicitacao", "solicitacao")),
      placa: normalizarPlaca(campo("placa")),
      tipoLavagem: String(campo("tipolavagem", "lavagem")).trim(),
      dataAbertura: campo("dataabertura"),
      valor: Number(String(campo("valor")).replace(/[^0-9,.-]/g, "").replace(/\\./g, "").replace(",", ".")) || 0,
    };
  }).filter(item => item.sl);
}

export async function lerPlanilhaPagamento(arquivo) {
  const buffer = await arquivo.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const resultado = {};
  for (const nome of workbook.SheetNames) {
    const loja = nomeLoja(nome);
    if (!loja) continue; // Ignorar App, Resumo e demais abas financeiras.
    if (resultado[loja]) throw new Error(`Duas abas representam a mesma loja: ${loja}`);
    resultado[loja] = linhasDaAba(workbook.Sheets[nome]);
  }
  if (!Object.keys(resultado).length) throw new Error("Nenhuma aba Mooca ou CentralPlaza encontrada.");
  return resultado;
}

export function periodoQuinzena(ano, mes, quinzena) {
  const inicio = Number(quinzena) === 1 ? 1 : 16;
  const fim = Number(quinzena) === 1 ? 15 : new Date(Number(ano), Number(mes), 0).getDate();
  const formatar = dia => `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  return { inicio: formatar(inicio), fim: formatar(fim) };
}

export function conciliarLavagens({ concluidas, pagamentos, loja, inicio, fim }) {
  const indice = new Map();
  const duplicadas = [];
  for (const pagamento of pagamentos) {
    const sl = normalizarSL(pagamento.sl);
    if (!sl) continue;
    if (indice.has(sl)) duplicadas.push(sl);
    else indice.set(sl, pagamento);
  }
  const linhas = concluidas.filter(item => {
    const data = String(item.finalizada_em ?? item.dataConclusao ?? "").slice(0, 10);
    return data >= inicio && data <= fim && nomeLoja(item.loja?.nome ?? item.loja ?? "") === loja && (item.origem ?? "LOCALIZA") === "LOCALIZA";
  }).map(item => {
    const sl = normalizarSL(item.numero_solicitacao ?? item.sl);
    const pagamento = indice.get(sl);
    const placa = normalizarPlaca(item.placa);
    const divergencia = Boolean(pagamento && placa && pagamento.placa && placa !== pagamento.placa);
    return {
      sl, placa, loja, tipoLavagem: item.tipo_lavagem ?? item.tipoLavagem ?? "",
      finalizadaEm: item.finalizada_em ?? item.dataConclusao,
      valorPagamento: pagamento?.valor ?? null,
      status: !sl ? "SEM_SL" : !pagamento ? "NAO_DISPONIBILIZADA" : divergencia ? "DIVERGENCIA" : "DISPONIVEL",
    };
  });
  return {
    linhas, duplicadas,
    resumo: {
      concluidas: linhas.length,
      disponiveis: linhas.filter(l => l.status === "DISPONIVEL").length,
      pendentes: linhas.filter(l => l.status === "NAO_DISPONIBILIZADA").length,
      divergencias: linhas.filter(l => l.status === "DIVERGENCIA").length,
      semSL: linhas.filter(l => l.status === "SEM_SL").length,
    },
  };
}
