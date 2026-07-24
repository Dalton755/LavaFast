import SolicitacaoService from '../services/SolicitacaoService.js';

class SolicitacaoController {

    async listar(req, res) {

        try {

            const inicio = Date.now();

            const { loja } = req.query;

            const dados = await SolicitacaoService.listar(loja);

            console.log("");
            console.log("========== PERFORMANCE ==========");
            console.log(
                "GET /solicitacoes:",
                Date.now() - inicio,
                "ms"
            );
            console.log("================================");
            console.log("");

            return res.json(dados);

        } catch (error) {

            console.error(error);

            return res.status(500).json({

                erro: error.message

            });

        }

    }

    async movimentar(req, res) {

        try {

            const { id } = req.params;

            const resultado = await SolicitacaoService.movimentar(id);

            return res.json({

                sucesso: true,

                mensagem: 'Solicitação movimentada.',

                solicitacao: resultado

            });

        } catch (error) {

            return res.status(400).json({

                sucesso: false,

                erro: error.message

            });

        }

    }

    async iniciar(req, res) {

        try {

            const { id } = req.params;

            const solicitacao = await SolicitacaoService.iniciar(id);

            return res.json({

                sucesso: true,

                mensagem: 'Lavagem iniciada.',

                solicitacao

            });

        } catch (error) {

            return res.status(400).json({

                sucesso: false,

                erro: error.message

            });

        }

    }

    async finalizar(req, res) {

        try {

            const { id } = req.params;

            const solicitacao = await SolicitacaoService.finalizar(id);

            return res.json({

                sucesso: true,

                mensagem: 'Lavagem finalizada.',

                solicitacao

            });

        } catch (error) {

            return res.status(400).json({

                sucesso: false,

                erro: error.message

            });

        }

    }

    async importarLocaliza(req, res) {

        try {

            const resultado = await SolicitacaoService.importarDaLocaliza();

            return res.json({

                sucesso: true,

                ...resultado

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

export default new SolicitacaoController();