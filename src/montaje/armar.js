import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { RAIZ } from '../config.js';
import { corregir, planificarCorte, tramosDeVoz, unirTokens } from '../vertical/corte.js';
import { duracionDe, FFMPEG, limpiar, medirColor } from './limpiar.js';

/**
 * npm run armar -- 2026-10 [slug...]
 *
 * Arma las piezas de plantilla Montaje del mes: por cada cuenta, intro +
 * cuerpo + cierre grabado, limpios y cortados, con los subtitulos y los beats
 * en la linea de tiempo final. Deja el resultado en `pieza.generado`; lo
 * editorial (beats, variantes, verificar) nunca se toca.
 *
 * Qué clip es intro o cierre de cada cuenta lo dice piezas/<mes>/_rodaje.json
 * (sale de identificar los clips, paso 0). Los crudos estan en
 * trabajo/<mes>/00-crudo (copia local de Drive) y sus transcripciones en
 * trabajo/<mes>/<base>.captions.json.
 *
 * Reglas de corte (prompt de produccion, oct-2026): "corta" es la señal de
 * error y se lleva la toma; muletillas y marcas habladas ("marca dato") se
 * quitan; silencios internos a 300 ms; todo a 1,12× (sep-2026: mas ritmo).
 * Nunca se reordena ni se inventa nada.
 */
// Ritmo apretado pero sin comerse nada (Juan David, 27-sep-2026: "corta las partes donde no hablo",
// y luego "te sigues comiendo un poco de lo que digo"). Mas aire al final: las "s" y las vocales
// que se apagan son lo primero que se pierde.
// Regla: NUNCA se corta lo que dice (27-sep-2026, tercera vez que se quejo). Se prefiere una pausa
// de medio segundo de mas: solo se recortan silencios claros y con aire generoso a cada lado.
const OPCIONES_CORTE = {
  silencioMax: 0.5,
  aireAntes: 0.2,
  aireDespues: 0.3,
  recorteMin: 0.15,
  sinVacios: true,
  palabrasDescarte: ['otra', 'otra vez', 'de nuevo', 'repito', 'corta', 'corta corta'],
  // Sin muletillas ("eh", "em"): se quitaban con tiempos de palabra estimados y el corte mordia la
  // palabra vecina. Solo las marcas habladas, que Juan David dice aparte, con pausa.
  palabrasQuitar: ['marca dato', 'marca lista', 'marca cita', 'marca comparativa'],
};
// Todo el video va a 1,12×: a 1,08× y solo en pasajes largos casi nunca se aplicaba. Mas de ~1,15× la voz se oye apurada.
const VELOCIDAD = 1.12;
const CORRECCIONES_COMUNES = [
  { de: 'chat GPT', a: 'ChatGPT' },
  { de: 'chat gpt', a: 'ChatGPT' },
  { de: 'Chat GPT', a: 'ChatGPT' },
  { de: 'contrapto', a: 'Contrappto' },
  { de: 'tri fuerza', a: 'Trifuerza' },
  { de: 'trifuerza', a: 'Trifuerza' },
  { de: 'Cathy o nil', a: "Cathy O'Neil" },
  // Whisper oye "editando" en el cierre del webinar: por contexto es "dictando" (lo da el, no lo edita).
  { de: 'estaré editando', a: 'estaré dictando' },
];

const [mes, ...soloSlugs] = process.argv.slice(2);
if (!/^\d{4}-\d{2}$/.test(mes ?? '')) {
  console.error('Uso: npm run armar -- AAAA-MM [slug...]');
  process.exit(1);
}
const trabajo = path.join(RAIZ, 'trabajo', mes);
const crudo = path.join(trabajo, '00-crudo');
const carpetaPiezas = path.join(RAIZ, 'piezas', mes);
const rodaje = JSON.parse(readFileSync(path.join(carpetaPiezas, '_rodaje.json'), 'utf8'));

