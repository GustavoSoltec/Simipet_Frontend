// Tour de ayuda del Dashboard: no explica datos del dashboard en si
// (todavia es un placeholder), sino la estructura general de la app,
// que es lo primero que ve cualquier usuario nuevo al iniciar sesion.
// Los selectores apuntan a elementos del layout (Sidebar/Header) que
// existen en todas las paginas, no solo en el Dashboard.
export const dashboardTourSteps = [
  {
    intro:
      'Bienvenido a Simipet. Este recorrido rápido te muestra las partes principales de la aplicación.',
  },
  {
    element: '.sp-sidebar__nav',
    intro:
      'Aquí está el menú principal. Cada grupo de reportes (como Ventas o Inventarios) se puede expandir para ver sus opciones.',
    position: 'right',
  },
  {
    element: '.sp-sidebar__footer',
    intro:
      'Aquí abajo siempre vas a encontrar tu usuario, el acceso a Configuración y el botón para Cerrar sesión.',
    position: 'right',
  },
  {
    element: '.sp-header__title',
    intro: 'El encabezado siempre muestra en qué módulo o pantalla estás parado.',
    position: 'bottom',
  },
  {
    element: '.sp-header__theme-btn',
    intro: 'Con este botón puedes cambiar el menú entre modo claro y modo oscuro.',
    position: 'bottom',
  },
  {
    element: '.sp-header__help-btn',
    intro:
      'Este botón de Ayuda cambia según la pantalla: en cada módulo te explica justo lo que necesitas saber de esa pantalla.',
    position: 'left',
  },
  {
    element: '.sp-layout__content',
    intro: 'Y aquí, en el área principal, es donde vas a trabajar con la información de cada módulo.',
    position: 'top',
  },
];

export default dashboardTourSteps;
