import {
    useEffect,
    useState
} from "react";

import {
    ArrowLeft,
    FileSpreadsheet
} from "lucide-react";

import MainLayout
    from "../../layouts/MainLayout";

import {
    obterDetalhesProdutividade
} from "../../api/produtividade";

function formatarData(data) {

    if (!data) {
        return "-";
    }

    const d =
        new Date(data);

    if (
        Number.isNaN(
            d.getTime()
        )
    ) {
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

function calcularTempo(
    inicio,
    fim
) {

    if (!inicio || !fim) {
        return "-";
    }

    const inicioMs =
        new Date(
            inicio
        ).getTime();

    const fimMs =
        new Date(
            fim
        ).getTime();

    if (
        Number.isNaN(
            inicioMs
        ) ||
        Number.isNaN(
            fimMs
        ) ||
        fimMs < inicioMs
    ) {
        return "-";
    }

    const totalMinutos =
        Math.floor(
            (
                fimMs -
                inicioMs
            ) / 60000
        );

    const dias =
        Math.floor(
            totalMinutos / 1440
        );

    const horas =
        Math.floor(
            (
                totalMinutos %
                1440
            ) / 60
        );

    const minutos =
        totalMinutos % 60;

    const partes = [];

    if (dias > 0) {
        partes.push(
            `${dias}d`
        );
    }

    if (horas > 0) {
        partes.push(
            `${horas}h`
        );
    }

    if (
        minutos > 0 ||
        partes.length === 0
    ) {
        partes.push(
            `${minutos}min`
        );
    }

    return partes.join(" ");

}

function Etiqueta({
    origem
}) {

    const localiza =
        origem === "LOCALIZA";

    return (

        <span
            className={`
                inline-flex
                px-2.5
                py-1
                rounded-full
                text-xs
                font-bold

                ${localiza
                    ? "bg-green-100 text-green-700"
                    : "bg-blue-100 text-blue-700"
                }
            `}
        >
            {origem}
        </span>

    );

}

export default function ProductivityDetails({
    voltar,
    configuracao
}) {

    const {
        periodo,
        titulo,
        lojasSelecionadas = []
    } = configuracao;

    const [
        resultado,
        setResultado
    ] = useState(null);

    const [
        loading,
        setLoading
    ] = useState(true);

    const [
        erro,
        setErro
    ] = useState("");

    useEffect(() => {

        let ativo = true;

        async function carregar() {

            try {

                setLoading(true);
                setErro("");

                const dados =
                    await obterDetalhesProdutividade(
                        periodo,
                        lojasSelecionadas
                    );

                if (!ativo) {
                    return;
                }

                setResultado(
                    dados
                );

            }
            catch (error) {

                console.error(
                    "Erro ao carregar detalhes:",
                    error
                );

                if (!ativo) {
                    return;
                }

                setErro(
                    error.response?.data?.erro ||
                    "Não foi possível carregar as lavagens."
                );

            }
            finally {

                if (ativo) {
                    setLoading(false);
                }

            }

        }

        carregar();

        return () => {
            ativo = false;
        };

    }, [
        periodo,
        lojasSelecionadas
    ]);

    async function exportarExcel() {

        const dados =
            resultado?.dados || [];

        if (
            dados.length === 0
        ) {

            alert(
                "Não existem registros para exportar."
            );

            return;

        }

        const XLSX =
            await import(
                "xlsx"
            );

        const linhas =
            dados.map(
                item => ({

                    "Solicitação":
                        item.numero_solicitacao ||
                        "",

                    "Placa":
                        item.placa ||
                        "",

                    "Loja":
                        item.loja ||
                        "",

                    "Tipo Lavagem":
                        item.tipo_lavagem ||
                        "",

                    "Origem":
                        item.origem ||
                        "",

                    "Solicitada em":
                        formatarData(
                            item.solicitada_em
                        ),

                    "Iniciada em":
                        formatarData(
                            item.iniciada_em
                        ),

                    "Finalizada em":
                        formatarData(
                            item.finalizada_em
                        ),

                    "Tempo de lavagem":
                        calcularTempo(
                            item.iniciada_em,
                            item.finalizada_em
                        ),

                    "Tempo total":
                        calcularTempo(
                            item.solicitada_em,
                            item.finalizada_em
                        )

                })
            );

        const worksheet =
            XLSX.utils
                .json_to_sheet(
                    linhas
                );

        worksheet["!cols"] = [
            { wch: 16 },
            { wch: 12 },
            { wch: 22 },
            { wch: 20 },
            { wch: 14 },
            { wch: 20 },
            { wch: 20 },
            { wch: 20 },
            { wch: 20 },
            { wch: 18 }
        ];

        const workbook =
            XLSX.utils
                .book_new();

        XLSX.utils
            .book_append_sheet(
                workbook,
                worksheet,
                "Produtividade"
            );

        XLSX.writeFile(
            workbook,
            `LavaFast_Produtividade_${periodo}.xlsx`
        );

    }

    return (

        <MainLayout>

            <div
                className="
                    max-w-[1600px]
                    mx-auto
                "
            >

                <div
                    className="
                        flex
                        flex-col
                        md:flex-row
                        md:items-center
                        md:justify-between
                        gap-4
                        mb-7
                    "
                >

                    <div
                        className="
                            flex
                            items-center
                            gap-4
                        "
                    >

                        <button
                            onClick={voltar}
                            className="
                                w-12
                                h-12
                                bg-white
                                border
                                border-slate-200
                                rounded-xl
                                shadow-sm
                                flex
                                items-center
                                justify-center
                            "
                        >
                            <ArrowLeft
                                size={22}
                            />
                        </button>

                        <div>

                            <h1
                                className="
                                    text-3xl
                                    font-bold
                                    text-slate-900
                                "
                            >
                                {titulo}
                            </h1>

                            <p
                                className="
                                    text-slate-500
                                    mt-1
                                "
                            >
                                Lavagens finalizadas no período
                            </p>

                        </div>

                    </div>

                    <button
                        onClick={
                            exportarExcel
                        }
                        className="
                            inline-flex
                            items-center
                            justify-center
                            gap-2
                            bg-green-600
                            hover:bg-green-700
                            text-white
                            px-5
                            py-3
                            rounded-xl
                            font-semibold
                        "
                    >
                        <FileSpreadsheet
                            size={20}
                        />

                        Exportar Excel
                    </button>

                </div>

                {!loading &&
                    resultado && (

                    <div
                        className="
                            bg-white
                            border
                            border-slate-200
                            rounded-2xl
                            p-5
                            mb-5
                        "
                    >

                        <p
                            className="
                                text-sm
                                uppercase
                                font-semibold
                                text-slate-500
                            "
                        >
                            Lavagens
                        </p>

                        <p
                            className="
                                text-4xl
                                font-bold
                                text-slate-900
                                mt-1
                            "
                        >
                            {resultado.quantidade}
                        </p>

                    </div>

                )}

                {loading && (

                    <div
                        className="
                            bg-white
                            rounded-2xl
                            border
                            p-10
                            text-center
                            text-slate-500
                        "
                    >
                        Carregando lavagens...
                    </div>

                )}

                {!loading &&
                    erro && (

                    <div
                        className="
                            bg-white
                            rounded-2xl
                            border
                            p-10
                            text-center
                            text-red-600
                        "
                    >
                        {erro}
                    </div>

                )}

                {!loading &&
                    !erro &&
                    resultado && (

                    <div
                        className="
                            bg-white
                            border
                            border-slate-200
                            rounded-2xl
                            overflow-hidden
                        "
                    >

                        <div
                            className="
                                overflow-x-auto
                            "
                        >

                            <table
                                className="
                                    w-full
                                    min-w-[1450px]
                                    text-sm
                                "
                            >

                                <thead
                                    className="
                                        bg-slate-50
                                        text-slate-500
                                        uppercase
                                        text-xs
                                    "
                                >

                                    <tr>

                                        <th className="text-left px-5 py-4">
                                            Solicitação
                                        </th>

                                        <th className="text-left px-5 py-4">
                                            Placa
                                        </th>

                                        <th className="text-left px-5 py-4">
                                            Loja
                                        </th>

                                        <th className="text-left px-5 py-4">
                                            Tipo Lavagem
                                        </th>

                                        <th className="text-left px-5 py-4">
                                            Origem
                                        </th>

                                        <th className="text-left px-5 py-4">
                                            Solicitada em
                                        </th>

                                        <th className="text-left px-5 py-4">
                                            Iniciada em
                                        </th>

                                        <th className="text-left px-5 py-4">
                                            Finalizada em
                                        </th>

                                        <th className="text-left px-5 py-4">
                                            Tempo lavagem
                                        </th>

                                        <th className="text-left px-5 py-4">
                                            Tempo total
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {resultado.dados.map(
                                        item => (

                                            <tr
                                                key={
                                                    `${item.origem}-${item.id}`
                                                }
                                                className="
                                                    border-t
                                                    border-slate-100
                                                    hover:bg-slate-50
                                                "
                                            >

                                                <td className="px-5 py-4">
                                                    {item.numero_solicitacao || "-"}
                                                </td>

                                                <td
                                                    className="
                                                        px-5
                                                        py-4
                                                        font-bold
                                                        text-slate-900
                                                    "
                                                >
                                                    {item.placa}
                                                </td>

                                                <td className="px-5 py-4">
                                                    {item.loja}
                                                </td>

                                                <td className="px-5 py-4">
                                                    {item.tipo_lavagem}
                                                </td>

                                                <td className="px-5 py-4">
                                                    <Etiqueta
                                                        origem={
                                                            item.origem
                                                        }
                                                    />
                                                </td>

                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    {formatarData(
                                                        item.solicitada_em
                                                    )}
                                                </td>

                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    {formatarData(
                                                        item.iniciada_em
                                                    )}
                                                </td>

                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    {formatarData(
                                                        item.finalizada_em
                                                    )}
                                                </td>

                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    {calcularTempo(
                                                        item.iniciada_em,
                                                        item.finalizada_em
                                                    )}
                                                </td>

                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    {calcularTempo(
                                                        item.solicitada_em,
                                                        item.finalizada_em
                                                    )}
                                                </td>

                                            </tr>

                                        )
                                    )}

                                </tbody>

                            </table>

                        </div>

                    </div>

                )}

            </div>

        </MainLayout>

    );

}