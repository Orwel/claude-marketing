import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { RAIZ } from '../config.js';

/**
 * Limpieza de una grabacion antes de montarla: audio, estabilizacion y color.
 * Sale un .mp4 1080 de ancho en public/limpios/<mes>/, que es lo que lee la
 * plantilla Montaje. El original nunca se toca.
 *
 * Usa el ffmpeg completo (FFMPEG_COMPLETO en .env): el que trae Remotion no
 * tiene afftdn, deesser, acompressor, vidstab ni eq.
 *
 * Audio (grabado en la calle con solapa): pasa-altos para el retumbe de carros,
 * afftdn con el piso de ruido medido del propio clip, de-esser suave, compresion
 * ligera y loudnorm a -16 LUFS / -1,5 dBTP (la mezcla final se vuelve a medir).
 * La reduccion de ruido va en 12 dB: con mas, la voz empieza a sonar submarina.
 *
 * Imagen: el tripode con seguimiento oscila de lado a lado; vidstab suaviza esa
 * deriva sin congelar el plano (suavizado 30 cuadros). Luego se lleva el brillo
 * medio y el balance de cada clip hacia el promedio del rodaje (`referencia`),
 * para que todo parezca del mismo dia aunque la luz de la calle cambio, y se
 * levantan un poco las sombras para que se vea la cara. El grado de cada marca
 * va despues, en la plantilla, y es sutil.
 */
export const FFMPEG = () => {
  const ruta = process.env.FFMPEG_COMPLETO;
  if (!ruta || !existsSync(ruta)) throw new Error('Falta FFMPEG_COMPLETO en .env (ffmpeg con vidstab y afftdn)');
  return ruta;
};

const correr = (args) => execFileSync(FFMPEG(), ['-hide_banner', '-y', '-v', 'error', ...args], { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 256 * 1024 * 1024 });

/** Color medio del clip: 12 cuadros repartidos, reducidos a un pixel cada uno. */
export function medirColor(entrada, duracion) {
  const muestras = [];
  for (let i = 1; i <= 12; i++) {
    const t = (duracion * i) / 13;
    const b = correr(['-ss', t.toFixed(2), '-i', entrada, '-frames:v', '1', '-vf', 'scale=1:1:flags=area', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']);
    muestras.push([b[0], b[1], b[2]]);
  }
  const m = [0, 1, 2].map((k) => muestras.reduce((s, x) => s + x[k], 0) / muestras.length);
  return { r: m[0], g: m[1], b: m[2], luma: 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2] };
}

export function duracionDe(entrada) {
  const r = spawnSync(FFMPEG(), ['-hide_banner', '-i', entrada], { encoding: 'utf8' });
  const [, h, m, s] = /Duration: (\d+):(\d+):([\d.]+)/.exec(r.stderr);
  return +h * 3600 + +m * 60 + +s;
}

/** Piso de ruido del clip (dB): el percentil 10 del RMS por ventanas. Se lo pasa a afftdn. */
function pisoDeRuido(entrada) {
  const r = spawnSync(FFMPEG(), ['-hide_banner', '-i', entrada, '-vn', '-af', 'astats=metadata=1:reset=25,ametadata=print:key=lavfi.astats.Overall.RMS_level', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const niveles = [...r.stderr.matchAll(/RMS_level=(-?[\d.]+)/g)].map((m) => +m[1]).filter(Number.isFinite).sort((a, b) => a - b);
  if (!niveles.length) return -45;
  return Math.max(-70, Math.min(-25, niveles[Math.floor(niveles.length * 0.1)]));
}

/**
 * Limpia un archivo. `referencia` es el color medio del rodaje ({ r, g, b, luma }).
 * Devuelve la ruta publica (para staticFile) y lo que se le hizo.
 */
export function limpiar({ entrada, mes, referencia, color }) {
  const base = path.parse(entrada).name;
  const carpeta = path.join(RAIZ, 'public', 'limpios', mes);
  mkdirSync(carpeta, { recursive: true });
  const salida = path.join(carpeta, `${base}.mp4`);
  const informe = path.join(carpeta, `${base}.json`);
  if (existsSync(salida) && existsSync(informe)) return JSON.parse(readFileSync(informe, 'utf8'));

  // Ganancias por canal hacia la referencia, a medio camino: corregir del todo aplana la luz real.
  const g = (k) => Math.max(0.85, Math.min(1.18, 1 + ((referencia[k] / Math.max(1, color[k])) - 1) * 0.6));
  const ganancias = { r: g('r'), g: g('g'), b: g('b') };
  // Brillo: gamma hacia la luma de referencia (gamma sube medios y sombras sin quemar altas).
  const gamma = Math.max(0.85, Math.min(1.25, Math.log(color.luma / 255) / Math.log(referencia.luma / 255)));

  const trf = path.join(RAIZ, 'trabajo', mes, `${base}.trf`).replace(/\\/g, '/').replace(/^([A-Za-z]):/, '$1\\:');
  const escala = "scale=1080:-2:flags=lanczos";
  correr(['-i', entrada, '-an', '-vf', `${escala},vidstabdetect=shakiness=6:accuracy=15:result='${trf}'`, '-f', 'null', '-']);

  const piso = pisoDeRuido(entrada);
  const video = [
    escala,
    `vidstabtransform=input='${trf}':smoothing=30:optzoom=0:zoom=4:crop=keep:interpol=bicubic`,
    `colorchannelmixer=rr=${ganancias.r.toFixed(3)}:gg=${ganancias.g.toFixed(3)}:bb=${ganancias.b.toFixed(3)}`,
    `eq=gamma=${gamma.toFixed(3)}:contrast=1.04:saturation=1.04`,
    // Sombras: levanta el tercio bajo sin tocar negros ni altas.
    "curves=all='0/0 0.18/0.21 0.5/0.52 1/1'",
    'unsharp=5:5:0.35',
    'format=yuv420p',
  ].join(',');
  const audio = [
    'highpass=f=85',
    `afftdn=nr=12:nf=${Math.round(piso + 4)}:tn=1`,
    'adeclick',
    'deesser=i=0.35:m=0.5:f=0.5',
    'acompressor=threshold=-21dB:ratio=2.5:attack=8:release=160:makeup=2',
    'loudnorm=I=-16:TP=-1.5:LRA=11',
    'aresample=48000',
  ].join(',');
  correr(['-i', entrada, '-vf', video, '-af', audio, '-c:v', 'libx264', '-crf', '17', '-preset', 'fast', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', salida]);

  const datos = { archivo: `limpios/${mes}/${base}.mp4`, ganancias, gamma: +gamma.toFixed(3), pisoRuido: piso };
  writeFileSync(informe, JSON.stringify(datos, null, 2));
  return datos;
}
