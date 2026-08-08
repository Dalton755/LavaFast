import MainLayout from "../../layouts/MainLayout";
import useSolicitacoesConcluidas from "../../hooks/useSolicitacoesConcluidas";
import { useState } from "react";

export default function CompletedOperation({
    voltar
}) {

    const {
        concluidas,
        loading
    } = useSolicitacoesConcluidas();

    const [pesquisa, setPesquisa] = useState("");

    const resultados = concluidas.filter(item => {

        const termo = pesquisa.toUpperCase();

        return (

            item.placa
                ?.toUpperCase()
                .includes(termo)

            ||

            String(item.numero_solicitacao || "")
                .includes(termo)

            ||

            item.responsavel_localiza
                ?.toUpperCase()
                .includes(termo)

            ||

            item.fornecedor
                ?.toUpperCase()
                .includes(termo)

        );

    });

    function formatarData(data) {

        if (!data) return "-";

        return new Date(data).toLocaleString(
            "pt-BR",
            {
                dateStyle: "short",
                timeStyle: "short"
            }
        );

    }

    return (

        <MainLayout>

            

            <div className="flex items-center gap-4 mb-8">

                <button
                    onClick={voltar}
                    className="
                        flex
                        items-center
                        justify-center
                        w-10
                        h-10
                        rounded-xl
                        bg-white
                        border
                        border-slate-200
                        text-slate-700
                        hover:bg-slate-100
                        transition
                        shadow-sm
                    "
                    title="Voltar"
                >
                    ←
                </button>

                <h1 className="text-3xl font-bold">
                    CONCLUÍDOS
                </h1>

            </div>

            <div className="mb-6">

                <input

                    type="text"

                    placeholder="Pesquisar placa..."

                    value={pesquisa}

                    onChange={e =>
                        setPesquisa(
                            e.target.value.toUpperCase()
                        )
                    }

                    className="
                        w-full
                        lg:w-[420px]
                        border
                        rounded-xl
                        px-4
                        py-3
                        shadow-sm
                        focus:outline-none
                        focus:ring-2
                        focus:ring-blue-500
                    "

                />

            </div>

            <div className="bg-white rounded-2xl shadow p-6">

                <div className="flex items-center justify-between mb-6">

                    <h2 className="text-xl font-bold">

                        Histórico de lavagens

                    </h2>

                    <span className="text-sm text-slate-500">

                        {resultados.length} concluídas

                    </span>

                </div>

                {loading ? (

                    <div className="text-slate-400 text-center py-20">

                        Carregando...

                    </div>

                ) : resultados.length === 0 ? (

                    <div className="text-slate-400 text-center py-20">

                        Nenhuma lavagem concluída

                    </div>

                ) : (

                    <div className="space-y-4">

                        {resultados.map(item => (

                            <div

                                key={`${item.origem}-${item.id}`}

                                className="
                                    border
                                    rounded-2xl
                                    p-5
                                    hover:shadow-md
                                    transition
                                "

                            >

                                <div className="
                                    flex
                                    flex-col
                                    lg:flex-row
                                    lg:items-center
                                    lg:justify-between
                                    gap-4
                                ">

                                    <div>

                                        <div className="
                                            flex
                                            items-center
                                            gap-3
                                            mb-2
                                        ">

                                            <span className="
                                                text-2xl
                                                font-bold
                                            ">

                                                {item.placa}

                                            </span>

                                            <span className={`
                                                text-xs
                                                font-bold
                                                px-3
                                                py-1
                                                rounded-full

                                                ${item.origem === "LOCALIZA"

                                                    ? "bg-green-100 text-green-700"

                                                    : "bg-blue-100 text-blue-700"
                                                }
                                            `}>

                                                {item.origem}

                                            </span>

                                        </div>

                                        <div className="
                                            text-sm
                                            text-slate-500
                                        ">

                                            Solicitação:{" "}

                                            <span className="
                                                font-medium
                                                text-slate-700
                                            ">

                                                {item.numero_solicitacao || "-"}

                                            </span>

                                        </div>

                                    </div>

                                    <div className="
                                        text-sm
                                        lg:text-right
                                    ">

                                        <div className="
                                            text-green-600
                                            font-semibold
                                        ">

                                            ✓ FINALIZADA

                                        </div>

                                        <div className="
                                            text-slate-500
                                            mt-1
                                        ">

                                            {formatarData(
                                                item.finalizada_em
                                            )}

                                        </div>

                                    </div>

                                </div>

                            </div>

                        ))}

                    </div>

                )}

            </div>

        </MainLayout>

    );

}