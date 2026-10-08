import {
    criarWatch,
    listarEmails,
    listarHistorico,
    obterCabecalhos,
    obterEmail,
    obterLabelId,
    obterTextoEmail
} from './gmail/gmail.js';

import { parseLocaliza } from './localiza/parser.js';
import { LOJAS } from './localiza/maps.js';
import SolicitacaoRepository from '../repositories/SolicitacaoRepository.js';
import ImportacaoEmailRepository from '../repositories/ImportacaoEmailRepository.js';
import GmailSyncRepository from '../repositories/GmailSyncRepository.js';
import { obterTipoLavagemPorValor } from '../repositories/TipoLavagemRepository.js';
import STATUS from '../constants/status.js';

const LABEL_NAME = process.env.GMAIL_LOCALIZA_LABEL || 'LOCALIZA_LAVAGEM';

function valorParaNumero(valor) {
    const numero = Number(
        String(valor || '')
            .replace(/R\$/gi, '')
            .replace(/\./g, '')
            .replace(',', '.')
            .trim()
    );

    if (!Number.isFinite(numero)) {
        throw new Error(`Valor de lavagem inválido: ${valor}`);
    }

    return numero;
}

function dataRecebimento(email) {
    const timestamp = Number(email?.internalDate);

    if (Number.isFinite(timestamp) && timestamp > 0) {
        return new Date(timestamp).toISOString();
    }

    return new Date().toISOString();
}

function isHistoryExpiredError(erro) {
    const status = Number(
        erro?.code ||
        erro?.response?.status ||
        erro?.status
    );

    return status === 404;
}

// Gmail pode bloquear chamadas por alguns minutos quando a cota do usuario acaba.
// Nao insista antes do horario informado: isso preserva a cota para a operacao.
export function proximaTentativaGmail(erroOuTexto) {
    const texto = String(erroOuTexto?.message || erroOuTexto || '');
    const match = texto.match(/Retry after\\s+(\\d{4}-\\d{2}-\\d{2}T[\\d:.+-]+Z?)/i);
    if (!match) return null;

    const instante = Date.parse(match[1]);
    return Number.isFinite(instante) ? instante : null;
}

function erroLimiteGmail(erro) {
    const texto = String(erro?.message || erro || '');
    const status = Number(erro?.code || erro?.response?.status || erro?.status);
    return status === 429 ||
        /rate.?limit|quota.exceeded|too many requests|GMAIL_BACKOFF/i.test(texto);
}

class LocalizaGmailPushService {

