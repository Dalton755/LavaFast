import { Check, Store } from "lucide-react";
import { useLoja } from "../../context/LojaContext";

export default function FiltroLojas({ onChange, onClose }) {
    const { lojas, lojasSelecionadas, selecionarLojas } = useLoja();

    function atualizar(ids) {
        selecionarLojas(ids);
        onChange?.(ids);
    }

    function alternar(id) {
        const novaLista = lojasSelecionadas.includes(id)
            ? lojasSelecionadas.filter(item => item !== id)
            : [...lojasSelecionadas, id];
        atualizar(novaLista);
    }

    return (
        <div className="p-3">
            <div className="flex items-start justify-between gap-3 px-2 pb-3 pt-1">
                <div>
                    <h3 className="lf-popover__title">Lojas da operação</h3>
                    <p className="lf-popover__subtitle mt-1">{lojasSelecionadas.length} selecionada(s)</p>
                </div>
                <Store size={19} className="text-slate-400" />
            </div>

            {lojas.length > 0 ? (
                <div className="max-h-72 space-y-1 overflow-y-auto" aria-label="Lojas disponíveis">
                    {lojas.map(loja => {
                        const selecionada = lojasSelecionadas.includes(loja.id);
                        return (
                            <label
                                key={loja.id}
                                className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm transition ${selecionada ? "bg-blue-50 text-blue-900" : "text-slate-700 hover:bg-slate-50"}`}
                            >
                                <span className="min-w-0 break-words font-medium">{loja.nome}</span>
                                <input
                                    type="checkbox"
                                    checked={selecionada}
                                    onChange={() => alternar(loja.id)}
                                    className="h-4 w-4 shrink-0 accent-blue-600"
                                />
                            </label>
                        );
                    })}
                </div>
            ) : (
                <p className="rounded-xl bg-slate-50 px-3 py-4 text-sm text-slate-500">Nenhuma loja disponível.</p>
            )}

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 px-1 pt-3">
                <button type="button" onClick={() => atualizar(lojas.map(loja => loja.id))}
                    className="min-h-10 rounded-xl px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">
                    Selecionar todas
                </button>
                <button type="button" onClick={onClose} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800">
                    <Check size={15} /> Concluído
                </button>
            </div>
        </div>
    );
}
