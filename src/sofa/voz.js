import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { RAIZ } from '../config.js';
import { FFMPEG } from '../montaje/limpiar.js';
import { tramosDeVoz } from '../vertical/corte.js';

export const TRANSCRIPCIONES = path.join(RAIZ, 'trabajo', '2026-10-sofa', '01-transcripciones');

/**
 * Tramos con voz del wav de 16 kHz: RMS en ventanas de 100 ms en la banda de la voz
 * (300-3400 Hz) con umbral relativo al clip (piso + 8 dB o voz fuerte - 28 dB), como en
 * src/montaje/armar.js. En la feria el piso de ruido es alto y un umbral fijo lo tomaria todo por voz.
 */
const VENTANA = 0.1;
export function vozDe(base) {
  const destino = path.join(TRANSCRIPCIONES, `${base}.voz.json`);
  if (existsSync(destino)) return JSON.parse(readFileSync(destino, 'utf8'));
  const wav = path.join(TRANSCRIPCIONES, `${base}.wav`);
  const salida = spawnSync(FFMPEG(), ['-hide_banner', '-i', wav, '-af', `aresample=16000,highpass=f=300,lowpass=f=3400,asetnsamples=${16000 * VENTANA},astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level`, '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }).stderr;
  const niveles = [...salida.matchAll(/RMS_level=(-?[\d.]+|-inf)/g)].map((m) => (m[1] === '-inf' ? -90 : +m[1]));
  const duracion = niveles.length * VENTANA;
  const orden = [...niveles].sort((a, b) => a - b);
  const piso = orden[Math.floor(orden.length * 0.1)];
  const fuerte = orden[Math.floor(orden.length * 0.97)];
  // Sin el tope de -30 dB del montaje: en la feria el piso de ruido esta en -30 y, con tope, el ruido
  // contaba como voz y salia un solo tramo de 36 s (las palabras se repartian a ojo y el texto no
  // cuadraba con la boca, 12-oct-2026). Se exige ademas 3 dB por encima del piso del ruido.
  const umbral = Math.max(-48, piso + 8, fuerte - 26);
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


/**
 * Afina la alineacion dentro de los tramos de voz largos (> 2,5 s) con los tiempos finos de
 * whisper.cpp (timestampMs, por DTW): cada palabra cuyo tiempo fino avanza es un ancla y, entre
 * anclas, las demas se reparten por letras. Con un tramo de 23 s de voz seguida (ruido de feria),
 * repartir todo por letras desfasaba el texto hasta un segundo (12-oct-2026).
 */
export function afinarConDtw(palabras, voz) {
  const salida = palabras.map((p) => ({ ...p }));
  for (const t of voz) {
    if (t.hasta - t.desde < 2.5) continue;
    const idx = salida.map((p, i) => (p.desde >= t.desde - 0.01 && p.desde < t.hasta ? i : -1)).filter((i) => i >= 0);
    if (idx.length < 4) continue;
    const fino = (i) => (salida[i].timestampMs != null ? salida[i].timestampMs / 1000 : null);
    // Anclas: tiempos finos estrictamente crecientes y dentro del tramo (con margen).
    const anclas = [];
    let ultimo = -Infinity;
    idx.forEach((i, k) => {
      const f = fino(i);
      if (f == null || f <= ultimo + 0.05 || f < t.desde - 0.3 || f > t.hasta + 0.3) return;
      anclas.push({ k, tiempo: Math.min(t.hasta - 0.1, Math.max(t.desde, f)) });
      ultimo = f;
    });
    if (anclas.length < 2) continue;
    if (anclas[0].k !== 0) anclas.unshift({ k: 0, tiempo: t.desde });
    anclas.push({ k: idx.length, tiempo: t.hasta });
    const peso = (i) => salida[i].limpia.replace(/ /g, '').length + 1.5;
    for (let a = 0; a < anclas.length - 1; a++) {
      const [de, a2] = [anclas[a], anclas[a + 1]];
      if (a2.tiempo <= de.tiempo) a2.tiempo = de.tiempo + 0.05;
      const grupo = idx.slice(de.k, a2.k);
      const total = grupo.reduce((s2, i) => s2 + peso(i), 0) || 1;
      let cursor = de.tiempo;
      for (const i of grupo) {
        const dur = ((a2.tiempo - de.tiempo) * peso(i)) / total;
        salida[i].desde = cursor;
        salida[i].hasta = cursor + dur;
        cursor += dur;
      }
    }
  }
  return salida;
}

