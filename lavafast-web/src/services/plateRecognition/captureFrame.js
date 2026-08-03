export function captureFrame(video) {

    const canvas = document.createElement("canvas");

    const larguraVideo = video.videoWidth;
    const alturaVideo = video.videoHeight;

    const guiaLargura = 320;
    const guiaAltura = 110;

    const escalaX = larguraVideo / video.clientWidth;
    const escalaY = alturaVideo / video.clientHeight;

    const esquerda = (video.clientWidth - guiaLargura) / 2;
    const topo = (video.clientHeight - guiaAltura) / 2;

    const sx = esquerda * escalaX;
    const sy = topo * escalaY;
    const sw = guiaLargura * escalaX;
    const sh = guiaAltura * escalaY;

    canvas.width = sw;
    canvas.height = sh;

    const ctx = canvas.getContext("2d");

    ctx.drawImage(
        video,
        sx,
        sy,
        sw,
        sh,
        0,
        0,
        sw,
        sh
    );

    return canvas;

}