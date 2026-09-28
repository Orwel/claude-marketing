/**
 * Linea de tiempo de un montaje (plantilla Montaje), en cuadros. Sin React:
 * la leen la plantilla y el sintetizador de audio (src/audio/montaje.js), asi
 * cada campanita cae en el cuadro en que entra su grafico.
 *
 * Un montaje = intro de la cuenta + cuerpo + cierre grabado, ya cortados por
 * src/montaje/armar.js (pieza.generado.montajes[cuenta]). Los beats se calculan
 * una sola vez por pieza, en tiempo del cuerpo (pieza.generado.beats), y cada
 * montaje los corre al punto donde empieza su cuerpo.
 */
export const FPS = 30;
export const SEGUNDOS_FINAL = 2; // tarjeta de marca despues del cierre grabado
export const ADELANTO_MS = 300; // el grafico entra antes de la palabra que ilustra
export const MIN_BEAT_MS = 1200;
export const MAX_BEAT_MS = 5000;

const aCuadros = (ms) => Math.round((ms / 1000) * FPS);

export const FORMATOS_RED = {
  instagram: { ancho: 1080, alto: 1920, sufijo: 'ig' },
  linkedin: { ancho: 1080, alto: 1350, sufijo: 'li' },
  linkedinHorizontal: { ancho: 1920, alto: 1080, sufijo: 'li' },
};

/** Contrappto sale en LinkedIn horizontal (1920×1080); las demas cuentas en 4:5. */
export const formatoDe = (cuenta, red) => (red === 'instagram' ? FORMATOS_RED.instagram : cuenta === 'contrappto' ? FORMATOS_RED.linkedinHorizontal : FORMATOS_RED.linkedin);

export function lineaMontaje(pieza, cuenta, densidad = 2) {
  const m = pieza.generado?.montajes?.[cuenta];
  if (!m) throw new Error(`${pieza.slug}: no hay montaje armado para ${cuenta} (npm run armar)`);
  let cursor = 0;
  const tramos = m.segmentos.map((s) => {
    const cuadros = Math.max(1, Math.round(((s.hasta - s.desde) / (s.velocidad ?? 1)) * FPS));
    const t = { ...s, inicio: cursor, cuadros };
    cursor += cuadros;
    return t;
  });
  const cambios = tramos.slice(1).filter((t, i) => t.archivo !== tramos[i].archivo).map((t) => t.inicio);
  const cuerpo = aCuadros(m.cuerpoInicioMs);
  const finVoz = cursor;
  const beats = (pieza.generado.beats ?? [])
    // Con gancho alterno, el cuerpo arranca mas tarde: los beats de antes se caen y el resto se corre.
    .filter((b) => (b.nivel ?? 1) <= densidad && !(b.solo && !b.solo.includes(cuenta)) && b.inicioMs >= (m.cuerpoRecorteMs ?? 0))
    .map((b) => {
      const inicio = cuerpo + aCuadros(b.inicioMs - (m.cuerpoRecorteMs ?? 0) - ADELANTO_MS);
      // Los huecos de demo duran exactamente lo que dura su pasaje: ahi va la captura real.
      // Las escenas del kit recorren lo que se va diciendo (una lista de 4 niveles, 5 fotos): hasta 14 s.
      const tope = b.tipo === 'escena' ? 14000 : MAX_BEAT_MS;
      const dura = b.tipo === 'pantalla' ? b.finMs - b.inicioMs + ADELANTO_MS : Math.min(tope, Math.max(MIN_BEAT_MS, b.finMs - b.inicioMs + ADELANTO_MS));
      return { ...b, inicio: Math.max(0, inicio), fin: Math.min(finVoz, Math.max(0, inicio) + aCuadros(dura)) };
    })
    .filter((b) => b.tipo === 'pantalla' || b.fin - b.inicio >= aCuadros(MIN_BEAT_MS) * 0.8);
  const zooms = zoomsDe(pieza, m.subtitulos, beats);
  const golpes = golpesDe(pieza, m.subtitulos, beats, zooms);
  const libreDeGolpes = (x) => !golpes.some((g) => x.inicio < g.fin + 6 && x.fin > g.inicio - 6);
  return {
    tramos,
    cambios,
    beats,
    zooms,
    chispas: chispasDe(m.subtitulos, beats, m.cierreInicioMs).filter(libreDeGolpes),
    golpes,
    subtitulos: m.subtitulos,
    cuerpo,
    cierre: m.cierreInicioMs != null ? aCuadros(m.cierreInicioMs) : null,
    finVoz,
    total: finVoz + SEGUNDOS_FINAL * FPS,
  };
}

