import CatalogoCrud from '../../../components/common/CatalogoCrud';
import { obtenerOpcionesPerfiles } from '../services/administracionService';

/** Perfil 1 = Cliente (usuario operativo). Sin empresa, sus reportes no tendrian sucursales. */
const PERFIL_CLIENTE = 1;

/**
 * La contraseña de soltec2_PortalUsuarios nunca se lee de vuelta del
 * backend (ver simipetCatalogo.shared.js, campoSensible) -- por eso va
 * aparte como "campo extra": siempre arranca vacío, es obligatorio solo
 * al crear un usuario nuevo, y al editar solo se cambia si se escribe
 * algo ahí. Se pide confirmarla y su largo máximo es el de la columna
 * (varchar(25)); el backend vuelve a validar ambas cosas.
 */
const CAMPOS_EXTRA = [
  {
    nombre: 'Contrasena',
    label: 'Contraseña',
    tipo: 'password',
    requeridoAlCrear: true,
    ayudaAlEditar: 'Dejar en blanco para no cambiarla',
    maxLength: 25,
    confirmar: true,
    labelConfirmar: 'Confirmar contraseña'
  }
];

/**
 * Formulario de alta/edición. IdUsuario no aparece al crear: lo genera
 * el backend (la columna no es auto_increment). Las reglas (Usuario
 * único, perfil válido, empresa obligatoria para Cliente) también se
 * validan en el backend; aquí solo guían la captura.
 */
const CONFIG_FORMULARIO = {
  tituloNuevo: 'Nuevo usuario',
  tituloEditar: 'Editar usuario',
  orden: ['IdUsuario', 'Nombre', 'Usuario', 'IdPerfil', 'IdEmpresa', 'Activo'],
  campos: {
    IdUsuario: { label: 'Id Usuario' },
    Nombre: { label: 'Nombre completo', requerido: true },
    Usuario: { label: 'Usuario (para iniciar sesión)', requerido: true, ayuda: 'No puede repetirse con otro usuario.' },
    IdPerfil: { label: 'Perfil', requerido: true, cargarOpciones: obtenerOpcionesPerfiles },
    IdEmpresa: {
      label: 'Empresa',
      fuenteOpciones: 'empresas',
      textoVacio: '(Sin empresa)',
      requeridoSi: (valores) => Number(valores.IdPerfil) === PERFIL_CLIENTE,
      ayuda: 'Obligatoria para el perfil Cliente.'
    },
    Activo: { label: 'Estatus' }
  }
};

function Usuarios() {
  return (
    <CatalogoCrud
      nombreCatalogo="usuarios"
      titulo="Usuarios"
      acento="orange"
      camposExtra={CAMPOS_EXTRA}
      configFormulario={CONFIG_FORMULARIO}
    />
  );
}

export default Usuarios;
