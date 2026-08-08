import supabase from "../config/supabase.js";

export async function criarSolicitacaoManual(dados) {


    const { data: existente, error: erroConsulta } = await supabase
        .schema("operacoes")
        .from("solicitacoes_lavagem")
        .select("id")
        .eq("numero_solicitacao", dados.numero_solicitacao)
        .maybeSingle();

    if (erroConsulta) {

        throw erroConsulta;

    }

    if (existente) {

        throw new Error("SOLICITACAO_DUPLICADA");

    }


    const { data, error } = await supabase
        .schema("operacoes")
        .from("solicitacoes_lavagem")
        .insert({

            numero_solicitacao: dados.numero_solicitacao,

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