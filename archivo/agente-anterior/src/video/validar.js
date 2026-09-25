/**
 * Requisitos de Instagram Reels que hay que cumplir antes de publicar.
 * Comprobarlos aqui evita el ciclo caro: subir el medio a Blotato,
 * lanzar el post y descubrir el rechazo horas despues.
 */
export const LIMITES_REEL = {
  relacionAspecto: '9:16',
  anchoRecomendado: 1080,
  altoRecomendado: 1920,
  duracionMinSegundos: 5,
  duracionMaxSegundos: 90,
  formatos: ['mp4', 'mov'],
  tamanoMaxMb: 300,
};

/** Valida el guion antes de producir el video. Devuelve una lista de problemas. */
export function validarGuion(guion, tiposVideo) {
  const problemas = [];

  const duracion = guion.duracionEstimadaSegundos;
  if (duracion < LIMITES_REEL.duracionMinSegundos || duracion > LIMITES_REEL.duracionMaxSegundos) {
    problemas.push(
      `Duracion ${duracion}s fuera de rango (${LIMITES_REEL.duracionMinSegundos}-${LIMITES_REEL.duracionMaxSegundos}s)`
    );
  }

  const idsValidos = tiposVideo.map((t) => t.id);
  if (!idsValidos.includes(guion.tipoVideo)) {
    problemas.push(
      `Tipo de video "${guion.tipoVideo}" no existe. Validos: ${idsValidos.join(', ')}`
    );
  }

  if (!guion.guion?.length) {
    problemas.push('El guion no tiene escenas');
  } else {
    const finUltima = Math.max(...guion.guion.map((e) => e.segundoFin));
    if (Math.abs(finUltima - duracion) > 5) {
      problemas.push(
        `Las escenas terminan en ${finUltima}s pero la duracion declarada es ${duracion}s`
      );
    }
  }

  if (!guion.pieDeFoto?.trim()) problemas.push('Falta el pie de foto');
  if (guion.pieDeFoto?.length > 2200) {
    problemas.push(`Pie de foto de ${guion.pieDeFoto.length} caracteres (Instagram corta en 2200)`);
  }

  const hashtags = guion.hashtags ?? [];
  if (hashtags.length > 30) problemas.push(`${hashtags.length} hashtags (Instagram admite 30)`);

  return problemas;
}

/**
 * Valida el fichero de video en si. Lo dejamos declarativo porque la
 * produccion del video todavia es manual (ver TODOs en docs/HANDOFF.md):
 * cuando se automatice, aqui se enchufa ffprobe.
 */
export function validarMedio({ anchoPx, altoPx, duracionSegundos, tamanoMb, formato }) {
  const problemas = [];

  if (anchoPx && altoPx) {
    const relacion = anchoPx / altoPx;
    const esperada = 9 / 16;
    if (Math.abs(relacion - esperada) > 0.02) {
      problemas.push(`Relacion de aspecto ${anchoPx}x${altoPx} no es 9:16`);
    }
  }

  if (
    duracionSegundos &&
    (duracionSegundos < LIMITES_REEL.duracionMinSegundos ||
      duracionSegundos > LIMITES_REEL.duracionMaxSegundos)
  ) {
    problemas.push(`Duracion real ${duracionSegundos}s fuera de rango`);
  }

  if (tamanoMb && tamanoMb > LIMITES_REEL.tamanoMaxMb) {
    problemas.push(`${tamanoMb}MB supera el limite de ${LIMITES_REEL.tamanoMaxMb}MB`);
  }

  if (formato && !LIMITES_REEL.formatos.includes(formato.toLowerCase())) {
    problemas.push(`Formato ${formato} no admitido (usa ${LIMITES_REEL.formatos.join(' o ')})`);
  }

  return problemas;
}
