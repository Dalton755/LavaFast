import { API_BASE_URL } from "../api/axios";

export async function reconhecerPlaca(imagem) {
    const form = new FormData();
    form.append("imagem", imagem, "placa.jpg");

    // Usa a mesma API das demais telas (sem duplicar o prefixo /api).
    const resposta = await fetch(`${API_BASE_URL}/lpr`, {
        method: "POST",
        body: form
    });

    const dados = await resposta.json().catch(() => null);

    if (!resposta.ok) {
        throw new Error(
            dados?.message ||
            dados?.error ||
            "Nao foi possivel reconhecer a placa."
        );
    }

    return dados;
}
