import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';
import Notice from '../components/common/Notice';
import logoIcon from '../assets/logo-icon.png';
import './Login.css';

function EnvelopeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M1.5 2 10 9l8.5-7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 22 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M1 8s3.8-6.5 10-6.5S21 8 21 8s-3.8 6.5-10 6.5S1 8 1 8Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="11" cy="8" r="3" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 22 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M1 8s3.8-6.5 10-6.5S21 8 21 8s-3.8 6.5-10 6.5S1 8 1 8Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="11" cy="8" r="3" stroke="currentColor" strokeWidth="1.4" />
      <line x1="2" y1="15" x2="20" y2="1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function Login() {
  const { isAuthenticated, signIn, loading, authError } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  // Se lee (y se borra) una sola vez al montar: si el cierre de sesion
  // anterior fue automatico (token vencido/revocado via 401), se le
  // avisa al usuario en vez de dejarlo adivinar por que llego aqui.
  const [sesionExpirada] = useState(() => authService.consumeSessionExpiredFlag());
  const navigate = useNavigate();
  const location = useLocation();

  if (isAuthenticated) {
    const redirectTo = location.state?.from?.pathname || '/';
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await signIn({ username, password });
      navigate('/', { replace: true });
    } catch {
      // El mensaje de error ya queda expuesto via authError.
    }
  };

  return (
    <div className="sp-login">
      <form className="sp-login__card" onSubmit={handleSubmit}>
        <div className="sp-login__brand">
          <img src={logoIcon} alt="Simipet" className="sp-login__brand-mark" />
          <span className="sp-login__brand-name">Simipet</span>
        </div>

        <p className="sp-login__subtitle">Ingrese usuario y contraseña</p>

        {sesionExpirada && <Notice message="Tu sesión expiró. Vuelve a iniciar sesión." />}

        <label className="sp-login__field">
          <span className="sp-login__field-wrap">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="Usuario"
              aria-label="Usuario"
              required
            />
            <span className="sp-login__field-icon">
              <EnvelopeIcon />
            </span>
          </span>
        </label>

        <label className="sp-login__field">
          <span className="sp-login__field-wrap">
            <input
              type={verPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Contraseña"
              aria-label="Contraseña"
              required
            />
            <button
              type="button"
              className="sp-login__field-icon sp-login__field-icon--btn"
              onClick={() => setVerPassword((v) => !v)}
              aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              title={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {verPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </span>
        </label>

        {authError && <p className="sp-login__error">{authError}</p>}

        <button type="submit" className="sp-login__submit" disabled={loading}>
          {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
        </button>
      </form>
    </div>
  );
}

export default Login;
