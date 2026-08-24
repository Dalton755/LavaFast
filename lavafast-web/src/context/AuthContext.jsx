import {
    createContext,
    useContext,
    useEffect,
    useState
} from "react";

import supabase from "../lib/supabase";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {

    const [session, setSession] = useState(null);
    const [usuario, setUsuario] = useState(null);
    const [loading, setLoading] = useState(true);

    async function carregarPerfil(sessao) {

        if (!sessao?.access_token) {

            setUsuario(null);

            return;

        }

        try {

            const { data } = await api.get(
                "/auth/me",
                {
                    headers: {
                        Authorization:
                            `Bearer ${sessao.access_token}`
                    }
                }
            );

            setUsuario(data);

        }

        catch (erro) {

            console.error(
                "Erro ao carregar perfil:",
                erro
            );

            await supabase.auth.signOut();

            setSession(null);
            setUsuario(null);

        }

    }

    async function login(email, senha) {

        const {
            data,
            error
        } = await supabase.auth.signInWithPassword({

            email,

            password: senha

        });

        if (error) {

            throw error;

        }

        setSession(data.session);

        await carregarPerfil(data.session);

    }

    async function verificarCpf(cpf) {

        const { data, error } =
            await api.post(
                "/auth/verificar-cpf",
                {
                    cpf
                }
            );

        if (error) {

            throw new Error(
                error.response?.data?.erro ||
                "Não foi possível verificar o CPF."
            );

        }

        return data;

    }

    async function cadastrarSenha(
        cpf,
        senha,
        email
    ) {

        const { data, error } =
            await api.post(
                "/auth/cadastrar-senha",
                {
                    cpf,
                    senha,
                    email
                }
            );

        if (error) {

            throw new Error(
                error.response?.data?.erro ||
                "Não foi possível criar a senha."
            );

        }

        return data;

    }

    async function logout() {

        await supabase.auth.signOut();

        setSession(null);
        setUsuario(null);

    }

    useEffect(() => {

        let ativo = true;

        async function iniciar() {

            const {
                data: {
                    session: sessao
                }
            } = await supabase.auth.getSession();

            if (!ativo) return;

            setSession(sessao);

            if (sessao) {

                await carregarPerfil(sessao);

            }

            setLoading(false);

        }

        iniciar();

        const {
            data: {
                subscription
            }
        } = supabase.auth.onAuthStateChange(
            async (_event, sessao) => {

                if (!ativo) return;

                setSession(sessao);

                if (sessao) {

                    await carregarPerfil(sessao);

                }
                else {

                    setUsuario(null);

                }

                setLoading(false);

            }
        );

        return () => {

            ativo = false;

            subscription.unsubscribe();

        };

    }, []);

    return (

        <AuthContext.Provider
            value={{
                session,
                usuario,
                loading,
                login,
                verificarCpf,
                cadastrarSenha,
                logout
            }}
        >

            {children}

        </AuthContext.Provider>

    );

}

export function useAuth() {

    const contexto =
        useContext(AuthContext);

    if (!contexto) {

        throw new Error(
            "useAuth deve ser usado dentro de AuthProvider."
        );

    }

    return contexto;

}