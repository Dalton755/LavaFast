import supabase from "../config/supabase.js";

class AuthRepository {

    async buscarFuncionarioPorId(id) {

        const { data, error } = await supabase
            .schema("financeiro")
            .from("funcionarios")
            .select(`
                id,
                nome,
                cpf,
                email,
                cargo,
                status,
                loja,
                loja_padrao_id
            `)
            .eq("id", id)
            .maybeSingle();

        if (error) {

            throw error;

        }

        return data;

    }

    async buscarFuncionarioPorCpf(cpf) {

        const { data, error } = await supabase
            .schema("financeiro")
            .from("funcionarios")
            .select(`
            id,
            nome,
            cpf,
            email,
            cargo,
            loja,
            status,
            loja_padrao_id
        `)
            .eq("cpf", cpf)
            .maybeSingle();

        if (error) {

            throw error;

        }

        return data;

    }

    async criarOuAtualizarUsuarioAuth(
        email,
        senha
    ) {

        const {
            data: usuarios,
            error: erroBusca
        } = await supabase.auth.admin.listUsers({
            page: 1,
            perPage: 1000
        });

        if (erroBusca) {

            throw erroBusca;

        }

        const usuarioExistente =
            usuarios.users.find(
                usuario =>
                    usuario.email?.toLowerCase() ===
                    email.toLowerCase()
            );

        if (usuarioExistente) {

            const {
                data,
                error
            } = await supabase.auth.admin.updateUserById(
                usuarioExistente.id,
                {
                    password: senha
                }
            );

            if (error) {

                throw error;

            }

            return data.user;

        }

        const {
            data,
            error
        } = await supabase.auth.admin.createUser({

            email,

            password: senha,

            email_confirm: true

        });

        if (error) {

            throw error;

        }

        return data.user;

    }

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
