import supabase from '../config/supabase.js';

const SOURCE = 'LOCALIZA';

class GmailSyncRepository {

    async obter() {
        const { data, error } = await supabase
            .schema('operacoes')
            .from('gmail_sync_state')
            .select('*')
            .eq('source', SOURCE)
            .maybeSingle();

        if (error) {
            throw error;
        }

        return data;
    }

    async salvar(campos) {
        const agora = new Date().toISOString();

        const { data, error } = await supabase
            .schema('operacoes')
            .from('gmail_sync_state')
            .upsert({
                source: SOURCE,
                ...campos,
                updated_at: agora
            }, {
                onConflict: 'source'
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    }

    async registrarWatch({ historyId, expiration, emailAddress, labelId }) {
        const atual = await this.obter();
        const expirationNumber = Number(expiration);

        return this.salvar({
            history_id: atual?.history_id || String(historyId),
            watch_expiration: Number.isFinite(expirationNumber)
                ? new Date(expirationNumber).toISOString()
                : null,
            email_address: emailAddress || atual?.email_address || null,
            label_id: labelId || atual?.label_id || null,
            last_watch_at: new Date().toISOString(),
            last_error: null
        });
    }

    async registrarSincronizacao(historyId, notificationHistoryId = null) {
        return this.salvar({
            history_id: String(historyId),
            last_notification_history_id: notificationHistoryId
                ? String(notificationHistoryId)
                : null,
            last_sync_at: new Date().toISOString(),
            last_error: null
        });
    }

    async registrarReconciliacao() {
        return this.salvar({
            last_reconciliation_at: new Date().toISOString(),
            last_error: null
        });
    }

    async registrarErro(erro) {
        return this.salvar({
            last_error: String(erro?.message || erro || 'Erro desconhecido').slice(0, 4000)
        });
    }
}

export default new GmailSyncRepository();
