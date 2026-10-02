import { useEffect, useState } from 'react';
import ventasService from '../services/ventasService';
import TablaAnidada from '../../../components/common/TablaAnidada';
import LoadingState from '../../../components/common/LoadingState';
import EmptyState from '../../../components/common/EmptyState';

const formatoMoneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
const formatoEntero = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

/**
 * Compara nombres de vendedor de forma tolerante -- distintos SP arman
 * el nombre desde columnas CHAR de ancho fijo en SQL Server, y pueden
 * traer espacios extra o dobles entre palabras aunque sea "el mismo"
 * nombre. Comparar con === exacto aqui causaba que el desglose se
 * viera vacio para vendedores que si tenian venta.
 */
function normalizarNombre(nombre) {
  return String(nombre || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

/** El SP regresa Fecha como INT yyyyMMdd (a diferencia de Acumulado por Fecha, que la regresa ya formateada como texto). */
function formatearFechaKey(fechaKey) {
  const texto = String(fechaKey);
  return `${texto.slice(6, 8)}/${texto.slice(4, 6)}/${texto.slice(0, 4)}`;
}

const COLUMNAS = [
  { key: 'Fecha', label: 'Fecha', align: 'left', format: (v) => formatearFechaKey(v) },
  { key: 'VentaNeta', label: 'Venta neta', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'TcksNetos', label: 'Tickets', format: (v) => formatoEntero.format(v || 0) },
  { key: 'PromedioXNota', label: 'Promedio x nota', format: (v) => formatoMoneda.format(v || 0) }
];

/**
 * Contenido de la fila expandida en "Por Sucursal vs Vendedor" y "Por
 * Vendedor": la venta de un vendedor especifico, dia por dia.
 *
 * Reutiliza dbo.usp_ReportesCargaPorFechaSucursalVendedor (Fecha x
 * Sucursal x Vendedor) -- no hace falta un endpoint nuevo. El backend
 * solo filtra por sucursal, no por vendedor, asi que el filtro por
 * vendedor se hace aqui, del lado del cliente.
 *
 * @param {string} vendedor - nombre del vendedor a filtrar
 * @param {string} [claveSimi] - si se da, acota la consulta a una sola sucursal (usado desde "Por Sucursal vs Vendedor", donde la fila ya es sucursal+vendedor). Si se omite, trae todas las sucursales del usuario y SUMA por dia (usado desde "Por Vendedor", donde la fila es el vendedor sin importar en que sucursal vendio).
 */
function DetalleVendedorPorDia({ vendedor, claveSimi, fechaInicial, fechaFinal }) {
  const [estado, setEstado] = useState({ cargando: true, error: null, filas: [] });

  useEffect(() => {
    let cancelado = false;
    const params = { fechaInicial, fechaFinal };
    if (claveSimi) params.sucursales = [claveSimi];

    ventasService
      .obtenerPorSucursalDetalle(params)
      .then((r) => {
        if (cancelado) return;

        const filtradas = (r.data || []).filter((fila) => normalizarNombre(fila.Vendedor) === normalizarNombre(vendedor));

        // Si no se acoto a una sucursal, el mismo vendedor puede aparecer
        // en varias sucursales el mismo dia -- se suma por Fecha para
        // que quede un solo renglon por dia (igual que en Acumulado por
        // Fecha, donde el total tambien es la suma de todas las
        // sucursales).
        const porFecha = new Map();
        filtradas.forEach((fila) => {
          const actual = porFecha.get(fila.Fecha) || { VentaNeta: 0, TcksNetos: 0 };
          porFecha.set(fila.Fecha, {
            VentaNeta: actual.VentaNeta + (Number(fila.VentaNeta) || 0),
            TcksNetos: actual.TcksNetos + (Number(fila.TcksNetos) || 0)
          });
        });

        const filas = [...porFecha.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([fecha, totales]) => ({
            Fecha: fecha,
            VentaNeta: totales.VentaNeta,
            TcksNetos: totales.TcksNetos,
            PromedioXNota: totales.TcksNetos > 0 ? totales.VentaNeta / totales.TcksNetos : 0
          }));

        setEstado({ cargando: false, error: null, filas });
      })
      .catch((err) => {
        if (!cancelado) {
          setEstado({ cargando: false, error: err.response?.data?.message || 'No se pudo cargar el desglose.', filas: [] });
        }
      });

    return () => {
      cancelado = true;
    };
  }, [vendedor, claveSimi, fechaInicial, fechaFinal]);

  if (estado.cargando) return <LoadingState label="Cargando desglose por día..." />;
  if (estado.error) return <EmptyState title="No se pudo cargar el desglose" message={estado.error} tone="error" />;
  if (estado.filas.length === 0) {
    return <EmptyState title="Sin datos" message="No hay ventas registradas para este vendedor en el rango." />;
  }

  return <TablaAnidada columns={COLUMNAS} rows={estado.filas} />;
}

export default DetalleVendedorPorDia;
