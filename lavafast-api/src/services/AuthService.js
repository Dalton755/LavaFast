import AuthRepository from "../repositories/AuthRepository.js";

const CARGOS_FINANCEIROS = [
    "C&O",
    "Analista"
];

class AuthService {

    async verificarCpf(cpf) {

        if (!cpf) {

            throw new Error(
                "CPF não informado."
            );

        }

        const funcionario =
            await AuthRepository.buscarFuncionarioPorCpf(
                cpf
            );

        if (!funcionario) {

            return {
                encontrado: false
            };

        }

        if (funcionario.status !== "Ativo") {

            throw new Error(
                "Funcionário inativo."
            );

        }

        let possuiAuth = false;

        if (funcionario.email) {

            const usuarioAuth =
                await AuthRepository.verificarUsuarioAuthPorEmail(
                    funcionario.email
                );

            possuiAuth =
                Boolean(usuarioAuth);

        }

        return {

            encontrado: true,

            nome:
                funcionario.nome,

            cpf:
                funcionario.cpf,

            email:
                funcionario.email,

            cargo:
                funcionario.cargo,

            possuiEmail:
                Boolean(
                    funcionario.email
                ),

            possuiAuth

        };

    }

    async cadastrarSenha(
        cpf,
        senha,
        email
    ) {

        if (!cpf) {

            throw new Error(
                "CPF não informado."
            );

        }

        if (!senha) {

            throw new Error(
                "Senha não informada."
            );

        }

        if (senha.length < 6) {

            throw new Error(
                "A senha deve possuir pelo menos 6 caracteres."
            );

        }

        let funcionario =
    await AuthRepository.buscarFuncionarioPorCpf(
        cpf
    );

        if (!funcionario) {

            throw new Error(
                "CPF não encontrado."
            );

        }

        if (funcionario.status !== "Ativo") {

            throw new Error(
                "Funcionário inativo."
            );

        }

        if (!funcionario.email) {

            if (!email) {

                throw new Error(
                    "E-mail não informado."
                );

            }

            email =
                email
                    .trim()
                    .toLowerCase();

            const emailValido =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                    .test(email);

            if (!emailValido) {

                throw new Error(
                    "Informe um e-mail válido."
                );

            }

            funcionario =
                await AuthRepository.atualizarEmailFuncionario(
                    funcionario.id,
                    email
                );

        }

        const usuarioAuth =
            await AuthRepository.criarOuAtualizarUsuarioAuth(
                funcionario.email,
                senha
            );

        return {

            sucesso: true,

            nome:
                funcionario.nome,

            cpf:
                funcionario.cpf,

            email:
                funcionario.email,

            usuario_auth_id:
                usuarioAuth.id

        };

    }

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
