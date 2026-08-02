import { useEffect, useState } from "react";
import { listarTiposLavagem } from "../api/tiposLavagem";

export default function useTiposLavagem() {

    const [tipos, setTipos] = useState([]);

    useEffect(() => {

        async function carregar() {

            const dados = await listarTiposLavagem();

            setTipos(dados);

        }

        carregar();

    }, []);

    return {

        tipos

    };

}