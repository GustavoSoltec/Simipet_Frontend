/** Agrupa las filas diarias (formato 'dd-MM-yyyy' en Fecha) por mes, sumando venta neta y tickets. */
export function agruparPorMes(filasDiarias) {
  const grupos = new Map();
  filasDiarias.forEach((f) => {
    const [, mm, yyyy] = f.Fecha.split('-');
    const clave = `${yyyy}-${mm}`;
    const actual = grupos.get(clave) || { VentaNeta: 0, TcksNetos: 0 };
    actual.VentaNeta += Number(f.VentaNeta) || 0;
    actual.TcksNetos += Number(f.TcksNetos) || 0;
    grupos.set(clave, actual);
  });
  return grupos;
}

/** Filas diarias de un mes especifico ('yyyy-MM'), ordenadas cronologicamente. */
export function filasDelMes(filasDiarias, mesClave) {
  return filasDiarias
    .filter((f) => {
      const [, mm, yyyy] = f.Fecha.split('-');
      return `${yyyy}-${mm}` === mesClave;
    })
    .sort((a, b) => {
      const [da, ma, ya] = a.Fecha.split('-').map(Number);
      const [db, mb, yb] = b.Fecha.split('-').map(Number);
      return new Date(ya, ma - 1, da) - new Date(yb, mb - 1, db);
    });
}
