import {
    useEffect,
    useState
} from "react";

import {
    listarSolicitacoesConcluidas
} from "../api/solicitacoes";

export default function useSolicitacoesConcluidas(
    filtros = {}
) {

    const [concluidas, setConcluidas] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [pagina, setPagina] =
        useState(1);

    const [total, setTotal] =
        useState(0);

    const [totalPaginas, setTotalPaginas] =
        useState(1);

    const limite = 50;

    const placa =
        filtros.placa || "";

    const dataInicial =
        filtros.dataInicial || "";

    const dataFinal =
        filtros.dataFinal || "";

    const tipoLavagem =
        filtros.tipoLavagem || "";

    const loja =
        filtros.loja || "";

    const origem =
        filtros.origem || "";

    async function carregar(
        paginaDesejada
    ) {

        try {

            setLoading(true);

            const resposta =
                await listarSolicitacoesConcluidas(
                    paginaDesejada,
                    limite,
                    {
                        placa,
                        dataInicial,
                        dataFinal,
                        tipoLavagem,
                        loja,
                        origem
                    }
                );

            setConcluidas(
                Array.isArray(
                    resposta?.dados
                )
                    ? resposta.dados
                    : []
            );

            setTotal(
                resposta?.total || 0
            );

            setTotalPaginas(
                resposta?.totalPaginas || 1
            );

        }

        catch (erro) {

            console.error(
                "Erro ao carregar concluídos:",
                erro
            );

            setConcluidas([]);
            setTotal(0);
            setTotalPaginas(1);

        }

        finally {

            setLoading(false);

        }

    }

    /*
     * Quando qualquer filtro mudar,
     * volta para a página 1.
     *
     * Pequeno debounce evita uma chamada
     * para cada tecla digitada na placa.
     */
    useEffect(() => {

        setPagina(1);

        const timer =
            setTimeout(
                () => {

                    carregar(1);

                },
                300
            );

        return () =>
            clearTimeout(timer);

    }, [
        placa,
        dataInicial,
        dataFinal,
        tipoLavagem,
        loja,
        origem
    ]);

    /*
     * Mudança manual de página.
     */
    useEffect(() => {

        if (pagina === 1) {
            return;
        }

        carregar(pagina);

    }, [pagina]);

    function proximaPagina() {

        setPagina(
            atual =>
                Math.min(
                    atual + 1,
                    totalPaginas
                )
        );

    }

    function paginaAnterior() {

        setPagina(
            atual =>
                Math.max(
                    1,
                    atual - 1
                )
        );

    }

    function irParaPagina(
        novaPagina
    ) {

        const paginaValida =
            Math.min(
                Math.max(
                    1,
                    Number(novaPagina) || 1
                ),
                totalPaginas
            );

        setPagina(
            paginaValida
        );

    }

    return {

        concluidas,
        loading,

        pagina,
        total,
        totalPaginas,

        proximaPagina,
        paginaAnterior,
        irParaPagina,

        recarregar: () =>
            carregar(pagina)

    };

}