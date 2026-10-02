export const sucursalVsVendedorTourSteps = [
  {
    intro: 'Este reporte cruza sucursal y vendedor: cada combinación tiene su propio total de venta neta.',
  },
  {
    element: '.sp-filtro-rango-fecha',
    intro: 'Elige el rango de fechas y da clic en la lupa para consultar. El botón "Exportar" (a la derecha) descarga en PDF, Excel o CSV.',
    position: 'bottom',
  },
  {
    element: '.sp-svv-filtros',
    intro: 'Filtra por una sucursal, un vendedor, o ambos -- la tabla y los indicadores se ajustan solo a lo que elijas.',
    position: 'bottom',
  },
  {
    element: '.sp-tabla-reporte',
    intro: 'Detalle completo por sucursal y vendedor: venta neta, tickets, promedio por nota y descuentos. El botón "Columnas" te deja elegir cuáles ver.',
    position: 'top',
  },
  {
    element: '.sp-tabla-reporte__celda-expandir-header',
    intro: 'Da clic en cualquier fila para ver, sin salir de la tabla, la venta de ese vendedor día por día en esa sucursal.',
    position: 'right',
  },
];

export default sucursalVsVendedorTourSteps;
