import {
    useEffect,
    useState
} from "react";

import {
    ArrowLeft,
    CalendarDays,
    CalendarRange,
    CalendarClock,
    BarChart3,
    ChevronRight
} from "lucide-react";

import MainLayout
    from "../../layouts/MainLayout";

import useLoja
    from "../../hooks/useLoja";

import {
    obterProdutividade
} from "../../api/produtividade";

function formatarData(data) {

    if (!data) {
        return "";
    }

    const [
        ano,
        mes,
        dia
    ] = data.split("-");

    return `${dia}/${mes}/${ano}`;

}

function CardProdutividade({
    titulo,
    valor,
    inicio,
    fim,
    Icone,
    onClick
}) {

    return (

        <button
            type="button"
            onClick={onClick}
            className="
                text-left
                bg-white
                border
                border-slate-200
                rounded-2xl
                p-6
                shadow-sm
                min-h-[180px]
                flex
                flex-col
                justify-between
                transition
                hover:border-blue-300
                hover:shadow-md
                group
            "
        >

            <div
                className="
                    flex
                    items-start
                    justify-between
                    gap-4
                    w-full
                "
            >

                <div>

                    <p
                        className="
                            text-sm
                            font-semibold
                            uppercase
                            tracking-wide
                            text-slate-500
                        "
                    >
                        {titulo}
                    </p>

                    <p
                        className="
                            text-5xl
                            font-bold
                            text-slate-900
                            mt-3
                        "
                    >
                        {valor}
                    </p>

                </div>

                <div
                    className="
                        w-12
                        h-12
                        rounded-xl
                        bg-blue-50
                        text-blue-600
                        flex
                        items-center
                        justify-center
                    "
                >
                    <Icone size={24} />
                </div>

            </div>

            <div
                className="
                    flex
                    justify-between
                    items-end
                    gap-3
                    w-full
                    mt-5
                "
            >

                <span
                    className="
                        text-sm
                        text-slate-500
                    "
                >
                    {inicio === fim
                        ? formatarData(
                            inicio
                        )
                        : (
                            <>
                                {formatarData(
                                    inicio
                                )}

                                {" até "}

                                {formatarData(
                                    fim
                                )}
                            </>
                        )
                    }
                </span>

                <span
                    className="
                        flex
                        items-center
                        gap-1
                        text-sm
                        font-semibold
                        text-blue-600
                    "
                >
                    Ver placas
                    <ChevronRight
                        size={17}
                    />
                </span>

            </div>

        </button>

    );

}

