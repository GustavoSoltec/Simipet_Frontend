import { env } from '../config/env';
import { captureError } from './errorService';

// Servicio de control de acciones (auditoria de uso) de Simipet.
//
// Registra tres tipos de eventos para poder generar estadisticas de uso:
//   1. ingreso     -> el usuario inicia sesion (fecha/hora de ingreso).
//   2. modulo      -> el usuario entra a un modulo (que modulos usa).
//   3. accion      -> el usuario hace algo dentro de un modulo
//                     (que acciones hizo en cada modulo).
//
// Se reutiliza el mismo contrato de endpoint que ya usa Soltec 2.0 para
// auditoria (misma Soltec2-api), diferenciando el origen de cada evento
// con el campo "aplicacion". Contrato propuesto, pendiente de confirmar
// con backend:
//
//   POST /api/v1/auditoria/eventos
//   {
//     aplicacion: 'simipet-web',
//     tipo: 'ingreso' | 'modulo' | 'accion',
//     idEmpresa, idUsuario, usuario,
//     modulo, submodulo, accion, detalle,
//     fecha (ISO), sesionId
//   }
//
// Mientras el endpoint no exista o no acepte aun el campo "aplicacion",
// las llamadas fallan silenciosamente (se reportan a errorService, no
// se le muestra nada al usuario: la auditoria nunca debe interrumpir
// el flujo de trabajo).

const AUDIT_ENDPOINT = '/api/v1/auditoria/eventos';
const NOMBRE_APLICACION = 'simipet-web';

let currentUser = null;
let sessionId = null;

function ensureSessionId() {
  if (!sessionId) {
    sessionId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `sess-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
  return sessionId;
}

export function setAuditContextUser(user) {
  currentUser = user;
  ensureSessionId();
}

export function clearAuditContext() {
  currentUser = null;
  sessionId = null;
}

async function sendEvent(payload) {
  // El endpoint generico de auditoria exige idEmpresa verdadero (rechaza
  // 0/null con 400) -- los administradores de Simipet (idPerfil 2 y 3)
  // pueden no tener una empresa asignada. En vez de intentar y fallar
  // en cada clic, simplemente no se manda el evento en ese caso -- no
  // es un error, es un usuario para el que este endpoint no aplica.
  if (!payload.idEmpresa) {
    return;
  }

  try {
    const token = localStorage.getItem('simipet_token');
    const response = await fetch(`${env.apiBaseUrl}${AUDIT_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    if (!response.ok) {
      throw new Error(`Auditoria respondio con status ${response.status}`);
    }
  } catch (err) {
    // La auditoria jamas debe romper la experiencia del usuario.
    // Solo se reporta a errorService para que quede constancia.
    captureError({
      source: 'auditService',
      message: err.message,
      stack: err.stack,
      severity: 'warning',
      context: payload,
    });
  }
}

function buildBase(tipo) {
  return {
    aplicacion: NOMBRE_APLICACION,
    tipo,
    idEmpresa: currentUser?.idEmpresa ?? null,
    idUsuario: currentUser?.id ?? null,
    usuario: currentUser?.nombre ?? null,
    sesionId: ensureSessionId(),
    fecha: new Date().toISOString(),
  };
}

/** Se llama justo despues de un login exitoso. */
export function logIngreso() {
  sendEvent(buildBase('ingreso'));
}

/** Se llama cuando el usuario entra a un modulo (ej. "inventarios"). */
export function logModulo(modulo, submodulo = null) {
  sendEvent({ ...buildBase('modulo'), modulo, submodulo });
}

/**
 * Se llama para registrar una accion puntual dentro de un modulo.
 * Ej: logAccion('inventarios', 'valuacion', 'exportar-pdf', { sucursales: [...] })
 */
export function logAccion(modulo, submodulo, accion, detalle = null) {
  sendEvent({ ...buildBase('accion'), modulo, submodulo, accion, detalle });
}

export const auditService = {
  setAuditContextUser,
  clearAuditContext,
  logIngreso,
  logModulo,
  logAccion,
};

export default auditService;
