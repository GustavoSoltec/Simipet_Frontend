import apiClient, { setStoredToken, getStoredToken } from './apiClient';
import { setErrorContextUser } from './errorService';
import { setAuditContextUser, clearAuditContext, logIngreso } from './auditService';

// Servicio de autenticacion.
//
//   POST /api/v1/simipet-auth/login
//   body:     { usuario, password }
//   response: { token, user: { idUsuario, idEmpresa, usuario, nombre, idPerfil, nombreEmpresa }, sucursales }
//
// Simipet tiene su propia base de usuarios (soltec2_PortalUsuarios +
// catalogo SimiPET), distinta a la del resto de la plataforma Soltec2
// (facturareal.Usuario, /api/v1/auth/login) -- por eso este servicio NO
// usa el endpoint generico de login.
//
// Si el backend usa otros nombres en la respuesta, solo hay que ajustar
// el mapeo de mapUser(); el resto de la app (AuthContext, apiClient,
// auditService, errorService) ya queda funcionando porque todos dependen
// de este servicio.

const LOGIN_ENDPOINT = '/api/v1/simipet-auth/login';

// Marca que la sesion se cerro sola (token vencido/revocado), para
// que el login pueda mostrar un aviso en vez de mandar al usuario de
// vuelta en silencio sin explicacion. Se guarda en sessionStorage (no
// localStorage) y se borra en cuanto se lee una sola vez, para que no
// se quede pegado en logins futuros normales.
const SESSION_EXPIRED_KEY = 'simipet_session_expired';

export function markSessionExpired() {
  sessionStorage.setItem(SESSION_EXPIRED_KEY, '1');
}

export function consumeSessionExpiredFlag() {
  const habia = sessionStorage.getItem(SESSION_EXPIRED_KEY) === '1';
  sessionStorage.removeItem(SESSION_EXPIRED_KEY);
  return habia;
}

// Catalogo de sucursales que trae el login (claveSimi + nombreSucursal,
// del catalogo SimiPET). Se persiste en localStorage porque el JWT NO
// lo incluye (el token solo trae idUsuario/idEmpresa/usuario/nombre/
// idPerfil) -- sin esto, un refresh de pagina lo perderia. Se usa para
// resolver el nombre real de la sucursal en los reportes de
// Inventarios, que solo regresan el claveSimi (ver
// modules/inventarios/vistas/Detalle.jsx y Valuacion.jsx).
const SUCURSALES_STORAGE_KEY = 'simipet_sucursales_catalogo';

function guardarSucursalesCatalogo(sucursales) {
  try {
    localStorage.setItem(SUCURSALES_STORAGE_KEY, JSON.stringify(sucursales || []));
  } catch {
    // localStorage lleno o deshabilitado: no revienta el login, solo
    // se pierde la traduccion de nombres hasta el proximo login.
  }
}

export function obtenerSucursalesCatalogo() {
  try {
    const guardado = localStorage.getItem(SUCURSALES_STORAGE_KEY);
    return guardado ? JSON.parse(guardado) : [];
  } catch {
    return [];
  }
}

/** claveSimi -> nombreSucursal. Si no se encuentra en el catalogo, regresa la clave tal cual (mejor mostrar el codigo que nada). */
/** Para comparar claves de sucursal sin que espacios de relleno (columnas CHAR de SQL Server) o diferencias de mayusculas/minusculas rompan la comparacion. */
function normalizarClaveSimi(valor) {
  return String(valor ?? '').trim().toUpperCase();
}

export function nombrePorClaveSimi(claveSimi) {
  const catalogo = obtenerSucursalesCatalogo();
  const buscada = normalizarClaveSimi(claveSimi);
  const encontrada = catalogo.find((s) => normalizarClaveSimi(s.claveSimi) === buscada);
  return encontrada ? encontrada.nombreSucursal : claveSimi;
}

/** "VF0001 - ESPERANZA 1 NEZAHUALCOYOTL" -- para mostrar en reportes y widgets, donde se quiere la clave Y el nombre juntos, no solo uno de los dos. Si no se encuentra el nombre en el catalogo, regresa solo la clave (no se inventa un " - " con nada despues). */
export function claveYNombreSucursal(claveSimi) {
  const nombre = nombrePorClaveSimi(claveSimi);
  if (!nombre || nombre === claveSimi) return claveSimi;
  return `${claveSimi} - ${nombre}`;
}

function mapUser(raw) {
  if (!raw) return null;
  return {
    id: raw.id ?? raw.idUsuario ?? null,
    nombre: raw.nombre ?? raw.name ?? raw.usuario ?? '',
    idEmpresa: raw.idEmpresa ?? raw.empresaId ?? null,
    idPerfil: raw.idPerfil ?? null,
    nombreEmpresa: raw.nombreEmpresa ?? null,
    email: raw.email ?? null,
    rol: raw.rol ?? raw.role ?? null,
  };
}

/**
 * Decodifica el payload de un JWT sin verificar la firma (solo para
 * leer datos como expiracion o el usuario embebido, si aplica). La
 * verificacion real siempre la hace el backend.
 */
export function decodeJwtPayload(token) {
  try {
    const [, payload] = token.split('.');
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(normalized);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function login({ username, password }) {
  // El backend espera "usuario", no "username" -- se traduce aqui para
  // no tener que renombrar el estado interno de Login.jsx.
  const { data } = await apiClient.post(LOGIN_ENDPOINT, { usuario: username, password });

  const token = data.token ?? data.accessToken;
  const user = mapUser(data.user ?? data.usuario ?? decodeJwtPayload(token));

  setStoredToken(token);
  guardarSucursalesCatalogo(data.sucursales);
  setErrorContextUser(user);
  setAuditContextUser(user);
  logIngreso();

  return user;
}

export function logout() {
  setStoredToken(null);
  guardarSucursalesCatalogo([]);
  setErrorContextUser(null);
  clearAuditContext();
}

export function getCurrentToken() {
  return getStoredToken();
}

export function isAuthenticated() {
  return Boolean(getStoredToken());
}

export const authService = {
  login,
  logout,
  getCurrentToken,
  isAuthenticated,
  decodeJwtPayload,
  markSessionExpired,
  consumeSessionExpiredFlag,
};

export default authService;
