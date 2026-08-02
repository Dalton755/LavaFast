import api from "./axios";

export async function listarTiposLavagem() {

    const { data } = await api.get(

        "/tipos-lavagem"

    );

    return data;

}