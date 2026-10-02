import './LineChart.css';

// Grafica de linea para series de tiempo cortas (ej. venta neta por dia
// en un rango de hasta ~90 dias). SVG a mano, sin libreria externa.

const ALTURA_VIEWBOX = 240;
const ANCHO_VIEWBOX = 720;
const PADDING = { top: 20, right: 20, bottom: 32, left: 44 };
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
function LineChart({ data, formatValue = formatearValorPorDefecto, emptyMessage = 'No hay datos para graficar.' }) {
  if (!data || data.length === 0) {
    return <div className="sp-linechart sp-linechart--empty">{emptyMessage}</div>;
  }

  const anchoUtil = ANCHO_VIEWBOX - PADDING.left - PADDING.right;
  const altoUtil = ALTURA_VIEWBOX - PADDING.top - PADDING.bottom;

  const valores = data.map((d) => d.value);
  const valorMax = Math.max(...valores, 0);
  const valorMin = Math.min(...valores, 0);
  const rango = valorMax - valorMin || 1;

  const puntos = data.map((d, i) => {
    const x = PADDING.left + (data.length === 1 ? anchoUtil / 2 : (i / (data.length - 1)) * anchoUtil);
    const y = PADDING.top + altoUtil - ((d.value - valorMin) / rango) * altoUtil;
    return { ...d, x, y };
  });

  const lineaPath = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${lineaPath} L ${puntos[puntos.length - 1].x} ${PADDING.top + altoUtil} L ${puntos[0].x} ${PADDING.top + altoUtil} Z`;

  const lineasGrid = Array.from({ length: NUM_LINEAS_GRID + 1 }, (_, i) => {
    const y = PADDING.top + (altoUtil / NUM_LINEAS_GRID) * i;
    const valor = valorMax - ((valorMax - valorMin) / NUM_LINEAS_GRID) * i;
    return { y, valor };
  });

  // Mostrar como mucho ~8 etiquetas en el eje X para que no se amontonen.
  const pasoEtiquetas = Math.max(1, Math.ceil(puntos.length / 8));

  return (
    <div className="sp-linechart">
      <svg viewBox={`0 0 ${ANCHO_VIEWBOX} ${ALTURA_VIEWBOX}`} className="sp-linechart__svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="sp-linechart-gradiente" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--sp-blue-600)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--sp-blue-600)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {lineasGrid.map((g, i) => (
          <g key={i}>
            <line x1={PADDING.left} y1={g.y} x2={ANCHO_VIEWBOX - PADDING.right} y2={g.y} className="sp-linechart__grid" />
            <text x={PADDING.left - 8} y={g.y + 3} className="sp-linechart__eje-label">
              {formatearValorEje(g.valor)}
            </text>
          </g>
        ))}

        <path d={areaPath} fill="url(#sp-linechart-gradiente)" stroke="none" />
        <path d={lineaPath} className="sp-linechart__linea" />

        {puntos.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2.8} className="sp-linechart__punto">
            <title>{`${p.label}: ${formatValue(p.value)}`}</title>
          </circle>
        ))}
        {puntos.map(
          (p, i) =>
            (i % pasoEtiquetas === 0 || i === puntos.length - 1) && (
              <text key={`label-${i}`} x={p.x} y={ALTURA_VIEWBOX - 10} className="sp-linechart__label">
                {p.label}
              </text>
            )
        )}
      </svg>
    </div>
  );
}

export default LineChart;
