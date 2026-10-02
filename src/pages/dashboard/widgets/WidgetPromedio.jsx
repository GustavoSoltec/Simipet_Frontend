import { useDashboardData } from '../DashboardDataContext';
import WidgetKpiCard from './WidgetKpiCard';

const formatoMoneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });

function WidgetPromedio() {
  const { acumulado } = useDashboardData();
  const ventaNeta = acumulado.filas.reduce((acc, f) => acc + (Number(f.VentaNeta) || 0), 0);
  const tickets = acumulado.filas.reduce((acc, f) => acc + (Number(f.TcksNetos) || 0), 0);
  const promedio = tickets > 0 ? ventaNeta / tickets : 0;

  return (
    <WidgetKpiCard
      titulo="Promedio x nota"
      tono="orange"
      cargando={acumulado.cargando}
      error={acumulado.error}
      valor={formatoMoneda.format(promedio)}
    />
  );
}

export default WidgetPromedio;
