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