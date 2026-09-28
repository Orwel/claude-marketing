/**
 * Paginacion de subtitulos, sin React: la usan la plantilla Montaje y la revision
 * automatica (src/montaje/revisar.js), que comprueba que cada palabra dicha salga en
 * pantalla antes de renderizar.
 */
/**
 * Subtitulos por paginas cortas (hasta 5 palabras o 1,2 s, cortando en
 * puntuacion y pausas). Nunca karaoke: por pagina se resalta una palabra,
 * la mas cargada de sentido (lista `resaltar` de la pieza, o la mas larga que
 * no sea una palabra vacia).
 */
export const VACIAS = new Set(['porque', 'cuando', 'entonces', 'tambien', 'también', 'aunque', 'mientras', 'siempre', 'alguien', 'nuestra', 'nuestro', 'tienes', 'estaba', 'estamos', 'puedes', 'quieres', 'cualquier', 'todavía', 'todavia']);
export const limpia = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ]/g, '');

/** Texto listo para pantalla: sin comillas sueltas, y mayuscula al empezar el video o despues de . ? ! */
export function normalizarTexto(subtitulos) {
  let mayuscula = true;
  return subtitulos
    .map((s) => ({ ...s, text: s.text.replace(/["“”]/g, ' ').replace(/\s+/g, ' ') }))
    .filter((s) => s.text.trim())
    .map((s) => {
      const limpio = s.text.trim();
      const text = mayuscula ? limpio.charAt(0).toLocaleUpperCase('es') + limpio.slice(1) : limpio;
      mayuscula = /[.?!]$/.test(limpio);
      return { ...s, text };
    });
}

/**
 * Cada palabra sale una sola vez: en el subtitulo o en un golpe, nunca en ninguno.
 * Las palabras de un golpe se quitan del subtitulo; las paginas se parten en los
 * bordes de cada golpe, y lo que se dice mientras el golpe se despide aparece
 * apenas termina. Antes se ocultaba la pagina entera y se perdian palabras
 * ("juez federal seis casos" en V02, 28-sep-2026).
 */
export function paginar(subtitulosCrudos, resaltar, golpes = [], fps = 30) {
  const subtitulos = normalizarTexto(subtitulosCrudos);
  const ventanas = golpes.map((g) => ({ desde: (g.inicio / fps) * 1000, hasta: (g.fin / fps) * 1000, palabras: new Set(g.palabras.map((w) => w.startMs)) }));
  const paginas = [];
  let actual = null;
  for (const s of subtitulos) {
    if (ventanas.some((v) => v.palabras.has(s.startMs))) {
      actual = null;
      continue;
    }
    // Dicha mientras un golpe esta en pantalla: sale cuando el golpe termina.
    const tapada = ventanas.find((v) => s.startMs >= v.desde && s.startMs < v.hasta);
    const inicio = tapada ? tapada.hasta : s.startMs;
    const previo = actual?.tokens.at(-1);
    if (!actual || tapada || /[,.;:?!]$/.test(previo.text) || s.startMs - previo.toMs > 300 || s.startMs - actual.startMs > 1200 || actual.tokens.length >= 5) {
      if (!(tapada && actual && actual.startMs === inicio && actual.tokens.length < 5)) {
        actual = { startMs: inicio, tokens: [] };
        paginas.push(actual);
      }
    }
    actual.tokens.push({ text: s.text.trim(), fromMs: Math.max(inicio, s.startMs), toMs: Math.max(s.endMs, inicio + 300) });
  }
  paginas.forEach((p, i) => {
    const fin = p.tokens.at(-1).toMs + 250;
    // Una pagina nunca sigue en pantalla cuando empieza un golpe.
    const golpeSiguiente = ventanas.filter((v) => v.desde > p.startMs).reduce((m, v) => Math.min(m, v.desde), Infinity);
    p.finMs = Math.min(fin, paginas[i + 1]?.startMs ?? fin, golpeSiguiente);
  });
  // Una pagina que no alcanza a leerse (un golpe entra enseguida) se suma a la anterior.
  for (let i = paginas.length - 1; i > 0; i--) {
    if (paginas[i].finMs - paginas[i].startMs < 200 && paginas[i - 1].tokens.length < 7) {
      paginas[i - 1].tokens.push(...paginas[i].tokens);
      paginas[i - 1].finMs = Math.max(paginas[i - 1].finMs, paginas[i].finMs);
      paginas.splice(i, 1);
    }
  }
  const claves = new Set(resaltar.map(limpia));
  paginas.forEach((p, i) => {
    const porClave = p.tokens.findIndex((t) => claves.has(limpia(t.text)));
    const candidatas = p.tokens.map((t, k) => ({ k, n: limpia(t.text) })).filter((c) => c.n.length >= 6 && !VACIAS.has(c.n)).sort((a, b) => b.n.length - a.n.length);
    p.resaltada = porClave >= 0 ? porClave : (candidatas[0]?.k ?? -1);
  });
  return paginas;
}
