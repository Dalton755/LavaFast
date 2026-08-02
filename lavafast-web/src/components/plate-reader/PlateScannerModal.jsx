import { useEffect, useRef } from "react";

export default function PlateScannerModal({

    aberto,

    fechar

}) {

    const videoRef = useRef(null);

    useEffect(() => {

        if (!aberto) return;

        let stream;

        async function iniciarCamera() {

            try {

                const constraints = {

                    audio: false,

                    video: {

                        facingMode: {

                            ideal: "environment"

                        }

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

    if (!aberto) return null;

    return (

        <div className="fixed inset-0 bg-black z-50">

            <video

                ref={videoRef}

                autoPlay

                playsInline

                className="w-full h-full object-cover"

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