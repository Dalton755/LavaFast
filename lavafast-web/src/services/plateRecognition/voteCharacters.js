export function voteCharacters(resultados) {

    if (!resultados.length) {

        return null;

    }

    // Considera somente placas com 7 caracteres
    const placas = resultados.filter(r => r.texto.length === 7);

    if (!placas.length) {

        return null;

    }

    let resultadoFinal = "";

    for (let posicao = 0; posicao < 7; posicao++) {

        const votos = {};

        placas.forEach(({ texto, confidence }) => {

            const caractere = texto[posicao];

            if (!caractere) return;

            if (!votos[caractere]) {

                votos[caractere] = 0;

            }

            votos[caractere] += confidence;

        });

        const vencedor = Object.entries(votos)

            .sort((a, b) => b[1] - a[1])[0];

        resultadoFinal += vencedor[0];

    }

    return resultadoFinal;

}