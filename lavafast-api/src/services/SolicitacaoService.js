import {
    listarEmails,
    obterTextoEmail
} from './gmail/gmail.js';

import {
    parseLocaliza
} from './localiza/parser.js';

import SolicitacaoRepository from '../repositories/SolicitacaoRepository.js';
import {
    LOJAS
} from './localiza/maps.js';

import {
    obterTipoLavagemPorValor,
    listarTiposLavagem
} from '../repositories/TipoLavagemRepository.js';

import STATUS from '../constants/status.js';
import WorkflowService from './WorkflowService.js';
import LavagemParticularRepository from '../repositories/LavagemParticularRepository.js';
import LojaService from './LojaService.js';

class SolicitacaoService {

    async listar(lojas) {

        const lojasSelecionadas =

            lojas

                ? lojas.split(",")

                : [];

        return await SolicitacaoRepository.listar(

            lojasSelecionadas

        );

    }

    async movimentar(id, funcionarioId) {


        const solicitacao = await SolicitacaoRepository.buscarPorId(id);

        if (!WorkflowService.validar(
            solicitacao.status,
            STATUS.AGUARDANDO
        )) {

            throw new Error(
                'Esta solicitação não pode ser movimentada.'
            );

        }

        const resultado = await SolicitacaoRepository.atualizar(

            id,

            {

                status: STATUS.AGUARDANDO,

                funcionario_movimentacao_id: funcionarioId,

                movimentada_em: new Date()

            }

        );


        return resultado;

    }

