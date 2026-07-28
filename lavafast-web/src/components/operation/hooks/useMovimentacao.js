import { useState } from "react";

export default function useMovimentacao() {

    const [aberto, setAberto] = useState(false);

    const [solicitacao, setSolicitacao] = useState(null);

    const [funcionario, setFuncionario] = useState("");

    function abrir(solicitacaoSelecionada) {

        setSolicitacao(solicitacaoSelecionada);

        setFuncionario("");

        setAberto(true);

    }

    function fechar() {

        setAberto(false);

        setSolicitacao(null);

        setFuncionario("");

    }

    async function confirmar() {



    }

    return {

        aberto,

        abrir,

        fechar,

        confirmar,

        solicitacao,

        funcionario,

        setFuncionario

    };

}