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

/**
 * CRUD generico: no conoce de antemano las columnas de "empresas" o
 * "sucursales" -- las pide al backend (que a su vez las lee de
 * INFORMATION_SCHEMA). La TABLA muestra por default solo las columnas
 * curadas (CONFIG_COLUMNAS), y si el catalogo tiene agrupado
 * configurado (CONFIG_AGRUPACION), la vista principal es por grupo con
 * detalle inline en vez de tabla plana.
 */
function CatalogoCrud({ nombreCatalogo, titulo, acento = 'blue', camposExtra = [] }) {
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

      const [resColumnas, resFilas, resEmpresas] = await Promise.all(llamadas);
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
  }, [nombreCatalogo, necesitaEmpresas]);

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
    setValoresForm({});
    setErrorForm(null);
    setModalAbierto(true);
  }

  function abrirEditar(fila) {
    setFilaEditando(fila);
    setValoresForm({ ...fila });
    setErrorForm(null);
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

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setErrorForm(null);
    try {
      if (filaEditando) {
        await apiClient.put(`/api/v1/simipet-catalogo/${nombreCatalogo}/${filaEditando[pk]}`, valoresForm);
        auditService.logAccion('administracion', nombreCatalogo, 'editar', { id: filaEditando[pk] });
      } else {
        await apiClient.post(`/api/v1/simipet-catalogo/${nombreCatalogo}`, valoresForm);
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
            <h3 className="sp-catalogo-crud__modal-titulo">{filaEditando ? 'Editar registro' : 'Nuevo registro'}</h3>

            {errorForm && <div className="sp-catalogo-crud__error-form">{errorForm}</div>}

            <div className="sp-catalogo-crud__campos">
              {columnas
                .filter((c) => !c.autoIncremental)
                .map((c) => (
                  <label key={c.nombre} className="sp-catalogo-crud__campo">
                    <span>
                      {c.nombre === columnaEstatusReal ? 'Estatus' : c.nombre}
                      {c.requerido ? ' *' : ''}
                    </span>
                    {c.nombre === columnaEstatusReal ? (
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
                        disabled={c.esLlavePrimaria && Boolean(filaEditando)}
                        required={c.requerido}
                      />
                    ) : (
                      <input
                        type="text"
                        value={valoresForm[c.nombre] ?? ''}
                        onChange={(e) => setValoresForm((v) => ({ ...v, [c.nombre]: e.target.value }))}
                        disabled={c.esLlavePrimaria && Boolean(filaEditando)}
                        required={c.requerido}
                      />
                    )}
                  </label>
                ))}

              {camposExtra.map((c) => (
                <label key={c.nombre} className="sp-catalogo-crud__campo">
                  <span>
                    {c.label}
                    {!filaEditando && c.requeridoAlCrear ? ' *' : ''}
                  </span>
                  <input
                    type={c.tipo || 'text'}
                    value={valoresForm[c.nombre] ?? ''}
                    onChange={(e) => setValoresForm((v) => ({ ...v, [c.nombre]: e.target.value }))}
                    placeholder={filaEditando ? c.ayudaAlEditar : undefined}
                    required={!filaEditando && c.requeridoAlCrear}
                    autoComplete="new-password"
                  />
                </label>
              ))}
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
