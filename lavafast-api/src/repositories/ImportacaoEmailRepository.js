import supabase from '../config/supabase.js';

class ImportacaoEmailRepository {

    async buscarPorMessageId(messageId) {
        const { data, error } = await supabase
            .schema('operacoes')
            .from('importacoes_email')
            .select('*')
            .eq('message_id', messageId)
            .maybeSingle();

        if (error) {
            throw error;
        }

        return data;
    }

    async iniciar({
        messageId,
        assunto,
        remetente,
        gmailHistoryId,
        recebidoEm
    }) {
        const existente = await this.buscarPorMessageId(messageId);
        const agora = new Date().toISOString();

        const dados = {
            message_id: messageId,
            status: 'PROCESSANDO',
            erro: null,
            assunto: assunto || existente?.assunto || null,
            remetente: remetente || existente?.remetente || null,
            tipo_importacao: 'GMAIL_PUSH',
            gmail_history_id: gmailHistoryId || existente?.gmail_history_id || null,
            recebido_em: recebidoEm || existente?.recebido_em || null,
            tentativas: Number(existente?.tentativas || 0) + 1,
            processado_em: agora,
            updated_at: agora
        };

        const consulta = supabase
            .schema('operacoes')
            .from('importacoes_email');

        const { data, error } = existente
            ? await consulta
                .update(dados)
                .eq('message_id', messageId)
                .select()
                .single()
            : await consulta
                .insert(dados)
                .select()
                .single();

        if (error) {
            throw error;
        }

        return data;
    }

    async concluir(messageId, {
        numeroReferencia = null,
        quantidadeRegistros = 0
    } = {}) {
        const agora = new Date().toISOString();

        const { data, error } = await supabase
            .schema('operacoes')
            .from('importacoes_email')
            .update({
                status: 'PROCESSADO',
                erro: null,
                numero_referencia: numeroReferencia,
                quantidade_registros: quantidadeRegistros,
                processado_em: agora,
                updated_at: agora
            })
            .eq('message_id', messageId)
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    }

    async marcarErro(messageId, erro) {
        const agora = new Date().toISOString();

        const { data, error } = await supabase
            .schema('operacoes')
            .from('importacoes_email')
            .update({
                status: 'ERRO',
                erro: String(erro?.message || erro || 'Erro desconhecido').slice(0, 4000),
                processado_em: agora,
                updated_at: agora
            })
            .eq('message_id', messageId)
            .select()
            .maybeSingle();

        if (error) {
            throw error;
        }

        return data;
    }
}

export default new ImportacaoEmailRepository();
