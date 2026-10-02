import logoIcon from '../../assets/logo-icon.png';
import BotonExportar from './BotonExportar';
import './FiltroRangoFecha.css';

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
      <circle cx="9" cy="9" r="6.2" stroke="currentColor" strokeWidth="1.8" />
      <line x1="13.6" y1="13.6" x2="18" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Filtro compartido por los reportes de Ventas que piden un rango
 * [fechaInicial, fechaFinal]. El boton de aplicar es una lupa (icono
 * solo), igual criterio que Soltec 2.0: mientras carga, la lupa se
 * reemplaza por el logo girando.
 *
 * En la misma fila (opcional, segun lo que necesite cada vista):
 *   - Un textbox de busqueda libre (busqueda/onCambiarBusqueda) que
 *     filtra lo que ya esta cargado, sin volver a consultar el backend.
 *   - Un checkbox "Ocultar ventas en cero" (ocultarCeros/onCambiarOcultarCeros).
 *   - El boton de Exportar (exportColumns/exportRows/exportFileName/
 *     exportTitulo), empujado al extremo derecho -- misma linea que los
 *     combos de fecha, igual criterio visual que Soltec 2.0.
 */
function FiltroRangoFecha({
  fechaInicial,
  fechaFinal,
  onCambiarFechaInicial,
  onCambiarFechaFinal,
  onConsultar,
  cargando,
  busqueda,
  onCambiarBusqueda,
  busquedaPlaceholder = 'Buscar...',
  ocultarCeros,
  onCambiarOcultarCeros,
  exportColumns,
  exportRows,
  exportFileName,
  exportTitulo
}) {
  return (
    <form
      className="sp-filtro-rango-fecha"
      onSubmit={(e) => {
        e.preventDefault();
        onConsultar();
      }}
    >
      <label className="sp-filtro-rango-fecha__campo">
        <span>Desde</span>
        <input
          type="date"
          value={fechaInicial}
          onChange={(e) => onCambiarFechaInicial(e.target.value)}
          required
        />
      </label>
      <label className="sp-filtro-rango-fecha__campo">
        <span>Hasta</span>
        <input
          type="date"
          value={fechaFinal}
          onChange={(e) => onCambiarFechaFinal(e.target.value)}
          required
        />
      </label>
      <button
        type="submit"
        className="sp-filtro-rango-fecha__lupa"
        disabled={cargando}
        title="Aplicar rango de fechas"
      >
        {cargando ? <img src={logoIcon} alt="" className="sp-filtro-rango-fecha__spinner" /> : <SearchIcon />}
      </button>

      {onCambiarBusqueda && (
        <input
          type="text"
          className="sp-filtro-rango-fecha__busqueda"
          value={busqueda}
          onChange={(e) => onCambiarBusqueda(e.target.value)}
          placeholder={busquedaPlaceholder}
        />
      )}

      {onCambiarOcultarCeros && (
        <label className="sp-filtro-rango-fecha__checkbox">
          <input type="checkbox" checked={ocultarCeros} onChange={(e) => onCambiarOcultarCeros(e.target.checked)} />
          Ocultar ventas en cero
        </label>
      )}

      {exportColumns && (
        <div className="sp-filtro-rango-fecha__exportar">
          <BotonExportar columns={exportColumns} rows={exportRows} fileName={exportFileName} titulo={exportTitulo} />
        </div>
      )}
    </form>
  );
}

export default FiltroRangoFecha;
