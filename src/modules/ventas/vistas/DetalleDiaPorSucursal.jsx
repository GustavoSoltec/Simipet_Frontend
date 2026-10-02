import { useEffect, useState } from 'react';
import ventasService from '../services/ventasService';
import { claveYNombreSucursal } from '../../../services/authService';
import TablaAnidada from '../../../components/common/TablaAnidada';
import LoadingState from '../../../components/common/LoadingState';
import EmptyState from '../../../components/common/EmptyState';

const formatoMoneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
const formatoEntero = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

const COLUMNAS = [
  { key: 'Sucursal', label: 'Sucursal', align: 'left', format: (v, fila) => claveYNombreSucursal(fila.ClaveSimi) || v },
  { key: 'VentaNeta', label: 'Venta neta', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'TcksNetos', label: 'Tickets', format: (v) => formatoEntero.format(v || 0) },
  { key: 'PromedioXNota', label: 'Promedio x nota', format: (v) => formatoMoneda.format(v || 0) }
];

/** 'dd-MM-yyyy' (formato que regresa usp_ReportesCargaAcumuladoFecha) -> 'yyyy-MM-dd' (lo que espera el servicio). */
function aFechaIso(fechaDdMmYyyy) {
  const [dd, mm, yyyy] = fechaDdMmYyyy.split('-');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Contenido de la fila expandida en Acumulado por Fecha: como se
 * compuso la venta neta de ese dia, sucursal por sucursal. Reutiliza
 * el mismo endpoint que la vista "Por Sucursal" (usp_ReportesCargaPorSucursal),
 * llamado con Desde=Hasta=ese dia -- no hace falta un endpoint nuevo.
 */
function DetalleDiaPorSucursal({ fecha }) {
  const [estado, setEstado] = useState({ cargando: true, error: null, filas: [] });

  useEffect(() => {
    const fechaIso = aFechaIso(fecha);
    let cancelado = false;

    ventasService
      .obtenerPorSucursal({ fechaInicial: fechaIso, fechaFinal: fechaIso })
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
  }, [fecha]);

  if (estado.cargando) return <LoadingState label="Cargando desglose por sucursal..." />;
  if (estado.error) return <EmptyState title="No se pudo cargar el desglose" message={estado.error} tone="error" />;
  if (estado.filas.length === 0) {
    return <EmptyState title="Sin datos" message="No hay ventas por sucursal registradas ese día." />;
  }

  return <TablaAnidada columns={COLUMNAS} rows={estado.filas} />;
}

export default DetalleDiaPorSucursal;
