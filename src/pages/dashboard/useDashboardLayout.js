import { useCallback, useState } from 'react';

const STORAGE_KEY = 'simipet_dashboard_layout';

/**
 * Recuerda que widgets tiene visibles el usuario en su Dashboard, y en
 * que orden, guardado en localStorage (por navegador/dispositivo, no
 * por sesion ni cuenta -- si el usuario entra desde otra compu, ve el
 * layout por default hasta que lo personalice ahi tambien). Mismo
 * mecanismo que usa Soltec 2.0.
 *
 * El arreglo guardado ES el orden Y la visibilidad a la vez: un widget
 * que no aparece en el arreglo esta oculto. No hay una lista separada
 * de "ocultos" que se pueda desincronizar de la de "visibles".
 *
 * @param {Array<string>} catalogoIds - ids de TODOS los widgets que
 *   existen en el catalogo, en el orden por default.
 */
export function useDashboardLayout(catalogoIds) {
  const [visibles, setVisiblesState] = useState(() => {
    try {
      const guardado = localStorage.getItem(STORAGE_KEY);
      if (!guardado) return catalogoIds;
      const parsed = JSON.parse(guardado);
      if (!Array.isArray(parsed)) return catalogoIds;

      // Si el catalogo cambio desde que se guardo (se quito un widget
      // que ya no existe, o se agrego uno nuevo), esto lo reconcilia:
      // se conservan los ids guardados que siguen siendo validos, y
      // los widgets nuevos se agregan al final (visibles por default).
      const idsValidos = new Set(catalogoIds);
      const conservados = parsed.filter((id) => idsValidos.has(id));
      const nuevos = catalogoIds.filter((id) => !conservados.includes(id));
      return [...conservados, ...nuevos];
    } catch {
      return catalogoIds;
    }
  });

  const persistir = useCallback((nuevoOrden) => {
    setVisiblesState(nuevoOrden);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevoOrden));
    } catch {
      // localStorage lleno o deshabilitado: el layout no se guarda
      // entre sesiones, pero no rompe la vista actual.
    }
  }, []);

  const ocultos = catalogoIds.filter((id) => !visibles.includes(id));

  const agregar = useCallback(
    (id) => {
      if (visibles.includes(id)) return;
      persistir([...visibles, id]);
    },
    [visibles, persistir]
  );

  const quitar = useCallback(
    (id) => {
      persistir(visibles.filter((v) => v !== id));
    },
    [visibles, persistir]
  );

  const reordenar = useCallback(
    (nuevoOrdenIds) => {
      persistir(nuevoOrdenIds);
    },
    [persistir]
  );

  const restaurarDefault = useCallback(() => {
    persistir(catalogoIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistir]);

  return { visibles, ocultos, agregar, quitar, reordenar, restaurarDefault };
}

export default useDashboardLayout;
