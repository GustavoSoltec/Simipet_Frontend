import './CampoBusqueda.css';

/**
 * Filtro de texto simple, en el propio navegador, para tablas que
 * pueden traer muchas filas. No reemplaza un buscador server-side --
 * una vez que el reporte ya se descargo, esto solo ayuda a encontrar
 * algo dentro de lo que ya llego.
 */
function CampoBusqueda({ valor, onCambiar, placeholder = 'Buscar...' }) {
  return (
    <div className="sp-campo-busqueda">
      <input
        type="text"
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        placeholder={placeholder}
        className="sp-campo-busqueda__input"
      />
      {valor && (
        <button type="button" className="sp-campo-busqueda__clear" onClick={() => onCambiar('')} aria-label="Limpiar búsqueda">
          ×
        </button>
      )}
    </div>
  );
}

export default CampoBusqueda;
