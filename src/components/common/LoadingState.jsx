import logoIcon from '../../assets/logo-icon.png';
import './LoadingState.css';

function LoadingState({ label = 'Cargando...' }) {
  return (
    <div className="sp-loading" role="status" aria-live="polite">
      <img src={logoIcon} alt="" className="sp-loading__spinner" aria-hidden="true" />
      <span className="sp-loading__label">{label}</span>
    </div>
  );
}

export default LoadingState;
