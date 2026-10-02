import WidgetVentaNetaMes from './widgets/WidgetVentaNetaMes';
import WidgetTicketsMes from './widgets/WidgetTicketsMes';
import WidgetResumenMensual from './widgets/WidgetResumenMensual';
import WidgetTendencia from './widgets/WidgetTendencia';
import WidgetParticipacionSucursal from './widgets/WidgetParticipacionSucursal';
import WidgetTopVendedores from './widgets/WidgetTopVendedores';
import WidgetVendedoresBajos from './widgets/WidgetVendedoresBajos';
import WidgetArticulosMasVendidos from './widgets/WidgetArticulosMasVendidos';
import WidgetServiciosMasVendidos from './widgets/WidgetServiciosMasVendidos';
import WidgetInventarioTabla from './widgets/WidgetInventarioTabla';

// Catalogo de widgets disponibles para el Dashboard, en el orden por
// default. Casi todos (excepto Inventario, que es una fotografia de
// HOY) reaccionan al mes que el usuario elija en "Venta neta por mes"
// o "Tickets por mes" -- ver DashboardDataContext.jsx.
//
// "tamano" es solo una pista visual para el CSS (ver Dashboard.css
// .sp-dash__widget--*): "mitad" van de a dos por fila, "completo"
// siempre ocupa todo el ancho.
export const WIDGET_CATALOG = [
  { id: 'venta-neta-mes', titulo: 'Venta neta por mes', tamano: 'mitad', Componente: WidgetVentaNetaMes },
  { id: 'tickets-mes', titulo: 'Tickets y promedio por nota, por mes', tamano: 'mitad', Componente: WidgetTicketsMes },
  { id: 'resumen-mensual', titulo: 'Resumen mensual', tamano: 'completo', Componente: WidgetResumenMensual },
  { id: 'tendencia', titulo: 'Tendencia de venta', tamano: 'completo', Componente: WidgetTendencia },
  { id: 'participacion-sucursal', titulo: 'Participación por sucursal', tamano: 'mitad', Componente: WidgetParticipacionSucursal },
  { id: 'top-vendedores', titulo: 'Top vendedores', tamano: 'mitad', Componente: WidgetTopVendedores },
  { id: 'vendedores-bajos', titulo: 'Vendedores con menor venta', tamano: 'mitad', Componente: WidgetVendedoresBajos },
  { id: 'articulos-mas-vendidos', titulo: 'Artículos más vendidos', tamano: 'mitad', Componente: WidgetArticulosMasVendidos },
  { id: 'servicios-mas-vendidos', titulo: 'Servicios más vendidos', tamano: 'mitad', Componente: WidgetServiciosMasVendidos },
  { id: 'inventario-tabla', titulo: 'Inventario por sucursal (ayer)', tamano: 'completo', Componente: WidgetInventarioTabla }
];

export default WIDGET_CATALOG;
