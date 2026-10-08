function extrair(texto, regex) {
    const match = texto.match(regex);
    return match ? match[1].trim() : "";
}

const regexNumero = /^\d{7,12}$/;
const regexPlaca = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/i;

function extrairValor(linhas, inicio, textoLinha) {
    const trecho = [textoLinha, ...linhas.slice(inicio + 1, inicio + 6)];

    for (let i = 0; i < trecho.length; i++) {
        const linha = trecho[i];

        if (i > 0 && regexNumero.test(linha)) break;

        const resultado = linha.match(/R\$\s*([\d.,]+)/i);
        if (resultado) return resultado[1];
    }

    return "";
}

export function parseLocaliza(textoOriginal) {
    const texto = String(textoOriginal || "")
        .replace(/\*/g, "")
        .replace(/\r/g, "")
        .replace(/\u00a0/g, " ");

    const linhas = texto.split("\n").map(linha => linha.trim()).filter(Boolean);
    const veiculos = [];
    const vistos = new Set();

    for (let i = 0; i < linhas.length; i++) {
        const linha = linhas[i];
        let numeroSolicitacao = "";
        let placa = "";

        const mesmaLinha = linha.match(/^(\d{7,12})\s+([A-Z]{3}[0-9][A-Z0-9][0-9]{2})(?:\s|$)/i);

        if (mesmaLinha) {
            numeroSolicitacao = mesmaLinha[1];
            placa = mesmaLinha[2].toUpperCase();
        } else if (regexNumero.test(linha) && regexPlaca.test(linhas[i + 1] || "")) {
            numeroSolicitacao = linha;
            placa = linhas[i + 1].toUpperCase();
        } else {
            continue;
        }

        if (vistos.has(numeroSolicitacao)) continue;
        vistos.add(numeroSolicitacao);

        veiculos.push({
            numeroSolicitacao,
            placa,
            valor: extrairValor(linhas, i, linha)
        });
    }

    return {
        fornecedor: extrair(texto, /Fornecedor:\s*(.+)/i),
        responsavel: extrair(texto, /Responsável pela Solicitação:\s*(.+)/i),
        agencia: extrair(texto, /Ag[eê]ncia da Abertura:\s*(.+)/i),
        dataAbertura: extrair(texto, /Data da Abertura da Solicitação:\s*(.+)/i),
        veiculos
    };
}
