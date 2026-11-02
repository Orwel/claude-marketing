import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { RAIZ } from '../config.js';
import { FFMPEG } from '../montaje/limpiar.js';
import { alinearAVoz, corregir, planificarCorte, unirTokens } from '../vertical/corte.js';
import { afinarConDtw, vozDe } from './voz.js';
import { FPS } from '../../remotion/arcade/linea.js';

/**
 * npm run sofa-armar -- [slug...]
 *
 * Arma las piezas de la plantilla Arcade (SOFA, oct-2026). A diferencia de los
 * montajes del mes, aqui el material son entrevistas en la calle grabadas con
 * el DJI (1080×1920 a 60 fps) y el iPhone (4K), con varias personas hablando y
 * ruido de feria. Por cada escena `clip` de la pieza:
 *
 *  1. proxy limpio a 1080×1920 / 30 fps en public/sofa/<base>.mp4 (audio:
 *     pasa-altos, reduccion de ruido medida en el propio clip, de-esser,
 *     compresion y loudnorm; imagen: un poco de contraste y sombras);
 *  2. dentro de [desde, hasta] del original, se quitan solo los silencios
 *     claros (>= 0,5 s) con aire a los lados: nunca se corta lo que se dice;
 *  3. cada palabra de la transcripcion (trabajo/2026-10-sofa/01-transcripciones)
 *     se ancla a la voz real y recibe quien la dice (`turnos`), para el cuadro
 *     de dialogo tipo RPG y el zoom al que habla;
 *  4. si la escena pide ficha, se recorta el retrato del entrevistado y se
 *     pixela (paleta de 14 colores, 44 px de ancho) como el juego del Claustro.
 *
 * Deja todo en `pieza.generado`; lo editorial no se toca.
 */
const CRUDO = path.join(RAIZ, 'trabajo', '2026-10-sofa', '00-crudo');
const TRANSCRIPCIONES = path.join(RAIZ, 'trabajo', '2026-10-sofa', '01-transcripciones');
const PROXIES = path.join(RAIZ, 'public', 'sofa');
const RETRATOS = path.join(RAIZ, 'public', 'sofa', 'retratos');
const CARPETA_PIEZAS = path.join(RAIZ, 'piezas', '2026-10');
mkdirSync(PROXIES, { recursive: true });
mkdirSync(RETRATOS, { recursive: true });

const CORRECCIONES_COMUNES = [
  { de: 'Holo Knight', a: 'Hollow Knight' },
  { de: 'Hollow Night', a: 'Hollow Knight' },
  { de: 'jolo nait', a: 'Hollow Knight' },
  { de: 'tri fuerza', a: 'Trifuerza' },
  { de: 'trifuerza', a: 'Trifuerza' },
  { de: 'contrapto', a: 'Contrappto' },
  { de: 'Contrapto', a: 'Contrappto' },
  { de: 'indique', a: 'indie' },
  { de: 'indy', a: 'indie' },
];

// Solo silencios claros, con aire generoso: regla dura del estudio (nunca se corta lo que se dice).
const OPCIONES_CORTE = { pausaEntreTomas: 99, silencioMax: 0.5, aireAntes: 0.2, aireDespues: 0.3, recorteMin: 0.2, sinVacios: true, palabrasDescarte: [], palabrasQuitar: [] };
// Cola de lectura: la ultima pagina de cada escena se queda 0,9 s despues de la ultima palabra (Juan David,
// 13-oct-2026: "al terminar lo cortaste muy antes y no alcanzo a leer"). Si el crudo no tiene ese aire (la
// siguiente frase viene pegada), la escena se alarga congelando el ultimo cuadro (`cola`, en segundos).
const COLA = 0.9;

const correr = (args, opciones = {}) => execFileSync(FFMPEG(), ['-hide_banner', '-y', '-v', 'error', ...args], { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 256 * 1024 * 1024, ...opciones });
const ffprobe = () => path.join(path.dirname(FFMPEG()), `ffprobe${path.extname(FFMPEG())}`);

