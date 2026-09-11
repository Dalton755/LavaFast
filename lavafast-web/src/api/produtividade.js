import api
    from "./axios";

export async function obterProdutividade(
    lojas = []
) {

    const {
        data
    } = await api.get(
        "/produtividade",
        {
            params: {
                lojas:
                    lojas.join(",")
            }
        }
    );

    return data;

}

export async function obterDetalhesProdutividade(
    periodo,
    lojas = []
) {

    const {
        data
    } = await api.get(
        `/produtividade/${periodo}`,
        {
            params: {
                lojas:
                    lojas.join(",")
            }
        }
    );

    return data;

}