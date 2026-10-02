import { useCallback, useEffect, useMemo, useState } from 'react';
import auditService from '../../../services/auditService';
import { nombrePorClaveSimi, claveYNombreSucursal } from '../../../services/authService';
import ventasService from '../services/ventasService';
import Panel from '../../../components/common/Panel';
import FiltroRangoFecha from '../../../components/common/FiltroRangoFecha';
import KpiCards from '../../../components/common/KpiCards';
import TablaReporte from '../../../components/common/TablaReporte';
import TablaAnidada from '../../../components/common/TablaAnidada';
import LoadingState from '../../../components/common/LoadingState';
import EmptyState from '../../../components/common/EmptyState';
import './SucursalDetalle.css';

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

// Tabla principal: un renglon por dia+sucursal (el vendedor se ve
// adentro, al expandir). Antes esto era un renglon por dia+sucursal+
// vendedor -- se agrupa para que la vista principal sea mas limpia.
const COLUMNAS = [
  { key: 'Fecha', label: 'Fecha', align: 'left', format: (v) => formatearFechaKey(v) },
  { key: 'Sucursal', label: 'Sucursal', align: 'left', format: (v, fila) => claveYNombreSucursal(fila.ClaveSimi) || v },
  { key: 'VentaNeta', label: 'Venta neta', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'TcksNetos', label: 'Tickets netos', format: (v) => formatoEntero.format(v || 0) },
  { key: 'PromedioXNota', label: 'Promedio x nota', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'Porcentaje', label: '% Base comisión', format: (v) => formatoPorcentaje.format((v || 0) / 100) },
  { key: 'TotalDescuentos', label: 'Descuentos', format: (v) => formatoMoneda.format(v || 0) }
];

// Tabla del desglose inline: mismo renglon, pero por vendedor.
const COLUMNAS_VENDEDOR = [
  { key: 'Vendedor', label: 'Vendedor', align: 'left' },
  { key: 'VentaNeta', label: 'Venta neta', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'TcksNetos', label: 'Tickets', format: (v) => formatoEntero.format(v || 0) },
  { key: 'PromedioXNota', label: 'Promedio x nota', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'Porcentaje', label: '% Base comisión', format: (v) => formatoPorcentaje.format((v || 0) / 100) },
  { key: 'TotalDescuentos', label: 'Descuentos', format: (v) => formatoMoneda.format(v || 0) }
];

/** Agrupa las filas crudas (Fecha x Sucursal x Vendedor) en renglones de Fecha x Sucursal, sumando los totales. */
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

