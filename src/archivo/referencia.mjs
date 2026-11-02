#!/usr/bin/env node
/**
 * Analiza un video de referencia (Pinterest, Instagram o un mp4) para imitar su estructura:
 * hoja de cuadros a 1 por segundo, cortes de escena y medida del audio (volumen por segundo,
 * golpes y BPM aproximado). Sin esto se imita «a ojo» y se pierde el ritmo (nov-2026, Kafka).
 *
 *   node src/archivo/referencia.mjs <mp4 local o url directa> <carpeta_salida>
 *
 * Para sacar la url directa del video:
 * - Pinterest: desde co.pinterest.com, `fetch('/pin/<id>/')` y buscar en el HTML la url
 *   `v1.pinimg.com/videos/.../expMp4/..._720w.mp4` (las hevc/h265 no se decodifican).
 * - Instagram: abrir `instagram.com/p/<codigo>/embed/captioned/` (no pide sesion) y leer el `src`
 *   del <video>; el copy, los me gusta y los seguidores salen en el texto de esa pagina.
 *
 * Salida: referencia.mp4, hoja.png (cuadros con su segundo), analisis.json (cortes y audio).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const [entrada, salida] = process.argv.slice(2);
if (!entrada || !salida) {
  console.error('Uso: node src/archivo/referencia.mjs <mp4|url> <carpeta>');
  process.exit(1);
}
mkdirSync(salida, { recursive: true });
const video = path.join(salida, 'referencia.mp4');
if (/^https?:/.test(entrada)) {
  const r = await fetch(entrada);
  writeFileSync(video, Buffer.from(await r.arrayBuffer()));
} else {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', entrada, '-c', 'copy', video]);
}

const ff = (args) => execFileSync('ffmpeg', ['-hide_banner', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const err = (args) => { try { return execFileSync('ffmpeg', ['-hide_banner', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { return String(e.stderr ?? ''); } };
const duracion = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video], { encoding: 'utf8' }));

// Hoja: un cuadro por segundo, 9 por fila, con el segundo marcado (cada celda 180 px de ancho).
const n = Math.ceil(duracion);
const filas = Math.ceil(n / 9);
ff(['-v', 'error', '-y', '-i', video, '-vf', `fps=1,scale=180:-1,tile=9x${filas}`, '-frames:v', '1', path.join(salida, 'hoja.png')]);

// Cortes: cambios de escena fuertes. Rafagas = muchos cortes juntos.
const cortes = [...err(['-i', video, '-vf', "select='gt(scene,0.25)',showinfo", '-f', 'null', '-']).matchAll(/pts_time:([0-9.]+)/g)].map((m) => Number(Number(m[1]).toFixed(2)));

// Audio: volumen por segundo (0-9), golpes por flujo de energia y BPM por autocorrelacion.
let audio = null;
try {
  const crudo = execFileSync('ffmpeg', ['-v', 'error', '-i', video, '-ac', '1', '-ar', '8000', '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  const d = new Float32Array(crudo.buffer, crudo.byteOffset, crudo.length / 4);
  const hop = 400; // 50 ms
  const rms = [];
  for (let i = 0; i + hop < d.length; i += hop) { let s = 0; for (let j = i; j < i + hop; j++) s += d[j] * d[j]; rms.push(Math.sqrt(s / hop)); }
  const mx = Math.max(...rms) || 1;
  const env = rms.map((x) => x / mx);
  const flux = env.map((x, i) => Math.max(0, x - (env[i - 1] ?? 0)));
  const media = flux.reduce((a, b) => a + b, 0) / flux.length;
  const sd = Math.sqrt(flux.reduce((a, b) => a + (b - media) ** 2, 0) / flux.length);
  const golpes = [];
  flux.forEach((f, i) => { if (f > media + 2.5 * sd && (!golpes.length || i * 0.05 - golpes.at(-1) > 0.2)) golpes.push(Number((i * 0.05).toFixed(2))); });
  let mejor = 0;
  let bpm = 0;
  for (let b = 60; b <= 180; b++) { const lag = Math.round(60 / b / 0.05); let s = 0; for (let i = lag; i < flux.length; i++) s += flux[i] * flux[i - lag]; if (s > mejor) { mejor = s; bpm = b; } }
  const porSegundo = [];
  for (let i = 0; i < env.length; i += 20) porSegundo.push(Math.round((env.slice(i, i + 20).reduce((a, b) => a + b, 0) / 20) * 9));
  audio = { bpm, golpes, volumenPorSegundo: porSegundo.join('') };
} catch {
  audio = 'sin audio';
}

const analisis = { duracion: Number(duracion.toFixed(2)), cortes, audio };
writeFileSync(path.join(salida, 'analisis.json'), JSON.stringify(analisis, null, 2));
console.log(JSON.stringify(analisis, null, 2));
console.log(`Hoja: ${path.join(salida, 'hoja.png')} (un cuadro por segundo)`);
