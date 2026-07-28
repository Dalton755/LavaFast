import supabase from "../config/supabase.js";

class FuncionarioRepository {

    async listarAtivos() {

        const { data, error } = await supabase

            .schema("financeiro")

            .from("funcionarios")

            .select("id,nome")

            .eq("status", "Ativo")

            .order("nome");

        if (error) {

            throw error;

        }

        return data;

    }

}

export default new FuncionarioRepository();