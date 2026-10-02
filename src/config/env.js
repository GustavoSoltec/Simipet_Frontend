// Punto unico de lectura de variables de entorno.
// Nunca leer import.meta.env directamente fuera de este archivo:
// asi, si cambia el nombre de una variable, solo se toca aqui.

export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  appEnv: import.meta.env.VITE_APP_ENV || 'development',
  isProduction: import.meta.env.VITE_APP_ENV === 'production',
};
