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

const sinTildes = (t) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ ]/g, '')
    .trim();

/**
 * Cuadro en que se dice una palabra (o frase) en el video ya cortado. Los
 * graficos se anclan a lo dicho y no a segundos: si el corte cambia, el
 * grafico sigue cayendo sobre su palabra. `vez` elige la aparicion (1, 2...).
 */
export function cuadroDePalabra(subtitulos, en, fps, vez = 1, despuesDe = -1) {
  const buscadas = sinTildes(en).split(' ');
  let vista = 0;
  for (let i = 0; i < subtitulos.length; i++) {
    // `despuesDe`: el fin de un grafico y sus marcas se buscan despues de que el grafico entra.
    if ((subtitulos[i].startMs / 1000) * fps <= despuesDe) continue;
    if (buscadas.every((b, k) => sinTildes(subtitulos[i + k]?.text ?? '') === b) && ++vista === vez) {
      return Math.round((subtitulos[i].startMs / 1000) * fps);
    }
  }
  throw new Error(`No se dice "${en}" (vez ${vez}) en los subtitulos`);
}

/**
 * Linea de tiempo de una pieza Vertical, en cuadros. La usan la plantilla y el
 * sintetizador de audio: asi cada whoosh cae en su transicion y cada efecto en
 * su grafico sin sincronizar a mano.
 *  - tramos: los pedazos de metraje en orden, con su archivo.
 *  - cambios: cuadros donde cambia de grabacion (ahi va una transicion).
 *  - graficos: cada uno con inicio y fin; `en`/`hasta` son palabras dichas,
 *    `dura` son segundos. Entran un poco antes de la palabra: anticiparse se
 *    siente intencional, llegar tarde se siente como error.
 */
export function lineaVertical(pieza, fps) {
  let cursor = 0;
  const tramos = (pieza.metraje?.segmentos ?? []).map((s) => {
    const cuadros = aCuadros(s.hasta - s.desde, fps);
    const t = { ...s, archivo: s.archivo ?? pieza.metraje.archivo, inicio: cursor, cuadros };
    cursor += cuadros;
    return t;
  });
  const cambios = tramos.slice(1).filter((t, i) => t.archivo !== tramos[i].archivo).map((t) => t.inicio);
  const subtitulos = pieza.subtitulos ?? [];
  const adelanto = 4;
  const graficos = (pieza.graficos ?? []).map((g) => {
    const inicio = Math.max(0, cuadroDePalabra(subtitulos, g.en, fps, g.vez) - adelanto + aCuadros(g.corrimiento ?? 0, fps));
    const fin = g.hasta ? cuadroDePalabra(subtitulos, g.hasta, fps, g.vezHasta, inicio + adelanto) - adelanto : inicio + aCuadros(g.dura ?? 2.5, fps);
    // Marcas internas del grafico, tambien ancladas a palabras, relativas a su inicio.
    const marcas = Object.fromEntries(Object.entries(g.marcas ?? {}).map(([k, palabra]) => [k, cuadroDePalabra(subtitulos, palabra, fps, 1, inicio) - adelanto - inicio]));
    return { ...g, inicio, fin: Math.min(fin, cursor), marcas };
  });
  return { tramos, cambios, graficos, cuadrosMetraje: cursor };
}

export const FORMATOS = {
  vertical: { ancho: 1080, alto: 1920 },
  horizontal: { ancho: 1920, alto: 1080 },
  cuadrado: { ancho: 1080, alto: 1350 },
};
