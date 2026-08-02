export default function LocalizaCard({

    solicitacao,

    onConcluir

}) {

    return (

        <div
            className="
                bg-white
                rounded-2xl
                border
                border-slate-200
                shadow
                p-5
            "
        >

            <div className="flex justify-between items-start">

                <div>

                    <h2 className="text-3xl font-black">

                        {solicitacao.placa}

                    </h2>

                    <p className="text-sm text-slate-500 mt-1">

                        {solicitacao.loja}

                    </p>

                </div>

                <span
                    className="
                        px-3
                        py-1
                        rounded-full
                        bg-blue-100
                        text-blue-700
                        text-xs
                        font-semibold
                    "
                >

                    Localiza

                </span>

            </div>

            <div className="mt-5 space-y-2 text-sm">

                <div>

                    <strong>Tipo:</strong>

                    {" "}

                    {solicitacao.tipo_lavagem}

                </div>

                <div>

                    <strong>Fornecedor:</strong>

                    {" "}

                    {solicitacao.fornecedor}

                </div>

                <div>

                    <strong>Responsável:</strong>

                    {" "}

                    {solicitacao.responsavel_localiza}

                </div>

            </div>

            <button

                onClick={() => onConcluir(solicitacao)}

                className="
                    w-full
                    mt-6
                    rounded-xl
                    bg-green-600
                    hover:bg-green-700
                    text-white
                    py-3
                    font-semibold
                "

            >

                Concluir

            </button>

        </div>

    );

}