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
import './Productos.css';

const formatoMoneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
const formatoEntero = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

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

const COLUMNAS_NIVEL1 = [
  { key: 'Fecha', label: 'Fecha', align: 'left', format: (v) => formatearFechaKey(v) },
  { key: 'Sucursal', label: 'Sucursal', align: 'left', format: (v, fila) => claveYNombreSucursal(fila.ClaveSimi) || v },
  { key: 'Piezas', label: 'Piezas', format: (v) => formatoEntero.format(v || 0) },
  { key: 'VentaNeta', label: 'Venta neta', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'Descuento', label: 'Descuento', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'IVA', label: 'IVA', format: (v) => formatoMoneda.format(v || 0) }
];

const COLUMNAS_NIVEL2 = [
  { key: 'Vendedor', label: 'Vendedor', align: 'left' },
  { key: 'Piezas', label: 'Piezas', format: (v) => formatoEntero.format(v || 0) },
  { key: 'VentaNeta', label: 'Venta neta', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'Descuento', label: 'Descuento', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'IVA', label: 'IVA', format: (v) => formatoMoneda.format(v || 0) }
];

const COLUMNAS_NIVEL3 = [
  { key: 'Producto', label: 'Producto', align: 'left' },
  { key: 'Piezas', label: 'Piezas', format: (v) => formatoEntero.format(v || 0) },
  { key: 'VentaNeta', label: 'Venta neta', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'Descuento', label: 'Descuento', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'IVA', label: 'IVA', format: (v) => formatoMoneda.format(v || 0) }
];

/** Redondea a 2 decimales y regresa número (no texto) para que el excel pueda sumar. */
function numeroExportable(valor){
  return Math.round((Number(valor) || 0) * 100) / 100;
}

// Exportación plana: una fila por artículo con los 3 niveles de la tabla
// (Fecha/Sucursal -> Vendedor -> Producto) como columnas, para poder filtrar
// y hacer tablas dinámicas en Excel. Los importes van como números (exportFormat).
const COLUMNAS_EXPORTACION = [
  { key: 'Fecha', label: 'Fecha', format: (v) => formatearFechaKey(v) },
  { key: 'Sucursal', label: 'Sucursal', format: (v, fila) => claveYNombreSucursal(fila.ClaveSimi) || v },
  { key: 'Vendedor', label: 'Vendedor' },
  { key: 'Producto', label: 'Producto' },
  { key: 'Piezas', label: 'Piezas', exportFormat: (v) => Number(v) || 0 },
  { key: 'VentaNeta', label: 'Venta neta', exportFormat: numeroExportable },
  { key: 'Descuento', label: 'Descuento', exportFormat: numeroExportable },
  { key: 'IVA', label: 'IVA', exportFormat: numeroExportable }
];

/**
 * En el catálogo SAT los segmentos 70 a 95 son servicios (veterinarios,
 * gastos administrativos, etc.). Se usan los 2 primeros dígitos de
 * Id_ProductoSAT; si no viene clave, se considera artículo.
 */
function esServicio(fila) {
  const segmento = Number(String(fila.Id_ProductoSAT ?? '').trim().slice(0, 2));
  return segmento >= 70;
}

function agruparPorFechaYSucursal(filas) {
  const grupos = new Map();
  filas.forEach((f) => {
    const clave = `${f.Fecha}-${f.ClaveSimi}`;
    const actual = grupos.get(clave) || {
      Fecha: f.Fecha,
      Sucursal: f.Sucursal,
      ClaveSimi: f.ClaveSimi,
      Piezas: 0,
      VentaNeta: 0,
      Descuento: 0,
      IVA: 0
    };
    actual.Piezas += Number(f.Piezas) || 0;
    actual.VentaNeta += Number(f.VentaNeta) || 0;
    actual.Descuento += Number(f.Descuento) || 0;
    actual.IVA += Number(f.IVA) || 0;
    grupos.set(clave, actual);
  });
  return [...grupos.values()].sort((a, b) => b.Fecha - a.Fecha);
}

function agruparPorVendedor(filas) {
  const grupos = new Map();
  filas.forEach((f) => {
    const actual = grupos.get(f.Vendedor) || { Vendedor: f.Vendedor, Piezas: 0, VentaNeta: 0, Descuento: 0, IVA: 0 };
    actual.Piezas += Number(f.Piezas) || 0;
    actual.VentaNeta += Number(f.VentaNeta) || 0;
    actual.Descuento += Number(f.Descuento) || 0;
    actual.IVA += Number(f.IVA) || 0;
    grupos.set(f.Vendedor, actual);
  });
  return [...grupos.values()].sort((a, b) => b.VentaNeta - a.VentaNeta);
}

