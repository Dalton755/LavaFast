import { useEffect, useRef, useState } from "react";
import { Building2, ChevronDown, LogOut, UserRound } from "lucide-react";
import BRAND from "../../config/branding";
import { useLoja } from "../../context/LojaContext";
import { useAuth } from "../../context/AuthContext";
import FiltroLojas from "../common/FiltroLojas";

export default function Header() {
    const { usuario, logout } = useAuth();
    const { lojas, lojasSelecionadas } = useLoja();
    const [menuAberto, setMenuAberto] = useState(null);
    const areaMenus = useRef(null);

    useEffect(() => {
        function fecharAoClicarFora(event) {
            if (!areaMenus.current?.contains(event.target)) setMenuAberto(null);
        }
        function fecharComEscape(event) {
            if (event.key === "Escape") setMenuAberto(null);
        }
        document.addEventListener("pointerdown", fecharAoClicarFora);
        document.addEventListener("keydown", fecharComEscape);
        return () => {
            document.removeEventListener("pointerdown", fecharAoClicarFora);
            document.removeEventListener("keydown", fecharComEscape);
        };
    }, []);

    const nomeLojaUnica = lojasSelecionadas.length === 1
        ? lojas.find(loja => loja.id === lojasSelecionadas[0])?.nome
        : null;
    const legendaLojas = nomeLojaUnica || (
        lojasSelecionadas.length === 0
            ? "Selecionar lojas"
            : `${lojasSelecionadas.length} lojas`
    );

    function alternarMenu(menu) {
        setMenuAberto(atual => atual === menu ? null : menu);
    }

    return (
        <header className="lf-header">
            <div className="lf-header__inner">
                <div className="lf-header__brand">
                    <div className="lf-header__logo">
                        <img src={BRAND.logo} alt="" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="lf-header__title">{BRAND.nome}</h1>
                        <p className="lf-header__subtitle">{BRAND.subtitulo}</p>
                    </div>
                </div>

                <nav ref={areaMenus} aria-label="Configurações da sessão" className="lf-header__actions">
                    <div className="relative">
                        <button
                            type="button"
                            id="lf-filtro-lojas"
                            aria-controls="lf-menu-lojas"
                            aria-expanded={menuAberto === "lojas"}
                            aria-haspopup="true"
                            onClick={() => alternarMenu("lojas")}
                            className="lf-header__control"
                            title={legendaLojas}
                        >
                            <Building2 size={17} className="shrink-0 text-slate-500" />
                            <span className="lf-header__control-label lf-header__control-label--stores">{legendaLojas}</span>
                            <ChevronDown size={14} className="lf-header__chevron shrink-0" />
                        </button>
                        {menuAberto === "lojas" && (
                            <div id="lf-menu-lojas" className="lf-popover lf-popover--stores" aria-label="Filtro de lojas">
                                <FiltroLojas onClose={() => setMenuAberto(null)} />
                            </div>
                        )}
                    </div>

                    <div className="relative">
                        <button
                            type="button"
                            id="lf-botao-usuario"
                            aria-controls="lf-menu-usuario"
                            aria-expanded={menuAberto === "usuario"}
                            aria-haspopup="true"
                            onClick={() => alternarMenu("usuario")}
                            className="lf-header__control"
                            title={`Conta: ${usuario?.nome || "Usuário"}`}
                        >
                            <span className="lf-header__avatar"><UserRound size={17} /></span>
                            <span className="lf-header__control-label lf-header__control-label--user">{usuario?.nome || "Usuário"}</span>
                            <ChevronDown size={14} className="lf-header__chevron lf-header__chevron--user" />
                        </button>
                        {menuAberto === "usuario" && (
                            <div id="lf-menu-usuario" className="lf-popover" aria-label="Opções de usuário">
                                <div className="border-b border-slate-100 px-4 py-4">
                                    <p className="lf-popover__title truncate">{usuario?.nome || "Usuário"}</p>
                                    {usuario?.email && <p className="lf-popover__subtitle mt-1 break-all">{usuario.email}</p>}
                                    {usuario?.cargo && <p className="lf-popover__subtitle mt-1">{usuario.cargo}</p>}
                                </div>
                                <div className="p-2">
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            setMenuAberto(null);
                                            await logout();
                                        }}
                                        className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                                    >
                                        <LogOut size={16} /> Sair da conta
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </nav>
            </div>
        </header>
    );
}
