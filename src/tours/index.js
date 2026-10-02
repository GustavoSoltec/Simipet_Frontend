import dashboardTourSteps from './dashboardTour';
import acumuladoFechaTourSteps from './acumuladoFechaTour';
import porSucursalTourSteps from './porSucursalTour';
import sucursalVsVendedorTourSteps from './sucursalVsVendedorTour';
import porVendedorTourSteps from './porVendedorTour';
import sucursalDetalleTourSteps from './sucursalDetalleTour';
import productosTourSteps from './productosTour';
import detalleTicketTourSteps from './detalleTicketTour';
import inventarioDetalleTourSteps from './inventarioDetalleTour';
import inventarioValuacionTourSteps from './inventarioValuacionTour';

// Mapa ruta -> pasos del tour, igual criterio que Soltec 2.0: un tour
// propio por modulo/vista, apuntando a los elementos reales de esa
// pantalla (filtros, grafica, tabla). Para agregar el tour de una vista
// nueva:
//   1. Crear su archivo <vista>Tour.js con los pasos.
//   2. Importarlo y agregar su entrada aqui, con la ruta exacta tal como
//      esta registrada en AppRoutes.jsx/Sidebar.jsx.
// Si una ruta no tiene tour registrado, el boton de Ayuda del Header cae
// en el popover generico ("en construccion") en vez de fallar.
const TOURS_BY_PATH = {
  '/': dashboardTourSteps,

  // Reportes Ventas
  '/ventas/acumulado-fecha': acumuladoFechaTourSteps,
  '/ventas/por-sucursal': porSucursalTourSteps,
  '/ventas/sucursal-vs-vendedor': sucursalVsVendedorTourSteps,
  '/ventas/por-vendedor': porVendedorTourSteps,
  '/ventas/sucursal-detalle': sucursalDetalleTourSteps,
  '/ventas/productos': productosTourSteps,
  '/ventas/detalle-ticket': detalleTicketTourSteps,

  // Reportes Inventarios
  '/inventarios/detalle': inventarioDetalleTourSteps,
  '/inventarios/valuacion': inventarioValuacionTourSteps,
};

export function getTourForPath(pathname) {
  return TOURS_BY_PATH[pathname] ?? null;
}

export default getTourForPath;