    async iniciar(id, funcionarioId) {

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

            iniciada_em: new Date().toISOString(),

            funcionario_id: funcionarioId,

        });

    }

    async finalizar(id) {

        const solicitacao = await SolicitacaoRepository.buscarPorId(id);

        switch (solicitacao.status) {

            case STATUS.SOLICITADO:

                await SolicitacaoRepository.atualizar(id, {

                    status: STATUS.AGUARDANDO

                });

            // continua

            case STATUS.AGUARDANDO:

                await SolicitacaoRepository.atualizar(id, {

                    status: STATUS.EM_LAVAGEM,

                    iniciada_em: new Date().toISOString()

                });

            // continua

            case STATUS.EM_LAVAGEM:

                return await SolicitacaoRepository.atualizar(id, {

                    status: STATUS.FINALIZADA,

                    finalizada_em: new Date().toISOString()

                });

            case STATUS.FINALIZADA:

                return solicitacao;

            default:

                throw new Error("Status inválido.");

        }

    }

    async listarConcluidas(
        pagina = 1,
        limite = 50,
        filtros = {}
    ) {

        pagina = Number(pagina) || 1;
        limite = Number(limite) || 50;

        if (pagina < 1) {
            pagina = 1;
        }

        if (limite < 1) {
            limite = 50;
        }

        if (limite > 100) {
            limite = 100;
        }

        const placa =
            String(
                filtros.placa || ""
            )
                .trim()
                .toUpperCase();

        const dataInicial =
            String(
                filtros.dataInicial || ""
            ).trim();

        const dataFinal =
            String(
                filtros.dataFinal || ""
            ).trim();

        const tipoLavagem =
            String(
                filtros.tipoLavagem || ""
            ).trim();

        const loja =
            String(
                filtros.loja || ""
            ).trim();

        const origem =
            String(
                filtros.origem || ""
            )
                .trim()
                .toUpperCase();

        const inicio =
            (pagina - 1) * limite;

        const limiteBusca =
            pagina * limite;

        /*
         * Tipos são necessários tanto para
         * resolver o filtro quanto para montar
         * o nome exibido no resultado.
         *
         * Lojas só são carregadas quando
         * existe filtro por loja.
         */
        const [
            tipos,
            lojas
        ] = await Promise.all([

            listarTiposLavagem(),

            loja
                ? LojaService.listar()
                : Promise.resolve([])

        ]);

        let tipoLavagemId = null;

        if (tipoLavagem) {

            const tipoEncontrado =
                tipos.find(
                    tipo =>
                        String(tipo.nome) ===
                        tipoLavagem
                );

            /*
             * O filtro informado não corresponde
             * a nenhum tipo cadastrado.
             */
            if (!tipoEncontrado) {

                return {
                    dados: [],
                    pagina,
                    limite,
                    total: 0,
                    totalPaginas: 1
                };

            }

            tipoLavagemId =
                tipoEncontrado.id;

        }

        let lojaId = null;

        if (loja) {

            const lojaEncontrada =
                lojas.find(item => {

                    return (
                        String(
                            item.nome || ""
                        ) === loja ||

                        String(
                            item.codigo || ""
                        ) === loja
                    );

                });

            /*
             * O filtro informado não corresponde
             * a nenhuma loja cadastrada.
             */
            if (!lojaEncontrada) {

                return {
                    dados: [],
                    pagina,
                    limite,
                    total: 0,
                    totalPaginas: 1
                };

            }

            lojaId =
                lojaEncontrada.id;

        }

        const filtrosBanco = {

            placa,

            dataInicial,

            dataFinal,

            tipoLavagemId,

            lojaId

        };

        /*
         * Origem define quais tabelas precisam
         * realmente ser consultadas.
         */
        const buscarLocaliza =
            !origem ||
            origem === "LOCALIZA";

        /*
         * lavagens_avulsas não possui
         * loja_id nem tipo_lavagem_id.
         *
         * Portanto uma busca por loja ou tipo
         * não pode retornar PARTICULAR.
         */
        const buscarParticulares =
            (
                !origem ||
                origem === "PARTICULAR"
            ) &&
            !loja &&
            !tipoLavagem;

        const [
            resultadoLocaliza,
            resultadoParticulares
        ] = await Promise.all([

            buscarLocaliza
                ? SolicitacaoRepository
                    .listarConcluidasPaginadas(
                        limiteBusca,
                        filtrosBanco
                    )
                : Promise.resolve({
                    dados: [],
                    total: 0
                }),

            buscarParticulares
                ? LavagemParticularRepository
                    .listarConcluidasPaginadas(
                        limiteBusca,
                        filtrosBanco
                    )
                : Promise.resolve({
                    dados: [],
                    total: 0
                })

        ]);

        const mapaTipos =
            new Map(
                tipos.map(tipo => [
                    String(tipo.id),
                    tipo
                ])
            );

        const normalizar = (
            item,
            origemItem
        ) => {

            const tipo =
                item.tipo_lavagem_id
                    ? mapaTipos.get(
                        String(
                            item.tipo_lavagem_id
                        )
                    )
                    : null;

            return {

                ...item,

                origem:
                    origemItem,

                tipo_lavagem:
                    tipo?.nome ?? "-",

                tipo_lavagem_cor:
                    tipo?.cor ?? null

            };

        };

        const resultadoCompleto = [

            ...resultadoLocaliza.dados.map(
                item =>
                    normalizar(
                        item,
                        "LOCALIZA"
                    )
            ),

            ...resultadoParticulares.dados.map(
                item =>
                    normalizar(
                        item,
                        "PARTICULAR"
                    )
            )

        ].sort(

            (a, b) =>
                new Date(
                    b.finalizada_em
                ) -
                new Date(
                    a.finalizada_em
                )

        );

        const dados =
            resultadoCompleto.slice(
                inicio,
                inicio + limite
            );

        const total =
            resultadoLocaliza.total +
            resultadoParticulares.total;

        return {

            dados,

            pagina,

            limite,

            total,

            totalPaginas:
                Math.max(
                    1,
                    Math.ceil(
                        total / limite
                    )
                )

        };

    }

    async listarConcluidasExportacao(
        filtros = {}
    ) {

        const placa =
            String(
                filtros.placa || ""
            )
                .trim()
                .toUpperCase();

        const dataInicial =
            String(
                filtros.dataInicial || ""
            ).trim();

        const dataFinal =
            String(
                filtros.dataFinal || ""
            ).trim();

        const tipoLavagem =
            String(
                filtros.tipoLavagem || ""
            ).trim();

        const loja =
            String(
                filtros.loja || ""
            ).trim();

        const origem =
            String(
                filtros.origem || ""
            )
                .trim()
                .toUpperCase();

        const [
            tipos,
            lojas
        ] = await Promise.all([

            listarTiposLavagem(),

            loja
                ? LojaService.listar()
                : Promise.resolve([])

        ]);

        let tipoLavagemId = null;

        if (tipoLavagem) {

            const tipoEncontrado =
                tipos.find(
                    tipo =>
                        String(tipo.nome) ===
                        tipoLavagem
                );

            if (!tipoEncontrado) {

                return {
                    dados: [],
                    quantidade: 0,
                    valorTotal: 0
                };

            }

            tipoLavagemId =
                tipoEncontrado.id;
        }

        let lojaId = null;

        if (loja) {

            const lojaEncontrada =
                lojas.find(
                    item =>
                        String(
                            item.nome || ""
                        ) === loja ||
                        String(
                            item.codigo || ""
                        ) === loja
                );

            if (!lojaEncontrada) {

                return {
                    dados: [],
                    quantidade: 0,
                    valorTotal: 0
                };

            }

            lojaId =
                lojaEncontrada.id;
        }

        const filtrosBanco = {
            placa,
            dataInicial,
            dataFinal,
            tipoLavagemId,
            lojaId
        };

        const buscarLocaliza =
            !origem ||
            origem === "LOCALIZA";

        const buscarParticular =
            (
                !origem ||
                origem === "PARTICULAR"
            ) &&
            !loja &&
            !tipoLavagem;

        const [
            localiza,
            particulares
        ] = await Promise.all([

            buscarLocaliza
                ? SolicitacaoRepository
                    .listarConcluidasParaExportacao(
                        filtrosBanco
                    )
                : Promise.resolve([]),

            buscarParticular
                ? LavagemParticularRepository
                    .listarConcluidasParaExportacao(
                        filtrosBanco
                    )
                : Promise.resolve([])

        ]);

        const mapaTipos =
            new Map(
                tipos.map(tipo => [
                    String(tipo.id),
                    tipo
                ])
            );

        const normalizar = (
            item,
            origemItem
        ) => {

            const tipo =
                item.tipo_lavagem_id
                    ? mapaTipos.get(
                        String(
                            item.tipo_lavagem_id
                        )
                    )
                    : null;

            return {
                ...item,

                origem:
                    origemItem,

                tipo_lavagem:
                    tipo?.nome ?? "-",

                tipo_lavagem_cor:
                    tipo?.cor ?? null
            };
        };

        const dados = [

            ...localiza.map(
                item =>
                    normalizar(
                        item,
                        "LOCALIZA"
                    )
            ),

            ...particulares.map(
                item =>
                    normalizar(
                        item,
                        "PARTICULAR"
                    )
            )

        ].sort(
            (a, b) =>
                new Date(
                    b.finalizada_em
                ) -
                new Date(
                    a.finalizada_em
                )
        );

        const valorTotal =
            dados.reduce(
                (soma, item) =>
                    soma +
                    (
                        Number(
                            item.valor
                        ) || 0
                    ),
                0
            );

        return {
            dados,
            quantidade:
                dados.length,
            valorTotal
        };
    }

    async obterResumoConcluidas(
        filtros = {}
    ) {

        const relatorio =
            await this.listarConcluidasExportacao(
                filtros
            );

        return {
            quantidade:
                relatorio.quantidade || 0,

            valorTotal:
                relatorio.valorTotal || 0
        };
    }

    async importarDaLocaliza() {

        const emails = await listarEmails();

        let importados = 0;

        let ignorados = 0;

        let erros = 0;

        for (const email of emails) {

            try {

                const texto = await obterTextoEmail(email.id);



                if (!texto) {

                    continue;

                }

                const dados = parseLocaliza(texto);


                if (!dados) {

                    continue;

                }


                for (const veiculo of dados.veiculos) {

                    const existe =

                        await SolicitacaoRepository.existePorNumero(

                            Number(

                                veiculo.numeroSolicitacao

                            )

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

                            (
                                await obterTipoLavagemPorValor(
                                    Number(
                                        veiculo.valor
                                            .replace(".", "")
                                            .replace(",", ".")
                                    )
                                )
                            ).id,

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