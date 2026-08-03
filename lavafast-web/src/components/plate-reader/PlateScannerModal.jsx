import { useEffect, useRef } from "react";

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

    function capturarImagem() {

        if (!videoRef.current || !canvasRef.current) return;

        const canvas = canvasRef.current;

        const video = videoRef.current;

        canvas.width = video.videoWidth;

        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");

        ctx.drawImage(video, 0, 0);

        const imagem = canvas.toDataURL("image/jpeg");

        console.log(imagem);

        alert("Imagem capturada!");

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