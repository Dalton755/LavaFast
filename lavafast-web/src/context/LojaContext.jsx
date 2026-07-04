import { createContext, useContext, useEffect, useState } from "react";

import { listarLojas } from "../api/lojas";

const LojaContext = createContext();

const CHAVE = "lavafast.loja";

export function LojaProvider({ children }) {

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

        localStorage.setItem(CHAVE, id);

    }

    return (

        <LojaContext.Provider

            value={{

                lojas,

                loja,

                selecionar

            }}

        >

            {children}

        </LojaContext.Provider>

    );

}

export function useLoja() {

    return useContext(LojaContext);

}