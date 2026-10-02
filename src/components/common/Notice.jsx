import './Notice.css';

/**
 * Notificacion temporal compartida. Mismo lugar en el layout en todas
 * las vistas: justo debajo del encabezado del panel, antes de los
 * filtros.
 */
function Notice({ message }) {
  if (!message) return null;
  return (
    <div className="sp-notice" role="status" aria-live="polite">
      {message}
    </div>
  );
}

export default Notice;
