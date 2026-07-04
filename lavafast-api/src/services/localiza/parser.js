function extrair(texto, regex) {

    texto = texto.replace(/\*/g, "");

    const match = texto.match(regex);

    return match ? match[1].trim() : "";

}

export function parseLocaliza(texto) {
    texto = texto.replace(/\*/g, "");

    const linhasVeiculos = [];

    const linhas = texto.split("\n");

    linhas.forEach(linha => {

        linha = linha.trim();

        if (!linha) return;

        const partes = linha.split(/\s+/);

        if (partes.length < 3) return;

        const numeroSolicitacao = partes[0];

        const placa = partes[1];

        if (!/^\d+$/.test(numeroSolicitacao)) return;

        const valor = linha.includes("R$")
            ? linha.split("R$")[1].trim()
            : "";

        linhasVeiculos.push({

            numeroSolicitacao,

            placa,

            valor

        });

    });

    return {

        fornecedor:

            extrair(
                texto,
                /Fornecedor:\s*(.+)/
            ),

        responsavel:

            extrair(
                texto,
                /Responsável pela Solicitação:\s*(.+)/
            ),

        agencia:

            extrair(
                texto,
                /Agencia da Abertura:\s*(.+)/
            ),

        dataAbertura:

            extrair(
                texto,
                /Data da Abertura da Solicitação:\s*(.+)/
            ),

        veiculos:

            linhasVeiculos

    };

}