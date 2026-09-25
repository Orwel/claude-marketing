/**
 * Del texto transcrito al corte: que partes del metraje se quedan.
 *
 * Antes de cortar, los tiempos de Whisper se anclan a la voz real (ver
 * `alinearAVoz`): whisper.cpp 1.5.5 reparte las palabras sin huecos y se come
 * los silencios del arranque, asi que sus tiempos solos no sirven para cortar.
 *
 * Luego, tres reglas, en este orden:
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
  // Un corte que quita menos que esto se nota como un tic y no ahorra nada: se deja la pausa.
  recorteMin: 0.25,
  palabrasDescarte: ['otra', 'otra vez', 'de nuevo', 'repito'],
};

const normalizar = (t) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ ]/g, '')
    .trim();

// Marcas de Whisper que no son palabras: [AUDIO_EN_BLANCO], [BLANK_AUDIO], (música)...
const esMarca = (t) => /^\s*[[(].*[\])]\s*$/.test(t);

/**
 * Tramos con voz a partir de los silencios que marca ffmpeg (silencedetect).
 * Los tramos muy cortos son ruido (el toque en la pantalla al grabar, un
 * golpe): se descartan para que no se lleven palabras.
 */
export function tramosDeVoz(silencios, duracion, minimo = 0.25) {
  const voz = [];
  let cursor = 0;
  for (const s of [...silencios].sort((a, b) => a.desde - b.desde)) {
    if (s.desde > cursor) voz.push({ desde: cursor, hasta: s.desde });
    cursor = Math.max(cursor, s.hasta);
  }
  if (duracion > cursor) voz.push({ desde: cursor, hasta: duracion });
  // Un sonido corto rodeado de silencio largo no es una frase: es ruido (pasa al arrancar a grabar).
  // Se mide despues de quitar los chasquidos, que si no cuentan como vecinos.
  const utiles = voz.filter((t) => t.hasta - t.desde >= minimo);
  const aislado = (t, i) => t.hasta - t.desde < 0.6 && (utiles[i - 1] ? t.desde - utiles[i - 1].hasta : Infinity) >= 1 && (utiles[i + 1] ? utiles[i + 1].desde - t.hasta : Infinity) >= 1;
  return utiles.filter((t, i) => !aislado(t, i));
}

/**
 * Reparte las palabras sobre los tramos con voz. Cada tramo recibe un grupo
 * seguido de palabras (o ninguno), y se elige el reparto en que lo que dura
 * cada tramo mas se parece a lo que tardaria en decirse su grupo al ritmo
 * medio del video. Terminar un grupo en coma o punto suma: las pausas caen
 * donde hay puntuacion. Dentro del tramo, cada palabra dura segun sus letras.
 */
export function alinearAVoz(palabras, voz) {
  if (!voz?.length || !palabras.length) return palabras;
  const peso = (p) => p.limpia.replace(/ /g, '').length + 1.5;
  const acumulado = [0];
  for (const p of palabras) acumulado.push(acumulado.at(-1) + peso(p));
  const totalVoz = voz.reduce((s, t) => s + t.hasta - t.desde, 0);
  const ritmo = acumulado.at(-1) / totalVoz;
  const n = voz.length;
  const w = palabras.length;

  // costo[k][j]: mejor reparto de las primeras j palabras en los primeros k tramos.
  const costo = Array.from({ length: n + 1 }, () => new Array(w + 1).fill(Infinity));
  const corte = Array.from({ length: n + 1 }, () => new Array(w + 1).fill(0));
  costo[0][0] = 0;
  for (let k = 1; k <= n; k++) {
    const dur = voz[k - 1].hasta - voz[k - 1].desde;
    for (let j = 0; j <= w; j++) {
      for (let i = 0; i <= j; i++) {
        if (costo[k - 1][i] === Infinity) continue;
        const esperado = (acumulado[j] - acumulado[i]) / ritmo;
        const puntuacion = j > i && /[,.;:?!]$/.test(palabras[j - 1].text.trim()) ? 0.15 : 0;
        const c = costo[k - 1][i] + (esperado - dur) ** 2 - puntuacion;
        if (c < costo[k][j]) {
          costo[k][j] = c;
          corte[k][j] = i;
        }
      }
    }
  }

  const alineadas = palabras.map((p) => ({ ...p }));
  for (let k = n, j = w; k > 0; k--) {
    const i = corte[k][j];
    const { desde, hasta } = voz[k - 1];
    const escala = (hasta - desde) / (acumulado[j] - acumulado[i] || 1);
    for (let m = i; m < j; m++) {
      alineadas[m].desde = desde + (acumulado[m] - acumulado[i]) * escala;
      alineadas[m].hasta = desde + (acumulado[m + 1] - acumulado[i]) * escala;
    }
    j = i;
  }
  return alineadas;
}

