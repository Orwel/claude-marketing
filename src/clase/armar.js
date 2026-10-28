/**
 * Arma una clase grabada editada: npm run clase -- <slug> [--muestra=DESDE,HASTA] [--rehacer=base,audio,marco,capas]
 *
 * Lee clases/<slug>.json (qué se hace) y trabaja en trabajo/clases/<slug>/ (crudo, audio,
 * transcripción, intermedios y salidas). Todo tiempo del JSON va en segundos del crudo.
 *
 *   1. base.py      corte del inicio/final + difuminado de zonas privadas (cursor nítido)
 *   2. audio        sincronía (un desfase o por tramos), limpieza suave y -16 LUFS en dos pasadas
 *   3. marco        Remotion: banda superior, itinerario, fichas y comentarios del chat, en un
 *                   solo render de los cuadros que se mueven + un cuadro por tramo quieto
 *   4. capas        Remotion: intro, cartel (con transparencia) y cierre
 *   5. subtítulos   ASS desde la transcripción, en la franja inferior (no tapan la pantalla)
 *   6. final        ffmpeg une todo: marco + pantalla + cámara + cartel + subtítulos, 30 fps
 *
 * Con --muestra sale solo ese tramo (con intro si empieza en el inicio): es lo que se le
 * muestra a Juan David antes de renderizar la clase entera. Nada se borra: cada salida lleva
 * versión (clase.version) y los intermedios quedan en la carpeta de trabajo.
 *
 * Por qué no Remotion para todo: 90 minutos a 30 fps son 170.000 cuadros; sin GPU serían horas
 * solo de captura. La grabación pasa por ffmpeg una vez y Remotion dibuja solo lo nuevo.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, cpSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { RAIZ } from '../config.js';
import { remotion } from '../remotion-cli.js';
import { SEG_CAMBIO, ventanasAnimadas } from '../../remotion/clase/tiempo.js';
import { generarAss } from './subtitulos.js';

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith('--'));
if (!slug) throw new Error('Uso: npm run clase -- <slug> [--muestra=DESDE,HASTA] [--rehacer=base,audio,marco,capas]');
const opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const rehacer = new Set((opt.rehacer ?? '').split(',').filter(Boolean));
if (opt.rehacer === 'todo' || opt.rehacer === '') ['base', 'audio', 'marco', 'capas'].forEach((p) => rehacer.add(p));

const rutaClase = path.join(RAIZ, 'clases', `${slug}.json`);
const clase = JSON.parse(readFileSync(rutaClase, 'utf8'));
const DIR = path.join(RAIZ, 'trabajo', 'clases', slug);
const crudo = path.join(DIR, '00-crudo', clase.fuente.archivo);
const FPS = 30;
const q = (s) => Math.round(s * FPS) / FPS; // todo corte cae en un cuadro exacto de 30 fps

const inicio = clase.inicio.seg;
const fin = clase.fin?.seg ?? duracionDe(crudo);
const [A, B] = opt.muestra ? opt.muestra.split(',').map(Number) : [inicio, fin];
const conIntro = Math.abs(A - inicio) < 0.01;
const conCierre = !opt.muestra || Math.abs(B - fin) < 0.01;
const nombre = opt.muestra ? `muestra-${Math.round(A)}-${Math.round(B)}` : 'completa';
const V = `v${clase.version ?? 1}`;
const T = path.join(DIR, `10-${nombre}-${V}`);
mkdirSync(T, { recursive: true });
const SALIDA = path.join(DIR, 'salida');
mkdirSync(SALIDA, { recursive: true });
const final = path.join(SALIDA, `${slug}-${nombre}-${V}.mp4`);

const I = conIntro ? clase.intro.dura : 0; // la intro corre el cuerpo hacia adelante
const C = conCierre ? clase.cierre.dura : 0;
const largo = q(B - A);
// segundo del crudo (video) → segundo del MP4 final
const aSalida = (t) => t - A + I;

console.log(`\n▶ ${clase.titulo} · ${nombre} · ${V}\n  crudo ${A.toFixed(1)}–${B.toFixed(1)} s (${(largo / 60).toFixed(1)} min)  intro ${I} s  cierre ${C} s`);

// ---------- 1. base: corte + difuminado ----------
const base = path.join(T, 'base.mp4');
if (!existsSync(base) || rehacer.has('base')) {
  console.log('\n1/6 base (corte + difuminado)…');
  run('python', ['-I', path.join(RAIZ, 'src/clase/base.py'), rutaClase, crudo, base, `--desde=${A}`, `--hasta=${A + largo}`]);
}

// ---------- 2. audio: sincronía + limpieza + volumen ----------
const audio = path.join(T, 'audio.wav');
if (!existsSync(audio) || rehacer.has('audio')) {
  console.log('\n2/6 audio (sincronía, limpieza, -16 LUFS)…');
  const crudoSync = path.join(T, 'audio-sync.wav');
  sincronizarAudio(crudoSync);
  const cadena = clase.audio?.filtros ?? 'highpass=f=70,afftdn=nf=-28';
  // Dos pasadas de loudnorm: la primera mide, la segunda corrige lineal (sin bombeo).
  const med = spawnSync('ffmpeg', ['-hide_banner', '-i', crudoSync, '-af', `${cadena},loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json`, '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const j = JSON.parse(med.slice(med.lastIndexOf('{'), med.lastIndexOf('}') + 1));
  run('ffmpeg', ['-v', 'error', '-y', '-i', crudoSync, '-af',
    `${cadena},loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true,aresample=48000`,
    '-ar', '48000', '-ac', '2', audio]);
}

// ---------- 3. marco ----------
const paquete = path.join(DIR, 'paquete');
const marco = path.join(T, 'marco.txt');
if (!existsSync(marco) || rehacer.has('marco') || rehacer.has('capas')) empaquetar();
if (!existsSync(marco) || rehacer.has('marco')) {
  console.log('\n3/6 marco (Remotion)…');
  armarMarco();
}

// ---------- 4. capas: intro, cartel, cierre ----------
const capas = { intro: path.join(T, 'intro.mp4'), cartel: path.join(T, 'cartel.mov'), cierre: path.join(T, 'cierre.mp4') };
const cartelEn = clase.cartel.en ?? inicio;
const conCartel = cartelEn >= A && cartelEn < B;
if (rehacer.has('capas') || (conIntro && !existsSync(capas.intro)) || (conCartel && !existsSync(capas.cartel)) || (conCierre && !existsSync(capas.cierre))) {
  console.log('\n4/6 capas (intro, cartel, cierre)…');
  const props = path.join(T, 'props-clase.json');
  writeFileSync(props, JSON.stringify({ clase }));
  const id = `clase--${slug}`;
  if (conIntro) remotion(['render', paquete, `${id}--intro`, capas.intro, `--props=${props}`, '--codec=h264', '--crf=16', '--log=error']);
  if (conCierre) remotion(['render', paquete, `${id}--cierre`, capas.cierre, `--props=${props}`, '--codec=h264', '--crf=16', '--log=error']);
  // ProRes 4444 conserva la transparencia del cartel para pegarlo sobre la pantalla.
  if (conCartel) remotion(['render', paquete, `${id}--cartel`, capas.cartel, `--props=${props}`, '--codec=prores', '--prores-profile=4444', '--pixel-format=yuva444p10le', '--image-format=png', '--log=error']);
}

// ---------- 5. subtítulos ----------
console.log('\n5/6 subtítulos…');
const ass = path.join(T, 'subtitulos.ass');
const transcripcion = JSON.parse(readFileSync(path.join(DIR, '01-audio', 'transcripcion.json'), 'utf8'));
const nSubs = generarAss({ clase, transcripcion, desde: A, hasta: A + largo, aSalida: (ta) => aSalida(ta + desfaseEn(ta)), salida: ass });
console.log(`  ${nSubs} líneas`);

// ---------- 6. final ----------
console.log('\n6/6 final (ffmpeg)…');
componerFinal();
console.log(`\n✔ ${path.relative(RAIZ, final)}  (${(duracionDe(final) / 60).toFixed(2)} min)`);

// =====================================================================================

function run(cmd, a, opts = {}) {
  const r = spawnSync(cmd, a, { stdio: 'inherit', cwd: RAIZ, ...opts });
  if (r.status !== 0) throw new Error(`${cmd} falló (${r.status})`);
}

function duracionDe(archivo) {
  return Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', archivo], { encoding: 'utf8' }).trim());
}

/** Desfase vigente en el segundo t del crudo (imagen tarde = positivo). */
function desfaseEn(t) {
  const tramos = clase.sincronia?.tramos ?? [];
  const z = tramos.find((x) => t >= x.desde && t < x.hasta) ?? tramos[tramos.length - 1];
  return z?.desfase ?? 0;
}

