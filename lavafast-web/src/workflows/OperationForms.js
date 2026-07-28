export const OperationForms = {

    SOLICITADO: {

        titulo: "Movimentar veículo",

        botao: "Confirmar movimentação",

        campos: [

            "funcionario"

        ]

    },

    AGUARDANDO: {

        titulo: "Iniciar lavagem",

        botao: "Iniciar lavagem",

        campos: [

            "funcionario",

            "foto_recebimento"

        ]

    },

    EM_LAVAGEM: {

        titulo: "Finalizar lavagem",

        botao: "Finalizar lavagem",

        campos: [

            "funcionarios",

            "foto_frente",

            "foto_traseira",

            "observacao"

        ]

    }

};