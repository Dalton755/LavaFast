export default function ParticularCard({

    lavagem,

    onConcluir

}) {

    return (

        <div className="bg-white rounded-2xl shadow-md p-5 border border-slate-200">

            <div className="flex justify-between items-center">

                <h2 className="text-3xl font-black tracking-widest">

                    {lavagem.placa}

                </h2>

                <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">

                    Particular

                </span>

            </div>

            <div className="mt-5 space-y-2 text-sm text-slate-600">

                <p>

                    <strong>Lavador:</strong>{" "}

                    {lavagem.lavador ?? "Não informado"}

                </p>

                <p>

                    <strong>Valor:</strong>{" "}

                    R$ {Number(lavagem.valor).toFixed(2)}

                </p>

                <p>

                    <strong>Caixinha:</strong>{" "}

                    R$ {Number(lavagem.caixinha || 0).toFixed(2)}

                </p>

                <p>

                    <strong>Pagamento:</strong>{" "}

                    {lavagem.forma_pagamento}

                </p>

            </div>

            <button

                onClick={() => onConcluir(lavagem.id)}

                className="mt-6 w-full rounded-xl bg-green-600 hover:bg-green-700 text-white py-3 font-semibold transition"

            >

                Concluir

            </button>

        </div>

    );

}