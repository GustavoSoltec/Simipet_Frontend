import { Fragment, useState } from 'react';
import './TablaAnidada.css';

/**
 * Tabla compacta para el contenido de una fila expandida (drill-down
 * inline). A proposito NO tiene caja/borde ni boton de exportar/
 * columnas propios -- vive dentro de la fila expandida de TablaReporte
 * (o de otra TablaAnidada, para un segundo nivel), que ya trae su
 * propio fondo.
 *
 * Puede ser expandible ella misma (expandible/filaId/
 * renderContenidoExpandido, mismo contrato que TablaReporte) para
 * armar un segundo nivel de detalle -- ej. Productos: Fecha+Sucursal
 * (TablaReporte) -> Vendedor (esta tabla) -> Articulos (otra
 * TablaAnidada dentro de esta).
 *
 * @param {object} props
 * @param {Array<{key:string,label:string,align?:'left'|'right',format?:Function}>} props.columns
 * @param {Array<object>} props.rows
 * @param {boolean} [props.expandible]
 * @param {(fila:object) => string|number} [props.filaId]
 * @param {(fila:object) => React.ReactNode} [props.renderContenidoExpandido]
 */
function TablaAnidada({ columns, rows, expandible, filaId, renderContenidoExpandido }) {
  const [filasAbiertas, setFilasAbiertas] = useState(new Set());

  function alternarFila(id) {
    setFilasAbiertas((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  }

  return (
    <div className="sp-tabla-anidada">
      <table className="sp-tabla-anidada__tabla">
        <thead>
          <tr>
            {expandible && <th className="sp-tabla-anidada__celda-expandir-header" aria-hidden="true" />}
            {columns.map((c) => (
              <th key={c.key} className={c.align === 'left' ? 'sp-tabla-anidada__celda--left' : undefined}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((fila, i) => {
            const id = expandible ? (filaId ? filaId(fila) : i) : null;
            const abierta = expandible && filasAbiertas.has(id);

            return (
              <Fragment key={id ?? i}>
                <tr
                  className={expandible ? 'sp-tabla-anidada__fila--clickeable' : undefined}
                  onClick={expandible ? () => alternarFila(id) : undefined}
                >
                  {expandible && (
                    <td className="sp-tabla-anidada__celda-expandir">
                      <span className={`sp-tabla-anidada__chevron-fila ${abierta ? 'sp-tabla-anidada__chevron-fila--open' : ''}`}>
                        ▸
                      </span>
                    </td>
                  )}
                  {columns.map((c) => (
                    <td key={c.key} className={c.align === 'left' ? 'sp-tabla-anidada__celda--left' : undefined}>
                      {c.format ? c.format(fila[c.key], fila) : fila[c.key]}
                    </td>
                  ))}
                </tr>
                {abierta && (
                  <tr className="sp-tabla-anidada__fila-expandida">
                    <td colSpan={columns.length + 1}>{renderContenidoExpandido(fila)}</td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default TablaAnidada;
