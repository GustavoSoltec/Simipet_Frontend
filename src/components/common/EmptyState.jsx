import './EmptyState.css';

function EmptyState({ title = 'Sin resultados', message, actionLabel, onAction, tone = 'neutral' }) {
  return (
    <div className={`sp-empty sp-empty--${tone}`}>
      <p className="sp-empty__title">{title}</p>
      {message && <p className="sp-empty__message">{message}</p>}
      {actionLabel && onAction && (
        <button type="button" className="sp-empty__action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
