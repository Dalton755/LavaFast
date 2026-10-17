import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';

const root = createRoot(document.getElementById('root'));

function mostrarErro(error) {
  console.error('Falha ao iniciar LavaFast:', error);
  root.render(
    <main style={{padding:24,fontFamily:'system-ui,sans-serif',color:'#991b1b'}}>
      <h2>Não foi possível iniciar o LavaFast</h2>
      <p>A prévia encontrou um erro ao carregar. Envie uma captura desta mensagem para corrigirmos.</p>
      <pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{String(error?.message || error)}</pre>
    </main>
  );
}

window.addEventListener('error', event => mostrarErro(event.error || event.message));
window.addEventListener('unhandledrejection', event => mostrarErro(event.reason));

Promise.all([
  import('./App.jsx'),
  import('./context/AuthContext.jsx'),
  import('./context/LojaContext.jsx'),
  import('react-hot-toast')
]).then(([{default:App},{AuthProvider},{LojaProvider},{Toaster}]) => {
  root.render(
    <StrictMode>
      <Toaster position="top-right" toastOptions={{duration:4000,style:{borderRadius:'14px',background:'#0f172a',color:'#fff'}}}/>
      <AuthProvider><LojaProvider><App/></LojaProvider></AuthProvider>
    </StrictMode>
  );
}).catch(mostrarErro);
