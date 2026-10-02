export const porSucursalTourSteps = [
  {
    intro: 'Este reporte muestra la venta de cada sucursal, día por día.',
  },
  {
    element: '.sp-filtro-rango-fecha',
    intro: 'Elige el rango de fechas y da clic en la lupa para consultar. El botón "Exportar" (a la derecha) descarga en PDF, Excel o CSV.',
    position: 'bottom',
  },
  {
    element: '.sp-tabla-reporte',
    intro: 'Cada fila es un día y una sucursal. Da clic para ver, sin salir de la tabla, los tickets de ese día en esa sucursal.',
    position: 'top',
  },
  {
    element: '.sp-tabla-reporte__celda-expandir-header',
    intro: 'Y dentro de cada ticket, puedes volver a expandir para ver los artículos que se vendieron.',
    position: 'right',
  },
];

export default porSucursalTourSteps;
