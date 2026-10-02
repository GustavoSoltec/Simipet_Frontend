import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { installGlobalErrorHandlers } from './services/errorService';
import './styles/tokens.css';

// Cualquier error de JS no capturado o promesa rechazada, incluso fuera
// del arbol de React, termina en la base centralizada de errores.
installGlobalErrorHandlers();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
