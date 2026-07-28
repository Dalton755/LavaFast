import { useEffect } from "react";
import supabase from "../lib/supabase";
import NotificationService from "../services/NotificationService";

export default function useRealtimeSolicitacoes(recarregar) {

    useEffect(() => {


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


                    if (payload.eventType === "INSERT") {


                        NotificationService.novaSolicitacao(

                            payload.new

                        );

                    }

                    recarregar();

                }
            )

            .subscribe((status) => {


            });

        return () => {

            supabase.removeChannel(channel);

        };

    }, [recarregar]);

}