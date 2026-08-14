import { useEffect, useState } from "react";
import TempoOperacao from "./TempoOperacao";

function formatarTempoDecorrido(dataInicial) {

    if (!dataInicial) {
        return "--";
    }

    const inicio = new Date(dataInicial);
    const agora = new Date();

    const diferenca = agora - inicio;

    if (diferenca < 0) {
        return "0min";
    }

    const minutosTotais = Math.floor(
        diferenca / 1000 / 60
    );

    const dias = Math.floor(
        minutosTotais / 1440
    );

    const horas = Math.floor(
        (minutosTotais % 1440) / 60
    );

    const minutos =
        minutosTotais % 60;

    if (dias > 0) {

        return `${dias}d ${horas}h ${minutos}min`;

    }

    if (horas > 0) {

        return `${horas}h ${minutos}min`;

    }

    return `${minutos}min`;

}


export default function LocalizaCard({

    solicitacao,

    onConcluir

}) {

    const [agora, setAgora] = useState(
        new Date()
    );


    useEffect(() => {

        const intervalo = setInterval(() => {

            setAgora(new Date());

        }, 60000);


        return () => {

            clearInterval(intervalo);

        };

    }, []);


    const tempoDecorrido =
        formatarTempoDecorrido(
            solicitacao.recebida_em
        );


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

                    <p className="text-sm text-slate-500">

                        Solicitação #

                        {solicitacao.numero_solicitacao}

                    </p>

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

            <div className="mt-4 flex items-center gap-2 text-sm">

                <span className="font-semibold text-slate-700">
                    ⏱️ Aberto há:
                </span>

                <span className="font-bold text-blue-600">

                    <TempoOperacao
                        inicio={solicitacao.recebida_em}
                        aoVivo={true}
                    />

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


                <div>

                    <strong>Aberto há:</strong>

                    {" "}

                    <span className="font-semibold text-orange-600">

                        {tempoDecorrido}

                    </span>

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