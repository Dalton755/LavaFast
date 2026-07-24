import { useEffect, useState } from "react";

import { listarLojas } from "../api/lojas";

const CHAVE = "lavafast.loja";

export default function useLoja() {

    const [lojas, setLojas] = useState([]);

    const [loja, setLoja] = useState(null);

    useEffect(() => {

        carregar();

    }, []);

    async function carregar() {

        console.log("Carregando lojas...");

        const dados = await listarLojas();

        console.log("RETORNO listarLojas:", dados);

        console.log("Resposta da API:", dados);

        setLojas(dados);

        const salva = localStorage.getItem(CHAVE);

        console.log("LocalStorage:", salva);

        if (salva) {

            const encontrada = dados.find(

                x => x.id === salva

            );

            console.log("Loja encontrada:", encontrada);

            if (encontrada) {

                setLoja(encontrada);

                return;

            }

        }

        if (dados.length) {

            console.log("Selecionando primeira loja:", dados[0]);

            setLoja(dados[0]);

        }

    }

    function selecionar(id) {

        const encontrada = lojas.find(

            x => x.id === id

        );

        setLoja(encontrada);

        localStorage.setItem(

            CHAVE,

            id

        );

    }

    return {

        lojas,

        loja,

        selecionar

    };

}