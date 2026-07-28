import { createContext, useContext, useEffect, useState } from "react";

import { listarLojas } from "../api/lojas";

const LojaContext = createContext();

const CHAVE = "lavafast.loja";
const CHAVE_MULTIPLA = "lavafast.lojas";

export function LojaProvider({ children }) {

    const [lojas, setLojas] = useState([]);

    const [loja, setLoja] = useState(null);

    const [

        lojasSelecionadas,

        setLojasSelecionadas

    ] = useState([]);

    useEffect(() => {

        carregar();

    }, []);

    async function carregar() {

        const dados = await listarLojas();


        setLojas(dados);


        const salva = localStorage.getItem(CHAVE);

        if (salva) {

            const encontrada = dados.find(x => x.id === salva);

            if (encontrada) {

                setLoja(encontrada);

            }

        }

        if (dados.length) {

            setLoja(dados[0]);

        }

        const lojasSalvas = localStorage.getItem(

            CHAVE_MULTIPLA

        );

        if (lojasSalvas) {

            setLojasSelecionadas(

                JSON.parse(lojasSalvas)

            );

        }

        else if (dados.length) {

            setLojasSelecionadas(

                [dados[0].id]

            );

        }

    }

    function selecionar(id) {

        const encontrada = lojas.find(

            x => x.id === id

        );

        setLoja(encontrada);

        localStorage.setItem(CHAVE, id);

    }

    function selecionarLojas(ids) {

        setLojasSelecionadas(ids);

        localStorage.setItem(

            CHAVE_MULTIPLA,

            JSON.stringify(ids)

        );

    }

    return (

        <LojaContext.Provider

            value={{

                lojas,

                loja,

                lojasSelecionadas,

                selecionar,

                selecionarLojas

            }}

        >

            {children}

        </LojaContext.Provider>

    );

}

export function useLoja() {

    return useContext(LojaContext);

}