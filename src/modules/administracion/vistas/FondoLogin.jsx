import { useCallback, useEffect, useRef, useState } from 'react';
import Panel from '../../../components/common/Panel';
import Notice from '../../../components/common/Notice';
import LoadingState from '../../../components/common/LoadingState';
import {
  cargarFondoPersonalizado,
  FONDO_LOGIN_PREDETERMINADO,
  prepararImagenFondo,
  puedeCambiarFondoLogin,
  restaurarFondoLogin,
  subirFondoLogin,
} from '../../../services/fondoLoginService';
import './FondoLogin.css';

const TIPOS_ACEPTADOS = ['image/jpeg', 'image/png', 'image/webp'];
// Limite del archivo ORIGINAL que se elige. Lo que se sube es la version
// reducida (ver prepararImagenFondo), que el backend acepta hasta 5 MB.
const TAMANO_MAXIMO_ORIGINAL_MB = 25;

/** Miniatura que imita el login: la foto con el mismo overlay y una tarjeta al centro. */
function VistaPreviaLogin({ url, etiqueta }) {
  return (
    <figure className="sp-fondo-login__figura">
      <div className="sp-fondo-login__preview" style={{ '--sp-fondo-preview': `url("${url}")` }}>
        <div className="sp-fondo-login__preview-tarjeta" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
      <figcaption className="sp-fondo-login__etiqueta">{etiqueta}</figcaption>
    </figure>
  );
}

function mensajeDeError(err, porDefecto) {
  if (err?.response?.status === 413) return 'La imagen es demasiado grande para el servidor.';
  return err?.response?.data?.message || err?.message || porDefecto;
}

/**
 * Administracion > Fondo de login. Solo la ve quien este en
 * FONDO_LOGIN_USUARIOS del backend (hoy: Ruby). El backend vuelve a
 * validar el permiso en cada guardado; esta pantalla solo lo consulta
 * para no mostrar botones que fallarian.
 */
function FondoLogin() {
  const [permiso, setPermiso] = useState(null); // null = consultando
  const [actual, setActual] = useState(null); // { url, personalizado }
  const [nueva, setNueva] = useState(null); // { blob, url, ancho, alto, kb }
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const cargarActual = useCallback(async (sinCache = false) => {
    const url = await cargarFondoPersonalizado({ sinCache });
    setActual(url ? { url, personalizado: true } : { url: FONDO_LOGIN_PREDETERMINADO, personalizado: false });
  }, []);

  useEffect(() => {
    let vigente = true;
    puedeCambiarFondoLogin()
      .then((puede) => vigente && setPermiso(puede))
      .catch(() => vigente && setPermiso(false));
    cargarActual(true);
    return () => {
      vigente = false;
    };
  }, [cargarActual]);

  // Libera la URL temporal de la vista previa cuando se reemplaza o se sale.
  useEffect(() => () => nueva && URL.revokeObjectURL(nueva.url), [nueva]);

  const limpiarSeleccion = () => {
    setNueva(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const alElegirArchivo = async (event) => {
    const archivo = event.target.files?.[0];
    setMensaje(null);
    setError(null);
    if (!archivo) return;

    if (!TIPOS_ACEPTADOS.includes(archivo.type)) {
      setError('Elige una imagen JPG, PNG o WebP.');
      limpiarSeleccion();
      return;
    }
    if (archivo.size > TAMANO_MAXIMO_ORIGINAL_MB * 1024 * 1024) {
      setError(`La imagen pesa más de ${TAMANO_MAXIMO_ORIGINAL_MB} MB. Elige una más ligera.`);
      limpiarSeleccion();
      return;
    }

    setOcupado(true);
    try {
      const { blob, ancho, alto } = await prepararImagenFondo(archivo);
      setNueva({ blob, url: URL.createObjectURL(blob), ancho, alto, kb: Math.round(blob.size / 1024) });
    } catch {
      setError('No se pudo leer la imagen. Prueba con otro archivo.');
      limpiarSeleccion();
    } finally {
      setOcupado(false);
    }
  };

  const guardar = async () => {
    if (!nueva) return;
    setOcupado(true);
    setMensaje(null);
    setError(null);
    try {
      await subirFondoLogin(nueva.blob);
      limpiarSeleccion();
      await cargarActual(true);
      setMensaje('Listo. El login ya muestra la nueva imagen de fondo.');
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo guardar la imagen.'));
    } finally {
      setOcupado(false);
    }
  };

  const restaurar = async () => {
    if (!window.confirm('¿Volver a la imagen de fondo original del login?')) return;
    setOcupado(true);
    setMensaje(null);
    setError(null);
    try {
      await restaurarFondoLogin();
      limpiarSeleccion();
      await cargarActual(true);
      setMensaje('Se restauró la imagen de fondo original.');
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo restaurar la imagen original.'));
    } finally {
      setOcupado(false);
    }
  };

  if (permiso === null) {
    return (
      <Panel titulo="Fondo de login" acento="teal">
        <LoadingState label="Cargando..." />
      </Panel>
    );
  }

  if (!permiso) {
    return (
      <Panel titulo="Fondo de login" acento="teal">
        <p className="sp-fondo-login__sin-permiso">No tienes permiso para cambiar el fondo del login.</p>
      </Panel>
    );
  }

  return (
    <Panel titulo="Fondo de login" acento="teal">
      <Notice message={mensaje} />
      {error && <p className="sp-fondo-login__error">{error}</p>}

      <p className="sp-fondo-login__ayuda">
        Elige una foto horizontal (JPG, PNG o WebP). Se ajusta automáticamente a 1920 px y se ve
        en pantalla completa detrás del formulario de inicio de sesión; en pantallas con otra
        proporción se recortan los bordes, así que conviene que lo importante quede al centro.
      </p>

      <div className="sp-fondo-login__comparacion">
        {actual && (
          <VistaPreviaLogin
            url={actual.url}
            etiqueta={actual.personalizado ? 'Fondo actual (personalizado)' : 'Fondo actual (original)'}
          />
        )}
        {nueva && (
          <VistaPreviaLogin
            url={nueva.url}
            etiqueta={`Nueva imagen · ${nueva.ancho} × ${nueva.alto} px · ${nueva.kb} KB`}
          />
        )}
      </div>

      <div className="sp-fondo-login__acciones">
        <label className={`sp-fondo-login__btn ${ocupado ? 'sp-fondo-login__btn--deshabilitado' : ''}`}>
          {nueva ? 'Elegir otra imagen' : 'Elegir imagen'}
          <input
            ref={inputRef}
            type="file"
            accept={TIPOS_ACEPTADOS.join(',')}
            onChange={alElegirArchivo}
            disabled={ocupado}
            className="sp-fondo-login__input"
          />
        </label>

        {nueva && (
          <>
            <button type="button" className="sp-fondo-login__btn-secundario" onClick={limpiarSeleccion} disabled={ocupado}>
              Cancelar
            </button>
            <button type="button" className="sp-fondo-login__btn" onClick={guardar} disabled={ocupado}>
              {ocupado ? 'Guardando...' : 'Guardar como fondo'}
            </button>
          </>
        )}

        {!nueva && actual?.personalizado && (
          <button type="button" className="sp-fondo-login__btn-secundario" onClick={restaurar} disabled={ocupado}>
            Restaurar original
          </button>
        )}
      </div>
    </Panel>
  );
}

export default FondoLogin;
