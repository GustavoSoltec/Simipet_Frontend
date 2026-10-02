import logoIcon from '../../assets/logo-icon.png';
import BotonExportar from './BotonExportar';
import './FiltroFechaUnica.css';

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
      <circle cx="9" cy="9" r="6.2" stroke="currentColor" strokeWidth="1.8" />
      <line x1="13.6" y1="13.6" x2="18" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/**
 * A diferencia de FiltroRangoFecha (usado en los 7 reportes de Ventas),
 * los 2 reportes de Inventarios reciben una sola fecha de corte, no un
 * rango. Mismo boton de lupa (aplicar), mismo textbox de busqueda
 * inline (opcional, via busqueda/onCambiarBusqueda), y mismo boton de
 * Exportar empujado al extremo derecho de la fila.
 */
function FiltroFechaUnica({
  fecha,
  onCambiarFecha,
  onConsultar,
  cargando,
  busqueda,
  onCambiarBusqueda,
  busquedaPlaceholder = 'Buscar...',
  exportColumns,
  exportRows,
  exportFileName,
  exportTitulo
}) {
  return (
    <form
      className="sp-filtro-fecha-unica"
      onSubmit={(e) => {
        e.preventDefault();
        onConsultar();
      }}
    >
      <label className="sp-filtro-fecha-unica__campo">
        <span>Fecha de corte</span>
        <input type="date" value={fecha} onChange={(e) => onCambiarFecha(e.target.value)} required />
      </label>
      <button
        type="submit"
        className="sp-filtro-fecha-unica__lupa"
        disabled={cargando}
        title="Aplicar fecha de corte"
      >
        {cargando ? <img src={logoIcon} alt="" className="sp-filtro-fecha-unica__spinner" /> : <SearchIcon />}
      </button>

      {onCambiarBusqueda && (
        <input
          type="text"
          className="sp-filtro-fecha-unica__busqueda"
          value={busqueda}
          onChange={(e) => onCambiarBusqueda(e.target.value)}
          placeholder={busquedaPlaceholder}
        />
      )}

      {exportColumns && (
        <div className="sp-filtro-fecha-unica__exportar">
          <BotonExportar columns={exportColumns} rows={exportRows} fileName={exportFileName} titulo={exportTitulo} />
        </div>
      )}
    </form>
  );
}

export default FiltroFechaUnica;
