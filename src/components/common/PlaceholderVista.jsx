import './PlaceholderVista.css';

/**
 * Panel compartido para vistas que todavia no tienen su contenido
 * definitivo. Cada modulo sigue teniendo su propio archivo de vista
 * (jsx + css) aunque hoy solo rendericen esto: cuando se conecte el
 * endpoint real de Soltec2-api, el contenido de ese archivo se
 * reemplaza sin tener que tocar el router ni el sidebar.
 */
function PlaceholderVista({ title, description }) {
  return (
    <div className="sp-placeholder-vista">
      <div className="sp-placeholder-vista__icon" aria-hidden="true" />
      <h2 className="sp-placeholder-vista__title">{title}</h2>
      <p className="sp-placeholder-vista__description">
        {description || 'Esta vista está en construcción. Pronto se conectará con Soltec2-api.'}
      </p>
    </div>
  );
}

export default PlaceholderVista;
