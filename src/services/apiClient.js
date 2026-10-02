import axios from 'axios';
import { env } from '../config/env';
import { captureError } from './errorService';

// Cliente HTTP para el origen de datos "Soltec2-api".
//
// Este es el primer origen de datos de la plataforma. Si en el futuro se
// agregan mas origenes (otro backend, un servicio de terceros, etc.),
// cada uno debe vivir en su propio archivo de cliente siguiendo esta
// misma forma (instancia de axios + interceptores propios) y los
// servicios de cada modulo deciden de que cliente consumir. Asi ningun
// modulo queda amarrado a que "la" API sea siempre esta.

const TOKEN_STORAGE_KEY = 'simipet_token';

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function getStoredToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

// Adjunta el token JWT a cada peticion, si existe.
apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Un solo lugar para: reportar errores a la base centralizada de errores,
// y disparar el logout automatico cuando el token expira o es invalido.
// onUnauthorized se conecta desde AuthContext para no crear un ciclo de
// importaciones entre el cliente HTTP y el contexto de autenticacion.
let onUnauthorized = () => {};
export function registerUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const endpoint = `${error.config?.method?.toUpperCase() || ''} ${error.config?.url || ''}`;

    captureError({
      source: 'apiClient',
      message: error.message,
      stack: error.stack,
      severity: status >= 500 || !status ? 'error' : 'warning',
      context: {
        endpoint,
        status,
        responseData: error.response?.data,
      },
    });

    if (status === 401) {
      onUnauthorized();
    }

    return Promise.reject(error);
  }
);

export default apiClient;
