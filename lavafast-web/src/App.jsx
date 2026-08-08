import { useState } from "react";

import SimplifiedOperation from "./pages/operation/SimplifiedOperation";
import CompletedOperation from "./pages/operation/CompletedOperation";

import { LojaProvider } from "./context/LojaContext";

export default function App() {

    const [pagina, setPagina] = useState("OPERACAO");

    return (

        <LojaProvider>

            {pagina === "OPERACAO" && (

                <SimplifiedOperation
                    abrirConcluidos={() => setPagina("CONCLUIDOS")}
                />

            )}

            {pagina === "CONCLUIDOS" && (

                <CompletedOperation
                    voltar={() => setPagina("OPERACAO")}
                />

            )}

        </LojaProvider>

    );

}