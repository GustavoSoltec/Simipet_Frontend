import { useCallback, useEffect, useMemo, useState } from 'react';
import auditService from '../../../services/auditService';
import { claveYNombreSucursal } from '../../../services/authService';
import ventasService from '../services/ventasService';
import Panel from '../../../components/common/Panel';
import FiltroRangoFecha from '../../../components/common/FiltroRangoFecha';
import KpiCards from '../../../components/common/KpiCards';
import TablaReporte from '../../../components/common/TablaReporte';
import LoadingState from '../../../components/common/LoadingState';
import EmptyState from '../../../components/common/EmptyState';
import DetalleDiaPorSucursal from './DetalleDiaPorSucursal';
import './AcumuladoPorFecha.css';

const formatoMoneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
const formatoEntero = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

function primerDiaDelMes() {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
}

function hoyComoFechaSimple() {
  return new Date().toISOString().slice(0, 10);
}

const COLUMNAS = [
  { key: 'Fecha', label: 'Fecha', align: 'left' },
  { key: 'VentaNeta', label: 'Venta neta', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'TcksNetos', label: 'Tickets netos', format: (v) => formatoEntero.format(v || 0) },
  { key: 'PromedioXNota', label: 'Promedio x nota', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'TotalDescuentos', label: 'Descuentos', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'Devoluciones', label: 'Devoluciones', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'VentaBaseComision', label: 'Venta base comisión', format: (v) => formatoMoneda.format(v || 0), visibleByDefault: false },
  { key: 'VentaConPremio', label: 'Venta con premio', format: (v) => formatoMoneda.format(v || 0), visibleByDefault: false }
];

/** FechaKey INT yyyyMMdd (lo que regresa usp_ReportesCargaPorFechaSucursalVendedor) -> 'dd-MM-yyyy' (el formato de la tabla de acumulado). */
function fechaKeyADdMmYyyy(fechaKey) {
  const texto = String(fechaKey);
  return `${texto.slice(6, 8)}-${texto.slice(4, 6)}-${texto.slice(0, 4)}`;
}

/** Redondea a 2 decimales y regresa número (no texto) para que el excel pueda sumar. */
function numeroExportable(valor) {
  return Math.round((Number(valor) || 0) * 100) / 100;
}

/** Igual que numeroExportable, pero deja la celda vacía si el renglón no trae el dato (Devoluciones en los renglones de sucursal). */
function numeroExportableOpcional(valor) {
  return valor == null ? '' : numeroExportable(valor);
}

const TIPO_TOTAL_DIA = 'Total día';
const TIPO_SUCURSAL = 'Sucursal';

// Exportación con detalle, como se ve en pantalla: el renglón "Total día"
// (de usp_ReportesCargaAcumuladoFecha) y debajo sus sucursales (de
// usp_ReportesCargaPorFechaSucursalVendedor). La columna Tipo permite
// filtrar en Excel sin sumar doble. Devoluciones solo existe en el total
// del día: el SP del detalle no la regresa por sucursal.
// Tipo, Fecha y Sucursal siempre se exportan; las demás solo si están
// marcadas en el botón "Columnas" de la tabla (mismas keys que COLUMNAS).
const COLUMNAS_EXPORTACION_FIJAS = new Set(['Tipo', 'Fecha', 'Sucursal']);
const COLUMNAS_EXPORTACION = [
  { key: 'Tipo', label: 'Tipo' },
  { key: 'Fecha', label: 'Fecha' },
  { key: 'Sucursal', label: 'Sucursal' },
  { key: 'VentaNeta', label: 'Venta neta', exportFormat: numeroExportable },
  { key: 'TcksNetos', label: 'Tickets netos', exportFormat: (v) => Number(v) || 0 },
  { key: 'PromedioXNota', label: 'Promedio x nota', exportFormat: numeroExportable },
  { key: 'TotalDescuentos', label: 'Descuentos', exportFormat: numeroExportable },
  { key: 'Devoluciones', label: 'Devoluciones', exportFormat: numeroExportableOpcional },
  { key: 'VentaBaseComision', label: 'Venta base comisión', exportFormat: numeroExportable },
  { key: 'VentaConPremio', label: 'Venta con premio', exportFormat: numeroExportable }
];

const COLUMNAS_VISIBLES_INICIALES = COLUMNAS.filter((c) => c.visibleByDefault !== false).map((c) => c.key);

