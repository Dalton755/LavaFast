import { useState } from "react";
import { Check, Clock3, MapPin } from "lucide-react";
import TempoOperacao from "./TempoOperacao";

const rotulosStatus = {
    SOLICITADO: "Solicitada",
    AGUARDANDO: "Aguardando",
    EM_LAVAGEM: "Em lavagem"
};

const classesStatus = {
    SOLICITADO: "lf-badge--amber",
    AGUARDANDO: "lf-badge--amber",
    EM_LAVAGEM: "lf-badge--blue"
};

export default function LocalizaCard({ solicitacao, onConcluir }) {
    const [enviando, setEnviando] = useState(false);

    async function concluir() {
        if (enviando) return;
        setEnviando(true);
        try {
            await onConcluir(solicitacao);
        } catch {
            // O feedback continua sendo exibido pelo painel operacional.
        } finally {
            setEnviando(false);
        }
    }

    const nomeLoja = typeof solicitacao.loja === "string"
        ? solicitacao.loja
        : solicitacao.loja?.nome || solicitacao.loja?.codigo;

    return (
        <article className="lf-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="lf-card__eyebrow">Veículo • Localiza</p>
                    <h3 className="lf-plate mt-1 break-all">{solicitacao.placa}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                        {solicitacao.numero_solicitacao
                            ? `Solicitação #${solicitacao.numero_solicitacao}`
                            : "Solicitação operacional"}
                    </p>
                </div>
                <span className={`lf-badge ${classesStatus[solicitacao.status] || "lf-badge--blue"}`}>
                    {rotulosStatus[solicitacao.status] || "Em operação"}
                </span>
            </div>

            {nomeLoja && (
                <div className="mt-4 flex items-start gap-2 border-b border-slate-100 pb-4 text-xs font-medium text-slate-600">
                    <MapPin size={15} className="mt-px shrink-0 text-slate-400" />
                    <span className="break-words">{nomeLoja}</span>
                </div>
            )}

            <dl className="lf-info-grid mt-4">
                <div className="lf-info">
                    <dt className="lf-info__label">Tipo de lavagem</dt>
                    <dd className="lf-info__value">{solicitacao.tipo_lavagem || "Não informado"}</dd>
                </div>
                <div className="lf-info">
                    <dt className="lf-info__label">Responsável</dt>
                    <dd className="lf-info__value">{solicitacao.responsavel_localiza || "Não informado"}</dd>
                </div>
                {solicitacao.fornecedor && (
                    <div className="lf-info col-span-2">
                        <dt className="lf-info__label">Fornecedor</dt>
                        <dd className="lf-info__value">{solicitacao.fornecedor}</dd>
                    </div>
                )}
            </dl>

            <div className="lf-timer mt-4">
                <span className="flex items-center gap-2 text-slate-500"><Clock3 size={15} /> Aberto há</span>
                <strong className="font-semibold text-slate-800"><TempoOperacao inicio={solicitacao.recebida_em} aoVivo /></strong>
            </div>

            <button type="button" onClick={concluir} disabled={enviando} aria-busy={enviando} className="lf-action mt-4">
                <Check size={18} /> {enviando ? "Concluindo..." : "Concluir lavagem"}
            </button>
        </article>
    );
}
