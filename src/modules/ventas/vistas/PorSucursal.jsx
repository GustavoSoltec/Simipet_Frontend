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

  const consultar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const resultado = await ventasService.obtenerPorSucursalDetalle({ fechaInicial, fechaFinal });
      setFilas(resultado.data || []);
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
