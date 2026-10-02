import { Component } from 'react';
import { captureError } from '../../services/errorService';
import { env } from '../../config/env';
import './ErrorBoundary.css';

// Boundary de errores de React. Cualquier error de render que ocurra
// dentro de los hijos de este componente:
//   1. se reporta a la base de datos centralizada de errores
//   2. muestra una pantalla de recuperacion en vez de una pagina en blanco
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, componentStack: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ componentStack: errorInfo.componentStack });
    captureError({
      source: 'react-error-boundary',
      message: error.message,
      stack: error.stack,
      severity: 'error',
      module: this.props.moduleName || null,
      context: { componentStack: errorInfo.componentStack },
    });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, componentStack: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="sp-error-boundary">
          <div className="sp-error-boundary__icon">!</div>
          <h2>Algo salió mal</h2>
          <p>
            Ocurrió un error inesperado en esta sección. El equipo de Simipet ya fue notificado
            automáticamente.
          </p>
          {!env.isProduction && (
            <pre style={{ textAlign: 'left', whiteSpace: 'pre-wrap', background: '#fff3f3', color: '#a63327', padding: 12, borderRadius: 6, maxWidth: 700, overflow: 'auto', fontSize: 12 }}>
              {this.state.error?.message}
              {'\n\n'}
              {this.state.error?.stack}
              {'\n\n--- component stack ---\n'}
              {this.state.componentStack}
            </pre>
          )}
          <button type="button" onClick={this.handleReload}>
            Recargar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
