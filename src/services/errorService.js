import { env } from '../config/env';

// Servicio centralizado de errores de Simipet.
//
// Objetivo: todo error de la aplicacion (llamadas a la API, errores de
// render de React, errores de JS no capturados, promesas rechazadas)
// termina aqui y se envia a la base de datos centralizada de errores.
//
// Simipet consume la misma Soltec2-api que el resto de la plataforma,
// asi que se reutiliza el mismo contrato de endpoint que ya usa
// Soltec 2.0 para reportar errores; el campo "aplicacion" es lo que
// permite distinguir de que sistema viene cada registro dentro de la
// misma base de datos centralizada. Si el equipo de backend decide
// separar esto en un endpoint propio para Simipet, solo hay que
// actualizar ERROR_ENDPOINT.
//
// Este servicio NUNCA debe lanzar (throw). Si falla el envio del error,
// solo se registra en consola para no generar un bucle de errores.

const ERROR_ENDPOINT = '/api/v1/sistema/errores';
const NOMBRE_APLICACION = 'simipet-web';

let currentUser = null;

/**
 * Debe llamarse una vez que el usuario inicia sesion, para que cada
 * error reportado incluya quien lo disparo.
 */
export function setErrorContextUser(user) {
  currentUser = user;
}

function buildPayload({ source, message, stack, severity, module, context }) {
  return {
    aplicacion: NOMBRE_APLICACION,
    entorno: env.appEnv,
    origen: source,
    severidad: severity || 'error',
    modulo: module || null,
    mensaje: message,
    stackTrace: stack || null,
    contexto: context || null,
    usuario: currentUser
      ? { id: currentUser.id, nombre: currentUser.nombre, empresa: currentUser.idEmpresa }
      : null,
    url: typeof window !== 'undefined' ? window.location.href : null,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    fecha: new Date().toISOString(),
  };
}

async function send(payload) {
  try {
    const token = localStorage.getItem('simipet_token');
    await fetch(`${env.apiBaseUrl}${ERROR_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch (sendError) {
    // Si ni siquiera se pudo reportar el error, se deja constancia local.
    // No se reintenta para evitar loops o saturar la red del usuario.
    console.error('[errorService] No se pudo enviar el error al backend', sendError);
  }
}

/**
 * Punto de entrada principal. Uso tipico:
 * captureError({ source: 'api', message: err.message, stack: err.stack, module: 'inventarios' })
 */
export function captureError({ source = 'app', message, stack, severity = 'error', module, context } = {}) {
  const payload = buildPayload({ source, message, stack, severity, module, context });

  if (!env.isProduction) {
    // eslint-disable-next-line no-console
    console.error('[Simipet error]', payload);
  }

  send(payload);
  return payload;
}

/**
 * Registra los manejadores globales de errores del navegador.
 * Se llama una sola vez desde main.jsx.
 */
export function installGlobalErrorHandlers() {
  window.addEventListener('error', (event) => {
    captureError({
      source: 'window.onerror',
      message: event.message,
      stack: event.error?.stack,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    captureError({
      source: 'unhandledrejection',
      message: event.reason?.message || String(event.reason),
      stack: event.reason?.stack,
    });
  });
}

export const errorService = {
  captureError,
  installGlobalErrorHandlers,
  setErrorContextUser,
};

export default errorService;
