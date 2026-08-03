import { captureFrames } from "./captureFrames";
import { runOCR } from "./runOCR";
import { voteCharacters } from "./voteCharacters";

function esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function watchPlate(video, onDetected) {

    const historico = [];

    let ativo = true;

    while (ativo) {

        // Captura um conjunto de frames
        const frames = await captureFrames(video);

        // OCR
        const resultados = await Promise.all(
            frames.map(frame => runOCR(frame))
        );

        // Melhor placa encontrada nesta rodada
        const placa = voteCharacters(resultados);

        if (placa) {

            historico.push(placa);

            if (historico.length > 5) {
                historico.shift();
            }

            console.log("Histórico:", historico);

            const ocorrencias = historico.filter(
                p => p === placa
            ).length;

            if (ocorrencias >= 4) {

                ativo = false;

                onDetected(placa);

                return;

            }

        }

        await esperar(200);

    }

}