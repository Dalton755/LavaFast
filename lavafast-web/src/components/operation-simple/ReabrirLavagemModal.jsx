import { AlertTriangle, RotateCcw, X } from "lucide-react";

export default function ReabrirLavagemModal({ registro, carregando, confirmar, cancelar }) {
    if (!registro) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]"
            onMouseDown={event => { if (event.target === event.currentTarget && !carregando) cancelar(); }}>
            <div role="dialog" aria-modal="true" aria-labelledby="reabrir-titulo"
                className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                    <span className="rounded-xl bg-amber-50 p-3 text-amber-700">
                        <AlertTriangle size={23} />
                    </span>
                    <button type="button" aria-label="Fechar confirmação" disabled={carregando}
                        onClick={cancelar} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-40">
                        <X size={19} />
                    </button>
                </div>
                <h2 id="reabrir-titulo" className="mt-4 text-xl font-bold tracking-tight text-slate-900">
                    Retornar lavagem à operação?
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                    A placa <strong className="text-slate-900">{registro.placa}</strong> deixará o histórico de concluídas
                    e voltará para os serviços em andamento.
                </p>
                <p className="mt-2 text-xs text-slate-500">
                    A data de conclusão será limpa e os indicadores serão recalculados.
                </p>
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
                    <button type="button" onClick={cancelar} disabled={carregando}
                        className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                        Cancelar
                    </button>
                    <button type="button" onClick={confirmar} disabled={carregando}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-wait disabled:opacity-50">
                        <RotateCcw size={16} /> {carregando ? "Retornando..." : "Confirmar retorno"}
                    </button>
                </div>
            </div>
        </div>
    );
}
