import { useState } from 'react';
import EmptyState from '../../../components/common/EmptyState';
import TablaAnidada from '../../../components/common/TablaAnidada';
import './RankingHorizontal.css';

const OPCIONES_CANTIDAD = [3, 5, 10, 15];

function formatearValorPorDefecto(valor) {
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(valor);
}

/**
 * Ranking horizontal, mismo formato que Soltec 2.0: encabezado de
 * color, Top 3/5/10/15 como botones, y un toggle Gráfica/Tabla -- en
 * modo Gráfica se ven barras horizontales (etiqueta + barra + valor),
 * en modo Tabla se ve una tabla real de varias columnas (via
 * TablaAnidada), no solo etiqueta+valor.
 *
 * @param {object} props
 * @param {string} props.titulo
 * @param {'green'|'red'|'blue'|'teal'} [props.tono]
 * @param {Array<object>} props.filas - filas crudas, ya ordenadas como se quieren mostrar (desc para "top", asc para "menor")
 * @param {string} props.campoEtiqueta - key del campo a usar como etiqueta en la grafica (ej. 'Vendedor')
 * @param {string} props.campoValor - key del campo numerico a graficar (ej. 'VentaNeta')
 * @param {Array<{key:string,label:string,align?:'left'|'right',format?:Function}>} props.columnasTabla - columnas para el modo Tabla
 * @param {(valor:number) => string} [props.formatValue]
 * @param {string} [props.emptyMessage]
 * @param {boolean} [props.permitirExcluirCeros]
 * @param {{etiqueta: string, filtro: (fila:object) => boolean}} [props.opcionExtra] - checkbox generico opcional (ej. "Excluir Servicios"); cuando esta activo, solo se muestran las filas para las que filtro(fila) regresa true
 */
function RankingHorizontal({
  titulo,
  tono = 'blue',
  filas,
  campoEtiqueta,
  campoValor,
  columnasTabla,
  formatValue = formatearValorPorDefecto,
  emptyMessage = 'No hay datos.',
  permitirExcluirCeros = false,
  opcionExtra = null
}) {
  const [cantidad, setCantidad] = useState(5);
  const [vista, setVista] = useState('grafica');
  const [excluirCeros, setExcluirCeros] = useState(false);
  const [opcionExtraActiva, setOpcionExtraActiva] = useState(false);

  let filasBase = excluirCeros ? filas.filter((f) => (f[campoValor] || 0) !== 0) : filas;
  if (opcionExtra && opcionExtraActiva) {
    filasBase = filasBase.filter(opcionExtra.filtro);
  }
  const filasVisibles = filasBase.slice(0, cantidad);
  const valorMax = Math.max(...filasVisibles.map((f) => Number(f[campoValor]) || 0), 1);

  return (
    <div className="sp-ranking">
      <div className={`sp-ranking__header sp-ranking__header--${tono}`}>{titulo}</div>

      <div className="sp-ranking__toolbar">
        <div className="sp-ranking__pills">
          {OPCIONES_CANTIDAD.map((n) => (
            <button
              key={n}
              type="button"
              className={`sp-ranking__pill ${cantidad === n ? 'sp-ranking__pill--activo' : ''}`}
              onClick={() => setCantidad(n)}
            >
              Top {n}
            </button>
          ))}
        </div>

        {permitirExcluirCeros && (
          <label className="sp-ranking__checkbox">
            <input type="checkbox" checked={excluirCeros} onChange={(e) => setExcluirCeros(e.target.checked)} />
            Excluir venta en $0
          </label>
        )}

        {opcionExtra && (
          <label className="sp-ranking__checkbox">
            <input type="checkbox" checked={opcionExtraActiva} onChange={(e) => setOpcionExtraActiva(e.target.checked)} />
            {opcionExtra.etiqueta}
          </label>
        )}

        <div className="sp-ranking__vista">
          <button
            type="button"
            className={`sp-ranking__vista-btn ${vista === 'tabla' ? 'sp-ranking__vista-btn--activo' : ''}`}
            onClick={() => setVista('tabla')}
          >
            Tabla
          </button>
          <button
            type="button"
            className={`sp-ranking__vista-btn ${vista === 'grafica' ? 'sp-ranking__vista-btn--activo' : ''}`}
            onClick={() => setVista('grafica')}
          >
            Gráfica
          </button>
        </div>
      </div>

      <div className="sp-ranking__body">
        {filasVisibles.length === 0 ? (
          <EmptyState title="Sin datos" message={emptyMessage} />
        ) : vista === 'tabla' ? (
          <TablaAnidada columns={columnasTabla} rows={filasVisibles} />
        ) : (
          <ul className="sp-ranking__lista">
            {filasVisibles.map((f, i) => {
              const valor = Number(f[campoValor]) || 0;
              return (
                <li key={i} className="sp-ranking__fila">
                  <span className="sp-ranking__label" title={f[campoEtiqueta]}>
                    {f[campoEtiqueta]}
                  </span>
                  <span className="sp-ranking__barra-riel">
                    <span
                      className={`sp-ranking__barra sp-ranking__barra--${tono}`}
                      style={{ width: `${(valor / valorMax) * 100}%` }}
                    />
                  </span>
                  <span className="sp-ranking__valor">{formatValue(valor)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default RankingHorizontal;