function Productos() {
  const [fechaInicial, setFechaInicial] = useState(primerDiaDelMes);
  const [fechaFinal, setFechaFinal] = useState(hoyComoFechaSimple);
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState('');
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const consultar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const resultado = await ventasService.obtenerProductos({ fechaInicial, fechaFinal });
      setFilas(resultado.data || []);
      setSucursalSeleccionada('');
      setVendedorSeleccionado('');
      auditService.logAccion('ventas', 'productos', 'consultar', { fechaInicial, fechaFinal });
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar el reporte. Intenta de nuevo.');
      setFilas([]);
    } finally {
      setCargando(false);
    }
  }, [fechaInicial, fechaFinal]);

  useEffect(() => {
    auditService.logModulo('ventas', 'productos');
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

  const filasRawFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return filas.filter(
      (f) =>
        (!sucursalSeleccionada || f.ClaveSimi === sucursalSeleccionada) &&
        (!vendedorSeleccionado || f.Vendedor === vendedorSeleccionado) &&
        (!texto ||
          f.Producto?.toLowerCase().includes(texto) ||
          nombrePorClaveSimi(f.ClaveSimi)?.toLowerCase().includes(texto) ||
          f.Vendedor?.toLowerCase().includes(texto))
    );
  }, [filas, sucursalSeleccionada, vendedorSeleccionado, busqueda]);

  const filasNivel1 = useMemo(() => agruparPorFechaYSucursal(filasRawFiltradas), [filasRawFiltradas]);

  const kpis = useMemo(() => {
    const ventaNeta = filasRawFiltradas.reduce((acc, f) => acc + (Number(f.VentaNeta) || 0), 0);
    const piezas = filasRawFiltradas.reduce((acc, f) => acc + (Number(f.Piezas) || 0), 0);
    const productosUnicos = new Set(filasRawFiltradas.map((f) => f.Producto)).size;

    // El "Producto top" solo considera artículos: se excluyen servicios y gastos.
    const porProducto = new Map();
    filasRawFiltradas.filter((f) => !esServicio(f)).forEach((f) => {
      porProducto.set(f.Producto, (porProducto.get(f.Producto) || 0) + (Number(f.VentaNeta) || 0));
    });
    const top = [...porProducto.entries()].sort((a, b) => b[1] - a[1])[0];

    return [
      { label: 'Venta neta', value: formatoMoneda.format(ventaNeta), tone: 'blue', glyph: '$' },
      { label: 'Piezas vendidas', value: formatoEntero.format(piezas), tone: 'green', glyph: '#' },
      { label: 'Productos distintos', value: formatoEntero.format(productosUnicos), tone: 'neutral', glyph: '▤' },
      { label: 'Producto top', value: top ? top[0] : '—', hint: top ? formatoMoneda.format(top[1]) : undefined, tone: 'orange', glyph: '★' }
    ];
  }, [filasRawFiltradas]);

  return (
    <Panel titulo="Productos" acento="orange">
      <FiltroRangoFecha
        fechaInicial={fechaInicial}
        fechaFinal={fechaFinal}
        onCambiarFechaInicial={setFechaInicial}
        onCambiarFechaFinal={setFechaFinal}
        onConsultar={consultar}
        cargando={cargando}
        busqueda={busqueda}
        onCambiarBusqueda={setBusqueda}
        busquedaPlaceholder="Buscar por producto, sucursal o vendedor..."
        exportColumns={filasRawFiltradas.length > 0 ? COLUMNAS_EXPORTACION : undefined}
        exportRows={filasRawFiltradas}
        exportFileName={`productos_${fechaInicial}_${fechaFinal}`}
        exportTitulo="Productos"
      />

      {cargando && <LoadingState label="Cargando reporte..." />}

      {!cargando && error && (
        <EmptyState title="No se pudo cargar el reporte" message={error} tone="error" actionLabel="Reintentar" onAction={consultar} />
      )}

      {!cargando && !error && filas.length === 0 && (
        <EmptyState title="Sin datos" message="No hay ventas de producto registradas en el rango seleccionado." />
      )}

      {!cargando && !error && filas.length > 0 && (
        <>
          <div className="sp-productos__filtros">
            <label className="sp-productos__campo">
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
            <label className="sp-productos__campo">
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

          {filasNivel1.length === 0 ? (
            <EmptyState title="Sin datos" message="No hay resultados con estos filtros." />
          ) : (
            <TablaReporte
              columns={COLUMNAS_NIVEL1}
              rows={filasNivel1}
              maxHeight={480}
              expandible
              filaId={(f) => `${f.Fecha}-${f.ClaveSimi}`}
              renderContenidoExpandido={(f) => {
                const rawDeEseDiaYSucursal = filasRawFiltradas.filter(
                  (raw) => raw.Fecha === f.Fecha && raw.ClaveSimi === f.ClaveSimi
                );
                const filasNivel2 = agruparPorVendedor(rawDeEseDiaYSucursal);
                return (
                  <TablaAnidada
                    columns={COLUMNAS_NIVEL2}
                    rows={filasNivel2}
                    expandible
                    filaId={(v) => v.Vendedor}
                    renderContenidoExpandido={(v) => {
                      const articulos = rawDeEseDiaYSucursal.filter((raw) => raw.Vendedor === v.Vendedor);
                      return <TablaAnidada columns={COLUMNAS_NIVEL3} rows={articulos} />;
                    }}
                  />
                );
              }}
            />
          )}
        </>
      )}
    </Panel>
  );
}

export default Productos;
