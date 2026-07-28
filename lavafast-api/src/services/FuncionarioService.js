import FuncionarioRepository from "../repositories/FuncionarioRepository.js";

class FuncionarioService {

    async listarAtivos() {

        return await FuncionarioRepository.listarAtivos();

    }

}

export default new FuncionarioService();