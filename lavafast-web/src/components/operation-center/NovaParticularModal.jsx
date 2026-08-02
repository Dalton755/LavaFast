import { useState } from "react";

export default function NovaParticularModal({

    aberto,

    fechar,

    funcionarios,

    onSalvar

}) {

    const [form, setForm] = useState({

        placa: "",

        funcionario_id: "",

        valor: "",

        caixinha: "",

        forma_pagamento: "PIX",

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

            valor: Number(form.valor),

            caixinha: Number(form.caixinha)

        });

        fechar();

        setForm({

            placa: "",

            funcionario_id: "",

            valor: "",

            caixinha: "",

            forma_pagamento: "PIX",

            observacao: ""

        });

    }

    return (

        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">

                <h2 className="text-2xl font-bold mb-6">

                    Nova Lavagem Particular

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

                        value={form.funcionario_id}

                        onChange={e => alterar("funcionario_id", e.target.value)}

                    >

                        <option value="">

                            Selecione o lavador

                        </option>

                        {

                            funcionarios.map(funcionario => (

                                <option

                                    key={funcionario.id}

                                    value={funcionario.id}

                                >

                                    {funcionario.nome}

                                </option>

                            ))

                        }

                    </select>

                    <input

                        className="w-full border rounded-xl p-3"

                        type="number"

                        placeholder="Valor"

                        value={form.valor}

                        onChange={e => alterar("valor", e.target.value)}

                    />

                    <input

                        className="w-full border rounded-xl p-3"

                        type="number"

                        placeholder="Caixinha"

                        value={form.caixinha}

                        onChange={e => alterar("caixinha", e.target.value)}

                    />

                    <select

                        className="w-full border rounded-xl p-3"

                        value={form.forma_pagamento}

                        onChange={e => alterar("forma_pagamento", e.target.value)}

                    >

                        <option>PIX</option>

                        <option>Dinheiro</option>

                        <option>Cartão</option>

                    </select>

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

                        className="flex-1 bg-green-600 text-white rounded-xl py-3"

                    >

                        Salvar

                    </button>

                </div>

            </div>

        </div>

    );

}