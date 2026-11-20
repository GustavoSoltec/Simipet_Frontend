import { useCallback, useEffect, useMemo, useState } from 'react';
import auditService from '../../../services/auditService';
import { nombrePorClaveSimi, claveYNombreSucursal } from '../../../services/authService';
import ventasService from '../services/ventasService';
import Panel from '../../../components/common/Panel';
import FiltroRangoFecha from '../../../components/common/FiltroRangoFecha';
import KpiCards from '../../../components/common/KpiCards';
import TablaReporte from '../../../components/common/TablaReporte';
import LoadingState from '../../../components/common/LoadingState';
import EmptyState from '../../../components/common/EmptyState';
import DetalleFechaSucursalTickets from './DetalleFechaSucursalTickets';
import { exportarExcelHojas } from '../../../utils/exportUtils';
import './PorSucursal.css';

const formatoMoneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
const formatoEntero = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });
const formatoPorcentaje = new Intl.NumberFormat('es-MX', { style: 'percent', maximumFractionDigits: 1 });

function primerDiaDelMes() {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
}

function hoyComoFechaSimple() {
  return new Date().toISOString().slice(0, 10);
}

/** El SP regresa Fecha como INT yyyyMMdd. */
function formatearFechaKey(fechaKey) {
  const texto = String(fechaKey);
  return `${texto.slice(6, 8)}/${texto.slice(4, 6)}/${texto.slice(0, 4)}`;
}

const COLUMNAS = [
  { key: 'Fecha', label: 'Fecha', align: 'left', format: (v) => formatearFechaKey(v) },
  { key: 'Sucursal', label: 'Sucursal', align: 'left', format: (v, fila) => claveYNombreSucursal(fila.ClaveSimi) || v },
  { key: 'VentaNeta', label: 'Venta neta', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'TcksNetos', label: 'Tickets netos', format: (v) => formatoEntero.format(v || 0) },
  { key: 'PromedioXNota', label: 'Promedio x nota', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'Porcentaje', label: '% Base comisión', format: (v) => formatoPorcentaje.format((v || 0) / 100), visibleByDefault: false },
  { key: 'TotalDescuentos', label: 'Descuentos', format: (v) => formatoMoneda.format(v || 0) }
];

// ---- Excel con detalle (hojas Resumen / Tickets / Articulos) ----
// Los importes van como numeros (exportFormat) para poder sumar y hacer
// tablas dinamicas en Excel; PDF y CSV siguen usando COLUMNAS.

function numeroExportable(valor) {
  return Math.round((Number(valor) || 0) * 100) / 100;
}

/** Detalle Ticket regresa Fecha como DATE (llega 'yyyy-MM-ddT00:00:00.000Z') -> 'dd/MM/yyyy'. */
function formatearFechaIso(fecha) {
  const texto = String(fecha).slice(0, 10);
  return `${texto.slice(8, 10)}/${texto.slice(5, 7)}/${texto.slice(0, 4)}`;
}

/** DATE de Detalle Ticket -> FechaKey 'yyyyMMdd' (texto), para cruzar con las filas del resumen. */
function fechaIsoAFechaKey(fecha) {
  return String(fecha).slice(0, 10).replaceAll('-', '');
}

const sucursalExportable = (v, fila) => claveYNombreSucursal(fila.ClaveSimi) || v || fila.ClaveSimi;

const COLUMNAS_EXCEL_RESUMEN = [
  { key: 'Fecha', label: 'Fecha', exportFormat: (v) => formatearFechaKey(v) },
  { key: 'Sucursal', label: 'Sucursal', exportFormat: sucursalExportable },
  { key: 'VentaNeta', label: 'Venta neta', exportFormat: numeroExportable },
  { key: 'TcksNetos', label: 'Tickets netos', exportFormat: (v) => Number(v) || 0 },
  { key: 'PromedioXNota', label: 'Promedio x nota', exportFormat: numeroExportable },
  { key: 'Porcentaje', label: '% Base comisión', exportFormat: numeroExportable },
  { key: 'TotalDescuentos', label: 'Descuentos', exportFormat: numeroExportable }
];

const COLUMNAS_EXCEL_TICKETS = [
  { key: 'Fecha', label: 'Fecha', exportFormat: (v) => formatearFechaIso(v) },
  { key: 'Sucursal', label: 'Sucursal', exportFormat: sucursalExportable },
  { key: 'Folio', label: 'Folio' },
  { key: 'Hora', label: 'Hora' },
  { key: 'Vendedor', label: 'Vendedor' },
  { key: 'FormaPago', label: 'Forma pago' },
  { key: 'Concepto', label: 'Concepto' },
  { key: 'SubtotalVenta', label: 'Subtotal', exportFormat: numeroExportable },
  { key: 'DescuentoVenta', label: 'Descuento', exportFormat: numeroExportable },
  { key: 'IvaVenta', label: 'IVA', exportFormat: numeroExportable },
  { key: 'TotalVenta', label: 'Total', exportFormat: numeroExportable },
  { key: 'Cancelada', label: 'Estatus', exportFormat: (v) => (v ? 'Cancelada' : 'Vigente') }
];

