import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import auditService from '../../services/auditService';
import AcumuladoPorFecha from './vistas/AcumuladoPorFecha';
import PorSucursal from './vistas/PorSucursal';
import SucursalVsVendedor from './vistas/SucursalVsVendedor';
import PorVendedor from './vistas/PorVendedor';
import SucursalDetalle from './vistas/SucursalDetalle';
import Productos from './vistas/Productos';
import DetalleTicket from './vistas/DetalleTicket';
import './ModuloVentas.css';

// La navegacion entre las vistas de este modulo vive en el submenu
// desplegable "Reportes Ventas" del sidebar (ver Sidebar.jsx). Este
// componente solo resuelve las rutas internas del modulo y registra
// que el usuario entro a el (control de acciones / estadisticas de
// uso). Cada vista, a su vez, registra sus propias acciones puntuales
// via auditService.logAccion.
function ModuloVentas() {
  useEffect(() => {
    auditService.logModulo('ventas');
  }, []);

  return (
    <div className="sp-modulo-ventas">
      <Routes>
        <Route index element={<Navigate to="acumulado-fecha" replace />} />
        <Route path="acumulado-fecha" element={<AcumuladoPorFecha />} />
        <Route path="por-sucursal" element={<PorSucursal />} />
        <Route path="sucursal-vs-vendedor" element={<SucursalVsVendedor />} />
        <Route path="por-vendedor" element={<PorVendedor />} />
        <Route path="sucursal-detalle" element={<SucursalDetalle />} />
        <Route path="productos" element={<Productos />} />
        <Route path="detalle-ticket" element={<DetalleTicket />} />
      </Routes>
    </div>
  );
}

export default ModuloVentas;
