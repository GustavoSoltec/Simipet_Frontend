import { useMemo } from 'react';
import { useDashboardData } from '../DashboardDataContext';
import RankingHorizontal from './RankingHorizontal';

const formatoMoneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
const formatoEntero = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

const COLUMNAS_TABLA = [
  { key: 'CodigoProducto', label: 'Código', align: 'left' },
  { key: 'Producto', label: 'Servicio', align: 'left' },
  { key: 'Piezas', label: 'Piezas', format: (v) => formatoEntero.format(v || 0) },
  { key: 'VentaNeta', label: 'Venta neta', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'Descuento', label: 'Descuento', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'IVA', label: 'IVA', format: (v) => formatoMoneda.format(v || 0) }
];

/**
 * Complemento de WidgetArticulosMasVendidos: aqui solo se quedan los
 * SERVICIOS -- Id_ProductoSAT que empieza con "70". Mismo patron de
 * agrupado por producto, sumando piezas e importes.
 */
function agruparPorServicio(filas) {
  const grupos = new Map();
  filas
    .filter((f) => String(f.Id_ProductoSAT ?? '').startsWith('70'))
    .forEach((f) => {
      const actual = grupos.get(f.Producto) || {
        CodigoProducto: f.CodigoProducto,
        Producto: f.Producto,
        Piezas: 0,
        VentaNeta: 0,
        Descuento: 0,
        IVA: 0
      };
      actual.Piezas += Number(f.Piezas) || 0;
      actual.VentaNeta += Number(f.VentaNeta) || 0;
      actual.Descuento += Number(f.Descuento) || 0;
      actual.IVA += Number(f.IVA) || 0;
      grupos.set(f.Producto, actual);
    });
  return [...grupos.values()];
}

function WidgetServiciosMasVendidos() {
  const { meses, mesSeleccionado, productosMes } = useDashboardData();
  const etiquetaMes = meses.find((m) => m.clave === mesSeleccionado)?.etiqueta || '';

  const filas = useMemo(
    () => agruparPorServicio(productosMes.filas).sort((a, b) => b.VentaNeta - a.VentaNeta),
    [productosMes.filas]
  );

  return (
    <RankingHorizontal
      titulo={`Servicios más vendidos — ${etiquetaMes}`}
      tono="teal"
      filas={filas}
      campoEtiqueta="Producto"
      campoValor="VentaNeta"
      columnasTabla={COLUMNAS_TABLA}
      formatValue={(v) => formatoMoneda.format(v)}
      emptyMessage={productosMes.cargando ? 'Cargando...' : productosMes.error || 'Sin servicios ese mes.'}
    />
  );
}

export default WidgetServiciosMasVendidos;
