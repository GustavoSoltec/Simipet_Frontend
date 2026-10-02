import { useMemo } from 'react';
import { useDashboardData } from '../DashboardDataContext';
import { claveYNombreSucursal } from '../../../services/authService';
import TablaAnidada from '../../../components/common/TablaAnidada';
import LoadingState from '../../../components/common/LoadingState';
import EmptyState from '../../../components/common/EmptyState';
import './RankingHorizontal.css';

const formatoMoneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
const formatoEntero = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

const COLUMNAS = [
  { key: 'Sucursal', label: 'Sucursal', align: 'left' },
  { key: 'Existencia', label: 'Existencia', format: (v) => formatoEntero.format(v || 0) },
  { key: 'SKUs', label: "SKU's", format: (v) => formatoEntero.format(v || 0) },
  { key: 'ValorInventario', label: 'Valor inventario', format: (v) => formatoMoneda.format(v || 0) }
];

/** Las columnas CHAR de SQL Server a veces vienen con espacios de relleno -- se recorta antes de usar la clave como llave de comparacion, para que "VF0012" y "VF0012 " (con espacio) cuenten como la misma sucursal. */
function normalizarClave(valor) {
  return String(valor ?? '').trim();
}

/**
 * Este widget no depende del mes seleccionado -- es una fotografia del
 * inventario de AYER (para asegurar que ya haya informacion cargada),
 * no de ventas. Cruza Valuacion (existencias/valor por sucursal) con
 * Detalle (para contar SKU's distintos), igual criterio que la vista
 * Valuacion de Inventario.
 */
function WidgetInventarioTabla() {
  const { valuacionHoy, detalleHoy } = useDashboardData();

  const filas = useMemo(() => {
    const skusPorSucursal = new Map();
    detalleHoy.filas.forEach((f) => {
      const clave = normalizarClave(f.Sucursal);
      skusPorSucursal.set(clave, (skusPorSucursal.get(clave) || 0) + 1);
    });

    return valuacionHoy.filas
      .map((f) => ({
        Sucursal: claveYNombreSucursal(f.Sucursal),
        Existencia: Number(f.Existencias) || 0,
        SKUs: skusPorSucursal.get(normalizarClave(f.Sucursal)) || 0,
        ValorInventario: Number(f.Ventas) || 0
      }))
      .sort((a, b) => b.ValorInventario - a.ValorInventario);
  }, [valuacionHoy.filas, detalleHoy.filas]);

  const cargando = valuacionHoy.cargando || detalleHoy.cargando;
  const error = valuacionHoy.error || detalleHoy.error;

  return (
    <div className="sp-ranking">
      <div className="sp-ranking__header sp-ranking__header--orange">Inventario por sucursal (ayer)</div>

      <div className="sp-ranking__body">
        {cargando && <LoadingState label="Cargando..." />}
        {!cargando && error && <EmptyState title="No se pudo cargar" message={error} tone="error" />}
        {!cargando && !error && filas.length === 0 && (
          <EmptyState title="Sin datos" message="No hay inventario registrado para ayer." />
        )}
        {!cargando && !error && filas.length > 0 && <TablaAnidada columns={COLUMNAS} rows={filas} />}
      </div>
    </div>
  );
}

export default WidgetInventarioTabla;