    async processarMensagem(messageId, gmailHistoryId = null) {
        const existente = await ImportacaoEmailRepository.buscarPorMessageId(messageId);

        if (existente?.status === 'PROCESSADO') {
            return {
                messageId,
                status: 'JA_PROCESSADO',
                importados: 0,
                ignorados: 1
            };
        }

        let importacaoIniciada = false;

        try {
            const email = await obterEmail(messageId);
            const cabecalhos = obterCabecalhos(email);
            const recebidoEm = dataRecebimento(email);

            await ImportacaoEmailRepository.iniciar({
                messageId,
                assunto: cabecalhos.assunto,
                remetente: cabecalhos.remetente,
                gmailHistoryId,
                recebidoEm
            });

            importacaoIniciada = true;

            const texto = await obterTextoEmail(messageId, email);

            if (!texto) {
                throw new Error('E-mail da Localiza sem conteúdo de texto processável.');
            }

            const dados = parseLocaliza(texto);

            if (!dados?.veiculos?.length) {
                throw new Error('Nenhuma solicitação/placa foi encontrada no e-mail da Localiza.');
            }

            const codigoAgencia = String(dados.agencia || '').trim().toUpperCase();
            const lojaId = LOJAS[codigoAgencia];

            if (!lojaId) {
                throw new Error(`Agência da Localiza não mapeada: ${codigoAgencia || '(vazia)'}`);
            }

            let importados = 0;
            let ignorados = 0;

            for (const veiculo of dados.veiculos) {
                const numeroSolicitacao = Number(veiculo.numeroSolicitacao);

                if (!Number.isFinite(numeroSolicitacao)) {
                    throw new Error(`Número de solicitação inválido: ${veiculo.numeroSolicitacao}`);
                }

                const placa = String(veiculo.placa || '')
                    .trim()
                    .toUpperCase()
                    .replace('-', '');

                if (!placa) {
                    throw new Error(`Placa ausente na solicitação ${numeroSolicitacao}.`);
                }

                const existe = await SolicitacaoRepository.existePorNumero(numeroSolicitacao);

                if (existe) {
                    ignorados++;
                    continue;
                }

                const valor = valorParaNumero(veiculo.valor);
                const tipoLavagem = await obterTipoLavagemPorValor(valor);

                try {
                    await SolicitacaoRepository.criar({
                        numero_solicitacao: numeroSolicitacao,
                        placa,
                        fornecedor: dados.fornecedor || 'LOCALIZA',
                        responsavel_localiza: dados.responsavel || null,
                        loja_id: lojaId,
                        codigo_agencia: codigoAgencia,
                        valor,
                        tipo_lavagem_id: tipoLavagem.id,
                        origem: 'LOCALIZA',
                        status: STATUS.SOLICITADO,
                        recebida_em: recebidoEm
                    });

                    importados++;
                } catch (erro) {
                    if (String(erro?.code) === '23505') {
                        ignorados++;
                        continue;
                    }

                    throw erro;
                }
            }

            await ImportacaoEmailRepository.concluir(messageId, {
                numeroReferencia: Number(dados.veiculos[0]?.numeroSolicitacao) || null,
                quantidadeRegistros: importados
            });

            return {
                messageId,
                status: 'PROCESSADO',
                importados,
                ignorados
            };
        } catch (erro) {
            try {
                if (!importacaoIniciada) {
                    await ImportacaoEmailRepository.iniciar({
                        messageId,
                        gmailHistoryId
                    });
                }

                await ImportacaoEmailRepository.marcarErro(messageId, erro);
            } catch (erroAuditoria) {
                console.error('[GmailPush][Auditoria]', erroAuditoria);
            }

            throw erro;
        }
    }

    async renovarWatch() {
        const watch = await criarWatch({
            labelName: LABEL_NAME
        });

        await GmailSyncRepository.registrarWatch({
            historyId: watch.historyId,
            expiration: watch.expiration,
            emailAddress: watch.emailAddress,
            labelId: watch.labelId
        });

        return {
            ativo: true,
            emailAddress: watch.emailAddress,
            expiration: watch.expiration,
            labelId: watch.labelId
        };
    }

    async inicializar() {
        const estado = await GmailSyncRepository.obter();

        if (!estado?.history_id || !estado?.label_id) {
            await this.renovarWatch();
        }

        const reconciliacao = await this.reconciliarRecentes();
        const estadoAtual = await GmailSyncRepository.obter();

        return {
            inicializado: true,
            reconciliacao,
            estado: estadoAtual
        };
    }

