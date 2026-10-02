import './ToggleVista.css';

/**
 * Igual criterio que los widgets de venta de Soltec 2.0: cada widget
 * que trae una grafica tambien puede verse como tabla, y viceversa.
 */
function ToggleVista({ vista, onCambiar }) {
  return (
    <div className="sp-toggle-vista">
      <button
        type="button"
        className={`sp-toggle-vista__btn ${vista === 'grafica' ? 'sp-toggle-vista__btn--activo' : ''}`}
        onClick={() => onCambiar('grafica')}
      >
        Gráfica
      </button>
      <button
        type="button"
        className={`sp-toggle-vista__btn ${vista === 'tabla' ? 'sp-toggle-vista__btn--activo' : ''}`}
        onClick={() => onCambiar('tabla')}
      >
        Tabla
      </button>
    </div>
  );
}

export default ToggleVista;
