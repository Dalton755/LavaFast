export async function reconhecerPlaca(imagem) {

    console.log("Enviando imagem para API...");

    const form = new FormData();
    form.append("imagem", imagem);

    const resposta = await fetch(
        `${import.meta.env.VITE_API_URL}/api/lpr`,
        {
            method: "POST",
            body: form
        }
    );

    console.log("Status:", resposta.status);

    const dados = await resposta.json();

    console.log("Resposta da API:", dados);

    return dados;
}