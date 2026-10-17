import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { ArrowLeft, FileSpreadsheet, Search, Download } from "lucide-react";
import MainLayout from "../../layouts/MainLayout";
import api from "../../api/axios";
import { lerPlanilhaPagamento, conciliarLavagens, nomeLoja } from "./conciliacao";

const LABELS = { MOOCA: "Mooca", CENTRAL_PLAZA: "Central Plaza" };
const STATUS = { DISPONIVEL: "Disponível", NAO_DISPONIBILIZADA: "Não disponibilizada", DIVERGENCIA: "Divergência", SEM_SL: "Sem SL" };
const brl = valor => valor == null ? "—" : Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const hoje = new Date();

export default function ConciliacaoFinanceira({ voltar, usuario }) {
  const formatarData = data => [data.getFullYear(), String(data.getMonth()+1).padStart(2,"0"), String(data.getDate()).padStart(2,"0")].join("-");
  const [dataInicial, setDataInicial] = useState(formatarData(new Date(hoje.getFullYear(), hoje.getMonth(), 1)));
  const [dataFinal, setDataFinal] = useState(formatarData(hoje));
  const [loja, setLoja] = useState("MOOCA");
  const [importacoes, setImportacoes] = useState({});
  const [resultado, setResultado] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState("NAO_DISPONIBILIZADA");
  const [busca, setBusca] = useState("");
  const periodo = { inicio: dataInicial, fim: dataFinal };
  const periodoValido = /^\d{4}-\d{2}-\d{2}$/.test(dataInicial) && /^\d{4}-\d{2}-\d{2}$/.test(dataFinal) && dataInicial <= dataFinal;
  const chave = id => `${dataInicial}_${dataFinal}_${id}`;
  const importacao = importacoes[chave(loja)];
  const linhas = useMemo(() => (resultado?.linhas ?? []).filter(l =>
    (!filtro || l.status === filtro) && (!busca || [l.sl,l.placa,l.tipoLavagem].some(v => String(v ?? "").toUpperCase().includes(busca.toUpperCase())))
  ), [resultado, filtro, busca]);

  if (!usuario?.podeVerValores) return <MainLayout><p className="p-6 text-red-600">Acesso restrito ao financeiro.</p></MainLayout>;

  async function importar(evento) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!arquivo) return;
    setErro("");
    try {
      const dados = await lerPlanilhaPagamento(arquivo);
      const registro = {
        pagamentos: dados, arquivo: arquivo.name,
        nome: `${LABELS[loja]} · ${dataInicial.split("-").reverse().join("/")} a ${dataFinal.split("-").reverse().join("/")}`,
        importadoEm: new Date().toISOString()
      };
      setImportacoes(atual => ({ ...atual, [chave(loja)]: registro }));
      setResultado(null);
    } catch (e) { setErro(e.message || "Erro na importação."); }
  }

  async function analisar() {
    if (!importacao || !periodoValido) { setErro("Informe uma data inicial e final válidas."); return; }
    setCarregando(true);
    setErro("");
    setResultado(null);
    try {
      // Consulta protegida por perfil financeiro no backend.
      const { data: relatorio } = await api.get("/solicitacoes/conciliacao/concluidas", { params: {
        dataInicial: periodo.inicio, dataFinal: periodo.fim, origem: "LOCALIZA"
      }});
      if (!Array.isArray(relatorio?.dados)) throw new Error("O histórico não retornou uma lista válida.");
      const concluidas = relatorio.dados.filter(item => nomeLoja(item.loja?.nome ?? item.loja?.codigo ?? item.loja ?? "") === loja);
      setResultado({ ...conciliarLavagens({ concluidas, pagamentos: importacao.pagamentos, loja, ...periodo }), chave: chave(loja) });
    } catch (e) {
      setErro(e.response?.data?.erro || e.message || "Não foi possível consultar o histórico.");
    } finally { setCarregando(false); }
  }

  function exportar() {
    if (!usuario?.podeExportar || !resultado || resultado.chave !== chave(loja)) return;
    const dados = linhas.map(l => ({
      "SL": l.sl, "Placa": l.placa, "Loja": LABELS[l.loja],
      "Tipo de lavagem": l.tipoLavagem, "Conclusão": l.finalizadaEm,
      "Situação": STATUS[l.status], "Valor na planilha": l.valorPagamento ?? ""
    }));
    const livro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(livro, XLSX.utils.json_to_sheet(dados), "Conciliação");
    XLSX.writeFile(livro, `LavaFast_Conciliacao_${chave(loja)}.xlsx`);
  }

  return <MainLayout><div className="mx-auto max-w-7xl space-y-5 pb-12">
    <div className="flex items-center gap-3"><button type="button" onClick={voltar} className="rounded-xl border bg-white p-3" aria-label="Voltar"><ArrowLeft size={20}/></button>
      <div><h1 className="text-2xl font-bold text-slate-900">Conciliação financeira</h1><p className="text-sm text-slate-500">Localiza · lavagens concluídas x disponibilizadas para pagamento · versão 17/10-B</p></div></div>
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm font-semibold">Loja<select className="mt-2 w-full rounded-xl border p-3" value={loja} onChange={e=>{setLoja(e.target.value);setResultado(null)}}>{Object.entries(LABELS).map(([id,nome])=><option key={id} value={id}>{nome}</option>)}</select></label>
        <label className="text-sm font-semibold">Data inicial<input className="mt-2 w-full rounded-xl border p-3" type="date" value={dataInicial} max={dataFinal} onChange={e=>{setDataInicial(e.target.value);setResultado(null)}}/></label>
        <label className="text-sm font-semibold">Data final<input className="mt-2 w-full rounded-xl border p-3" type="date" value={dataFinal} min={dataInicial} onChange={e=>{setDataFinal(e.target.value);setResultado(null)}}/></label>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white"><FileSpreadsheet size={18}/> Importar Excel<input type="file" accept=".xlsx,.xls" className="hidden" onChange={importar}/></label>
        <button type="button" disabled={!importacao || !periodoValido || carregando} onClick={analisar} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-40">{carregando?"Consultando histórico...":"Cruzar com LavaFast"}</button>
        <span className="text-sm text-slate-500">{importacao ? `${importacao.nome} · ${importacao.pagamentos.length} SLs · ${importacao.arquivo}` : "Nenhuma planilha importada para esta loja e período."}</span>
      </div>
      <p className="mt-3 text-xs text-amber-700">A loja selecionada acima define a qual unidade a planilha pertence. Importações permanecem apenas nesta sessão até a integração de armazenamento seguro. Não são salvas no servidor.</p>
      {erro && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</p>}
    </section>
    {resultado && resultado.chave === chave(loja) && <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Object.entries({Concluídas:resultado.resumo.concluidas,Disponíveis:resultado.resumo.disponiveis,Pendentes:resultado.resumo.pendentes,Divergências:resultado.resumo.divergencias}).map(([titulo,valor])=><div key={titulo} className="rounded-2xl border bg-white p-5"><p className="text-sm text-slate-500">{titulo}</p><strong className="text-3xl text-slate-900">{valor}</strong></div>)}</div>
      {resultado.duplicadas.length>0 && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">SLs duplicadas na planilha: {resultado.duplicadas.join(", ")}</p>}
      <div className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-center gap-3"><label className="text-sm">Situação<select className="ml-2 rounded-lg border p-2" value={filtro} onChange={e=>setFiltro(e.target.value)}><option value="">Todas</option>{Object.entries(STATUS).map(([id,nome])=><option key={id} value={id}>{nome}</option>)}</select></label>
          <div className="flex items-center gap-2 rounded-lg border px-3"><Search size={16}/><input aria-label="Buscar SL ou placa" className="p-2 outline-none" placeholder="SL, placa ou tipo" value={busca} onChange={e=>setBusca(e.target.value)}/></div>
          {usuario?.podeExportar && <button onClick={exportar} className="ml-auto inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white"><Download size={17}/> Exportar Excel</button>}
        </div>
        <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr>{["SL","Placa","Loja","Lavagem","Conclusão","Situação","Valor planilha"].map(x=><th key={x} className="p-3">{x}</th>)}</tr></thead><tbody>{linhas.map((l,i)=><tr key={`${l.sl}-${i}`} className="border-t"><td className="p-3 font-semibold">{l.sl||"—"}</td><td className="p-3">{l.placa}</td><td className="p-3">{LABELS[l.loja]}</td><td className="p-3">{l.tipoLavagem}</td><td className="p-3">{l.finalizadaEm ? new Date(l.finalizadaEm).toLocaleDateString("pt-BR") : "—"}</td><td className="p-3">{STATUS[l.status]}</td><td className="p-3">{brl(l.valorPagamento)}</td></tr>)}</tbody></table>{!linhas.length&&<p className="p-6 text-center text-slate-500">Nenhum registro para o filtro.</p>}</div>
      </div>
    </section>}
  </div></MainLayout>;
}
