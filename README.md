[simipet-portal-documentacion.md](https://github.com/user-attachments/files/32975826/simipet-portal-documentacion.md)
# Portal Simipet — Documentación técnica

Este documento explica cómo está armado el portal (frontend) de Simipet:
su stack tecnológico, y qué endpoint de la API consume cada pantalla.
Está pensado para que alguien que solo tiene acceso a este repositorio
entienda de qué está hecho, sin necesitar el repo del backend.

> El backend (Simipet-api) que esta app consume vive en un repositorio
> separado. Su propia documentación técnica explica, endpoint por
> endpoint, a qué stored procedure llama y cómo funciona por dentro --
> aquí solo nos importa qué pantalla usa qué endpoint y cómo está armada
> la interfaz.

---

## 1. Qué es

Portal web de Simipet: dashboard, reportes de Ventas e Inventarios, y un
módulo de Administración (catálogos). Es una SPA (Single Page
Application) -- una vez compilada, son puros archivos estáticos
(HTML/CSS/JS) que se sirven desde Nginx, sin ningún proceso de Node
corriendo en producción.

Consume una única API (Simipet-api), cuya URL base se configura en
`VITE_API_BASE_URL` (ver sección 11).

---

## 2. Stack tecnológico

| Pieza | Qué es | Para qué se usa |
|---|---|---|
| **React 18** | Librería de UI | Construir las pantallas como componentes |
| **Vite** | Build tool | Servidor de desarrollo + compilación a archivos estáticos |
| **React Router v6** | Ruteo del lado del cliente | Navegación entre módulos sin recargar la página |
| **Axios** | Cliente HTTP | Todas las llamadas a Simipet-api |
| **Context API** (nativo de React) | Manejo de estado global | Sesión del usuario (`AuthContext`), datos del Dashboard (`DashboardDataContext`) |
| **CSS plano** (un archivo `.css` por componente) | Estilos | Sin framework de CSS (no Tailwind/Bootstrap) |
| **xlsx / jspdf / jspdf-autotable** | Exportación | Botón "Exportar" de cada reporte (Excel/PDF/CSV) |
| **intro.js** | Tours guiados | El recorrido de ayuda de cada pantalla |
| **localStorage** | Persistencia local | Token de sesión, catálogo de sucursales, tema del sidebar, layout del Dashboard |

No hay SSR ni backend-for-frontend -- todo el estado vive en el navegador.

---

## 3. Estructura del proyecto

```
simipet/
  index.html
  vite.config.js
  .env.example
  src/
    main.jsx
    App.jsx
    config/
      env.js                  <- unico lugar que lee variables de entorno
    context/
      AuthContext.jsx          <- sesion del usuario
    services/
      apiClient.js             <- Axios + interceptor de token
      authService.js           <- login/logout
      auditService.js          <- registro de uso (modulo, accion)
      errorService.js          <- captura de errores
    router/
      AppRoutes.jsx             <- todas las rutas de la app
      ProtectedRoute.jsx        <- exige sesion activa
    components/
      layout/                  <- Sidebar, Layout, Header
      common/                  <- Panel, TablaReporte, TablaAnidada,
                                   FiltroRangoFecha, FiltroFechaUnica,
                                   CatalogoCrud, graficas, etc.
    modules/
      ventas/                   <- 7 reportes
      inventarios/              <- 2 reportes
      administracion/           <- Usuarios, Empresas, Sucursales
    pages/
      Login.jsx
      Dashboard.jsx
      dashboard/                <- widgets, contexto de datos del dashboard
    tours/                      <- pasos del recorrido guiado, por ruta
```

---

## 4. Autenticación (del lado del portal)

- `Login.jsx` llama a `authService.login({ username, password })`, que
  hace `POST /api/v1/simipet-auth/login`.
- El token que regresa se guarda en `localStorage` (`simipet_token`), así
  como el catálogo de sucursales de la empresa
  (`simipet_sucursales_catalogo`) -- este último se usa para traducir
  claves de sucursal a nombres en varias pantallas.
- `apiClient.js` tiene un interceptor de Axios que agrega
  `Authorization: Bearer <token>` a toda petición saliente, sin que cada
  servicio tenga que hacerlo manualmente.
- `AuthContext.jsx` expone el usuario actual (`idUsuario`, `idEmpresa`,
  `idPerfil`, `nombre`) a toda la app.
- `ProtectedRoute.jsx` redirige a `/login` si no hay sesión.
- Según `idPerfil`: 1 (operativo) ve Dashboard/Ventas/Inventarios en el
  sidebar; 2 y 3 (administrador) ven solo Administración -- esto se decide
  en `Sidebar.jsx` y en `AppRoutes.jsx` (a dónde redirige "/").

---

## 5. Dashboard — qué endpoints consume

El Dashboard es un panel de widgets, no un reporte único. Toda la carga de
datos vive en `pages/dashboard/DashboardDataContext.jsx`, para que los
widgets no dupliquen peticiones:

| Dato | Endpoint | Notas |
|---|---|---|
| 6 meses de venta diaria (Venta neta/Tickets por mes, Tendencia) | `GET /ventas/acumulado-fecha` | Se pide una sola vez, partido en ventanas de 90 días (el backend limita a 92) |
| Participación por sucursal | `GET /ventas/por-sucursal` | Se vuelve a pedir cada vez que cambia el mes seleccionado |
| Top / Bottom vendedores | `GET /ventas/por-vendedor` | Igual, por mes seleccionado |
| Artículos más vendidos | `GET /ventas/productos` | Igual, por mes seleccionado |
| Inventario por sucursal (widget) | `GET /inventarios/valuacion` + `GET /inventarios/detalle` | Fotografía de ayer, no depende del mes elegido |

El layout (qué widgets están, en qué orden, ocultos o no) se guarda en
`localStorage`, no en el backend.

---

## 6. Ventas — 7 reportes, endpoints que consume cada uno

Todas viven en `src/modules/ventas/`, consumen
`services/ventasService.js`:

| Vista | Endpoint |
|---|---|
| Acumulado por Fecha | `GET /ventas/acumulado-fecha` |
| Por Sucursal | `GET /ventas/por-sucursal-detalle` (agrupado por Fecha+Sucursal en el navegador; el drill-down a tickets usa `GET /ventas/detalle-ticket`) |
| Por Sucursal vs Vendedor | `GET /ventas/por-sucursal-vendedor` |
| Por Vendedor | `GET /ventas/por-vendedor` (el drill-down usa `GET /ventas/por-sucursal-detalle`) |
| Por Sucursal detalle | `GET /ventas/por-sucursal-detalle` |
| Productos | `GET /ventas/productos` |
| Detalle Ticket | `GET /ventas/detalle-ticket` |

Todas comparten: `Panel` (tarjeta con acento de color), `FiltroRangoFecha`
(Desde/Hasta + búsqueda + exportar), `TablaReporte` (orden por columna,
selector de columnas visibles), `TablaAnidada` (detalle inline al
expandir una fila).

---

## 7. Inventarios — 2 reportes

Viven en `src/modules/inventarios/`, consumen
`services/inventariosService.js`:

| Vista | Endpoint |
|---|---|
| Detalle | `GET /inventarios/detalle` |
| Valuación | `GET /inventarios/valuacion` (además cruza con `GET /inventarios/detalle` para calcular SKU's y % de participación) |

Ambas usan `FiltroFechaUnica` (una sola fecha de corte, no un rango) --
por default, la fecha de ayer, para asegurar que ya haya información
cargada.

---

## 8. Administración — 3 catálogos, mismos endpoints genéricos

Viven en `src/modules/administracion/`, las 3 vistas (Usuarios, Empresas,
Sucursales) usan el mismo componente compartido `CatalogoCrud.jsx`, que
consume:

```
GET    /simipet-catalogo/:catalogo/columnas
GET    /simipet-catalogo/:catalogo
POST   /simipet-catalogo/:catalogo
PUT    /simipet-catalogo/:catalogo/:id
DELETE /simipet-catalogo/:catalogo/:id
```

donde `:catalogo` es `empresas`, `sucursales`, o `usuarios`. El componente
no conoce de antemano las columnas -- las pide al backend y arma la tabla
y el formulario dinámicamente. Solo visible/usable para perfiles 2 y 3
(administrador).

Sucursales se agrupa por Empresa; Usuarios se agrupa por tipo de perfil
(Clientes = perfil 1, Administradores = perfil 2 y 3) -- el agrupado es
100% del lado del cliente, sobre los mismos datos que regresa el `GET`
normal.

---

## 9. Manejo de errores

- Cada módulo está envuelto en un `ErrorBoundary`
  (`components/common/ErrorBoundary.jsx`) -- si algo truena al
  renderizar, se ve un mensaje controlado ("Algo salió mal") en vez de
  una pantalla en blanco.
- En desarrollo (`VITE_APP_ENV != production`), ese mensaje también
  muestra el error y el stack completo en pantalla, para diagnosticar sin
  depender de la consola del navegador.
- Todo error capturado se manda también a `errorService.js`, que lo
  reporta a un endpoint de auditoría/errores centralizado (ver nota en la
  sección 10).

---

## 10. Nota importante: auditoría y errores van a otro backend

`auditService.js` y `errorService.js` no le pegan a Simipet-api -- le
pegan a un endpoint genérico de Soltec2 (`/api/v1/auditoria/eventos` y
similar), para tener un registro centralizado de uso/errores de toda la
plataforma Soltec2, no solo Simipet. Esto es intencional, pero implica que
esa URL debe ser alcanzable desde donde sea que corra el portal, o esas
llamadas simplemente van a fallar en silencio (no rompen la app, solo no
se registra el evento).

---

## 11. Variables de entorno (`.env`)

Ver `.env.example` en la raíz del proyecto. Las dos que importan:

```dotenv
VITE_API_BASE_URL=https://api.simipet.tudominio.com
VITE_APP_ENV=production
```

Importante: Vite "hornea" estas variables dentro de los archivos
compilados en el momento del build -- si cambia la URL del backend
después de compilar, hay que volver a correr `npm run build`, no basta
con reiniciar nada.

---

## 12. Despliegue

Node 20 solo para compilar (`npm run build` genera `dist/`), Nginx sirve
esos archivos estáticos directo -- no hay ningún proceso de Node
corriendo en producción para el portal. Ver el manual de despliegue
específico de este repositorio para el paso a paso completo (incluye la
configuración de Nginx con `try_files` para que el ruteo de React
funcione al refrescar una página interna).
