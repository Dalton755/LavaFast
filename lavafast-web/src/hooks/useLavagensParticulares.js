import { useCallback, useEffect, useState } from "react";

import {

    listarLavagensParticulares,

    criarLavagemParticular,

    concluirLavagemParticular

} from "../api/lavagensParticulares";

export default function useLavagensParticulares() {

    const [lavagens, setLavagens] = useState([]);

    const [loading, setLoading] = useState(true);

    const carregar = useCallback(async () => {

        try {

            const dados = await listarLavagensParticulares();

            setLavagens(dados);

        } finally {

            setLoading(false);

        }

    }, []);

    useEffect(() => {

        carregar();

    }, [carregar]);

    async function criar(dados) {

        const resposta = await criarLavagemParticular(dados);

        setLavagens(atual => [

            resposta.lavagem,

            ...atual

        ]);

    }

    async function concluir(id) {

        await concluirLavagemParticular(id);

        setLavagens(atual =>

            atual.filter(

                item => item.id !== id

            )

        );

    }

    return {

        lavagens,

        loading,

        criar,

        concluir,

        recarregar: carregar

    };

}