import { useEffect, useRef } from "react";
import { watchPlate } from "../../services/plateRecognition/watchPlate";

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

                const video = videoRef.current;

                if (!video) return;

                stream = await navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: {
                        facingMode: {
                            ideal: "environment"
                        },
                        width: {
                            ideal: 1920
                        },
                        height: {
                            ideal: 1080
                        }
                    }
                });

                video.srcObject = stream;

                video.onloadedmetadata = async () => {
                    try {
                        await video.play();



                        watchPlate(

                            video,

                            (placa) => {

                                alert(placa);

                                fechar();

                            }

                        );




                    } catch (e) {
                        console.error(e);
                    }
                };

            } catch (erro) {

                console.error("Erro ao abrir câmera:", erro);

            }

        }

        const timer = setTimeout(iniciarCamera, 150);

        return () => {


            clearTimeout(timer);

            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.srcObject = null;
            }

        };

    }, [aberto]);



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





            <button

                onClick={fechar}

                className="absolute top-5 right-5 bg-white rounded-full px-5 py-3"

            >

                Fechar

            </button>

        </div>

    );

}