/**
 * Si la imagen llega d segundos tarde, el sonido del segundo t del video es el que se grabó
 * en t − d. Por tramos: cada tramo se recorta con su propio desfase y se une con un fundido de
 * 30 ms (el salto de un desfase a otro, en silencio de la voz, no se oye).
 */
function sincronizarAudio(salida) {
  const tramos = (clase.sincronia?.tramos?.length ? clase.sincronia.tramos : [{ desde: 0, hasta: 1e9, desfase: 0 }])
    .map((z) => ({ ...z, desde: Math.max(z.desde, A), hasta: Math.min(z.hasta, A + largo) }))
    .filter((z) => z.hasta > z.desde);
  const partes = tramos.map((z, i) => {
    const p = path.join(T, `audio-tramo-${i}.wav`);
    const ini = z.desde - z.desfase;
    // Antes del segundo 0 del crudo no hay audio: se rellena con silencio.
    const pad = Math.max(0, -ini);
    run('ffmpeg', ['-v', 'error', '-y', '-ss', Math.max(0, ini).toFixed(3), '-i', crudo, '-t', (z.hasta - z.desde - pad).toFixed(3), '-vn',
      '-af', `adelay=${Math.round(pad * 1000)}:all=1,apad=whole_dur=${(z.hasta - z.desde).toFixed(3)},afade=t=in:d=0.03,afade=t=out:st=${(z.hasta - z.desde - 0.03).toFixed(3)}:d=0.03`,
      '-ar', '48000', '-ac', '1', p]);
    return p;
  });
  if (partes.length === 1) return cpSync(partes[0], salida);
  const lista = path.join(T, 'audio-tramos.txt');
  writeFileSync(lista, partes.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n'));
  run('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', salida]);
}

