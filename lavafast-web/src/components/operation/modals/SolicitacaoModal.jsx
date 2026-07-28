import StatusTimer from "../cards/StatusTimer";

export default function SolicitacaoModal({

    aberto,
    fechar,
    solicitacao

}) {

    if (!aberto || !solicitacao) return null;

    return (

        <div
            className="
                fixed
                inset-0
                bg-black/50
                backdrop-blur-sm
                flex
                items-center
                justify-center
                z-50
            "
        >

            <div
                className="
                    bg-white
                    rounded-3xl
                    shadow-2xl
                    w-full
                    max-w-6xl
                    mx-6
                    p-8
                "
            >

                {/* Cabeçalho */}

                <div className="flex justify-between items-start">

                    <div>

                        <h2 className="text-5xl font-black tracking-[0.12em]">

                            {solicitacao.placa}

                        </h2>

                        <p className="text-slate-500 mt-2">

                            Solicitação #{solicitacao.numero_solicitacao}

                        </p>

                    </div>

                    <div className="flex items-center gap-4">

                        <span
                            className={`
                                px-5
                                py-2
                                rounded-full
                                text-sm
                                font-semibold
                                ${
                                    solicitacao.status === "AGUARDANDO"
                                        ? "bg-amber-100 text-amber-700"
                                        : solicitacao.status === "EM_LAVAGEM"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-green-100 text-green-700"
                                }
                            `}
                        >

                            {solicitacao.status.replace("_", " ")}

                        </span>

                        <button

                            onClick={fechar}

                            className="
                                px-5
                                py-2
                                rounded-xl
                                bg-slate-100
                                hover:bg-slate-200
                            "

                        >

                            Fechar

                        </button>

                    </div>

                </div>

                <hr className="my-8" />

                {/* Conteúdo */}

                <div className="grid grid-cols-5 gap-10">

                    {/* Coluna 1 */}

                    <div className="space-y-6">

                        <div>

                            <p className="text-xs uppercase tracking-wider text-slate-400">

                                Responsável Localiza

                            </p>

                            <p className="text-lg font-semibold">

                                {solicitacao.responsavel_localiza}

                            </p>

                        </div>

                        <div>

                            <p className="text-xs uppercase tracking-wider text-slate-400">

                                Fornecedor

                            </p>

                            <p className="text-lg font-semibold">

                                {solicitacao.fornecedor}

                            </p>

                        </div>

                    </div>

                    {/* Coluna 2 */}

                    <div className="space-y-6">

                        <div>

                            <p className="text-xs uppercase tracking-wider text-slate-400">

                                Tipo de lavagem

                            </p>

                            <p className="text-lg font-semibold">

                                {solicitacao.tipo_lavagem}

                            </p>

                        </div>

                        <div>

                            <p className="text-xs uppercase tracking-wider text-slate-400">

                                Loja

                            </p>

                            <p className="text-lg font-semibold">

                                {solicitacao.loja}

                            </p>

                        </div>

                    </div>

                    {/* Coluna 3 */}

                    <div className="space-y-6">

                        <div
                            className="
                                rounded-2xl
                                border
                                border-slate-200
                                p-6
                            "
                        >

                            <p className="text-sm text-slate-500 mb-4">

                                Tempo da solicitação

                            </p>

                            <StatusTimer

                                status={solicitacao.status}

                                inicio={
                                    solicitacao.status === "EM_LAVAGEM"
                                        ? solicitacao.iniciada_em
                                        : solicitacao.recebida_em
                                }

                            />

                        </div>

                        <div
                            className="
                                rounded-2xl
                                border
                                border-slate-200
                                p-6
                            "
                        >

                            <p className="text-xs uppercase text-slate-400">

                                Recebida em

                            </p>

                            <p className="font-semibold mt-2">

                                {new Date(
                                    solicitacao.recebida_em
                                ).toLocaleString("pt-BR")}

                            </p>

                        </div>

                        {

                            solicitacao.iniciada_em &&

                            <div
                                className="
                                    rounded-2xl
                                    border
                                    border-slate-200
                                    p-6
                                "
                            >

                                <p className="text-xs uppercase text-slate-400">

                                    Iniciada em

                                </p>

                                <p className="font-semibold mt-2">

                                    {new Date(
                                        solicitacao.iniciada_em
                                    ).toLocaleString("pt-BR")}

                                </p>

                            </div>

                        }

                    </div>

                </div>

            </div>

        </div>

    );

}