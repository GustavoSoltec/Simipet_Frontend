import apiClient from './apiClient';
import { env } from '../config/env';

// Fondo del login editable desde el portal (modulo simipet-config del
// backend). Vive en services/ y no dentro de un modulo porque lo usan
// tres lugares: Login.jsx (para pintarlo), Sidebar.jsx (para saber si
// mostrar la opcion) y la vista de Administracion (para cambiarlo).
//
//   GET    /api/v1/simipet-config/fondo-login          publico, 404 si no hay personalizado
//   GET    /api/v1/simipet-config/fondo-login/permiso  { puedeEditar }
//   PUT    /api/v1/simipet-config/fondo-login          cuerpo = la imagen
//   DELETE /api/v1/simipet-config/fondo-login          vuelve al original

const FONDO_PATH = '/api/v1/simipet-config/fondo-login';

/** Imagen que viene en el build (public/), se usa si no hay una personalizada. */
export const FONDO_LOGIN_PREDETERMINADO = '/login-bg.jpg';

/** Lado mas largo, en px, al que se reduce la imagen antes de subirla. */
const LADO_MAXIMO_PX = 1920;
const CALIDAD_JPEG = 0.85;

/**
 * URL absoluta de la imagen personalizada. Con `sinCache` se agrega un
 * parametro para forzar la descarga (util justo despues de cambiarla).
 */
export function urlFondoLogin({ sinCache = false } = {}) {
  const url = `${env.apiBaseUrl}${FONDO_PATH}`;
  return sinCache ? `${url}?v=${Date.now()}` : url;
}

/**
 * Resuelve la URL de la imagen personalizada si existe y carga, o null
 * si no hay (404), si falla o si tarda mas de `esperaMs`.
 */
export function cargarFondoPersonalizado({ sinCache = false, esperaMs = 5000 } = {}) {
  return new Promise((resolve) => {
    const url = urlFondoLogin({ sinCache });
    const img = new Image();
    const temporizador = setTimeout(() => resolve(null), esperaMs);
    img.onload = () => {
      clearTimeout(temporizador);
      resolve(url);
    };
    img.onerror = () => {
      clearTimeout(temporizador);
      resolve(null);
    };
    img.src = url;
  });
}

export async function puedeCambiarFondoLogin() {
  const { data } = await apiClient.get(`${FONDO_PATH}/permiso`);
  return Boolean(data?.puedeEditar);
}

/**
 * Reduce la imagen a LADO_MAXIMO_PX y la convierte a JPEG en el
 * navegador. Asi se sube un archivo ligero (normalmente < 1 MB) sin
 * importar lo que pese la foto original, y se descarta la metadata
 * (EXIF/ubicacion) de la camara.
 *
 * @param {File} archivo
 * @returns {Promise<{ blob: Blob, ancho: number, alto: number }>}
 */
export async function prepararImagenFondo(archivo) {
  const bitmap = await createImageBitmap(archivo);
  const escala = Math.min(1, LADO_MAXIMO_PX / Math.max(bitmap.width, bitmap.height));
  const ancho = Math.round(bitmap.width * escala);
  const alto = Math.round(bitmap.height * escala);

  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext('2d');
  // Fondo blanco por si la imagen trae transparencia (PNG): JPEG no la
  // soporta y sin esto quedaria negra.
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, ancho, alto);
  ctx.drawImage(bitmap, 0, 0, ancho, alto);
  bitmap.close?.();

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('No se pudo procesar la imagen.'))),
      'image/jpeg',
      CALIDAD_JPEG
    );
  });

  return { blob, ancho, alto };
}

/** @param {Blob} blob imagen JPEG/PNG/WebP */
export async function subirFondoLogin(blob) {
  const { data } = await apiClient.put(FONDO_PATH, blob, {
    headers: { 'Content-Type': blob.type || 'image/jpeg' },
    timeout: 60000,
  });
  return data;
}

export async function restaurarFondoLogin() {
  const { data } = await apiClient.delete(FONDO_PATH);
  return data;
}
