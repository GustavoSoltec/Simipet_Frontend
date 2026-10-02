import { useEffect, useState } from 'react';
import auditService from '../services/auditService';
import { DashboardDataProvider } from './dashboard/DashboardDataContext';
import { WIDGET_CATALOG } from './dashboard/widgetCatalog';
import useDashboardLayout from './dashboard/useDashboardLayout';
import './Dashboard.css';

// Los datos de los widgets salen de los mismos 9 endpoints de
// Reportes-Simipet que ya usan las vistas de Ventas/Inventarios (ver
// dashboard/DashboardDataContext.jsx) -- no hay datos de ejemplo aqui.
//
// El layout (que widgets estan visibles y en que orden) se guarda en
// localStorage, por navegador/dispositivo -- ver
// dashboard/useDashboardLayout.js. No depende de sesion ni de un
// endpoint: cada quien personaliza su propia vista sin afectar a nadie
// mas. Mismo mecanismo que Soltec 2.0.

const CATALOGO_IDS = WIDGET_CATALOG.map((w) => w.id);

function Dashboard() {
  const { visibles, ocultos, agregar, quitar, reordenar, restaurarDefault } = useDashboardLayout(CATALOGO_IDS);
  const [editando, setEditando] = useState(false);
  const [agregarOpen, setAgregarOpen] = useState(false);

  useEffect(() => {
    auditService.logModulo('dashboard');
  }, []);

  const widgetsVisibles = visibles.map((id) => WIDGET_CATALOG.find((w) => w.id === id)).filter(Boolean);
  const widgetsOcultos = ocultos.map((id) => WIDGET_CATALOG.find((w) => w.id === id)).filter(Boolean);

  const handleAgregar = (id) => {
    agregar(id);
    auditService.logAccion('dashboard', null, 'agregar-widget', { id });
    setAgregarOpen(false);
  };

  const handleQuitar = (id) => {
    quitar(id);
    auditService.logAccion('dashboard', null, 'quitar-widget', { id });
  };

  const handleReordenar = (nuevoOrden) => {
    reordenar(nuevoOrden);
    auditService.logAccion('dashboard', null, 'reordenar-widgets', { orden: nuevoOrden });
  };

  const handleToggleEditar = () => {
    setEditando((v) => !v);
    setAgregarOpen(false);
  };

  return (
    <DashboardDataProvider>
      <div className="sp-dash">
        <div className="sp-dash__toolbar">
          {editando && (
            <>
              {widgetsOcultos.length > 0 && (
                <div className="sp-dash__agregar">
                  <button type="button" className="sp-dash__agregar-btn" onClick={() => setAgregarOpen((v) => !v)}>
                    + Agregar widget
                  </button>
                  {agregarOpen && (
                    <>
                      <div className="sp-dash__scrim" onClick={() => setAgregarOpen(false)} />
                      <div className="sp-dash__agregar-menu">
                        {widgetsOcultos.map((w) => (
                          <button key={w.id} type="button" onClick={() => handleAgregar(w.id)}>
                            {w.titulo}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
              <button type="button" className="sp-dash__restaurar-btn" onClick={restaurarDefault}>
                Restaurar por default
              </button>
            </>
          )}
          <button
            type="button"
            className={editando ? 'sp-dash__personalizar-btn sp-dash__personalizar-btn--activo' : 'sp-dash__personalizar-btn'}
            onClick={handleToggleEditar}
          >
            {editando ? 'Listo' : 'Personalizar'}
          </button>
        </div>

        {editando && (
          <p className="sp-dash__editando-hint">
            Arrastra el ícono ⠿ para reordenar, o el botón "Ocultar" para quitar un widget. Los cambios se guardan
            solos en este navegador.
          </p>
        )}

        {!widgetsVisibles.length ? (
          <div className="sp-dash__vacio">
            Ocultaste todos los widgets. Da clic en "Personalizar" y luego "Agregar widget" para volver a mostrar
            alguno.
          </div>
        ) : (
          <WidgetGrid widgets={widgetsVisibles} editando={editando} onReordenar={handleReordenar} onOcultar={handleQuitar} />
        )}
      </div>
    </DashboardDataProvider>
  );
}

// Lista de widgets reordenable con drag nativo del navegador (sin
// libreria externa). Mientras se arrastra, el reacomodo visual usa
// estado LOCAL (ordenLocal) -- solo se llama a onReordenar (que es
// quien persiste a localStorage) una sola vez, al soltar.
function WidgetGrid({ widgets, editando, onReordenar, onOcultar }) {
  const [ordenLocal, setOrdenLocal] = useState(widgets);
  const [arrastrando, setArrastrando] = useState(null);

  useEffect(() => {
    setOrdenLocal(widgets);
  }, [widgets]);

  const handleDragStart = (id) => (e) => {
    setArrastrando(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (id) => (e) => {
    e.preventDefault();
    if (!arrastrando || arrastrando === id) return;
    setOrdenLocal((actual) => {
      const ids = actual.map((w) => w.id);
      const fromIdx = ids.indexOf(arrastrando);
      const toIdx = ids.indexOf(id);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return actual;
      const nuevo = [...actual];
      const [item] = nuevo.splice(fromIdx, 1);
      nuevo.splice(toIdx, 0, item);
      return nuevo;
    });
  };

  const handleDragEnd = () => {
    setArrastrando(null);
    onReordenar(ordenLocal.map((w) => w.id));
  };

  return (
    <div className="sp-dash__widgets">
      {ordenLocal.map((w) => {
        const Componente = w.Componente;
        return (
          <div
            key={w.id}
            className={[
              'sp-dash__widget',
              `sp-dash__widget--${w.tamano}`,
              editando ? 'sp-dash__widget--editando' : '',
              arrastrando === w.id ? 'sp-dash__widget--arrastrando' : ''
            ]
              .filter(Boolean)
              .join(' ')}
            draggable={editando}
            onDragStart={editando ? handleDragStart(w.id) : undefined}
            onDragOver={editando ? handleDragOver(w.id) : undefined}
            onDragEnd={editando ? handleDragEnd : undefined}
          >
            {editando && (
              <div className="sp-dash__widget-chrome">
                <span className="sp-dash__drag-handle" title="Arrastrar para reordenar">
                  ⠿
                </span>
                <button
                  type="button"
                  className="sp-dash__ocultar-btn"
                  onClick={() => onOcultar(w.id)}
                  title="Ocultar este widget"
                >
                  Ocultar
                </button>
              </div>
            )}
            <Componente />
          </div>
        );
      })}
    </div>
  );
}

export default Dashboard;
