import { useCallback, useEffect, useMemo, useState } from 'react';
import auditService from '../../../services/auditService';
import inventariosService from '../services/inventariosService';
import { claveYNombreSucursal } from '../../../services/authService';
import Panel from '../../../components/common/Panel';
import FiltroFechaUnica from '../../../components/common/FiltroFechaUnica';
import KpiCards from '../../../components/common/KpiCards';
import TablaReporte from '../../../components/common/TablaReporte';
import TablaAnidada from '../../../components/common/TablaAnidada';
import LoadingState from '../../../components/common/LoadingState';
import EmptyState from '../../../components/common/EmptyState';
import './Detalle.css';

const formatoMoneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
const formatoEntero = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

function ayerComoFechaSimple() {
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  return ayer.toISOString().slice(0, 10);
}

const COLUMNAS = [
  { key: 'Sucursal', label: 'Sucursal', align: 'left' },
  { key: 'SKUs', label: "SKU's", format: (v) => formatoEntero.format(v || 0) },
  { key: 'Existencia', label: 'Existencia', format: (v) => formatoEntero.format(v || 0) },
  { key: 'ValorInventario', label: 'Valor en inventario', format: (v) => formatoMoneda.format(v || 0) }
];

const COLUMNAS_ARTICULOS = [
  { key: 'Codigo', label: 'Código', align: 'left' },
  { key: 'Producto', label: 'Producto', align: 'left' },
  { key: 'Existencia', label: 'Existencia', format: (v) => formatoEntero.format(v || 0) },
  { key: 'PrecioVenta', label: 'Precio venta', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'PrecioCompra', label: 'Precio compra', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'ValorInventario', label: 'Valor en inventario', format: (v) => formatoMoneda.format(v || 0) }
];

function agruparPorSucursal(filas) {
  const grupos = new Map();
  filas.forEach((f) => {
    const actual = grupos.get(f.ClaveSimi) || {
      Sucursal: f.Sucursal,
      ClaveSimi: f.ClaveSimi,
      SKUs: 0,
      Existencia: 0,
      ValorInventario: 0
    };
    actual.SKUs += 1;
    actual.Existencia += Number(f.Existencia) || 0;
    actual.ValorInventario += Number(f.ValorInventario) || 0;
    grupos.set(f.ClaveSimi, actual);
  });
  return [...grupos.values()].sort((a, b) => a.Sucursal.localeCompare(b.Sucursal));
}

function Detalle() {
  const [fecha, setFecha] = useState(ayerComoFechaSimple);
  const [filas, setFilas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const consultar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const resultado = await inventariosService.obtenerDetalle({ fecha });
      // El SP regresa el campo "Sucursal" con el claveSimi (codigo), no
      // el nombre -- se traduce aqui con el catalogo que trajo el
      // login (ver services/authService.js).
      const filasConNombre = (resultado.data || []).map((f) => ({
        ...f,
        ClaveSimi: f.Sucursal,
        Sucursal: claveYNombreSucursal(f.Sucursal),
        ValorInventario: (Number(f.Existencia) || 0) * (Number(f.PrecioVenta) || 0)
      }));
      setFilas(filasConNombre);
      setSucursalSeleccionada('');
      auditService.logAccion('inventarios', 'detalle', 'consultar', { fecha });
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar el reporte. Intenta de nuevo.');
      setFilas([]);
    } finally {
      setCargando(false);
    }
  }, [fecha]);

  useEffect(() => {
    auditService.logModulo('inventarios', 'detalle');
    consultar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const opcionesSucursales = useMemo(() => {
    const mapa = new Map();
    filas.forEach((f) => {
      if (!mapa.has(f.ClaveSimi)) mapa.set(f.ClaveSimi, f.Sucursal);
    });
    return [...mapa.entries()]
      .map(([claveSimi, nombre]) => ({ claveSimi, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [filas]);

  const filasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return filas.filter(
      (f) =>
        (!sucursalSeleccionada || f.ClaveSimi === sucursalSeleccionada) &&
        (!texto ||
          f.Producto?.toLowerCase().includes(texto) ||
          f.Codigo?.toLowerCase().includes(texto) ||
          f.Sucursal?.toLowerCase().includes(texto))
    );
  }, [filas, sucursalSeleccionada, busqueda]);

  const filasAgrupadas = useMemo(() => agruparPorSucursal(filasFiltradas), [filasFiltradas]);

  const kpis = useMemo(() => {
    const existenciaTotal = filasFiltradas.reduce((acc, f) => acc + (Number(f.Existencia) || 0), 0);
    const valorTotal = filasFiltradas.reduce((acc, f) => acc + (Number(f.ValorInventario) || 0), 0);

    return [
      { label: 'Productos', value: formatoEntero.format(filasFiltradas.length), tone: 'neutral', glyph: '▤' },
      { label: 'Existencia total', value: formatoEntero.format(existenciaTotal), tone: 'green', glyph: '#' },
      { label: 'Valor en inventario', value: formatoMoneda.format(valorTotal), tone: 'blue', glyph: '$' },
      { label: 'Sucursales', value: formatoEntero.format(filasAgrupadas.length), tone: 'orange', glyph: '▦' }
    ];
  }, [filasFiltradas, filasAgrupadas]);

  return (
    <Panel titulo="Detalle de Inventario" acento="teal">
      <FiltroFechaUnica
        fecha={fecha}
        onCambiarFecha={setFecha}
        onConsultar={consultar}
        cargando={cargando}
        busqueda={busqueda}
        onCambiarBusqueda={setBusqueda}
        busquedaPlaceholder="Buscar por producto, código o sucursal..."
        exportColumns={filasFiltradas.length > 0 ? COLUMNAS_ARTICULOS : undefined}
        exportRows={filasFiltradas}
        exportFileName={`inventario-detalle_${fecha}`}
        exportTitulo="Detalle de Inventario"
      />

      {cargando && <LoadingState label="Cargando reporte..." />}

      {!cargando && error && (
        <EmptyState title="No se pudo cargar el reporte" message={error} tone="error" actionLabel="Reintentar" onAction={consultar} />
      )}

      {!cargando && !error && filas.length === 0 && (
        <EmptyState title="Sin datos" message="No hay inventario registrado para la fecha seleccionada." />
      )}

      {!cargando && !error && filas.length > 0 && (
        <>
          <div className="sp-inv-detalle__filtros">
            <label className="sp-inv-detalle__campo">
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
              filaId={(f) => f.ClaveSimi}
              renderContenidoExpandido={(f) => {
                const articulos = filasFiltradas.filter((raw) => raw.ClaveSimi === f.ClaveSimi);
                return <TablaAnidada columns={COLUMNAS_ARTICULOS} rows={articulos} />;
              }}
            />
          )}
        </>
      )}
    </Panel>
  );
}

export default Detalle;