export default function ProductivityDashboard({
    voltar,
    abrirDetalhes
}) {

    const {
        lojas
    } = useLoja();

    const [
        lojasSelecionadas,
        setLojasSelecionadas
    ] = useState([]);

    const [
        dados,
        setDados
    ] = useState(null);

    const [
        loading,
        setLoading
    ] = useState(true);

    const [
        erro,
        setErro
    ] = useState("");

    function alternarLoja(id) {

        setLojasSelecionadas(
            atuais => {

                if (
                    atuais.includes(
                        id
                    )
                ) {

                    return atuais.filter(
                        item =>
                            item !== id
                    );

                }

                return [
                    ...atuais,
                    id
                ];

            }
        );

    }

    function selecionarTodas() {

        setLojasSelecionadas(
            []
        );

    }

    useEffect(() => {

        let ativo = true;

        async function carregar() {

            try {

                setLoading(true);
                setErro("");

                const resultado =
                    await obterProdutividade(
                        lojasSelecionadas
                    );

                if (!ativo) {
                    return;
                }

                setDados(
                    resultado
                );

            }
            catch (error) {

                console.error(
                    "Erro ao carregar produtividade:",
                    error
                );

                if (!ativo) {
                    return;
                }

                setErro(
                    error.response?.data?.erro ||
                    "Não foi possível carregar o painel."
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
        lojasSelecionadas
    ]);

    function abrir(
        periodo,
        titulo
    ) {

        abrirDetalhes({
            periodo,
            titulo,
            lojasSelecionadas
        });

    }

    return (

        <MainLayout>

            <div
                className="
                    max-w-[1500px]
                    mx-auto
                "
            >

                <div
                    className="
                        flex
                        items-center
                        gap-4
                        mb-8
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
                            hover:bg-slate-50
                        "
                    >
                        <ArrowLeft size={22} />
                    </button>

                    <div>

                        <h1
                            className="
                                text-3xl
                                font-bold
                                text-slate-900
                            "
                        >
                            Painel Gerencial
                        </h1>

                        <p
                            className="
                                text-slate-500
                                mt-1
                            "
                        >
                            Produtividade por data de finalização
                        </p>

                    </div>

                </div>

                <div
                    className="
                        bg-white
                        border
                        border-slate-200
                        rounded-2xl
                        p-5
                        mb-6
                    "
                >

                    <div
                        className="
                            flex
                            items-center
                            justify-between
                            gap-4
                            mb-4
                        "
                    >

                        <div>

                            <h2
                                className="
                                    font-bold
                                    text-slate-900
                                "
                            >
                                Filtrar por loja
                            </h2>

                            <p
                                className="
                                    text-sm
                                    text-slate-500
                                "
                            >
                                Selecione uma ou mais lojas
                            </p>

                        </div>

                        <button
                            type="button"
                            onClick={selecionarTodas}
                            className="
                                text-sm
                                font-semibold
                                text-blue-600
                            "
                        >
                            Todas
                        </button>

                    </div>

                    <div
                        className="
                            flex
                            flex-wrap
                            gap-3
                        "
                    >

                        {lojas.map(
                            loja => (

                                <label
                                    key={loja.id}
                                    className="
                                        flex
                                        items-center
                                        gap-2
                                        border
                                        border-slate-200
                                        rounded-xl
                                        px-4
                                        py-3
                                        cursor-pointer
                                        hover:bg-slate-50
                                    "
                                >

                                    <input
                                        type="checkbox"
                                        checked={
                                            lojasSelecionadas
                                                .includes(
                                                    loja.id
                                                )
                                        }
                                        onChange={() =>
                                            alternarLoja(
                                                loja.id
                                            )
                                        }
                                        className="
                                            w-4
                                            h-4
                                        "
                                    />

                                    <span
                                        className="
                                            text-sm
                                            font-medium
                                            text-slate-700
                                        "
                                    >
                                        {loja.nome}
                                    </span>

                                </label>

                            )
                        )}

                    </div>

                </div>

                {loading && (

                    <div
                        className="
                            bg-white
                            rounded-2xl
                            p-10
                            text-center
                            text-slate-500
                            border
                        "
                    >
                        Carregando produtividade...
                    </div>

                )}

                {!loading && erro && (

                    <div
                        className="
                            bg-white
                            rounded-2xl
                            p-10
                            text-center
                            text-red-600
                            border
                        "
                    >
                        {erro}
                    </div>

                )}

                {!loading &&
                    !erro &&
                    dados && (

                    <div
                        className="
                            grid
                            grid-cols-1
                            sm:grid-cols-2
                            xl:grid-cols-4
                            gap-5
                        "
                    >

                        <CardProdutividade
                            titulo="Hoje"
                            valor={
                                dados.hoje?.total || 0
                            }
                            inicio={
                                dados.hoje?.inicio
                            }
                            fim={
                                dados.hoje?.fim
                            }
                            Icone={CalendarDays}
                            onClick={() =>
                                abrir(
                                    "hoje",
                                    "Hoje"
                                )
                            }
                        />

                        <CardProdutividade
                            titulo="Esta semana"
                            valor={
                                dados.semana?.total || 0
                            }
                            inicio={
                                dados.semana?.inicio
                            }
                            fim={
                                dados.semana?.fim
                            }
                            Icone={CalendarRange}
                            onClick={() =>
                                abrir(
                                    "semana",
                                    "Esta semana"
                                )
                            }
                        />

                        <CardProdutividade
                            titulo="Esta quinzena"
                            valor={
                                dados.quinzena?.total || 0
                            }
                            inicio={
                                dados.quinzena?.inicio
                            }
                            fim={
                                dados.quinzena?.fim
                            }
                            Icone={CalendarClock}
                            onClick={() =>
                                abrir(
                                    "quinzena",
                                    "Esta quinzena"
                                )
                            }
                        />

                        <CardProdutividade
                            titulo="Este mês"
                            valor={
                                dados.mes?.total || 0
                            }
                            inicio={
                                dados.mes?.inicio
                            }
                            fim={
                                dados.mes?.fim
                            }
                            Icone={BarChart3}
                            onClick={() =>
                                abrir(
                                    "mes",
                                    "Este mês"
                                )
                            }
                        />

                    </div>

                )}

            </div>

        </MainLayout>

    );

}