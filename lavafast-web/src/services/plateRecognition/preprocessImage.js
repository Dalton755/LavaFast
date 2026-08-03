export function preprocessImage(canvas) {

    const processado = document.createElement("canvas");

    processado.width = canvas.width * 2;
    processado.height = canvas.height * 2;

    const ctx = processado.getContext("2d");

    ctx.drawImage(
        canvas,
        0,
        0,
        processado.width,
        processado.height
    );

    const imageData = ctx.getImageData(
        0,
        0,
        processado.width,
        processado.height
    );

    const pixels = imageData.data;

    for (let i = 0; i < pixels.length; i += 4) {

        const gray =
            pixels[i] * 0.299 +
            pixels[i + 1] * 0.587 +
            pixels[i + 2] * 0.114;

        const value = gray > 140 ? 255 : 0;

        pixels[i] = value;
        pixels[i + 1] = value;
        pixels[i + 2] = value;

    }

    ctx.putImageData(imageData, 0, 0);

    return processado;

}