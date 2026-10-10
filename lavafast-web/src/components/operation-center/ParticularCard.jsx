import { useState } from "react";
import { Check } from "lucide-react";

const moeda = valor => Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency", currency: "BRL"
});

export default function ParticularCard({ lavagem, onConcluir }) {
    const [enviando, setEnviando] = useState(false);

    async function concluir() {
        if (enviando) return;
        setEnviando(true);
        try {
            await onConcluir(lavagem.id);
        } catch {
            // O painel mantém o erro visível e preserva o card para nova tentativa.
        } finally {
            setEnviando(false);
        }
    }

    const tipoLavagem = lavagem.tipo_lavagem || lavagem.tipo_lavagem_nome || lavagem.tipo?.nome || "Não informado";
    const responsavel = lavagem.responsavel || lavagem.lavador || "Não informado";

    return (
        <article className="lf-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="lf-card__eyebrow">Veículo • Particular</p>
                    <h3 className="lf-plate mt-1 break-all">{lavagem.placa}</h3>
                </div>
                <span className="lf-badge lf-badge--blue">Em lavagem</span>
            </div>

            <dl className="lf-info-grid mt-5 border-t border-slate-100 pt-4">
                <div className="lf-info">
                    <dt className="lf-info__label">Tipo de lavagem</dt>
                    <dd className="lf-info__value">{tipoLavagem}</dd>
                </div>
                <div className="lf-info">
                    <dt className="lf-info__label">Responsável</dt>
                    <dd className="lf-info__value">{responsavel}</dd>
                </div>
                <div className="lf-info">
                    <dt className="lf-info__label">Pagamento</dt>
                    <dd className="lf-info__value">{lavagem.forma_pagamento || "Não informado"}</dd>
                </div>
                <div className="lf-info">
                    <dt className="lf-info__label">Valor</dt>
                    <dd className="lf-info__value">{moeda(lavagem.valor)}</dd>
                </div>
                <div className="lf-info col-span-2">
                    <dt className="lf-info__label">Caixinha</dt>
                    <dd className="lf-info__value">{moeda(lavagem.caixinha)}</dd>
                </div>
            </dl>

            <button type="button" onClick={concluir} disabled={enviando} aria-busy={enviando} className="lf-action mt-5">
                <Check size={18} /> {enviando ? "Concluindo..." : "Concluir lavagem"}
            </button>
        </article>
    );
}
