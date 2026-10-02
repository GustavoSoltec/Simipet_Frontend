export const acumuladoFechaTourSteps = [
  {
    intro: 'Este reporte muestra la venta neta acumulada día por día en el rango que elijas.',
  },
  {
    element: '.sp-filtro-rango-fecha',
    intro: 'Elige el rango de fechas y da clic en la lupa para consultar. El botón "Exportar" (a la derecha) descarga en PDF, Excel o CSV.',
    position: 'bottom',
  },
  {
    element: '.sp-tabla-reporte',
    intro: 'Aquí está el detalle completo: venta neta, tickets, promedio por nota, descuentos y devoluciones de cada día. El botón "Columnas" te deja elegir cuáles ver.',
    position: 'top',
  },
  {
    element: '.sp-tabla-reporte__celda-expandir-header',
    intro: 'Da clic en cualquier día para ver, sin salir de la tabla, cómo se compuso ese total sucursal por sucursal.',
    position: 'right',
  },
];

export default acumuladoFechaTourSteps;
