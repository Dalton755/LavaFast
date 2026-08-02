import {

    listarTiposLavagem

} from "../repositories/TipoLavagemRepository.js";

export async function listar() {

    return await listarTiposLavagem();

}