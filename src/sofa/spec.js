import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { RAIZ } from '../config.js';
import { FFMPEG } from '../montaje/limpiar.js';
import { alinearAVoz, unirTokens } from '../vertical/corte.js';
import { afinarConDtw, TRANSCRIPCIONES, vozDe } from './voz.js';

/**
 * npm run sofa-spec -- <base de clip>...   (o --todos)
 *
 * El "guion verificado" de cada crudo del SOFA, antes de escribir la pieza
 * (Juan David, 12-oct-2026: "identifica bien las partes donde de verdad se habla
 * porque al tiempo hay frecuencia sonora y eso coincide con el texto; a partir de
 * ese spec se produce"). Por clip escribe trabajo/2026-10-sofa/specs/<base>.txt:
 *
 *   ── hueco 0.6 s ──            silencio real (aqui se corta y aqui cambia el turno)
 *   [12.1] palabra [12.4] palabra ?[13.0] palabra
 *
 * Cada palabra lleva el segundo en que empieza segun la voz real (alineacion por
 * tramos + tiempos finos de Whisper). Un "?" delante marca que en ese tramo el
 * audio casi no tiene energia de voz: el texto puede estar corrido. Las piezas
 * se escriben leyendo este archivo: `desde`/`hasta` en huecos, `turnos` en
 * huecos, golpes y efectos sobre palabras que existen.
 */
const CRUDO = path.join(RAIZ, 'trabajo', '2026-10-sofa', '00-crudo');
const SALIDA = path.join(RAIZ, 'trabajo', '2026-10-sofa', 'specs');
mkdirSync(SALIDA, { recursive: true });
const norm = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]/g, '').trim();
const esMarca = (t) => /^\s*[[(].*[\])]\s*$/.test(t);
const VENTANA = 0.1;

/** Energia de voz (dB RMS en 300-3400 Hz) por ventana de 100 ms; se guarda junto a la transcripcion. */
function energiaDe(base) {
  const destino = path.join(TRANSCRIPCIONES, `${base}.energia.json`);
  if (existsSync(destino)) return JSON.parse(readFileSync(destino, 'utf8'));
  const wav = path.join(TRANSCRIPCIONES, `${base}.wav`);
  const salida = spawnSync(FFMPEG(), ['-hide_banner', '-i', wav, '-af', `aresample=16000,highpass=f=300,lowpass=f=3400,asetnsamples=${16000 * VENTANA},astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level`, '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }).stderr;
  const niveles = [...salida.matchAll(/RMS_level=(-?[\d.]+|-inf)/g)].map((m) => (m[1] === '-inf' ? -90 : +m[1]));
  writeFileSync(destino, JSON.stringify(niveles));
  return niveles;
}

function desfaseDe(base) {
  const ext = existsSync(path.join(CRUDO, `${base}.MOV`)) ? 'MOV' : 'mp4';
  const ffprobe = path.join(path.dirname(FFMPEG()), `ffprobe${path.extname(FFMPEG())}`);
  const r = spawnSync(ffprobe, ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=start_time', '-of', 'csv=p=0', path.join(CRUDO, `${base}.${ext}`)], { encoding: 'utf8' });
  const s = parseFloat(r.stdout);
  return Number.isFinite(s) ? s : 0;
}

/** Palabras alineadas (segundos del crudo, con desfase) y huecos de silencio del clip. */
export function guionDe(base) {
  const desfase = desfaseDe(base);
  const captions = unirTokens(JSON.parse(readFileSync(path.join(TRANSCRIPCIONES, `${base}.captions.json`), 'utf8')));
  const voz = vozDe(base);
  const leidas = captions.filter((c) => !esMarca(c.text)).map((c) => ({ ...c, desde: c.startMs / 1000, hasta: c.endMs / 1000, limpia: norm(c.text) })).filter((c) => c.limpia);
  const palabras = afinarConDtw(alinearAVoz(leidas, voz, true), voz);
  const energia = energiaDe(base);
  const orden = [...energia].sort((a, b) => a - b);
  const piso = orden[Math.floor(orden.length * 0.1)];
  const fuerte = orden[Math.floor(orden.length * 0.97)];
  const umbral = Math.max(-48, piso + 6, fuerte - 30);
  const conEnergia = (p) => {
    const a = Math.floor(p.desde / VENTANA);
    const b = Math.max(a + 1, Math.ceil(p.hasta / VENTANA));
    const ventanas = energia.slice(a, b);
    return ventanas.length ? ventanas.some((v) => v >= umbral) : true;
  };
  const huecos = voz.slice(1).map((t, i) => ({ desde: voz[i].hasta + desfase, hasta: t.desde + desfase }));
  return { desfase, palabras: palabras.map((p) => ({ texto: p.text.trim(), desde: +(p.desde + desfase).toFixed(2), hasta: +(p.hasta + desfase).toFixed(2), ok: conEnergia(p) })), huecos, voz: voz.map((t) => ({ desde: t.desde + desfase, hasta: t.hasta + desfase })) };
}

function escribir(base) {
  const g = guionDe(base);
  const lineas = [`# ${base}  (desfase de audio ${g.desfase.toFixed(2)} s · ${g.palabras.length} palabras · ${g.huecos.length} huecos)`, ''];
  let i = 0;
  for (const t of g.voz) {
    const h = g.huecos.find((x) => Math.abs(x.hasta - t.desde) < 1e-6);
    if (h) lineas.push(`── hueco ${(h.hasta - h.desde).toFixed(1)} s (${h.desde.toFixed(2)}–${h.hasta.toFixed(2)}) ──`);
    const del = [];
    while (i < g.palabras.length && g.palabras[i].desde < t.hasta + 0.02) {
      const p = g.palabras[i++];
      del.push(`${p.ok ? '' : '?'}[${p.desde.toFixed(1)}] ${p.texto}`);
    }
    if (del.length) lineas.push(del.join('  '));
  }
  const dudosas = g.palabras.filter((p) => !p.ok).length;
  lineas.push('', `palabras sin energia de voz: ${dudosas}${dudosas ? ' (marcadas con ?)' : ''}`);
  const ruta = path.join(SALIDA, `${base}.txt`);
  writeFileSync(ruta, lineas.join('\n') + '\n');
  return ruta;
}

const args = process.argv.slice(2);
const bases = args.includes('--todos')
  ? [...new Set(readFileSync(path.join(RAIZ, 'trabajo', '2026-10-sofa', 'catalogo-tecnico.tsv'), 'utf8').split('\n').map((l) => l.split('\t')[0]).filter(Boolean).map((f) => path.parse(f).name))]
  : args.filter((a) => !a.startsWith('--'));
for (const b of bases) {
  if (!existsSync(path.join(TRANSCRIPCIONES, `${b}.captions.json`))) continue;
  console.log(readFileSync(escribir(b), 'utf8'));
}
