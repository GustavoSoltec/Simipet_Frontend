import { useCallback, useEffect, useMemo, useState } from 'react';
import auditService from '../../../services/auditService';
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

function AcumuladoPorFecha() {
  const [fechaInicial, setFechaInicial] = useState(primerDiaDelMes);
  const [fechaFinal, setFechaFinal] = useState(hoyComoFechaSimple);
  const [filas, setFilas] = useState([]);
  const [numSucursales, setNumSucursales] = useState(0);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const consultar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const resultado = await ventasService.obtenerAcumuladoFecha({ fechaInicial, fechaFinal });
      setFilas(resultado.data || []);
      setNumSucursales(resultado.sucursales?.length || 0);
      auditService.logAccion('ventas', 'acumulado-fecha', 'consultar', { fechaInicial, fechaFinal });
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar el reporte. Intenta de nuevo.');
      setFilas([]);
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
        exportColumns={filasFiltradas.length > 0 ? COLUMNAS : undefined}
        exportRows={filasFiltradas}
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
            renderContenidoExpandido={(f) => <DetalleDiaPorSucursal fecha={f.Fecha} />}
          />
        </>
      )}
    </Panel>
  );
}

export default AcumuladoPorFecha;
