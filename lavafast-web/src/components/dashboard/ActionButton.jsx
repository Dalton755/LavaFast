import WORKFLOW from "../../workflows/OperationWorkflow";

export default function ActionButton({

    solicitacao,

    onAction

}) {

    const botao = WORKFLOW[solicitacao.status];

    return (

        <button

            onClick={() => onAction?.(solicitacao)}

            className={`

                w-full

                h-12

                rounded-xl

                text-white

                font-semibold

                transition-all

                duration-300

                ${botao.cor}

            `}

        >

            {botao.botao}

        </button>

    );

}