import STATUS from '../constants/status.js';

class WorkflowService {

    constructor() {

    this.transicoes = {

        [STATUS.SOLICITADO]: [

            STATUS.AGUARDANDO

        ],

        [STATUS.AGUARDANDO]: [

            STATUS.EM_LAVAGEM

        ],

        [STATUS.EM_LAVAGEM]: [

            STATUS.FINALIZADA,

            STATUS.CANCELADA

        ],

        [STATUS.FINALIZADA]: [],

        [STATUS.CANCELADA]: []

    };

}

    validar(statusAtual, novoStatus) {

        const permitidos = this.transicoes[statusAtual] || [];

        return permitidos.includes(novoStatus);

    }

}

export default new WorkflowService();