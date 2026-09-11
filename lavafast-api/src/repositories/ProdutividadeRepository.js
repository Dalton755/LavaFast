import supabase from "../config/supabase.js";

class ProdutividadeRepository {

    async contarLocaliza(
        inicio,
        fim,
        lojas = []
    ) {

        let consulta = supabase
            .schema("operacoes")
            .from("solicitacoes_lavagem")
            .select(
                "id",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                "status",
                "FINALIZADA"
            )
            .gte(
                "finalizada_em",
                inicio
            )
            .lte(
                "finalizada_em",
                fim
            );

        if (lojas.length > 0) {

            consulta = consulta.in(
                "loja_id",
                lojas
            );

        }

        const {
            count,
            error
        } = await consulta;

        if (error) {
            throw error;
        }

        return count || 0;

    }

    async contarParticulares(
        inicio,
        fim,
        lojas = []
    ) {

        /*
         * Lavagem particular não possui loja_id.
         * Quando existe filtro por loja,
         * ela não participa da contagem.
         */
        if (lojas.length > 0) {
            return 0;
        }

        const {
            count,
            error
        } = await supabase
            .schema("operacoes")
            .from("lavagens_avulsas")
            .select(
                "id",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                "status",
                "FINALIZADA"
            )
            .gte(
                "finalizada_em",
                inicio
            )
            .lte(
                "finalizada_em",
                fim
            );

        if (error) {
            throw error;
        }

        return count || 0;

    }

    async contarFinalizadasEntre(
        inicio,
        fim,
        lojas = []
    ) {

        const [
            localiza,
            particulares
        ] = await Promise.all([

            this.contarLocaliza(
                inicio,
                fim,
                lojas
            ),

            this.contarParticulares(
                inicio,
                fim,
                lojas
            )

        ]);

        return {
            total:
                localiza +
                particulares,

            localiza,

            particulares
        };

    }

    async listarTiposFinalizados(
        inicio,
        fim,
        lojas = []
    ) {

        const todos = [];
        const tamanhoPagina = 1000;
        let paginaInicial = 0;

        while (true) {

            let consulta = supabase
                .schema("operacoes")
                .from("solicitacoes_lavagem")
                .select(
                    "tipo_lavagem_id"
                )
                .eq(
                    "status",
                    "FINALIZADA"
                )
                .gte(
                    "finalizada_em",
                    inicio
                )
                .lte(
                    "finalizada_em",
                    fim
                );

            if (lojas.length > 0) {

                consulta = consulta.in(
                    "loja_id",
                    lojas
                );

            }

            const {
                data,
                error
            } = await consulta.range(
                paginaInicial,
                paginaInicial +
                tamanhoPagina -
                1
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

            paginaInicial +=
                tamanhoPagina;

        }

        return todos;

    }

    async listarLocaliza(
        inicio,
        fim,
        lojas = []
    ) {

        let consulta = supabase
            .schema("operacoes")
            .from("solicitacoes_lavagem")
            .select(`
                id,
                numero_solicitacao,
                placa,
                loja_id,
                tipo_lavagem_id,
                recebida_em,
                iniciada_em,
                finalizada_em,
                loja:lojas (
                    id,
                    codigo,
                    nome
                )
            `)
            .eq(
                "status",
                "FINALIZADA"
            )
            .gte(
                "finalizada_em",
                inicio
            )
            .lte(
                "finalizada_em",
                fim
            );

        if (lojas.length > 0) {

            consulta = consulta.in(
                "loja_id",
                lojas
            );

        }

        const {
            data,
            error
        } = await consulta.order(
            "finalizada_em",
            {
                ascending: false
            }
        );

        if (error) {
            throw error;
        }

        return data || [];

    }

    async listarParticulares(
        inicio,
        fim,
        lojas = []
    ) {

        if (lojas.length > 0) {
            return [];
        }

        const {
            data,
            error
        } = await supabase
            .schema("operacoes")
            .from("lavagens_avulsas")
            .select(`
                id,
                placa,
                created_at,
                finalizada_em
            `)
            .eq(
                "status",
                "FINALIZADA"
            )
            .gte(
                "finalizada_em",
                inicio
            )
            .lte(
                "finalizada_em",
                fim
            )
            .order(
                "finalizada_em",
                {
                    ascending: false
                }
            );

        if (error) {
            throw error;
        }

        return data || [];

    }

}

export default new ProdutividadeRepository();