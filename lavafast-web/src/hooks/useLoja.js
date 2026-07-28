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


        const dados = await listarLojas();



        setLojas(dados);

        const salva = localStorage.getItem(CHAVE);


        if (salva) {

            const encontrada = dados.find(

                x => x.id === salva

            );


            if (encontrada) {

                setLoja(encontrada);

                return;

            }

        }

        if (dados.length) {


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