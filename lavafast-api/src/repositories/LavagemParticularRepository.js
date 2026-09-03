import supabase from "../config/supabase.js";

class LavagemParticularRepository {

    async listar() {

        const { data, error } = await supabase
            .schema("operacoes")
            .from("lavagens_avulsas")
            .select("*")
            .eq("status", "EM_LAVAGEM")
            .order("created_at", { ascending: true });

        if (error) throw error;

        return data;

    }

    async listarConcluidas() {

        const { data, error } = await supabase
            .schema("operacoes")
            .from("lavagens_avulsas")
            .select("*")
            .eq("status", "FINALIZADA")
            .order("finalizada_em", {
                ascending: false
            });

        if (error) throw error;

        return data;

    }

    async listarConcluidasPaginadas(
        limiteBusca,
        filtros = {}
    ) {

        let consulta = supabase
            .schema("operacoes")
            .from("lavagens_avulsas")
            .select("*", {
                count: "exact"
            })
            .eq("status", "FINALIZADA");

        if (filtros.placa) {

            consulta = consulta.ilike(
                "placa",
                `%${filtros.placa}%`
            );

        }

        if (filtros.dataInicial) {

            consulta = consulta.gte(
                "finalizada_em",
                `${filtros.dataInicial}T00:00:00-03:00`
            );

        }

        if (filtros.dataFinal) {

            consulta = consulta.lte(
                "finalizada_em",
                `${filtros.dataFinal}T23:59:59.999-03:00`
            );

        }

        const {
            data,
            count,
            error
        } = await consulta
            .order(
                "finalizada_em",
                {
                    ascending: false
                }
            )
            .range(
                0,
                Math.max(
                    0,
                    limiteBusca - 1
                )
            );

        if (error) {
            throw error;
        }

        return {
            dados: data || [],
            total: count || 0
        };

    }

    async listarConcluidasParaExportacao(
        filtros = {}
    ) {

        const todos = [];
        const tamanhoPagina = 1000;
        let inicio = 0;

        while (true) {

            let consulta = supabase
                .schema("operacoes")
                .from("lavagens_avulsas")
                .select("*")
                .eq("status", "FINALIZADA");

            if (filtros.placa) {
                consulta = consulta.ilike(
                    "placa",
                    `%${filtros.placa}%`
                );
            }

            if (filtros.dataInicial) {
                consulta = consulta.gte(
                    "finalizada_em",
                    `${filtros.dataInicial}T00:00:00-03:00`
                );
            }

            if (filtros.dataFinal) {
                consulta = consulta.lte(
                    "finalizada_em",
                    `${filtros.dataFinal}T23:59:59.999-03:00`
                );
            }

            const {
                data,
                error
            } = await consulta
                .order(
                    "finalizada_em",
                    {
                        ascending: false
                    }
                )
                .range(
                    inicio,
                    inicio + tamanhoPagina - 1
                );

            if (error) {
                throw error;
            }

            const lote =
                data || [];

            todos.push(
                ...lote
            );

            if (
                lote.length <
                tamanhoPagina
            ) {
                break;
            }

            inicio +=
                tamanhoPagina;
        }

        return todos;
    }

    async contarConcluidas() {

        const { count, error } = await supabase
            .schema("operacoes")
            .from("lavagens_avulsas")
            .select("id", {
                count: "exact",
                head: true
            })
            .eq("status", "FINALIZADA");

        if (error) {
            throw error;
        }

        return count || 0;
    }

    async criar(dados) {

        const { data, error } = await supabase
            .schema("operacoes")
            .from("lavagens_avulsas")
            .insert(dados)
            .select()
            .single();

        if (error) throw error;

        return data;

    }

    async concluir(id) {

        const { data, error } = await supabase
            .schema("operacoes")
            .from("lavagens_avulsas")
            .update({

                status: "FINALIZADA",

                finalizada_em: new Date()

            })
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        return data;

    }

}

export default new LavagemParticularRepository();