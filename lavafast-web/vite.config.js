import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({

    plugins: [

        react(),

        tailwindcss(),

        VitePWA({

            registerType: "autoUpdate",

            includeAssets: [
                "favicon.ico",
                "apple-touch-icon.png"
            ],

            manifest: {

                name: "Glow Fleet",

                short_name: "Glow Fleet",

                description: "Gestão Operacional",

                theme_color: "#0F172A",

                background_color: "#FFFFFF",

                display: "standalone",

                orientation: "portrait",

                start_url: "/",

                icons: [

                    {
                        src: "/icons/icon-192.png",
                        sizes: "192x192",
                        type: "image/png"
                    },

                    {
                        src: "/icons/icon-512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "any"
                    },

                    {
                        src: "/icons/icon-512-maskable.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "maskable"
                    }

                ]

            }

        })

    ]

});