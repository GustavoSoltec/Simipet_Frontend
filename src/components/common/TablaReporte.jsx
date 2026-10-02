import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import './TablaReporte.css';

function IconoColumnas() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 4.5v15M15 4.5v15" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

/**
 * Tabla generica reutilizable para todos los reportes: mostrar/ocultar
 * columnas, y opcionalmente filas expandibles (drill-down inline -- al
 * dar clic en una fila, se abre debajo con el desglose de esa fila,
 * sin salir de la tabla ni cambiar de pantalla. Mismo criterio que
 * Soltec 2.0 en Analisis de Tickets, nivel 2).
 *
 * El boton de Exportar ya NO vive aqui -- se movio a la fila del filtro
 * (FiltroRangoFecha/FiltroFechaUnica), igual criterio visual que
 * Soltec 2.0 (misma linea que los combos de fecha, del lado derecho).
 *
 * @param {object} props
 * @param {Array<{key:string,label:string,align?:'left'|'right',visibleByDefault?:boolean,format?:Function}>} props.columns
 * @param {Array<object>} props.rows
 * @param {number} [props.maxHeight] - alto maximo en px antes de scroll interno (para tablas largas)
 * @param {(fila:object) => string} [props.rowClassName] - clase extra por fila (ej. resaltar canceladas)
 * @param {boolean} [props.expandible] - si true, cada fila se puede abrir/cerrar
 * @param {(fila:object) => string|number} [props.filaId] - identificador unico de cada fila (requerido si expandible=true); por defecto usa el indice
 * @param {(fila:object) => React.ReactNode} [props.renderContenidoExpandido] - que mostrar dentro de la fila abierta (requerido si expandible=true); la vista decide que pedir y como pintarlo, esta tabla solo maneja el abrir/cerrar
 */
function TablaReporte({ columns, rows, maxHeight, rowClassName, expandible, filaId, renderContenidoExpandido }) {
  const [columnasVisibles, setColumnasVisibles] = useState(
    () => new Set(columns.filter((c) => c.visibleByDefault !== false).map((c) => c.key))
  );
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [filasAbiertas, setFilasAbiertas] = useState(new Set());
  const [ordenColumna, setOrdenColumna] = useState(null);
  const [ordenAsc, setOrdenAsc] = useState(true);
  const menuRef = useRef(null);

  useEffect(() => {
    function alHacerClickFuera(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuAbierto(false);
    }
    document.addEventListener('mousedown', alHacerClickFuera);
    return () => document.removeEventListener('mousedown', alHacerClickFuera);
  }, []);

  const columnasFiltradas = useMemo(
    () => columns.filter((c) => columnasVisibles.has(c.key)),
    [columns, columnasVisibles]
  );

  function alternarColumna(key) {
    setColumnasVisibles((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(key)) {
        if (siguiente.size === 1) return prev; // nunca dejar la tabla sin columnas
        siguiente.delete(key);
      } else {
        siguiente.add(key);
      }
      return siguiente;
    });
  }

  function alternarFila(id) {
    setFilasAbiertas((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  }

  /**
   * Ordena por el valor CRUDO de la columna (fila[key]), no por el
   * texto ya formateado -- asi un monto ordena numericamente aunque se
   * muestre como "$1,234.00", y una fecha-INT (yyyyMMdd) ordena
   * cronologicamente aunque se muestre como "dd/mm/aaaa".
   */
  function alHacerClickHeader(key) {
    if (ordenColumna === key) {
      setOrdenAsc((v) => !v);
    } else {
      setOrdenColumna(key);
      setOrdenAsc(true);
    }
  }

  const filasOrdenadas = useMemo(() => {
    if (!ordenColumna) return rows;
    const copia = [...rows];
    copia.sort((a, b) => {
      const va = a[ordenColumna];
      const vb = b[ordenColumna];
      let cmp;
      if (typeof va === 'number' && typeof vb === 'number') {
        cmp = va - vb;
      } else if (va !== '' && vb !== '' && va != null && vb != null && !Number.isNaN(Number(va)) && !Number.isNaN(Number(vb))) {
        cmp = Number(va) - Number(vb);
      } else {
        cmp = String(va ?? '').localeCompare(String(vb ?? ''), 'es');
      }
      return ordenAsc ? cmp : -cmp;
    });
    return copia;
  }, [rows, ordenColumna, ordenAsc]);

  return (
    <div className="sp-tabla-reporte">
      <div className="sp-tabla-reporte__toolbar">
        <div className="sp-tabla-reporte__columnas" ref={menuRef}>
          <button type="button" className="sp-tabla-reporte__btn" onClick={() => setMenuAbierto((v) => !v)}>
            <IconoColumnas />
            Columnas
          </button>
          {menuAbierto && (
            <div className="sp-tabla-reporte__columnas-menu">
              {columns.map((c) => (
                <label key={c.key} className="sp-tabla-reporte__columna-item">
                  <input type="checkbox" checked={columnasVisibles.has(c.key)} onChange={() => alternarColumna(c.key)} />
                  {c.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="sp-tabla-reporte__scroll" style={maxHeight ? { maxHeight } : undefined}>
        <table className="sp-tabla-reporte__tabla">
          <thead>
            <tr>
              {expandible && <th className="sp-tabla-reporte__celda-expandir-header" aria-hidden="true" />}
              {columnasFiltradas.map((c) => (
                <th
                  key={c.key}
                  className={`sp-tabla-reporte__th ${c.align === 'left' ? 'sp-tabla-reporte__celda--left' : ''}`}
                  onClick={() => alHacerClickHeader(c.key)}
                  title="Ordenar"
                >
                  {c.label}
                  <span className={`sp-tabla-reporte__orden-icono ${ordenColumna === c.key ? 'sp-tabla-reporte__orden-icono--activo' : ''}`}>
                    {ordenColumna === c.key ? (ordenAsc ? '▲' : '▼') : '↕'}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filasOrdenadas.map((fila, i) => {
              const id = expandible ? (filaId ? filaId(fila) : i) : null;
              const abierta = expandible && filasAbiertas.has(id);

              return (
                <Fragment key={id ?? i}>
                  <tr
                    className={[rowClassName ? rowClassName(fila) : '', expandible ? 'sp-tabla-reporte__fila--clickeable' : '']
                      .filter(Boolean)
                      .join(' ')}
                    onClick={expandible ? () => alternarFila(id) : undefined}
                  >
                    {expandible && (
                      <td className="sp-tabla-reporte__celda-expandir">
                        <span className={`sp-tabla-reporte__chevron-fila ${abierta ? 'sp-tabla-reporte__chevron-fila--open' : ''}`}>
                          ▸
                        </span>
                      </td>
                    )}
                    {columnasFiltradas.map((c) => (
                      <td key={c.key} className={c.align === 'left' ? 'sp-tabla-reporte__celda--left' : undefined}>
                        {c.format ? c.format(fila[c.key], fila) : fila[c.key]}
                      </td>
                    ))}
                  </tr>
                  {abierta && (
                    <tr className="sp-tabla-reporte__fila-expandida">
                      <td colSpan={columnasFiltradas.length + 1}>{renderContenidoExpandido(fila)}</td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TablaReporte;
