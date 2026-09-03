import SolicitacaoService from '../services/SolicitacaoService.js';

class SolicitacaoController {

    async listar(req, res) {

        try {

            const inicio = Date.now();

            const { lojas } = req.query;

            const dados = await SolicitacaoService.listar(lojas);



            return res.json(dados);

        } catch (error) {

            console.error(error);

            return res.status(500).json({

                erro: error.message

            });

        }

    }

    async listarConcluidas(req, res) {

        try {

            const {
                pagina = 1,
                limite = 50,
                placa = "",
                dataInicial = "",
                dataFinal = "",
                tipoLavagem = "",
                loja = "",
                origem = ""
            } = req.query;

            const resultado =
                await SolicitacaoService
                    .listarConcluidas(
                        pagina,
                        limite,
                        {
                            placa,
                            dataInicial,
                            dataFinal,
                            tipoLavagem,
                            loja,
                            origem
                        }
                    );

            return res.json(
                resultado
            );

        }

        catch (error) {

            console.error(error);

            return res.status(500).json({

                erro: error.message

            });

        }

    }

    async exportarConcluidas(req, res) {

        try {

            const {
                placa = "",
                dataInicial = "",
                dataFinal = "",
                tipoLavagem = "",
                loja = "",
                origem = ""
            } = req.query;

            const resultado =
                await SolicitacaoService
                    .listarConcluidasExportacao({
                        placa,
                        dataInicial,
                        dataFinal,
                        tipoLavagem,
                        loja,
                        origem
                    });

            return res.json(
                resultado
            );

        }

        catch (error) {

            console.error(error);

            return res.status(500).json({
                erro: error.message
            });

        }
    }

    async resumoConcluidas(req, res) {

        try {

            const {
                placa = "",
                dataInicial = "",
                dataFinal = "",
                tipoLavagem = "",
                loja = "",
                origem = ""
            } = req.query;

            const resultado =
                await SolicitacaoService
                    .obterResumoConcluidas({
                        placa,
                        dataInicial,
                        dataFinal,
                        tipoLavagem,
                        loja,
                        origem
                    });

            return res.json(
                resultado
            );

        }

        catch (error) {

            console.error(error);

            return res.status(500).json({
                erro: error.message
            });

        }
    }

    async movimentar(req, res) {

        const { funcionario } = req.body;

        try {

            const { id } = req.params;


            const resultado = await SolicitacaoService.movimentar(

                id,

                funcionario

            );


            return res.json({

                sucesso: true,

                mensagem: 'Solicitação movimentada.',

                solicitacao: resultado

            });

        } catch (error) {

            console.error(error);

            return res.status(400).json({

                sucesso: false,

                erro: error.message

            });

        }

    }

    async iniciar(req, res) {

        try {

            const { id } = req.params;

            const { funcionario } = req.body;

            const solicitacao = await SolicitacaoService.iniciar(

                id,

                funcionario

            );

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