import LojaService from '../services/LojaService.js';

class LojaController {

    async listar(req, res) {

        try {

            const lojas = await LojaService.listar();

            return res.json(lojas);

        }

        catch (erro) {

            console.error(erro);

            return res.status(500).json({

                erro: erro.message

            });

        }

    }

}

export default new LojaController();