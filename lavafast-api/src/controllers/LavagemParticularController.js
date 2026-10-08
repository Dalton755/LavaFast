import LavagemParticularService from "../services/LavagemParticularService.js";

class LavagemParticularController {

    async listar(req, res) {

        try {

            const lavagens = await LavagemParticularService.listar();

            return res.json(lavagens);

        } catch (error) {

            console.error(error);

            return res.status(500).json({

                sucesso: false,

                erro: error.message

            });

        }

    }

    async criar(req, res) {

        try {

            const lavagem = await LavagemParticularService.criar(

                req.body

            );

            return res.status(201).json({

                sucesso: true,

                mensagem: "Lavagem criada.",

                lavagem

            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({

                sucesso: false,

                erro: error.message

            });

        }

    }


    async reabrir(req, res) {
        try {
            const lavagem = await LavagemParticularService.reabrir(req.params.id);
            return res.json({ sucesso: true, lavagem });
        } catch (error) {
            return res.status(error.status || 500).json({
                sucesso: false,
                erro: error.status === 409 ? error.message : "Não foi possível retornar a lavagem à operação."
            });
        }
    }

    async concluir(req, res) {

        try {

            const { id } = req.params;

            const lavagem = await LavagemParticularService.concluir(id);

            return res.json({

                sucesso: true,

                mensagem: "Lavagem concluída.",

                lavagem

            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({

                sucesso: false,

                erro: error.message

            });

        }

    }

}

export default new LavagemParticularController();