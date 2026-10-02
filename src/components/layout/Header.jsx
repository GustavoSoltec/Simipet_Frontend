/* global __APP_VERSION__ */
import { useState } from 'react';
import startTour from '../../tours/startTour';
import './Header.css';

function IconMoon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSun() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2.5v2.3M12 19.2v2.3M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.3M19.2 12h2.3M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Header({ title, onToggleSidebar, sidebarTheme, onToggleSidebarTheme, tourSteps, tourModulo }) {
  const [helpOpen, setHelpOpen] = useState(false);

  const handleAyudaClick = () => {
    // Si esta pantalla tiene un tour registrado, se dispara directo
    // (asi el boton siempre hace lo mas util). Si no, cae al popover
    // generico que avisa que la ayuda de esa pantalla aun no existe.
    if (tourSteps?.length) {
      startTour(tourSteps, { modulo: tourModulo || 'app' });
      return;
    }
    setHelpOpen((v) => !v);
  };

  return (
    <header className="sp-header">
      <div className="sp-header__left">
        <button
          type="button"
          className="sp-header__menu-btn"
          onClick={onToggleSidebar}
          aria-label="Mostrar u ocultar menú"
        >
          <span />
          <span />
          <span />
        </button>
        <h1 className="sp-header__title">{title}</h1>
      </div>

      <div className="sp-header__right">
        {onToggleSidebarTheme && (
          <button
            type="button"
            className="sp-header__theme-btn"
            onClick={onToggleSidebarTheme}
            title={sidebarTheme === 'dark' ? 'Cambiar el menú a modo claro' : 'Cambiar el menú a modo oscuro'}
          >
            {sidebarTheme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>
        )}
        <div className="sp-header__help">
          <button
            type="button"
            className="sp-header__help-btn"
            onClick={handleAyudaClick}
            aria-expanded={helpOpen}
          >
            <span className="sp-header__help-icon">?</span>
            <span className="sp-header__help-label">Ayuda</span>
          </button>
          {!tourSteps?.length && helpOpen && (
            <>
              <div className="sp-header__scrim" onClick={() => setHelpOpen(false)} />
              <div className="sp-header__help-popover">
                <p className="sp-header__help-title">Centro de ayuda</p>
                <p className="sp-header__help-text">
                  El centro de ayuda de Simipet todavía está en construcción para esta pantalla.
                  Mientras tanto, cualquier duda repórtala directo con el equipo de soporte.
                </p>
              </div>
            </>
          )}
        </div>

        <span className="sp-header__version" title="Versión del portal">
          v{__APP_VERSION__}
        </span>
      </div>
    </header>
  );
}

export default Header;
