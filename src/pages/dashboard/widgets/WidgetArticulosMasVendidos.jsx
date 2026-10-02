import { useMemo } from 'react';
import { useDashboardData } from '../DashboardDataContext';
import RankingHorizontal from './RankingHorizontal';

const formatoMoneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
const formatoEntero = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

const COLUMNAS_TABLA = [
  { key: 'CodigoProducto', label: 'Código', align: 'left' },
  { key: 'Producto', label: 'Producto', align: 'left' },
  { key: 'Piezas', label: 'Piezas', format: (v) => formatoEntero.format(v || 0) },
  { key: 'VentaNeta', label: 'Venta neta', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'Descuento', label: 'Descuento', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'IVA', label: 'IVA', format: (v) => formatoMoneda.format(v || 0) }
];

/**
 * Agrupa las filas crudas de Productos (Fecha x Sucursal x Vendedor x
 * Producto) por producto, sumando piezas e importes. Muestra TODO por
 * default (articulos y servicios juntos) -- el checkbox "Excluir
 * Servicios" del widget filtra los que Id_ProductoSAT empieza con "70".
 * Se conserva Id_ProductoSAT en cada grupo (toma el de la primera fila,
 * es el mismo para todo el grupo) para que ese checkbox pueda filtrar.
 */
function agruparPorProducto(filas) {
  const grupos = new Map();
  filas.forEach((f) => {
    const actual = grupos.get(f.Producto) || {
      CodigoProducto: f.CodigoProducto,
      Producto: f.Producto,
      Id_ProductoSAT: f.Id_ProductoSAT,
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

function WidgetArticulosMasVendidos() {
  const { meses, mesSeleccionado, productosMes } = useDashboardData();
  const etiquetaMes = meses.find((m) => m.clave === mesSeleccionado)?.etiqueta || '';

  const filas = useMemo(
    () => agruparPorProducto(productosMes.filas).sort((a, b) => b.VentaNeta - a.VentaNeta),
    [productosMes.filas]
  );

  return (
    <RankingHorizontal
      titulo={`Artículos más vendidos — ${etiquetaMes}`}
      tono="blue"
      filas={filas}
      campoEtiqueta="Producto"
      campoValor="VentaNeta"
      columnasTabla={COLUMNAS_TABLA}
      formatValue={(v) => formatoMoneda.format(v)}
      emptyMessage={productosMes.cargando ? 'Cargando...' : productosMes.error || 'Sin ventas ese mes.'}
      opcionExtra={{
        etiqueta: 'Excluir Servicios',
        filtro: (f) => !String(f.Id_ProductoSAT ?? '').startsWith('70')
      }}
    />
  );
}

export default WidgetArticulosMasVendidos;
