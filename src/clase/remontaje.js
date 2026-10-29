/**
 * Remontaje de una clase grabada: npm run clase-remontaje -- <slug> [--muestra=DESDE,HASTA]
 *
 * Toma el master (npm run clase -- <slug> --master: la clase lineal sin subtítulos y con las capas
 * del remontaje encima) y en UNA pasada de ffmpeg:
 *
 *   1. corta los silencios: solo donde no hay palabras (transcripción) Y el audio está callado
 *      (silencedetect). Deja aire a cada lado para no comerse una palabra pegada a la otra.
 *   2. inserta un vuelo por el planeta (SaltoParada) en cada cambio de parada, en una pausa.
 *   3. quema los subtítulos sobre la versión ya recortada, palabra por palabra (la que se dice en
 *      naranja y con un pequeño golpe de escala).
 *   4. mezcla la pista de efectos (src/clase/efectos.py): whoosh en los vuelos, swoosh cuando entra
 *      Claude dibujado, un pop suave en cada ficha.
 *
 * También escribe los capítulos y el .vtt con los tiempos nuevos (crudo → master → final).
 * Todo tiempo del JSON va en segundos del crudo, como en armar.js.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { RAIZ } from '../config.js';
import { remotion } from '../remotion-cli.js';
import { lineasDe } from './subtitulos.js';
import { escribirCapitulos } from './capitulos.js';

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith('--'));
const opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const clase = JSON.parse(readFileSync(path.join(RAIZ, 'clases', `${slug}.json`), 'utf8'));
const R = clase.remontaje;
const DIR = path.join(RAIZ, 'trabajo', 'clases', slug);
const DR = path.join(DIR, '40-remontaje');
mkdirSync(DR, { recursive: true });
const FPS = 30;
const q = (s) => Math.round(s * FPS) / FPS;
const V = `v${clase.version ?? 1}`;

const inicio = clase.inicio.seg;
const fin = clase.fin?.seg;
const [A, B] = opt.muestra ? opt.muestra.split(',').map(Number) : [inicio, fin];
const conIntro = Math.abs(A - inicio) < 0.01;
const nombre = opt.muestra ? `muestra-${Math.round(A)}-${Math.round(B)}` : 'completa';
const master = path.join(DIR, 'salida', `${slug}-${nombre}-master-${V}.mp4`);
if (!existsSync(master)) throw new Error(`Falta el master: npm run clase -- ${slug} --master${opt.muestra ? ` --muestra=${opt.muestra}` : ''}`);
const final = path.join(DIR, 'salida', `${slug}-${nombre}-${V}.mp4`);
const DS = 4.4; // duración del salto (remotion/clase/Remontaje.jsx → duracionSalto)

// Lo que va antes del cuerpo en el master (logo + intro): igual que en armar.js.
const L = conIntro && clase.introLogo !== false ? q(clase.introLogo?.dura ?? 10) : 0;
const I = (conIntro ? clase.intro.dura : 0) + L;
const durMaster = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', master], { encoding: 'utf8' }));
const desfaseEn = (t) => {
  const tr = clase.sincronia?.tramos ?? [];
  const z = tr.find((x) => t >= x.desde && t < x.hasta) ?? tr[tr.length - 1];
  return z?.desfase ?? 0;
};
// crudo (video) → master; y la voz: segundo del audio crudo → master (la imagen va con desfase).
const aMaster = (t) => t - A + I;
const vozAMaster = (ta) => aMaster(ta + desfaseEn(ta));

console.log(`\n▶ remontaje · ${clase.titulo} · ${nombre} · ${V}`);

// ---------- 1. cortes ----------
const transcripcion = JSON.parse(readFileSync(path.join(DIR, '01-audio', 'transcripcion.json'), 'utf8'));
const palabras = transcripcion.flatMap((s) => s.palabras).filter((w) => w.p.trim() && w.fin > A && w.ini < B);
const silencios = leerPares(path.join(DR, 'silencios.txt'));
// No se corta donde hay una animación que se vería saltar: Claude dibujado (salvo tapas), el juego y el cartel.
const intocables = [
  ...(R.claude ?? []).filter((e) => !e.ciclo).map((e) => [e.en - 0.5, e.en + e.dura + 0.5]),
  ...(R.contexto ?? []).map((e) => [e.en - 0.5, e.en + e.dura + 0.5]),
  ...(R.juego ? [[R.juego.en, R.juego.hasta]] : []),
  [clase.cartel.en - 1, clase.cartel.en + clase.cartel.dura + 1],
  ...(R.sinCortes ?? []),
];
const AIRE_ANTES = R.aire?.antes ?? 0.3; // tras la última palabra
const AIRE_DESPUES = R.aire?.despues ?? 0.25; // antes de la siguiente
const MIN_CORTE = 0.45;
const cortesVoz = [];
for (let i = 1; i < palabras.length; i++) {
  const a0 = palabras[i - 1].fin + AIRE_ANTES;
  const b0 = palabras[i].ini - AIRE_DESPUES;
  if (b0 - a0 < MIN_CORTE) continue;
  // El hueco sin palabras debe estar callado de verdad: si Whisper no oyó algo, el audio lo delata.
  for (const [sa, sb] of silencios) {
    const a = Math.max(a0, sa + 0.08);
    const b = Math.min(b0, sb - 0.08);
    if (b - a >= MIN_CORTE) cortesVoz.push([a, b]);
  }
}
let cortes = cortesVoz
  .map(([a, b]) => [q(vozAMaster(a)), q(vozAMaster(b))])
  .filter(([a, b]) => b > a && a > I + 0.5 && b < I + (B - A) - 0.5)
  .filter(([a, b]) => !intocables.some(([x, y]) => aMaster(x) < b && aMaster(y) > a));
cortes = [...cortes, ...(R.cortes ?? []).map(([a, b]) => [q(aMaster(a)), q(aMaster(b))])]
  .sort((x, y) => x[0] - y[0])
  .reduce((acc, c) => {
    const u = acc[acc.length - 1];
    if (u && c[0] <= u[1]) u[1] = Math.max(u[1], c[1]);
    else acc.push([...c]);
    return acc;
  }, []);
const ahorro = cortes.reduce((s, [a, b]) => s + b - a, 0);
console.log(`  ${cortes.length} cortes de silencio (${(ahorro / 60).toFixed(1)} min)`);

// ---------- 2. saltos de parada ----------
// Cada salto va en la pausa más cercana al cambio de parada (±8 s), nunca a mitad de palabra.
const pausas = palabras.slice(1).map((w, i) => [vozAMaster(palabras[i].fin), vozAMaster(w.ini)]).filter(([a, b]) => b - a >= 0.3);
const saltos = clase.paradas
  .map((p, k) => ({ k, en: p.desde }))
  .filter(({ k, en }) => k > 0 && en > A && en < B)
  .map(({ k, en }) => {
    const m = aMaster(en);
    // La primera pausa desde el cambio de parada (hasta 8 s después): al volver del vuelo la banda ya
    // muestra la parada nueva. Si no hay, la más cercana.
    const cerca = pausas.filter(([a, b]) => (a + b) / 2 >= m - 0.3 && (a + b) / 2 < m + 8)[0]
      ?? pausas.filter(([a, b]) => Math.abs((a + b) / 2 - m) < 8).sort((x, y) => Math.abs((x[0] + x[1]) / 2 - m) - Math.abs((y[0] + y[1]) / 2 - m))[0];
    let punto = cerca ? (cerca[0] + cerca[1]) / 2 : m;
    const dentro = cortes.find(([a, b]) => punto > a && punto < b);
    if (dentro) punto = dentro[0];
    return { k, punto: q(punto), archivo: path.join(DR, `salto-${k}.mp4`) };
  });
console.log(`  ${saltos.length} vuelos entre paradas`);

// master → cuerpo recortado (sin saltos) → final (con saltos)
const aRecortado = (m) => m - cortes.reduce((s, [a, b]) => s + (m >= b ? b - a : m > a ? m - a : 0), 0);
const aFinal = (m) => aRecortado(m) + saltos.filter((s) => s.punto <= m).length * DS;
const crudoAFinal = (t) => aFinal(aMaster(t));

// ---------- 3. renders de los saltos ----------
const paq = path.join(DIR, 'paquete-remontaje');
const props = path.join(DR, 'props-clase.json');
writeFileSync(props, JSON.stringify({ clase }));
for (const s of saltos) {
  if (existsSync(s.archivo) && !('rehacer' in opt)) continue;
  console.log(`  render salto ${s.k}…`);
  remotion(['render', paq, `clase--${slug}--salto-${s.k}`, s.archivo, `--props=${props}`, '--codec=h264', '--crf=16', '--concurrency=2', '--timeout=120000', '--log=error']);
}

// ---------- 4. subtítulos con golpe ----------
const ass = path.join(DR, `subtitulos-${nombre}.ass`);
const nSubs = escribirAss();
console.log(`  ${nSubs} líneas de subtítulos`);

// ---------- 5. efectos ----------
const durFinal = aFinal(durMaster);
const eventos = [];
for (const s of saltos) {
  const t = aFinal(s.punto) - DS;
  eventos.push({ t: t + 0.25, tipo: 'whoosh' }, { t: t + 2.1, tipo: 'ding', vol: 0.8 });
}
for (const e of R.claude ?? []) {
  if (e.en < A || e.en > B) continue;
  eventos.push({ t: crudoAFinal(e.en) - 0.1, tipo: 'swoosh' }, { t: crudoAFinal(e.en + e.dura) - 0.35, tipo: 'swoosh', vol: 0.7 });
}
for (const e of R.contexto ?? []) {
  if (e.en < A || e.en > B) continue;
  eventos.push({ t: crudoAFinal(e.en) - 0.1, tipo: 'swoosh', vol: 0.85 }, { t: crudoAFinal(e.en + e.dura) - 0.35, tipo: 'swoosh', vol: 0.55 });
}
for (const f of clase.fichas ?? []) if (f.en > A && f.en < B) eventos.push({ t: crudoAFinal(f.en), tipo: 'pop' });
const jsonEv = path.join(DR, `efectos-${nombre}.json`);
const efectos = path.join(DR, `efectos-${nombre}.wav`);
writeFileSync(jsonEv, JSON.stringify({ dura: durFinal, eventos }));
run('python', ['-I', path.join(RAIZ, 'src/clase/efectos.py'), jsonEv, efectos]);

// ---------- 6. una pasada de ffmpeg ----------
console.log('\n  final (ffmpeg)…');
// ffmpeg no parsea una expresión con ~100 between() o más («Cannot allocate memory»; la clase completa
// tiene 164 cortes): se encadenan varios select de a 40. Sin setpts entre ellos, t sigue siendo el
// tiempo del master en todos.
const fuera = (filtro, vacio) => {
  const grupos = [];
  for (let i = 0; i < cortes.length; i += 40) grupos.push(cortes.slice(i, i + 40));
  return grupos.map((g) => `${filtro}='not(${g.map(([a, b]) => `between(t,${a.toFixed(4)},${(b - 1 / FPS / 2).toFixed(4)})`).join('+')})'`).join(',') || vacio;
};
const ent = ['-i', master];
const f = [];
// Primero se quitan los cuadros y muestras de los cortes (tiempo del master) y se renumera.
f.push(`[0:v]${fuera('select', 'null')},setpts=N/${FPS}/TB,split=${saltos.length + 1}${Array.from({ length: saltos.length + 1 }, (_, i) => `[v${i}]`).join('')}`);
f.push(`[0:a]${fuera('aselect', 'anull')},asetpts=N/SR/TB,asplit=${saltos.length + 1}${Array.from({ length: saltos.length + 1 }, (_, i) => `[a${i}]`).join('')}`);
// Luego se parte el cuerpo recortado en los puntos de los saltos y se intercalan los vuelos.
const puntos = [0, ...saltos.map((s) => aRecortado(s.punto)), Infinity];
const segs = [];
puntos.slice(0, -1).forEach((a, i) => {
  const b = puntos[i + 1];
  const fin2 = Number.isFinite(b) ? `:end=${b.toFixed(4)}` : '';
  f.push(`[v${i}]trim=start=${a.toFixed(4)}${fin2},setpts=PTS-STARTPTS,format=yuv420p,setsar=1[pv${i}]`, `[a${i}]atrim=start=${a.toFixed(4)}${fin2},asetpts=PTS-STARTPTS[pa${i}]`);
  segs.push(`[pv${i}][pa${i}]`);
  if (saltos[i]) {
    ent.push('-i', saltos[i].archivo);
    const n = i + 1;
    f.push(`[${n}:v]fps=${FPS},scale=1920:1080,format=yuv420p,setsar=1[sv${i}]`, `anullsrc=r=48000:cl=stereo,atrim=duration=${DS}[sa${i}]`);
    segs.push(`[sv${i}][sa${i}]`);
  }
});
const fuentes = path.join(RAIZ, 'public', 'fuentes', 'ttf').replace(/\\/g, '/').replace(':', '\\:');
const assEsc = ass.replace(/\\/g, '/').replace(':', '\\:');
ent.push('-i', efectos);
f.push(`${segs.join('')}concat=n=${segs.length}:v=1:a=1[vc][ac]`);
f.push(`[vc]subtitles='${assEsc}':fontsdir='${fuentes}',format=yuv420p[v]`);
f.push(`[${saltos.length + 1}:a]aformat=sample_rates=48000:channel_layouts=stereo[ef]`, `[ac][ef]amix=inputs=2:duration=first:normalize=0[a]`);
run('ffmpeg', ['-v', 'error', '-stats', '-y', ...ent, '-filter_complex', f.join(';'), '-map', '[v]', '-map', '[a]',
  '-c:v', 'libx264', '-preset', opt.preset ?? 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', String(FPS),
  '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
  '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', final]);

// ---------- 7. capítulos y .vtt ----------
const cc = escribirCapitulos({ clase, transcripcion, desfaseEn, desde: A, hasta: B, aSalida: crudoAFinal, final });
writeFileSync(path.join(DR, `linea-${nombre}.json`), JSON.stringify({ master, final, I, cortes, saltos: saltos.map(({ k, punto }) => ({ k, punto, enFinal: aFinal(punto) - DS })) }, null, 1));
const durReal = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', final], { encoding: 'utf8' }));
console.log(`\n✔ ${path.relative(RAIZ, final)}  (${(durReal / 60).toFixed(2)} min; esperado ${(durFinal / 60).toFixed(2)})  · ${cc.capitulos} capítulos`);

// =====================================================================================

function run(cmd, a) {
  const r = spawnSync(cmd, a, { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${cmd} falló (${r.status})`);
}

/** Pares inicio/fin de un log de silencedetect o freezedetect («x_start: n» / «x_end: n»). */
function leerPares(archivo) {
  if (!existsSync(archivo)) return [];
  const v = readFileSync(archivo, 'utf8').split('\n').filter(Boolean).map((l) => Number(l.split(': ')[1]));
  const out = [];
  for (let i = 0; i + 1 < v.length; i += 2) out.push([v[i], v[i + 1]]);
  return out;
}

