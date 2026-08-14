import StatusTimer from "./StatusTimer";
import BadgeTipoLavagem from "./BadgeTipoLavagem";
import ActionButton from "./ActionButton";
import {

    CarFront,
    CircleCheck

} from 'lucide-react';

import {
    User,
    Building2
} from "lucide-react";

import WORKFLOW from "../../../workflows/OperationWorkflow";

import coresLojas from "../../../config/coresLojas";

export default function OperationCard({



    solicitacao,

    onAction,
    onOpen

}) {


    const estiloLoja =

        coresLojas[solicitacao.cor_loja]

        ||

        coresLojas.gray;

    const botao = WORKFLOW[solicitacao.status];

    function handleAction() {

        onAction?.(solicitacao);

    }

    return (

        <div
            className="
                bg-white
                rounded-2xl
                shadow-md
                border
                border-slate-200
                p-4 md:p-8
                transition-all
                duration-200
                hover:shadow-xl
                hover:-translate-y-1
            "
        >

            <div className="flex items-center justify-between">

                <div className="w-full">

                    <div
                        onClick={() => {


                            onOpen?.(solicitacao);

                        }}
                        className="
                        bg-white
                        border-2
                        border-slate-300
                        rounded-2xl
                        py-4
                        px-2
                        text-center
                        shadow-sm
                        cursor-pointer
                        transition-all
                        duration-200
                        hover:border-blue-500
                        hover:shadow-lg
                        "
                    >

                        <h2
                            className="
                            text-3xl
                            md:text-4xl
                            font-black
                            tracking-[0.12em]
                            text-slate-900
                            "
                        >
                            {solicitacao.placa}
                        </h2>

                    </div>

                    <div
                        className="
                            flex
                            items-center
                            justify-center
                            mt-2
                        "
                    >

                        <span

                            className={`
                                px-3
                                py-1
                                rounded-full
                                text-xs
                                font-semibold
                                border
                                ${estiloLoja.fundo}
                                ${estiloLoja.texto}
                                ${estiloLoja.borda}
                            `}

                        >

                            📍 {solicitacao.loja.toUpperCase()}

                        </span>

                    </div>

                    <p
                        className="
                        text-center
                        text-xs
                        text-slate-400
                        mt-4
                        font-medium
                        "
                    >
                        Solicitação #{solicitacao.numero_solicitacao}
                    </p>

                </div>

                <CarFront

                    size={22}

                    className="text-slate-400"

                />

            </div>

            <div className="mt-4">

                <BadgeTipoLavagem

                    nome={solicitacao.tipo_lavagem}

                    cor={solicitacao.cor}

                />

                <div className="mt-4 space-y-2">

                    <div className="flex items-center gap-2 text-sm text-slate-600">

                        <User size={14} className="text-slate-400 flex-shrink-0" />

                        <span className="truncate">

                            {solicitacao.responsavel_localiza}

                        </span>

                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-600">

                        <Building2 size={14} className="text-slate-400 flex-shrink-0" />

                        <span className="truncate">

                            {solicitacao.fornecedor}

                        </span>

                    </div>

                </div>

            </div>

            <hr className="my-5 border-slate-200" />

            <StatusTimer
                status={solicitacao.status}
                inicio={solicitacao.recebida_em}
            />

            <div
                className="
                    mt-5
                    flex
                    items-center
                    gap-2
                    text-green-600
                    font-semibold
                "
            >



            </div>

            <hr className="my-5 border-slate-200" />

            <ActionButton

                texto={botao.botao}

                cor={botao.cor}

                onClick={handleAction}

            />

        </div>

    );

}