import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './styles/globals.css';

import App from './App.jsx';
import { Toaster } from "react-hot-toast";

import { LojaProvider } from './context/LojaContext.jsx';

createRoot(document.getElementById('root')).render(
    <StrictMode>

        <Toaster

            position="top-right"

            toastOptions={{

                duration: 4000,

                style: {

                    borderRadius: "14px",

                    background: "#0f172a",

                    color: "#fff"

                }

            }}

        />

        <App />

    </StrictMode>
);