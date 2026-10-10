import { useState } from "react";

export default function NovaLocalizaModal({

    aberto,

    fechar,

    lojas,

    tipos,

    onSalvar

}) {

    const [form, setForm] = useState({

        numeroSolicitacao: "",

        placa: "",

        loja_id: "",

        tipo_lavagem_id: "",

        fornecedor: "Glow Fleet",

        responsavel_localiza: "",

        valor: "",

        observacao: ""

    });

    if (!aberto) return null;

    function alterar(campo, valor) {

        setForm(atual => ({

            ...atual,

            [campo]: valor

        }));

    }

    async function salvar() {

        const sucesso = await onSalvar({

            ...form,

            numero_solicitacao: form.numeroSolicitacao,

            valor: Number(form.valor)

        });

        if (!sucesso) {

            return;

        }

        fechar();

        setForm({

            numeroSolicitacao: "",

            placa: "",

            loja_id: "",

            tipo_lavagem_id: "",

            fornecedor: "Glow Fleet",

            responsavel_localiza: "",

            valor: "",

            observacao: ""

        });

    }

    return (

        <div className="lf-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4">

            <div className="lf-modal-panel w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="lf-nova-localiza">

                <h2 id="lf-nova-localiza" className="lf-modal-title mb-5 text-xl font-bold">

                    Nova Solicitação Localiza

                </h2>

                <div className="mb-4">

                    <label className="block text-sm font-medium mb-1">

                        Número da Solicitação

                    </label>

                    <input

                        type="text"

                        value={form.numeroSolicitacao}

                        onChange={(e) =>
                            alterar(
                                "numeroSolicitacao",
                                e.target.value.replace(/\D/g, "")
                            )
                        }

                        className="w-full border rounded-lg px-3 py-2"

                        placeholder="Ex.: 33587473"

                    />

                </div>

                <div className="space-y-4">

                    <input
                        className="w-full border rounded-xl p-3"
                        placeholder="Placa"
                        value={form.placa}
                        onChange={e => alterar("placa", e.target.value.toUpperCase())}
                    />

                    <select
                        className="w-full border rounded-xl p-3"
                        value={form.loja_id}
                        onChange={e => alterar("loja_id", e.target.value)}
                    >

                        <option value="">Selecione a loja</option>

                        {lojas.map(loja => (

                            <option
                                key={loja.id}
                                value={loja.id}
                            >
                                {loja.nome}
                            </option>

                        ))}

                    </select>

                    <select
                        className="w-full border rounded-xl p-3"
                        value={form.tipo_lavagem_id}
                        onChange={e => alterar("tipo_lavagem_id", e.target.value)}
                    >

                        <option value="">Tipo de lavagem</option>

                        {tipos.map(tipo => (

                            <option
                                key={tipo.id}
                                value={tipo.id}
                            >
                                {tipo.nome}
                            </option>

                        ))}

                    </select>

                    <input
                        className="w-full border rounded-xl p-3"
                        placeholder="Fornecedor"
                        value={form.fornecedor}
                        onChange={e => alterar("fornecedor", e.target.value)}
                    />

                    <input
                        className="w-full border rounded-xl p-3"
                        placeholder="Responsável Localiza"
                        value={form.responsavel_localiza}
                        onChange={e => alterar("responsavel_localiza", e.target.value)}
                    />

                    <input
                        className="w-full border rounded-xl p-3"
                        type="number"
                        placeholder="Valor"
                        value={form.valor}
                        onChange={e => alterar("valor", e.target.value)}
                    />

                    <textarea
                        className="w-full border rounded-xl p-3"
                        rows={3}
                        placeholder="Observação"
                        value={form.observacao}
                        onChange={e => alterar("observacao", e.target.value)}
                    />

                </div>

                <div className="lf-modal-actions mt-6 flex gap-3">

                    <button
                        onClick={fechar}
                        className="lf-modal-secondary flex-1 rounded-xl border py-3"
                    >
                        Cancelar
                    </button>

                    <button
                        onClick={salvar}
                        className="lf-modal-primary flex-1 rounded-xl bg-blue-600 py-3 text-white"
                    >
                        Salvar
                    </button>

                </div>

            </div>

        </div>

    );

}