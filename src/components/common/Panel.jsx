import './Panel.css';

/**
 * Panel generico reutilizable: header con titulo + borde superior de
 * color (distinto por vista, igual criterio que Soltec 2.0 -- cada
 * reporte tiene su propio acento para identificarse de un vistazo).
 *
 * @param {object} props
 * @param {string} props.titulo
 * @param {'blue'|'orange'|'green'|'teal'|'red'} [props.acento]
 */
function Panel({ titulo, acento = 'blue', children }) {
  return (
    <div className="sp-panel">
      <div className={`sp-panel__header sp-panel__header--${acento}`}>
        <span className="sp-panel__titulo">{titulo}</span>
      </div>
      <div className="sp-panel__body">{children}</div>
    </div>
  );
}

export default Panel;
