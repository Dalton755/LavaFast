import FuncionarioService from "../services/FuncionarioService.js";

class FuncionarioController {

    async listarAtivos(req, res) {

        try {

            const funcionarios = await FuncionarioService.listarAtivos();

            return res.json(funcionarios);

        }

        catch (error) {

            return res.status(500).json({

                erro: error.message

            });

        }

    }

}

export default new FuncionarioController();