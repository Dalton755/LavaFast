import axios from "axios";
import supabase from "../lib/supabase";

// API oficial: Render Starter. A variavel VITE_API_URL pode usar
// somente o dominio ou o endereco completo terminado em /api.
const enderecoConfigurado = String(
    import.meta.env.VITE_API_URL || "https://lavafast-api.onrender.com/api"
).trim().replace(/\/+$/, "");

export const API_BASE_URL = /\/api$/i.test(enderecoConfigurado)
    ? enderecoConfigurado
    : `${enderecoConfigurado}/api`;

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json"
    }
});

api.interceptors.request.use(
    async config => {
        const {
            data: { session }
        } = await supabase.auth.getSession();

        if (session?.access_token) {
            config.headers.Authorization =
                `Bearer ${session.access_token}`;
        }

        return config;
    },
    error => Promise.reject(error)
);

export default api;
