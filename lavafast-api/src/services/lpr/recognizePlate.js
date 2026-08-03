import Tesseract from "tesseract.js";

export async function recognizePlate(imagePath) {

    const resultado = await Tesseract.recognize(
        imagePath,
        "eng",
        {
            logger: m => console.log(m)
        }
    );

    return {
        texto: resultado.data.text,
        confidence: resultado.data.confidence
    };

}