/**
 * Subtítulos con golpe: la línea entra con un pop y la palabra que se está diciendo se pinta de
 * naranja y crece un poco. Un evento por palabra (la línea entera, con esa palabra resaltada).
 */
function escribirAss() {
  const cfg = clase.subtitulos ?? {};
  const T = clase.tema;
  const TAM = cfg.tamanoRemontaje ?? 40;
  const fmt = (s) => {
    s = Math.max(0, s);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}:${String(m).padStart(2, '0')}:${(s % 60).toFixed(2).padStart(5, '0')}`;
  };
  const color = (hex, alfa = 0) => `&H${alfa.toString(16).padStart(2, '0')}${hex.slice(5, 7)}${hex.slice(3, 5)}${hex.slice(1, 3)}`.toUpperCase();
  const [px, py, pw, ph] = clase.marco.pantalla;
  const margenV = Math.max(6, Math.round((1080 - py - ph - TAM) / 2) - 2);
  const corr = Object.entries(cfg.correcciones ?? {});
  const corregir = (txt) => corr.reduce((t, [mal, bien]) => t.replace(new RegExp(`(?<![\\p{L}])${mal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'gu'), bien), txt);
  const naranja = color(T.acento);
  // Dentro del texto, ASS pide el color como &HBBGGRR& (sin alfa).
  const c1 = (hex) => `\\1c&H${(hex.slice(5, 7) + hex.slice(3, 5) + hex.slice(1, 3)).toUpperCase()}&`;
  const cab = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Golpe,Inter,${TAM},${color(T.tinta)},${naranja},${color(T.fondo, 0x20)},${color('#000000', 0x80)},-1,0,0,0,100,100,0,0,1,3,1.5,2,${px + 20},${1920 - px - pw + 20},${margenV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  const lineas = lineasDe({ clase, transcripcion, desde: A, hasta: B });
  const ev = [];
  const t = (ta) => aFinal(vozAMaster(ta));
  lineas.forEach((l, li) => {
    // Palabras con sus tiempos finales; la corrección se aplica palabra por palabra para no descuadrar.
    const ws = l.map((w) => ({ p: corregir(w.p), a: t(w.ini), b: t(w.fin) }));
    const sig = lineas[li + 1] ? t(lineas[li + 1][0].ini) : Infinity;
    const finLinea = Math.min(ws[ws.length - 1].b + 0.35, sig - 0.02);
    ws.forEach((w, i) => {
      const ini = w.a;
      const hasta = i + 1 < ws.length ? ws[i + 1].a : finLinea;
      if (hasta - ini < 0.02) return;
      const texto = ws
        .map((x, j) => (j === i ? `{${c1(T.acento)}\\fscx106\\fscy106\\t(0,110,\\fscx100\\fscy100)}${x.p}{${c1(T.tinta)}\\fscx100\\fscy100}` : x.p))
        .join(' ');
      // La línea entra con un pop (escala 85 → 100) solo en su primera palabra.
      const entrada = i === 0 ? '{\\fad(60,0)\\fscx88\\fscy88\\t(0,120,\\fscx100\\fscy100)}' : '';
      ev.push(`Dialogue: 0,${fmt(ini)},${fmt(hasta)},Golpe,,0,0,0,,${entrada}${texto}`);
    });
  });
  writeFileSync(ass, '﻿' + cab + ev.join('\n') + '\n', 'utf8');
  return lineas.length;
}
