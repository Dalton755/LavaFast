import * as service from "../services/TipoLavagemService.js";

export async function listar(req, res) {

    try {

        const tipos = await service.listar();

        return res.json(tipos);

    }

    catch (erro) {

        return res.status(500).json({

            erro: erro.message

        });

    }

}