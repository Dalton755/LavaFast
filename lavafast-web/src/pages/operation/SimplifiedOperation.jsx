import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleHelp, ClipboardList, Gauge, Search, X } from "lucide-react";
import toast from "react-hot-toast";
import MainLayout from "../../layouts/MainLayout";
import useOperacaoSimplificada from "../../hooks/useOperacaoSimplificada";
import LocalizaCard from "../../components/operation-simple/LocalizaCard";
import useLavagensParticulares from "../../hooks/useLavagensParticulares";
import ParticularCard from "../../components/operation-center/ParticularCard";
import NovaParticularModal from "../../components/operation-center/NovaParticularModal";
import NovaLocalizaModal from "../../components/operation-center/NovaLocalizaModal";
import ReabrirLavagemModal from "../../components/operation-simple/ReabrirLavagemModal";
import useFuncionarios from "../../hooks/useFuncionarios";
import useTiposLavagem from "../../hooks/useTiposLavagem";
import useLoja from "../../hooks/useLoja";
import { useLoja as useLojasSelecionadas } from "../../context/LojaContext";
import { consultarPlacaConcluida, reabrirSolicitacao } from "../../api/solicitacoes";
import { reabrirLavagemParticular } from "../../api/lavagensParticulares";

const formatarData = data => data
    ? new Date(data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : "Não informado";

export default function SimplifiedOperation({ abrirConcluidos, abrirProdutividade, usuario }) {
    const {
        localiza,
        loading: carregandoLocaliza,
        concluirLocaliza,
        criarLocalizaManual,
        recarregar: recarregarLocaliza
    } = useOperacaoSimplificada();

    const {
        lavagens,
        loading: carregandoParticulares,
        criar,
        concluir,
        recarregar: recarregarParticulares
    } = useLavagensParticulares();

    const { tipos } = useTiposLavagem();
    const { lojas } = useLoja();
    const { lojasSelecionadas } = useLojasSelecionadas();
    const { funcionarios } = useFuncionarios();

    const [modalParticular, setModalParticular] = useState(false);
    const [modalLocaliza, setModalLocaliza] = useState(false);
    const [pesquisa, setPesquisa] = useState("");
    const [operacao, setOperacao] = useState("LOCALIZA");
    const [concluidas, setConcluidas] = useState([]);
    const [buscandoConcluidas, setBuscandoConcluidas] = useState(false);
    const [falhaBusca, setFalhaBusca] = useState(false);
    const [reabrirItem, setReabrirItem] = useState(null);
    const [reabrindo, setReabrindo] = useState(false);
    const [versaoConsulta, setVersaoConsulta] = useState(0);

    const placa = pesquisa.trim();
    const idsLojas = lojasSelecionadas.join(",");

    // Filtragem dos cards em memória: resposta instantânea a cada tecla.
    const localizaFiltrada = useMemo(
        () => localiza.filter(item => (item.placa || "").toUpperCase().includes(placa)),
        [localiza, placa]
    );
    const particularesFiltradas = useMemo(
        () => lavagens.filter(item => (item.placa || "").toUpperCase().includes(placa)),
        [lavagens, placa]
    );

    useEffect(() => {
        if (placa.length < 3) {
            setConcluidas([]);
            setBuscandoConcluidas(false);
            setFalhaBusca(false);
            return;
        }

        const controller = new AbortController();
        let cancelada = false;
        setBuscandoConcluidas(true);
        setFalhaBusca(false);

        // Somente o histórico consulta a API; requisições anteriores são canceladas.
        const timer = setTimeout(async () => {
            try {
                const dados = await consultarPlacaConcluida(placa, idsLojas, controller.signal);
                if (!cancelada) setConcluidas(Array.isArray(dados) ? dados : []);
            } catch (erro) {
                if (!cancelada && erro.code !== "ERR_CANCELED") {
                    setFalhaBusca(true);
                    setConcluidas([]);
                }
            } finally {
                if (!cancelada) setBuscandoConcluidas(false);
            }
        }, 220);

        return () => {
            cancelada = true;
            clearTimeout(timer);
            controller.abort();
        };
    }, [placa, idsLojas, versaoConsulta]);

    async function tratarConclusaoLocaliza(item) {
        try {
            await concluirLocaliza(item);
            setVersaoConsulta(v => v + 1);
            toast.success("Lavagem concluída.");
        } catch (erro) {
            toast.error(erro.response?.data?.erro || "Não foi possível concluir a lavagem.");
            throw erro;
        }
    }

    async function tratarConclusaoParticular(id) {
        try {
            await concluir(id);
            setVersaoConsulta(v => v + 1);
            toast.success("Lavagem concluída.");
        } catch (erro) {
            toast.error(erro.response?.data?.erro || "Não foi possível concluir a lavagem.");
            throw erro;
        }
    }

    async function confirmarReabertura() {
        if (!reabrirItem || reabrindo) return;
        setReabrindo(true);
        try {
            if (reabrirItem.origem === "LOCALIZA") {
                await reabrirSolicitacao(reabrirItem.id);
            } else {
                await reabrirLavagemParticular(reabrirItem.id);
            }
            setConcluidas(atual => atual.filter(item =>
                !(item.id === reabrirItem.id && item.origem === reabrirItem.origem)
            ));
            setReabrirItem(null);
            await Promise.all([recarregarLocaliza(), recarregarParticulares()]);
            setVersaoConsulta(v => v + 1);
            toast.success("Lavagem devolvida à operação.");
        } catch (erro) {
            toast.error(erro.response?.data?.erro || "Não foi possível reabrir a lavagem.");
        } finally {
            setReabrindo(false);
        }
    }

    return (
        <MainLayout>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        LavaFast • Centro de controle
                    </p>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                        Operação de lavagens
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Acompanhe os serviços e localize veículos em segundos.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={abrirConcluidos}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
                        <ClipboardList size={17} /> Histórico
                    </button>
                    {usuario?.podeVerValores && (
                        <button type="button" onClick={abrirProdutividade}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
                            <Gauge size={17} /> Indicadores
                        </button>
                    )}
                </div>
            </div>

            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <label htmlFor="busca-placa" className="mb-2 block text-sm font-semibold text-slate-700">
                    Buscar veículo pela placa
                </label>
                <div className="relative">
                    <Search size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        id="busca-placa" type="search" inputMode="text" autoComplete="off" spellCheck={false}
                        placeholder="Ex.: ABC1D23"
                        value={pesquisa}
                        maxLength={7}
                        onChange={e => setPesquisa(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7))}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-12 text-base font-semibold tracking-wider text-slate-900 outline-none transition placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    />
                    {pesquisa && (
                        <button type="button" aria-label="Limpar busca" onClick={() => setPesquisa("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700">
                            <X size={17} />
                        </button>
                    )}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                    Busca imediata nas operações ativas e consulta de concluídas a partir de 3 caracteres.
                </p>
            </section>

            {placa.length >= 3 && (
                <section className="mb-6 overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm" aria-live="polite">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-emerald-50/60 px-5 py-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-emerald-900">
                            <CheckCircle2 size={18} /> Lavagens já concluídas
                        </div>
                        <span className="text-xs text-slate-500">
                            {buscandoConcluidas ? "Pesquisando..." : `${concluidas.length} encontrada(s)`}
                        </span>
                    </div>
                    {falhaBusca ? (
                        <div className="px-5 py-6 text-sm text-rose-600">
                            Não foi possível consultar o histórico. Tente novamente.
                        </div>
                    ) : buscandoConcluidas ? (
                        <div className="px-5 py-6 text-sm text-slate-500">
                            Verificando placas concluídas...
                        </div>
                    ) : concluidas.length === 0 ? (
                        <div className="flex items-center gap-2 px-5 py-6 text-sm text-slate-500">
                            <CircleHelp size={17} /> Nenhuma lavagem concluída encontrada para esta placa.
                        </div>
                    ) : (
                        <div className="grid gap-3 p-4 md:grid-cols-2">
                            {concluidas.map(item => (
                                <article key={`${item.origem}-${item.id}`}
                                    className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <strong className="text-xl tracking-wider text-slate-900">{item.placa}</strong>
                                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                                            ✓ Concluída
                                        </span>
                                    </div>
                                    <div className="mt-2 text-sm text-slate-600">
                                        <span>{item.origem === "LOCALIZA" ? "Localiza" : "Particular"}</span>
                                        {item.origem === "LOCALIZA" && item.loja && (
                                            <span> • {item.loja.nome || item.loja.codigo}</span>
                                        )}
                                    </div>
                                    <div className="mt-1 text-xs text-slate-500">
                                        Finalizada em {formatarData(item.finalizada_em)}
                                        {item.numero_solicitacao ? ` • #${item.numero_solicitacao}` : ""}
                                    </div>
                                    <button type="button" onClick={() => setReabrirItem(item)}
                                        className="mt-4 w-full rounded-xl border border-emerald-600 px-4 py-2.5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100">
                                        Voltar para operação
                                    </button>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            )}

            <div className="mb-5 grid grid-cols-2 gap-3 sm:max-w-sm">
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <span className="block text-xs font-medium text-slate-500">Localiza ativas</span>
                    <strong className="mt-1 block text-2xl font-bold text-slate-900">{localiza.length}</strong>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <span className="block text-xs font-medium text-slate-500">Particulares ativas</span>
                    <strong className="mt-1 block text-2xl font-bold text-slate-900">{lavagens.length}</strong>
                </div>
            </div>

            <div className="mb-5 flex rounded-xl border border-slate-200 bg-slate-100 p-1 lg:hidden">
                {["LOCALIZA", "PARTICULAR"].map(tipo => (
                    <button type="button" key={tipo} onClick={() => setOperacao(tipo)}
                        className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${operacao === tipo ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
                        {tipo === "LOCALIZA" ? "Localiza" : "Particular"}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <section className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${operacao !== "LOCALIZA" ? "hidden lg:block" : ""}`}>
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Localiza</h2>
                            <p className="text-xs text-slate-500">{localizaFiltrada.length} em exibição</p>
                        </div>
                        <button type="button" onClick={() => setModalLocaliza(true)}
                            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
                            + Nova lavagem
                        </button>
                    </div>
                    <div className="space-y-3">
                        {carregandoLocaliza ? (
                            <div className="py-14 text-center text-sm text-slate-400">Carregando solicitações...</div>
                        ) : localizaFiltrada.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-14 text-center text-sm text-slate-500">
                                {placa ? "Nenhuma Localiza ativa com esta placa." : "Nenhuma solicitação pendente."}
                            </div>
                        ) : (
                            localizaFiltrada.map(item => (
                                <LocalizaCard key={item.id} solicitacao={item} onConcluir={tratarConclusaoLocaliza} />
                            ))
                        )}
                    </div>
                </section>

                <section className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${operacao !== "PARTICULAR" ? "hidden lg:block" : ""}`}>
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Particulares</h2>
                            <p className="text-xs text-slate-500">{particularesFiltradas.length} em exibição</p>
                        </div>
                        <button type="button" onClick={() => setModalParticular(true)}
                            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
                            + Nova lavagem
                        </button>
                    </div>
                    <div className="space-y-3">
                        {carregandoParticulares ? (
                            <div className="py-14 text-center text-sm text-slate-400">Carregando lavagens...</div>
                        ) : particularesFiltradas.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-14 text-center text-sm text-slate-500">
                                {placa ? "Nenhuma particular ativa com esta placa." : "Nenhuma lavagem pendente."}
                            </div>
                        ) : (
                            particularesFiltradas.map(item => (
                                <ParticularCard key={item.id} lavagem={item} onConcluir={tratarConclusaoParticular} />
                            ))
                        )}
                    </div>
                </section>
            </div>

            <NovaParticularModal
                aberto={modalParticular}
                fechar={() => setModalParticular(false)}
                funcionarios={funcionarios}
                onSalvar={criar}
            />
            <NovaLocalizaModal
                aberto={modalLocaliza}
                fechar={() => setModalLocaliza(false)}
                lojas={lojas}
                tipos={tipos}
                onSalvar={criarLocalizaManual}
            />
            <ReabrirLavagemModal
                registro={reabrirItem}
                carregando={reabrindo}
                confirmar={confirmarReabertura}
                cancelar={() => setReabrirItem(null)}
            />
        </MainLayout>
    );
}
