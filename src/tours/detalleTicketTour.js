export const detalleTicketTourSteps = [
  {
    intro: 'Este reporte muestra el detalle línea por línea de cada ticket de venta: un renglón por producto vendido.',
  },
  {
    element: '.sp-filtro-rango-fecha',
    intro: 'Elige el rango de fechas y da clic en la lupa para consultar. El botón "Exportar" (a la derecha) descarga en PDF, Excel o CSV.',
    position: 'bottom',
  },
  {
    element: '.sp-campo-busqueda',
    intro: 'Puedes buscar por folio, producto, vendedor o sucursal dentro de lo que ya se consultó.',
    position: 'bottom',
  },
  {
    element: '.sp-tabla-reporte',
    intro: 'Los tickets cancelados se marcan en rojo. La tabla tiene su propio scroll porque puede traer muchas filas, y el botón "Columnas" te deja elegir cuáles ver.',
    position: 'top',
  },
];

export default detalleTicketTourSteps;
