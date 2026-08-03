import Tesseract from "tesseract.js";

export async function runOCR(canvas) {

    // Cria um novo canvas para melhorar a imagem
    const processado = document.createElement("canvas");

    processado.width = canvas.width * 2;
    processado.height = canvas.height * 2;

    const ctx = processado.getContext("2d");

    // Aumenta a resolução
    ctx.drawImage(
        canvas,
        0,
        0,
        processado.width,
        processado.height
    );

    // Obtém os pixels
    const imagem = ctx.getImageData(
        0,
        0,
        processado.width,
        processado.height
    );

    const pixels = imagem.data;

    // Escala de cinza + aumento de contraste
    for (let i = 0; i < pixels.length; i += 4) {

        const cinza =
            pixels[i] * 0.299 +
            pixels[i + 1] * 0.587 +
            pixels[i + 2] * 0.114;

        const contraste =
            cinza > 140 ? 255 : 0;

        pixels[i] = contraste;
        pixels[i + 1] = contraste;
        pixels[i + 2] = contraste;

    }

    ctx.putImageData(imagem, 0, 0);


    const resultado = await Tesseract.recognize(
        processado,
        "eng",
        {
            tessedit_char_whitelist:
                "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",

            logger: () => { }
        }
    );

    return {

        texto: resultado.data.text
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, ""),

        confidence: resultado.data.confidence

    };

}