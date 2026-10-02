import { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useDashboardData } from '../DashboardDataContext';
import { filasDelMes } from '../dashboardUtils';
import TablaAnidada from '../../../components/common/TablaAnidada';
import LoadingState from '../../../components/common/LoadingState';
import EmptyState from '../../../components/common/EmptyState';
import ToggleVista from './ToggleVista';
import './WidgetPanel.css';

const formatoMoneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
const formatoEntero = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

const COLUMNAS_TABLA = [
  { key: 'Fecha', label: 'Fecha', align: 'left' },
  { key: 'VentaNeta', label: 'Venta neta', format: (v) => formatoMoneda.format(v || 0) },
  { key: 'TcksNetos', label: 'Tickets', format: (v) => formatoEntero.format(v || 0) }
];

function acortarFecha(fecha) {
  return fecha ? fecha.slice(0, 5).replace('-', '/') : fecha;
}

/** Compacta montos grandes en el eje ($45,000 -> $45K) -- mas facil de leer de un vistazo que el numero completo. */
function formatoCompacto(valor) {
  if (Math.abs(valor) >= 1000) return `$${(valor / 1000).toFixed(0)}K`;
  return `$${valor}`;
}

function TooltipPersonalizado({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="sp-tendencia-tooltip">
      <p className="sp-tendencia-tooltip__fecha">{label}</p>
      <p className="sp-tendencia-tooltip__valor">{formatoMoneda.format(payload[0].value)}</p>
    </div>
  );
}

function WidgetTendencia() {
  const { meses, mesSeleccionado, acumulado6Meses } = useDashboardData();
  const [vista, setVista] = useState('grafica');

  const etiquetaMes = meses.find((m) => m.clave === mesSeleccionado)?.etiqueta || '';
  const filasMes = useMemo(() => filasDelMes(acumulado6Meses.filas, mesSeleccionado), [acumulado6Meses.filas, mesSeleccionado]);
  const datosGrafica = useMemo(
    () => filasMes.map((f) => ({ fecha: acortarFecha(f.Fecha), venta: Number(f.VentaNeta) || 0 })),
    [filasMes]
  );

  return (
    <div className="sp-widget-panel">
      <div className="sp-widget-panel__header">
        <h3 className="sp-widget-panel__titulo">Tendencia de venta — {etiquetaMes}</h3>
        <div className="sp-widget-panel__controles">
          <ToggleVista vista={vista} onCambiar={setVista} />
        </div>
      </div>

      {acumulado6Meses.cargando && <LoadingState label="Cargando..." />}
      {!acumulado6Meses.cargando && acumulado6Meses.error && (
        <EmptyState title="No se pudo cargar" message={acumulado6Meses.error} tone="error" />
      )}
      {!acumulado6Meses.cargando && !acumulado6Meses.error && datosGrafica.length === 0 && (
        <EmptyState title="Sin datos" message="Sin ventas ese mes." />
      )}
      {!acumulado6Meses.cargando && !acumulado6Meses.error && datosGrafica.length > 0 && vista === 'grafica' && (
        <div className="sp-tendencia-grafica">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={datosGrafica} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="sp-tendencia-gradiente" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--sp-blue-600)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--sp-blue-600)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--sp-border-soft)" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: 'var(--sp-text-500)' }} axisLine={{ stroke: 'var(--sp-border)' }} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--sp-text-500)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatoCompacto}
                width={48}
              />
              <Tooltip content={<TooltipPersonalizado />} />
              <Area type="monotone" dataKey="venta" stroke="var(--sp-blue-600)" strokeWidth={2} fill="url(#sp-tendencia-gradiente)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      {!acumulado6Meses.cargando && !acumulado6Meses.error && vista === 'tabla' && (
        <TablaAnidada columns={COLUMNAS_TABLA} rows={filasMes} />
      )}
    </div>
  );
}

export default WidgetTendencia;
