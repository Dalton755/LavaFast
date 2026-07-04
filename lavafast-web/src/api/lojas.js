import api from './axios';

export async function listarLojas() {

    const { data } = await api.get('/lojas');

    return data;

}