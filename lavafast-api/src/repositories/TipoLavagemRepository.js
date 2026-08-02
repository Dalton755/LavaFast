import supabase from "../config/supabase.js";

export async function listarTiposLavagem() {

    const { data, error } = await supabase
        .schema("operacoes")
        .from("tipos_lavagem")
        .select("*")
        .order("valor_minimo");

    if (error) throw error;

    return data;

}