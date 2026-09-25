/** '#0090DE' + 0.2 → 'rgba(0,144,222,0.2)'. Las marcas guardan hex; las capas necesitan transparencia. */
export function conAlfa(hex, alfa) {
  const limpio = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(limpio.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${alfa})`;
}

/**
 * Un texto de la pieza puede ser literal o "$campo", que se lee de la variante
 * de la cuenta. Asi la misma escena sirve para todas las cuentas y solo cambian
 * gancho, cierre y CTA, que es exactamente lo que cambia al republicar.
 */
export function resolver(valor, variante) {
  if (typeof valor !== 'string' || !valor.startsWith('$')) return valor;
  const clave = valor.slice(1);
  if (!(clave in variante)) throw new Error(`La variante no tiene el campo "${clave}"`);
  return variante[clave];
}

/**
 * "Hay una *fecha* que..." → [{texto:'Hay', enfasis:false}, {texto:'fecha', enfasis:true}, ...]
 * Los asteriscos marcan lo que la marca resalta; asi el guion decide el enfasis
 * y la marca decide como se ve.
 */
export function partirPalabras(texto) {
  const palabras = [];
  let enfasis = false;
  for (const trozo of texto.split(/(\*)/)) {
    if (trozo === '*') {
      enfasis = !enfasis;
      continue;
    }
    for (const palabra of trozo.split(/\s+/).filter(Boolean)) palabras.push({ texto: palabra, enfasis });
  }
  // sigue: la palabra siguiente tambien va resaltada, para que el resaltado no se corte entre ambas.
  return palabras.map((p, i) => ({
    ...p,
    sigue: p.enfasis && Boolean(palabras[i + 1]?.enfasis),
    previo: p.enfasis && Boolean(palabras[i - 1]?.enfasis),
  }));
}

/** Cuadros que dura una escena. Todo en la pieza se escribe en segundos, que es como piensa un humano. */
export const aCuadros = (segundos, fps) => Math.round(segundos * fps);

/**
 * Cuadros que se solapan dos escenas. El fundido cruzado necesita solape; el
 * barrido no: corta en seco y la franja de color tapa el corte, para que cada
 * escena arranque justo sobre el pulso de la musica.
 */
export const SOLAPE = 10;
export const solapeDe = (pieza) => (pieza.transicion === 'barrido' ? 0 : SOLAPE);

/** Inicio y fin de cada escena en el video completo. Lo usan la plantilla y el sintetizador de audio. */
export function tramosDe(pieza, fps) {
  const solape = solapeDe(pieza);
  let cursor = 0;
  return pieza.escenas.map((escena, i) => {
    const inicio = i === 0 ? 0 : cursor - solape;
    cursor = inicio + aCuadros(escena.segundos, fps);
    return { tipo: escena.tipo, inicio, fin: cursor, escena };
  });
}

/**
 * Aplica el manifiesto de voz a la pieza: cada escena con locucion dura al
 * menos su frase mas medio segundo, redondeado a medio segundo para no romper
 * el pulso. Lo usan la plantilla y la pista, asi ambas cuentan igual.
 */
export function aplicarVoz(pieza, voz) {
  if (!voz) return pieza;
  const escenas = pieza.escenas.map((e, i) => {
    const v = voz.escenas[i];
    return v ? { ...e, segundos: Math.max(e.segundos, Math.ceil((v.duracion + 0.5) * 2) / 2) } : e;
  });
  return { ...pieza, escenas };
}

export function duracionPieza(pieza, fps) {
  return tramosDe(pieza, fps).at(-1).fin;
}

/** Lo que dura la tarjeta de cierre que la plantilla Vertical agrega despues del metraje. */
export const SEGUNDOS_CIERRE = 3.5;

/**
 * Duracion total segun la plantilla: Animado suma escenas; Vertical suma los
 * tramos del metraje y, si la cuenta tiene cierre o CTA, la tarjeta final.
 */
export function duracionDe(pieza, fps, cuenta) {
  if (pieza.plantilla !== 'Vertical') return duracionPieza(pieza, fps);
  const metraje = (pieza.metraje?.segmentos ?? []).reduce((s, x) => s + aCuadros(x.hasta - x.desde, fps), 0);
  const v = pieza.variantes?.[cuenta] ?? {};
  return Math.max(1, metraje + (v.cierre || v.cta ? aCuadros(SEGUNDOS_CIERRE, fps) : 0));
}

export const FORMATOS = {
  vertical: { ancho: 1080, alto: 1920 },
  horizontal: { ancho: 1920, alto: 1080 },
  cuadrado: { ancho: 1080, alto: 1350 },
};