/**
 * Acercamientos de golpe, como en la version webinar (a Juan David le gustaron,
 * 27-sep-2026): el video se empuja a ~1,15× en la palabra y vuelve suave. Salen
 * solos de `pieza.resaltar` (primera vez que se dice cada palabra, en el cuerpo)
 * o de `pieza.zooms` ([{ en, vez, escala, dura }]) si la pieza los fija a mano.
 * Uno cada 4 s como mucho y nunca con un panel en pantalla: ahi el video es una
 * tarjeta y el golpe se pierde.
 */
const limpiaZoom = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]/g, '').trim();
function zoomsDe(pieza, subtitulos, beats) {
  const cuerpo = subtitulos.filter((s) => s.parte !== 'cierre');
  const pedidos = pieza.zooms ?? (pieza.resaltar ?? []).map((en) => ({ en }));
  const zooms = [];
  // Ninguno pegado al barrido de la outro: el golpe y la transicion juntos se pisan.
  const hasta = aCuadros(cuerpo.at(-1)?.endMs ?? 0) - 12;
  for (const z of pedidos) {
    const buscadas = limpiaZoom(z.en).split(' ');
    let vista = 0;
    const i = cuerpo.findIndex((_, k) => buscadas.every((b, j) => limpiaZoom(cuerpo[k + j]?.text ?? '') === b) && ++vista === (z.vez ?? 1));
    if (i < 0) continue;
    const inicio = aCuadros(cuerpo[i].startMs) - 2;
    const fin = inicio + aCuadros((z.dura ?? 1.2) * 1000);
    if (libre(inicio, fin, beats, zooms, hasta)) zooms.push({ inicio, fin, escala: z.escala ?? 1.15, en: z.en });
  }
  // Sin lista a mano, los huecos sin grafico se completan con las palabras mas largas (las de mas
  // peso) hasta uno cada ~6 s: las de `resaltar` suelen caer dentro de un panel.
  if (!pieza.zooms) {
    const tope = Math.floor((cuerpo.at(-1)?.endMs ?? 0) / 6000);
    const candidatas = cuerpo
      .map((s) => ({ s, n: limpiaZoom(s.text) }))
      .filter(({ n }) => n.length >= 7 && !/^(entonces|tambien|porque|cualquier|estamos|tenemos|todavia)$/.test(n))
      .sort((a, b) => b.n.length - a.n.length);
    for (const { s } of candidatas) {
      if (zooms.length >= tope) break;
      const inicio = aCuadros(s.startMs) - 2;
      const fin = inicio + aCuadros(1200);
      if (libre(inicio, fin, beats, zooms, hasta)) zooms.push({ inicio, fin, escala: 1.14, en: s.text.trim() });
    }
  }
  return zooms.sort((a, b) => a.inicio - b.inicio);
}

/** Un acercamiento cabe si no choca con un panel (ahi el video es tarjeta) ni queda a menos de 4 s de otro. */
function libre(inicio, fin, beats, zooms, hasta) {
  if (inicio < FPS || fin > hasta) return false;
  if (beats.some((b) => b.modo !== 'encima' && inicio < b.fin + 12 && fin > b.inicio - 12)) return false;
  return !zooms.some((z) => Math.abs(z.inicio - inicio) < 4 * FPS);
}

/**
 * Golpes tipograficos: tipografia cinetica sobre lo que Juan David dice en ese
 * momento. No se escribe un texto aparte: se toma la frase hablada (hasta 3
 * palabras antes de la clave y 2 despues, sin cruzar un punto), cada palabra
 * aparece cuando la dice y la clave explota letra por letra. Mientras dura, el
 * subtitulo de esa frase no sale: nada se lee dos veces (27-sep-2026: "quieto y
 * repetido porque lo dicen los captions y lo dice ahi").
 *
 * `pieza.golpes`: [{ en, vez?, estilo? }], elegidos leyendo la transcripcion real.
 * Ademas, cada acercamiento libre suma un golpe automatico, hasta ~1 cada 5 s.
 * Estilos (se alternan si no se fija): golpe, serif, pastilla, contorno.
 */
