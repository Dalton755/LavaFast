import { useEffect, useState } from "react";
import { listarFuncionariosAtivos } from "../api/funcionarios";

export default function useFuncionarios() {

    const [funcionarios, setFuncionarios] = useState([]);

    useEffect(() => {

        async function carregar() {

            const dados = await listarFuncionariosAtivos();

            setFuncionarios(dados);

        }

        carregar();

    }, []);

    return {

        funcionarios

    };

}