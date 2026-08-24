import AuthService from "../services/AuthService.js";

class AuthController {

    async verificarCpf(req, res) {

        try {

            const { cpf } = req.body;

            const resultado =
                await AuthService.verificarCpf(cpf);

            return res.json(resultado);

        }

        catch (error) {

            console.error(
                "[AuthController]",
                error
            );

            return res.status(400).json({
                erro: error.message
            });

        }

    }

        async cadastrarSenha(req, res) {

        try {

            const {
                cpf,
                senha
            } = req.body;

            const resultado =
                await AuthService.cadastrarSenha(
                    cpf,
                    senha
                );

            return res.json(resultado);

        }

        catch (error) {

            console.error(
                "[AuthController]",
                error
            );

            return res.status(400).json({
                erro: error.message
            });

        }

    }

    async perfil(req, res) {

        try {

            const perfil =
                await AuthService.obterPerfil(
                    req.usuario
                );

            return res.json(perfil);

        }

        catch (error) {

            console.error(
                "[AuthController]",
                error
            );

            return res.status(403).json({
                erro: error.message
            });

        }

    }

}

export default new AuthController();
