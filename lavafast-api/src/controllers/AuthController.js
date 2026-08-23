import AuthService from "../services/AuthService.js";

class AuthController {

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