    async reconciliarRecentes() {
        // Checa o limite ANTES da chamada Gmail, inclusive quando o Pub/Sub
        // continuar tentando entregar a mesma notificacao.
        const estado = await GmailSyncRepository.obter();
        const retentarEm = proximaTentativaGmail(estado?.last_error);

        if (retentarEm && Date.now() < retentarEm + 30_000) {
            const erro = new Error(
                `GMAIL_BACKOFF: Retry after ${new Date(retentarEm).toISOString()}`
            );
            erro.code = 'GMAIL_BACKOFF';
            throw erro;
        }

        // Procura pelo marcador OU remetente: mensagens nao rotuladas
        // tambem precisam chegar ao app.
        const pesquisa = `{label:${LABEL_NAME} from:no-reply@localiza.com} newer_than:4d`;
        let mensagens;

        try {
            mensagens = await listarEmails({ query: pesquisa, limite: 250 });
        } catch (erro) {
            if (erroLimiteGmail(erro)) {
                await GmailSyncRepository.registrarErro(erro);
            }
            throw erro;
        }

        const statusPorId = await ImportacaoEmailRepository.listarStatusPorMessageIds(
            mensagens.map(item => item.id)
        );
        const finalizados = new Set(['PROCESSADO', 'SUCESSO', 'IMPORTADO', 'DUPLICADO']);
        const pendentes = mensagens.filter(item => !finalizados.has(statusPorId.get(item.id)));

        let importados = 0;
        let ignorados = mensagens.length - pendentes.length;
        let erros = 0;
        let processados = 0;

        // Uma rodada limitada impede tempestades de chamadas e preserva
        // a operacao. Os demais e-mails entram nas proximas rodadas.
        for (const mensagem of pendentes.slice(0, 15)) {
            try {
                const resultado = await this.processarMensagem(mensagem.id);
                importados += resultado.importados || 0;
                ignorados += resultado.ignorados || 0;
                processados++;
            } catch (erro) {
                erros++;
                console.error('[GmailPush][Reconciliacao]', mensagem.id, erro.message);

                if (erroLimiteGmail(erro)) {
                    await GmailSyncRepository.registrarErro(erro);
                    throw erro; // Nao tenta os demais enquanto a cota estiver bloqueada.
                }
            }
        }

        await GmailSyncRepository.registrarReconciliacao();

        return {
            encontrados: mensagens.length,
            pendentes: pendentes.length,
            processados,
            importados,
            ignorados,
            erros
        };
    }

    async sincronizarNotificacao(notificationHistoryId) {
        if (!notificationHistoryId) {
            throw new Error('Notificação do Gmail sem historyId.');
        }

        let estado = await GmailSyncRepository.obter();

        if (!estado?.history_id || !estado?.label_id) {
            await this.inicializar();
            estado = await GmailSyncRepository.obter();
        }

        // Evita repetidas leituras de historico durante bloqueio por cota.
        const retentarEm = proximaTentativaGmail(estado?.last_error);
        if (retentarEm && Date.now() < retentarEm + 30_000) {
            const erro = new Error(
                `GMAIL_BACKOFF: Retry after ${new Date(retentarEm).toISOString()}`
            );
            erro.code = 'GMAIL_BACKOFF';
            throw erro;
        }

        try {
            const historico = await listarHistorico({
                startHistoryId: estado.history_id,
                labelId: estado.label_id || await obterLabelId(LABEL_NAME)
            });

            let importados = 0;
            let ignorados = 0;

            for (const messageId of historico.messageIds) {
                const resultado = await this.processarMensagem(
                    messageId,
                    notificationHistoryId
                );

                importados += resultado.importados || 0;
                ignorados += resultado.ignorados || 0;
            }

            const novoHistoryId = historico.historyId || notificationHistoryId;

            await GmailSyncRepository.registrarSincronizacao(
                novoHistoryId,
                notificationHistoryId
            );

            return {
                processados: historico.messageIds.length,
                importados,
                ignorados,
                historyId: novoHistoryId
            };
        } catch (erro) {
            if (isHistoryExpiredError(erro)) {
                const reconciliacao = await this.reconciliarRecentes();
                const watch = await criarWatch({
                    labelName: LABEL_NAME
                });

                await GmailSyncRepository.registrarWatch({
                    historyId: watch.historyId,
                    expiration: watch.expiration,
                    emailAddress: watch.emailAddress,
                    labelId: watch.labelId
                });

                await GmailSyncRepository.registrarSincronizacao(
                    watch.historyId,
                    notificationHistoryId
                );

                return {
                    recuperado: true,
                    motivo: 'HISTORY_ID_EXPIRADO',
                    reconciliacao,
                    historyId: watch.historyId
                };
            }

            await GmailSyncRepository.registrarErro(erro);
            throw erro;
        }
    }

    async status() {
        return GmailSyncRepository.obter();
    }
}

export default new LocalizaGmailPushService();
