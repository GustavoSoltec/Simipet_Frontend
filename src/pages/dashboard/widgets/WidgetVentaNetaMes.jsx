import { useMemo } from 'react';
import { useDashboardData } from '../DashboardDataContext';
import { agruparPorMes } from '../dashboardUtils';
import LoadingState from '../../../components/common/LoadingState';
import EmptyState from '../../../components/common/EmptyState';
import './WidgetListaMeses.css';

const formatoMoneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

function WidgetVentaNetaMes() {
  const { meses, mesSeleccionado, setMesSeleccionado, acumulado6Meses } = useDashboardData();
  const grupos = useMemo(() => agruparPorMes(acumulado6Meses.filas), [acumulado6Meses.filas]);

  return (
    <div className="sp-widget-lista-meses">
      <h3 className="sp-widget-panel__titulo">Venta neta por mes</h3>

      {acumulado6Meses.cargando && <LoadingState label="Cargando..." />}
      {!acumulado6Meses.cargando && acumulado6Meses.error && (
        <EmptyState title="No se pudo cargar" message={acumulado6Meses.error} tone="error" />
      )}
      {!acumulado6Meses.cargando && !acumulado6Meses.error && (
        <ul className="sp-widget-lista-meses__lista">
          {meses.map((m) => {
            const datos = grupos.get(m.clave) || { VentaNeta: 0 };
            const activo = m.clave === mesSeleccionado;
            return (
              <li key={m.clave}>
                <button
                  type="button"
                  className={`sp-widget-lista-meses__item ${activo ? 'sp-widget-lista-meses__item--activo' : ''}`}
                  onClick={() => setMesSeleccionado(m.clave)}
                  title="Ver este mes en los demás widgets"
                >
                  <span className="sp-widget-lista-meses__etiqueta">{m.etiqueta}</span>
                  <span className="sp-widget-lista-meses__valor">{formatoMoneda.format(datos.VentaNeta)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default WidgetVentaNetaMes;
