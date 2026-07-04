import supabase from "../config/supabase.js";

class LocalizaRepository {

    async existe(numeroSolicitacao) {

        const { data, error } = await supabase

            .from("solicitacoes_lavagem")

            .select("id")

            .eq("numero_solicitacao", numeroSolicitacao)

            .maybeSingle();

        if (error) {

            throw error;

        }

        return !!data;

    }

    async inserir(solicitacao) {

        const { data, error } = await supabase

            .from("solicitacoes_lavagem")

            .insert(solicitacao)

            .select()

            .single();

        if (error) {

            throw error;

        }

        return data;

    }

}

export default new LocalizaRepository();