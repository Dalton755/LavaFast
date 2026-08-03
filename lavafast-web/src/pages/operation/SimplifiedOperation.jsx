import MainLayout from "../../layouts/MainLayout";
import useOperacaoSimplificada from "../../hooks/useOperacaoSimplificada";
import LocalizaCard from "../../components/operation-simple/LocalizaCard";
import useLavagensParticulares from "../../hooks/useLavagensParticulares";
import ParticularCard from "../../components/operation-center/ParticularCard";
import { useState } from "react";
import NovaParticularModal from "../../components/operation-center/NovaParticularModal";
import useFuncionarios from "../../hooks/useFuncionarios";
import useTiposLavagem from "../../hooks/useTiposLavagem";
import NovaLocalizaModal from "../../components/operation-center/NovaLocalizaModal";
import useLoja from "../../hooks/useLoja";
import logoLocaliza from "../../assets/localiza.png";


export default function SimplifiedOperation() {

    const {

        localiza,

        concluirLocaliza,

        criarLocalizaManual

    } = useOperacaoSimplificada();

    const {

        lavagens,

        criar,

        concluir

    } = useLavagensParticulares();

    const { tipos } = useTiposLavagem();

    const { lojas } = useLoja();

    const [modalParticular, setModalParticular] = useState(false);

    const [modalLocaliza, setModalLocaliza] = useState(false);

    const [pesquisa, setPesquisa] = useState("");

    const [operacao, setOperacao] = useState("LOCALIZA");

    const {

        funcionarios

    } = useFuncionarios();



    return (

        <MainLayout>

            <>
                {/* Mobile */}
                <h1 className="text-3xl font-bold mb-8 lg:hidden">



                    {operacao === "LOCALIZA"

                        ? "PAINEL LOCALIZA"

                        : "PAINEL PARTICULAR"}

                </h1>

                {/* Desktop */}
                <h1 className="hidden lg:block text-3xl font-bold mb-8">

                    PAINEL OPERACIONAL

                </h1>
            </>

            <div className="mb-6">

                <input

                    type="text"

                    placeholder="Pesquisar placa..."

                    value={pesquisa}

                    onChange={(e) => setPesquisa(e.target.value.toUpperCase())}

                    className="
                                w-full
                                lg:w-[420px]
                                border
                                rounded-xl
                                px-4
                                py-3
                                shadow-sm
                                focus:outline-none
                                focus:ring-2
                                focus:ring-blue-500
                            "

                />

            </div>

            <div className="lg:hidden flex bg-white rounded-2xl shadow p-1 mb-6">

                <button

                    onClick={() => setOperacao("LOCALIZA")}

                    className={`

                        flex-1
                        py-3
                        rounded-xl
                        font-semibold
                        transition

                        ${operacao === "LOCALIZA"

                            ? "bg-green-600 text-white"

                            : "text-slate-600"

                        }

                        `}

                >

                    <img
                        src={logoLocaliza}
                        alt="Localiza"
                        className="w-[90%] h-auto object-contain"
                    />

                </button>

                <button

                    onClick={() => setOperacao("PARTICULAR")}

                    className={`

            flex-1
            py-3
            rounded-xl
            font-semibold
            transition

            ${operacao === "PARTICULAR"

                            ? "bg-blue-600 text-white"

                            : "text-slate-600"

                        }

        `}

                >

                    👤 Particular

                </button>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                <div
                    className={`

                        bg-white
                        rounded-2xl
                        shadow
                        p-6

                        ${operacao !== "LOCALIZA"

                            ? "hidden lg:block"

                            : ""

                        }

                    `}
                >

                    <div className="flex items-center justify-between mb-6">

                        <h2 className="text-xl font-bold">

                            🚗 Localiza

                        </h2>

                        <button

                            onClick={() => setModalLocaliza(true)}
                            className="
                                bg-blue-600
                                text-white
                                px-4
                                py-2
                                rounded-xl
                                hover:bg-blue-700
                            "
                        >

                            + Criar lavagem

                        </button>

                    </div>

                    <div className="space-y-4">

                        {

                            localiza.length === 0

                                ?

                                (

                                    <div className="text-slate-400 text-center py-20">

                                        Nenhuma solicitação

                                    </div>

                                )

                                :

                                (

                                    localiza

                                        .filter(item =>

                                            item.placa

                                                ?.toUpperCase()

                                                .includes(

                                                    pesquisa.toUpperCase()

                                                )

                                        )

                                        .map(item => (

                                            <LocalizaCard

                                                key={item.id}

                                                solicitacao={item}

                                                onConcluir={concluirLocaliza}

                                            />

                                        ))

                                )

                        }

                    </div>

                </div>

                <div
                    className={`

                        bg-white
                        rounded-2xl
                        shadow
                        p-6

                        ${operacao !== "PARTICULAR"

                            ? "hidden lg:block"

                            : ""

                        }

            `}
                >

                    <div className="flex items-center justify-between mb-6">

                        <h2 className="text-xl font-bold">

                            👤 Avulsos

                        </h2>

                        <button

                            onClick={() => setModalParticular(true)}
                            className="
                                bg-blue-600
                                text-white
                                px-4
                                py-2
                                rounded-xl
                                hover:bg-blue-700
                            "
                        >

                            + Criar lavagem

                        </button>

                    </div>

                    <div className="space-y-4">

                        {

                            lavagens.length === 0

                                ? (

                                    <div className="text-slate-400 text-center py-20">

                                        Nenhuma lavagem

                                    </div>

                                )

                                : (

                                    lavagens

                                        .filter(lavagem =>

                                            lavagem.placa

                                                ?.toUpperCase()

                                                .includes(

                                                    pesquisa.toUpperCase()

                                                )

                                        )

                                        .map(lavagem => (

                                            <ParticularCard

                                                key={lavagem.id}

                                                lavagem={lavagem}

                                                onConcluir={concluir}

                                            />

                                        ))

                                )

                        }

                    </div>

                </div>

            </div>

            <NovaParticularModal

                aberto={modalParticular}

                fechar={() => setModalParticular(false)}

                funcionarios={funcionarios}

                onSalvar={criar}

            />

            <NovaLocalizaModal

                aberto={modalLocaliza}

                fechar={() => setModalLocaliza(false)}

                lojas={lojas}

                tipos={tipos}

                onSalvar={criarLocalizaManual}

            />

        </MainLayout>

    );

}