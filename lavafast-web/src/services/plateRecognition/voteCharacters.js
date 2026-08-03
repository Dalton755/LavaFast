export function voteCharacters(resultados) {

    if (!resultados.length) {
        return null;
    }

    const validos = resultados.filter(resultado =>
        resultado.symbols &&
        resultado.symbols.length >= 7
    );

    if (!validos.length) {
        return null;
    }

    let placa = "";

    for (let posicao = 0; posicao < 7; posicao++) {

        const votos = {};

        validos.forEach(resultado => {

            const simbolo = resultado.symbols[posicao];

            if (!simbolo) return;

            const caractere = simbolo.text.toUpperCase();

            const confianca = simbolo.confidence ?? 0;

            if (!votos[caractere]) {
                votos[caractere] = 0;
            }

            votos[caractere] += confianca;

        });

        const vencedor = Object.entries(votos)
            .sort((a, b) => b[1] - a[1])[0];

        if (!vencedor) {
            return null;
        }

        placa += vencedor[0];

    }

    return placa;

}