import LocalizaGmailPushService, {
    proximaTentativaGmail
} from '../services/LocalizaGmailPushService.js';
import GmailSyncRepository from '../repositories/GmailSyncRepository.js';
import supabase from '../config/supabase.js';

const MEIA_HORA = 30 * 60 * 1000;
let executando = false;
let retentativaAgendada = null;

// Somente a API principal, com GMAIL_RECOVERY_ENABLED=true, executa a
// varredura de seguranca. As outras instancias nao consultam o Gmail.
async function executarRecuperacao() {
    if (executando) return;

    const horaLocal = Number(new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        hourCycle: 'h23'
    }).format(new Date()));

    // Janela operacional definida: nenhuma consulta Gmail entre 00h e 06h.
    if (horaLocal < 6) return;

    executando = true;

    try {
        const estado = await GmailSyncRepository.obter();
        const retentarEm = proximaTentativaGmail(estado?.last_error);

        if (retentarEm && Date.now() < retentarEm + 30_000) {
            console.warn('[GmailRecovery] Gmail limitado; aguardando janela de retentativa.');

            // Apos o desbloqueio, tente de novo sem esperar a proxima meia hora.
            if (!retentativaAgendada) {
                const atraso = Math.max(60_000, retentarEm + 45_000 - Date.now());
                retentativaAgendada = setTimeout(() => {
                    retentativaAgendada = null;
                    executarRecuperacao();
                }, atraso);
                retentativaAgendada.unref?.();
            }
            return;
        }

        const placas = [...new Set(String(process.env.GMAIL_RECOVERY_PLATES || '')
            .split(',')
            .map(placa => placa.trim().toUpperCase())
            .filter(placa => /^[A-Z0-9]{7}$/.test(placa)))];

        if (placas.length) {
            const { data: existentes, error } = await supabase
                .schema('operacoes')
                .from('solicitacoes_lavagem')
                .select('placa')
                .in('placa', placas);

            if (error) throw error;

            const jaCadastradas = new Set((existentes || []).map(item => item.placa));
            const faltantes = placas.filter(placa => !jaCadastradas.has(placa));

            if (faltantes.length) {
                const resposta = await LocalizaGmailPushService.reconciliarPlacas(faltantes);
                console.log('[GmailRecovery] Busca prioritaria:', {
                    faltantes,
                    ...resposta
                });
            }
        }

        const resultado = await LocalizaGmailPushService.reconciliarRecentes();
        console.log('[GmailRecovery] Resultado:', resultado);

        // Nao deixe o watch expirar silenciosamente.
        const expiraEm = Date.parse(estado?.watch_expiration || '');
        if (!Number.isFinite(expiraEm) ||
            expiraEm - Date.now() < 36 * 60 * 60 * 1000) {
            await LocalizaGmailPushService.renovarWatch();
            console.log('[GmailRecovery] Gmail Watch renovado.');
        }
    } catch (erro) {
        console.error('[GmailRecovery] Falha de recuperacao:', erro.message);
        try {
            await GmailSyncRepository.registrarErro(erro);
        } catch (erroAuditoria) {
            console.error('[GmailRecovery] Auditoria indisponivel:', erroAuditoria.message);
        }
    } finally {
        executando = false;
    }
}

export function iniciarGmailRecoveryScheduler() {
    if (process.env.GMAIL_RECOVERY_ENABLED !== 'true') {
        console.log('[GmailRecovery] Desabilitado nesta instancia.');
        return;
    }

    console.log('[GmailRecovery] Ativo somente nesta instancia, a cada 30 minutos.');
    const primeiraExecucao = setTimeout(executarRecuperacao, 75_000);
    const recorrencia = setInterval(executarRecuperacao, MEIA_HORA);
    primeiraExecucao.unref?.();
    recorrencia.unref?.();
}
