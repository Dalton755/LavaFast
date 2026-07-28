import { useState } from "react";

import MobileTab from "./MobileTab";
import CardList from "../CardList";

const TABS = [

    {
        key: "SOLICITADO",
        title: "Solicitadas",
        color: "bg-slate-700",
        icon: "🚗"
    },

    {
        key: "AGUARDANDO",
        title: "Aguardando",
        color: "bg-amber-500",
        icon: "⏱"
    },

    {
        key: "EM_LAVAGEM",
        title: "Lavando",
        color: "bg-blue-600",
        icon: "🫧"
    },

    {
        key: "FINALIZADA",
        title: "Finalizadas",
        color: "bg-green-600",
        icon: "✔"
    }

];

export default function MobileBoard({

    solicitacoes,
    now,
    onAction,
    onOpen

}) {

    const [abaAtiva, setAbaAtiva] = useState("AGUARDANDO");

    const lista = solicitacoes.filter(

        item => item.status === abaAtiva

    );


    return (

        <div className="flex flex-col gap-4">

            <div className="flex overflow-x-auto gap-2 pb-2">

                {TABS.map(tab => (

                    <MobileTab

                        key={tab.key}

                        tab={tab}

                        ativo={abaAtiva === tab.key}

                        total={
                            solicitacoes.filter(
                                item => item.status === tab.key
                            ).length
                        }

                        onClick={() => setAbaAtiva(tab.key)}

                    />

                ))}

            </div>

            <CardList

                cards={lista}

                now={now}

                onAction={onAction}

                onOpen={onOpen}

            />

        </div>

    );

}