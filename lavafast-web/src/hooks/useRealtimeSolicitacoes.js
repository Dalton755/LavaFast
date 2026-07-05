import { useEffect } from "react";
import supabase from "../lib/supabase";
import NotificationService from "../services/NotificationService";

export default function useRealtimeSolicitacoes(recarregar) {

    useEffect(() => {

        console.log("Conectando ao Realtime...");

        const channel = supabase

            .channel("solicitacoes-realtime")

            .on(

                "postgres_changes",

                {

                    event: "*",

                    schema: "operacoes",

                    table: "solicitacoes_lavagem"

                },

                (payload) => {

                    console.log("================================");
                    console.log("EVENTO RECEBIDO");
                    console.log("Tipo:", payload.eventType);
                    console.log(payload);
                    console.log("================================");

                    if (payload.eventType === "INSERT") {

                        console.log("CHEGOU INSERT");

                        NotificationService.novaSolicitacao(

                            payload.new

                        );

                    }

                    recarregar();

                }
            )

            .subscribe((status) => {

                console.log("STATUS:", status);

            });

        return () => {

            supabase.removeChannel(channel);

        };

    }, [recarregar]);

}