import { useCallback, useEffect, useMemo, useState } from 'react';
import auditService from '../../../services/auditService';
import ventasService from '../services/ventasService';
import Panel from '../../../components/common/Panel';
import FiltroRangoFecha from '../../../components/common/FiltroRangoFecha';
import KpiCards from '../../../components/common/KpiCards';
import TablaReporte from '../../../components/common/TablaReporte';
import LoadingState from '../../../components/common/LoadingState';
import EmptyState from '../../../components/common/EmptyState';
import DetalleVendedorPorDia from './DetalleVendedorPorDia';
import './PorVendedor.css';

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
  { key: 'Vendedor', label: 'Vendedor', align: 'left' },
  { key: 'VentaNeta', label: 'Venta neta', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'TcksNetos', label: 'Tickets netos', format: (v) => formatoEntero.format(v || 0) },
  { key: 'PromedioXNota', label: 'Promedio x nota', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'TotalDescuentos', label: 'Descuentos', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'VentaBaseComision', label: 'Venta base comisión', format: (v) => formatoMoneda.format(v || 0), visibleByDefault: false },
  { key: 'VentaConPremio', label: 'Venta con premio', format: (v) => formatoMoneda.format(v || 0), visibleByDefault: false }
];

function PorVendedor() {
  const [fechaInicial, setFechaInicial] = useState(primerDiaDelMes);
  const [fechaFinal, setFechaFinal] = useState(hoyComoFechaSimple);
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [ocultarCeros, setOcultarCeros] = useState(false);

  const consultar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const resultado = await ventasService.obtenerPorVendedor({ fechaInicial, fechaFinal });
      setFilas(resultado.data || []);
      setVendedorSeleccionado('');
      auditService.logAccion('ventas', 'por-vendedor', 'consultar', { fechaInicial, fechaFinal });
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar el reporte. Intenta de nuevo.');
      setFilas([]);
    } finally {
      setCargando(false);
    }
  }, [fechaInicial, fechaFinal]);

  useEffect(() => {
    auditService.logModulo('ventas', 'por-vendedor');
    consultar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const opcionesVendedores = useMemo(() => {
    return [...new Set(filas.map((f) => f.Vendedor))].sort((a, b) => a.localeCompare(b));
  }, [filas]);

  const filasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return filas.filter(
      (f) =>
        (!vendedorSeleccionado || f.Vendedor === vendedorSeleccionado) &&
        (!texto || f.Vendedor?.toLowerCase().includes(texto)) &&
        (!ocultarCeros || (f.VentaNeta || 0) !== 0)
    );
  }, [filas, vendedorSeleccionado, busqueda, ocultarCeros]);

  const kpis = useMemo(() => {
    const ventaNeta = filasFiltradas.reduce((acc, f) => acc + (Number(f.VentaNeta) || 0), 0);
    const tickets = filasFiltradas.reduce((acc, f) => acc + (Number(f.TcksNetos) || 0), 0);
    const ordenados = [...filasFiltradas].sort((a, b) => (b.VentaNeta || 0) - (a.VentaNeta || 0));
    const mejor = ordenados[0];
    const menor = ordenados[ordenados.length - 1];

    return [
      { label: 'Venta neta', value: formatoMoneda.format(ventaNeta), tone: 'blue', glyph: '$' },
      { label: 'Tickets netos', value: formatoEntero.format(tickets), tone: 'green', glyph: '#' },
      { label: 'Vendedores', value: formatoEntero.format(filasFiltradas.length), tone: 'neutral', glyph: '▤' },
      {
        label: 'Mejor vendedor',
        value: mejor ? mejor.Vendedor : '—',
        hint: mejor ? formatoMoneda.format(mejor.VentaNeta || 0) : undefined,
        tone: 'green',
        glyph: '▲'
      },
      {
        label: 'Menor vendedor',
        value: menor ? menor.Vendedor : '—',
        hint: menor ? formatoMoneda.format(menor.VentaNeta || 0) : undefined,
        tone: 'red',
        glyph: '▼'
      }
    ];
  }, [filasFiltradas]);

  return (
    <Panel titulo="Por Vendedor" acento="green">
      <FiltroRangoFecha
        fechaInicial={fechaInicial}
        fechaFinal={fechaFinal}
        onCambiarFechaInicial={setFechaInicial}
        onCambiarFechaFinal={setFechaFinal}
        onConsultar={consultar}
        cargando={cargando}
        busqueda={busqueda}
        onCambiarBusqueda={setBusqueda}
        busquedaPlaceholder="Buscar vendedor..."
        ocultarCeros={ocultarCeros}
        onCambiarOcultarCeros={setOcultarCeros}
        exportColumns={filasFiltradas.length > 0 ? COLUMNAS : undefined}
        exportRows={filasFiltradas}
        exportFileName={`por-vendedor_${fechaInicial}_${fechaFinal}`}
        exportTitulo="Por Vendedor"
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
          <div className="sp-por-vendedor__filtros">
            <label className="sp-por-vendedor__campo">
              <span>Vendedor</span>
              <select value={vendedorSeleccionado} onChange={(e) => setVendedorSeleccionado(e.target.value)}>
                <option value="">Todos los vendedores</option>
                {opcionesVendedores.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <KpiCards items={kpis} />

          {filasFiltradas.length === 0 ? (
            <EmptyState title="Sin datos" message="No hay resultados con estos filtros." />
          ) : (
            <TablaReporte
              columns={COLUMNAS}
              rows={filasFiltradas}
              expandible
              filaId={(f) => f.Clave}
              renderContenidoExpandido={(f) => (
                <DetalleVendedorPorDia vendedor={f.Vendedor} fechaInicial={fechaInicial} fechaFinal={fechaFinal} />
              )}
            />
          )}
        </>
      )}
    </Panel>
  );
}

export default PorVendedor;
