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

/** Cuadros que se solapan dos escenas. El fundido cruzado evita cortes secos sin depender de @remotion/transitions. */
export const SOLAPE = 10;

export function duracionPieza(pieza, fps) {
  const total = pieza.escenas.reduce((suma, e) => suma + aCuadros(e.segundos, fps), 0);
  return total - SOLAPE * (pieza.escenas.length - 1);
}

export const FORMATOS = {
  vertical: { ancho: 1080, alto: 1920 },
  horizontal: { ancho: 1920, alto: 1080 },
  cuadrado: { ancho: 1080, alto: 1350 },
};
