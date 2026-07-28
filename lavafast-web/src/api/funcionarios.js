import api from "./axios";

export async function listarFuncionariosAtivos() {

    const { data } = await api.get("/funcionarios/ativos");

    return data;

}