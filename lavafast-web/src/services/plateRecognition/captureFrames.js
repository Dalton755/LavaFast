export async function captureFrames(
    video,
    quantidade = 8,
    intervalo = 120
) {

    const frames = [];

    for (let i = 0; i < quantidade; i++) {

        const canvas = document.createElement("canvas");

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");

        ctx.drawImage(
            video,
            0,
            0,
            canvas.width,
            canvas.height
        );

        frames.push(canvas);

        await new Promise(resolve =>
            setTimeout(resolve, intervalo)
        );

    }

    return frames;

}