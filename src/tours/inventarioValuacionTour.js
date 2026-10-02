export const inventarioValuacionTourSteps = [
  {
    intro: 'Este reporte muestra las existencias y el valor de venta del inventario, totalizado por sucursal, a una fecha de corte.',
  },
  {
    element: '.sp-filtro-fecha-unica',
    intro: 'Aquí eliges una sola fecha de corte, no un rango. El botón "Exportar" (a la derecha) descarga en PDF, Excel o CSV.',
    position: 'bottom',
  },
  {
    element: '.sp-tabla-reporte',
    intro: 'Detalle por sucursal: SKU\'s distintos, existencias, valor de venta, valor promedio por SKU, y qué porcentaje representa del total. El botón "Columnas" te deja elegir cuáles ver.',
    position: 'top',
  },
];

export default inventarioValuacionTourSteps;
