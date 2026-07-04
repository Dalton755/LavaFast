const WORKFLOW = {

    SOLICITADO: {

        proximo: "AGUARDANDO",

        botao: "Movimentar",

        endpoint: "/movimentar",

        cor: "bg-slate-700 hover:bg-slate-800"

    },

    AGUARDANDO: {

        proximo: "EM_LAVAGEM",

        botao: "Iniciar Lavagem",

        endpoint: "/iniciar",

        cor: "bg-amber-500 hover:bg-amber-600"

    },

    EM_LAVAGEM: {

        proximo: "FINALIZADA",

        botao: "Finalizar",

        endpoint: "/finalizar",

        cor: "bg-blue-600 hover:bg-blue-700"

    },

    FINALIZADA: {

        proximo: null,

        botao: "Ver detalhes",

        endpoint: null,

        cor: "bg-slate-900 hover:bg-black"

    }

};

export default WORKFLOW;