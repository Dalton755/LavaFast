import { captureFrames } from "./captureFrames";
import { runOCR } from "./runOCR";
import { voteCharacters } from "./voteCharacters";

export async function recognizePlate(video) {

    // Captura vários frames
    const frames = await captureFrames(video);

    // Executa OCR em todos os frames em paralelo
    const resultados = await Promise.all(

        frames.map(frame => runOCR(frame))

    );

    console.table(resultados);

    // Faz a votação
    const placa = voteCharacters(resultados);

    return placa;

}