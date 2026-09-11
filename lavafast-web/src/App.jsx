import { useState } from "react";

import SimplifiedOperation from "./pages/operation/SimplifiedOperation";
import CompletedOperation from "./pages/operation/CompletedOperation";
import Login from "./pages/auth/Login";
import ProductivityDashboard
    from "./pages/operation/ProductivityDashboard";
import ProductivityDetails
    from "./pages/operation/ProductivityDetails";

import { LojaProvider } from "./context/LojaContext";
import { useAuth } from "./context/AuthContext";

function Sistema() {

    const {
        usuario,
    } = useAuth();

    const [pagina, setPagina] = useState("OPERACAO");

    const [
        detalheProdutividade,
        setDetalheProdutividade
    ] = useState(null);

    function abrirRelatorio() {

        setPagina("CONCLUIDOS");

    }

    function abrirProdutividade() {

        setPagina("PRODUTIVIDADE");

    }

    function abrirDetalhesProdutividade(
        configuracao
    ) {

        setDetalheProdutividade(
            configuracao
        );

        setPagina(
            "PRODUTIVIDADE_DETALHES"
        );

    }

    return (

        <LojaProvider>

            {pagina === "OPERACAO" && (

                <SimplifiedOperation
                    abrirConcluidos={abrirRelatorio}
                    abrirProdutividade={abrirProdutividade}
                    usuario={usuario}
                />

            )}

            {pagina === "CONCLUIDOS" && (

                <CompletedOperation
                    voltar={() =>
                        setPagina("OPERACAO")
                    }

                    usuario={usuario}

                />

            )}

            {pagina === "PRODUTIVIDADE" && (

                <ProductivityDashboard
                    voltar={() =>
                        setPagina("OPERACAO")
                    }

                    abrirDetalhes={
                        abrirDetalhesProdutividade
                    }
                />



            )}

            {pagina === "PRODUTIVIDADE_DETALHES" &&
                detalheProdutividade && (

                    <ProductivityDetails
                        configuracao={
                            detalheProdutividade
                        }

                        voltar={() =>
                            setPagina(
                                "PRODUTIVIDADE"
                            )
                        }
                    />

                )}

        </LojaProvider>

    );

}

export default function App() {

    const {
        usuario,
        loading
    } = useAuth();

    if (loading) {

        return (

            <div className="
                min-h-screen
                bg-slate-100
                flex
                items-center
                justify-center
            ">

                <div className="
                    text-center
                ">

                    <div className="
                        w-10
                        h-10
                        border-4
                        border-slate-200
                        border-t-blue-600
                        rounded-full
                        animate-spin
                        mx-auto
                        mb-4
                    " />

                    <p className="
                        text-sm
                        text-slate-500
                    ">

                        Carregando...

                    </p>

                </div>

            </div>

        );

    }

    if (!usuario) {

        return <Login />;

    }

    return (

        <Sistema />

    );

}