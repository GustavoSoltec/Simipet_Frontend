export const porVendedorTourSteps = [
  {
    intro: 'Este reporte compara la venta neta total de cada vendedor, sumando todas sus sucursales, en el rango que elijas.',
  },
  {
    element: '.sp-filtro-rango-fecha',
    intro: 'Elige el rango de fechas y da clic en la lupa para consultar. También puedes ocultar los vendedores sin venta, y el botón "Exportar" (a la derecha) descarga en PDF, Excel o CSV.',
    position: 'bottom',
  },
  {
    element: '.sp-por-vendedor__filtros',
    intro: 'Filtra por un vendedor en específico si quieres ver solo el suyo.',
    position: 'bottom',
  },
  {
    element: '.sp-tabla-reporte',
    intro: 'Detalle por vendedor: venta neta, tickets, promedio por nota, descuentos, venta base de comisión y venta con premio. El botón "Columnas" te deja elegir cuáles ver.',
    position: 'top',
  },
  {
    element: '.sp-tabla-reporte__celda-expandir-header',
    intro: 'Da clic en cualquier vendedor para ver, sin salir de la tabla, su venta día por día (sumando todas sus sucursales).',
    position: 'right',
  },
];

export default porVendedorTourSteps;
