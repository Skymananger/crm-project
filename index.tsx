import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("Sky Manager: Iniciando Montagem V7...");

const rootElement = document.getElementById('root');
const loader = document.getElementById('initial-loader');

if (rootElement) {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    setTimeout(() => {
      if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 500);
      }
      console.log("Sky Manager: Sistema Pronto (V7)");

      // Desregistro do Service Worker para evitar cache antigo (PWA)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
          for(let registration of registrations) {
            registration.unregister();
            console.log('ServiceWorker unregistered to clear cache.');
          }
        });
      }
    }, 800);
    
  } catch (err) {
    console.error("Erro ao renderizar:", err);
  }
}