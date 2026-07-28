import { Building2, User } from 'lucide-react';
import BRAND from "../../config/branding";
import { useLoja } from "../../context/LojaContext";
import { useState } from "react";
import FiltroLojas from "../common/FiltroLojas";

export default function Header() {

    const [abrirFiltro, setAbrirFiltro] = useState(false);

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

                <div className="flex items-center gap-3">

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

                        Dalton

                    </span>

                </div>

            </div>

        </header>

    );

}