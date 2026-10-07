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
import './DetalleTicket.css';

const formatoMoneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
const formatoEntero = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });
const formatoPorcentaje = (v) => `${Number(v || 0).toLocaleString('es-MX', {maximumFractionDigits: 2})}%`;

function primerDiaDelMes() {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
}

function hoyComoFechaSimple() {
  return new Date().toISOString().slice(0, 10);
}

/** El SP regresa Fecha como DATE real (llega como string ISO). */
function formatearFecha(valor) {
  if (!valor) return '';
  const fecha = new Date(valor);
  // if (Number.isNaN(fecha.getTime())) return String(valor);
  // return fecha.toLocaleDateString('es-MX');
  return fecha.toISOString().slice(0, 10);
}

// Mismo orden que "Auditoría de Tickets" de la plataforma Soltec (farmacias):
// primero la cabecera del ticket (vt_*) y despues el detalle por producto (vtd_*).
const COLUMNAS = [
  // --- Cabecera del ticket ---
  { key: 'ClaveSimi', label: 'Sucursal', align: 'left', format: (v) => claveYNombreSucursal(v) || v },
  { key: 'Folio', label: 'Folio', align: 'left' },
  { key: 'Fecha', label: 'Fecha', align: 'left', format: (v) => formatearFecha(v) },
  { key: 'Hora', label: 'Hora', align: 'left' },
  { key: 'Vendedor', label: 'Vendedor', align: 'left' },
  { key: 'NoEmpleado', label: '# Empleado', align: 'left' },
  { key: 'Concepto', label: 'Concepto', align: 'left' },
  { key: 'Referencia', label: 'Referencia', align: 'left' },
  { key: 'SubtotalVenta', label: 'Subtotal venta', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'DescuentoVenta', label: 'Descuento venta', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'IvaVenta', label: 'IVA venta', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'TotalVenta', label: 'Total venta', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'Cancelada', label: 'Cancelada', align: 'left', format: (v) => (v ? 'Sí' : 'No') },
    // Vacia desde el 30/09 por la carga de datos (pendiente con David).
  { key: 'FormaPago', label: 'Forma pago', align: 'left', format: (v) => (String(v ?? '').trim() ? v : 'Pendiente') },
  // --- Detalle por producto ---
  // Premio sustituye a vtd_gpo (grupo 8 = Productos con Premio); vacio si el SP aun no lo regresa.
  { key: 'Premio', label: 'Premio', align: 'left', format: (v) => (v == null ? '' : v ? 'Sí' : 'No') },
  { key: 'SubgrupoProducto', label: 'Subgrupo', align: 'left' },
  { key: 'CodigoProducto', label: 'Código', align: 'left' },
  { key: 'Producto', label: 'Producto', align: 'left' },
  { key: 'GrupoProducto', label: 'Grupo', align: 'left', visibleByDefault: false },
  { key: 'CategoriaProducto', label: 'Categoría', align: 'left', visibleByDefault: false },
  { key: 'Cantidad', label: 'Cant.', format: (v) => formatoEntero.format(v || 0) },
  { key: 'PrecioUnitario', label: 'P. unitario', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'SubtotalProducto', label: 'Subtotal producto', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'PorcentajeDescuento', label: '% Desc.', format: formatoPorcentaje },
  { key: 'ImporteDescuento', label: 'Descuento', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'PorcentajeIva', label: '% IVA', format: formatoPorcentaje },
  { key: 'ImporteIva', label: 'IVA', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'ImporteTotal', label: 'Total', format: (v) => formatoMoneda.format(v || 0) },
  // El SP aun la regresa fija en 0, por eso va oculta.
  { key: 'CantidadDevuelta', label: 'Cant. devuelta', format: (v) => formatoEntero.format(v || 0), visibleByDefault: false },
  { key: 'TipoOperacion', label: 'Tipo operación (código)', visibleByDefault: false }
];


