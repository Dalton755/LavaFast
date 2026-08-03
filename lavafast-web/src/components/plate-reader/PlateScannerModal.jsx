import { useEffect, useRef } from "react";
import Tesseract from "tesseract.js";

export default function PlateScannerModal({

    aberto,

    fechar

}) {

    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    useEffect(() => {

        if (!aberto) return;

        let stream;

        async function iniciarCamera() {

            try {

                const constraints = {

                    audio: false,

                    video: {

                        facingMode: "environment"

                    }

                };

                stream = await navigator.mediaDevices.getUserMedia(constraints);

                videoRef.current.srcObject = stream;

                await videoRef.current.play();

            }

            catch (erro) {

                console.error(erro);

                alert(`${erro.name}\n\n${erro.message}`);

            }

        }

        iniciarCamera();

        return () => {

            if (stream) {

                stream.getTracks().forEach(track => track.stop());

            }

        };

    }, [aberto]);

    async function capturarImagem() {

        if (!videoRef.current || !canvasRef.current) return;

        const canvas = canvasRef.current;

        const video = videoRef.current;

        const larguraVideo = video.videoWidth;
        const alturaVideo = video.videoHeight;

        // tamanho do retângulo na tela
        const guiaLargura = 320;
        const guiaAltura = 110;

        // escala entre vídeo real e vídeo exibido
        const escalaX = larguraVideo / video.clientWidth;
        const escalaY = alturaVideo / video.clientHeight;

        // posição do retângulo na tela
        const esquerda = (video.clientWidth - guiaLargura) / 2;
        const topo = (video.clientHeight - guiaAltura) / 2;

        // coordenadas reais do vídeo
        const sx = esquerda * escalaX;
        const sy = topo * escalaY;
        const sw = guiaLargura * escalaX;
        const sh = guiaAltura * escalaY;

        // canvas agora terá somente o tamanho da placa
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

        const imagem = canvas.toDataURL("image/jpeg");

        const resultado = await Tesseract.recognize(
            imagem,
            "eng",
            {
                logger: (m) => console.log(m)
            }
        );

        const img = document.createElement("img");
        img.src = imagem;
        img.style.position = "fixed";
        img.style.left = "10px";
        img.style.bottom = "10px";
        img.style.width = "320px";
        img.style.border = "4px solid red";
        img.style.zIndex = "99999";

        document.body.appendChild(img);

        alert(resultado.data.text);

        console.log(imagem);


    }

    if (!aberto) return null;

    return (

        <div className="fixed inset-0 bg-black z-50">

            <video

                ref={videoRef}


                autoPlay

                playsInline

                className="w-full h-full object-cover"

            />

            <div
                className="
                    absolute
                    top-10
                    left-0
                    right-0
                    text-center
                    text-white
                    font-bold
                    text-xl
                "
            >
                Posicione a placa dentro do retângulo
            </div>

            <div
                className="
                    absolute
                    left-1/2
                    top-1/2
                    -translate-x-1/2
                    -translate-y-1/2
                    w-[320px]
                    h-[110px]
                    border-4
                    border-green-500
                    rounded-xl
                    shadow-[0_0_20px_rgba(0,255,0,.8)]
                    pointer-events-none
                "
            />

            <canvas

                ref={canvasRef}

                className="hidden"

            />

            <button

                onClick={capturarImagem}

                className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-green-600 text-white rounded-full px-8 py-4 text-lg shadow-xl"

            >

                Capturar

            </button>

            <button

                onClick={fechar}

                className="absolute top-5 right-5 bg-white rounded-full px-5 py-3"

            >

                Fechar

            </button>

        </div>

    );

}