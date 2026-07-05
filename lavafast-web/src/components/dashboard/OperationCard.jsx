import StatusTimer from "./StatusTimer";
import BadgeTipoLavagem from "./BadgeTipoLavagem";
import ActionButton from "./ActionButton";
import {

    CarFront,
    CircleCheck

} from 'lucide-react';

export default function OperationCard({

    solicitacao,

    novo = false,

    now,

    onAction

}) {

    return (

        <div
            className={`
        bg-white
        rounded-2xl
        border
        p-4
        md:p-6
        transition-all
        duration-500
        hover:shadow-xl
        hover:-translate-y-1

        ${novo
                    ? "border-blue-500 shadow-2xl ring-4 ring-blue-200 animate-pulse"
                    : "border-slate-200 shadow-md"
                }
    `}
        >

            <div className="flex items-center justify-between">

                {novo && (

                    <div className="flex justify-end mb-3">

                        <span
                            className="
                px-3
                py-1
                rounded-full
                bg-blue-600
                text-white
                text-xs
                font-bold
                tracking-wider
                uppercase
            "
                        >
                            Novo
                        </span>

                    </div>

                )}

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

                now={now}

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

                solicitacao={solicitacao}

                onAction={onAction}

            />

        </div>

    );

}