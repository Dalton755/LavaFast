import axios from "axios";
import FormData from "form-data";
import fs from "fs";

const LPR_URL = "http://127.0.0.1:8000/ocr";

export async function reconhecerPlacaPython(caminhoImagem) {

    const form = new FormData();

    form.append(
        "file",
        fs.createReadStream(caminhoImagem)
    );

    const resposta = await axios.post(

        LPR_URL,

        form,

        {
            headers: form.getHeaders(),
            timeout: 30000
        }

    );

    return resposta.data;

}