import ProdutividadeRepository
    from "../repositories/ProdutividadeRepository.js";

import {
    listarTiposLavagem
} from "../repositories/TipoLavagemRepository.js";

const TIME_ZONE =
    "America/Sao_Paulo";

function obterDataSaoPaulo() {

    const partes =
        new Intl.DateTimeFormat(
            "en-US",
            {
                timeZone: TIME_ZONE,
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            }
        ).formatToParts(
            new Date()
        );

    const valores = {};

    partes.forEach(parte => {

        if (
            parte.type === "year" ||
            parte.type === "month" ||
            parte.type === "day"
        ) {

            valores[parte.type] =
                parte.value;

        }

    });

    return (
        `${valores.year}-` +
        `${valores.month}-` +
        `${valores.day}`
    );

}

function somarDias(
    data,
    quantidade
) {

    const d =
        new Date(
            `${data}T12:00:00Z`
        );

    d.setUTCDate(
        d.getUTCDate() +
        quantidade
    );

    return d
        .toISOString()
        .slice(0, 10);

}

function obterInicioSemana(data) {

    const d =
        new Date(
            `${data}T12:00:00Z`
        );

    const diaSemana =
        d.getUTCDay();

    const diasDesdeSegunda =
        diaSemana === 0
            ? 6
            : diaSemana - 1;

    return somarDias(
        data,
        -diasDesdeSegunda
    );

}

function obterInicioQuinzena(data) {

    const [
        ano,
        mes,
        dia
    ] = data
        .split("-")
        .map(Number);

    const primeiroDia =
        dia <= 15
            ? 1
            : 16;

    return (
        `${ano}-` +
        `${String(mes).padStart(2, "0")}-` +
        `${String(primeiroDia).padStart(2, "0")}`
    );

}

function obterInicioMes(data) {

    return (
        `${data.slice(0, 7)}-01`
    );

}

function inicioDoDia(data) {

    return new Date(
        `${data}T00:00:00-03:00`
    ).toISOString();

}

function fimDoDia(data) {

    return new Date(
        `${data}T23:59:59.999-03:00`
    ).toISOString();

}

function obterIntervalo(periodo) {

    const hoje =
        obterDataSaoPaulo();

    let inicio;

    switch (periodo) {

        case "hoje":

            inicio =
                hoje;

            break;

        case "semana":

            inicio =
                obterInicioSemana(
                    hoje
                );

            break;

        case "quinzena":

            inicio =
                obterInicioQuinzena(
                    hoje
                );

            break;

        case "mes":

            inicio =
                obterInicioMes(
                    hoje
                );

            break;

        default:

            throw new Error(
                "Período de produtividade inválido."
            );

    }

    return {
        dataInicial:
            inicio,

        dataFinal:
            hoje,

        inicio:
            inicioDoDia(
                inicio
            ),

        fim:
            fimDoDia(
                hoje
            )
    };

}

class ProdutividadeService {

