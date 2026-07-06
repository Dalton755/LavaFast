import {

    listarEmails,

    obterTextoEmail

} from './gmail/gmail.js';

import {

    parseLocaliza

} from './localiza/parser.js';

import SolicitacaoRepository from '../repositories/SolicitacaoRepository.js';
import {
    LOJAS,
    obterTipoLavagem
} from './localiza/maps.js';

import STATUS from '../constants/status.js';
import WorkflowService from './WorkflowService.js';

class SolicitacaoService {

    async listar(lojaId) {

        return await SolicitacaoRepository.listar(lojaId);

    }

    async movimentar(id) {

        const solicitacao = await SolicitacaoRepository.buscarPorId(id);

        if (!WorkflowService.validar(
            solicitacao.status,
            STATUS.AGUARDANDO
        )) {

            throw new Error(
                'Esta solicitação não pode ser movimentada.'
            );

        }

        return await SolicitacaoRepository.atualizar(id, {

            status: STATUS.AGUARDANDO

        });

    }

    async iniciar(id) {

        const solicitacao = await SolicitacaoRepository.buscarPorId(id);

        if (!WorkflowService.validar(
            solicitacao.status,
            STATUS.EM_LAVAGEM
        )) {

            throw new Error(
                'Esta solicitação não pode ser iniciada.'
            );

        }

        return await SolicitacaoRepository.atualizar(id, {

            status: STATUS.EM_LAVAGEM,

            iniciada_em: new Date().toISOString()

        });

    }

    async finalizar(id) {

        const solicitacao = await SolicitacaoRepository.buscarPorId(id);

        if (!WorkflowService.validar(

            solicitacao.status,

            STATUS.FINALIZADA

        )) {

            throw new Error(

                'Esta solicitação não pode ser finalizada.'

            );

        }

        return await SolicitacaoRepository.atualizar(id, {

            status: STATUS.FINALIZADA,

            finalizada_em: new Date().toISOString()

        });

    }



    async importarDaLocaliza() {

        const emails = await listarEmails();
        console.log("Emails recebidos do Gmail:", emails.length);

        let importados = 0;

        let ignorados = 0;

        let erros = 0;

        for (const email of emails) {
            console.log("Processando email:", email.id);

            try {

                const texto = await obterTextoEmail(email.id);



                if (!texto) {

                    continue;

                }

                const dados = parseLocaliza(texto);
                console.log("Parser:", dados ? "OK" : "FALHOU");

                console.log("SEM TEXTO:", email.id);

                if (!dados) {

                    continue;

                }

                console.log("Texto encontrado.");

                for (const veiculo of dados.veiculos) {

                    const existe =

                        await SolicitacaoRepository.existePorNumero(

                            Number(

                                veiculo.numeroSolicitacao

                            )

                        );
                    console.log(
                        "Solicitação",
                        veiculo.numeroSolicitacao,
                        existe ? "JÁ EXISTE" : "NÃO EXISTE"
                    );

                    if (existe) {

                        ignorados++;

                        continue;

                    }

                    await SolicitacaoRepository.criar({

                        numero_solicitacao:

                            Number(

                                veiculo.numeroSolicitacao

                            ),

                        placa:

                            veiculo.placa,

                        fornecedor:

                            dados.fornecedor,

                        responsavel_localiza:

                            dados.responsavel,

                        loja_id:

                            LOJAS[dados.agencia],

                        codigo_agencia:

                            dados.agencia,

                        valor:

                            Number(

                                veiculo.valor

                                    .replace(".", "")

                                    .replace(",", ".")

                            ),

                        tipo_lavagem_id:

                            obterTipoLavagem(

                                veiculo.valor

                            ),

                        origem:

                            "LOCALIZA",

                        status:

                            STATUS.SOLICITADO,

                        recebida_em:

                            new Date().toISOString()

                    });

                    importados++;

                }

            }

            catch (err) {

                console.error(err);

                erros++;

            }

        }

        return {

            importados,

            ignorados,

            erros

        };

    }

}

export default new SolicitacaoService();