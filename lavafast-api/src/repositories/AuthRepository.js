import supabase from "../config/supabase.js";

class AuthRepository {

    async buscarFuncionarioPorEmail(email) {

        const { data, error } = await supabase
            .schema("financeiro")
            .from("funcionarios")
            .select(`
                id,
                nome,
                email,
                cargo,
                loja,
                status,
                loja_padrao_id
            `)
            .eq("email", email)
            .maybeSingle();

        if (error) {

            throw error;

        }

        return data;

    }

}

export default new AuthRepository();
