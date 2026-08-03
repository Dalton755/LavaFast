import Tesseract from "tesseract.js";
import { preprocessImage } from "./preprocessImage";

export async function runOCR(canvas) {

    const imagem = preprocessImage(canvas);

    const resultado = await Tesseract.recognize(

        imagem,

        "eng",

        {
            logger: () => {}
        }

    );

    return {

        texto: resultado.data.text
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, ""),

        confidence: resultado.data.confidence,

        symbols: resultado.data.symbols

    };

}