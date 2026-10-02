import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logoIcon from '../../assets/logo-icon.png';
import logoIconDarkMode from '../../assets/logo-icon-dark-mode.png';
import './Sidebar.css';

// Iconos identicos a los de Soltec 2.0 (mismo trazo, mismo grosor), para
// que ambas plataformas se sientan de la misma familia visual.
const ICON_PROPS = {
  width: 17,
  height: 17,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

function IconDashboard() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M4 18a8 8 0 1 1 16 0" />
      <path d="M12 18l4.2-5.2" />
      <circle cx="12" cy="18" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconVentas() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M6 2.5h9.5L19 6v15.5H6a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z" />
      <path d="M15.5 2.5V6H19" />
      <path d="M8.3 12.2h7.4M8.3 15.4h4.6" />
    </svg>
  );
}

function IconInventarios() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="2.5" y="4" width="19" height="7" rx="1.2" />
      <rect x="2.5" y="13" width="19" height="7" rx="1.2" />
      <circle cx="6.5" cy="7.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="6.5" cy="16.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconConfiguracion() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M9.5 21H5.5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16.5 17l4.5-5-4.5-5" />
      <path d="M21 12H9.5" />
    </svg>
  );
}

// Catalogo de navegacion. Un item con "children" se dibuja como un
// grupo desplegable; un item sin "children" es un link directo. Agregar
// un modulo nuevo (o una vista nueva dentro de un modulo existente) es
// sumar una entrada aqui, no hay que tocar el resto del componente.
const NAV_ITEMS = [
  { key: 'dashboard', to: '/', label: 'Dashboard', icon: IconDashboard, end: true },
  {
    key: 'ventas',
    label: 'Ventas',
    icon: IconVentas,
    children: [
      { to: '/ventas/acumulado-fecha', label: 'Acumulado por Fecha' },
      { to: '/ventas/por-sucursal', label: 'Por Sucursal' },
      { to: '/ventas/sucursal-vs-vendedor', label: 'Por Sucursal vs Vendedor' },
      { to: '/ventas/por-vendedor', label: 'Por Vendedor' },
      { to: '/ventas/sucursal-detalle', label: 'Por Sucursal detalle' },
      { to: '/ventas/productos', label: 'Productos' },
      { to: '/ventas/detalle-ticket', label: 'Detalle Ticket' },
    ],
  },
  {
    key: 'inventarios',
    label: 'Inventarios',
    icon: IconInventarios,
    children: [
      { to: '/inventarios/detalle', label: 'Detalle' },
      { to: '/inventarios/valuacion', label: 'Valuación' },
    ],
  },
  {
    key: 'administracion',
    label: 'Administración',
    icon: IconConfiguracion,
    children: [
      { to: '/administracion/usuarios', label: 'Usuarios' },
      { to: '/administracion/empresas', label: 'Empresas' },
      { to: '/administracion/sucursales', label: 'Sucursales' },
    ],
  },
];

function initials(nombre) {
  if (!nombre) return 'U';
  const partes = nombre.trim().split(/\s+/);
  return partes
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

function Sidebar({ collapsed, mobileOpen, onCloseMobile, theme = 'dark' }) {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const [expanded, setExpanded] = useState(() => new Set());

  // El perfil administrador (idPerfil 2 y 3) solo administra catalogos:
  // no ve Dashboard/Ventas/Inventarios, solo Administracion. El perfil
  // operativo (idPerfil 1) es al reves: ve todo lo operativo, y nunca
  // sabe que Administracion existe.
  const esAdministrador = [2, 3].includes(Number(user?.idPerfil));
  const navItems = useMemo(
    () =>
      esAdministrador
        ? NAV_ITEMS.filter((item) => item.key === 'administracion')
        : NAV_ITEMS.filter((item) => item.key !== 'administracion'),
    [esAdministrador]
  );

  // Si la ruta activa cae dentro de un grupo, ese grupo arranca abierto.
  useEffect(() => {
    const abiertos = new Set(
      navItems.filter(
        (item) => item.children?.some((child) => location.pathname.startsWith(child.to))
      ).map((item) => item.key)
    );
    setExpanded((prev) => new Set([...prev, ...abiertos]));
  }, [location.pathname, navItems]);

  const toggleGroup = (key) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <>
      {mobileOpen && <div className="sp-sidebar__scrim" onClick={onCloseMobile} aria-hidden="true" />}
      <aside
        className={`sp-sidebar ${collapsed ? 'sp-sidebar--collapsed' : ''} ${
          mobileOpen ? 'sp-sidebar--mobile-open' : ''
        } ${theme === 'light' ? 'sp-sidebar--light-mode' : ''}`}
      >
        <div className="sp-sidebar__brand">
          <img
            src={theme === 'light' ? logoIcon : logoIconDarkMode}
            alt="Simipet"
            className="sp-sidebar__logo"
          />
          {!collapsed && <span className="sp-sidebar__brand-name">Simipet</span>}
        </div>

        <nav className="sp-sidebar__nav">
          {navItems.map((item) => {
            const Icon = item.icon;

            if (!item.children) {
              return (
                <NavLink
                  key={item.key}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `sp-sidebar__link ${isActive ? 'sp-sidebar__link--active' : ''}`
                  }
                  onClick={onCloseMobile}
                  title={item.label}
                >
                  <span className="sp-sidebar__icon">
                    <Icon />
                  </span>
                  {!collapsed && <span className="sp-sidebar__label">{item.label}</span>}
                </NavLink>
              );
            }

            const isOpen = expanded.has(item.key);
            const isGroupActive = item.children.some((c) => location.pathname.startsWith(c.to));

            return (
              <div key={item.key} className="sp-sidebar__group">
                <button
                  type="button"
                  className={`sp-sidebar__link sp-sidebar__group-toggle ${
                    isGroupActive ? 'sp-sidebar__link--active' : ''
                  }`}
                  onClick={() => (collapsed ? null : toggleGroup(item.key))}
                  title={item.label}
                >
                  <span className="sp-sidebar__icon">
                    <Icon />
                  </span>
                  {!collapsed && (
                    <>
                      <span className="sp-sidebar__label sp-sidebar__label--grow">{item.label}</span>
                      <span className={`sp-sidebar__chevron ${isOpen ? 'sp-sidebar__chevron--open' : ''}`}>
                        ‹
                      </span>
                    </>
                  )}
                </button>

                {!collapsed && isOpen && (
                  <div className="sp-sidebar__submenu">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        className={({ isActive }) =>
                          `sp-sidebar__sublink ${isActive ? 'sp-sidebar__sublink--active' : ''}`
                        }
                        onClick={onCloseMobile}
                      >
                        <span className="sp-sidebar__bullet" />
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="sp-sidebar__footer">
          <div className="sp-sidebar__user">
            <span className="sp-sidebar__avatar">{initials(user?.nombre)}</span>
            {!collapsed && (
              <span className="sp-sidebar__user-name" title={user?.nombre}>
                {user?.nombre || 'Usuario'}
              </span>
            )}
          </div>
          {!collapsed && (
            <div className="sp-sidebar__footer-actions">
              <button type="button" className="sp-sidebar__footer-btn" title="Configuración de usuario">
                <IconConfiguracion />
              </button>
              <button type="button" className="sp-sidebar__footer-btn" onClick={signOut} title="Cerrar sesión">
                <IconLogout />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
