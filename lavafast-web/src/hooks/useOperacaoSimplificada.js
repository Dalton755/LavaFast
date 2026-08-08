import { useEffect, useState } from "react";

import {
    listarSolicitacoes,
    finalizarSolicitacao
} from "../api/solicitacoes";

import { criarSolicitacaoManual } from "../api/solicitacaoManual";

import { useLoja } from "../context/LojaContext";

export default function useOperacaoSimplificada() {

    const [localiza, setLocaliza] = useState([]);

    const [loading, setLoading] = useState(true);

    const { lojasSelecionadas } = useLoja();

    async function carregar() {

        try {

            if (lojasSelecionadas.length === 0) {

                setLocaliza([]);

                return;

            }

            const dados = await listarSolicitacoes(

                lojasSelecionadas

            );

            setLocaliza(

                dados.filter(

                    item => item.status !== "FINALIZADA"

                )

            );

        } finally {

            setLoading(false);

        }

    }

    useEffect(() => {

        carregar();

    }, [lojasSelecionadas]);

    async function concluirLocaliza(solicitacao) {

        await finalizarSolicitacao(

            solicitacao.id

        );

        carregar();

    }

    async function criarLocalizaManual(dados) {

        try {

            await criarSolicitacaoManual(dados);

            await carregar();

            return true;

        }

        catch (erro) {

            if (erro.response?.status === 409) {

                alert(erro.response.data.erro);

                return false;

            }

            alert("Erro ao criar solicitação.");

            console.error(erro);

            return false;

        }

    }

    return {

        loading,

        localiza,

        concluirLocaliza,

        criarLocalizaManual,

        recarregar: carregar

    };

}