class OperationWorkflowService {

    executar(solicitacao, actions) {

        switch (solicitacao.status) {

            case "SOLICITADO":

                actions.abrirMovimentacao?.(solicitacao);

                break;

            case "AGUARDANDO":

                actions.abrirInicio?.(solicitacao);

                break;

            case "EM_LAVAGEM":

                actions.abrirFinalizacao?.(solicitacao);

                break;

            default:

                break;

        }

    }

}

export default new OperationWorkflowService();