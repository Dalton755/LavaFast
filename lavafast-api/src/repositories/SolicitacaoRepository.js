import supabase from '../config/supabase.js';

class SolicitacaoRepository {

    async listar(lojaId) {

        let consulta = supabase
            .schema('operacoes')
            .from('vw_cards_operacao')
            .select('*')
            .order('recebida_em', {

                ascending: true

            });

        if (lojaId) {

            consulta = consulta.eq(

                'loja_id',

                lojaId

            );

        }

        const {

            data,

            error

        } = await consulta;

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

