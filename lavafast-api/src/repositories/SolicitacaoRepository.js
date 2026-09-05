import supabase from '../config/supabase.js';

class SolicitacaoRepository {

    async listar(lojas) {

        let consulta = supabase
            .schema('operacoes')
            .from('vw_cards_operacao')
            .select('*')
            .neq(
                'status',
                'FINALIZADA'
            )
            .order('recebida_em', {

                ascending: true

            });

        if (lojas.length > 0) {

            consulta = consulta.in(

                "loja_id",

                lojas

            );

        }

        const { data, error } = await consulta;



        if (error) {

            throw error;

        }

        return data;

    }

    async buscarPorId(id) {

        const {

            data,

            error

        } = await supabase
            .schema('operacoes')
            .from('solicitacoes_lavagem')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {

            throw error;

        }

        return data;

    }

    async atualizar(id, campos) {

        const {

            data,

            error

        } = await supabase
            .schema('operacoes')
            .from('solicitacoes_lavagem')
            .update(campos)
            .eq('id', id)
            .select()
            .single();

        if (error) {

            throw error;

        }

        return data;

    }

    async listarConcluidas() {

        const {
            data,
            error
        } = await supabase
            .schema("operacoes")
            .from("solicitacoes_lavagem")
            .select(`
            *,
            loja:lojas (
                id,
                codigo,
                nome,
                cidade,
                estado
                
            )
        `)
            .eq("status", "FINALIZADA")
            .order("finalizada_em", {
                ascending: false
            });

        if (error) {

            throw error;

        }

        return data;

    }

    async listarConcluidasPaginadas(
        limiteBusca,
        filtros = {}
    ) {

        let consulta = supabase
            .schema("operacoes")
            .from("solicitacoes_lavagem")
            .select(`
            *,
            loja:lojas (
                id,
                codigo,
                nome,
                cidade,
                estado
            )
        `, {
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

        if (filtros.tipoLavagemId) {

            consulta = consulta.eq(
                "tipo_lavagem_id",
                filtros.tipoLavagemId
            );

        }

        if (filtros.lojaId) {

            consulta = consulta.eq(
                "loja_id",
                filtros.lojaId
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
                .from("solicitacoes_lavagem")
                .select(`
                *,
                loja:lojas (
                    id,
                    codigo,
                    nome,
                    cidade,
                    estado
                )
            `)
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

            if (filtros.tipoLavagemId) {
                consulta = consulta.eq(
                    "tipo_lavagem_id",
                    filtros.tipoLavagemId
                );
            }

            if (filtros.lojaId) {
                consulta = consulta.eq(
                    "loja_id",
                    filtros.lojaId
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
            .from("solicitacoes_lavagem")
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

    async existePorNumero(numeroSolicitacao) {

        const {

            data,

            error

        } = await supabase

            .schema("operacoes")

            .from("solicitacoes_lavagem")

            .select("id")

            .eq(

                "numero_solicitacao",

                numeroSolicitacao

            )

            .maybeSingle();

        if (error) {

            throw error;

        }

        return !!data;

    }

    async criar(dados) {

        const {

            data,

            error

        } = await supabase

            .schema("operacoes")

            .from("solicitacoes_lavagem")

            .insert(dados)

            .select()

            .single();

        if (error) {

            throw error;

        }

        return data;

    }

}



export default new SolicitacaoRepository();

