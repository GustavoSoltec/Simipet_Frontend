import LoadingState from '../../../components/common/LoadingState';
import EmptyState from '../../../components/common/EmptyState';
import './WidgetKpiCard.css';

/**
 * Tarjeta de KPI individual del Dashboard, mismo criterio visual que
 * Soltec 2.0 (.sc-dash__card): borde superior de color segun el tono,
 * y un valor grande abajo. Cada widget "chico" del catalogo usa esta
 * misma tarjeta, solo cambia titulo/valor/tono/dato.
 */
function WidgetKpiCard({ titulo, valor, tono = 'blue', cargando, error, hint }) {
  return (
    <div className="sp-widget-kpi">
      <div className={`sp-widget-kpi__titulo sp-widget-kpi__titulo--${tono}`}>{titulo}</div>
      <div className="sp-widget-kpi__body">
        {cargando && <LoadingState label="Cargando..." />}
        {!cargando && error && <EmptyState title="No se pudo cargar" message={error} tone="error" />}
        {!cargando && !error && (
          <>
            <span className="sp-widget-kpi__valor">{valor}</span>
            {hint && <span className="sp-widget-kpi__hint">{hint}</span>}
          </>
        )}
      </div>
    </div>
  );
}

export default WidgetKpiCard;
