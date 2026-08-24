import { Building2, User } from 'lucide-react';
import BRAND from "../../config/branding";
import { useLoja } from "../../context/LojaContext";
import { useAuth } from "../../context/AuthContext";
import { useState } from "react";
import FiltroLojas from "../common/FiltroLojas";

export default function Header() {

    const { usuario, logout } = useAuth();

    const [abrirFiltro, setAbrirFiltro] = useState(false);
    const [abrirUsuario, setAbrirUsuario] = useState(false);

    const {

        lojas,

        loja,

        selecionar

    } = useLoja();


    return (

        <header
            className="
            h-20
            bg-white/90
            backdrop-blur-md
            border-b
            border-slate-200
            shadow-sm
            sticky
            top-0
            z-50
            "
        >

            <div
                className="
                max-w-7xl
                mx-auto
                h-full
                px-8
                flex
                items-center
                justify-between
                "
            >

                <div className="flex items-center gap-3">

                    <div
                        className="
                        w-12
                        h-12
                        rounded-2xl
                        bg-white
                        shadow-md
                        border
                        border-slate-200
                        flex
                        items-center
                        justify-center
                        overflow-hidden
                        "
                    >

                        <img

                            src={BRAND.logo}

                            alt={BRAND.nome}

                            className="w-10 h-10 object-contain"

                        />

                    </div>

                    <div>

                        <h1 className="text-xl font-bold text-slate-800">

                            {BRAND.nome}

                        </h1>

                        <p className="text-xs text-slate-500">

                            {BRAND.subtitulo}

                        </p>

                    </div>

                </div>

                <div className="relative">

                    <button

                        onClick={() => setAbrirFiltro(!abrirFiltro)}

                        className="
                            flex
                            items-center
                            gap-3
                            px-5
                            py-3
                            rounded-2xl
                            bg-slate-50
                            border
                            border-slate-200
                            hover:border-amber-400
                            transition-all
                            duration-200
                        "

                    >

                        <Building2

                            size={18}

                            className="text-slate-500"

                        />

                        <span className="text-sm font-medium">

                            Lojas

                        </span>

                    </button>

                    {

                        abrirFiltro && (

                            <div

                                className="
                                    fixed
                                    top-20
                                    left-4
                                    right-4
                                    z-[9999]
                                "

                            >

                                <FiltroLojas
                                    onChange={() => setAbrirFiltro(false)}
                                />

                            </div>

                        )

                    }

                </div>

                <div className="relative">

                    <button
                        onClick={() =>
                            setAbrirUsuario(valor => !valor)
                        }
                        className="
            flex
            items-center
            gap-3
            px-3
            py-2
            rounded-2xl
            hover:bg-slate-50
            transition
        "
                    >

                        <div
                            className="
                w-11
                h-11
                rounded-full
                bg-gradient-to-br
                from-slate-100
                to-slate-200
                flex
                items-center
                justify-center
                shadow-sm
            "
                        >

                            <User size={18} />

                        </div>

                        <span className="text-sm font-medium">

                            {usuario?.nome || "Usuário"}

                        </span>

                    </button>

                    {abrirUsuario && (

                        <div
                            className="
                absolute
                right-0
                top-14
                w-64
                bg-white
                border
                border-slate-200
                rounded-2xl
                shadow-xl
                p-2
                z-[9999]
            "
                        >

                            <div className="px-3 py-3">

                                <p className="
                    text-sm
                    font-semibold
                    text-slate-800
                ">

                                    {usuario?.nome || "Usuário"}

                                </p>

                                <p className="
                    text-xs
                    text-slate-500
                    mt-1
                    truncate
                ">

                                    {usuario?.email || ""}

                                </p>

                                <p className="
                    text-xs
                    text-slate-400
                    mt-1
                ">

                                    {usuario?.cargo || ""}

                                </p>

                            </div>

                            <div className="
                border-t
                border-slate-100
                my-1
            " />

                            <button
                                onClick={async () => {

                                    setAbrirUsuario(false);

                                    await logout();

                                }}
                                className="
                    w-full
                    text-left
                    px-3
                    py-2.5
                    rounded-xl
                    text-sm
                    font-semibold
                    text-red-600
                    hover:bg-red-50
                    transition
                "
                            >

                                Sair

                            </button>

                        </div>

                    )}

                </div>

            </div>

        </header>

    );

}