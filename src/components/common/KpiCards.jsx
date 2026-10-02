import './KpiCards.css';

/**
 * Fila de indicadores rapidos, mismo estilo visual que el KpiCard de
 * Soltec 2.0: icono cuadrado de color a la izquierda, etiqueta chica
 * arriba y valor grande abajo a la derecha.
 *
 * @param {object} props
 * @param {Array<{label:string, value:string, glyph?:string, hint?:string, tone?:'blue'|'green'|'orange'|'red'|'teal'}>} props.items
 */
function KpiCards({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="sp-kpi-cards">
      {items.map((item, i) => (
        <div key={i} className="sp-kpi-card">
          <span className={`sp-kpi-card__ico sp-kpi-card__ico--${item.tone || 'blue'}`}>
            {item.glyph || item.label.charAt(0).toUpperCase()}
          </span>
          <div className="sp-kpi-card__texto">
            <div className="sp-kpi-card__label">{item.label}</div>
            <div className="sp-kpi-card__valor">{item.value}</div>
            {item.hint && <div className="sp-kpi-card__hint">{item.hint}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

export default KpiCards;
