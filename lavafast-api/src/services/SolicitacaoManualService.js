import {

    criarSolicitacaoManual

} from "../repositories/SolicitacaoManualRepository.js";

export async function criar(dados) {

    return await criarSolicitacaoManual(dados);

}