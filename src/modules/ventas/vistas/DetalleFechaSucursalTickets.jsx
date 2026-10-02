import { useEffect, useState } from 'react';
import ventasService from '../services/ventasService';
import TablaAnidada from '../../../components/common/TablaAnidada';
import LoadingState from '../../../components/common/LoadingState';
import EmptyState from '../../../components/common/EmptyState';

const formatoMoneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
const formatoEntero = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

const COLUMNAS_TICKETS = [
  { key: 'Folio', label: 'Folio', align: 'left' },
  { key: 'Vendedor', label: 'Vendedor', align: 'left' },
  { key: 'FormaPago', label: 'Forma pago', align: 'left' },
  { key: 'Total', label: 'Total', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'Cancelada', label: 'Estatus', align: 'left', format: (v) => (v ? 'Cancelada' : 'Vigente') }
];

const COLUMNAS_ARTICULOS = [
  { key: 'Producto', label: 'Producto', align: 'left' },
  { key: 'Cantidad', label: 'Cant.', format: (v) => formatoEntero.format(v || 0) },
  { key: 'PrecioUnitario', label: 'P. unitario', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'ImporteDescuento', label: 'Descuento', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'ImporteIva', label: 'IVA', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'ImporteTotal', label: 'Total', format: (v) => formatoMoneda.format(v || 0) }
];

/** 'yyyyMMdd' (INT, lo que regresa usp_ReportesCargaPorFechaSucursalVendedor) -> 'yyyy-MM-dd' (DATE, lo que espera Detalle Ticket). */
function fechaKeyAIso(fechaKey) {
  const texto = String(fechaKey);
  return `${texto.slice(0, 4)}-${texto.slice(4, 6)}-${texto.slice(6, 8)}`;
}

/** Agrupa las lineas de producto de Detalle Ticket por Folio, tomando el total ya calculado por el backend (TotalVenta) en vez de volver a sumar renglon por renglon. */
function agruparPorFolio(filas) {
  const porFolio = new Map();
  filas.forEach((f) => {
    if (!porFolio.has(f.Folio)) {
      porFolio.set(f.Folio, {
        Folio: f.Folio,
        Vendedor: f.Vendedor,
        FormaPago: f.FormaPago,
        Cancelada: f.Cancelada,
        Total: Number(f.TotalVenta) || 0
      });
    }
  });
  return [...porFolio.values()].sort((a, b) => b.Total - a.Total);
}

/**
 * Contenido de la fila expandida en "Por Sucursal": los tickets de ese
 * dia+sucursal (nivel 2), y dentro de cada ticket, sus articulos
 * (nivel 3). Reutiliza usp_Reporte_DetalleTicket -- no hace falta un
 * endpoint nuevo.
 */
function DetalleFechaSucursalTickets({ claveSimi, fechaKey }) {
  const [estado, setEstado] = useState({ cargando: true, error: null, filas: [] });

  useEffect(() => {
    let cancelado = false;
    const fechaIso = fechaKeyAIso(fechaKey);

    ventasService
      .obtenerDetalleTicket({ fechaInicial: fechaIso, fechaFinal: fechaIso, sucursales: [claveSimi] })
      .then((r) => {
        if (!cancelado) setEstado({ cargando: false, error: null, filas: r.data || [] });
      })
      .catch((err) => {
        if (!cancelado) {
          setEstado({ cargando: false, error: err.response?.data?.message || 'No se pudo cargar los tickets.', filas: [] });
        }
      });

    return () => {
      cancelado = true;
    };
  }, [claveSimi, fechaKey]);

  if (estado.cargando) return <LoadingState label="Cargando tickets..." />;
  if (estado.error) return <EmptyState title="No se pudo cargar" message={estado.error} tone="error" />;
  if (estado.filas.length === 0) {
    return <EmptyState title="Sin datos" message="No hay tickets registrados ese día en esta sucursal." />;
  }

  const tickets = agruparPorFolio(estado.filas);

  return (
    <TablaAnidada
      columns={COLUMNAS_TICKETS}
      rows={tickets}
      expandible
      filaId={(t) => t.Folio}
      renderContenidoExpandido={(t) => {
        const articulos = estado.filas.filter((f) => f.Folio === t.Folio);
        return <TablaAnidada columns={COLUMNAS_ARTICULOS} rows={articulos} />;
      }}
    />
  );
}

export default DetalleFechaSucursalTickets;
