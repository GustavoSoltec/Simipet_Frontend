import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import auditService from '../../services/auditService';
import Empresas from './vistas/Empresas';
import Sucursales from './vistas/Sucursales';
import Usuarios from './vistas/Usuarios';
import './ModuloAdministracion.css';

/**
 * Modulo de Administracion: CRUD de los catalogos de SimiPET (Empresas,
 * Sucursales). A diferencia de Ventas/Inventarios (que son puros
 * reportes de lectura), aqui si se puede crear/editar/eliminar --
 * pensado para el usuario administrador que necesita mantener estos
 * catalogos, no para el usuario operativo comun.
 */
function ModuloAdministracion() {
  useEffect(() => {
    auditService.logModulo('administracion');
  }, []);

  return (
    <div className="sp-modulo-administracion">
      <Routes>
        <Route index element={<Navigate to="empresas" replace />} />
        <Route path="empresas" element={<Empresas />} />
        <Route path="sucursales" element={<Sucursales />} />
        <Route path="usuarios" element={<Usuarios />} />
      </Routes>
    </div>
  );
}

export default ModuloAdministracion;
