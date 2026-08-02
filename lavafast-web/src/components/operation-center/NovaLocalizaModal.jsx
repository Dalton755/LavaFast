import { useState } from "react";

export default function NovaLocalizaModal({

    aberto,

    fechar,

    lojas,

    tipos,

    onSalvar

}) {

    const [form, setForm] = useState({

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

        await onSalvar({

            ...form,

            valor: Number(form.valor)

        });

        fechar();

        setForm({

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

        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">

                <h2 className="text-2xl font-bold mb-6">

                    Nova Solicitação Localiza

                </h2>

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

                <div className="flex gap-3 mt-6">

                    <button
                        onClick={fechar}
                        className="flex-1 border rounded-xl py-3"
                    >
                        Cancelar
                    </button>

                    <button
                        onClick={salvar}
                        className="flex-1 bg-blue-600 text-white rounded-xl py-3"
                    >
                        Salvar
                    </button>

                </div>

            </div>

        </div>

    );

}