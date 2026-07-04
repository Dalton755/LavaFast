import LocalizaService from '../services/LocalizaService.js';

class LocalizaController {

    async importar(req, res) {

        try {

            const resultado = await LocalizaService.importar(req.body);

            return res.status(201).json(resultado);

        } catch (erro) {

            console.error(erro);

            return res.status(500).json({
                sucesso: false,
                mensagem: erro.message
            });

        }

    }

}

export default new LocalizaController();