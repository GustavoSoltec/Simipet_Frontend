import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import ventasService from '../../modules/ventas/services/ventasService';
import inventariosService from '../../modules/inventarios/services/inventariosService';

const DashboardDataContext = createContext(null);

const MESES_HACIA_ATRAS = 6;
const ESTADO_INICIAL = { cargando: true, error: null, filas: [] };

function hoyIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Los reportes de Inventarios se piden con la fecha de AYER, no de hoy -- asegura que ya haya informacion cargada para esa fecha (ver Detalle.jsx/Valuacion.jsx, mismo criterio). */
function ayerIso() {
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  return ayer.toISOString().slice(0, 10);
}

/** Los ultimos N meses, el actual primero. */
function obtenerUltimosMeses(n) {
  const hoy = new Date();
  const meses = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const etiquetaCruda = d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    meses.push({
      clave,
      etiqueta: etiquetaCruda.charAt(0).toUpperCase() + etiquetaCruda.slice(1),
      anio: d.getFullYear(),
      mes: d.getMonth()
    });
  }
  return meses;
}

/** Primer y ultimo dia de un mes (sin pasarse de hoy, si el mes elegido es el actual). */
function limitesDeMes(anio, mes) {
  const hoy = new Date();
  const primerDia = new Date(anio, mes, 1);
  const ultimoDiaDelMes = new Date(anio, mes + 1, 0);
  const ultimoDia = ultimoDiaDelMes > hoy ? hoy : ultimoDiaDelMes;
  return {
    fechaInicial: primerDia.toISOString().slice(0, 10),
    fechaFinal: ultimoDia.toISOString().slice(0, 10)
  };
}

// El backend limita el rango Desde/Hasta a 92 dias por consulta (ver
// reportesSimipet.shared.js). 6 meses son ~182 dias, asi que NO se
// puede pedir de un jalon -- se parte en ventanas de 90 dias (margen
// de seguridad bajo 92) y se juntan los resultados.
const MAX_DIAS_POR_CONSULTA = 90;

function generarVentanasDeFecha(fechaInicialTotal, fechaFinalTotal) {
  const ventanas = [];
  let cursor = new Date(fechaInicialTotal);
  const fin = new Date(fechaFinalTotal);

  while (cursor <= fin) {
    const finVentana = new Date(cursor);
    finVentana.setDate(finVentana.getDate() + (MAX_DIAS_POR_CONSULTA - 1));
    const finReal = finVentana > fin ? fin : finVentana;

    ventanas.push({
      fechaInicial: cursor.toISOString().slice(0, 10),
      fechaFinal: finReal.toISOString().slice(0, 10)
    });

    cursor = new Date(finReal);
    cursor.setDate(cursor.getDate() + 1);
  }

  return ventanas;
}

/**
 * Un solo lugar que consulta los datos de los widgets del Dashboard.
 *
 * Dos velocidades distintas, a proposito:
 *   - acumulado6Meses / valuacionHoy / detalleHoy: se piden UNA sola vez
 *     al entrar (no dependen de que mes se elija).
 *   - porSucursalMes / porVendedorMes / productosMes: se vuelven a
 *     pedir cada vez que cambia mesSeleccionado -- estos 3 endpoints
 *     regresan un total por el rango que se les pida, no vienen
 *     desglosados por mes de antemano.
 */
export function DashboardDataProvider({ children }) {
  const meses = useMemo(() => obtenerUltimosMeses(MESES_HACIA_ATRAS), []);
  const [mesSeleccionado, setMesSeleccionado] = useState(meses[0].clave);

  const [acumulado6Meses, setAcumulado6Meses] = useState(ESTADO_INICIAL);
  const [valuacionHoy, setValuacionHoy] = useState(ESTADO_INICIAL);
  const [detalleHoy, setDetalleHoy] = useState(ESTADO_INICIAL);
  const [porSucursalMes, setPorSucursalMes] = useState(ESTADO_INICIAL);
  const [porVendedorMes, setPorVendedorMes] = useState(ESTADO_INICIAL);
  const [productosMes, setProductosMes] = useState(ESTADO_INICIAL);

  useEffect(() => {
    const mesMasViejo = meses[meses.length - 1];
    const fechaInicial = new Date(mesMasViejo.anio, mesMasViejo.mes, 1).toISOString().slice(0, 10);
    const fechaFinal = hoyIso();
    const ventanas = generarVentanasDeFecha(fechaInicial, fechaFinal);

    Promise.all(ventanas.map((v) => ventasService.obtenerAcumuladoFecha(v)))
      .then((respuestas) => {
        const filas = respuestas.flatMap((r) => r.data || []);
        setAcumulado6Meses({ cargando: false, error: null, filas });
      })
      .catch((err) => setAcumulado6Meses({ cargando: false, error: err.response?.data?.message || 'No se pudo cargar.', filas: [] }));

    const fechaInventario = ayerIso();

    inventariosService
      .obtenerValuacion({ fecha: fechaInventario })
      .then((r) => setValuacionHoy({ cargando: false, error: null, filas: r.data || [] }))
      .catch((err) => setValuacionHoy({ cargando: false, error: err.response?.data?.message || 'No se pudo cargar.', filas: [] }));

    inventariosService
      .obtenerDetalle({ fecha: fechaInventario })
      .then((r) => setDetalleHoy({ cargando: false, error: null, filas: r.data || [] }))
      .catch((err) => setDetalleHoy({ cargando: false, error: err.response?.data?.message || 'No se pudo cargar.', filas: [] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const seleccion = meses.find((m) => m.clave === mesSeleccionado) || meses[0];
    const { fechaInicial, fechaFinal } = limitesDeMes(seleccion.anio, seleccion.mes);

    setPorSucursalMes((s) => ({ ...s, cargando: true, error: null }));
    setPorVendedorMes((s) => ({ ...s, cargando: true, error: null }));
    setProductosMes((s) => ({ ...s, cargando: true, error: null }));

    ventasService
      .obtenerPorSucursal({ fechaInicial, fechaFinal })
      .then((r) => setPorSucursalMes({ cargando: false, error: null, filas: r.data || [] }))
      .catch((err) => setPorSucursalMes({ cargando: false, error: err.response?.data?.message || 'No se pudo cargar.', filas: [] }));

    ventasService
      .obtenerPorVendedor({ fechaInicial, fechaFinal })
      .then((r) => setPorVendedorMes({ cargando: false, error: null, filas: r.data || [] }))
      .catch((err) => setPorVendedorMes({ cargando: false, error: err.response?.data?.message || 'No se pudo cargar.', filas: [] }));

    ventasService
      .obtenerProductos({ fechaInicial, fechaFinal })
      .then((r) => setProductosMes({ cargando: false, error: null, filas: r.data || [] }))
      .catch((err) => setProductosMes({ cargando: false, error: err.response?.data?.message || 'No se pudo cargar.', filas: [] }));
  }, [mesSeleccionado, meses]);

  return (
    <DashboardDataContext.Provider
      value={{
        meses,
        mesSeleccionado,
        setMesSeleccionado,
        acumulado6Meses,
        valuacionHoy,
        detalleHoy,
        porSucursalMes,
        porVendedorMes,
        productosMes
      }}
    >
      {children}
    </DashboardDataContext.Provider>
  );
}

export function useDashboardData() {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) {
    throw new Error('useDashboardData debe usarse dentro de un DashboardDataProvider');
  }
  return ctx;
}

export default DashboardDataProvider;
