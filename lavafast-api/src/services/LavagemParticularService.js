import LavagemParticularRepository from "../repositories/LavagemParticularRepository.js";

class LavagemParticularService {

    async listar() {

        return await LavagemParticularRepository.listar();

    }

    async criar(dados) {

        return await LavagemParticularRepository.criar(dados);

    }

    async concluir(id) {

        return await LavagemParticularRepository.concluir(id);

    }

}

export default new LavagemParticularService();