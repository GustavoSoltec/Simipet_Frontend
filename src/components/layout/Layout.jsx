import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import ErrorBoundary from '../common/ErrorBoundary';
import getTourForPath from '../../tours';
import './Layout.css';

const TITLES_BY_PATH = {
  '/': 'Dashboard',
  '/ventas': 'Ventas',
  '/inventarios': 'Inventarios',
  '/administracion': 'Administración',
};

const SIDEBAR_THEME_STORAGE_KEY = 'simipet_sidebar_theme';

// Debe coincidir con el breakpoint de movil de Sidebar.css y Layout.css.
const MOBILE_QUERY = '(max-width: 720px)';

function useEsMovil() {
  const [esMovil, setEsMovil] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => setEsMovil(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return esMovil;
}

function resolveTitle(pathname) {
  const exact = TITLES_BY_PATH[pathname];
  if (exact) return exact;
  const base = '/' + pathname.split('/')[1];
  return TITLES_BY_PATH[base] || 'Simipet';
}

function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Tema del sidebar (independiente del resto de la app): se guarda en
  // localStorage para que la preferencia del usuario persista entre
  // sesiones. Default: oscuro, igual que Soltec 2.0.
  const [sidebarTheme, setSidebarTheme] = useState(
    () => localStorage.getItem(SIDEBAR_THEME_STORAGE_KEY) || 'dark'
  );
  const location = useLocation();
  const esMovil = useEsMovil();

  // Al cambiar de pantalla, o al salir del ancho de movil (girar el
  // telefono, agrandar la ventana), el drawer se cierra.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, esMovil]);

  // Con el drawer abierto, la pagina de atras no se desplaza.
  useEffect(() => {
    if (!(esMovil && mobileOpen)) return undefined;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [esMovil, mobileOpen]);

  const handleToggleSidebar = () => {
    // En pantallas angostas el boton abre/cierra el drawer; en escritorio
    // colapsa/expande el sidebar fijo.
    if (esMovil) {
      setMobileOpen((prev) => !prev);
    } else {
      setCollapsed((prev) => !prev);
    }
  };

  const handleToggleSidebarTheme = () => {
    setSidebarTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem(SIDEBAR_THEME_STORAGE_KEY, next);
      return next;
    });
  };

  // En movil el drawer siempre se muestra completo, aunque el usuario
  // haya colapsado el menu antes en una pantalla ancha.
  const sidebarColapsado = collapsed && !esMovil;

  return (
    <div className="sp-layout">
      <Sidebar
        collapsed={sidebarColapsado}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        theme={sidebarTheme}
      />
      <div className="sp-layout__main">
        <Header
          title={resolveTitle(location.pathname)}
          onToggleSidebar={handleToggleSidebar}
          sidebarTheme={sidebarTheme}
          onToggleSidebarTheme={handleToggleSidebarTheme}
          tourSteps={getTourForPath(location.pathname)}
          tourModulo={location.pathname}
        />
        <main className="sp-layout__content">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default Layout;
