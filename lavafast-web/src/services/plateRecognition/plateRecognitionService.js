import { captureFrame } from "./captureFrame";
import { runOCR } from "./runOCR";
import { voteCharacters } from "./voteCharacters";

export async function recognizePlate(video) {

    // Captura apenas um frame
    const frame = captureFrame(video);

    // Executa OCR
    const resultados = await Promise.all(
    frame.map(frame => runOCR(frame))
);

    // A votação recebe um array
    const placa = voteCharacters(resultados);

    return placa;

}