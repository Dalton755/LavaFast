import * as service from "../services/SolicitacaoManualService.js";

export async function criar(req, res) {

    try {

        const solicitacao = await service.criar(req.body);

        return res.json({

            sucesso: true,

            solicitacao

        });

    }

    catch (erro) {

        return res.status(500).json({

            sucesso: false,

            erro: erro.message

        });

    }

}