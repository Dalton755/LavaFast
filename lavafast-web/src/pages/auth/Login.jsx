import { useState } from "react";
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    LogIn
} from "lucide-react";

import BRAND from "../../config/branding";
import { useAuth } from "../../context/AuthContext";

export default function Login() {

    const {
        login
    } = useAuth();

    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [erro, setErro] = useState("");
    const [entrando, setEntrando] = useState(false);

    async function entrar(event) {

        event.preventDefault();

        setErro("");

        if (!email.trim() || !senha) {

            setErro(
                "Informe seu e-mail e sua senha."
            );

            return;

        }

        try {

            setEntrando(true);

            await login(
                email.trim(),
                senha
            );

        }

        catch (error) {

            console.error(
                "[Login]",
                error
            );

            if (
                error?.message?.includes(
                    "Invalid login credentials"
                )
            ) {

                setErro(
                    "E-mail ou senha incorretos."
                );

            }
            else {

                setErro(
                    error?.message ||
                    "Não foi possível realizar o login."
                );

            }

        }

        finally {

            setEntrando(false);

        }

    }

    return (

        <main className="
            min-h-screen
            bg-slate-100
            flex
            items-center
            justify-center
            p-6
        ">

            <div className="
                w-full
                max-w-md
            ">

                <div className="
                    bg-white
                    rounded-3xl
                    shadow-xl
                    border
                    border-slate-200
                    p-8
                ">

                    {/* LOGO */}

                    <div className="
                        flex
                        flex-col
                        items-center
                        mb-8
                    ">

                        <div className="
                            w-20
                            h-20
                            rounded-3xl
                            bg-white
                            border
                            border-slate-200
                            shadow-md
                            flex
                            items-center
                            justify-center
                            overflow-hidden
                            mb-4
                        ">

                            <img
                                src={BRAND.logo}
                                alt={BRAND.nome}
                                className="
                                    w-16
                                    h-16
                                    object-contain
                                "
                            />

                        </div>

                        <h1 className="
                            text-2xl
                            font-bold
                            text-slate-800
                        ">

                            {BRAND.nome}

                        </h1>

                        <p className="
                            text-sm
                            text-slate-500
                            mt-1
                        ">

                            {BRAND.subtitulo}

                        </p>

                    </div>

                    {/* TÍTULO */}

                    <div className="mb-6">

                        <h2 className="
                            text-xl
                            font-bold
                            text-slate-800
                        ">

                            Entrar

                        </h2>

                        <p className="
                            text-sm
                            text-slate-500
                            mt-1
                        ">

                            Acesse sua conta para continuar.

                        </p>

                    </div>

                    <form
                        onSubmit={entrar}
                        className="space-y-5"
                    >

                        {/* E-MAIL */}

                        <div>

                            <label className="
                                block
                                text-sm
                                font-semibold
                                text-slate-700
                                mb-2
                            ">

                                E-mail

                            </label>

                            <div className="
                                relative
                            ">

                                <Mail
                                    size={18}
                                    className="
                                        absolute
                                        left-4
                                        top-1/2
                                        -translate-y-1/2
                                        text-slate-400
                                    "
                                />

                                <input
                                    type="email"
                                    value={email}
                                    onChange={event =>
                                        setEmail(
                                            event.target.value
                                        )
                                    }
                                    placeholder="seu@email.com"
                                    autoComplete="email"
                                    disabled={entrando}
                                    className="
                                        w-full
                                        border
                                        border-slate-200
                                        rounded-xl
                                        pl-11
                                        pr-4
                                        py-3
                                        text-sm
                                        text-slate-800
                                        outline-none
                                        transition
                                        focus:border-blue-500
                                        focus:ring-2
                                        focus:ring-blue-100
                                        disabled:bg-slate-50
                                    "
                                />

                            </div>

                        </div>

                        {/* SENHA */}

                        <div>

                            <label className="
                                block
                                text-sm
                                font-semibold
                                text-slate-700
                                mb-2
                            ">

                                Senha

                            </label>

                            <div className="
                                relative
                            ">

                                <Lock
                                    size={18}
                                    className="
                                        absolute
                                        left-4
                                        top-1/2
                                        -translate-y-1/2
                                        text-slate-400
                                    "
                                />

                                <input
                                    type={
                                        mostrarSenha
                                            ? "text"
                                            : "password"
                                    }
                                    value={senha}
                                    onChange={event =>
                                        setSenha(
                                            event.target.value
                                        )
                                    }
                                    placeholder="Digite sua senha"
                                    autoComplete="current-password"
                                    disabled={entrando}
                                    className="
                                        w-full
                                        border
                                        border-slate-200
                                        rounded-xl
                                        pl-11
                                        pr-12
                                        py-3
                                        text-sm
                                        text-slate-800
                                        outline-none
                                        transition
                                        focus:border-blue-500
                                        focus:ring-2
                                        focus:ring-blue-100
                                        disabled:bg-slate-50
                                    "
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setMostrarSenha(
                                            valor => !valor
                                        )
                                    }
                                    disabled={entrando}
                                    className="
                                        absolute
                                        right-3
                                        top-1/2
                                        -translate-y-1/2
                                        p-2
                                        text-slate-400
                                        hover:text-slate-700
                                    "
                                >

                                    {mostrarSenha
                                        ? <EyeOff size={18} />
                                        : <Eye size={18} />
                                    }

                                </button>

                            </div>

                        </div>

                        {/* ERRO */}

                        {erro && (

                            <div className="
                                rounded-xl
                                bg-red-50
                                border
                                border-red-200
                                text-red-700
                                text-sm
                                font-medium
                                px-4
                                py-3
                            ">

                                {erro}

                            </div>

                        )}

                        {/* BOTÃO */}

                        <button
                            type="submit"
                            disabled={entrando}
                            className="
                                w-full
                                flex
                                items-center
                                justify-center
                                gap-2
                                rounded-xl
                                bg-blue-600
                                hover:bg-blue-700
                                disabled:bg-blue-400
                                text-white
                                font-semibold
                                py-3
                                transition
                                shadow-sm
                            "
                        >

                            <LogIn size={18} />

                            {entrando
                                ? "Entrando..."
                                : "Entrar"
                            }

                        </button>

                    </form>

                </div>

                <p className="
                    text-center
                    text-xs
                    text-slate-400
                    mt-6
                ">

                    Acesso restrito aos funcionários cadastrados.

                </p>

            </div>

        </main>

    );

}