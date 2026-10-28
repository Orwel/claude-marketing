/**
 * Línea de tiempo de una clase grabada, sin React: la usan el Marco (Remotion) y
 * src/clase/marco.js (que decide qué tramos se animan y cuáles son un cuadro fijo).
 *
 * Todo tiempo de clases/<slug>.json va en SEGUNDOS DEL ARCHIVO CRUDO (lo que muestra la
 * transcripción), no del video editado: así se lee la transcripción y se escribe la pieza
 * sin hacer cuentas. El corte del inicio solo se aplica al armar el MP4.
 */

/** Cuánto dura la animación de cambio de parada (avión que avanza, banda que entra). */
export const SEG_CAMBIO = 2.2;
/** Entrada y salida de una ficha o comentario en el riel. */
export const SEG_ENTRA = 0.8;
export const SEG_SALE = 0.6;

/** Índice de la parada vigente en el segundo t (-1 antes de la primera). */
export function paradaEn(clase, t) {
  let k = -1;
  (clase.paradas ?? []).forEach((p, i) => {
    if (p.desde <= t) k = i;
  });
  return k;
}

/** Fichas y comentarios del riel, en un solo orden: no se pisan porque comparten lugar. */
export function itemsRiel(clase) {
  const fichas = (clase.fichas ?? []).map((f) => ({ ...f, tipo: 'ficha' }));
  const comentarios = (clase.comentarios ?? []).map((c) => ({ ...c, tipo: 'comentario', dura: c.dura ?? 9 }));
  return [...fichas, ...comentarios].sort((a, b) => a.en - b.en);
}

/** El item del riel visible en t, con su progreso de entrada (0→1) y salida (1→0). */
export function itemEn(clase, t) {
  for (const it of itemsRiel(clase)) {
    const fin = it.en + (it.dura ?? 8);
    if (t >= it.en && t < fin) return { it, desde: t - it.en, hasta: fin - t };
  }
  return null;
}

/**
 * Ventanas en que el marco se mueve. Fuera de ellas es idéntico cuadro a cuadro, así que
 * marco.js lo arma con una imagen fija en vez de renderizar miles de cuadros iguales.
 */
export function ventanasAnimadas(clase) {
  const v = [];
  for (const p of clase.paradas ?? []) v.push([p.desde, p.desde + SEG_CAMBIO]);
  for (const it of itemsRiel(clase)) {
    const fin = it.en + (it.dura ?? 8);
    v.push([it.en, it.en + SEG_ENTRA + 0.1]);
    v.push([fin - SEG_SALE - 0.1, fin]);
  }
  v.sort((a, b) => a[0] - b[0]);
  // Unir las que se tocan o quedan a menos de medio segundo.
  const unidas = [];
  for (const w of v) {
    const u = unidas[unidas.length - 1];
    if (u && w[0] <= u[1] + 0.5) u[1] = Math.max(u[1], w[1]);
    else unidas.push([...w]);
  }
  return unidas;
}
