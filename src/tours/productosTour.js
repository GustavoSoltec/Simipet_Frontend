export const productosTourSteps = [
  {
    intro: 'Este reporte muestra la venta de productos, agrupada por día y sucursal.',
  },
  {
    element: '.sp-filtro-rango-fecha',
    intro: 'Elige el rango de fechas y da clic en la lupa para consultar. El botón "Exportar" (a la derecha) descarga en PDF, Excel o CSV.',
    position: 'bottom',
  },
  {
    element: '.sp-productos__filtros',
    intro: 'Filtra por una sucursal, un vendedor, o ambos -- la tabla y los indicadores se ajustan solo a lo que elijas.',
    position: 'bottom',
  },
  {
    element: '.sp-tabla-reporte',
    intro: 'Cada fila es un día y una sucursal. Da clic para ver, sin salir de la tabla, cuánto vendió cada vendedor ese día.',
    position: 'top',
  },
  {
    element: '.sp-tabla-reporte__celda-expandir-header',
    intro: 'Y dentro de cada vendedor, puedes volver a expandir para ver los artículos que vendió.',
    position: 'right',
  },
];

export default productosTourSteps;