function empaquetar() {
  // Un public mínimo: el del estudio pesa GB (crudos de redes) y el paquete lo copiaría entero.
  const pub = path.join(DIR, 'public');
  for (const r of ['fuentes', path.dirname(clase.logo)]) cpSync(path.join(RAIZ, 'public', r), path.join(pub, r), { recursive: true });
  if (!existsSync(path.join(paquete, 'index.html')) || rehacer.has('marco') || rehacer.has('capas')) {
    console.log('  empaquetando Remotion…');
    remotion(['bundle', 'remotion/index.js', `--out-dir=${paquete}`, `--public-dir=${pub}`, '--log=error']);
  }
}

/**
 * El marco cambia solo en las ventanas de animación (tiempo.js). Se renderiza UNA secuencia de
 * PNG con: todos los cuadros de esas ventanas + un cuadro por tramo quieto. Luego ffmpeg hace un
 * MP4 por tramo con los mismos ajustes (para unirlos sin recomprimir) y una lista concat.
 */
function armarMarco() {
  const v = ventanasAnimadas(clase).map(([a, b]) => [q(Math.max(a, A)), q(Math.min(b, A + largo))]).filter(([a, b]) => b > a);
  const tramos = [];
  let t = A;
  for (const [a, b] of v) {
    if (a > t) tramos.push({ tipo: 'fijo', a: t, b: a });
    tramos.push({ tipo: 'anim', a: Math.max(a, t), b });
    t = Math.max(t, b);
  }
  if (t < A + largo) tramos.push({ tipo: 'fijo', a: t, b: A + largo });
  const tiempos = [];
  for (const z of tramos) {
    z.k = tiempos.length;
    if (z.tipo === 'fijo') tiempos.push((z.a + z.b) / 2);
    else for (let f = 0; f < Math.round((z.b - z.a) * FPS); f++) tiempos.push(z.a + f / FPS);
  }
  console.log(`  ${tramos.length} tramos, ${tiempos.length} cuadros a renderizar (de ${Math.round(largo * FPS)})`);
  const props = path.join(T, 'props-marco.json');
  writeFileSync(props, JSON.stringify({ clase, tiempos }));
  const sec = path.join(T, 'marco-png');
  remotion(['render', paquete, `clase--${slug}--marco`, sec, `--props=${props}`, '--sequence', '--image-format=png', '--log=error']);
  const pngs = readdirSync(sec).filter((f) => f.endsWith('.png')).sort();
  const comun = ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-g', '60', '-bf', '0', '-an'];
  const lineas = [];
  tramos.forEach((z, i) => {
    const out = path.join(T, `marco-${String(i).padStart(4, '0')}.mp4`);
    const n = Math.round((z.b - z.a) * FPS);
    if (n <= 0) return;
    if (z.tipo === 'fijo') run('ffmpeg', ['-v', 'error', '-y', '-loop', '1', '-framerate', String(FPS), '-i', path.join(sec, pngs[z.k]), '-frames:v', String(n), '-tune', 'stillimage', ...comun, out]);
    else run('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-start_number', String(z.k), '-i', path.join(sec, patronPng(pngs[0])), '-frames:v', String(n), ...comun, out]);
    lineas.push(`file '${out.replace(/\\/g, '/')}'`);
  });
  writeFileSync(marco, lineas.join('\n'));
}

