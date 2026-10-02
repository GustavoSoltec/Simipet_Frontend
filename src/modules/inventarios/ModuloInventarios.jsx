import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import auditService from '../../services/auditService';
import Detalle from './vistas/Detalle';
import Valuacion from './vistas/Valuacion';
import './ModuloInventarios.css';

// La navegacion entre las vistas de este modulo vive en el submenu
// desplegable "Reportes Inventarios" del sidebar (ver Sidebar.jsx). Este
// componente solo resuelve las rutas internas del modulo y registra
// que el usuario entro a el (control de acciones / estadisticas de
// uso).
function ModuloInventarios() {
  useEffect(() => {
    auditService.logModulo('inventarios');
  }, []);

  return (
    <div className="sp-modulo-inventarios">
      <Routes>
        <Route index element={<Navigate to="detalle" replace />} />
        <Route path="detalle" element={<Detalle />} />
        <Route path="valuacion" element={<Valuacion />} />
      </Routes>
    </div>
  );
}

export default ModuloInventarios;
