import ProdutividadeService
    from "../services/ProdutividadeService.js";

import AuthService
    from "../services/AuthService.js";

function extrairLojas(req) {

    const valor =
        String(
            req.query.lojas || ""
        ).trim();

    if (!valor) {
        return [];
    }

    return valor
        .split(",")
        .map(item =>
            item.trim()
        )
        .filter(Boolean);

}

async function verificarPermissao(
    req
) {

    const perfil =
        await AuthService
            .obterPerfil(
                req.usuario
            );

    if (
        !perfil?.podeVerValores
    ) {

        const erro =
            new Error(
                "Usuário sem permissão para acessar o painel gerencial."
            );

        erro.status = 403;

        throw erro;

    }

}

class ProdutividadeController {

    async resumo(req, res) {

        try {

            await verificarPermissao(
                req
            );

            const lojas =
                extrairLojas(
                    req
                );

            const resultado =
                await ProdutividadeService
                    .obterResumo(
                        lojas
                    );

            return res.json(
                resultado
            );

        }
        catch (error) {

            console.error(
                "[Produtividade resumo]",
                error
            );

            return res
                .status(
                    error.status || 500
                )
                .json({
                    erro:
                        error.message
                });

        }

    }

    async detalhes(req, res) {

        try {

            await verificarPermissao(
                req
            );

            const {
                periodo
            } = req.params;

            const lojas =
                extrairLojas(
                    req
                );

            const resultado =
                await ProdutividadeService
                    .obterDetalhes(
                        periodo,
                        lojas
                    );

            return res.json(
                resultado
            );

        }
        catch (error) {

            console.error(
                "[Produtividade detalhes]",
                error
            );

            return res
                .status(
                    error.status || 500
                )
                .json({
                    erro:
                        error.message
                });

        }

    }

}

export default new ProdutividadeController();