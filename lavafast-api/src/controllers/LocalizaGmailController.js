import LocalizaGmailPushService from '../services/LocalizaGmailPushService.js';

function autorizadoAdministrativo(req) {
    const authorization = req.get('authorization') || '';
    const adminSecret = process.env.GMAIL_ADMIN_SECRET;
    const cronSecret = process.env.CRON_SECRET;
    const secretHeader = req.get('x-lavafast-secret') || '';

    if (adminSecret && secretHeader === adminSecret) {
        return true;
    }

    if (cronSecret && authorization === `Bearer ${cronSecret}`) {
        return true;
    }

    return false;
}

class LocalizaGmailController {

    async webhook(req, res) {
        const tokenEsperado = process.env.GMAIL_PUBSUB_TOKEN;
        const tokenRecebido = String(req.query.token || '');

        if (!tokenEsperado) {
            return res.status(503).json({
                sucesso: false,
                mensagem: 'GMAIL_PUBSUB_TOKEN não configurado.'
            });
        }

        if (tokenRecebido !== tokenEsperado) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Webhook não autorizado.'
            });
        }

        try {
            const data = req.body?.message?.data;

            if (!data) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Pub/Sub sem message.data.'
                });
            }

            const notificacao = JSON.parse(
                Buffer.from(data, 'base64').toString('utf8')
            );

            const resultado = await LocalizaGmailPushService.sincronizarNotificacao(
                notificacao.historyId
            );

            return res.status(200).json({
                sucesso: true,
                emailAddress: notificacao.emailAddress,
                ...resultado
            });
        } catch (erro) {
            console.error('[GmailPush][Webhook]', erro);

            // Pub/Sub repetirá a entrega em respostas não-2xx.
            return res.status(500).json({
                sucesso: false,
                mensagem: erro.message
            });
        }
    }

    async inicializar(req, res) {
        if (!autorizadoAdministrativo(req)) {
            return res.status(401).json({ sucesso: false });
        }

        try {
            const resultado = await LocalizaGmailPushService.inicializar();
            return res.json({ sucesso: true, ...resultado });
        } catch (erro) {
            console.error('[GmailPush][Inicializar]', erro);
            return res.status(500).json({
                sucesso: false,
                mensagem: erro.message
            });
        }
    }

    async renovarWatch(req, res) {
        if (!autorizadoAdministrativo(req)) {
            return res.status(401).json({ sucesso: false });
        }

        try {
            const watch = await LocalizaGmailPushService.renovarWatch();
            const reconciliacao = await LocalizaGmailPushService.reconciliarRecentes();

            return res.json({
                sucesso: true,
                watch,
                reconciliacao
            });
        } catch (erro) {
            console.error('[GmailPush][Watch]', erro);
            return res.status(500).json({
                sucesso: false,
                mensagem: erro.message
            });
        }
    }

    async reconciliar(req, res) {
        if (!autorizadoAdministrativo(req)) {
            return res.status(401).json({ sucesso: false });
        }

        try {
            const resultado = await LocalizaGmailPushService.reconciliarRecentes();
            return res.json({ sucesso: true, ...resultado });
        } catch (erro) {
            console.error('[GmailPush][Reconciliacao]', erro);
            return res.status(500).json({
                sucesso: false,
                mensagem: erro.message
            });
        }
    }

    async status(req, res) {
        if (!autorizadoAdministrativo(req)) {
            return res.status(401).json({ sucesso: false });
        }

        try {
            const estado = await LocalizaGmailPushService.status();
            return res.json({ sucesso: true, estado });
        } catch (erro) {
            return res.status(500).json({
                sucesso: false,
                mensagem: erro.message
            });
        }
    }
}

export default new LocalizaGmailController();
