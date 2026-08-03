export async function reconhecerPlaca(imagem) {

    const form = new FormData();

    form.append("file", imagem);

    const resposta = await fetch(

        `${import.meta.env.VITE_API_URL}/api/lpr`,

        {
            method: "POST",
            body: form
        }

    );

    if (!resposta.ok) {

        return null;

    }

    return await resposta.json();

}