import CatalogoCrud from '../../../components/common/CatalogoCrud';

const CAMPOS_EXTRA = [
  {
    nombre: 'Contrasena',
    label: 'Contraseña',
    tipo: 'password',
    requeridoAlCrear: true,
    ayudaAlEditar: 'Dejar en blanco para no cambiarla'
  }
];

/**
 * La contraseña de soltec2_PortalUsuarios nunca se lee de vuelta del
 * backend (ver simipetCatalogo.shared.js, campoSensible) -- por eso va
 * aparte como "campo extra": siempre arranca vacío, es obligatorio solo
 * al crear un usuario nuevo, y al editar solo se cambia si se escribe
 * algo ahí.
 */
function Usuarios() {
  return <CatalogoCrud nombreCatalogo="usuarios" titulo="Usuarios" acento="orange" camposExtra={CAMPOS_EXTRA} />;
}

export default Usuarios;
