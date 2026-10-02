import apiClient from '../../../services/apiClient';

// Los 7 reportes de Ventas viven en el backend bajo este mismo prefijo
// (ver /api/v1/reportes-simipet en Soltec2-api). Cada funcion de aqui
// corresponde 1 a 1 con un stored procedure del Data Warehouse.
const BASE_PATH = '/api/v1/reportes-simipet/ventas';

/** Convierte 'YYYY-MM-DD' (lo que entrega un <input type="date">) a 'YYYYMMDD' (FechaKey, lo que espera el backend). */
function toFechaKey(fechaIso) {
  return fechaIso ? fechaIso.replaceAll('-', '') : fechaIso;
}

/** sucursales es un arreglo de claveSimi; el backend lo espera como CSV en el query string, u omitido si no se filtra. */
function toSucursalesParam(sucursales) {
  return Array.isArray(sucursales) && sucursales.length > 0 ? sucursales.join(',') : undefined;
}

/**
 * Acumulado por Fecha (dbo.usp_ReportesCargaAcumuladoFecha).
 * @param {object} params
 * @param {string} params.fechaInicial - 'YYYY-MM-DD'
 * @param {string} params.fechaFinal - 'YYYY-MM-DD'
 * @param {string[]} [params.sucursales] - claveSimi; si se omite, el backend usa todas las del usuario
 */
export async function obtenerAcumuladoFecha({ fechaInicial, fechaFinal, sucursales }) {
  const { data } = await apiClient.get(`${BASE_PATH}/acumulado-fecha`, {
    params: {
      fechaInicial: toFechaKey(fechaInicial),
      fechaFinal: toFechaKey(fechaFinal),
      sucursales: toSucursalesParam(sucursales)
    }
  });
  return data;
}

/**
 * Por Sucursal (dbo.usp_ReportesCargaPorSucursal). A diferencia de
 * Acumulado por Fecha, no trae desglose por dia: un solo total por
 * sucursal en todo el rango.
 * @param {object} params
 * @param {string} params.fechaInicial - 'YYYY-MM-DD'
 * @param {string} params.fechaFinal - 'YYYY-MM-DD'
 * @param {string[]} [params.sucursales] - claveSimi; si se omite, el backend usa todas las del usuario
 */
export async function obtenerPorSucursal({ fechaInicial, fechaFinal, sucursales }) {
  const { data } = await apiClient.get(`${BASE_PATH}/por-sucursal`, {
    params: {
      fechaInicial: toFechaKey(fechaInicial),
      fechaFinal: toFechaKey(fechaFinal),
      sucursales: toSucursalesParam(sucursales)
    }
  });
  return data;
}

/**
 * Por Sucursal vs Vendedor (dbo.usp_ReportesCargaPorSucursalVendedor).
 * Igual que Por Sucursal: un solo total por combinacion sucursal+vendedor
 * en todo el rango, sin desglose por dia.
 * @param {object} params
 * @param {string} params.fechaInicial - 'YYYY-MM-DD'
 * @param {string} params.fechaFinal - 'YYYY-MM-DD'
 * @param {string[]} [params.sucursales] - claveSimi; si se omite, el backend usa todas las del usuario
 */
export async function obtenerPorSucursalVendedor({ fechaInicial, fechaFinal, sucursales }) {
  const { data } = await apiClient.get(`${BASE_PATH}/por-sucursal-vendedor`, {
    params: {
      fechaInicial: toFechaKey(fechaInicial),
      fechaFinal: toFechaKey(fechaFinal),
      sucursales: toSucursalesParam(sucursales)
    }
  });
  return data;
}

/**
 * Por Vendedor (dbo.usp_ReportesCargaPorVendedor). Un solo total por
 * vendedor en todo el rango (todas las sucursales combinadas).
 * @param {object} params
 * @param {string} params.fechaInicial - 'YYYY-MM-DD'
 * @param {string} params.fechaFinal - 'YYYY-MM-DD'
 * @param {string[]} [params.sucursales] - claveSimi; si se omite, el backend usa todas las del usuario
 */
export async function obtenerPorVendedor({ fechaInicial, fechaFinal, sucursales }) {
  const { data } = await apiClient.get(`${BASE_PATH}/por-vendedor`, {
    params: {
      fechaInicial: toFechaKey(fechaInicial),
      fechaFinal: toFechaKey(fechaFinal),
      sucursales: toSucursalesParam(sucursales)
    }
  });
  return data;
}

/**
 * Por Sucursal detalle (dbo.usp_ReportesCargaPorFechaSucursalVendedor).
 * A diferencia de los anteriores, trae Fecha x Sucursal x Vendedor -- el
 * desglose mas fino de esta familia de reportes.
 * @param {object} params
 * @param {string} params.fechaInicial - 'YYYY-MM-DD'
 * @param {string} params.fechaFinal - 'YYYY-MM-DD'
 * @param {string[]} [params.sucursales] - claveSimi; si se omite, el backend usa todas las del usuario
 */
export async function obtenerPorSucursalDetalle({ fechaInicial, fechaFinal, sucursales }) {
  const { data } = await apiClient.get(`${BASE_PATH}/por-sucursal-detalle`, {
    params: {
      fechaInicial: toFechaKey(fechaInicial),
      fechaFinal: toFechaKey(fechaFinal),
      sucursales: toSucursalesParam(sucursales)
    }
  });
  return data;
}

/**
 * Productos (dbo.usp_ReportesCargaProductosPorFechaSucursalVendedor).
 * Trae Fecha x Sucursal x Vendedor x Producto -- el reporte con mas
 * volumen de filas de los 7.
 * @param {object} params
 * @param {string} params.fechaInicial - 'YYYY-MM-DD'
 * @param {string} params.fechaFinal - 'YYYY-MM-DD'
 * @param {string[]} [params.sucursales] - claveSimi; si se omite, el backend usa todas las del usuario
 */
export async function obtenerProductos({ fechaInicial, fechaFinal, sucursales }) {
  const { data } = await apiClient.get(`${BASE_PATH}/productos`, {
    params: {
      fechaInicial: toFechaKey(fechaInicial),
      fechaFinal: toFechaKey(fechaFinal),
      sucursales: toSucursalesParam(sucursales)
    }
  });
  return data;
}

/**
 * Detalle Ticket (dbo.usp_Reporte_DetalleTicket). Unico de los 7 que
 * recibe fechaInicial/fechaFinal en formato YYYY-MM-DD (DATE) -- NO se
 * convierte a FechaKey como los demas.
 * @param {object} params
 * @param {string} params.fechaInicial - 'YYYY-MM-DD'
 * @param {string} params.fechaFinal - 'YYYY-MM-DD'
 * @param {string[]} [params.sucursales] - claveSimi; si se omite, el backend usa todas las del usuario
 */
export async function obtenerDetalleTicket({ fechaInicial, fechaFinal, sucursales }) {
  const { data } = await apiClient.get(`${BASE_PATH}/detalle-ticket`, {
    params: {
      fechaInicial,
      fechaFinal,
      sucursales: toSucursalesParam(sucursales)
    }
  });
  return data;
}

const ventasService = {
  obtenerAcumuladoFecha,
  obtenerPorSucursal,
  obtenerPorSucursalVendedor,
  obtenerPorVendedor,
  obtenerPorSucursalDetalle,
  obtenerProductos,
  obtenerDetalleTicket
};

export default ventasService;
