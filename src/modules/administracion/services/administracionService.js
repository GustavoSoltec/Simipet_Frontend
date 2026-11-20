import apiClient from '../../../services/apiClient';

const BASE_PATH = '/api/v1/simipet-catalogo';

/**
 * Perfiles activos del portal (soltec2_PortalPerfiles), ya en el formato
 * de opciones que usa CatalogoCrud para pintar una lista.
 * @returns {Promise<Array<{ valor: number, etiqueta: string }>>}
 */
export async function obtenerOpcionesPerfiles() {
  const { data } = await apiClient.get(`${BASE_PATH}/perfiles`);
  return (data.data || []).map((p) => ({ valor: Number(p.idPerfil), etiqueta: p.perfil }));
}
