import api from './axios';

export async function listarSolicitacoes(lojas) {

    const { data } = await api.get('/solicitacoes', {

        params: {

            lojas: lojas.join(",")

        }

    });

    return data;

}

export async function listarSolicitacoesConcluidas(
    pagina = 1,
    limite = 50,
    filtros = {}
) {

    const { data } = await api.get(
        "/solicitacoes/concluidas",
        {
            params: {
                pagina,
                limite,

                placa:
                    filtros.placa || "",

                dataInicial:
                    filtros.dataInicial || "",

                dataFinal:
                    filtros.dataFinal || "",

                tipoLavagem:
                    filtros.tipoLavagem || "",

                loja:
                    filtros.loja || "",

                origem:
                    filtros.origem || ""
            }
        }
    );

    return data;
}

export async function movimentarSolicitacao(

    solicitacaoId,

    dados

) {

    const response = await api.put(

        `/solicitacoes/${solicitacaoId}/movimentar`,

        dados

    );

    return response.data;

}

export async function iniciarSolicitacao(id) {

    const { data } = await api.put(

        `/solicitacoes/${id}/iniciar`

    );

    return data;

}

export async function finalizarSolicitacao(id) {

    const { data } = await api.put(

        `/solicitacoes/${id}/finalizar`

    );

    return data;

}

export async function iniciarLavagem(

    solicitacaoId,

    dados

) {

    const response = await api.put(

        `/solicitacoes/${solicitacaoId}/iniciar`,

        dados

    );

    return response.data;

}

export async function finalizarLavagem(

    solicitacaoId,

    dados

) {

    const response = await api.put(

        `/solicitacoes/${solicitacaoId}/finalizar`,

        dados

    );

    return response.data;

}

export async function listarSolicitacoesConcluidasExportacao(
    filtros = {}
) {

    const { data } = await api.get(
        "/solicitacoes/concluidas/exportacao",
        {
            params: {
                placa:
                    filtros.placa || "",

                dataInicial:
                    filtros.dataInicial || "",

                dataFinal:
                    filtros.dataFinal || "",

                tipoLavagem:
                    filtros.tipoLavagem || "",

                loja:
                    filtros.loja || "",

                origem:
                    filtros.origem || ""
            }
        }
    );

    return data;
}

export async function obterResumoSolicitacoesConcluidas(
    filtros = {}
) {

    const { data } = await api.get(
        "/solicitacoes/concluidas/resumo",
        {
            params: {
                placa:
                    filtros.placa || "",

                dataInicial:
                    filtros.dataInicial || "",

                dataFinal:
                    filtros.dataFinal || "",

                tipoLavagem:
                    filtros.tipoLavagem || "",

                loja:
                    filtros.loja || "",

                origem:
                    filtros.origem || ""
            }
        }
    );

    return data;
}

