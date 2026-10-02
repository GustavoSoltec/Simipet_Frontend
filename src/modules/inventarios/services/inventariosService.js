import apiClient from '../../../services/apiClient';

// Los 2 reportes de Inventarios viven en el backend bajo este mismo
// prefijo (ver /api/v1/reportes-simipet en Soltec2-api). A diferencia de
// Ventas, reciben una sola fecha de corte, no un rango.
const BASE_PATH = '/api/v1/reportes-simipet/inventarios';

/** Convierte 'YYYY-MM-DD' (lo que entrega un <input type="date">) a 'YYYYMMDD' (FechaKey, lo que espera el backend). */
function toFechaKey(fechaIso) {
  return fechaIso ? fechaIso.replaceAll('-', '') : fechaIso;
}

/** sucursales es un arreglo de claveSimi; el backend lo espera como CSV en el query string, u omitido si no se filtra. */
function toSucursalesParam(sucursales) {
  return Array.isArray(sucursales) && sucursales.length > 0 ? sucursales.join(',') : undefined;
}

/**
 * Detalle (dbo.usp_ReportesCargaInventarioDetalle): existencia y precios
 * por producto/sucursal, a una fecha de corte.
 * @param {object} params
 * @param {string} params.fecha - 'YYYY-MM-DD'
 * @param {string[]} [params.sucursales] - claveSimi; si se omite, el backend usa todas las del usuario
 */
export async function obtenerDetalle({ fecha, sucursales }) {
  const { data } = await apiClient.get(`${BASE_PATH}/detalle`, {
    params: {
      fecha: toFechaKey(fecha),
      sucursales: toSucursalesParam(sucursales)
    }
  });
  return data;
}

/**
 * Valuación (dbo.usp_ReportesCargaInventarioValuacion): existencias y
 * venta totalizadas por sucursal, a una fecha de corte.
 * @param {object} params
 * @param {string} params.fecha - 'YYYY-MM-DD'
 * @param {string[]} [params.sucursales] - claveSimi; si se omite, el backend usa todas las del usuario
 */
export async function obtenerValuacion({ fecha, sucursales }) {
  const { data } = await apiClient.get(`${BASE_PATH}/valuacion`, {
    params: {
      fecha: toFechaKey(fecha),
      sucursales: toSucursalesParam(sucursales)
    }
  });
  return data;
}

const inventariosService = { obtenerDetalle, obtenerValuacion };

export default inventariosService;
