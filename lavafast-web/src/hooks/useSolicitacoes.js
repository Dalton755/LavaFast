import { useEffect, useState, useCallback } from 'react';

import { listarSolicitacoes } from '../api/solicitacoes';

import {

    movimentarSolicitacao,

    iniciarSolicitacao,

    finalizarSolicitacao

} from '../api/solicitacoes';

import { useLoja } from "../context/LojaContext";

import useRealtimeSolicitacoes from "./useRealtimeSolicitacoes";



export default function useSolicitacoes() {

    const [solicitacoes, setSolicitacoes] = useState([]);

    const [loading, setLoading] = useState(true);

    const { loja } = useLoja();

    const carregar = useCallback(async () => {

        console.log("RECARREGANDO...");

        try {

            if (!loja) return;

            const dados = await listarSolicitacoes(loja.id);

            console.log("Loja:", loja);

            console.log("Dados:", dados);

            setSolicitacoes(dados);

        } finally {

            setLoading(false);

        }

    }, [loja]);

    useEffect(() => {

        if (loja) {

            carregar();

        }

    }, [loja]);

    async function executarAcao(solicitacao) {

        let resposta;

        switch (solicitacao.status) {

            case "SOLICITADO":

                resposta = await movimentarSolicitacao(

                    solicitacao.id

                );

                break;

            case "AGUARDANDO":

                resposta = await iniciarSolicitacao(

                    solicitacao.id

                );

                break;

            case "EM_LAVAGEM":

                resposta = await finalizarSolicitacao(

                    solicitacao.id

                );

                break;

            default:

                return;

        }

        const solicitacaoAtualizada = resposta.solicitacao;

        setSolicitacoes(atual =>

            atual.map(item =>

                item.id === solicitacaoAtualizada.id

                    ? {

                        ...item,

                        ...solicitacaoAtualizada

                    }

                    : item

            )

        );

    }

    useRealtimeSolicitacoes(carregar);

    return {

        solicitacoes,

        loading,

        recarregar: carregar,

        executarAcao

    };

}

