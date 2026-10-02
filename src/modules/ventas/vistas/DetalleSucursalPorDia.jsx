import { useEffect, useState } from 'react';
import ventasService from '../services/ventasService';
import TablaAnidada from '../../../components/common/TablaAnidada';
import LoadingState from '../../../components/common/LoadingState';
import EmptyState from '../../../components/common/EmptyState';

const formatoMoneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
const formatoEntero = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

const COLUMNAS = [
  { key: 'Fecha', label: 'Fecha', align: 'left' },
  { key: 'VentaNeta', label: 'Venta neta', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'TcksNetos', label: 'Tickets', format: (v) => formatoEntero.format(v || 0) },
  { key: 'PromedioXNota', label: 'Promedio x nota', format: (v) => formatoMoneda.format(v || 0) }
];

/**
 * Contenido de la fila expandida en Por Sucursal: como se compuso la
 * venta neta de esa sucursal, dia por dia, en el mismo rango que ya
 * esta consultado. Reutiliza el mismo endpoint que "Acumulado por
 * Fecha" (usp_ReportesCargaAcumuladoFecha), filtrado a una sola
 * sucursal -- no hace falta un endpoint nuevo.
 */
function DetalleSucursalPorDia({ claveSimi, fechaInicial, fechaFinal }) {
  const [estado, setEstado] = useState({ cargando: true, error: null, filas: [] });

  useEffect(() => {
    let cancelado = false;

    ventasService
      .obtenerAcumuladoFecha({ fechaInicial, fechaFinal, sucursales: [claveSimi] })
      .then((r) => {
        if (!cancelado) setEstado({ cargando: false, error: null, filas: r.data || [] });
      })
      .catch((err) => {
        if (!cancelado) {
          setEstado({ cargando: false, error: err.response?.data?.message || 'No se pudo cargar el desglose.', filas: [] });
        }
      });

    return () => {
      cancelado = true;
    };
  }, [claveSimi, fechaInicial, fechaFinal]);

  if (estado.cargando) return <LoadingState label="Cargando desglose por día..." />;
  if (estado.error) return <EmptyState title="No se pudo cargar el desglose" message={estado.error} tone="error" />;
  if (estado.filas.length === 0) {
    return <EmptyState title="Sin datos" message="No hay ventas registradas para esta sucursal en el rango." />;
  }

  return <TablaAnidada columns={COLUMNAS} rows={estado.filas} />;
}

export default DetalleSucursalPorDia;