/**
 * Tramos con voz. Se guarda para no medir dos veces.
 *
 * No se usa silencedetect con umbral fijo: con el ruido de la calle ningun
 * pico bajaba de -35 dB y todo el clip contaba como voz (intro y cierre salian
 * enteros, con 2 a 8 s mudos). Se mide el RMS en ventanas de 100 ms solo en la
 * banda de la voz (300-3400 Hz: el camion y el retumbe de carros caen fuera) y
 * el umbral es el mayor entre el piso de ruido + 8 dB y la voz fuerte del clip
 * (percentil 97) - 28 dB. Cuenta todo silencio de 200 ms o mas: los tramos finos son
 * las anclas de los subtitulos (con tramos de 27 s las palabras se repartian a ojo y el
 * subtitulo se descuadraba de la voz). Lo que se corta lo decide silencioMax (0,5 s).
 * Rodaje oct-2026: voz de -11 a -35 dB, silencio de -38 a -52, un camion de
 * fondo en -41 a -46 que con el piso solo contaba como voz. Con +10 dB sobre el
 * piso las silabas suaves contaban como silencio y el corte se comia palabras.
 */
const VENTANA = 0.1;
function vozDe(base) {
  const destino = path.join(trabajo, `${base}.voz7.json`);
  if (existsSync(destino)) return JSON.parse(readFileSync(destino, 'utf8'));
  const wav = path.join(trabajo, `${base}.wav`);
  const salida = spawnSync(FFMPEG(), ['-hide_banner', '-i', wav, '-af', `aresample=16000,highpass=f=300,lowpass=f=3400,asetnsamples=${16000 * VENTANA},astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level`, '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }).stderr;
  const niveles = [...salida.matchAll(/RMS_level=(-?[\d.]+|-inf)/g)].map((m) => (m[1] === '-inf' ? -90 : +m[1]));
  const duracion = niveles.length * VENTANA;
  const orden = [...niveles].sort((a, b) => a - b);
  const piso = orden[Math.floor(orden.length * 0.1)];
  const fuerte = orden[Math.floor(orden.length * 0.97)];
  // +8 sobre el piso y -28 bajo la voz fuerte: con -22 el remate dicho en voz baja (-40 dB) se perdia.
  const umbral = Math.min(-30, Math.max(-48, piso + 8, fuerte - 28));
  const silencios = [];
  let inicio = null;
  niveles.forEach((n, i) => {
    if (n < umbral) inicio ??= i;
    else if (inicio !== null) {
      if ((i - inicio) * VENTANA >= 0.2) silencios.push({ desde: inicio * VENTANA, hasta: i * VENTANA });
      inicio = null;
    }
  });
  if (inicio !== null) silencios.push({ desde: inicio * VENTANA, hasta: duracion });
  const voz = tramosDeVoz(silencios, duracion);
  writeFileSync(destino, JSON.stringify(voz));
  return voz;
}

// Color de referencia del rodaje: el promedio de todos los clips que se usan. Se mide una vez.
let referencia = null;
const colores = {};
function colorDe(archivo) {
  const ruta = path.join(trabajo, 'colores.json');
  const guardados = existsSync(ruta) ? JSON.parse(readFileSync(ruta, 'utf8')) : {};
  if (!guardados[archivo]) {
    const entrada = path.join(crudo, archivo);
    guardados[archivo] = medirColor(entrada, duracionDe(entrada));
    writeFileSync(ruta, JSON.stringify(guardados, null, 1));
  }
  Object.assign(colores, guardados);
  return guardados[archivo];
}

/**
 * Donde esta Juan David en un tramo: el tripode no se mueve, asi que lo que cambia
 * entre cuadros es el. Se muestrean 5 cuadros por segundo en gris a 90×160, se
 * marcan los pixeles que cambian y se toma la caja donde se concentra el
 * movimiento (percentiles 5-95, sin el 15 % de arriba: nubes y copas de arboles).
 * Devuelve el centro y el alto de esa caja, en fracciones del cuadro.
 * Nacio con el cierre "Comenta clase" de oct-2026: lo dice agachado y lejos, y el
 * recorte fijo de la outro lo dejaba abajo y cortado.
 */
const ANCHO_S = 90;
const ALTO_S = 160;
function seguirPersona(archivoLimpio, desde, hasta) {
  const r = spawnSync(FFMPEG(), ['-v', 'error', '-ss', desde.toFixed(2), '-t', (hasta - desde).toFixed(2), '-i', path.join(RAIZ, 'public', archivoLimpio), '-vf', `fps=5,scale=${ANCHO_S}:${ALTO_S},format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 256 * 1024 * 1024 });
  const tam = ANCHO_S * ALTO_S;
  const cuadros = Math.floor((r.stdout?.length ?? 0) / tam);
  if (cuadros < 3) return null;
  const conteo = new Uint16Array(tam);
  for (let c = 1; c < cuadros; c++) {
    for (let i = Math.floor(ALTO_S * 0.15) * ANCHO_S; i < tam; i++) {
      if (Math.abs(r.stdout[c * tam + i] - r.stdout[(c - 1) * tam + i]) > 22) conteo[i]++;
    }
  }
  const minimo = Math.max(2, Math.round((cuadros - 1) * 0.1));
  const filas = [];
  const columnas = [];
  for (let i = 0; i < tam; i++) {
    if (conteo[i] >= minimo) {
      filas.push(Math.floor(i / ANCHO_S));
      columnas.push(i % ANCHO_S);
    }
  }
  if (filas.length < 40) return null;
  const pct = (lista, p) => [...lista].sort((a, b) => a - b)[Math.floor(lista.length * p)];
  const [arriba, abajo, izq, der] = [pct(filas, 0.05), pct(filas, 0.95), pct(columnas, 0.05), pct(columnas, 0.95)];
  return { x: +((izq + der) / 2 / ANCHO_S).toFixed(3), y: +((arriba + abajo) / 2 / ALTO_S).toFixed(3), alto: +((abajo - arriba) / ALTO_S).toFixed(3) };
}

/** Segundos que el audio del archivo crudo arranca despues del video (start_time del stream de audio). */
function desfaseDe(archivo) {
  const ffprobe = path.join(path.dirname(FFMPEG()), `ffprobe${path.extname(FFMPEG())}`);
  const r = spawnSync(ffprobe, ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=start_time', '-of', 'csv=p=0', path.join(crudo, archivo)], { encoding: 'utf8' });
  const s = parseFloat(r.stdout);
  if (r.status !== 0 || !Number.isFinite(s)) throw new Error(`no se pudo medir el desfase de audio de ${archivo}: ${r.stderr}`);
  return s;
}

/**
 * Corta un clip: devuelve segmentos (segundos del original) y subtitulos en la
 * linea de tiempo del clip ya cortado. `recorte` limita la toma dentro del
 * archivo cuando un mismo archivo trae dos piezas o dos tomas.
 */
function cortar(archivo, recorte, correcciones) {
  const base = path.parse(archivo).name;
  let captions = unirTokens(JSON.parse(readFileSync(path.join(trabajo, `${base}.captions.json`), 'utf8')));
  let voz = vozDe(base);
  if (recorte) {
    const [a, b] = [recorte.desde ?? 0, recorte.hasta ?? Infinity];
    captions = captions.filter((c) => c.startMs / 1000 >= a - 0.05 && c.endMs / 1000 <= b + 0.3);
    voz = voz.map((t) => ({ desde: Math.max(t.desde, a), hasta: Math.min(t.hasta, b) })).filter((t) => t.hasta - t.desde > 0.05);
  }
  // El .wav de analisis empieza donde empieza el audio, y en los .mov del iPhone el audio arranca
  // ~0,73 s despues que el video. Sin correrlo, cada corte caia 0,75 s antes: silencio al inicio y
  // el final de cada frase comido (el "te comes lo que digo" de Juan David, 27-sep-2026).
  const desfase = desfaseDe(archivo);
  if (desfase) {
    captions = captions.map((c) => ({ ...c, startMs: c.startMs + desfase * 1000, endMs: c.endMs + desfase * 1000 }));
    voz = voz.map((t) => ({ desde: t.desde + desfase, hasta: t.hasta + desfase }));
  }
  const corte = planificarCorte(captions, { ...OPCIONES_CORTE, voz });
  // Red de seguridad: la toma nunca termina antes de que Whisper diga que termino la ultima palabra.
  // Juan David suele bajar la voz al rematar ("…completamente distintas") y el detector de voz lo
  // tomaba como silencio: se perdia la palabra final (27-sep-2026).
  const ultima = captions.filter((c) => /[a-z0-9ñáéíóú]/i.test(c.text)).at(-1);
  const final = corte.segmentos.at(-1);
  if (ultima && final) {
    const hasta = Math.min(ultima.endMs / 1000 + 0.35, recorte?.hasta ?? Infinity);
    if (hasta > final.hasta) final.hasta = +hasta.toFixed(3);
  }
  corte.subtitulos = corregir(corte.subtitulos, [...CORRECCIONES_COMUNES, ...(correcciones ?? [])]);
  return corte;
}

/**
 * Une las partes de un montaje y aplica la velocidad. Cada parte trae su corte;
 * los subtitulos se pasan a la linea final segmento por segmento, dividiendo
 * por la velocidad de su segmento.
 */
function unir(partes) {
  const segmentos = [];
  const subtitulos = [];
  const marcas = {};
  let cursor = 0; // segundos en la linea final
  for (const { parte, archivo, corte, acelerar } of partes) {
    marcas[parte] = Math.round(cursor * 1000);
    let local = 0; // segundos en la linea del corte de esta parte
    const tabla = [];
    corte.segmentos.forEach((s) => {
      const dur = s.hasta - s.desde;
      const velocidad = acelerar ? VELOCIDAD : 1;
      tabla.push({ local, dur, final: cursor, velocidad });
      segmentos.push({ ...s, archivo, parte, velocidad });
      local += dur;
      cursor += dur / velocidad;
    });
    const aFinal = (ms) => {
      const t = ms / 1000;
      const seg = tabla.findLast((x) => t >= x.local - 1e-3) ?? tabla[0];
      return Math.round((seg.final + (t - seg.local) / seg.velocidad) * 1000);
    };
    for (const sub of corte.subtitulos) subtitulos.push({ ...sub, startMs: aFinal(sub.startMs), endMs: aFinal(sub.endMs), parte });
  }
  return { segmentos, subtitulos, marcas, duracionMs: Math.round(cursor * 1000) };
}

const limpiarse = (texto) => texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]/g, '').trim();

/** ms (en tiempo del cuerpo) en que se dice `en` (una o varias palabras); `vez` elige la aparicion. */
function msDe(subs, en, vez = 1, desde = -1) {
  const buscadas = limpiarse(en).split(' ');
  let vista = 0;
  for (let i = 0; i < subs.length; i++) {
    if (subs[i].startMs <= desde) continue;
    if (buscadas.every((b, k) => limpiarse(subs[i + k]?.text ?? '') === b) && ++vista === vez) return subs[i].startMs;
  }
  return null;
}

/** Beats en tiempo del cuerpo. Un beat cuya palabra no se dijo se reporta y se salta: nunca se ubica a ojo. */
function resolverBeats(pieza, subsCuerpo, avisos) {
  return (pieza.beats ?? []).flatMap((b) => {
    const inicioMs = msDe(subsCuerpo, b.en, b.vez);
    if (inicioMs == null) {
      avisos.push(`beat ${b.tipo}: no se dice "${b.en}"`);
      return [];
    }
    let finMs = b.hasta ? msDe(subsCuerpo, b.hasta, b.vezHasta, inicioMs) : null;
    if (finMs == null) finMs = inicioMs + (b.dura ?? 3) * 1000;
    const itemsCuadros = b.items?.some((it) => it.en) ? b.items.map((it) => {
      const ms = it.en ? msDe(subsCuerpo, it.en, it.vez ?? 1, inicioMs - 1) : null;
      return ms == null ? null : Math.max(0, Math.round(((ms - inicioMs + 300) / 1000) * 30) - 2);
    }) : undefined;
    const columnasCuadros = b.columnas?.map((c) => {
      const ms = msDe(subsCuerpo, c, 1, inicioMs - 1);
      return ms == null ? null : Math.max(0, Math.round(((ms - inicioMs + 300) / 1000) * 30) - 2);
    });
    return [{ ...b, inicioMs, finMs, itemsCuadros, columnasCuadros }];
  });
}

const piezas = readdirSync(carpetaPiezas)
  .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
  .map((f) => ({ archivo: path.join(carpetaPiezas, f), pieza: JSON.parse(readFileSync(path.join(carpetaPiezas, f), 'utf8')) }))
  .filter(({ pieza }) => pieza.plantilla === 'Montaje' && (!soloSlugs.length || soloSlugs.includes(pieza.slug)));

// Referencia de color: promedio de todos los clips que usan las piezas del mes y el rodaje.
const usados = new Set([...Object.values(rodaje.intros ?? {}), ...Object.values(rodaje.cierres ?? {}), ...piezas.flatMap(({ pieza }) => [pieza.cuerpo.archivo, ...Object.values(pieza.ganchos ?? {}).map((g) => g.archivo)])].filter(Boolean).map((x) => (typeof x === 'string' ? x : x.archivo)));
for (const a of usados) colorDe(a);
const lista = Object.entries(colores).filter(([a]) => usados.has(a)).map(([, c]) => c);
// Si ya hay una referencia del rodaje guardada, se usa esa: todos los clips se corrigen hacia el mismo punto.
const guardada = path.join(trabajo, 'referencia-color.json');
referencia = existsSync(guardada) ? JSON.parse(readFileSync(guardada, 'utf8')) : ['r', 'g', 'b', 'luma'].reduce((o, k) => ({ ...o, [k]: lista.reduce((s, c) => s + c[k], 0) / lista.length }), {});
writeFileSync(guardada, JSON.stringify(referencia));

const limpio = (archivo) => {
  console.log(`  · limpiando ${archivo}`);
  return limpiar({ entrada: path.join(crudo, archivo), mes, referencia, color: colores[archivo] }).archivo;
};

/** Intro y cierre por cuenta (regla del plan). */
function partesDe(cuenta, pieza, duracionCuerpo) {
  const intro = rodaje.intros?.[cuenta];
  const cierres = {
    // Dos cierres normales (clase15 y webinar); cada pieza toma uno fijo segun su slug para que no se
    // repita el mismo en todo el mes. El clase08 (agachado, lejos) se quito el 27-sep-2026.
    juanda: [rodaje.cierres?.clase15, rodaje.cierres?.webinar].filter(Boolean)[[...pieza.slug].reduce((h, c) => h + c.charCodeAt(0), 0) % [rodaje.cierres?.clase15, rodaje.cierres?.webinar].filter(Boolean).length],
    trifuerza: rodaje.cierres?.tf,
    contrappto: rodaje.cierres?.ctp,
  };
  if (pieza.tipo === 'demo') return { intro: null, gancho: null, cierre: cierres[cuenta] ?? null };
  // Promos y piezas sueltas que ya traen su propio llamado a la accion: sin cierre grabado.
  if (pieza.sinCierre) return { intro: null, gancho: pieza.ganchos?.[cuenta] ?? null, cierre: null };
  // Sin intro grabada: el video arranca con la primera frase del tema y el gancho animado encima
  // (a Juan David no le gusto la intro, 27-sep-2026). Una pieza puede pedirla con `conIntro: true`.
  return { intro: pieza.conIntro ? intro ?? null : null, gancho: pieza.ganchos?.[cuenta] ?? null, cierre: cierres[cuenta] ?? null };
}

const ref = (x) => (typeof x === 'string' ? { archivo: x } : x);

for (const { archivo, pieza } of piezas) {
  console.log(`\n▶ ${pieza.slug} · ${pieza.titulo}`);
  const avisos = [];
  const cuerpo = cortar(pieza.cuerpo.archivo, pieza.cuerpo, pieza.correcciones);
  const archivoCuerpo = limpio(pieza.cuerpo.archivo);
  const soloCuerpo = unir([{ parte: 'cuerpo', archivo: archivoCuerpo, corte: cuerpo, acelerar: pieza.acelerar !== false }]);
  const beats = resolverBeats(pieza, soloCuerpo.subtitulos, avisos);

  const montajes = {};
  for (const cuenta of pieza.cuentas) {
    const { intro, gancho, cierre } = partesDe(cuenta, pieza, soloCuerpo.duracionMs / 1000);
    const partes = [];
    for (const [parte, x] of [['intro', intro], ['gancho', gancho]]) {
      if (!x) continue;
      const r = ref(x);
      partes.push({ parte, archivo: limpio(r.archivo), corte: cortar(r.archivo, r, pieza.correcciones), acelerar: true });
    }
    // Un gancho alterno reemplaza el arranque del cuerpo: el cuerpo retoma en `retomaEn`, que
    // debe ser el comienzo de una frase (nunca se pegan mitades de dos tomas en la misma frase).
    let corteCuerpo = cuerpo;
    let cuerpoRecorteMs = 0;
    const retoma = gancho && ref(gancho).retomaEn;
    if (retoma) {
      const base = path.parse(pieza.cuerpo.archivo).name;
      const crudas = unirTokens(JSON.parse(readFileSync(path.join(trabajo, `${base}.captions.json`), 'utf8')));
      const ms = msDe(crudas.map((c) => ({ ...c, text: c.text })), retoma);
      cuerpoRecorteMs = msDe(soloCuerpo.subtitulos, retoma);
      if (ms == null || cuerpoRecorteMs == null) avisos.push(`${cuenta}: el cuerpo no dice "${retoma}" para retomar despues del gancho`);
      else corteCuerpo = cortar(pieza.cuerpo.archivo, { ...pieza.cuerpo, desde: ms / 1000 - 0.15 }, pieza.correcciones);
    }
    partes.push({ parte: 'cuerpo', archivo: archivoCuerpo, corte: corteCuerpo, acelerar: pieza.acelerar !== false });
    if (cierre) {
      const r = ref(cierre);
      partes.push({ parte: 'cierre', archivo: limpio(r.archivo), corte: cortar(r.archivo, r, pieza.correcciones), acelerar: true });
    } else if (!pieza.sinCierre) avisos.push(`${cuenta}: sin cierre grabado disponible`);
    const u = unir(partes);
    // En la outro el video va en la mitad de abajo: cada tramo del cierre lleva donde esta el, para encuadrarlo.
    for (const seg of u.segmentos) if (seg.parte === 'cierre') seg.encuadre = seguirPersona(seg.archivo, seg.desde, seg.hasta);
    montajes[cuenta] = {
      segmentos: u.segmentos,
      subtitulos: u.subtitulos,
      cuerpoInicioMs: u.marcas.cuerpo,
      cuerpoRecorteMs: cuerpoRecorteMs ?? 0,
      cierreInicioMs: u.marcas.cierre ?? null,
      duracionMs: u.duracionMs,
    };
    console.log(`  ${cuenta}: ${(u.duracionMs / 1000).toFixed(1)} s (${partes.map((p) => p.parte).join(' + ')})`);
    if (u.duracionMs > 90000) avisos.push(`${cuenta}: pasa de 90 s en vertical (${(u.duracionMs / 1000).toFixed(1)} s)`);
  }

  for (const a of avisos) console.log(`  ⚠ ${a}`);
  const generado = { beats, montajes, cuerpoMs: soloCuerpo.duracionMs, descartadas: cuerpo.descartadas, texto: cuerpo.texto, avisos };
  writeFileSync(archivo, JSON.stringify({ ...pieza, generado }, null, 2) + '\n');
  console.log(`  ✓ ${beats.length} beats · cuerpo ${(soloCuerpo.duracionMs / 1000).toFixed(1)} s`);
}
