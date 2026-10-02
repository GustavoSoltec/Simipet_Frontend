import './BarChart.css';

// Grafica de barras para comparar un valor entre categorias (ej. venta
// neta por vendedor). SVG a mano, sin libreria externa.

const ALTURA_VIEWBOX = 260;
const ANCHO_VIEWBOX = 720;
const PADDING = { top: 20, right: 20, bottom: 46, left: 44 };
const MAX_BARRAS_VISIBLES = 12;
const NUM_LINEAS_GRID = 4;

function formatearValorPorDefecto(valor) {
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(valor);
}

function formatearValorEje(valor) {
  if (Math.abs(valor) >= 1000000) return `${(valor / 1000000).toFixed(1)}M`;
  if (Math.abs(valor) >= 1000) return `${(valor / 1000).toFixed(0)}K`;
  return String(Math.round(valor));
}

/**
 * @param {object} props
 * @param {Array<{label: string, value: number}>} props.data
 * @param {(valor: number) => string} [props.formatValue]
 * @param {string} [props.emptyMessage]
 */
function BarChart({ data, formatValue = formatearValorPorDefecto, emptyMessage = 'No hay datos para graficar.' }) {
  if (!data || data.length === 0) {
    return <div className="sp-barchart sp-barchart--empty">{emptyMessage}</div>;
  }

  const datosOrdenados = [...data].sort((a, b) => b.value - a.value);
  const datosVisibles = datosOrdenados.slice(0, MAX_BARRAS_VISIBLES);
  const seOmitieron = datosOrdenados.length > MAX_BARRAS_VISIBLES;

  const anchoUtil = ANCHO_VIEWBOX - PADDING.left - PADDING.right;
  const altoUtil = ALTURA_VIEWBOX - PADDING.top - PADDING.bottom;

  const valorMax = Math.max(...datosVisibles.map((d) => d.value), 0);
  const anchoBarra = anchoUtil / datosVisibles.length;
  const anchoBarraReal = anchoBarra * 0.6;

  const lineasGrid = Array.from({ length: NUM_LINEAS_GRID + 1 }, (_, i) => {
    const y = PADDING.top + (altoUtil / NUM_LINEAS_GRID) * i;
    const valor = valorMax - (valorMax / NUM_LINEAS_GRID) * i;
    return { y, valor };
  });

  return (
    <div className="sp-barchart">
      <svg viewBox={`0 0 ${ANCHO_VIEWBOX} ${ALTURA_VIEWBOX}`} className="sp-barchart__svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="sp-barchart-gradiente" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--sp-blue-500)" />
            <stop offset="100%" stopColor="var(--sp-blue-700)" />
          </linearGradient>
        </defs>

        {lineasGrid.map((g, i) => (
          <g key={i}>
            <line x1={PADDING.left} y1={g.y} x2={ANCHO_VIEWBOX - PADDING.right} y2={g.y} className="sp-barchart__grid" />
            <text x={PADDING.left - 8} y={g.y + 3} className="sp-barchart__eje-label">
              {formatearValorEje(g.valor)}
            </text>
          </g>
        ))}

        {datosVisibles.map((d, i) => {
          const alturaBarra = valorMax > 0 ? (d.value / valorMax) * altoUtil : 0;
          const x = PADDING.left + i * anchoBarra + (anchoBarra - anchoBarraReal) / 2;
          const y = PADDING.top + altoUtil - alturaBarra;

          return (
            <g key={i}>
              <rect x={x} y={y} width={anchoBarraReal} height={alturaBarra} className="sp-barchart__barra" rx={4}>
                <title>{`${d.label}: ${formatValue(d.value)}`}</title>
              </rect>
              <text
                x={x + anchoBarraReal / 2}
                y={ALTURA_VIEWBOX - 28}
                className="sp-barchart__label"
                transform={`rotate(-35, ${x + anchoBarraReal / 2}, ${ALTURA_VIEWBOX - 28})`}
              >
                {d.label.length > 14 ? `${d.label.slice(0, 13)}…` : d.label}
              </text>
            </g>
          );
        })}
      </svg>
      {seOmitieron && (
        <p className="sp-barchart__nota">
          Mostrando las {MAX_BARRAS_VISIBLES} con mayor valor. La tabla de abajo trae el detalle completo.
        </p>
      )}
    </div>
  );
}

export default BarChart;
