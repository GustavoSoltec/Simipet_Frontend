import './PieChart.css';

// Paleta consistente con el acento azul de la app, mas variantes para
// distinguir varias porciones. Mismo criterio sin libreria externa que
// LineChart/BarChart.
const COLORES = ['#2B7DC4', '#3FA65B', '#E8920C', '#2199B0', '#C7402F', '#8456CE', '#4C6B8A', '#B0902B', '#5CA8E0', '#6FB18A'];

const RADIO = 80;
const CENTRO = 100;
const MAX_PORCIONES = 8;

function formatearValorPorDefecto(valor) {
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(valor);
}

function construirPath(anguloInicio, anguloFin, esCompleto) {
  if (esCompleto) {
    return `M ${CENTRO - RADIO} ${CENTRO} A ${RADIO} ${RADIO} 0 1 1 ${CENTRO + RADIO} ${CENTRO} A ${RADIO} ${RADIO} 0 1 1 ${CENTRO - RADIO} ${CENTRO} Z`;
  }
  const rad = Math.PI / 180;
  const x1 = CENTRO + RADIO * Math.cos(rad * anguloInicio);
  const y1 = CENTRO + RADIO * Math.sin(rad * anguloInicio);
  const x2 = CENTRO + RADIO * Math.cos(rad * anguloFin);
  const y2 = CENTRO + RADIO * Math.sin(rad * anguloFin);
  const granArco = anguloFin - anguloInicio > 180 ? 1 : 0;
  return `M ${CENTRO} ${CENTRO} L ${x1} ${y1} A ${RADIO} ${RADIO} 0 ${granArco} 1 ${x2} ${y2} Z`;
}

/**
 * @param {object} props
 * @param {Array<{label: string, value: number}>} props.data
 * @param {(valor: number) => string} [props.formatValue]
 * @param {string} [props.emptyMessage]
 * @param {boolean} [props.mostrarMontoEnLeyenda] - si true, la leyenda muestra el monto ademas del porcentaje
 * @param {(etiqueta: string) => string} [props.resolverEtiqueta] - opcional, para mostrar algo mas completo al pasar el mouse (ej. nombre real de la sucursal cuando la etiqueta es solo la clave)
 */
function PieChart({
  data,
  formatValue = formatearValorPorDefecto,
  emptyMessage = 'No hay datos para graficar.',
  mostrarMontoEnLeyenda = false,
  resolverEtiqueta
}) {
  if (!data || data.length === 0) {
    return <div className="sp-piechart sp-piechart--empty">{emptyMessage}</div>;
  }

  const positivos = data.filter((d) => d.value > 0).sort((a, b) => b.value - a.value);

  // Si hay demasiadas porciones, las mas chicas se agrupan en "Otros"
  // para que la grafica siga siendo legible; la tabla de la vista
  // siempre trae el detalle completo por separado.
  const principales = positivos.slice(0, MAX_PORCIONES);
  const resto = positivos.slice(MAX_PORCIONES);
  const totalResto = resto.reduce((acc, d) => acc + d.value, 0);
  const datosFinales = totalResto > 0 ? [...principales, { label: 'Otros', value: totalResto }] : principales;

  const total = datosFinales.reduce((acc, d) => acc + d.value, 0);
  const obtenerEtiquetaCompleta = resolverEtiqueta || ((etiqueta) => etiqueta);

  let anguloAcumulado = -90;
  const segmentos = datosFinales.map((d, i) => {
    const proporcion = total > 0 ? d.value / total : 0;
    const anguloInicio = anguloAcumulado;
    const anguloFin = anguloAcumulado + proporcion * 360;
    anguloAcumulado = anguloFin;
    return {
      ...d,
      proporcion,
      color: COLORES[i % COLORES.length],
      path: construirPath(anguloInicio, anguloFin, proporcion >= 0.999)
    };
  });

  return (
    <div className="sp-piechart">
      <svg viewBox="0 0 200 200" className="sp-piechart__svg">
        {segmentos.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} className="sp-piechart__segmento">
            <title>{`${obtenerEtiquetaCompleta(s.label)}: ${formatValue(s.value)} (${(s.proporcion * 100).toFixed(1)}%)`}</title>
          </path>
        ))}
        <circle cx={CENTRO} cy={CENTRO} r={38} className="sp-piechart__hueco" />
      </svg>
      <ul className="sp-piechart__leyenda">
        {segmentos.map((s, i) => (
          <li key={i} className="sp-piechart__leyenda-item">
            <span className="sp-piechart__leyenda-color" style={{ background: s.color }} />
            <span className="sp-piechart__leyenda-label" title={obtenerEtiquetaCompleta(s.label)}>
              {s.label}
            </span>
            {mostrarMontoEnLeyenda && <span className="sp-piechart__leyenda-monto">{formatValue(s.value)}</span>}
            <span className="sp-piechart__leyenda-valor">{(s.proporcion * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PieChart;