export function planificarCorte(captions, opciones = {}) {
  const o = { ...OPCIONES, ...opciones };
  const leidas = captions
    .filter((c) => !esMarca(c.text))
    .map((c) => ({ ...c, desde: c.startMs / 1000, hasta: c.endMs / 1000, limpia: normalizar(c.text) }))
    .filter((p) => p.limpia && p.hasta >= p.desde);
  const palabras = alinearAVoz(leidas, o.voz);

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

  // 3. Silencios: tramos de palabras seguidas, con aire, sin solaparse. Una pausa que solo
  //    ahorraria unas centesimas se deja: el corte se veria mas que la pausa.
  const segmentos = [];
  for (const toma of buenas) {
    let inicio = toma[0];
    for (let i = 1; i <= toma.length; i++) {
      const p = toma[i];
      const previa = toma[i - 1];
      const hueco = p ? p.desde - previa.hasta : Infinity;
      if (!p || (hueco > o.silencioMax && hueco - o.aireAntes - o.aireDespues >= o.recorteMin)) {
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

/**
 * Corrige lo que Whisper escribe mal y se repite (marcas, nombres propios):
 * `[{ de: 'chat GPT', a: 'ChatGPT' }]`. Las palabras que coinciden se funden
 * en un solo subtitulo que dura lo que duraban todas. Se conserva la
 * puntuacion final de la ultima ("GPT," → "ChatGPT,").
 */
export function corregir(subtitulos, correcciones = []) {
  let lista = subtitulos;
  for (const { de, a } of correcciones) {
    const buscada = normalizar(de).split(' ');
    const salida = [];
    for (let i = 0; i < lista.length; i++) {
      const tramo = lista.slice(i, i + buscada.length);
      if (tramo.length === buscada.length && tramo.every((s, k) => normalizar(s.text) === buscada[k])) {
        const espacio = tramo[0].text.match(/^\s*/)[0];
        const cola = tramo.at(-1).text.trim().match(/[,.;:?!]*$/)[0];
        salida.push({ ...tramo[0], text: `${espacio}${a}${cola}`, endMs: tramo.at(-1).endMs });
        i += buscada.length - 1;
      } else salida.push(lista[i]);
    }
    lista = salida;
  }
  return lista;
}

/**
 * Une los cortes de varios videos en una sola pieza, en el orden dado. Cada
 * segmento lleva su archivo y los subtitulos se corren al punto donde empieza
 * su video dentro del corte final.
 */
export function unirCortes(cortes) {
  const unido = { segmentos: [], subtitulos: [], descartadas: [], texto: [], duracionFinal: 0 };
  for (const { archivo, corte } of cortes) {
    const desplazamiento = Math.round(unido.duracionFinal * 1000);
    unido.segmentos.push(...corte.segmentos.map((s) => ({ ...s, archivo })));
    unido.subtitulos.push(...corte.subtitulos.map((s) => ({ ...s, startMs: s.startMs + desplazamiento, endMs: s.endMs + desplazamiento })));
    unido.descartadas.push(...corte.descartadas);
    unido.texto.push(...corte.texto);
    unido.duracionFinal = +(unido.duracionFinal + corte.duracionFinal).toFixed(2);
  }
  return unido;
}
