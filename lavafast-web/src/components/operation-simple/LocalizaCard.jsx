import { useState } from "react";
import { Check, Clock3, MapPin } from "lucide-react";
import TempoOperacao from "./TempoOperacao";

const rotulosStatus = {
    SOLICITADO: "Solicitada",
    AGUARDANDO: "Aguardando",
    EM_LAVAGEM: "Em lavagem"
};

export default function LocalizaCard({ solicitacao, onConcluir }) {
    const [enviando, setEnviando] = useState(false);

    async function concluir() {
        if (enviando) return;
        setEnviando(true);
        try {
            await onConcluir(solicitacao);
        } catch {
            // O feedback é exibido pelo painel; o card permanece disponível.
        } finally {
            setEnviando(false);
        }
    }

    return (
        <article className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="text-2xl font-extrabold tracking-wider text-slate-900">{solicitacao.placa}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                        {solicitacao.numero_solicitacao ? `Solicitação #${solicitacao.numero_solicitacao}` : "Lavagem Localiza"}
                    </p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    {rotulosStatus[solicitacao.status] || "Em operação"}
                </span>
            </div>

            <div className="mt-4 space-y-2 text-sm text-slate-600">
                {solicitacao.loja && (
                    <div className="flex items-center gap-2">
                        <MapPin size={15} className="shrink-0 text-slate-400" />
                        {typeof solicitacao.loja === "string" ? solicitacao.loja : solicitacao.loja.nome || solicitacao.loja.codigo}
                    </div>
                )}
                <div className="flex flex-wrap gap-x-2">
                    <span className="font-medium text-slate-500">Tipo:</span>
                    <span className="font-semibold text-slate-800">{solicitacao.tipo_lavagem || "Não informado"}</span>
                </div>
                <div className="flex flex-wrap gap-x-2">
                    <span className="font-medium text-slate-500">Fornecedor:</span>
                    <span className="text-slate-700">{solicitacao.fornecedor || "Não informado"}</span>
                </div>
                <div className="flex flex-wrap gap-x-2">
                    <span className="font-medium text-slate-500">Responsável:</span>
                    <span className="text-slate-700">{solicitacao.responsavel_localiza || "Não informado"}</span>
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5 text-sm">
                <span className="flex items-center gap-1.5 text-slate-500"><Clock3 size={15} /> Aberto há</span>
                <strong className="text-slate-800">
                    <TempoOperacao inicio={solicitacao.recebida_em} aoVivo />
                </strong>
            </div>

            <button type="button" onClick={concluir} disabled={enviando}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60">
                <Check size={18} /> {enviando ? "Concluindo..." : "Concluir lavagem"}
            </button>
        </article>
    );
}
