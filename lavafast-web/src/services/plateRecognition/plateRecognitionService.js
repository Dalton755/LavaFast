import { captureFrame } from "./captureFrame";
import { reconhecerPlaca } from "../lprService";

function canvasToBlob(canvas) {

    return new Promise(resolve => {

        canvas.toBlob(

            blob => resolve(blob),

            "image/jpeg",

            0.95

        );

    });

}

export async function recognizePlate(video) {

    const canvas = captureFrame(video);

    const blob = await canvasToBlob(canvas);

    return await reconhecerPlaca(blob);

}