    async obterResumo(
        lojas = []
    ) {

        const periodos = [
            "hoje",
            "semana",
            "quinzena",
            "mes"
        ];

        /*
         * Carregamos os tipos uma única vez.
         */
        const tiposCadastrados =
            await listarTiposLavagem();

        const mapaTipos =
            new Map(
                tiposCadastrados.map(
                    tipo => [
                        String(tipo.id),
                        tipo.nome
                    ]
                )
            );

        const resultados =
            await Promise.all(

                periodos.map(
                    async periodo => {

                        const intervalo =
                            obterIntervalo(
                                periodo
                            );

                        const [
                            dados,
                            registrosTipos
                        ] = await Promise.all([

                            ProdutividadeRepository
                                .contarFinalizadasEntre(
                                    intervalo.inicio,
                                    intervalo.fim,
                                    lojas
                                ),

                            ProdutividadeRepository
                                .listarTiposFinalizados(
                                    intervalo.inicio,
                                    intervalo.fim,
                                    lojas
                                )

                        ]);

                        /*
                         * Agrupa as lavagens LOCALIZA
                         * por tipo_lavagem_id.
                         */
                        const contagem =
                            new Map();

                        registrosTipos.forEach(
                            item => {

                                const chave =
                                    item.tipo_lavagem_id
                                        ? String(
                                            item.tipo_lavagem_id
                                        )
                                        : "__SEM_TIPO__";

                                contagem.set(
                                    chave,
                                    (
                                        contagem.get(
                                            chave
                                        ) || 0
                                    ) + 1
                                );

                            }
                        );

                        const resumoTipos = [];

                        contagem.forEach(
                            (
                                quantidade,
                                id
                            ) => {

                                const nome =
                                    id === "__SEM_TIPO__"
                                        ? "Sem tipo"
                                        : (
                                            mapaTipos.get(
                                                id
                                            ) ||
                                            "Tipo não encontrado"
                                        );

                                resumoTipos.push({
                                    id,
                                    nome,
                                    quantidade
                                });

                            }
                        );

                        /*
                         * PARTICULAR não possui
                         * tipo_lavagem_id.
                         *
                         * Mantemos separado para que
                         * a soma bata com o total.
                         */
                        if (
                            dados.particulares > 0
                        ) {

                            resumoTipos.push({
                                id:
                                    "PARTICULAR",

                                nome:
                                    "Particular",

                                quantidade:
                                    dados.particulares
                            });

                        }

                        resumoTipos.sort(
                            (a, b) =>
                                b.quantidade -
                                a.quantidade
                        );

                        return [
                            periodo,
                            {
                                inicio:
                                    intervalo.dataInicial,

                                fim:
                                    intervalo.dataFinal,

                                ...dados,

                                tipos:
                                    resumoTipos
                            }
                        ];

                    }
                )
            );

        return Object.fromEntries(
            resultados
        );

    }

    async obterDetalhes(
        periodo,
        lojas = []
    ) {

        const intervalo =
            obterIntervalo(
                periodo
            );

        const [
            localiza,
            particulares,
            tipos
        ] = await Promise.all([

            ProdutividadeRepository
                .listarLocaliza(
                    intervalo.inicio,
                    intervalo.fim,
                    lojas
                ),

            ProdutividadeRepository
                .listarParticulares(
                    intervalo.inicio,
                    intervalo.fim,
                    lojas
                ),

            listarTiposLavagem()

        ]);

        const mapaTipos =
            new Map(
                tipos.map(tipo => [
                    String(tipo.id),
                    tipo.nome
                ])
            );

        const dadosLocaliza =
            localiza.map(item => ({

                id:
                    item.id,

                numero_solicitacao:
                    item.numero_solicitacao,

                placa:
                    item.placa,

                loja:
                    item.loja?.nome ||
                    item.loja?.codigo ||
                    "-",

                tipo_lavagem:
                    mapaTipos.get(
                        String(
                            item.tipo_lavagem_id
                        )
                    ) || "-",

                origem:
                    "LOCALIZA",

                solicitada_em:
                    item.recebida_em,

                iniciada_em:
                    item.iniciada_em,

                finalizada_em:
                    item.finalizada_em

            }));

        /*
         * Particular entra direto em lavagem.
         * Portanto created_at representa
         * solicitação e início da lavagem.
         */
        const dadosParticulares =
            particulares.map(item => ({

                id:
                    item.id,

                numero_solicitacao:
                    null,

                placa:
                    item.placa,

                loja:
                    "-",

                tipo_lavagem:
                    "-",

                origem:
                    "PARTICULAR",

                solicitada_em:
                    item.created_at,

                iniciada_em:
                    item.created_at,

                finalizada_em:
                    item.finalizada_em

            }));

        const dados = [
            ...dadosLocaliza,
            ...dadosParticulares
        ].sort(
            (a, b) =>
                new Date(
                    b.finalizada_em
                ) -
                new Date(
                    a.finalizada_em
                )
        );

        return {

            periodo,

            inicio:
                intervalo.dataInicial,

            fim:
                intervalo.dataFinal,

            quantidade:
                dados.length,

            dados

        };

    }

}

export default new ProdutividadeService();