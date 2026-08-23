import supabase from "../config/supabase.js";

export async function autenticar(req, res, next) {

    try {

        const authorization =
            req.headers.authorization;

        if (!authorization) {

            return res.status(401).json({
                erro: "Token de autenticação não informado."
            });

        }

        const partes =
            authorization.split(" ");

        if (
            partes.length !== 2 ||
            partes[0] !== "Bearer"
        ) {

            return res.status(401).json({
                erro: "Formato de autenticação inválido."
            });

        }

        const token = partes[1];

        const {
            data: {
                user
            },
            error
        } = await supabase.auth.getUser(token);

        if (error || !user) {

            return res.status(401).json({
                erro: "Sessão inválida ou expirada."
            });

        }

        req.usuario = user;

        next();

    }

    catch (error) {

        console.error(
            "[AuthMiddleware]",
            error
        );

        return res.status(401).json({
            erro: "Não foi possível validar a autenticação."
        });

    }

}
