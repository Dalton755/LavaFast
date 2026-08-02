import api from "./axios";

export async function criarSolicitacaoManual(dados) {

    const { data } = await api.post(

        "/solicitacoes/manual",

        dados

    );

    return data;

}