import supabase from "../lib/supabase";
import EventBus from "./EventBus";

class RealtimeManager {

    iniciar() {


        supabase

            .channel("lavafast")

            .on(

                "postgres_changes",

                {

                    event: "*",

                    schema: "operacoes",

                    table: "solicitacoes_lavagem"

                },

                (payload) => {

                    EventBus.emit(

                        "solicitacao",

                        payload

                    );

                }

            )

            .subscribe();

    }

}

export default new RealtimeManager();