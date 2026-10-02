import { useMemo, useState } from 'react';
import { useDashboardData } from '../DashboardDataContext';
import { claveYNombreSucursal } from '../../../services/authService';
import PieChart from '../../../components/common/PieChart';
import TablaAnidada from '../../../components/common/TablaAnidada';
import LoadingState from '../../../components/common/LoadingState';
import EmptyState from '../../../components/common/EmptyState';
import ToggleVista from './ToggleVista';
import './RankingHorizontal.css';
import './WidgetPanel.css';

const formatoMoneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });

const COLUMNAS_TABLA = [
  { key: 'Sucursal', label: 'Sucursal', align: 'left', format: (v, fila) => claveYNombreSucursal(fila.ClaveSimi) || v },
  { key: 'VentaNeta', label: 'Venta neta', format: (v) => formatoMoneda.format(v || 0) }
];

/**
 * Reutiliza el mismo encabezado de color / marco que RankingHorizontal
 * (sp-ranking__header, sp-ranking__toolbar) para que se vea homologado
 * con Top vendedores / Artículos más vendidos / etc, aunque este widget
 * no use RankingHorizontal por dentro (trae su propia gráfica de
 * pastel, no barras).
 */
function WidgetParticipacionSucursal() {
  const { meses, mesSeleccionado, porSucursalMes } = useDashboardData();
  const [vista, setVista] = useState('grafica');

  const etiquetaMes = meses.find((m) => m.clave === mesSeleccionado)?.etiqueta || '';
  const datos = useMemo(
    () => porSucursalMes.filas.map((f) => ({ label: claveYNombreSucursal(f.ClaveSimi), value: Number(f.VentaNeta) || 0 })),
    [porSucursalMes.filas]
  );
  const totalVentaMes = useMemo(() => datos.reduce((acc, d) => acc + d.value, 0), [datos]);

  return (
    <div className="sp-ranking">
      <div className="sp-ranking__header sp-ranking__header--blue">Participación por sucursal — {etiquetaMes}</div>

      <div className="sp-ranking__toolbar">
        <div style={{ marginLeft: 'auto' }}>
          <ToggleVista vista={vista} onCambiar={setVista} />
        </div>
      </div>

      <div className="sp-ranking__body">
        {!porSucursalMes.cargando && !porSucursalMes.error && (
          <div className="sp-widget-participacion__total">
            Venta total del mes: <strong>{formatoMoneda.format(totalVentaMes)}</strong>
          </div>
        )}

        {porSucursalMes.cargando && <LoadingState label="Cargando..." />}
        {!porSucursalMes.cargando && porSucursalMes.error && (
          <EmptyState title="No se pudo cargar" message={porSucursalMes.error} tone="error" />
        )}
        {!porSucursalMes.cargando && !porSucursalMes.error && vista === 'grafica' && (
          <PieChart
            data={datos}
            formatValue={(v) => formatoMoneda.format(v)}
            mostrarMontoEnLeyenda
            emptyMessage="Sin ventas ese mes."
          />
        )}
        {!porSucursalMes.cargando && !porSucursalMes.error && vista === 'tabla' && (
          <TablaAnidada columns={COLUMNAS_TABLA} rows={[...porSucursalMes.filas].sort((a, b) => (b.VentaNeta || 0) - (a.VentaNeta || 0))} />
        )}
      </div>
    </div>
  );
}

export default WidgetParticipacionSucursal;