/** Remotion nombra la secuencia element-0000.png (relleno según el total): devuelve el patrón. */
function patronPng(primero) {
  const m = primero.match(/^(.*?)(\d+)\.png$/);
  return `${m[1]}%0${m[2].length}d.png`;
}

function componerFinal() {
  const [px, py, pw, ph] = clase.marco.pantalla;
  const [cx, cy, cw, ch] = clase.marco.camara;
  const ent = ['-f', 'concat', '-safe', '0', '-i', marco, '-i', base, '-i', audio];
  let n = 3;
  const f = [
    `[1:v]fps=${FPS},split=2[b1][b2]`,
    `[b1]crop=${pw}:${ph}:${px}:${py}[pan]`,
    `[b2]crop=${cw}:${ch}:${cx}:${cy}[cam]`,
    `[0:v][pan]overlay=${px}:${py}:shortest=1[m1]`,
    `[m1][cam]overlay=${cx}:${cy}[m2]`,
  ];
  let ult = 'm2';
  if (conCartel) {
    ent.push('-i', capas.cartel);
    const t0 = cartelEn - A; // tiempo dentro del cuerpo (sin intro)
    f.push(`[${n}:v]setpts=PTS-STARTPTS+${t0.toFixed(3)}/TB[car]`, `[${ult}][car]overlay=0:0:eof_action=pass[m3]`);
    ult = 'm3';
    n++;
  }
  const fuentes = path.join(RAIZ, 'public', 'fuentes', 'ttf').replace(/\\/g, '/').replace(':', '\\:');
  const assEsc = ass.replace(/\\/g, '/').replace(':', '\\:');
  // Los subtítulos se queman sobre el cuerpo SIN intro: el ASS se escribió con tiempos de salida,
  // así que se le resta la intro al quemarlos aquí (setpts del cuerpo empieza en 0).
  f.push(`[${ult}]setpts=PTS+${I}/TB,subtitles='${assEsc}':fontsdir='${fuentes}',setpts=PTS-${I}/TB,format=yuv420p[cuerpo]`);
  f.push(`[2:a]aformat=sample_rates=48000:channel_layouts=stereo[acuerpo]`);
  const segs = [];
  if (conIntro) {
    ent.push('-i', capas.intro);
    f.push(`[${n}:v]fps=${FPS},format=yuv420p[vi]`, `${campana(clase.intro.dura)}[ai]`);
    segs.push('[vi][ai]');
    n++;
  }
  segs.push('[cuerpo][acuerpo]');
  if (conCierre) {
    ent.push('-i', capas.cierre);
    f.push(`[${n}:v]fps=${FPS},format=yuv420p[vc]`, `${campana(clase.cierre.dura)}[ac]`);
    segs.push('[vc][ac]');
    n++;
  }
  f.push(`${segs.join('')}concat=n=${segs.length}:v=1:a=1[v][a]`);
  run('ffmpeg', ['-v', 'error', '-stats', '-y', ...ent, '-filter_complex', f.join(';'), '-map', '[v]', '-map', '[a]', '-t', (I + largo + C).toFixed(3),
    '-c:v', 'libx264', '-preset', opt.preset ?? 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
    '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', final]);
}

/**
 * Campanita de cabina de avión (dos tonos, como el «ding-dong» antes de un anuncio a bordo):
 * le da sonido a la intro y al cierre sin música con licencia. Sintetizada con ffmpeg.
 */
function campana(dura) {
  const tono = (f, t0) => `sin(2*PI*${f}*(t-${t0}))*exp(-3.2*(t-${t0}))*gte(t,${t0})`;
  return `aevalsrc='0.22*(${tono(988, 0.35)}+${tono(784, 0.95)})':s=48000:d=${dura},aformat=sample_rates=48000:channel_layouts=stereo`;
}
