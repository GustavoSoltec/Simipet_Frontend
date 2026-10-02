export const sucursalDetalleTourSteps = [
  {
    intro: 'Este reporte muestra la venta por día y sucursal; al expandir, ves el desglose por vendedor.',
  },
  {
    element: '.sp-filtro-rango-fecha',
    intro: 'Elige el rango de fechas y da clic en la lupa para consultar. También puedes ocultar los días sin venta, y el botón "Exportar" (a la derecha) descarga en PDF, Excel o CSV.',
    position: 'bottom',
  },
  {
    element: '.sp-sd-filtros',
    intro: 'Filtra por una sucursal, un vendedor, o ambos -- la tabla y los indicadores se ajustan solo a lo que elijas.',
    position: 'bottom',
  },
  {
    element: '.sp-tabla-reporte',
    intro: 'Cada fila es un día y una sucursal. Da clic para ver, sin salir de la tabla, cuánto vendió cada vendedor ese día.',
    position: 'top',
  },
];

export default sucursalDetalleTourSteps;
