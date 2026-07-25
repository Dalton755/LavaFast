import StatusTimer from "./StatusTimer";
import BadgeTipoLavagem from "./BadgeTipoLavagem";
import ActionButton from "./ActionButton";
import {

    CarFront,
    CircleCheck

} from 'lucide-react';
import WORKFLOW from "../../../workflows/OperationWorkflow";

export default function OperationCard({

    solicitacao,

    onAction

}) {

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
                p-4 md:p-6
                transition-all
                duration-200
                hover:shadow-xl
                hover:-translate-y-1
            "
        >

            <div className="flex items-center justify-between">

                <div>

                    <h2 className="font-bold text-3xl md:text-5xl tracking-wide">

                        {solicitacao.placa}

                    </h2>

                    <p className="text-base md:text-lg text-slate-400 mt-1">

                        #{solicitacao.numero_solicitacao}

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

            </div>

            <hr className="my-5 border-slate-200" />

            <StatusTimer

                status={solicitacao.status}

                inicio={

                    solicitacao.status === "EM_LAVAGEM"

                        ? solicitacao.iniciada_em

                        : solicitacao.recebida_em

                }


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