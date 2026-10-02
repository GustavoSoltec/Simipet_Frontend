import { useDashboardData } from '../DashboardDataContext';
import WidgetKpiCard from './WidgetKpiCard';

const formatoMoneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });

function WidgetInventario() {
  const { valuacion } = useDashboardData();
  const valorInventario = valuacion.filas.reduce((acc, f) => acc + (Number(f.Ventas) || 0), 0);

  return (
    <WidgetKpiCard
      titulo="Valor de inventario hoy"
      tono="teal"
      cargando={valuacion.cargando}
      error={valuacion.error}
      valor={formatoMoneda.format(valorInventario)}
    />
  );
}

export default WidgetInventario;