const ESTILOS_GOLPE = ['golpe', 'serif', 'pastilla', 'contorno'];
const EQUIVALENTE = { frase: 'serif', pregunta: 'pastilla', tachar: 'contorno' };
function golpesDe(pieza, subtitulos, beats, zooms) {
  const cuerpo = subtitulos.filter((s) => s.parte !== 'cierre');
  const hastaCuerpo = aCuadros(cuerpo.at(-1)?.endMs ?? 0);
  const golpes = [];
  const armar = (i, estilo) => {
    const cierra = (t) => /[.?!]$/.test(t.trim());
    let desde = i;
    while (desde > i - 3 && desde > 0 && !cierra(cuerpo[desde - 1].text)) desde--;
    let hasta = i;
    while (hasta < i + 2 && hasta < cuerpo.length - 1 && !cierra(cuerpo[hasta].text)) hasta++;
    const inicio = Math.max(0, aCuadros(cuerpo[desde].startMs) - 3);
    const clave = aCuadros(cuerpo[i].startMs);
    const fin = Math.min(hastaCuerpo + 6, Math.max(clave + 40, aCuadros(cuerpo[hasta].endMs) + 14));
    if (inicio < 3 * FPS) return null;
    if (beats.some((bt) => bt.modo !== 'encima' && inicio < bt.fin + 6 && fin > bt.inicio - 6)) return null;
    if (pieza.lowerThird && inicio < aCuadros(6600) && fin > aCuadros(3200)) return null;
    if (golpes.some((g) => inicio < g.fin + 20 && fin > g.inicio - 20)) return null;
    const palabras = cuerpo.slice(desde, hasta + 1).map((p, k) => ({
      text: p.text.replace(/["“”]/g, ' ').trim(),
      cuadro: Math.max(0, aCuadros(p.startMs) - inicio),
      startMs: p.startMs,
      clave: desde + k === i,
    }));
    return { inicio, fin, palabras, estilo };
  };
  for (const g of pieza.golpes ?? []) {
    const buscadas = limpiaZoom(g.en).split(' ');
    let vista = 0;
    const i = cuerpo.findIndex((_, k) => buscadas.every((w, j) => limpiaZoom(cuerpo[k + j]?.text ?? '') === w) && ++vista === (g.vez ?? 1));
    if (i < 0) continue;
    const golpe = armar(i, EQUIVALENTE[g.estilo] ?? g.estilo ?? null);
    if (golpe) golpes.push(golpe);
  }
  // Automaticos sobre los acercamientos: la palabra ya se eligio por peso.
  const tope = Math.max(golpes.length, Math.floor(hastaCuerpo / (5 * FPS)));
  for (const z of zooms) {
    if (golpes.length >= tope) break;
    const i = cuerpo.findIndex((p) => Math.abs(aCuadros(p.startMs) - 2 - z.inicio) <= 1);
    if (i < 0) continue;
    const golpe = armar(i, null);
    if (golpe) golpes.push(golpe);
  }
  // Y en los huecos que quedan, las palabras largas (las de mas peso), hasta ~1 cada 5 s.
  const candidatas = cuerpo
    .map((p, i) => ({ i, n: limpiaZoom(p.text) }))
    .filter(({ n }) => n.length >= 7 && !/^(entonces|tambien|porque|cualquier|estamos|tenemos|todavia|simplemente|realmente)$/.test(n))
    .sort((x, y) => y.n.length - x.n.length);
  for (const { i } of candidatas) {
    if (golpes.length >= tope) break;
    const golpe = armar(i, null);
    if (golpe) golpes.push(golpe);
  }
  golpes.sort((x, y) => x.inicio - y.inicio);
  // Estilo alterno donde no se fijo: nunca dos iguales seguidos.
  golpes.forEach((g, k) => {
    if (!ESTILOS_GOLPE.includes(g.estilo)) g.estilo = ESTILOS_GOLPE[k % ESTILOS_GOLPE.length];
    if (k && g.estilo === golpes[k - 1].estilo) g.estilo = ESTILOS_GOLPE[(ESTILOS_GOLPE.indexOf(g.estilo) + 1) % ESTILOS_GOLPE.length];
  });
  return golpes;
}

/**
 * Iconos al vuelo ("chispas"): cuando Juan David dice una palabra con peso,
 * entra un icono con la palabra, arriba y alternando de lado. Lleno de motion
 * graphics sin tocar lo editorial (pidio "llenalo todo lo que puedas", 27-sep-2026).
 * Uno cada 1,8 s como mucho, nunca con un panel en pantalla, ni en los 3 s del
 * gancho ni en la outro. La misma palabra no se repite en 12 s.
 */
export const DURA_CHISPA = 48;
const ICONOS = [
  [/^(ia|inteligencia|artificial|algoritmo)/, 'Brain'],
  [/^(chatgpt|gpt|gemini|claude|modelo|maquina|robot)/, 'Bot'],
  [/^(abogad|juez|jueces|sentencia|tribunal|demanda|jurisprudencia|ley|leyes|juridic|derecho)/, 'Scale'],
  [/^(sancion|multa|dolar|plata|dinero|pesos|cuesta|pagar|precio|millon)/, 'BadgeDollarSign'],
  [/^(falsa|falso|error|errores|alucina|invent|mentira|equivoca)/, 'TriangleAlert'],
  [/^(tiempo|fecha|horas|minuto|vence|plazo|termino)/, 'Clock'],
  [/^(contrato|documento|archivo|clausula|expediente)/, 'FileText'],
  [/^(confidencial|secreto|privad|datos|seguridad|informacion)/, 'Lock'],
  [/^(empresa|negocio|cliente|oficina|firma)/, 'Briefcase'],
  [/^(program|codigo|software|ingenier|tecnolog)/, 'Code'],
  [/^(pregunt|prompt|instruccion|chat)/, 'MessageSquare'],
  [/^(equipo|personas|gente|colega)/, 'Users'],
  [/^(correo|email|mensaje)/, 'Mail'],
  [/^(busca|google|investig)/, 'Search'],
  [/^(clase|curso|aprend|estudi|universidad|webinar)/, 'GraduationCap'],
  [/^(idea|pensa|piensa|criterio)/, 'Lightbulb'],
  [/^(revis|verific|valid|comprob)/, 'CircleCheck'],
  [/^(reemplaz|cambi|transform)/, 'RefreshCw'],
  [/^(contexto)/, 'Layers'],
  [/^(probab|matematic|numero|estadistic)/, 'Sigma'],
  [/^(rapid|velocidad|segundos)/, 'Zap'],
  [/^(libro|leer|lectura)/, 'BookOpen'],
  [/^(objetivo|resultado)/, 'Target'],
];
function chispasDe(subtitulos, beats, cierreMs) {
  const hasta = cierreMs != null ? aCuadros(cierreMs) - 20 : Infinity;
  const chispas = [];
  for (const s of subtitulos) {
    if (s.parte === 'cierre') continue;
    const palabra = limpiaZoom(s.text);
    const icono = ICONOS.find(([re]) => re.test(palabra))?.[1];
    if (!icono || palabra.length < 2) continue;
    const inicio = aCuadros(s.startMs) - 3;
    const fin = inicio + DURA_CHISPA;
    if (inicio < 3 * FPS || fin > hasta) continue;
    if (beats.some((b) => b.modo !== 'encima' && inicio < b.fin + 10 && fin > b.inicio - 10)) continue;
    if (chispas.length && inicio - chispas.at(-1).inicio < 1.8 * FPS) continue;
    if (chispas.some((c) => c.palabra === palabra && inicio - c.inicio < 12 * FPS)) continue;
    chispas.push({ inicio, fin, icono, palabra, texto: s.text.replace(/["“”]/g, ' ').trim().split(/\s+/)[0].replace(/[,.;:?!¿¡]+/g, ''), lado: chispas.length % 2 ? 'derecha' : 'izquierda' });
  }
  return chispas;
}

/**
 * Sonidos de cada beat: [{ cuadro, tipo }] relativos a su inicio. Tipos:
 * campana (entra un grafico grande), click (aparece un elemento), tick (conteo o
 * item de lista), woah (revelacion, se usa poco). Nada de barridos de ruido:
 * a Juan David le suenan a estatica de televisor (27-sep-2026).
 */
export function sonidosDe(b) {
  const s = [];
  const paso = b.paso ?? 12;
  switch (b.tipo) {
    case 'lista':
    case 'pasos':
      s.push({ cuadro: 0, tipo: 'campana' });
      (b.items ?? []).forEach((it, i) => { if (!it.ya) s.push({ cuadro: b.itemsCuadros?.[i] ?? 8 + i * paso, tipo: 'tick' }); });
      break;
    case 'cifra':
      s.push({ cuadro: 0, tipo: 'click' });
      for (let i = 2; i < 18; i += 3) s.push({ cuadro: i, tipo: 'tick' });
      s.push({ cuadro: 20, tipo: 'campana' });
      break;
    case 'comparativa':
      s.push({ cuadro: 0, tipo: 'campana' }, { cuadro: 10, tipo: 'click' }, { cuadro: 22, tipo: 'click' });
      break;
    case 'espejismo':
      s.push({ cuadro: 0, tipo: 'campana' }, { cuadro: 26, tipo: 'woah' });
      break;
    case 'escena':
      // Escenas tipo web: campanita al entrar y un tick por cada item cuando se dice.
      s.push({ cuadro: 0, tipo: 'campana' });
      (b.items ?? []).forEach((_, i) => { if (b.itemsCuadros?.[i] != null) s.push({ cuadro: b.itemsCuadros[i], tipo: 'tick' }); });
      break;
    case 'libro':
    case 'cita':
    case 'tarjeta':
    case 'correos':
    case 'pantalla':
      s.push({ cuadro: 0, tipo: 'campana' });
      break;
    default:
      s.push({ cuadro: 0, tipo: 'click' });
  }
  if (b.woah) s.push({ cuadro: b.woah === true ? 0 : b.woah, tipo: 'woah' });
  return s;
}
