import { useDashboardData } from '../DashboardDataContext';
import WidgetKpiCard from './WidgetKpiCard';

const formatoEntero = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

function WidgetTickets() {
  const { acumulado } = useDashboardData();
  const tickets = acumulado.filas.reduce((acc, f) => acc + (Number(f.TcksNetos) || 0), 0);

  return (
    <WidgetKpiCard
      titulo="Tickets del mes"
      tono="green"
      cargando={acumulado.cargando}
      error={acumulado.error}
      valor={formatoEntero.format(tickets)}
    />
  );
}

export default WidgetTickets;
