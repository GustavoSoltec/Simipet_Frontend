import { useDashboardData } from '../DashboardDataContext';
import WidgetKpiCard from './WidgetKpiCard';

const formatoMoneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });

function WidgetVentaNeta() {
  const { acumulado } = useDashboardData();
  const ventaNeta = acumulado.filas.reduce((acc, f) => acc + (Number(f.VentaNeta) || 0), 0);

  return (
    <WidgetKpiCard
      titulo="Venta neta del mes"
      tono="blue"
      cargando={acumulado.cargando}
      error={acumulado.error}
      valor={formatoMoneda.format(ventaNeta)}
    />
  );
}

export default WidgetVentaNeta;