const COLUMNAS_EXCEL_ARTICULOS = [
  { key: 'Fecha', label: 'Fecha', exportFormat: (v) => formatearFechaIso(v) },
  { key: 'Sucursal', label: 'Sucursal', exportFormat: sucursalExportable },
  { key: 'Folio', label: 'Folio' },
  { key: 'CodigoProducto', label: 'Código' },
  { key: 'Producto', label: 'Producto' },
  { key: 'Cantidad', label: 'Cantidad', exportFormat: (v) => Number(v) || 0 },
  { key: 'PrecioUnitario', label: 'P. unitario', exportFormat: numeroExportable },
  { key: 'ImporteDescuento', label: 'Descuento', exportFormat: numeroExportable },
  { key: 'ImporteIva', label: 'IVA', exportFormat: numeroExportable },
  { key: 'ImporteTotal', label: 'Total', exportFormat: numeroExportable },
  { key: 'Cancelada', label: 'Estatus', exportFormat: (v) => (v ? 'Cancelada' : 'Vigente') }
];

/**
 * Un renglon por ticket (Detalle Ticket trae un renglon por articulo).
 * Misma regla que el "+" de la tabla: se toma el primer renglon de cada
 * folio y su TotalVenta ya calculado por el SP.
 */
function agruparTickets(filasDetalle) {
  const porTicket = new Map();
  filasDetalle.forEach((f) => {
    const clave = `${fechaIsoAFechaKey(f.Fecha)}-${f.ClaveSimi}-${f.Folio}`;
    if (!porTicket.has(clave)) porTicket.set(clave, f);
  });
  return [...porTicket.values()];
}

