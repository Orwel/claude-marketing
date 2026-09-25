import { pedirGraph } from './cliente.js';
import { config, exigir } from '../config.js';

/**
 * Metricas de Reels en la Graph API v22.
 *
 * Ojo con los renombres de v22: `plays` y `impressions` fueron retirados
 * para reels; ahora se usan `views` y `reach`. Si ves un error de metrica
 * desconocida, es casi siempre esto.
 */
const METRICAS_REEL = [
  'views',
  'reach',
  'likes',
  'comments',
  'shares',
  'saved',
  'total_interactions',
  'ig_reels_avg_watch_time',
  'ig_reels_video_view_total_time',
];

/** Publicaciones recientes de la cuenta, para casar con lo que publicamos. */
export async function listarPublicacionesRecientes(limite = 25) {
  exigir('igUsuario');

  const respuesta = await pedirGraph(`/${config.instagram.usuarioId}/media`, {
    fields: 'id,caption,media_type,media_product_type,permalink,timestamp',
    limit: limite,
  });

  return respuesta?.data ?? [];
}

/** Insights de un medio concreto. */
export async function obtenerInsights(idMedio) {
  const respuesta = await pedirGraph(`/${idMedio}/insights`, {
    metric: METRICAS_REEL.join(','),
  });

  const crudas = Object.fromEntries(
    (respuesta?.data ?? []).map((m) => [m.name, m.values?.[0]?.value ?? 0])
  );

  return { ...crudas, ...derivar(crudas) };
}

/**
 * Las tasas son lo que de verdad se compara entre publicaciones.
 * Un reel con 10k visualizaciones y 1% de guardados rinde peor que
 * uno con 2k y 6%, y solo las tasas lo dejan ver.
 */
function derivar(m) {
  const vistas = m.views || 0;
  const alcance = m.reach || 0;
  const pct = (n, d) => (d > 0 ? Number(((n / d) * 100).toFixed(2)) : null);

  return {
    tasaInteraccion: pct(m.total_interactions || 0, alcance),
    tasaGuardado: pct(m.saved || 0, vistas),
    tasaCompartido: pct(m.shares || 0, vistas),
    segundosMediosVistos: m.ig_reels_avg_watch_time
      ? Number((m.ig_reels_avg_watch_time / 1000).toFixed(1))
      : null,
  };
}

/**
 * Encuentra el medio de Instagram que corresponde a una publicacion nuestra.
 * Blotato no siempre devuelve el id nativo de Instagram, asi que casamos por
 * el inicio del caption, que es estable y unico en la practica.
 */
export async function buscarMedioPorTexto(textoPublicado) {
  const inicio = textoPublicado.slice(0, 60).trim();
  const recientes = await listarPublicacionesRecientes();

  return recientes.find((m) => (m.caption ?? '').trim().startsWith(inicio)) ?? null;
}
