import './SelectorCantidad.css';

/**
 * Muchos clientes tienen pocos vendedores/productos -- este selector
 * deja elegir cuantos registros mostrar en vez de un numero fijo.
 */
function SelectorCantidad({ valor, onCambiar, opciones = [3, 5, 10, 15] }) {
  return (
    <select className="sp-selector-cantidad" value={valor} onChange={(e) => onCambiar(Number(e.target.value))}>
      {opciones.map((o) => (
        <option key={o} value={o}>
          Top {o}
        </option>
      ))}
    </select>
  );
}

export default SelectorCantidad;
