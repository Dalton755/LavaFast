import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './styles/globals.css';

import App from './App.jsx';
import { LojaProvider } from './context/LojaContext.jsx';

createRoot(document.getElementById('root')).render(
    <StrictMode>

        <LojaProvider>

            <App />

        </LojaProvider>

    </StrictMode>
);