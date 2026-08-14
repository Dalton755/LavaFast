import { useState } from "react";

import SimplifiedOperation from "./pages/operation/SimplifiedOperation";
import CompletedOperation from "./pages/operation/CompletedOperation";

import { LojaProvider } from "./context/LojaContext";

const SENHA_RELATORIO = "112132";

export default function App() {

    const [pagina, setPagina] = useState("OPERACAO");
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [senha, setSenha] = useState("");
    const [erroSenha, setErroSenha] = useState("");

    function abrirRelatorio() {

        setSenha("");
        setErroSenha("");
        setMostrarSenha(true);

    }

    function validarSenha() {

        if (senha === SENHA_RELATORIO) {

            setMostrarSenha(false);
            setSenha("");
            setErroSenha("");
            setPagina("CONCLUIDOS");

            return;

        }

        setErroSenha("Senha incorreta.");

    }

    function cancelarSenha() {

        setMostrarSenha(false);
        setSenha("");
        setErroSenha("");

    }

    return (

        <LojaProvider>

            {pagina === "OPERACAO" && (

                <SimplifiedOperation
                    abrirConcluidos={abrirRelatorio}
                />

            )}

            {pagina === "CONCLUIDOS" && (

                <CompletedOperation
                    voltar={() => setPagina("OPERACAO")}
                />

            )}

            {mostrarSenha && (

                <div className="
                    fixed
                    inset-0
                    z-50
                    flex
                    items-center
                    justify-center
                    bg-slate-900/60
                    backdrop-blur-sm
                    p-4
                ">

                    <div className="
                        w-full
                        max-w-sm
                        bg-white
                        rounded-2xl
                        shadow-2xl
                        p-6
                    ">

                        <div className="text-center mb-6">

                            <div className="
                                mx-auto
                                w-14
                                h-14
                                rounded-2xl
                                bg-blue-100
                                text-blue-600
                                flex
                                items-center
                                justify-center
                                text-2xl
                                mb-4
                            ">

                                🔒

                            </div>

                            <h2 className="
                                text-xl
                                font-bold
                                text-slate-800
                            ">

                                Acesso restrito

                            </h2>

                            <p className="
                                text-sm
                                text-slate-500
                                mt-1
                            ">

                                Digite a senha para acessar os relatórios.

                            </p>

                        </div>

                        <input
                            type="password"
                            value={senha}
                            onChange={e => {
                                setSenha(e.target.value);
                                setErroSenha("");
                            }}
                            onKeyDown={e => {
                                if (e.key === "Enter") {
                                    validarSenha();
                                }
                            }}
                            placeholder="Digite a senha"
                            autoFocus
                            className="
                                w-full
                                border
                                border-slate-200
                                rounded-xl
                                px-4
                                py-3
                                text-center
                                text-lg
                                tracking-widest
                                focus:outline-none
                                focus:ring-2
                                focus:ring-blue-500
                            "
                        />

                        {erroSenha && (

                            <p className="
                                text-sm
                                text-red-600
                                text-center
                                mt-3
                                font-medium
                            ">

                                {erroSenha}

                            </p>

                        )}

                        <div className="
                            flex
                            gap-3
                            mt-5
                        ">

                            <button
                                onClick={cancelarSenha}
                                className="
                                    flex-1
                                    px-4
                                    py-3
                                    rounded-xl
                                    border
                                    border-slate-200
                                    text-slate-600
                                    font-semibold
                                    hover:bg-slate-50
                                    transition
                                "
                            >

                                Cancelar

                            </button>

                            <button
                                onClick={validarSenha}
                                className="
                                    flex-1
                                    px-4
                                    py-3
                                    rounded-xl
                                    bg-blue-600
                                    hover:bg-blue-700
                                    text-white
                                    font-semibold
                                    transition
                                "
                            >

                                Entrar

                            </button>

                        </div>

                    </div>

                </div>

            )}

        </LojaProvider>

    );

}