/** Arma los renglones del excel: por cada día (en el orden de la tabla) su total y debajo sus sucursales. */
function armarFilasExportacion(filasDia, filasDetalle) {
  const detallePorFecha = new Map();
  filasDetalle.forEach((d) => {
    if (!detallePorFecha.has(d.FechaTexto)) detallePorFecha.set(d.FechaTexto, []);
    detallePorFecha.get(d.FechaTexto).push(d);
  });

  return filasDia.flatMap((dia) => [
    { ...dia, Tipo: TIPO_TOTAL_DIA, Sucursal: 'Todas' },
    ...(detallePorFecha.get(dia.Fecha) || []).map((d) => ({
      ...d,
      Tipo: TIPO_SUCURSAL,
      Fecha: d.FechaTexto,
      Sucursal: claveYNombreSucursal(d.ClaveSimi) || d.Sucursal
    }))
  ]);
}

/**
 * Agrupa las filas de usp_ReportesCargaPorFechaSucursalVendedor (Fecha x Sucursal x Vendedor)
 * en renglones de Fecha x Sucursal, sumando los totales de los vendedores. Se usa este SP y no
 * usp_ReportesCargaPorSucursal porque este ultimo, con un rango, regresa un solo total por
 * sucursal sin columna Fecha.
 */
function agruparDetallePorFechaYSucursal(filas) {
  const grupos = new Map();
  // Si algun renglon llegara sin Fecha se descarta: mejor caer al excel por dia que exportar fechas vacias.
  filas.filter((f) => f.Fecha).forEach((f) => {
    const clave = `${f.Fecha}-${f.ClaveSimi}`;
    const actual = grupos.get(clave) || {
      Fecha: f.Fecha,
      FechaTexto: fechaKeyADdMmYyyy(f.Fecha),
      Sucursal: f.Sucursal,
      ClaveSimi: f.ClaveSimi,
      VentaNeta: 0,
      TcksNetos: 0,
      TotalDescuentos: 0,
      VentaBaseComision: 0,
      VentaConPremio: 0
    };
    actual.VentaNeta += Number(f.VentaNeta) || 0;
    actual.TcksNetos += Number(f.TcksNetos) || 0;
    actual.TotalDescuentos += Number(f.TotalDescuentos) || 0;
    actual.VentaBaseComision += Number(f.VentaBaseComision) || 0;
    actual.VentaConPremio += Number(f.VentaConPremio) || 0;
    grupos.set(clave, actual);
  });
  return [...grupos.values()]
    .map((g) => ({ ...g, PromedioXNota: g.TcksNetos > 0 ? g.VentaNeta / g.TcksNetos : 0 }))
    .sort((a, b) => b.Fecha - a.Fecha || (claveYNombreSucursal(a.ClaveSimi) || '').localeCompare(claveYNombreSucursal(b.ClaveSimi) || ''));
}

