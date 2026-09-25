/**
 * Del texto transcrito al corte: que partes del metraje se quedan.
 *
 * Tres reglas, en este orden:
 *  1. Tomas. Una pausa larga (o la palabra "otra") separa una toma de la
 *     siguiente. Es como graba Juan David: dice la linea, y si no le gusta,
 *     dice "otra" y la repite.
 *  2. "Otra" descarta la toma en la que se dijo, incluida la palabra. Se
 *     queda siempre la ultima version de cada linea.
 *  3. Silencios. Dentro de lo que queda, cualquier hueco entre palabras mas
 *     largo que `silencioMax` se corta. Se deja un poco de aire antes y
 *     despues de cada tramo: cortar pegado a la palabra se come consonantes.
 *
 * Los tiempos llegan en milisegundos (formato Caption de @remotion/captions)
 * y los segmentos salen en segundos del metraje original.
 */
export const OPCIONES = {
  pausaEntreTomas: 1.0,
  silencioMax: 0.35,
  aireAntes: 0.12,
  aireDespues: 0.18,
  palabrasDescarte: ['otra', 'otra vez', 'de nuevo', 'repito'],
};

const normalizar = (t) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ ]/g, '')
    .trim();

export function planificarCorte(captions, opciones = {}) {
  const o = { ...OPCIONES, ...opciones };
  const palabras = captions
    .map((c) => ({ ...c, desde: c.startMs / 1000, hasta: c.endMs / 1000, limpia: normalizar(c.text) }))
    .filter((p) => p.limpia && p.hasta > p.desde);

  // 1. Tomas
  const tomas = [];
  let actual = [];
  palabras.forEach((p, i) => {
    const anterior = palabras[i - 1];
    if (anterior && p.desde - anterior.hasta >= o.pausaEntreTomas && actual.length) {
      tomas.push(actual);
      actual = [];
    }
    actual.push(p);
  });
  if (actual.length) tomas.push(actual);

  // 2. "Otra" descarta la toma. Dicho al final (ultimas 3 palabras), lo anterior de esa toma es
  //    la version mala y se va entera. Dicho a mitad de una toma larga (no hubo pausa antes de
  //    repetir), se va lo anterior y se queda lo que viene despues.
  const posicionDescarte = (toma) =>
    toma.findIndex((p, i) => o.palabrasDescarte.includes(p.limpia) || o.palabrasDescarte.includes(`${p.limpia} ${toma[i + 1]?.limpia ?? ''}`));
  const descartadas = [];
  const buenas = [];
  for (const toma of tomas) {
    const idx = posicionDescarte(toma);
    if (idx === -1) {
      buenas.push(toma);
      continue;
    }
    descartadas.push(toma.slice(0, idx + 1).map((p) => p.text.trim()).join(' '));
    const salto = toma[idx + 1]?.limpia === 'vez' ? 2 : 1;
    const resto = idx >= toma.length - 3 ? [] : toma.slice(idx + salto);
    if (resto.length) buenas.push(resto);
  }

  // 3. Silencios: tramos de palabras seguidas, con aire, sin solaparse
  const segmentos = [];
  for (const toma of buenas) {
    let inicio = toma[0];
    for (let i = 1; i <= toma.length; i++) {
      const p = toma[i];
      const previa = toma[i - 1];
      if (!p || p.desde - previa.hasta > o.silencioMax) {
        segmentos.push({ desde: Math.max(0, inicio.desde - o.aireAntes), hasta: previa.hasta + o.aireDespues });
        inicio = p;
      }
    }
  }
  const unidos = [];
  for (const s of segmentos.sort((a, b) => a.desde - b.desde)) {
    const u = unidos.at(-1);
    if (u && s.desde <= u.hasta) u.hasta = Math.max(u.hasta, s.hasta);
    else unidos.push({ ...s });
  }

  // Subtitulos en la linea de tiempo del video ya cortado.
  const subtitulos = [];
  let cursor = 0;
  for (const s of unidos) {
    for (const p of buenas.flat()) {
      if (p.desde >= s.desde && p.hasta <= s.hasta) {
        subtitulos.push({ text: p.text, startMs: Math.round((cursor + p.desde - s.desde) * 1000), endMs: Math.round((cursor + p.hasta - s.desde) * 1000), timestampMs: null, confidence: p.confidence ?? null });
      }
    }
    cursor += s.hasta - s.desde;
  }

  return {
    segmentos: unidos.map((s) => ({ desde: +s.desde.toFixed(3), hasta: +s.hasta.toFixed(3) })),
    subtitulos,
    descartadas,
    duracionOriginal: palabras.at(-1)?.hasta ?? 0,
    duracionFinal: +cursor.toFixed(2),
    texto: buenas.map((t) => t.map((p) => p.text.trim()).join(' ')),
  };
}
