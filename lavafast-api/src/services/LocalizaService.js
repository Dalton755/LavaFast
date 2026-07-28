import supabase from '../config/supabase.js';

class LocalizaService {

    async importar(solicitacao) {



        const { data: loja, error: erroLoja } = await supabase
            .schema('operacoes')
            .from('lojas')
            .select('*')
            .eq('codigo', solicitacao.codigoAgencia)
            .single();

        if (erroLoja || !loja) {

            throw new Error(
                `Loja não encontrada para o código ${solicitacao.codigoAgencia}`
            );

        }


        const { data: tipoLavagem, error: erroTipo } = await supabase
            .schema('operacoes')
            .from('tipos_lavagem')
            .select('*')
            .lte('valor_minimo', solicitacao.valor)
            .gte('valor_maximo', solicitacao.valor)
            .eq('ativo', true)
            .single();

        if (erroTipo || !tipoLavagem) {

            throw new Error(
                `Nenhum tipo de lavagem encontrado para o valor ${solicitacao.valor}`
            );

        }


        // Verifica se a solicitação já existe
        const { data: solicitacaoExistente, error: erroConsulta } = await supabase
            .schema('operacoes')
            .from('solicitacoes_lavagem')
            .select('id')
            .eq('numero_solicitacao', solicitacao.numeroSolicitacao)
            .maybeSingle();

        if (erroConsulta) {

            throw erroConsulta;

        }

        if (solicitacaoExistente) {

            return {

                sucesso: false,

                mensagem: 'Solicitação já importada.'

            };

        }

        const { data: novaSolicitacao, error: erroInsert } = await supabase
            .schema('operacoes')
            .from('solicitacoes_lavagem')
            .insert({

                numero_solicitacao: solicitacao.numeroSolicitacao,

                placa: solicitacao.placa,

                fornecedor: solicitacao.fornecedor,

                responsavel_localiza: solicitacao.responsavel,

                loja_id: loja.id,

                valor: solicitacao.valor,

                tipo_lavagem_id: tipoLavagem.id,

                origem: 'LOCALIZA',

                status: 'AGUARDANDO',

                recebida_em: solicitacao.dataSolicitacao,

                codigo_agencia: solicitacao.codigoAgencia,

                created_at: new Date().toISOString(),

                updated_at: new Date().toISOString()

            })
            .select()
            .single();

        if (erroInsert) {

            throw erroInsert;

        }

        return {

            sucesso: true,

            mensagem: 'Solicitação importada com sucesso.',

            solicitacao: novaSolicitacao

        };

    }

}

export default new LocalizaService();