function SucursalDetalle() {
  const [fechaInicial, setFechaInicial] = useState(primerDiaDelMes);
  const [fechaFinal, setFechaFinal] = useState(hoyComoFechaSimple);
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState('');
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [ocultarCeros, setOcultarCeros] = useState(false);

  const consultar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const resultado = await ventasService.obtenerPorSucursalDetalle({ fechaInicial, fechaFinal });
      setFilas(resultado.data || []);
      setSucursalSeleccionada('');
      setVendedorSeleccionado('');
      auditService.logAccion('ventas', 'sucursal-detalle', 'consultar', { fechaInicial, fechaFinal });
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar el reporte. Intenta de nuevo.');
      setFilas([]);
    } finally {
      setCargando(false);
    }
  }, [fechaInicial, fechaFinal]);

  useEffect(() => {
    auditService.logModulo('ventas', 'sucursal-detalle');
    consultar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const opcionesSucursales = useMemo(() => {
    const mapa = new Map();
    filas.forEach((f) => {
      if (!mapa.has(f.ClaveSimi)) mapa.set(f.ClaveSimi, claveYNombreSucursal(f.ClaveSimi));
    });
    return [...mapa.entries()]
      .map(([claveSimi, nombre]) => ({ claveSimi, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [filas]);

  const opcionesVendedores = useMemo(() => {
    return [...new Set(filas.map((f) => f.Vendedor))].sort((a, b) => a.localeCompare(b));
  }, [filas]);

  // Los filtros (combos, busqueda, ocultar ceros) se aplican sobre las
  // filas CRUDAS (dia+sucursal+vendedor) antes de agrupar -- asi, si se
  // elige un vendedor especifico, el renglon de dia+sucursal que se ve
  // arriba ya refleja solo la parte de ese vendedor.
  const filasRawFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return filas.filter(
      (f) =>
        (!sucursalSeleccionada || f.ClaveSimi === sucursalSeleccionada) &&
        (!vendedorSeleccionado || f.Vendedor === vendedorSeleccionado) &&
        (!texto || nombrePorClaveSimi(f.ClaveSimi)?.toLowerCase().includes(texto) || f.Vendedor?.toLowerCase().includes(texto)) &&
        (!ocultarCeros || (f.VentaNeta || 0) !== 0)
    );
  }, [filas, sucursalSeleccionada, vendedorSeleccionado, busqueda, ocultarCeros]);

  const filasAgrupadas = useMemo(() => agruparPorFechaYSucursal(filasRawFiltradas), [filasRawFiltradas]);

  const kpis = useMemo(() => {
    const ventaNeta = filasRawFiltradas.reduce((acc, f) => acc + (Number(f.VentaNeta) || 0), 0);
    const tickets = filasRawFiltradas.reduce((acc, f) => acc + (Number(f.TcksNetos) || 0), 0);
    const diasConDatos = new Set(filasRawFiltradas.map((f) => f.Fecha)).size;

    return [
      { label: 'Venta neta', value: formatoMoneda.format(ventaNeta), tone: 'blue', glyph: '$' },
      { label: 'Tickets netos', value: formatoEntero.format(tickets), tone: 'green', glyph: '#' },
      { label: 'Promedio x nota', value: formatoMoneda.format(tickets > 0 ? ventaNeta / tickets : 0), tone: 'orange', glyph: '$' },
      { label: 'Días con datos', value: formatoEntero.format(diasConDatos), tone: 'neutral', glyph: '▦' }
    ];
  }, [filasRawFiltradas]);

  return (
    <Panel titulo="Por Sucursal detalle" acento="blue">
      <FiltroRangoFecha
        fechaInicial={fechaInicial}
        fechaFinal={fechaFinal}
        onCambiarFechaInicial={setFechaInicial}
        onCambiarFechaFinal={setFechaFinal}
        onConsultar={consultar}
        cargando={cargando}
        busqueda={busqueda}
        onCambiarBusqueda={setBusqueda}
        busquedaPlaceholder="Buscar por sucursal o vendedor..."
        ocultarCeros={ocultarCeros}
        onCambiarOcultarCeros={setOcultarCeros}
        exportColumns={filasRawFiltradas.length > 0 ? COLUMNAS_VENDEDOR : undefined}
        exportRows={filasRawFiltradas}
        exportFileName={`sucursal-detalle_${fechaInicial}_${fechaFinal}`}
        exportTitulo="Por Sucursal detalle"
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
          <div className="sp-sd-filtros">
            <label className="sp-sd-filtros__campo">
              <span>Sucursal</span>
              <select value={sucursalSeleccionada} onChange={(e) => setSucursalSeleccionada(e.target.value)}>
                <option value="">Todas las sucursales</option>
                {opcionesSucursales.map((o) => (
                  <option key={o.claveSimi} value={o.claveSimi}>
                    {o.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="sp-sd-filtros__campo">
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

          {filasAgrupadas.length === 0 ? (
            <EmptyState title="Sin datos" message="No hay resultados con estos filtros." />
          ) : (
            <TablaReporte
              columns={COLUMNAS}
              rows={filasAgrupadas}
              maxHeight={480}
              expandible
              filaId={(f) => `${f.Fecha}-${f.ClaveSimi}`}
              renderContenidoExpandido={(f) => {
                const detalleVendedores = filasRawFiltradas.filter(
                  (raw) => raw.Fecha === f.Fecha && raw.ClaveSimi === f.ClaveSimi
                );
                return <TablaAnidada columns={COLUMNAS_VENDEDOR} rows={detalleVendedores} />;
              }}
            />
          )}
        </>
      )}
    </Panel>
  );
}

export default SucursalDetalle;
