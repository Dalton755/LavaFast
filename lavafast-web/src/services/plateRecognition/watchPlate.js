import { recognizePlate } from "./plateRecognitionService";

export async function watchPlate(video, onDetected) {

    let ultimaPlaca = "";

    let repeticoes = 0;

    let ativo = true;

    async function loop() {

        while (ativo) {

            const placa = await recognizePlate(video);

            if (!placa) {

                repeticoes = 0;

                await esperar(150);

                continue;

            }

            if (placa === ultimaPlaca) {

                repeticoes++;

            } else {

                ultimaPlaca = placa;

                repeticoes = 1;

            }

            console.log(

                placa,

                repeticoes

            );

            if (repeticoes >= 3) {

                ativo = false;

                onDetected(placa);

                return;

            }

            await esperar(150);

        }

    }

    loop();

    return () => {

        ativo = false;

    };

}

function esperar(ms) {

    return new Promise(resolve =>

        setTimeout(resolve, ms)

    );

}