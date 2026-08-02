import supabase from "../config/supabase.js";

export async function criarSolicitacaoManual(dados) {

    const numeroSolicitacao = Date.now();

    const { data, error } = await supabase
        .schema("operacoes")
        .from("solicitacoes_lavagem")
        .insert({

            numero_solicitacao: numeroSolicitacao,

            placa: dados.placa,

            loja_id: dados.loja_id,

            tipo_lavagem_id: dados.tipo_lavagem_id,

            fornecedor: dados.fornecedor,

            responsavel_localiza: dados.responsavel_localiza,

            valor: dados.valor,

            observacao: dados.observacao,

            origem: "MANUAL",

            status: "AGUARDANDO",

            recebida_em: new Date()

        })
        .select()
        .single();

    if (error) throw error;

    return data;

}