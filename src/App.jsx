import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import AppRoutes from './router/AppRoutes';

// import.meta.env.BASE_URL ya trae el mismo valor que "base" en
// vite.config.js (con normalizacion de slashes incluida), asi que
// React Router y Vite siempre quedan de acuerdo en bajo que subcarpeta
// vive la app, sin tener que repetir "/simipet/" en dos archivos
// distintos y arriesgarse a que un dia queden desincronizados.
function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
