import { useState } from "react";

import PlateScannerModal from "../plate-reader/PlateScannerModal";

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

    const [scannerAberto, setScannerAberto] = useState(false);

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

        <div className="lf-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4">

            <div className="lf-modal-panel w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="lf-nova-particular">

                <h2 id="lf-nova-particular" className="lf-modal-title mb-5 text-xl font-bold">

                    Nova Lavagem Particular

                </h2>

                <div className="space-y-4">

                    <div className="flex gap-2">

                        <input

                            className="flex-1 border rounded-xl p-3"

                            placeholder="Placa"

                            value={form.placa}

                            onChange={e => alterar("placa", e.target.value.toUpperCase())}

                        />

                        <button

                            type="button"

                            onClick={() => setScannerAberto(true)}

                            aria-label="Abrir leitor de placa"

                            className="px-4 rounded-xl bg-slate-200 hover:bg-slate-300"

                        >

                            📷

                        </button>

                    </div>

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

                        <option>Débito</option>

                        <option>Crédito</option>



                    </select>

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

                        className="lf-modal-primary flex-1 rounded-xl bg-green-600 py-3 text-white"

                    >

                        Salvar

                    </button>

                </div>

            </div>

            <PlateScannerModal

                aberto={scannerAberto}

                fechar={() => setScannerAberto(false)}

            />

        </div>

    );

}