function DetalleTicket() {
  // Este reporte usa YYYY-MM-DD directo (DATE), no FechaKey -- por eso
  // ventasService.obtenerDetalleTicket no convierte el formato, a
  // diferencia de los otros 6 servicios de este modulo.
  const [fechaInicial, setFechaInicial] = useState(primerDiaDelMes);
  const [fechaFinal, setFechaFinal] = useState(hoyComoFechaSimple);
  const [filas, setFilas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const consultar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const resultado = await ventasService.obtenerDetalleTicket({ fechaInicial, fechaFinal });
      setFilas(resultado.data || []);
      auditService.logAccion('ventas', 'detalle-ticket', 'consultar', { fechaInicial, fechaFinal });
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar el reporte. Intenta de nuevo.');
      setFilas([]);
    } finally {
      setCargando(false);
    }
  }, [fechaInicial, fechaFinal]);

  useEffect(() => {
    auditService.logModulo('ventas', 'detalle-ticket');
    consultar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return filas;
    return filas.filter(
      (f) =>
        String(f.Folio ?? '').includes(texto) ||
        f.Producto?.toLowerCase().includes(texto) ||
        f.Vendedor?.toLowerCase().includes(texto) ||
        f.CodigoProducto?.toLowerCase().includes(texto) ||
        String(f.NoEmpleado ?? '').includes(texto) ||
        String(f.Referencia ?? '').toLowerCase().includes(texto) ||
        f.ClaveSimi?.toLowerCase().includes(texto) ||
        nombrePorClaveSimi(f.ClaveSimi)?.toLowerCase().includes(texto)
    );
  }, [filas, busqueda]);

    const kpis = useMemo(() => {
      // Un ticket es Sucursal + Fecha + Folio: el folio se repite entre sucursales.
      const claveTicket = (f) => `${f.ClaveSimi}|${f.Fecha}|${f.Folio}`;
      const ventaTotal = filasFiltradas.reduce((acc, f) => acc + (Number(f.ImporteTotal) || 0), 0);
      const foliosUnicos = new Set(filasFiltradas.map(claveTicket)).size;
      const cancelados = filasFiltradas.filter((f) => f.Cancelada).length;
      const sinFormaPago = new Set(filasFiltradas.filter((f) => !String(f.FormaPago ?? '').trim()).map(claveTicket)).size;

      return [
        { label: 'Venta total', value: formatoMoneda.format(ventaTotal), tone: 'blue', glyph: '$' },
        { label: 'Tickets únicos', value: formatoEntero.format(foliosUnicos), tone: 'green', glyph: '#' },
        { label: 'Promedio x ticket', value: formatoMoneda.format(foliosUnicos > 0 ? ventaTotal / foliosUnicos : 0), tone: 'orange', glyph: '$' },
        { label: 'Tickets cancelados', value: formatoEntero.format(cancelados), tone: cancelados > 0 ? 'red' : 'neutral', glyph: '✕' },
        { label: 'Tickets sin forma de pago', value: formatoEntero.format(sinFormaPago), tone: sinFormaPago > 0 ? 'orange' : 'neutral', glyph: '!' }
      ];
    }, [filasFiltradas]);


  return (
    <Panel titulo="Detalle Ticket" acento="red">
      <FiltroRangoFecha
        fechaInicial={fechaInicial}
        fechaFinal={fechaFinal}
        onCambiarFechaInicial={setFechaInicial}
        onCambiarFechaFinal={setFechaFinal}
        onConsultar={consultar}
        cargando={cargando}
        busqueda={busqueda}
        onCambiarBusqueda={setBusqueda}
        busquedaPlaceholder="Buscar por folio, código, producto, vendedor, # empleado o sucursal..."
        exportColumns={filas.length > 0 ? COLUMNAS : undefined}
        exportRows={filasFiltradas}
        exportFileName={`detalle-ticket_${fechaInicial}_${fechaFinal}`}
        exportTitulo="Detalle Ticket"
      />

      {cargando && <LoadingState label="Cargando reporte..." />}

      {!cargando && error && (
        <EmptyState title="No se pudo cargar el reporte" message={error} tone="error" actionLabel="Reintentar" onAction={consultar} />
      )}

      {!cargando && !error && filas.length === 0 && (
        <EmptyState title="Sin datos" message="No hay tickets registrados en el rango seleccionado." />
      )}

      {!cargando && !error && filas.length > 0 && (
        <>
          <KpiCards items={kpis} />
          <TablaReporte
            columns={COLUMNAS}
            rows={filasFiltradas}
            maxHeight={480}
            rowClassName={(f) => (f.Cancelada ? 'sp-detalle-ticket__fila--cancelada' : undefined)}
          />
        </>
      )}
    </Panel>
  );
}

export default DetalleTicket;
