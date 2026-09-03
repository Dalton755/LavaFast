import supabase from "../config/supabase.js";

export async function listarTiposLavagem() {

    const { data, error } = await supabase
        .schema("operacoes")
        .from("tipos_lavagem")
        .select("*")
        .eq("ativo", true)
        .order("valor_minimo");

    if (error) throw error;

    return data;

}

export async function obterTipoLavagemPorValor(valor) {

    const numero = Number(valor);

    if (!Number.isFinite(numero)) {

        throw new Error(
            `Valor de lavagem inválido: ${valor}`
        );

    }

    const { data, error } = await supabase
        .schema("operacoes")
        .from("tipos_lavagem")
        .select("*")
        .eq("ativo", true)
        .lte("valor_minimo", numero)
        .gte("valor_maximo", numero)
        .order("valor_minimo")
        .limit(1)
        .maybeSingle();

    if (error) throw error;

    if (!data) {

        throw new Error(
            `Nenhum tipo de lavagem configurado para o valor R$ ${numero.toFixed(2)}`
        );

    }

    return data;

}

export async function obterTipoLavagemPorId(id) {

    if (!id) return null;

    const { data, error } = await supabase
        .schema("operacoes")
        .from("tipos_lavagem")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (error) throw error;

    return data;

}

export async function obterTiposLavagemPorIds(ids) {

    const idsValidos = [
        ...new Set(
            ids.filter(Boolean)
        )
    ];

    if (idsValidos.length === 0) {

        return [];

    }

    const {
        data,
        error
    } = await supabase

        .schema("operacoes")

        .from("tipos_lavagem")

        .select(`
            id,
            nome,
            cor
        `)

        .in(
            "id",
            idsValidos
        );

    if (error) {

        throw error;

    }

    return data || [];

}