function duracionDe(archivo) {
  const r = spawnSync(ffprobe(), ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', archivo], { encoding: 'utf8' });
  return parseFloat(r.stdout);
}

/** Piso de ruido del clip (dB), percentil 10 del RMS por ventanas: se lo pasa a afftdn. */
function pisoDeRuido(entrada) {
  const r = spawnSync(FFMPEG(), ['-hide_banner', '-i', entrada, '-vn', '-af', 'astats=metadata=1:reset=25,ametadata=print:key=lavfi.astats.Overall.RMS_level', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const niveles = [...r.stderr.matchAll(/RMS_level=(-?[\d.]+)/g)].map((m) => +m[1]).filter(Number.isFinite).sort((a, b) => a - b);
  if (!niveles.length) return -45;
  return Math.max(-70, Math.min(-25, niveles[Math.floor(niveles.length * 0.1)]));
}

/**
 * Proxy limpio a la resolucion NATIVA del crudo: el iPhone (2160×3840) se queda en 4K y el DJI (1920×1080 con
 * rotacion de 90° en los metadatos) en 1080×1920; ffmpeg endereza solo y todo pasa a 30 fps. Hasta el 13-oct-2026
 * todo se bajaba a 1080 y el zoom al que habla (1,2–1,45×) ampliaba esos 1080: Juan David noto que "perdieron
 * definicion". Con el 4K, el zoom recorta del original y la salida de 1080×1920 queda nitida.
 */
function proxy(archivo, opciones = {}) {
  const base = path.parse(archivo).name;
  const salida = path.join(PROXIES, `${base}.mp4`);
  const informe = path.join(PROXIES, `${base}.json`);
  const entrada = path.join(CRUDO, archivo);
  const dims = spawnSync(ffprobe(), ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', entrada], { encoding: 'utf8' }).stdout.trim().split(',').map(Number);
  const [ancho, alto] = dims[0] * dims[1] >= 6e6 ? [2160, 3840] : [1080, 1920];
  // Un proxy viejo de otra resolucion se rehace (los de 1080 hechos antes del cambio).
  if (existsSync(salida) && existsSync(informe)) {
    const viejo = JSON.parse(readFileSync(informe, 'utf8'));
    if ((viejo.ancho ?? 1080) === ancho) return viejo;
  }
  console.log(`  · proxy ${archivo} (${ancho}×${alto})`);
  const piso = pisoDeRuido(entrada);
  // Pasa-altos a 90 Hz (retumbe de la feria), afftdn de 14 dB con el piso medido, de-esser suave,
  // compresion 3:1 para emparejar al entrevistado (lejos del micro) con Juan David, y loudnorm.
  const audio = ['highpass=f=90', `afftdn=nr=14:nf=${Math.round(piso + 4)}:tn=1`, 'adeclick', 'deesser=i=0.35:m=0.5:f=0.5', 'acompressor=threshold=-24dB:ratio=3:attack=6:release=180:makeup=3', 'loudnorm=I=-16:TP=-1.5:LRA=9', 'aresample=48000'].join(',');
  const video = [`scale=${ancho}:${alto}:flags=lanczos:force_original_aspect_ratio=increase`, `crop=${ancho}:${alto}`, 'fps=30', 'eq=contrast=1.05:saturation=1.08', "curves=all='0/0 0.2/0.23 0.5/0.52 1/1'", 'unsharp=5:5:0.3', 'format=yuv420p'].join(',');
  correr(['-i', entrada, '-vf', video, '-af', audio, '-c:v', 'libx264', '-crf', '14', '-preset', 'fast', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', salida]);
  const datos = { archivo: `sofa/${base}.mp4`, pisoRuido: piso, duracion: duracionDe(salida), ancho, alto };
  writeFileSync(informe, JSON.stringify(datos, null, 2));
  return datos;
}

/** Segundos que el audio arranca despues del video (los .MOV del iPhone traen ~0,7 s; el DJI 0). */
function desfaseDe(archivo) {
  const r = spawnSync(ffprobe(), ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=start_time', '-of', 'csv=p=0', path.join(CRUDO, archivo)], { encoding: 'utf8' });
  const s = parseFloat(r.stdout);
  return Number.isFinite(s) ? s : 0;
}

/**
 * Corta un tramo [desde, hasta] del clip: devuelve segmentos (segundos del
 * original) y subtitulos en la linea del tramo cortado, cada uno con `quien`.
 */
function cortar(escena, correcciones) {
  const base = path.parse(escena.archivo).name;
  const ruta = path.join(TRANSCRIPCIONES, `${base}.captions.json`);
  if (!existsSync(ruta)) throw new Error(`falta la transcripcion de ${escena.archivo} (trabajo/2026-10-sofa/transcribir.mjs)`);
  const desfase = desfaseDe(escena.archivo);
  let captions = unirTokens(JSON.parse(readFileSync(ruta, 'utf8'))).map((c) => ({ ...c, startMs: c.startMs + desfase * 1000, endMs: c.endMs + desfase * 1000 }));
  let voz = vozDe(base).map((t) => ({ desde: t.desde + desfase, hasta: t.hasta + desfase }));
  // El rango [desde, hasta] se decide mirando los tiempos ya anclados a la voz (trabajo/2026-10-sofa/ver.mjs):
  // se alinea primero sobre todo el clip y se filtra despues, o una palabra del borde se perdia ("Le pregunté").
  const norm = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]/g, '').trim();
  const leidas = captions.filter((c) => !/^\s*[[(].*[\])]\s*$/.test(c.text)).map((c) => ({ ...c, desde: c.startMs / 1000, hasta: c.endMs / 1000, limpia: norm(c.text) })).filter((c) => c.limpia);
  const alineadas = afinarConDtw(alinearAVoz(leidas, voz, true), voz);
  // Cortar en silencio real. Si `desde` cae dentro de un tramo con voz: sin palabras antes en ese tramo se
  // mueve al arranque del tramo (era ruido); con palabras antes, solo si estan a menos de 0,35 s; si no,
  // se avisa (corte en medio de una frase: hay que mover `desde` en la pieza). Igual para `hasta`.
  const avisosCorte = [];
  // `anclas`: [frase, desde, hasta] medidos en el audio (astats) cuando Whisper corrio una frase entera. En Maka
  // (SOFA06, 13-oct-2026) puso "Bueno, hay varias…" encima de la pregunta de Juan David: el texto salia sin que
  // ella hablara y el corte de silencios se comia la frase real; y apilo "me pierdo muy fácil" en 0,1 s, antes
  // de decirlo. Las palabras de la frase se reparten por letras dentro del rango y todo se reordena.
  for (const [frase, x, y] of escena.anclas ?? []) {
    const q = norm(frase).split(' ');
    // La misma frase puede repetirse en el clip ("¿Y en qué te pareces a tu personaje?" a Aurora y a Von Lycaon en
    // SOFA02, 13-oct-2026): se toma la aparicion mas cercana al rango medido.
    const hallazgos = alineadas.map((c, k) => (q.every((w, j) => alineadas[k + j]?.limpia === w) ? k : -1)).filter((k) => k >= 0);
    const i = hallazgos.reduce((m, k) => (m < 0 || Math.abs(alineadas[k].desde - x) < Math.abs(alineadas[m].desde - x) ? k : m), -1);
    if (i < 0) {
      avisosCorte.push(`ancla: no se encontro «${frase}»`);
      continue;
    }
    const grupo = alineadas.slice(i, i + q.length);
    const letras = grupo.reduce((s, c) => s + c.limpia.length, 0);
    let t = x;
    for (const c of grupo) {
      const dura = ((y - x) * c.limpia.length) / letras;
      Object.assign(c, { desde: +t.toFixed(3), hasta: +(t + dura).toFixed(3) });
      t += dura;
    }
  }
  if (escena.anclas?.length) alineadas.sort((p, q) => p.desde - q.desde);
  const palabrasEn = (x, y) => alineadas.filter((c) => c.desde >= x && c.desde < y).map((c) => c.text.trim()).join(' ');
  let [a, b] = [escena.desde ?? 0, escena.hasta ?? Infinity];
  const enTramo = (t) => voz.find((v) => t > v.desde + 0.04 && t < v.hasta - 0.04);
  const ti = enTramo(a);
  if (ti && escena.inicioDuro == null) { // con `inicioDuro` el arranque ya esta medido
    const antes = palabrasEn(ti.desde, a - 0.05);
    if (!antes || a - ti.desde <= 0.35) a = ti.desde;
    else {
      const cerca = voz.find((v) => v.desde > a && v.desde - a <= 0.35);
      if (cerca && !palabrasEn(a, cerca.desde - 0.05)) a = cerca.desde;
      else avisosCorte.push(`inicio en medio de voz (${a.toFixed(2)} s): «…${antes.split(' ').slice(-4).join(' ')}» | «${palabrasEn(a - 0.05, a + 1.5).split(' ').slice(0, 4).join(' ')}…»`);
    }
  }
  const tf = Number.isFinite(b) ? enTramo(b) : null;
  if (tf) {
    const despues = palabrasEn(b, tf.hasta);
    if (!despues || tf.hasta - b <= 0.35) b = tf.hasta;
    else avisosCorte.push(`fin en medio de voz (${b.toFixed(2)} s): «…${palabrasEn(b - 1.5, b).split(' ').slice(-4).join(' ')}» | «${despues.split(' ').slice(0, 4).join(' ')}…»`);
  }
  // Turnos: el cambio de hablante ocurre en un silencio; cada `desde` se lleva al arranque de tramo mas cercano (hasta 0,45 s).
  for (const t of escena.turnos ?? []) {
    if (t.fijo) continue; // el cambio de hablante no tiene pausa (uno contesta encima del otro): se deja donde se escribio
    const cerca = voz.map((v) => v.desde).reduce((m, x) => (Math.abs(x - t.desde) < Math.abs(m - t.desde) ? x : m), Infinity);
    if (Math.abs(cerca - t.desde) <= 0.45) t.desde = +cerca.toFixed(3);
  }
  escena._avisos = avisosCorte;
  let dentro = alineadas.filter((c) => c.desde >= a - 0.05 && c.desde < b);
  // `omitir`: frases que Whisper ubico dentro del tramo pero no se dicen en el (la cola de la otra persona que quedo
  // pegada al arranque: "puede usar su don" antes de "¿Y cuánto cobraría", 13-oct-2026). Se quitan antes de cortar.
  for (const frase of escena.omitir ?? []) {
    const q = norm(frase).split(' ');
    const i = dentro.findIndex((c, k) => q.every((w, j) => dentro[k + j]?.limpia === w));
    if (i >= 0) dentro.splice(i, q.length);
    else escena._avisos.push(`omitir: no se encontro «${frase}»`);
  }
  // Limites duros del corte: entre el final de la ultima palabra que queda fuera y el inicio de la
  // primera que entra (y lo mismo al final). Asi no se cuela la cola de la frase anterior ("Uribe")
  // ni el arranque de la siguiente (Juan David, 12-oct-2026: "se corta muy antes", "comienza raro").
  const previa = alineadas.filter((c) => c.desde < a - 0.05).at(-1);
  const siguiente = alineadas.find((c) => c.desde >= b);
  // El limite de inicio puede pisar 50 ms la cola de la palabra anterior: cortar 40 ms despues de ella se
  // comia la primera silaba de la frase ("He desarrollado" en el Rosario, 13-oct-2026).
  // `inicioDuro` (segundos) es el espejo de `finDuro`: cuando Whisper ubica tarde la primera palabra y el corte se
  // come su arranque ("He desarrollado" del Rosario sonaba "desarrollado", 13-oct-2026), se mide con astats el
  // silencio previo y el tramo arranca ahi exacto.
  const limiteInicio = escena.inicioDuro ?? (previa ? Math.max(a - 0.6, previa.hasta - 0.05) : Math.max(0, a - 0.3));
  // Sin frase siguiente, la cola puede pasar de `hasta` (hasta 0,6 s) para que la ultima pagina se lea.
  // `finDuro` (segundos) manda cuando la palabra siguiente de Whisper esta mal ubicada y el corte automatico se come
  // el final de la ultima palabra ("el descanso eterno" de Capitano, 13-oct-2026): se mide con astats y se escribe en la pieza.
  const limiteFin = escena.finDuro ?? (siguiente ? Math.min(b + 0.6, siguiente.desde - 0.04) : Math.min(b + 0.6, duracionDe(path.join(CRUDO, escena.archivo)) - 0.05));
  captions = dentro.map((c) => ({ text: c.text, startMs: Math.round(c.desde * 1000), endMs: Math.round(c.hasta * 1000), confidence: c.confidence }));
  voz = voz.map((t) => ({ desde: Math.max(t.desde, limiteInicio), hasta: Math.min(t.hasta, limiteFin) })).filter((t) => t.hasta - t.desde > 0.05);
  // Sin palabras (b-roll con musica): el tramo entero tal cual.
  if (!captions.filter((c) => /[a-z0-9ñáéíóú]/i.test(c.text)).length) {
    return { segmentos: [{ desde: a, hasta: Math.min(b, duracionDe(path.join(CRUDO, escena.archivo))) }], subtitulos: [], texto: [], cola: 0 };
  }
  // Las palabras ya vienen alineadas (tramos + DTW): planificarCorte NO debe volver a alinearlas (voz vacia), o
  // repartia de nuevo por letras sobre los tramos recortados y el texto se corria hasta un segundo de la boca.
  // Los silencios para cortar salen de los huecos entre esas palabras.
  const corte = planificarCorte(captions, { ...OPCIONES_CORTE, voz: [], silencioMax: escena.silencioMax ?? OPCIONES_CORTE.silencioMax });
  // Red de seguridad: la toma arranca en `desde` y nunca termina antes de la ultima palabra + 0,35 s.
  if (corte.segmentos.length) {
    const primera = captions.find((c) => /[a-z0-9ñáéíóú]/i.test(c.text));
    const antes = corte.segmentos[0].desde;
    corte.segmentos[0].desde = +(escena.inicioDuro ?? Math.max(limiteInicio, Math.min(corte.segmentos[0].desde, primera.startMs / 1000 - 0.15))).toFixed(3);
    // Si el primer tramo arranca antes, todo el texto se corre lo mismo: sin esto el subtitulo iba
    // por detras de la boca (el lip sync "desajustado" del Rosario, 12-oct-2026).
    const corrimiento = Math.round((antes - corte.segmentos[0].desde) * 1000);
    if (corrimiento) corte.subtitulos = corte.subtitulos.map((x) => ({ ...x, startMs: x.startMs + corrimiento, endMs: x.endMs + corrimiento }));
    const ultima = captions.filter((c) => /[a-z0-9ñáéíóú]/i.test(c.text)).at(-1);
    const final = corte.segmentos.at(-1);
    final.hasta = +Math.min(limiteFin, Math.max(final.hasta, ultima.endMs / 1000 + COLA)).toFixed(3);
    // Lo que falte de cola (la frase siguiente viene pegada) se congela en el ultimo cuadro.
    corte.cola = +Math.max(0, ultima.endMs / 1000 + COLA - final.hasta).toFixed(3);
  }
  corte.subtitulos = corregir(corte.subtitulos, [...CORRECCIONES_COMUNES, ...(correcciones ?? []), ...(escena.correcciones ?? [])]);
  // Quien dice cada palabra: `turnos` en segundos del original ([{ desde, quien }]), por defecto Juan David.
  const turnos = [...(escena.turnos ?? [])].sort((x, y) => x.desde - y.desde);
  const quienEn = (sOriginal) => turnos.filter((t) => t.desde <= sOriginal + 0.05).at(-1)?.quien ?? 'jd';
  let cursor = 0;
  const tabla = corte.segmentos.map((s) => {
    const t = { local: cursor, ...s };
    cursor += s.hasta - s.desde;
    return t;
  });
  corte.subtitulos = corte.subtitulos.map((sub) => {
    const seg = tabla.findLast((x) => sub.startMs / 1000 >= x.local - 1e-3) ?? tabla[0];
    return { ...sub, quien: quienEn(seg.desde + sub.startMs / 1000 - seg.local) };
  });
  return corte;
}

/**
 * Retrato pixelado del entrevistado: recorte (fracciones) de un cuadro del proxy, 64 px de ancho y 20 colores.
 * Con 44 px y 14 colores la cara se leia como una mancha (Juan David, 13-oct-2026: "descuadrada y pixelada");
 * las coordenadas salen de la deteccion de caras (trabajo/2026-10-sofa/caras.py), no a ojo.
 */
function retrato(slug, n, archivoProxy, r) {
  // El nombre lleva una huella del clip y del recorte: al insertar una escena o mover el recorte no se
  // reutiliza un retrato viejo (en SOFA03 Eren salio con el casco de Angemon, 12-oct-2026).
  let h = 2166136261;
  for (const c of `${archivoProxy}|${r.t}|${r.x}|${r.y}|${r.w}|${r.h}|${r.ancho ?? ''}|${r.colores ?? ''}|${r.fijo ?? ''}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const nombre = `${slug}-${n}-${h.toString(16)}.png`;
  const salida = path.join(RETRATOS, nombre);
  if (existsSync(salida)) return `sofa/retratos/${nombre}`;
  const anchoPx = r.ancho ?? 64;
  // `fijo`: una imagen dada (el retrato de Juan David que el mismo eligio, 13-oct-2026) en vez de un recorte del proxy.
  const recorte = r.fijo ? '' : `crop=iw*${r.w}:ih*${r.h}:iw*${r.x}:ih*${r.y},`;
  const filtro = `[0:v]${recorte}scale=${anchoPx}:-2:flags=area,split[a][b];[a]palettegen=max_colors=${r.colores ?? 20}:reserve_transparent=0:stats_mode=full[p];[b][p]paletteuse=dither=none[o];[o]scale=iw*12:-1:flags=neighbor`;
  correr([...(r.fijo ? [] : ['-ss', String(r.t ?? 0)]), '-i', r.fijo ? path.join(RAIZ, r.fijo) : path.join(RAIZ, 'public', archivoProxy), '-frames:v', '1', '-filter_complex', filtro, salida]);
  return `sofa/retratos/${nombre}`;
}

const slugs = process.argv.slice(2);
const piezas = readdirSync(CARPETA_PIEZAS)
  .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
  .map((f) => ({ ruta: path.join(CARPETA_PIEZAS, f), pieza: JSON.parse(readFileSync(path.join(CARPETA_PIEZAS, f), 'utf8')) }))
  .filter(({ pieza }) => pieza.plantilla === 'Arcade' && (!slugs.length || slugs.includes(pieza.slug)));

const aCuadros = (s) => Math.round(s * FPS);
const DURACIONES = { titulo: 2.8, nivel: 1.5, final: 2.4 };

/**
 * Locucion grabada aparte sobre una escena sin metraje (titulo, final): `voz: { archivo, en }` con el audio en
 * public/ y, al lado, `<archivo>.json` con las palabras y sus tiempos ({ text, startMs, endMs }). La escena se
 * alarga hasta que la voz termina y se lee la ultima pagina (sofa-emprendedores, 19-oct-2026: "Conoce Bélula…").
 */
function conVoz(escena) {
  if (!escena.voz) return escena;
  const audio = path.join(RAIZ, 'public', escena.voz.archivo);
  const palabras = JSON.parse(readFileSync(audio.replace(/\.\w+$/, '.json'), 'utf8'));
  const en = escena.voz.en ?? 0.5;
  const subtitulos = palabras.map((p) => ({ ...p, quien: p.quien ?? 'jd', startMs: Math.round(p.startMs + en * 1000), endMs: Math.round(p.endMs + en * 1000) }));
  const fin = Math.max(en + duracionDe(audio), subtitulos.at(-1).endMs / 1000 + 0.9);
  console.log(`  ${escena.tipo} con voz ${escena.voz.archivo}: «${palabras.map((p) => p.text.trim()).join(' ')}»`);
  return { ...escena, cuadros: Math.max(escena.cuadros, aCuadros(fin)), subtitulos };
}

for (const { ruta, pieza } of piezas) {
  console.log(`\n▶ ${pieza.slug} · ${pieza.titulo}`);
  const avisos = [];
  const escenas = [];
  let cursor = 0;
  let n = 0;
  for (const e of pieza.escenas) {
    const inicio = cursor;
    if (e.tipo === 'clip' || e.tipo === 'cierre') {
      n++;
      const p = proxy(e.archivo, e);
      const corte = cortar(e, pieza.correcciones);
      const velocidad = e.velocidad ?? pieza.velocidad ?? 1.08;
      let local = 0;
      const tramos = corte.segmentos.map((s) => {
        const cuadros = Math.max(1, Math.round(((s.hasta - s.desde) / velocidad) * FPS));
        const t = { archivo: p.archivo, desde: s.desde, hasta: s.hasta, velocidad, inicio: local, cuadros };
        local += cuadros;
        return t;
      });
      const subtitulos = corte.subtitulos.map((s) => ({ ...s, startMs: Math.round(s.startMs / velocidad), endMs: Math.round(s.endMs / velocidad) }));
      // Cola congelada (cuadros) cuando el crudo no deja leer la ultima pagina; la plantilla la dibuja con el ultimo cuadro quieto.
      const cola = Math.round(((corte.cola ?? 0) / velocidad) * FPS);
      const cuadros = local + cola;
      const generada = { ...e, inicio, cuadros, cola, tramos, subtitulos, texto: corte.texto.join(' ') };
      if (cola) console.log(`      cola congelada de ${(cola / FPS).toFixed(2)} s (la frase siguiente del crudo viene pegada)`);
      for (const av of e._avisos ?? []) avisos.push(`${e.archivo}: ${av}`);
      delete generada._avisos;
      if (subtitulos.length) {
        const borde = (lista) => lista.map((s) => `${s.quien === 'p2' ? '*' : ''}${s.text.trim()}`).join(' ');
        console.log(`      «${borde(subtitulos.slice(0, 5))} … ${borde(subtitulos.slice(-4))}»`);
      }
      if (e.ficha && e.retrato) generada.retratoPng = retrato(pieza.slug, n, p.archivo, e.retrato);
      escenas.push(generada);
      cursor += cuadros;
      console.log(`  ${e.tipo} ${e.archivo} [${e.desde ?? 0}–${e.hasta ?? 'fin'}] → ${(cuadros / FPS).toFixed(1)} s · ${subtitulos.length} palabras`);
      if (!subtitulos.length && e.tipo === 'clip' && !e.sinVoz) avisos.push(`${e.archivo}: sin palabras en el tramo`);
    } else if (e.tipo === 'juego') {
      const cuadros = aCuadros(e.segundos ?? 4);
      escenas.push({ ...e, inicio, cuadros });
      cursor += cuadros;
    } else {
      const generada = conVoz({ ...e, inicio, cuadros: aCuadros(e.segundos ?? DURACIONES[e.tipo] ?? 2) });
      escenas.push(generada);
      cursor += generada.cuadros;
    }
  }
  // Tarjeta final con la firma y el CTA, como en todos los videos del estudio (`pieza.final.voz`: locucion encima).
  const final = conVoz({ ...(pieza.final ?? {}), tipo: 'final', inicio: cursor, cuadros: aCuadros(pieza.final?.segundos ?? DURACIONES.final) });
  escenas.push(final);
  cursor += final.cuadros;
  for (const a of avisos) console.log(`  ⚠ ${a}`);
  const generado = { escenas, total: cursor, avisos };
  writeFileSync(ruta, JSON.stringify({ ...pieza, generado }, null, 2) + '\n');
  console.log(`  ✓ ${(cursor / FPS).toFixed(1)} s en ${escenas.length} escenas`);
  if (cursor / FPS > 90) console.log('  ⚠ pasa de 90 s: Instagram no lo acepta como reel');
}
