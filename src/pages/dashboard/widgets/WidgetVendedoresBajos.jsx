import { useMemo } from 'react';
import { useDashboardData } from '../DashboardDataContext';
import RankingHorizontal from './RankingHorizontal';

const formatoMoneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
const formatoEntero = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

const COLUMNAS_TABLA = [
  { key: 'Clave', label: 'Clave', align: 'left' },
  { key: 'Vendedor', label: 'Vendedor', align: 'left' },
  { key: 'VentaNeta', label: 'Venta neta', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'TcksNetos', label: 'Tickets', format: (v) => formatoEntero.format(v || 0) },
  { key: 'PromedioXNota', label: 'Promedio x nota', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'TotalDescuentos', label: 'Descuento', format: (v) => formatoMoneda.format(v || 0) }
];

function WidgetVendedoresBajos() {
  const { meses, mesSeleccionado, porVendedorMes } = useDashboardData();
  const etiquetaMes = meses.find((m) => m.clave === mesSeleccionado)?.etiqueta || '';

  const filas = useMemo(
    () => [...porVendedorMes.filas].sort((a, b) => (a.VentaNeta || 0) - (b.VentaNeta || 0)),
    [porVendedorMes.filas]
  );

  return (
    <RankingHorizontal
      titulo={`Vendedores con menor venta — ${etiquetaMes}`}
      tono="red"
      filas={filas}
      campoEtiqueta="Vendedor"
      campoValor="VentaNeta"
      columnasTabla={COLUMNAS_TABLA}
      formatValue={(v) => formatoMoneda.format(v)}
      emptyMessage={porVendedorMes.cargando ? 'Cargando...' : porVendedorMes.error || 'Sin ventas ese mes.'}
      permitirExcluirCeros
    />
  );
}

export default WidgetVendedoresBajos;
