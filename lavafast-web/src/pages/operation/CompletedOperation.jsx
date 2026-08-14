import MainLayout from "../../layouts/MainLayout";
import useSolicitacoesConcluidas from "../../hooks/useSolicitacoesConcluidas";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import {
    ArrowLeft,
    Search,
    Filter,
    X,
    FileSpreadsheet,
    FileText,
    DollarSign,
    Car,
    WashingMachine,
    Store
} from "lucide-react";

export default function CompletedOperation({
    voltar
}) {

    const {
        concluidas,
        loading
    } = useSolicitacoesConcluidas();

    const [placa, setPlaca] = useState("");
    const [dataInicial, setDataInicial] = useState("");
    const [dataFinal, setDataFinal] = useState("");
    const [tipoLavagem, setTipoLavagem] = useState("");
    const [loja, setLoja] = useState("");
    const [origem, setOrigem] = useState("");

    /*
     * Converte data para YYYY-MM-DD
     * respeitando o horário local do navegador.
     */
    function obterDataLocal(data) {

        if (!data) return "";

        const d = new Date(data);

        if (Number.isNaN(d.getTime())) {
            return "";
        }

        const ano = d.getFullYear();

        const mes = String(
            d.getMonth() + 1
        ).padStart(2, "0");

        const dia = String(
            d.getDate()
        ).padStart(2, "0");

        return `${ano}-${mes}-${dia}`;

    }

    /*
     * Formata data para exibição.
     */
    function formatarData(data) {

        if (!data) return "-";

        const d = new Date(data);

        if (Number.isNaN(d.getTime())) {
            return "-";
        }

        return d.toLocaleString(
            "pt-BR",
            {
                dateStyle: "short",
                timeStyle: "short"
            }
        );

    }

    /*
     * Formata valor monetário.
     */
    function formatarValor(valor) {

        const numero = Number(valor);

        if (Number.isNaN(numero)) {
            return "R$ 0,00";
        }

        return numero.toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );

    }

    /*
     * Calcula o tempo total entre abertura
     * e finalização.
     */
    function calcularTempoTotal(
        inicio,
        fim
    ) {

        if (!inicio || !fim) {
            return "-";
        }

        const inicioMs =
            new Date(inicio).getTime();

        const fimMs =
            new Date(fim).getTime();

        if (
            Number.isNaN(inicioMs) ||
            Number.isNaN(fimMs) ||
            fimMs < inicioMs
        ) {
            return "-";
        }

        const totalMinutos =
            Math.floor(
                (fimMs - inicioMs) / 60000
            );

        const dias =
            Math.floor(
                totalMinutos / 1440
            );

        const horas =
            Math.floor(
                (totalMinutos % 1440) / 60
            );

        const minutos =
            totalMinutos % 60;

        const partes = [];

        if (dias > 0) {
            partes.push(`${dias}d`);
        }

        if (horas > 0) {
            partes.push(`${horas}h`);
        }

        if (
            minutos > 0 ||
            partes.length === 0
        ) {
            partes.push(`${minutos}min`);
        }

        return partes.join(" ");

    }

    /*
     * Lista os tipos existentes.
     */
    const tiposDisponiveis = useMemo(() => {

        const tipos = concluidas
            .map(item => item.tipo_lavagem)
            .filter(Boolean);

        return [
            ...new Set(tipos)
        ].sort();

    }, [concluidas]);

    /*
     * Lista as lojas existentes.
     */
    const lojasDisponiveis = useMemo(() => {

        const lojas = concluidas
            .map(item => item.loja)
            .filter(Boolean);

        return [
            ...new Set(lojas)
        ].sort();

    }, [concluidas]);

    /*
     * Lista as origens existentes.
     */
    const origensDisponiveis = useMemo(() => {

        const origens = concluidas
            .map(item => item.origem)
            .filter(Boolean);

        return [
            ...new Set(origens)
        ].sort();

    }, [concluidas]);

    /*
     * Aplica todos os filtros.
     */
    const resultados = useMemo(() => {

        const termoPlaca =
            placa
                .trim()
                .toUpperCase();

        return concluidas.filter(item => {

            /*
             * PLACA
             */
            if (termoPlaca) {

                const placaItem =
                    String(
                        item.placa || ""
                    ).toUpperCase();

                if (
                    !placaItem.includes(
                        termoPlaca
                    )
                ) {
                    return false;
                }

            }

            /*
             * TIPO
             */
            if (tipoLavagem) {

                if (
                    String(
                        item.tipo_lavagem || ""
                    ) !== tipoLavagem
                ) {
                    return false;
                }

            }

            /*
             * LOJA
             */
            if (loja) {

                if (
                    String(
                        item.loja || ""
                    ) !== loja
                ) {
                    return false;
                }

            }

            /*
             * ORIGEM
             */
            if (origem) {

                if (
                    String(
                        item.origem || ""
                    ) !== origem
                ) {
                    return false;
                }

            }

            /*
             * DATA INICIAL
             */
            if (dataInicial) {

                const dataItem =
                    obterDataLocal(
                        item.finalizada_em
                    );

                if (
                    dataItem < dataInicial
                ) {
                    return false;
                }

            }

            /*
             * DATA FINAL
             */
            if (dataFinal) {

                const dataItem =
                    obterDataLocal(
                        item.finalizada_em
                    );

                if (
                    dataItem > dataFinal
                ) {
                    return false;
                }

            }

            return true;

        });

    }, [
        concluidas,
        placa,
        dataInicial,
        dataFinal,
        tipoLavagem,
        loja,
        origem
    ]);

    /*
     * Quantidade total.
     */
    const quantidadeTotal =
        resultados.length;

    /*
     * Valor total dos registros filtrados.
     */
    const valorTotal = useMemo(() => {

        return resultados.reduce(
            (total, item) =>
                total + (
                    Number(item.valor) || 0
                ),
            0
        );

    }, [resultados]);

    /*
     * Verifica se existe algum filtro ativo.
     */
    const possuiFiltros =
        Boolean(
            placa ||
            dataInicial ||
            dataFinal ||
            tipoLavagem ||
            loja ||
            origem
        );

    /*
     * Limpa todos os filtros.
     */
    function limparFiltros() {

        setPlaca("");
        setDataInicial("");
        setDataFinal("");
        setTipoLavagem("");
        setLoja("");
        setOrigem("");

    }

    /*
     * Exportação Excel.
     *
     * Usa SOMENTE os registros atualmente filtrados.
     */
    function exportarExcel() {

        if (resultados.length === 0) {
            alert(
                "Não existem registros para exportar."
            );
            return;
        }

        const dados = resultados.map(item => ({

            "Placa":
                item.placa || "",

            "Solicitação":
                item.numero_solicitacao || "",

            "Origem":
                item.origem || "",

            "Loja":
                item.loja || "",

            "Tipo de lavagem":
                item.tipo_lavagem || "",

            "Valor":
                Number(item.valor) || 0,

            "Fornecedor":
                item.fornecedor || "",

            "Responsável":
                item.responsavel_localiza || "",

            "Aberta em":
                formatarData(
                    item.recebida_em
                ),

            "Iniciada em":
                formatarData(
                    item.iniciada_em
                ),

            "Finalizada em":
                formatarData(
                    item.finalizada_em
                ),

            "Tempo total":
                calcularTempoTotal(
                    item.recebida_em,
                    item.finalizada_em
                )

        }));

        /*
         * Linha de resumo.
         */
        dados.push({

            "Placa":
                "TOTAL",

            "Solicitação":
                quantidadeTotal,

            "Origem":
                "",

            "Loja":
                "",

            "Tipo de lavagem":
                "",

            "Valor":
                valorTotal,

            "Fornecedor":
                "",

            "Responsável":
                "",

            "Aberta em":
                "",

            "Iniciada em":
                "",

            "Finalizada em":
                "",

            "Tempo total":
                ""

        });

        const worksheet =
            XLSX.utils.json_to_sheet(
                dados
            );

        /*
         * Largura das colunas.
         */
        worksheet["!cols"] = [

            { wch: 12 },
            { wch: 16 },
            { wch: 14 },
            { wch: 20 },
            { wch: 20 },
            { wch: 14 },
            { wch: 32 },
            { wch: 32 },
            { wch: 20 },
            { wch: 20 },
            { wch: 20 },
            { wch: 15 }

        ];

        const workbook =
            XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Relatório"
        );

        const dataArquivo =
            new Date()
                .toISOString()
                .slice(0, 10);

        XLSX.writeFile(
            workbook,
            `LavaFast_Relatorio_${dataArquivo}.xlsx`
        );

    }

    /*
     * Exportação PDF.
     *
     * Usa SOMENTE os registros atualmente filtrados.
     */
    function exportarPDF() {

        if (resultados.length === 0) {
            alert(
                "Não existem registros para exportar."
            );
            return;
        }

        const doc =
            new jsPDF({
                orientation: "landscape",
                unit: "mm",
                format: "a4"
            });

        /*
         * Título.
         */
        doc.setFontSize(18);

        doc.text(
            "LavaFast - Relatório de Lavagens",
            14,
            15
        );

        /*
         * Data de geração.
         */
        doc.setFontSize(9);

        doc.text(
            `Gerado em: ${formatarData(
                new Date()
            )}`,
            14,
            22
        );

        /*
         * Resumo.
         */
        doc.setFontSize(10);

        doc.text(
            `Lavagens: ${quantidadeTotal}`,
            14,
            29
        );

        doc.text(
            `Valor total: ${formatarValor(
                valorTotal
            )}`,
            65,
            29
        );

        /*
         * Período filtrado.
         */
        let periodo = "Período: Todos";

        if (
            dataInicial ||
            dataFinal
        ) {

            const inicio =
                dataInicial
                    ? dataInicial
                        .split("-")
                        .reverse()
                        .join("/")
                    : "...";

            const fim =
                dataFinal
                    ? dataFinal
                        .split("-")
                        .reverse()
                        .join("/")
                    : "...";

            periodo =
                `Período: ${inicio} até ${fim}`;

        }

        doc.text(
            periodo,
            130,
            29
        );

        /*
         * Tabela.
         */
        const linhas =
            resultados.map(item => [

                item.placa || "-",

                item.numero_solicitacao || "-",

                item.origem || "-",

                item.loja || "-",

                item.tipo_lavagem || "-",

                formatarValor(
                    item.valor
                ),

                item.fornecedor || "-",

                item.responsavel_localiza || "-",

                formatarData(
                    item.recebida_em
                ),

                formatarData(
                    item.finalizada_em
                ),

                calcularTempoTotal(
                    item.recebida_em,
                    item.finalizada_em
                )

            ]);

        autoTable(
            doc,
            {
                startY: 35,

                head: [[
                    "Placa",
                    "Solicitação",
                    "Origem",
                    "Loja",
                    "Tipo",
                    "Valor",
                    "Fornecedor",
                    "Responsável",
                    "Abertura",
                    "Finalização",
                    "Tempo"
                ]],

                body: linhas,

                styles: {
                    fontSize: 6,
                    cellPadding: 2
                },

                headStyles: {
                    fontSize: 7
                },

                alternateRowStyles: {
                    fillColor: [
                        245,
                        247,
                        250
                    ]
                },

                margin: {
                    left: 8,
                    right: 8
                }
            }
        );

        const dataArquivo =
            new Date()
                .toISOString()
                .slice(0, 10);

        doc.save(
            `LavaFast_Relatorio_${dataArquivo}.pdf`
        );

    }

    return (

        <MainLayout>

            {/* CABEÇALHO */}

            <div className="
                flex
                items-center
                justify-between
                gap-4
                mb-8
            ">

                <div className="
                    flex
                    items-center
                    gap-4
                ">

                    <button
                        onClick={voltar}
                        className="
                            flex
                            items-center
                            justify-center
                            w-10
                            h-10
                            rounded-xl
                            bg-white
                            border
                            border-slate-200
                            text-slate-700
                            hover:bg-slate-100
                            transition
                            shadow-sm
                        "
                        title="Voltar"
                    >

                        <ArrowLeft
                            size={20}
                        />

                    </button>

                    <div>

                        <h1 className="
                            text-2xl
                            font-bold
                            text-slate-800
                        ">

                            Lavagens concluídas

                        </h1>

                        <p className="
                            text-sm
                            text-slate-500
                            mt-1
                        ">

                            Histórico e relatório operacional

                        </p>

                    </div>

                </div>

            </div>

            {/* FILTROS */}

            <div className="
                bg-white
                rounded-2xl
                shadow
                p-6
                mb-6
            ">

                <div className="
                    flex
                    items-center
                    justify-between
                    gap-4
                    mb-5
                    flex-wrap
                ">

                    <div className="
                        flex
                        items-center
                        gap-2
                    ">

                        <Filter
                            size={20}
                            className="text-blue-600"
                        />

                        <h2 className="
                            text-lg
                            font-bold
                            text-slate-800
                        ">

                            Filtros

                        </h2>

                    </div>

                    {possuiFiltros && (

                        <button
                            onClick={limparFiltros}
                            className="
                                flex
                                items-center
                                gap-2
                                px-4
                                py-2
                                rounded-xl
                                border
                                border-slate-200
                                bg-slate-50
                                text-slate-600
                                hover:bg-slate-100
                                transition
                                text-sm
                                font-semibold
                            "
                        >

                            <X size={16} />

                            Limpar filtros

                        </button>

                    )}

                </div>

                <div className="
                    grid
                    grid-cols-1
                    md:grid-cols-2
                    lg:grid-cols-3
                    xl:grid-cols-6
                    gap-4
                ">

                    {/* PLACA */}

                    <div>

                        <label className="
                            block
                            text-xs
                            font-semibold
                            text-slate-500
                            uppercase
                            mb-2
                        ">

                            Placa

                        </label>

                        <div className="relative">

                            <Search
                                size={17}
                                className="
                                    absolute
                                    left-3
                                    top-1/2
                                    -translate-y-1/2
                                    text-slate-400
                                "
                            />

                            <input
                                type="text"
                                value={placa}
                                onChange={e =>
                                    setPlaca(
                                        e.target.value
                                            .toUpperCase()
                                    )
                                }
                                placeholder="Ex.: TEB7I40"
                                className="
                                    w-full
                                    border
                                    border-slate-200
                                    rounded-xl
                                    pl-10
                                    pr-3
                                    py-3
                                    text-sm
                                    focus:outline-none
                                    focus:ring-2
                                    focus:ring-blue-500
                                "
                            />

                        </div>

                    </div>

                    {/* DATA INICIAL */}

                    <div>

                        <label className="
                            block
                            text-xs
                            font-semibold
                            text-slate-500
                            uppercase
                            mb-2
                        ">

                            Data inicial

                        </label>

                        <input
                            type="date"
                            value={dataInicial}
                            onChange={e =>
                                setDataInicial(
                                    e.target.value
                                )
                            }
                            className="
                                w-full
                                border
                                border-slate-200
                                rounded-xl
                                px-3
                                py-3
                                text-sm
                                focus:outline-none
                                focus:ring-2
                                focus:ring-blue-500
                            "
                        />

                    </div>

                    {/* DATA FINAL */}

                    <div>

                        <label className="
                            block
                            text-xs
                            font-semibold
                            text-slate-500
                            uppercase
                            mb-2
                        ">

                            Data final

                        </label>

                        <input
                            type="date"
                            value={dataFinal}
                            onChange={e =>
                                setDataFinal(
                                    e.target.value
                                )
                            }
                            className="
                                w-full
                                border
                                border-slate-200
                                rounded-xl
                                px-3
                                py-3
                                text-sm
                                focus:outline-none
                                focus:ring-2
                                focus:ring-blue-500
                            "
                        />

                    </div>

                    {/* LOJA */}

                    <div>

                        <label className="
                            block
                            text-xs
                            font-semibold
                            text-slate-500
                            uppercase
                            mb-2
                        ">

                            Loja

                        </label>

                        <select
                            value={loja}
                            onChange={e =>
                                setLoja(
                                    e.target.value
                                )
                            }
                            className="
                                w-full
                                border
                                border-slate-200
                                rounded-xl
                                px-3
                                py-3
                                text-sm
                                bg-white
                                focus:outline-none
                                focus:ring-2
                                focus:ring-blue-500
                            "
                        >

                            <option value="">
                                Todas as lojas
                            </option>

                            {lojasDisponiveis.map(
                                item => (
                                    <option
                                        key={item}
                                        value={item}
                                    >
                                        {item}
                                    </option>
                                )
                            )}

                        </select>

                    </div>

                    {/* ORIGEM */}

                    <div>

                        <label className="
                            block
                            text-xs
                            font-semibold
                            text-slate-500
                            uppercase
                            mb-2
                        ">

                            Origem

                        </label>

                        <select
                            value={origem}
                            onChange={e =>
                                setOrigem(
                                    e.target.value
                                )
                            }
                            className="
                                w-full
                                border
                                border-slate-200
                                rounded-xl
                                px-3
                                py-3
                                text-sm
                                bg-white
                                focus:outline-none
                                focus:ring-2
                                focus:ring-blue-500
                            "
                        >

                            <option value="">
                                Todas as origens
                            </option>

                            {origensDisponiveis.map(
                                item => (
                                    <option
                                        key={item}
                                        value={item}
                                    >
                                        {item}
                                    </option>
                                )
                            )}

                        </select>

                    </div>

                    {/* TIPO */}

                    <div>

                        <label className="
                            block
                            text-xs
                            font-semibold
                            text-slate-500
                            uppercase
                            mb-2
                        ">

                            Tipo de lavagem

                        </label>

                        <select
                            value={tipoLavagem}
                            onChange={e =>
                                setTipoLavagem(
                                    e.target.value
                                )
                            }
                            className="
                                w-full
                                border
                                border-slate-200
                                rounded-xl
                                px-3
                                py-3
                                text-sm
                                bg-white
                                focus:outline-none
                                focus:ring-2
                                focus:ring-blue-500
                            "
                        >

                            <option value="">
                                Todos os tipos
                            </option>

                            {tiposDisponiveis.map(
                                item => (
                                    <option
                                        key={item}
                                        value={item}
                                    >
                                        {item}
                                    </option>
                                )
                            )}

                        </select>

                    </div>

                </div>

            </div>

            {/* RESUMO */}

            <div className="
                grid
                grid-cols-1
                md:grid-cols-3
                gap-4
                mb-6
            ">

                <div className="
                    bg-white
                    rounded-2xl
                    shadow
                    p-5
                    border
                    border-slate-100
                ">

                    <div className="
                        flex
                        items-center
                        justify-between
                    ">

                        <div>

                            <p className="
                                text-xs
                                font-semibold
                                uppercase
                                text-slate-400
                            ">

                                Lavagens

                            </p>

                            <p className="
                                text-2xl
                                font-black
                                text-slate-800
                                mt-1
                            ">

                                {quantidadeTotal}

                            </p>

                        </div>

                        <div className="
                            w-11
                            h-11
                            rounded-xl
                            bg-blue-100
                            text-blue-600
                            flex
                            items-center
                            justify-center
                        ">

                            <Car size={22} />

                        </div>

                    </div>

                </div>

                <div className="
                    bg-white
                    rounded-2xl
                    shadow
                    p-5
                    border
                    border-slate-100
                ">

                    <div className="
                        flex
                        items-center
                        justify-between
                    ">

                        <div>

                            <p className="
                                text-xs
                                font-semibold
                                uppercase
                                text-slate-400
                            ">

                                Valor total

                            </p>

                            <p className="
                                text-2xl
                                font-black
                                text-green-600
                                mt-1
                            ">

                                {formatarValor(
                                    valorTotal
                                )}

                            </p>

                        </div>

                        <div className="
                            w-11
                            h-11
                            rounded-xl
                            bg-green-100
                            text-green-600
                            flex
                            items-center
                            justify-center
                        ">

                            <DollarSign
                                size={22}
                            />

                        </div>

                    </div>

                </div>

                <div className="
                    bg-white
                    rounded-2xl
                    shadow
                    p-5
                    border
                    border-slate-100
                ">

                    <div className="
                        flex
                        items-center
                        justify-between
                    ">

                        <div>

                            <p className="
                                text-xs
                                font-semibold
                                uppercase
                                text-slate-400
                            ">

                                Registros disponíveis

                            </p>

                            <p className="
                                text-2xl
                                font-black
                                text-slate-800
                                mt-1
                            ">

                                {concluidas.length}

                            </p>

                        </div>

                        <div className="
                            w-11
                            h-11
                            rounded-xl
                            bg-slate-100
                            text-slate-600
                            flex
                            items-center
                            justify-center
                        ">

                            <WashingMachine
                                size={22}
                            />

                        </div>

                    </div>

                </div>

            </div>

            {/* EXPORTAÇÃO */}

            <div className="
                bg-white
                rounded-2xl
                shadow
                p-5
                mb-6
                flex
                flex-col
                md:flex-row
                md:items-center
                md:justify-between
                gap-4
            ">

                <div>

                    <h2 className="
                        font-bold
                        text-slate-800
                    ">

                        Relatório

                    </h2>

                    <p className="
                        text-sm
                        text-slate-500
                        mt-1
                    ">

                        A exportação respeita os filtros aplicados.

                    </p>

                </div>

                <div className="
                    flex
                    flex-wrap
                    gap-3
                ">

                    <button
                        onClick={exportarExcel}
                        disabled={
                            resultados.length === 0
                        }
                        className="
                            flex
                            items-center
                            gap-2
                            px-5
                            py-3
                            rounded-xl
                            bg-green-600
                            hover:bg-green-700
                            disabled:bg-slate-300
                            disabled:cursor-not-allowed
                            text-white
                            font-semibold
                            text-sm
                            transition
                        "
                    >

                        <FileSpreadsheet
                            size={18}
                        />

                        Exportar Excel

                    </button>

                    <button
                        onClick={exportarPDF}
                        disabled={
                            resultados.length === 0
                        }
                        className="
                            flex
                            items-center
                            gap-2
                            px-5
                            py-3
                            rounded-xl
                            bg-red-600
                            hover:bg-red-700
                            disabled:bg-slate-300
                            disabled:cursor-not-allowed
                            text-white
                            font-semibold
                            text-sm
                            transition
                        "
                    >

                        <FileText
                            size={18}
                        />

                        Exportar PDF

                    </button>

                </div>

            </div>

            {/* RESULTADOS */}

            <div className="
                bg-white
                rounded-2xl
                shadow
                p-6
            ">

                <div className="
                    flex
                    items-center
                    justify-between
                    mb-6
                ">

                    <div>

                        <h2 className="
                            text-xl
                            font-bold
                        ">

                            Histórico de lavagens

                        </h2>

                        <p className="
                            text-sm
                            text-slate-500
                            mt-1
                        ">

                            {resultados.length}{" "}
                            {resultados.length === 1
                                ? "lavagem encontrada"
                                : "lavagens encontradas"
                            }

                        </p>

                    </div>

                </div>

                {loading ? (

                    <div className="
                        text-slate-400
                        text-center
                        py-20
                    ">

                        Carregando...

                    </div>

                ) : resultados.length === 0 ? (

                    <div className="
                        text-slate-400
                        text-center
                        py-20
                    ">

                        Nenhuma lavagem encontrada

                    </div>

                ) : (

                    <div className="space-y-4">

                        {resultados.map(item => (

                            <div
                                key={`${item.origem}-${item.id}`}
                                className="
                                    border
                                    border-slate-200
                                    rounded-2xl
                                    p-5
                                    hover:shadow-md
                                    transition
                                "
                            >

                                <div className="
                                    flex
                                    flex-col
                                    lg:flex-row
                                    lg:items-start
                                    lg:justify-between
                                    gap-4
                                ">

                                    {/* DADOS PRINCIPAIS */}

                                    <div>

                                        <div className="
                                            flex
                                            items-center
                                            gap-3
                                            mb-2
                                        ">

                                            <span className="
                                                text-2xl
                                                font-bold
                                            ">

                                                {item.placa}

                                            </span>

                                            <span className={`
                                                text-xs
                                                font-bold
                                                px-3
                                                py-1
                                                rounded-full

                                                ${
                                                    item.origem === "LOCALIZA"
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-blue-100 text-blue-700"
                                                }
                                            `}>

                                                {item.origem}

                                            </span>

                                        </div>

                                        <div className="
                                            text-sm
                                            text-slate-500
                                        ">

                                            Solicitação:{" "}

                                            <span className="
                                                font-medium
                                                text-slate-700
                                            ">

                                                {item.numero_solicitacao || "-"}

                                            </span>

                                        </div>

                                        {item.loja && (

                                            <div className="
                                                flex
                                                items-center
                                                gap-1
                                                text-sm
                                                text-slate-500
                                                mt-1
                                            ">

                                                <Store
                                                    size={14}
                                                />

                                                {item.loja}

                                            </div>

                                        )}

                                    </div>

                                    {/* STATUS + VALOR */}

                                    <div className="
                                        text-sm
                                        lg:text-right
                                    ">

                                        <div className="
                                            text-green-600
                                            font-semibold
                                        ">

                                            ✓ FINALIZADA

                                        </div>

                                        <div className="
                                            text-lg
                                            font-black
                                            text-slate-800
                                            mt-2
                                        ">

                                            {formatarValor(
                                                item.valor
                                            )}

                                        </div>

                                    </div>

                                </div>

                                {/* DETALHES */}

                                <div className="
                                    mt-5
                                    grid
                                    grid-cols-1
                                    md:grid-cols-2
                                    gap-3
                                    text-sm
                                ">

                                    <div>

                                        <strong>
                                            Tipo:
                                        </strong>{" "}

                                        {item.tipo_lavagem || "-"}

                                    </div>

                                    <div>

                                        <strong>
                                            Fornecedor:
                                        </strong>{" "}

                                        {item.fornecedor || "-"}

                                    </div>

                                    <div>

                                        <strong>
                                            Responsável:
                                        </strong>{" "}

                                        {item.responsavel_localiza || "-"}

                                    </div>

                                </div>

                                {/* TEMPOS */}

                                <div className="
                                    mt-5
                                    pt-4
                                    border-t
                                    border-slate-100
                                    grid
                                    grid-cols-1
                                    md:grid-cols-3
                                    gap-3
                                    text-sm
                                ">

                                    <div>

                                        <div className="
                                            text-slate-400
                                            text-xs
                                            uppercase
                                            font-semibold
                                        ">

                                            Aberta em

                                        </div>

                                        <div className="
                                            font-medium
                                            text-slate-700
                                            mt-1
                                        ">

                                            {formatarData(
                                                item.recebida_em
                                            )}

                                        </div>

                                    </div>

                                    <div>

                                        <div className="
                                            text-slate-400
                                            text-xs
                                            uppercase
                                            font-semibold
                                        ">

                                            Finalizada em

                                        </div>

                                        <div className="
                                            font-medium
                                            text-slate-700
                                            mt-1
                                        ">

                                            {formatarData(
                                                item.finalizada_em
                                            )}

                                        </div>

                                    </div>

                                    <div>

                                        <div className="
                                            text-slate-400
                                            text-xs
                                            uppercase
                                            font-semibold
                                        ">

                                            Tempo total

                                        </div>

                                        <div className="
                                            font-bold
                                            text-blue-600
                                            mt-1
                                        ">

                                            {calcularTempoTotal(
                                                item.recebida_em,
                                                item.finalizada_em
                                            )}

                                        </div>

                                    </div>

                                </div>

                            </div>

                        ))}

                    </div>

                )}

            </div>

        </MainLayout>

    );

}