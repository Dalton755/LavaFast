import AuthRepository from "../repositories/AuthRepository.js";

const CARGOS_FINANCEIROS = [
    "C&O",
    "Analista"
];

class AuthService {

    async obterPerfil(usuario) {

        if (!usuario?.email) {

            throw new Error(
                "Usuário autenticado sem e-mail."
            );

        }

        const funcionario =
            await AuthRepository.buscarFuncionarioPorEmail(
                usuario.email
            );

        if (!funcionario) {

            throw new Error(
                "Funcionário não encontrado no cadastro do LavaFast."
            );

        }

        if (funcionario.status !== "Ativo") {

            throw new Error(
                "Funcionário inativo."
            );

        }

        const podeVerValores =
            CARGOS_FINANCEIROS.includes(
                funcionario.cargo
            );

        return {

            id: funcionario.id,

            nome: funcionario.nome,

            email: funcionario.email,

            cargo: funcionario.cargo,

            loja: funcionario.loja,

            loja_padrao_id:
                funcionario.loja_padrao_id,

            podeVerValores,

            podeExportar:
                podeVerValores

        };

    }

}

export default new AuthService();
