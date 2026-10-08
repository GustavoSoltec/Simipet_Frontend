import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Punto unico de exportacion para todas las tablas de reportes. Las 3
// funciones reciben lo mismo: filas crudas (arreglo de objetos), las
// columnas ya visibles (para exportar exactamente lo que el usuario ve
// en pantalla, no mas), y el nombre de archivo sin extension.
//
// columns: [{ key, label, format?: (valor, fila) => string }]

/** Aplica el format() de cada columna (si existe) para obtener el valor tal como se exporta -- texto plano, sin JSX. */
function extraerFilasPlanas(rows, columns) {
  return rows.map((fila) =>
    columns.map((col) => {
      const valor = fila[col.key];
      if (col.exportFormat) return col.exportFormat(valor, fila);
      if (col.format) return col.format(valor, fila);
      return valor ?? '';
    })
  );
}

const ANCHO_MAXIMO_COLUMNA = 60;

/** Ancho de cada columna (en caracteres) segun su texto mas largo, encabezado incluido, con un margen y un tope. */
function calcularAnchosColumnas(datos) {
  return datos[0].map((_, i) => {
    const maximo = datos.reduce((acc, fila) => Math.max(acc, String(fila[i] ?? '').length), 0);
    return { wch: Math.min(maximo + 2, ANCHO_MAXIMO_COLUMNA) };
  });
}

export function exportarExcel(rows, columns, fileName) {
  const datos = [columns.map((c) => c.label), ...extraerFilasPlanas(rows, columns)];
  const hoja = XLSX.utils.aoa_to_sheet(datos);
  hoja['!cols'] = calcularAnchosColumnas(datos);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Datos');
  XLSX.writeFile(libro, `${fileName}.xlsx`);
}

function escaparCeldaCsv(valor) {
  return `"${String(valor ?? '').replace(/"/g, '""')}"`;
}

export function exportarCSV(rows, columns, fileName) {
  const encabezado = columns.map((c) => escaparCeldaCsv(c.label)).join(',');
  const filas = extraerFilasPlanas(rows, columns).map((fila) => fila.map(escaparCeldaCsv).join(','));
  // \uFEFF (BOM) para que Excel abra el CSV con acentos correctos.
  const contenido = '\uFEFF' + [encabezado, ...filas].join('\r\n');
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportarPDF(rows, columns, fileName, titulo) {
  // Horizontal cuando hay muchas columnas, para que no se encimen.
  const doc = new jsPDF({ orientation: columns.length > 6 ? 'landscape' : 'portrait' });

  doc.setFontSize(13);
  doc.text(titulo || fileName, 14, 15);

  autoTable(doc, {
    startY: 20,
    head: [columns.map((c) => c.label)],
    body: extraerFilasPlanas(rows, columns),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [43, 125, 196] },
    alternateRowStyles: { fillColor: [248, 250, 252] }
  });

  doc.save(`${fileName}.pdf`);
}
