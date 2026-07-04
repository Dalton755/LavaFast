import api from './axios';

export async function listarSolicitacoes(lojaId) {

    const { data } = await api.get('/solicitacoes', {

        params: {

            loja: lojaId

        }

    });

    return data;

}

export async function movimentarSolicitacao(id) {

    const { data } = await api.put(

        `/solicitacoes/${id}/movimentar`

    );

    return data;

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