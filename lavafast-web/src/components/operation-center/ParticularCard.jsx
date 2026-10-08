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
            // O painel mostra o erro e preserva o card para uma nova tentativa.
        } finally {
            setEnviando(false);
        }
    }

    return (
        <article className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-2xl font-extrabold tracking-wider text-slate-900">{lavagem.placa}</h3>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Em lavagem</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                    <p className="text-xs text-slate-500">Responsável</p>
                    <p className="mt-1 font-semibold text-slate-800">{lavagem.responsavel || lavagem.lavador || "Não informado"}</p>
                </div>
                <div>
                    <p className="text-xs text-slate-500">Pagamento</p>
                    <p className="mt-1 font-semibold text-slate-800">{lavagem.forma_pagamento || "Não informado"}</p>
                </div>
                <div>
                    <p className="text-xs text-slate-500">Valor</p>
                    <p className="mt-1 font-semibold text-slate-800">{moeda(lavagem.valor)}</p>
                </div>
                <div>
                    <p className="text-xs text-slate-500">Caixinha</p>
                    <p className="mt-1 font-semibold text-slate-800">{moeda(lavagem.caixinha)}</p>
                </div>
            </div>

            <button type="button" onClick={concluir} disabled={enviando}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60">
                <Check size={18} /> {enviando ? "Concluindo..." : "Concluir lavagem"}
            </button>
        </article>
    );
}
