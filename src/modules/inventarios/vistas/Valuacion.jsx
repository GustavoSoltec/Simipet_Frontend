import { useCallback, useEffect, useMemo, useState } from 'react';
import auditService from '../../../services/auditService';
import inventariosService from '../services/inventariosService';
import { claveYNombreSucursal } from '../../../services/authService';
import Panel from '../../../components/common/Panel';
import FiltroFechaUnica from '../../../components/common/FiltroFechaUnica';
import KpiCards from '../../../components/common/KpiCards';
import TablaReporte from '../../../components/common/TablaReporte';
import LoadingState from '../../../components/common/LoadingState';
import EmptyState from '../../../components/common/EmptyState';
import './Valuacion.css';

const formatoMoneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
const formatoEntero = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });
const formatoPorcentaje = new Intl.NumberFormat('es-MX', { style: 'percent', maximumFractionDigits: 1 });

function ayerComoFechaSimple() {
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  return ayer.toISOString().slice(0, 10);
}

// SKUs y % Participacion no vienen del SP de Valuacion -- se cruzan
// aqui mismo con el reporte de Detalle (misma fecha), para responder
// "que tan concentrado esta el inventario" y "cuantos productos
// distintos hay por sucursal" sin pedir nada nuevo al backend.
const COLUMNAS = [
  { key: 'Sucursal', label: 'Sucursal', align: 'left' },
  { key: 'SKUs', label: "SKU's", format: (v) => formatoEntero.format(v || 0) },
  { key: 'Existencias', label: 'Existencias', format: (v) => formatoEntero.format(v || 0) },
  { key: 'Ventas', label: 'Valor de venta', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'ValorPromedioSku', label: 'Valor promedio x SKU', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'Participacion', label: '% del total', format: (v) => formatoPorcentaje.format(v || 0) }
];

function Valuacion() {
  const [fecha, setFecha] = useState(ayerComoFechaSimple);
  const [filas, setFilas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const consultar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [resultadoValuacion, resultadoDetalle] = await Promise.all([
        inventariosService.obtenerValuacion({ fecha }),
        inventariosService.obtenerDetalle({ fecha })
      ]);

      const skusPorSucursal = new Map();
      (resultadoDetalle.data || []).forEach((f) => {
        skusPorSucursal.set(f.Sucursal, (skusPorSucursal.get(f.Sucursal) || 0) + 1);
      });

      const filasCrudas = resultadoValuacion.data || [];
      const valorTotalGeneral = filasCrudas.reduce((acc, f) => acc + (Number(f.Ventas) || 0), 0);

      const filasEnriquecidas = filasCrudas.map((f) => {
        const ventas = Number(f.Ventas) || 0;
        const skus = skusPorSucursal.get(f.Sucursal) || 0;
        return {
          ...f,
          ClaveSimi: f.Sucursal,
          Sucursal: claveYNombreSucursal(f.Sucursal),
          SKUs: skus,
          ValorPromedioSku: skus > 0 ? ventas / skus : 0,
          Participacion: valorTotalGeneral > 0 ? ventas / valorTotalGeneral : 0
        };
      });

      setFilas(filasEnriquecidas);
      auditService.logAccion('inventarios', 'valuacion', 'consultar', { fecha });
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar el reporte. Intenta de nuevo.');
      setFilas([]);
    } finally {
      setCargando(false);
    }
  }, [fecha]);

  useEffect(() => {
    auditService.logModulo('inventarios', 'valuacion');
    consultar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return filas;
    return filas.filter((f) => f.Sucursal?.toLowerCase().includes(texto));
  }, [filas, busqueda]);

  const kpis = useMemo(() => {
    const existencias = filasFiltradas.reduce((acc, f) => acc + (Number(f.Existencias) || 0), 0);
    const valor = filasFiltradas.reduce((acc, f) => acc + (Number(f.Ventas) || 0), 0);
    const skusTotal = filasFiltradas.reduce((acc, f) => acc + (Number(f.SKUs) || 0), 0);
    const top = [...filasFiltradas].sort((a, b) => (b.Ventas || 0) - (a.Ventas || 0))[0];

    return [
      { label: 'Existencias totales', value: formatoEntero.format(existencias), tone: 'green', glyph: '#' },
      { label: 'Valor total', value: formatoMoneda.format(valor), tone: 'blue', glyph: '$' },
      { label: "SKU's totales", value: formatoEntero.format(skusTotal), tone: 'teal', glyph: '▤' },
      { label: 'Sucursales', value: formatoEntero.format(filasFiltradas.length), tone: 'neutral', glyph: '▦' },
      { label: 'Sucursal top', value: top ? top.Sucursal : '—', hint: top ? formatoMoneda.format(top.Ventas || 0) : undefined, tone: 'orange', glyph: '★' }
    ];
  }, [filasFiltradas]);

  return (
    <Panel titulo="Valuación de Inventario" acento="green">
      <FiltroFechaUnica
        fecha={fecha}
        onCambiarFecha={setFecha}
        onConsultar={consultar}
        cargando={cargando}
        busqueda={busqueda}
        onCambiarBusqueda={setBusqueda}
        busquedaPlaceholder="Buscar por sucursal..."
        exportColumns={filasFiltradas.length > 0 ? COLUMNAS : undefined}
        exportRows={filasFiltradas}
        exportFileName={`inventario-valuacion_${fecha}`}
        exportTitulo="Valuación de Inventario"
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
          <KpiCards items={kpis} />
          <TablaReporte columns={COLUMNAS} rows={filasFiltradas} />
        </>
      )}
    </Panel>
  );
}

export default Valuacion;
