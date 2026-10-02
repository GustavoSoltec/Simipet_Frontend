export const inventarioDetalleTourSteps = [
  {
    intro: 'Este reporte muestra la existencia y el valor del inventario por sucursal, a una fecha de corte.',
  },
  {
    element: '.sp-filtro-fecha-unica',
    intro: 'Aquí eliges una sola fecha de corte, no un rango. El botón "Exportar" (a la derecha) descarga en PDF, Excel o CSV.',
    position: 'bottom',
  },
  {
    element: '.sp-inv-detalle__filtros',
    intro: 'Filtra por una sucursal en específico si quieres ver solo la suya.',
    position: 'bottom',
  },
  {
    element: '.sp-tabla-reporte',
    intro: 'Cada fila es una sucursal. Da clic para ver, sin salir de la tabla, el detalle de sus productos.',
    position: 'top',
  },
];

export default inventarioDetalleTourSteps;
