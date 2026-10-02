import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import ProtectedRoute from './ProtectedRoute';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import LoadingState from '../components/common/LoadingState';
import { useAuth } from '../context/AuthContext';

// Cada modulo se descarga solo cuando el usuario entra a el (code
// splitting): asi el primer login no arrastra el codigo de todos los
// modulos de golpe, solo el del modulo que esa persona realmente abre.
// Login y Dashboard se quedan con import normal porque se necesitan de
// inmediato tras entrar y son livianos.
const ModuloVentas = lazy(() => import('../modules/ventas/ModuloVentas'));
const ModuloInventarios = lazy(() => import('../modules/inventarios/ModuloInventarios'));
const ModuloAdministracion = lazy(() => import('../modules/administracion/ModuloAdministracion'));

function CargandoModulo() {
  return <LoadingState label="Cargando módulo..." />;
}

// El perfil administrador (idPerfil 2 y 3) no tiene Dashboard en el
// sidebar (ver Sidebar.jsx) -- si cae en "/" (recien inicia sesion, o
// entra directo por URL), se le manda a Administracion en vez de
// mostrarle una pagina que ya no puede volver a alcanzar desde el menu.
function InicioSegunPerfil() {
  const { user } = useAuth();
  const esAdministrador = [2, 3].includes(Number(user?.idPerfil));
  return esAdministrador ? <Navigate to="/administracion" replace /> : <Dashboard />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<InicioSegunPerfil />} />
        <Route
          path="ventas/*"
          element={
            <Suspense fallback={<CargandoModulo />}>
              <ModuloVentas />
            </Suspense>
          }
        />
        <Route
          path="inventarios/*"
          element={
            <Suspense fallback={<CargandoModulo />}>
              <ModuloInventarios />
            </Suspense>
          }
        />
        <Route
          path="administracion/*"
          element={
            <Suspense fallback={<CargandoModulo />}>
              <ModuloAdministracion />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
