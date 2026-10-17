import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { ArrowLeft, FileSpreadsheet, Search, Download, BookmarkPlus, FolderOpen, Save, X } from "lucide-react";
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
  const [consultasSalvas, setConsultasSalvas] = useState([]);
  const [carregandoSalvas, setCarregandoSalvas] = useState(false);
  const [abrindoSalva, setAbrindoSalva] = useState(null);
  const [consultaSalva, setConsultaSalva] = useState(null);
  const [etapaSalvar, setEtapaSalvar] = useState(null);
  const [nomeSalvar, setNomeSalvar] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const periodo = { inicio: dataInicial, fim: dataFinal };
  const periodoValido = /^\d{4}-\d{2}-\d{2}$/.test(dataInicial) && /^\d{4}-\d{2}-\d{2}$/.test(dataFinal) && dataInicial <= dataFinal;
  const chave = id => `${dataInicial}_${dataFinal}_${id}`;
  const importacao = importacoes[chave(loja)];
  const linhas = useMemo(() => (resultado?.linhas ?? []).filter(l =>
    (!filtro || l.status === filtro) && (!busca || [l.sl,l.placa,l.tipoLavagem].some(v => String(v ?? "").toUpperCase().includes(busca.toUpperCase())))
  ), [resultado, filtro, busca]);

  useEffect(() => {
    if (!usuario?.podeVerValores) return;
    let ativo = true;
    setCarregandoSalvas(true);
    api.get("/conciliacoes").then(({ data }) => {
      if (ativo) setConsultasSalvas(data.dados ?? []);
    }).catch(erroConsulta => {
      if (ativo) setErro(erroConsulta.response?.data?.erro || "Não foi possível carregar as consultas salvas.");
    }).finally(() => {
      if (ativo) setCarregandoSalvas(false);
    });
    return () => { ativo = false; };
  }, [usuario?.podeVerValores]);

  if (!usuario?.podeVerValores) return <MainLayout><p className="p-6 text-red-600">Acesso restrito ao financeiro.</p></MainLayout>;

  async function importar(evento) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!arquivo) return;
    setErro("");
    try {
      const dados = await lerPlanilhaPagamento(arquivo);
      const registro = {
        pagamentos: dados, arquivo: arquivo.name, arquivoOriginal: arquivo, salvaId: null,
        nome: `${LABELS[loja]} · ${dataInicial.split("-").reverse().join("/")} a ${dataFinal.split("-").reverse().join("/")}`,
        importadoEm: new Date().toISOString()
      };
      setImportacoes(atual => ({ ...atual, [chave(loja)]: registro }));
      setResultado(null);
      setConsultaSalva(null);
      setEtapaSalvar(null);
      setMensagem("");
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
      setConsultaSalva(null);
      setEtapaSalvar("PERGUNTAR");
      setNomeSalvar("");
      setMensagem("");
    } catch (e) {
      setErro(e.response?.data?.erro || e.message || "Não foi possível consultar o histórico.");
    } finally { setCarregando(false); }
  }


  async function atualizarConsultasSalvas() {
    const { data } = await api.get("/conciliacoes");
    setConsultasSalvas(data.dados ?? []);
  }

  async function abrirConsultaSalva(id) {
    setAbrindoSalva(id);
    setErro("");
    setMensagem("");
    try {
      const { data } = await api.get("/conciliacoes/" + encodeURIComponent(id));
      const item = data.consulta;
      const key = item.data_inicial + "_" + item.data_final + "_" + item.loja;
      setDataInicial(item.data_inicial);
      setDataFinal(item.data_final);
      setLoja(item.loja);
      setImportacoes(atual => ({ ...atual, [key]: {
        pagamentos: item.pagamentos,
        arquivo: item.arquivo_nome,
        nome: item.nome_consulta,
        importadoEm: item.consultado_em,
        arquivoOriginal: null,
        salvaId: item.id,
      }}));
      setResultado({ ...item.resultado, chave: key });
      setConsultaSalva(item);
      setFiltro("");
      setBusca("");
      setEtapaSalvar(null);
    } catch (e) {
      setErro(e.response?.data?.erro || "Não foi possível abrir a consulta salva.");
    } finally {
      setAbrindoSalva(null);
    }
  }

  async function baixarPlanilhaSalva(item) {
    setErro("");
    try {
      const { data } = await api.get("/conciliacoes/" + encodeURIComponent(item.id) + "/arquivo", { responseType: "blob" });
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = item.arquivo_nome;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch (e) {
      setErro(e.response?.data?.erro || "Não foi possível baixar a planilha.");
    }
  }

  async function salvarConsulta(evento) {
    evento.preventDefault();
    const nome = nomeSalvar.trim();
    if (nome.length < 2 || nome.length > 120) {
      setErro("Informe um nome entre 2 e 120 caracteres para esta consulta.");
      return;
    }
    if (!resultado || resultado.chave !== chave(loja) || !importacao) return;
    setSalvando(true);
    setErro("");
    try {
      let buffer;
      if (importacao.arquivoOriginal) {
        buffer = await importacao.arquivoOriginal.arrayBuffer();
      } else if (importacao.salvaId) {
        const resposta = await api.get("/conciliacoes/" + encodeURIComponent(importacao.salvaId) + "/arquivo", { responseType: "arraybuffer" });
        buffer = resposta.data;
      } else {
        throw new Error("Arquivo original indisponível. Importe novamente a planilha.");
      }
      const bytes = new Uint8Array(buffer);
      if (bytes.length > 8 * 1024 * 1024) throw new Error("A planilha excede o limite de 8 MB para salvar.");
      let binario = "";
      for (let i = 0; i < bytes.length; i += 16384) {
        binario += String.fromCharCode(...bytes.subarray(i, i + 16384));
      }
      const { data } = await api.post("/conciliacoes", {
        nome,
        loja,
        dataInicial,
        dataFinal,
        arquivoNome: importacao.arquivo,
        arquivoBase64: btoa(binario),
        pagamentos: importacao.pagamentos,
        resultado: { linhas: resultado.linhas, duplicadas: resultado.duplicadas, resumo: resultado.resumo },
      });
      setConsultaSalva(data.consulta);
      setEtapaSalvar(null);
      setMensagem("Consulta salva com sucesso. Você poderá reabri-la no histórico.");
      await atualizarConsultasSalvas();
    } catch (e) {
      setErro(e.response?.data?.erro || e.message || "Falha ao salvar a consulta.");
    } finally {
      setSalvando(false);
    }
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
      <p className="mt-3 text-xs text-amber-700">A loja selecionada acima define a qual unidade a planilha pertence. Após cruzar os dados, escolha se deseja salvar a consulta e sua planilha original em armazenamento privado.</p>
      {erro && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</p>}
      {mensagem && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{mensagem}</p>}
    </section>
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2"><FolderOpen size={20} className="text-blue-600"/><h2 className="text-lg font-bold text-slate-900">Consultas salvas</h2><span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{consultasSalvas.length}</span></div>
        <span className="text-xs text-slate-500">Seu histórico financeiro, disponível em outros dispositivos.</span>
      </div>
      {carregandoSalvas ? <p className="text-sm text-slate-500">Carregando histórico...</p> :
        !consultasSalvas.length ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Nenhuma consulta salva por você.</p> :
        <div className="grid gap-3 md:grid-cols-2">
          {consultasSalvas.map(item => <div key={item.id} className="rounded-xl border p-4">
            <p className="font-semibold text-slate-900">{item.nome_consulta}</p>
            <p className="mt-1 text-xs text-slate-600">{LABELS[item.loja] || item.loja} · {item.data_inicial.split("-").reverse().join("/")} a {item.data_final.split("-").reverse().join("/")}</p>
            <p className="mt-1 text-xs text-slate-500">Por {item.usuario_nome} · Consulta: {new Date(item.consultado_em).toLocaleString("pt-BR")}</p>
            <p className="mt-1 truncate text-xs text-slate-500" title={item.arquivo_nome}>{item.arquivo_nome}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" disabled={Boolean(abrindoSalva)} onClick={() => abrirConsultaSalva(item.id)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{abrindoSalva === item.id ? "Abrindo..." : "Abrir consulta"}</button>
              <button type="button" onClick={() => baixarPlanilhaSalva(item)} className="rounded-lg border px-3 py-2 text-xs font-semibold text-slate-700">Baixar planilha</button>
            </div>
          </div>)}
        </div>}
    </section>
    {resultado && resultado.chave === chave(loja) && <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Object.entries({Concluídas:resultado.resumo.concluidas,Disponíveis:resultado.resumo.disponiveis,Pendentes:resultado.resumo.pendentes,Divergências:resultado.resumo.divergencias}).map(([titulo,valor])=><div key={titulo} className="rounded-2xl border bg-white p-5"><p className="text-sm text-slate-500">{titulo}</p><strong className="text-3xl text-slate-900">{valor}</strong></div>)}</div>
      {consultaSalva && <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <span>Consulta salva: <strong>{consultaSalva.nome_consulta}</strong> · {new Date(consultaSalva.consultado_em).toLocaleString("pt-BR")} (resultado da data original).</span>
        <button type="button" disabled={carregando} onClick={analisar} className="rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white disabled:opacity-50">Reconsultar dados atuais</button>
      </div>}
      {resultado.duplicadas.length>0 && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">SLs duplicadas na planilha: {resultado.duplicadas.join(", ")}</p>}
      <div className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-center gap-3"><label className="text-sm">Situação<select className="ml-2 rounded-lg border p-2" value={filtro} onChange={e=>setFiltro(e.target.value)}><option value="">Todas</option>{Object.entries(STATUS).map(([id,nome])=><option key={id} value={id}>{nome}</option>)}</select></label>
          <div className="flex items-center gap-2 rounded-lg border px-3"><Search size={16}/><input aria-label="Buscar SL ou placa" className="p-2 outline-none" placeholder="SL, placa ou tipo" value={busca} onChange={e=>setBusca(e.target.value)}/></div>
          {!consultaSalva && !etapaSalvar && <button type="button" onClick={() => { setEtapaSalvar("NOME"); setNomeSalvar(""); }} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700"><BookmarkPlus size={17}/> Salvar consulta</button>}
          {usuario?.podeExportar && <button onClick={exportar} className="ml-auto inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white"><Download size={17}/> Exportar Excel</button>}
        </div>
        <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr>{["SL","Placa","Loja","Lavagem","Conclusão","Situação","Valor planilha"].map(x=><th key={x} className="p-3">{x}</th>)}</tr></thead><tbody>{linhas.map((l,i)=><tr key={`${l.sl}-${i}`} className="border-t"><td className="p-3 font-semibold">{l.sl||"—"}</td><td className="p-3">{l.placa}</td><td className="p-3">{LABELS[l.loja]}</td><td className="p-3">{l.tipoLavagem}</td><td className="p-3">{l.finalizadaEm ? new Date(l.finalizadaEm).toLocaleDateString("pt-BR") : "—"}</td><td className="p-3">{STATUS[l.status]}</td><td className="p-3">{brl(l.valorPagamento)}</td></tr>)}</tbody></table>{!linhas.length&&<p className="p-6 text-center text-slate-500">Nenhum registro para o filtro.</p>}</div>
      </div>
    </section>}
    {etapaSalvar && resultado && resultado.chave === chave(loja) && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="presentation">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="titulo-salvar-consulta">
        <div className="flex items-start justify-between gap-3"><h2 id="titulo-salvar-consulta" className="text-xl font-bold text-slate-900">{etapaSalvar === "PERGUNTAR" ? "Deseja salvar esta consulta?" : "Nomear consulta"}</h2>
          <button type="button" onClick={() => setEtapaSalvar(null)} disabled={salvando} aria-label="Fechar" className="rounded-lg p-1 text-slate-500"><X size={20}/></button>
        </div>
        {erro && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</p>}
        {etapaSalvar === "PERGUNTAR" ?
          <><p className="mt-3 text-sm text-slate-600">Salve a planilha original e o resultado do cruzamento para consultar depois, sem precisar importar novamente.</p>
            <p className="mt-2 text-sm text-slate-500">{LABELS[loja]} · {dataInicial.split("-").reverse().join("/")} a {dataFinal.split("-").reverse().join("/")}</p>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setEtapaSalvar(null)} className="rounded-xl border px-4 py-2.5 text-sm font-semibold">Não salvar</button>
              <button type="button" onClick={() => { setNomeSalvar(""); setEtapaSalvar("NOME"); }} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Sim, salvar</button></div>
          </> :
          <form onSubmit={salvarConsulta} className="mt-4 space-y-4">
            <label className="block text-sm font-semibold text-slate-700">Nome da consulta
              <input autoFocus required minLength={2} maxLength={120} value={nomeSalvar} onChange={e => setNomeSalvar(e.target.value)} placeholder="Ex.: Fechamento outubro - Mooca" className="mt-2 w-full rounded-xl border p-3 font-normal outline-blue-500"/>
            </label>
            <p className="text-xs text-slate-500">Serão registrados automaticamente usuário, loja, datas inicial e final, data da consulta e arquivo original.</p>
            <div className="flex justify-end gap-3"><button type="button" disabled={salvando} onClick={() => setEtapaSalvar(null)} className="rounded-xl border px-4 py-2.5 text-sm font-semibold">Cancelar</button>
              <button type="submit" disabled={salvando || nomeSalvar.trim().length < 2} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Save size={17}/>{salvando ? "Salvando..." : "Salvar consulta"}</button></div>
          </form>}
      </div>
    </div>}
  </div></MainLayout>;
}
