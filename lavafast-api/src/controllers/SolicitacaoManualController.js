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

        if (erro.message === "SOLICITACAO_DUPLICADA") {

            return res.status(409).json({

                sucesso: false,

                erro: "Já existe uma solicitação com esse número."

            });

        }

        return res.status(500).json({

            sucesso: false,

            erro: erro.message

        });

    }

}