function AcumuladoPorFecha() {
  const [fechaInicial, setFechaInicial] = useState(primerDiaDelMes);
  const [fechaFinal, setFechaFinal] = useState(hoyComoFechaSimple);
  const [filas, setFilas] = useState([]);
  const [filasDetalle, setFilasDetalle] = useState([]);
  const [numSucursales, setNumSucursales] = useState(0);
  const [columnasVisibles, setColumnasVisibles] = useState(COLUMNAS_VISIBLES_INICIALES);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const consultar = useCallback(async () => {
    setCargando(true);
    setError(null);
    // El desglose por sucursal (para el excel) se pide en paralelo y con
    // allSettled: si falla, la pantalla sigue funcionando y la exportación
    // sale solo con los renglones "Total día".
    const [acumulado, detalle] = await Promise.allSettled([
      ventasService.obtenerAcumuladoFecha({ fechaInicial, fechaFinal }),
      ventasService.obtenerPorSucursalDetalle({ fechaInicial, fechaFinal })
    ]);
    try {
      if (acumulado.status === 'rejected') throw acumulado.reason;
      setFilas(acumulado.value.data || []);
      setNumSucursales(acumulado.value.sucursales?.length || 0);
      setFilasDetalle(detalle.status === 'fulfilled' ? agruparDetallePorFechaYSucursal(detalle.value.data || []) : []);
      auditService.logAccion('ventas', 'acumulado-fecha', 'consultar', { fechaInicial, fechaFinal });
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar el reporte. Intenta de nuevo.');
      setFilas([]);
      setFilasDetalle([]);
    } finally {
      setCargando(false);
    }
  }, [fechaInicial, fechaFinal]);

  useEffect(() => {
    auditService.logModulo('ventas', 'acumulado-fecha');
    consultar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return filas;
    return filas.filter((f) => f.Fecha?.toLowerCase().includes(texto));
  }, [filas, busqueda]);

  // Se arma a partir de filasFiltradas, así el excel respeta la misma búsqueda por fecha que la tabla.
  const filasExportacion = useMemo(() => armarFilasExportacion(filasFiltradas, filasDetalle), [filasFiltradas, filasDetalle]);

  const columnasExportacion = useMemo(
    () => COLUMNAS_EXPORTACION.filter((c) => COLUMNAS_EXPORTACION_FIJAS.has(c.key) || columnasVisibles.includes(c.key)),
    [columnasVisibles]
  );

  const kpis = useMemo(() => {
    const ventaNeta = filasFiltradas.reduce((acc, f) => acc + (Number(f.VentaNeta) || 0), 0);
    const tickets = filasFiltradas.reduce((acc, f) => acc + (Number(f.TcksNetos) || 0), 0);
    const descuentos = filasFiltradas.reduce((acc, f) => acc + (Number(f.TotalDescuentos) || 0), 0);
    const promedio = tickets > 0 ? ventaNeta / tickets : 0;

    const ordenadosPorVenta = [...filasFiltradas].sort((a, b) => (b.VentaNeta || 0) - (a.VentaNeta || 0));
    const mejorDia = ordenadosPorVenta[0];
    const menorDia = ordenadosPorVenta[ordenadosPorVenta.length - 1];

    return [
      { label: 'Venta neta', value: formatoMoneda.format(ventaNeta), tone: 'blue', glyph: '$' },
      { label: 'Sucursales', value: formatoEntero.format(numSucursales), tone: 'neutral', glyph: '▤' },
      { label: 'Tickets netos', value: formatoEntero.format(tickets), tone: 'green', glyph: '#' },
      { label: 'Promedio x nota', value: formatoMoneda.format(promedio), tone: 'orange', glyph: '$' },
      { label: 'Descuentos', value: formatoMoneda.format(descuentos), tone: 'red', glyph: '$' },
      {
        label: 'Mejor día',
        value: mejorDia ? mejorDia.Fecha : '—',
        hint: mejorDia ? formatoMoneda.format(mejorDia.VentaNeta || 0) : undefined,
        tone: 'green',
        glyph: '▲'
      },
      {
        label: 'Menor día',
        value: menorDia ? menorDia.Fecha : '—',
        hint: menorDia ? formatoMoneda.format(menorDia.VentaNeta || 0) : undefined,
        tone: 'red',
        glyph: '▼'
      }
    ];
  }, [filasFiltradas, numSucursales]);

  return (
    <Panel titulo="Acumulado por Fecha" acento="blue">
      <FiltroRangoFecha
        fechaInicial={fechaInicial}
        fechaFinal={fechaFinal}
        onCambiarFechaInicial={setFechaInicial}
        onCambiarFechaFinal={setFechaFinal}
        onConsultar={consultar}
        cargando={cargando}
        busqueda={busqueda}
        onCambiarBusqueda={setBusqueda}
        busquedaPlaceholder="Buscar por fecha..."
        exportColumns={filasFiltradas.length > 0 ? columnasExportacion : undefined}
        exportRows={filasExportacion}
        exportFileName={`acumulado-por-fecha_${fechaInicial}_${fechaFinal}`}
        exportTitulo="Acumulado por Fecha"
      />

      {cargando && <LoadingState label="Cargando reporte..." />}

      {!cargando && error && (
        <EmptyState title="No se pudo cargar el reporte" message={error} tone="error" actionLabel="Reintentar" onAction={consultar} />
      )}

      {!cargando && !error && filas.length === 0 && (
        <EmptyState title="Sin datos" message="No hay ventas registradas en el rango seleccionado." />
      )}

      {!cargando && !error && filas.length > 0 && (
        <>
          <KpiCards items={kpis} />
          <TablaReporte
            columns={COLUMNAS}
            rows={filasFiltradas}
            expandible
            filaId={(f) => f.Fecha}
            onCambiarColumnasVisibles={setColumnasVisibles}
            renderContenidoExpandido={(f) => <DetalleDiaPorSucursal fecha={f.Fecha} />}
          />
        </>
      )}
    </Panel>
  );
}

export default AcumuladoPorFecha;