function agruparPorFechaYSucursal(filas) {
  const grupos = new Map();
  filas.forEach((f) => {
    const clave = `${f.Fecha}-${f.ClaveSimi}`;
    const actual = grupos.get(clave) || {
      Fecha: f.Fecha,
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
    .map((g) => ({
      ...g,
      PromedioXNota: g.TcksNetos > 0 ? g.VentaNeta / g.TcksNetos : 0,
      Porcentaje: g.VentaBaseComision > 0 ? (g.VentaConPremio / g.VentaBaseComision) * 100 : 0
    }))
    .sort((a, b) => b.Fecha - a.Fecha);
}

function agruparPorSucursalSolo(filas) {
  const grupos = new Map();
  filas.forEach((f) => {
    const actual = grupos.get(f.ClaveSimi) || { Sucursal: f.Sucursal, ClaveSimi: f.ClaveSimi, VentaNeta: 0 };
    actual.VentaNeta += Number(f.VentaNeta) || 0;
    grupos.set(f.ClaveSimi, actual);
  });
  return [...grupos.values()];
}

function PorSucursal() {
  const [fechaInicial, setFechaInicial] = useState(primerDiaDelMes);
  const [fechaFinal, setFechaFinal] = useState(hoyComoFechaSimple);
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  // Rango con el que se cargo la tabla: el Excel con detalle usa este, no
  // el de los combos (pueden haberse cambiado sin volver a consultar).
  const [rangoConsultado, setRangoConsultado] = useState(null);

  const consultar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const resultado = await ventasService.obtenerPorSucursalDetalle({ fechaInicial, fechaFinal });
      setFilas(resultado.data || []);
      setRangoConsultado({ fechaInicial, fechaFinal });
      auditService.logAccion('ventas', 'por-sucursal', 'consultar', { fechaInicial, fechaFinal });
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar el reporte. Intenta de nuevo.');
      setFilas([]);
    } finally {
      setCargando(false);
    }
  }, [fechaInicial, fechaFinal]);

  useEffect(() => {
    auditService.logModulo('ventas', 'por-sucursal');
    consultar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return filas;
    return filas.filter((f) => nombrePorClaveSimi(f.ClaveSimi)?.toLowerCase().includes(texto));
  }, [filas, busqueda]);

  const filasAgrupadas = useMemo(() => agruparPorFechaYSucursal(filasFiltradas), [filasFiltradas]);

  /**
   * Excel con 3 hojas: Resumen (la tabla), Tickets y Articulos. El detalle
   * se pide en una sola llamada a Detalle Ticket (usp_Reporte_DetalleTicket)
   * para todo el rango consultado, y se deja solo lo que corresponde a las
   * filas del resumen (respeta la busqueda por sucursal).
   */
  const exportarExcelConDetalle = useCallback(async () => {
    if (!rangoConsultado) return;
    const { fechaInicial: desde, fechaFinal: hasta } = rangoConsultado;
    const filasResumen = filasAgrupadas;
    const clavesResumen = new Set(filasResumen.map((f) => `${f.Fecha}-${String(f.ClaveSimi).trim()}`));
    const hayBusqueda = busqueda.trim() !== '';
    const sucursales = hayBusqueda ? [...new Set(filasResumen.map((f) => String(f.ClaveSimi).trim()))] : undefined;

    try {
      const resultado = await ventasService.obtenerDetalleTicket({ fechaInicial: desde, fechaFinal: hasta, sucursales });
      const articulos = (resultado.data || []).filter((f) =>
        clavesResumen.has(`${fechaIsoAFechaKey(f.Fecha)}-${String(f.ClaveSimi).trim()}`)
      );

      exportarExcelHojas(
        [
          { nombre: 'Resumen', rows: filasResumen, columns: COLUMNAS_EXCEL_RESUMEN },
          { nombre: 'Tickets', rows: agruparTickets(articulos), columns: COLUMNAS_EXCEL_TICKETS },
          { nombre: 'Articulos', rows: articulos, columns: COLUMNAS_EXCEL_ARTICULOS }
        ],
        `por-sucursal_${desde}_${hasta}`
      );
      auditService.logAccion('ventas', 'por-sucursal', 'exportar-excel-detalle', { fechaInicial: desde, fechaFinal: hasta });
    } catch (err) {
      window.alert(err.response?.data?.message || 'No se pudo generar el Excel con el detalle. Intenta de nuevo.');
    }
  }, [rangoConsultado, filasAgrupadas, busqueda]);

  const kpis = useMemo(() => {
    const ventaNeta = filasFiltradas.reduce((acc, f) => acc + (Number(f.VentaNeta) || 0), 0);
    const tickets = filasFiltradas.reduce((acc, f) => acc + (Number(f.TcksNetos) || 0), 0);
    const descuentos = filasFiltradas.reduce((acc, f) => acc + (Number(f.TotalDescuentos) || 0), 0);
    const promedio = tickets > 0 ? ventaNeta / tickets : 0;

    const porSucursal = agruparPorSucursalSolo(filasFiltradas);
    const ordenadas = [...porSucursal].sort((a, b) => b.VentaNeta - a.VentaNeta);
    const mejorSucursal = ordenadas[0];
    const menorSucursal = ordenadas[ordenadas.length - 1];

    return [
      { label: 'Venta neta', value: formatoMoneda.format(ventaNeta), tone: 'blue', glyph: '$' },
      { label: 'Sucursales', value: formatoEntero.format(porSucursal.length), tone: 'neutral', glyph: '▤' },
      { label: 'Tickets netos', value: formatoEntero.format(tickets), tone: 'green', glyph: '#' },
      { label: 'Promedio x nota', value: formatoMoneda.format(promedio), tone: 'orange', glyph: '$' },
      { label: 'Descuentos', value: formatoMoneda.format(descuentos), tone: 'red', glyph: '$' },
      {
        label: 'Mejor sucursal',
        value: mejorSucursal ? claveYNombreSucursal(mejorSucursal.ClaveSimi) : '—',
        hint: mejorSucursal ? formatoMoneda.format(mejorSucursal.VentaNeta || 0) : undefined,
        tone: 'green',
        glyph: '▲'
      },
      {
        label: 'Menor sucursal',
        value: menorSucursal ? claveYNombreSucursal(menorSucursal.ClaveSimi) : '—',
        hint: menorSucursal ? formatoMoneda.format(menorSucursal.VentaNeta || 0) : undefined,
        tone: 'red',
        glyph: '▼'
      }
    ];
  }, [filasFiltradas]);

  return (
    <Panel titulo="Por Sucursal" acento="teal">
      <FiltroRangoFecha
        fechaInicial={fechaInicial}
        fechaFinal={fechaFinal}
        onCambiarFechaInicial={setFechaInicial}
        onCambiarFechaFinal={setFechaFinal}
        onConsultar={consultar}
        cargando={cargando}
        busqueda={busqueda}
        onCambiarBusqueda={setBusqueda}
        busquedaPlaceholder="Buscar por sucursal..."
        exportColumns={filasAgrupadas.length > 0 ? COLUMNAS : undefined}
        exportRows={filasAgrupadas}
        exportFileName={`por-sucursal_${fechaInicial}_${fechaFinal}`}
        exportTitulo="Por Sucursal"
        onExportarExcel={exportarExcelConDetalle}
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

          {filasAgrupadas.length === 0 ? (
            <EmptyState title="Sin datos" message="No hay resultados para esta búsqueda." />
          ) : (
            <TablaReporte
              columns={COLUMNAS}
              rows={filasAgrupadas}
              maxHeight={480}
              expandible
              filaId={(f) => `${f.Fecha}-${f.ClaveSimi}`}
              renderContenidoExpandido={(f) => <DetalleFechaSucursalTickets claveSimi={f.ClaveSimi} fechaKey={f.Fecha} />}
            />
          )}
        </>
      )}
    </Panel>
  );
}

export default PorSucursal;
