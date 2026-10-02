import { useState } from 'react';
import { exportarExcel, exportarCSV, exportarPDF } from '../../utils/exportUtils';
import './BotonExportar.css';

function DocIcon({ color, tag }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 2.5h8l4.5 4.5V20a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4.5 20V4A1.5 1.5 0 0 1 6 2.5Z"
        fill={color}
        opacity="0.12"
      />
      <path
        d="M6 2.5h8l4.5 4.5V20a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4.5 20V4A1.5 1.5 0 0 1 6 2.5Z"
        stroke={color}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M14 2.5V7h4.5" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
      <rect x="3.2" y="13.6" width="15.6" height="6.6" rx="1.3" fill={color} />
      <text x="11" y="18.5" fontSize="6" fontWeight="700" fill="#fff" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif">
        {tag}
      </text>
    </svg>
  );
}

const PdfIcon = () => <DocIcon color="var(--sp-red-600)" tag="PDF" />;
const ExcelIcon = () => <DocIcon color="var(--sp-green-600)" tag="XLS" />;
const CsvIcon = () => <DocIcon color="var(--sp-blue-600)" tag="CSV" />;

/**
 * Boton de exportar (PDF/Excel/CSV), en la misma linea que el filtro de
 * fecha -- igual criterio visual que Soltec 2.0. Siempre exporta TODAS
 * las columnas definidas por la vista (no solo las visibles en
 * pantalla vía el boton "Columnas" de TablaReporte); son dos controles
 * independientes a propósito.
 *
 * @param {object} props
 * @param {Array<{key:string,label:string,format?:Function,exportFormat?:Function}>} props.columns
 * @param {Array<object>} props.rows
 * @param {string} props.fileName - nombre de archivo sin extension
 * @param {string} [props.titulo] - titulo mostrado en el PDF exportado
 */
function BotonExportar({ columns, rows, fileName, titulo }) {
  const [abierto, setAbierto] = useState(false);

  function exportar(tipo) {
    setAbierto(false);
    if (tipo === 'excel') exportarExcel(rows, columns, fileName);
    else if (tipo === 'csv') exportarCSV(rows, columns, fileName);
    else if (tipo === 'pdf') exportarPDF(rows, columns, fileName, titulo);
  }

  return (
    <div className="sp-boton-exportar">
      <button type="button" className="sp-boton-exportar__btn" onClick={() => setAbierto((v) => !v)}>
        Exportar
        <span className={`sp-boton-exportar__chevron ${abierto ? 'sp-boton-exportar__chevron--open' : ''}`}>▾</span>
      </button>
      {abierto && (
        <>
          <div className="sp-boton-exportar__scrim" onClick={() => setAbierto(false)} />
          <div className="sp-boton-exportar__menu">
            <button type="button" onClick={() => exportar('pdf')}>
              <PdfIcon />
              PDF
            </button>
            <button type="button" onClick={() => exportar('excel')}>
              <ExcelIcon />
              Excel
            </button>
            <button type="button" onClick={() => exportar('csv')}>
              <CsvIcon />
              CSV
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default BotonExportar;
