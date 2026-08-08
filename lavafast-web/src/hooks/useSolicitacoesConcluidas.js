import { useEffect, useState } from "react";

import {
    listarSolicitacoesConcluidas
} from "../api/solicitacoes";

export default function useSolicitacoesConcluidas() {

    const [concluidas, setConcluidas] = useState([]);

    const [loading, setLoading] = useState(true);

    async function carregar() {

        try {

            setLoading(true);

            const dados =
                await listarSolicitacoesConcluidas();

            setConcluidas(
                Array.isArray(dados)
                    ? dados
                    : []
            );

        }

        catch (erro) {

            console.error(
                "Erro ao carregar concluídos:",
                erro
            );

            setConcluidas([]);

        }

        finally {

            setLoading(false);

        }

    }

    useEffect(() => {

        carregar();

    }, []);

    return {

        concluidas,

        loading,

        recarregar: carregar

    };

}