import { useCallback, useEffect, useMemo, useState } from 'react';
import apiClient from '../../services/apiClient';
import auditService from '../../services/auditService';
import Panel from './Panel';
import TablaReporte from './TablaReporte';
import TablaAnidada from './TablaAnidada';
import LoadingState from './LoadingState';
import EmptyState from './EmptyState';
import { IconEditar, IconEliminar } from './CatalogoCrudIcons';
import './CatalogoCrud.css';

function normalizarValorCelda(valor) {
  if (valor && typeof valor === 'object' && Array.isArray(valor.data)) {
    if (valor.data.length === 1) return valor.data[0];
    return valor.data.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return valor;
}

function normalizarFila(fila) {
  const normalizada = {};
  Object.keys(fila).forEach((key) => {
    normalizada[key] = normalizarValorCelda(fila[key]);
  });
  return normalizada;
}

function normalizarNombreColumna(nombre) {
  return String(nombre).toLowerCase().replace(/[_\s]/g, '');
}

/**
 * TEMPORAL: se deja el valor crudo entre parentesis a proposito -- no
 * estamos seguros todavia si 1 significa activo o lo contrario para la
 * columna real de "sucursal". Una vez confirmado, quitar el "(valor)".
 */
/** Tipos de MySQL que INFORMATION_SCHEMA reporta como numericos -- se usan para pintar un input type="number" en vez de texto, y asi evitar precisamente el error que dio pie a este cambio (texto donde se esperaba un entero). */
const TIPOS_NUMERICOS = ['int', 'tinyint', 'smallint', 'mediumint', 'bigint', 'decimal', 'float', 'double', 'numeric'];

function esColumnaNumerica(tipo) {
  return TIPOS_NUMERICOS.includes(String(tipo || '').toLowerCase());
}

function formatoEstatus(valor) {
  const activo = Number(valor) === 1;
  return `${activo ? 'Activo' : 'Inactivo'} (${valor})`;
}

function buscarColumnaRealPorEtiqueta(etiqueta, configColumnas, nombresReales) {
  const cfg = configColumnas.find((c) => c.etiqueta === etiqueta);
  if (!cfg) return null;
  const real = cfg.candidatos.find((cand) => nombresReales.some((n) => normalizarNombreColumna(n) === normalizarNombreColumna(cand)));
  return nombresReales.find((n) => normalizarNombreColumna(n) === normalizarNombreColumna(real)) || null;
}

const CONFIG_COLUMNAS = {
  usuarios: [
    { etiqueta: 'Id Usuario', candidatos: ['IdUsuario'] },
    { etiqueta: 'Nombre', candidatos: ['Nombre'] },
    { etiqueta: 'Perfil', candidatos: ['IdPerfil'] },
    { etiqueta: 'Usuario', candidatos: ['Usuario'] },
    { etiqueta: 'Empresa', candidatos: ['IdEmpresa'], resolverEmpresa: true },
    { etiqueta: 'Estatus', candidatos: ['Activo', 'Estatus', 'Status'], formato: formatoEstatus }
  ],
  empresas: [
    { etiqueta: 'Id Empresa', candidatos: ['idEmpresa', 'IdEmpresa'] },
    { etiqueta: 'Código Postal', candidatos: ['codigoPostal', 'CodigoPostal', 'codigo_postal', 'CP', 'cp'] },
    { etiqueta: 'RFC', candidatos: ['rfc', 'RFC'] },
    { etiqueta: 'Estatus', candidatos: ['activo', 'Activo', 'estatus', 'Estatus'], formato: formatoEstatus }
  ],
  sucursales: [
    { etiqueta: 'Clave', candidatos: ['claveSimi', 'ClaveSimi'] },
    { etiqueta: 'Sucursal', candidatos: ['nombre', 'Nombre'] },
    { etiqueta: 'Empresa', candidatos: ['idEmpresa', 'IdEmpresa'], resolverEmpresa: true },
    { etiqueta: 'Estatus', candidatos: ['activo', 'Activo', 'estatus', 'Estatus'], formato: formatoEstatus }
  ]
};

/**
 * Agrupado opcional por catalogo: en vez de una tabla plana, la fila
 * principal es un grupo (con cuantos registros tiene), y al expandir
 * se ve el detalle de ese grupo (via TablaAnidada).
 */
const CONFIG_AGRUPACION = {
  sucursales: {
    tituloGrupo: 'Empresa',
    obtenerClave: (fila, ctx) => (ctx.columnaEmpresaReal ? fila[ctx.columnaEmpresaReal] : null),
    obtenerEtiqueta: (clave, ctx) => ctx.empresasPorId.get(String(clave)) || (clave == null ? '(Sin empresa)' : `Empresa ${clave}`)
  },
  usuarios: {
    tituloGrupo: 'Tipo',
    obtenerClave: (fila, ctx) => (ctx.columnaPerfilReal && Number(fila[ctx.columnaPerfilReal]) === 1 ? 'clientes' : 'administradores'),
    obtenerEtiqueta: (clave) => (clave === 'clientes' ? 'Clientes (perfil 1)' : 'Administradores (perfil 2 y 3)')
  }
};

/** Clave interna (nunca se manda al backend) donde vive la confirmacion de un campo extra, ej. "Confirmar contraseña". */
function claveConfirmacion(nombre) {
  return `__confirmar_${nombre}`;
}

function quitarCamposInternos(valores) {
  const limpio = {};
  Object.keys(valores).forEach((k) => {
    if (!k.startsWith('__')) limpio[k] = valores[k];
  });
  return limpio;
}

/**
 * CRUD generico: no conoce de antemano las columnas de "empresas" o
 * "sucursales" -- las pide al backend (que a su vez las lee de
 * INFORMATION_SCHEMA). La TABLA muestra por default solo las columnas
 * curadas (CONFIG_COLUMNAS), y si el catalogo tiene agrupado
 * configurado (CONFIG_AGRUPACION), la vista principal es por grupo con
 * detalle inline en vez de tabla plana.
 *
 * configFormulario (opcional; sin el, el formulario se ve como siempre):
 *   {
 *     tituloNuevo, tituloEditar,
 *     orden: ['Columna', ...],            // orden de los campos
 *     campos: {
 *       Columna: {
 *         label,                           // etiqueta legible
 *         requerido,                       // obligatorio aunque la tabla acepte NULL
 *         requeridoSi: (valores) => bool,  // obligatorio segun otros campos
 *         ayuda,                           // texto chico bajo el campo
 *         fuenteOpciones: 'empresas',      // lista con las empresas ya cargadas
 *         cargarOpciones: async () => [{ valor, etiqueta }],
 *         textoVacio                       // opcion vacia de la lista
 *       }
 *     }
 *   }
 * La PK que genera el servidor (generadoPorServidor) se oculta al crear.
 *
 * camposExtra admite ademas: maxLength, confirmar (pide repetir el valor)
 * y labelConfirmar; si tipo es "password" se agrega boton Mostrar/Ocultar.
 */
function CatalogoCrud({ nombreCatalogo, titulo, acento = 'blue', camposExtra = [], configFormulario = null }) {
  const [columnas, setColumnas] = useState([]);
  const [filas, setFilas] = useState([]);
  const [empresasPorId, setEmpresasPorId] = useState(new Map());
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [filaEditando, setFilaEditando] = useState(null);
  const [valoresForm, setValoresForm] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState(null);
  const [opcionesPorCampo, setOpcionesPorCampo] = useState({});
  const [secretosVisibles, setSecretosVisibles] = useState({});

  const camposConfig = configFormulario?.campos || {};
  const configColumnas = CONFIG_COLUMNAS[nombreCatalogo] || [];
  const configAgrupacion = CONFIG_AGRUPACION[nombreCatalogo] || null;
  const necesitaEmpresas = configColumnas.some((c) => c.resolverEmpresa);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const llamadas = [
        apiClient.get(`/api/v1/simipet-catalogo/${nombreCatalogo}/columnas`),
        apiClient.get(`/api/v1/simipet-catalogo/${nombreCatalogo}`)
      ];
      if (necesitaEmpresas && nombreCatalogo !== 'empresas') {
        llamadas.push(apiClient.get('/api/v1/simipet-catalogo/empresas'));
      }

      const cargadores = Object.entries(configFormulario?.campos || {}).filter(([, cfg]) => typeof cfg.cargarOpciones === 'function');
      const promesaOpciones = Promise.all(cargadores.map(([, cfg]) => cfg.cargarOpciones()));

      const [[resColumnas, resFilas, resEmpresas], opcionesCargadas] = await Promise.all([Promise.all(llamadas), promesaOpciones]);

      const mapaOpciones = {};
      cargadores.forEach(([nombre], i) => {
        mapaOpciones[nombre] = opcionesCargadas[i] || [];
      });
      setOpcionesPorCampo(mapaOpciones);
      setColumnas(resColumnas.data.columnas || []);
      setFilas((resFilas.data.data || []).map(normalizarFila));

      if (resEmpresas) {
        const mapa = new Map();
        (resEmpresas.data.data || []).forEach((e) => {
          const idCol = Object.keys(e).find((k) => normalizarNombreColumna(k) === 'idempresa');
          const nombreCol = Object.keys(e).find((k) => normalizarNombreColumna(k) === 'nombreempresa');
          if (idCol) mapa.set(String(e[idCol]), nombreCol ? e[nombreCol] : e[idCol]);
        });
        setEmpresasPorId(mapa);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar el catálogo.');
    } finally {
      setCargando(false);
    }
  }, [nombreCatalogo, necesitaEmpresas, configFormulario]);

  useEffect(() => {
    auditService.logModulo('administracion', nombreCatalogo);
    cargar();
  }, [cargar, nombreCatalogo]);

  const pk = useMemo(() => columnas.find((c) => c.esLlavePrimaria)?.nombre, [columnas]);
  const nombresReales = useMemo(() => columnas.map((c) => c.nombre), [columnas]);

  const columnaEstatusReal = useMemo(
    () => buscarColumnaRealPorEtiqueta('Estatus', configColumnas, nombresReales),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nombresReales, nombreCatalogo]
  );
  const columnaEmpresaReal = useMemo(
    () => buscarColumnaRealPorEtiqueta('Empresa', configColumnas, nombresReales),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nombresReales, nombreCatalogo]
  );
  const columnaPerfilReal = useMemo(
    () => buscarColumnaRealPorEtiqueta('Perfil', configColumnas, nombresReales),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nombresReales, nombreCatalogo]
  );

  function abrirCrear() {
    setFilaEditando(null);
    // El select de Estatus muestra "Activo" por default; sin guardarlo
    // aqui, el registro se insertaba con Estatus NULL (y en usuarios, el
    // login trata NULL como inactivo).
    setValoresForm(columnaEstatusReal ? { [columnaEstatusReal]: 1 } : {});
    setErrorForm(null);
    setSecretosVisibles({});
    setModalAbierto(true);
  }

  function abrirEditar(fila) {
    setFilaEditando(fila);
    setValoresForm({ ...fila });
    setErrorForm(null);
    setSecretosVisibles({});
    setModalAbierto(true);
  }

  async function confirmarEliminar(fila) {
    const idValor = fila[pk];
    if (!window.confirm(`¿Eliminar el registro "${idValor}"? Esta acción no se puede deshacer.`)) return;

    try {
      await apiClient.delete(`/api/v1/simipet-catalogo/${nombreCatalogo}/${idValor}`);
      auditService.logAccion('administracion', nombreCatalogo, 'eliminar', { id: idValor });
      await cargar();
    } catch (err) {
      window.alert(err.response?.data?.message || 'No se pudo eliminar el registro.');
    }
  }

  const columnaAcciones = useMemo(
    () => ({
      key: '__acciones',
      label: 'Acciones',
      format: (_v, fila) => (
        <span className="sp-catalogo-crud__acciones">
          <button type="button" className="sp-catalogo-crud__accion-btn" onClick={() => abrirEditar(fila)} title="Editar" aria-label="Editar">
            <IconEditar />
          </button>
          <button
            type="button"
            className="sp-catalogo-crud__accion-btn sp-catalogo-crud__accion-btn--eliminar"
            onClick={() => confirmarEliminar(fila)}
            title="Eliminar"
            aria-label="Eliminar"
          >
            <IconEliminar />
          </button>
        </span>
      )
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pk, nombreCatalogo]
  );

  const curadas = useMemo(() => {
    return configColumnas
      .map((cfg) => {
        const real = cfg.candidatos.find((cand) => nombresReales.some((n) => normalizarNombreColumna(n) === normalizarNombreColumna(cand)));
        const nombreReal = nombresReales.find((n) => normalizarNombreColumna(n) === normalizarNombreColumna(real));
        if (!nombreReal) return null;
        return {
          key: nombreReal,
          label: cfg.etiqueta,
          align: 'left',
          format: cfg.resolverEmpresa ? (v) => empresasPorId.get(String(v)) || v : cfg.formato || undefined
        };
      })
      .filter(Boolean);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nombresReales, empresasPorId, nombreCatalogo]);

  const columnasTabla = useMemo(() => {
    const clavesCuradas = new Set(curadas.map((c) => c.key));
    const restantes = columnas
      .filter((c) => !clavesCuradas.has(c.nombre))
      .map((c) => ({ key: c.nombre, label: c.nombre, align: 'left', visibleByDefault: false }));
    return [...curadas, ...restantes, columnaAcciones];
  }, [curadas, columnas, columnaAcciones]);

  const grupos = useMemo(() => {
    if (!configAgrupacion) return null;
    const ctx = { columnaEmpresaReal, columnaPerfilReal, empresasPorId };
    const mapa = new Map();
    filas.forEach((fila) => {
      const clave = configAgrupacion.obtenerClave(fila, ctx);
      if (!mapa.has(clave)) mapa.set(clave, []);
      mapa.get(clave).push(fila);
    });
    return [...mapa.entries()]
      .map(([clave, filasGrupo]) => ({
        clave,
        etiqueta: configAgrupacion.obtenerEtiqueta(clave, ctx),
        cantidad: filasGrupo.length,
        filas: filasGrupo
      }))
      .sort((a, b) => String(a.etiqueta).localeCompare(String(b.etiqueta)));
  }, [configAgrupacion, filas, columnaEmpresaReal, columnaPerfilReal, empresasPorId]);

  const columnasGrupo = useMemo(
    () => [
      { key: 'etiqueta', label: configAgrupacion?.tituloGrupo || 'Grupo', align: 'left' },
      { key: 'cantidad', label: 'Cantidad', format: (v) => new Intl.NumberFormat('es-MX').format(v || 0) }
    ],
    [configAgrupacion]
  );

  function opcionesDeCampo(nombre, cfg) {
    if (cfg.fuenteOpciones === 'empresas') {
      return [...empresasPorId.entries()]
        .map(([valor, etiqueta]) => ({ valor, etiqueta: String(etiqueta) }))
        .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta));
    }
    return opcionesPorCampo[nombre] || [];
  }

  function esRequerido(columna) {
    const cfg = camposConfig[columna.nombre] || {};
    return Boolean(columna.requerido || cfg.requerido || (cfg.requeridoSi && cfg.requeridoSi(valoresForm)));
  }

  /** Columnas que se pintan en el formulario, en el orden configurado (las no listadas van al final). */
  function columnasDelFormulario() {
    const visibles = columnas.filter((c) => !c.autoIncremental && !(c.generadoPorServidor && !filaEditando));
    const orden = configFormulario?.orden;
    if (!orden) return visibles;
    const posicion = (c) => {
      const i = orden.indexOf(c.nombre);
      return i === -1 ? orden.length : i;
    };
    return [...visibles].sort((a, b) => posicion(a) - posicion(b));
  }

  async function guardar(e) {
    e.preventDefault();
    setErrorForm(null);

    const noCoincide = camposExtra.find(
      (c) => c.confirmar && (valoresForm[c.nombre] || '') !== (valoresForm[claveConfirmacion(c.nombre)] || '')
    );
    if (noCoincide) {
      setErrorForm(`${noCoincide.label} y su confirmación no coinciden.`);
      return;
    }

    const datos = quitarCamposInternos(valoresForm);
    setGuardando(true);
    try {
      if (filaEditando) {
        await apiClient.put(`/api/v1/simipet-catalogo/${nombreCatalogo}/${filaEditando[pk]}`, datos);
        auditService.logAccion('administracion', nombreCatalogo, 'editar', { id: filaEditando[pk] });
      } else {
        await apiClient.post(`/api/v1/simipet-catalogo/${nombreCatalogo}`, datos);
        auditService.logAccion('administracion', nombreCatalogo, 'crear', {});
      }
      setModalAbierto(false);
      await cargar();
    } catch (err) {
      setErrorForm(err.response?.data?.message || 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Panel titulo={titulo} acento={acento}>
      {cargando && <LoadingState label="Cargando catálogo..." />}

      {!cargando && error && (
        <EmptyState title="No se pudo cargar" message={error} tone="error" actionLabel="Reintentar" onAction={cargar} />
      )}

      {!cargando && !error && (
        <>
          <div className="sp-catalogo-crud__toolbar">
            <button type="button" className="sp-catalogo-crud__btn-nuevo" onClick={abrirCrear}>
              + Nuevo
            </button>
          </div>

          {filas.length === 0 ? (
            <EmptyState title="Sin registros" message="Este catálogo todavía no tiene registros." />
          ) : configAgrupacion ? (
            <TablaReporte
              columns={columnasGrupo}
              rows={grupos}
              expandible
              filaId={(g) => String(g.clave)}
              renderContenidoExpandido={(g) => <TablaAnidada columns={[...curadas, columnaAcciones]} rows={g.filas} />}
            />
          ) : (
            <TablaReporte columns={columnasTabla} rows={filas} />
          )}
        </>
      )}

      {modalAbierto && (
        <div className="sp-catalogo-crud__overlay" onClick={() => setModalAbierto(false)}>
          <form className="sp-catalogo-crud__modal" onClick={(e) => e.stopPropagation()} onSubmit={guardar}>
            <h3 className="sp-catalogo-crud__modal-titulo">
              {filaEditando ? configFormulario?.tituloEditar || 'Editar registro' : configFormulario?.tituloNuevo || 'Nuevo registro'}
            </h3>

            {errorForm && <div className="sp-catalogo-crud__error-form">{errorForm}</div>}

            <div className="sp-catalogo-crud__campos">
              {columnasDelFormulario().map((c) => {
                const cfg = camposConfig[c.nombre] || {};
                const requerido = esRequerido(c);
                const tieneLista = Boolean(cfg.fuenteOpciones || cfg.cargarOpciones);
                const etiqueta = cfg.label || (c.nombre === columnaEstatusReal ? 'Estatus' : c.nombre);
                const deshabilitado = c.esLlavePrimaria && Boolean(filaEditando);

                let opciones = [];
                if (tieneLista) {
                  opciones = opcionesDeCampo(c.nombre, cfg);
                  const actual = valoresForm[c.nombre];
                  // Si el valor guardado ya no esta en la lista (ej. empresa
                  // inactiva), se muestra igual para no perderlo en silencio.
                  if (actual != null && actual !== '' && !opciones.some((o) => String(o.valor) === String(actual))) {
                    opciones = [...opciones, { valor: actual, etiqueta: `${actual} (no encontrado)` }];
                  }
                }

                return (
                  <label key={c.nombre} className="sp-catalogo-crud__campo">
                    <span>
                      {etiqueta}
                      {requerido ? ' *' : ''}
                    </span>
                    {tieneLista ? (
                      <select
                        value={valoresForm[c.nombre] == null ? '' : String(valoresForm[c.nombre])}
                        onChange={(e) => {
                          const v = e.target.value;
                          setValoresForm((prev) => ({
                            ...prev,
                            [c.nombre]: v === '' ? '' : esColumnaNumerica(c.tipo) ? Number(v) : v
                          }));
                        }}
                        disabled={deshabilitado}
                        required={requerido}
                      >
                        <option value="">{cfg.textoVacio || 'Selecciona...'}</option>
                        {opciones.map((o) => (
                          <option key={String(o.valor)} value={String(o.valor)}>
                            {o.etiqueta}
                          </option>
                        ))}
                      </select>
                    ) : c.nombre === columnaEstatusReal ? (
                      <select
                        value={valoresForm[c.nombre] ?? 1}
                        onChange={(e) => setValoresForm((v) => ({ ...v, [c.nombre]: Number(e.target.value) }))}
                      >
                        <option value={1}>Activo</option>
                        <option value={0}>Inactivo</option>
                      </select>
                    ) : esColumnaNumerica(c.tipo) ? (
                      <input
                        type="number"
                        value={valoresForm[c.nombre] ?? ''}
                        onChange={(e) => setValoresForm((v) => ({ ...v, [c.nombre]: e.target.value === '' ? '' : Number(e.target.value) }))}
                        disabled={deshabilitado}
                        required={requerido}
                      />
                    ) : (
                      <input
                        type="text"
                        value={valoresForm[c.nombre] ?? ''}
                        onChange={(e) => setValoresForm((v) => ({ ...v, [c.nombre]: e.target.value }))}
                        disabled={deshabilitado}
                        required={requerido}
                        maxLength={c.longitudMaxima || undefined}
                      />
                    )}
                    {cfg.ayuda && <small className="sp-catalogo-crud__ayuda">{cfg.ayuda}</small>}
                  </label>
                );
              })}

              {camposExtra.map((c) => {
                const esSecreto = c.tipo === 'password';
                const visible = Boolean(secretosVisibles[c.nombre]);
                const tipoInput = esSecreto && visible ? 'text' : c.tipo || 'text';
                const valor = valoresForm[c.nombre] ?? '';
                const requerido = !filaEditando && c.requeridoAlCrear;
                // Al editar, la confirmacion solo se pide si se escribio una nueva.
                const pideConfirmacion = c.confirmar && (requerido || valor !== '');

                return (
                  <div key={c.nombre} className="sp-catalogo-crud__grupo-extra">
                    <label className="sp-catalogo-crud__campo">
                      <span>
                        {c.label}
                        {requerido ? ' *' : ''}
                      </span>
                      <span className="sp-catalogo-crud__input-con-boton">
                        <input
                          type={tipoInput}
                          value={valor}
                          onChange={(e) => setValoresForm((v) => ({ ...v, [c.nombre]: e.target.value }))}
                          placeholder={filaEditando ? c.ayudaAlEditar : undefined}
                          required={requerido}
                          maxLength={c.maxLength || undefined}
                          autoComplete="new-password"
                        />
                        {esSecreto && (
                          <button
                            type="button"
                            className="sp-catalogo-crud__btn-mostrar"
                            onClick={() => setSecretosVisibles((s) => ({ ...s, [c.nombre]: !s[c.nombre] }))}
                            aria-label={visible ? 'Ocultar' : 'Mostrar'}
                          >
                            {visible ? 'Ocultar' : 'Mostrar'}
                          </button>
                        )}
                      </span>
                      {c.maxLength && <small className="sp-catalogo-crud__ayuda">Máximo {c.maxLength} caracteres.</small>}
                    </label>

                    {pideConfirmacion && (
                      <label className="sp-catalogo-crud__campo">
                        <span>{c.labelConfirmar || `Confirmar ${c.label.toLowerCase()}`} *</span>
                        <input
                          type={tipoInput}
                          value={valoresForm[claveConfirmacion(c.nombre)] ?? ''}
                          onChange={(e) => setValoresForm((v) => ({ ...v, [claveConfirmacion(c.nombre)]: e.target.value }))}
                          required
                          maxLength={c.maxLength || undefined}
                          autoComplete="new-password"
                        />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="sp-catalogo-crud__modal-acciones">
              <button type="button" className="sp-catalogo-crud__btn-cancelar" onClick={() => setModalAbierto(false)}>
                Cancelar
              </button>
              <button type="submit" className="sp-catalogo-crud__btn-guardar" disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </Panel>
  );
}

export default CatalogoCrud;
