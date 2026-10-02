import { useMemo } from 'react';
import { useDashboardData } from '../DashboardDataContext';
import { agruparPorMes } from '../dashboardUtils';
import LoadingState from '../../../components/common/LoadingState';
import EmptyState from '../../../components/common/EmptyState';
import './WidgetResumenMensual.css';

const formatoMoneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const formatoEntero = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

/**
 * Junta en un solo vistazo lo que "Venta neta por mes" y "Tickets por
 * mes" muestran por separado -- una fila de 6 cuadros (uno por mes),
 * cada uno con Venta neta, Tickets, y Promedio por nota. Igual que esos
 * dos widgets, da clic a un cuadro para seleccionar ese mes en el resto
 * del Dashboard.
 */
function WidgetResumenMensual() {
  const { meses, mesSeleccionado, setMesSeleccionado, acumulado6Meses } = useDashboardData();
  const grupos = useMemo(() => agruparPorMes(acumulado6Meses.filas), [acumulado6Meses.filas]);

  return (
    <div className="sp-widget-panel">
      <h3 className="sp-widget-panel__titulo">Resumen mensual</h3>

      {acumulado6Meses.cargando && <LoadingState label="Cargando..." />}
      {!acumulado6Meses.cargando && acumulado6Meses.error && (
        <EmptyState title="No se pudo cargar" message={acumulado6Meses.error} tone="error" />
      )}
      {!acumulado6Meses.cargando && !acumulado6Meses.error && (
        <div className="sp-resumen-mensual__fila">
          {meses.map((m) => {
            const datos = grupos.get(m.clave) || { VentaNeta: 0, TcksNetos: 0 };
            const promedio = datos.TcksNetos > 0 ? datos.VentaNeta / datos.TcksNetos : 0;
            const activo = m.clave === mesSeleccionado;
            return (
              <button
                key={m.clave}
                type="button"
                className={`sp-resumen-mensual__cuadro ${activo ? 'sp-resumen-mensual__cuadro--activo' : ''}`}
                onClick={() => setMesSeleccionado(m.clave)}
                title="Ver este mes en los demás widgets"
              >
                <span className="sp-resumen-mensual__mes">{m.etiqueta}</span>
                <span className="sp-resumen-mensual__indicador">
                  <span className="sp-resumen-mensual__label">Venta neta</span>
                  <span className="sp-resumen-mensual__valor">{formatoMoneda.format(datos.VentaNeta)}</span>
                </span>
                <span className="sp-resumen-mensual__indicador">
                  <span className="sp-resumen-mensual__label">Tickets</span>
                  <span className="sp-resumen-mensual__valor">{formatoEntero.format(datos.TcksNetos)}</span>
                </span>
                <span className="sp-resumen-mensual__indicador">
                  <span className="sp-resumen-mensual__label">Prom. x nota</span>
                  <span className="sp-resumen-mensual__valor">{formatoMoneda.format(promedio)}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default WidgetResumenMensual;
