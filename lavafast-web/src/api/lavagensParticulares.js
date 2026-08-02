import api from "./axios";

export async function listarLavagensParticulares() {

    const { data } = await api.get(
        "/lavagens-particulares"
    );

    return data;

}

export async function criarLavagemParticular(dados) {

    const { data } = await api.post(
        "/lavagens-particulares",
        dados
    );

    return data;

}

export async function concluirLavagemParticular(id) {

    const { data } = await api.put(
        `/lavagens-particulares/${id}/concluir`
    );

    return data;

}