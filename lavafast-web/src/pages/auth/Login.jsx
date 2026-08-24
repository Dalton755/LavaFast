import { useState } from "react";

import {
    CreditCard,
    Lock,
    Eye,
    EyeOff,
    LogIn,
    ArrowLeft,
    KeyRound
} from "lucide-react";

import BRAND from "../../config/branding";
import { useAuth } from "../../context/AuthContext";

export default function Login() {

    const {
        login,
        verificarCpf,
        cadastrarSenha
    } = useAuth();

    const [etapa, setEtapa] = useState("CPF");

    const [cpf, setCpf] = useState("");

    const [senha, setSenha] = useState("");

    const [confirmarSenha, setConfirmarSenha] =
        useState("");

    const [mostrarSenha, setMostrarSenha] =
        useState(false);

    const [mostrarConfirmarSenha, setMostrarConfirmarSenha] =
        useState(false);

    const [erro, setErro] = useState("");

    const [sucesso, setSucesso] =
        useState("");

    const [entrando, setEntrando] =
        useState(false);

    const [funcionario, setFuncionario] =
        useState(null);

    const [email, setEmail] =
        useState("");


    function formatarCpf(valor) {

        const somenteNumeros =
            valor
                .replace(/\D/g, "")
                .slice(0, 11);

        return somenteNumeros
            .replace(
                /(\d{3})(\d)/,
                "$1.$2"
            )
            .replace(
                /(\d{3})(\d)/,
                "$1.$2"
            )
            .replace(
                /(\d{3})(\d{1,2})$/,
                "$1-$2"
            );

    }


    function obterCpfLimpo() {

        return cpf.replace(
            /\D/g,
            ""
        );

    }


    function obterCpfFormatado() {

        const cpfLimpo =
            obterCpfLimpo();

        return cpfLimpo.replace(
            /(\d{3})(\d{3})(\d{3})(\d{2})/,
            "$1.$2.$3-$4"
        );

    }


    async function continuarCpf(event) {

        event.preventDefault();

        setErro("");

        setSucesso("");

        const cpfLimpo =
            obterCpfLimpo();

        if (cpfLimpo.length !== 11) {

            setErro(
                "Informe um CPF válido."
            );

            return;

        }

        try {

            setEntrando(true);

            const resultado =
                await verificarCpf(
                    obterCpfFormatado()
                );

            if (!resultado?.encontrado) {

                setErro(
                    "CPF não encontrado."
                );

                return;

            }

            if (!resultado?.possuiEmail) {

                setFuncionario(resultado);

                setEmail("");

                setEtapa("EMAIL");

                return;

            }

            setFuncionario(
                resultado
            );

            if (resultado.possuiAuth) {

                setEtapa("SENHA");

            }
            else {

                setEtapa("CRIAR_SENHA");

            }

        }

        catch (error) {

            console.error(
                "[Verificar CPF]",
                error
            );

            setErro(
                error?.message ||
                "Não foi possível verificar o CPF."
            );

        }

        finally {

            setEntrando(false);

        }

    }


    async function entrar(event) {

        event.preventDefault();

        setErro("");

        const cpfFormatado =
            obterCpfFormatado();

        if (!senha) {

            setErro(
                "Informe sua senha."
            );

            return;

        }

        if (!funcionario?.email) {

            setErro(
                "Funcionário sem e-mail cadastrado."
            );

            return;

        }

        try {

            setEntrando(true);

            await login(
                funcionario.email,
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
                    "CPF ou senha incorretos."
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

    async function continuarEmail(event) {

        event.preventDefault();

        setErro("");
        setSucesso("");

        const emailLimpo =
            email
                .trim()
                .toLowerCase();

        if (!emailLimpo) {

            setErro(
                "Informe seu e-mail."
            );

            return;

        }

        const emailValido =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                .test(emailLimpo);

        if (!emailValido) {

            setErro(
                "Informe um e-mail válido."
            );

            return;

        }

        setEmail(emailLimpo);

        setFuncionario({
            ...funcionario,
            email: emailLimpo
        });

        setEtapa("CRIAR_SENHA");

    }


    async function criarSenha(event) {

        event.preventDefault();

        setErro("");

        setSucesso("");

        if (!senha) {

            setErro(
                "Informe uma senha."
            );

            return;

        }

        if (senha.length < 6) {

            setErro(
                "A senha deve possuir pelo menos 6 caracteres."
            );

            return;

        }

        if (senha !== confirmarSenha) {

            setErro(
                "As senhas não coincidem."
            );

            return;

        }

        try {

            setEntrando(true);

            const resultado =
                await cadastrarSenha(
                    obterCpfFormatado(),
                    senha,
                    email
                );

            setSenha("");

            setConfirmarSenha("");

            setFuncionario({
                ...funcionario,
                email: resultado.email
            });

            setEtapa("SENHA");

            setSucesso(
                "Senha criada com sucesso. Agora entre com seu CPF e sua senha."
            );

        }

        catch (error) {

            console.error(
                "[Criar senha]",
                error
            );

            setErro(
                error?.message ||
                "Não foi possível criar sua senha."
            );

        }

        finally {

            setEntrando(false);

        }

    }


    function voltarCpf() {

        setErro("");

        setSucesso("");

        setSenha("");

        setConfirmarSenha("");

        setFuncionario(null);

        setEtapa("CPF");

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


                    {/* CPF */}

                    {etapa === "CPF" && (

                        <>

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

                                    Informe seu CPF para continuar.

                                </p>

                            </div>

                            <form
                                onSubmit={continuarCpf}
                                className="space-y-5"
                            >

                                <div>

                                    <label className="
                                        block
                                        text-sm
                                        font-semibold
                                        text-slate-700
                                        mb-2
                                    ">

                                        CPF

                                    </label>

                                    <div className="
                                        relative
                                    ">

                                        <CreditCard
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
                                            type="text"
                                            value={cpf}
                                            onChange={event =>
                                                setCpf(
                                                    formatarCpf(
                                                        event.target.value
                                                    )
                                                )
                                            }
                                            placeholder="000.000.000-00"
                                            autoFocus
                                            autoComplete="username"
                                            disabled={entrando}
                                            maxLength={14}
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

                                    {entrando
                                        ? "Verificando..."
                                        : "Continuar"
                                    }

                                </button>

                            </form>

                        </>

                    )}

                    {/* EMAIL */}

                    {etapa === "EMAIL" && (

                        <>

                            <div className="mb-6">

                                <h2 className="
                text-xl
                font-bold
                text-slate-800
            ">

                                    Informe seu e-mail

                                </h2>

                                <p className="
                text-sm
                text-slate-500
                mt-1
            ">

                                    Olá, {funcionario?.nome}.
                                    Precisamos do seu e-mail para criar seu acesso.

                                </p>

                            </div>

                            <form
                                onSubmit={continuarEmail}
                                className="space-y-5"
                            >

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

                                    <input
                                        type="email"
                                        value={email}
                                        onChange={event =>
                                            setEmail(event.target.value)
                                        }
                                        placeholder="seu@email.com"
                                        autoFocus
                                        disabled={entrando}
                                        className="
                        w-full
                        border
                        border-slate-200
                        rounded-xl
                        px-4
                        py-3
                        text-sm
                        text-slate-800
                        outline-none
                        focus:border-blue-500
                        focus:ring-2
                        focus:ring-blue-100
                        disabled:bg-slate-50
                    "
                                    />

                                </div>

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

                                <button
                                    type="submit"
                                    disabled={entrando}
                                    className="
                    w-full
                    rounded-xl
                    bg-blue-600
                    hover:bg-blue-700
                    disabled:bg-blue-400
                    text-white
                    font-semibold
                    py-3
                "
                                >

                                    {entrando
                                        ? "Verificando..."
                                        : "Continuar"
                                    }

                                </button>

                                <button
                                    type="button"
                                    onClick={voltarCpf}
                                    disabled={entrando}
                                    className="
                    w-full
                    flex
                    items-center
                    justify-center
                    gap-2
                    text-sm
                    text-slate-500
                    hover:text-slate-800
                    py-2
                "
                                >

                                    <ArrowLeft size={16} />

                                    Alterar CPF

                                </button>

                            </form>

                        </>

                    )}


                    {/* SENHA */}

                    {etapa === "SENHA" && (

                        <>

                            <div className="mb-6">

                                <h2 className="
                                    text-xl
                                    font-bold
                                    text-slate-800
                                ">

                                    Bem-vindo!

                                </h2>

                                <p className="
                                    text-sm
                                    text-slate-500
                                    mt-1
                                ">

                                    Olá, {funcionario?.nome}.

                                </p>

                            </div>


                            {sucesso && (

                                <div className="
                                    rounded-xl
                                    bg-green-50
                                    border
                                    border-green-200
                                    text-green-700
                                    text-sm
                                    font-medium
                                    px-4
                                    py-3
                                    mb-5
                                ">

                                    {sucesso}

                                </div>

                            )}


                            <form
                                onSubmit={entrar}
                                className="space-y-5"
                            >

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
                                            autoFocus
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


                                <button
                                    type="button"
                                    onClick={voltarCpf}
                                    disabled={entrando}
                                    className="
                                        w-full
                                        flex
                                        items-center
                                        justify-center
                                        gap-2
                                        text-sm
                                        text-slate-500
                                        hover:text-slate-800
                                        py-2
                                    "
                                >

                                    <ArrowLeft size={16} />

                                    Alterar CPF

                                </button>

                            </form>

                        </>

                    )}


                    {/* CRIAR SENHA */}

                    {etapa === "CRIAR_SENHA" && (

                        <>

                            <div className="mb-6">

                                <div className="
                                    w-12
                                    h-12
                                    rounded-2xl
                                    bg-blue-50
                                    text-blue-600
                                    flex
                                    items-center
                                    justify-center
                                    mb-4
                                ">

                                    <KeyRound
                                        size={24}
                                    />

                                </div>

                                <h2 className="
                                    text-xl
                                    font-bold
                                    text-slate-800
                                ">

                                    Crie sua senha

                                </h2>

                                <p className="
                                    text-sm
                                    text-slate-500
                                    mt-1
                                ">

                                    Olá, {funcionario?.nome}. Crie uma senha para acessar o sistema.

                                </p>

                            </div>


                            <form
                                onSubmit={criarSenha}
                                className="space-y-5"
                            >

                                <div>

                                    <label className="
                                        block
                                        text-sm
                                        font-semibold
                                        text-slate-700
                                        mb-2
                                    ">

                                        Nova senha

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
                                            placeholder="Mínimo de 6 caracteres"
                                            autoFocus
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


                                <div>

                                    <label className="
                                        block
                                        text-sm
                                        font-semibold
                                        text-slate-700
                                        mb-2
                                    ">

                                        Confirmar senha

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
                                                mostrarConfirmarSenha
                                                    ? "text"
                                                    : "password"
                                            }
                                            value={confirmarSenha}
                                            onChange={event =>
                                                setConfirmarSenha(
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Digite novamente sua senha"
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
                                                setMostrarConfirmarSenha(
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

                                            {mostrarConfirmarSenha
                                                ? <EyeOff size={18} />
                                                : <Eye size={18} />
                                            }

                                        </button>

                                    </div>

                                </div>


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

                                    <KeyRound size={18} />

                                    {entrando
                                        ? "Criando senha..."
                                        : "Criar senha"
                                    }

                                </button>


                                <button
                                    type="button"
                                    onClick={voltarCpf}
                                    disabled={entrando}
                                    className="
                                        w-full
                                        flex
                                        items-center
                                        justify-center
                                        gap-2
                                        text-sm
                                        text-slate-500
                                        hover:text-slate-800
                                        py-2
                                    "
                                >

                                    <ArrowLeft size={16} />

                                    Alterar CPF

                                </button>

                            </form>

                        </>

                    )}

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