import { captureFrame } from "./captureFrame";
import { reconhecerPlaca } from "../lprService";

function esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function canvasToBlob(canvas) {

    return new Promise(resolve => {

        canvas.toBlob(

            blob => resolve(blob),

            "image/jpeg",

            0.95

        );

    });

}

export async function watchPlate(video, onDetected) {

    let ativo = true;

    while (ativo) {

        if (!video.videoWidth) {

            await esperar(300);
            continue;

        }

        try {

            const canvas = captureFrame(video);

            const blob = await canvasToBlob(canvas);

            const resultado = await reconhecerPlaca(blob);

            console.log("OCR:", resultado);

            if (

                resultado &&
                resultado.placa &&
                resultado.confidence >= 95

            ) {

                ativo = false;

                onDetected(resultado.placa);

                return;

            }

        }

        catch (erro) {

            console.error("Erro OCR:", erro);

        }

        await esperar(500);

    }

}