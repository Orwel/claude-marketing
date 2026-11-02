import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

/**
 * npm run medir-voz -- <audio> [texto.txt | numero de palabras]
 *
 * Diagnóstico de locución para el entrenamiento de docs/LOCUCION.md.
 * Mide lo que hace sonar bien a la voz modelo (public/kafka/voz.mp3):
 * velocidad, pausas, variación de volumen, variación de tono y si las
 * frases caen al final. Sin dependencias: ffmpeg decodifica y el tono se
 * estima con autocorrelación, que basta para comparar contra uno mismo.
 */
const [archivo, textoArg] = process.argv.slice(2);
if (!archivo || !existsSync(archivo)) {
  console.error('Uso: npm run medir-voz -- <audio> [texto.txt | palabras]');
  process.exit(1);
}

const TASA = 16000;
const VENTANA = 0.04; // 40 ms: cabe al menos un ciclo de una voz grave (~70 Hz)
const MUESTRAS = Math.round(TASA * VENTANA);

// Se decodifica a mono 16 kHz con un pasaaltos para que el ruido del cuarto
// (aire, nevera) no cuente como voz. Mismo trato para el modelo y para él.
const crudo = execFileSync('ffmpeg', ['-v', 'error', '-i', archivo, '-af', 'highpass=f=70', '-ac', '1', '-ar', String(TASA), '-f', 's16le', '-'], { maxBuffer: 1 << 30 });
const pcm = new Int16Array(crudo.buffer, crudo.byteOffset, crudo.length / 2);
const duracion = pcm.length / TASA;

// Energía por ventana en dBFS.
const db = [];
for (let i = 0; i + MUESTRAS <= pcm.length; i += MUESTRAS) {
  let s = 0;
  for (let j = i; j < i + MUESTRAS; j++) s += (pcm[j] / 32768) ** 2;
  db.push(10 * Math.log10(s / MUESTRAS + 1e-12));
}

const percentil = (v, p) => {
  const o = [...v].sort((a, b) => a - b);
  return o[Math.min(o.length - 1, Math.floor((p / 100) * o.length))];
};

// El umbral de silencio es relativo a la propia voz (18 dB bajo el nivel
// típico de habla): un celular y un MP3 de ElevenLabs tienen pisos de ruido
// muy distintos y un umbral fijo los mediría con varas diferentes.
const nivelVoz = percentil(db, 90);
const umbral = Math.max(nivelVoz - 18, percentil(db, 10) + 6);
const esVoz = db.map((d) => d > umbral);

// Pausas: tramos de silencio de 250 ms o más, sin contar el inicio ni el final.
const pausas = [];
let inicioVoz = esVoz.indexOf(true);
let finVoz = esVoz.lastIndexOf(true);
for (let i = inicioVoz, desde = -1; i <= finVoz; i++) {
  if (!esVoz[i] && desde < 0) desde = i;
  if (esVoz[i] && desde >= 0) {
    const dur = (i - desde) * VENTANA;
    if (dur >= 0.25) pausas.push({ desde: desde * VENTANA, dur });
    desde = -1;
  }
}
const hablado = (finVoz - inicioVoz + 1) * VENTANA;
const enPausa = pausas.reduce((s, p) => s + p.dur, 0);

// Tono por autocorrelación normalizada entre 70 y 300 Hz (voz masculina).
const tono = db.map((d, k) => {
  if (!esVoz[k] || d < nivelVoz - 12) return null;
  const i0 = k * MUESTRAS;
  const n = MUESTRAS * 2;
  if (i0 + n > pcm.length) return null;
  let mejor = 0, retardo = 0;
  for (let r = Math.floor(TASA / 300); r <= Math.ceil(TASA / 70); r++) {
    let ab = 0, aa = 0, bb = 0;
    for (let j = 0; j < n - r; j++) {
      const a = pcm[i0 + j], b = pcm[i0 + j + r];
      ab += a * b; aa += a * a; bb += b * b;
    }
    const c = ab / Math.sqrt(aa * bb + 1);
    if (c > mejor) { mejor = c; retardo = r; }
  }
  return mejor > 0.6 ? TASA / retardo : null;
});
const hz = tono.filter(Boolean);
const medianaHz = percentil(hz, 50);
const semitonos = hz.map((f) => 12 * Math.log2(f / medianaHz));
const media = semitonos.reduce((s, v) => s + v, 0) / semitonos.length;
const desvio = Math.sqrt(semitonos.reduce((s, v) => s + (v - media) ** 2, 0) / semitonos.length);

// ¿Caen las frases? Para cada tramo de voz que termina en una pausa se
// compara el tono de sus últimos 300 ms con la mediana del tramo. Una caída
// de 1,5 semitonos o más es una frase que «aterriza»; una subida es una
// frase que queda en el aire (pregunta, o duda sin querer).
const tramos = [];
let ini = inicioVoz;
for (const p of [...pausas, { desde: finVoz * VENTANA + VENTANA, dur: 0 }]) {
  const fin = Math.round(p.desde / VENTANA);
  const t = tono.slice(ini, fin).map((f, i) => f && { f, i }).filter(Boolean);
  if (t.length >= 8) {
    const cola = t.filter((x) => x.i >= fin - ini - 0.3 / VENTANA - 1).map((x) => x.f);
    if (cola.length >= 2) tramos.push(12 * Math.log2(percentil(cola, 50) / percentil(t.map((x) => x.f), 50)));
  }
  ini = Math.round((p.desde + p.dur) / VENTANA);
}
const caen = tramos.filter((s) => s <= -1.5).length;

const voz = db.filter((_, i) => esVoz[i]);
let palabras = null;
if (textoArg) palabras = /^\d+$/.test(textoArg) ? Number(textoArg) : readFileSync(textoArg, 'utf8').split(/\s+/).filter((w) => /\p{L}/u.test(w)).length;

const r = (v, d = 1) => (v == null ? '—' : v.toFixed(d));
console.log(`\n  ${archivo}`);
console.log(`  duración ${r(duracion)} s · voz de ${r(inicioVoz * VENTANA)} a ${r(finVoz * VENTANA + VENTANA)} s`);
if (palabras) {
  console.log(`  velocidad ${r((palabras / hablado) * 60, 0)} ppm con pausas · ${r((palabras / (hablado - enPausa)) * 60, 0)} ppm articulando (${palabras} palabras)`);
}
console.log(`  pausas ${pausas.length} (${r((pausas.length / hablado) * 60, 0)}/min) · ${r((enPausa / hablado) * 100, 0)} % del tiempo en silencio`);
console.log(`         media ${r(enPausa / (pausas.length || 1), 2)} s · largas ≥0,6 s: ${pausas.filter((p) => p.dur >= 0.6).length} · la más larga ${r(Math.max(0, ...pausas.map((p) => p.dur)), 2)} s`);
console.log(`  volumen rango ${r(percentil(voz, 90) - percentil(voz, 20))} dB (p90−p20 de la voz)`);
console.log(`  tono   mediana ${r(medianaHz, 0)} Hz · variación ${r(desvio, 2)} semitonos · rango ${r(percentil(semitonos, 95) - percentil(semitonos, 5))} st`);
console.log(`  caídas ${caen} de ${tramos.length} frases bajan ≥1,5 st al final (${r((caen / (tramos.length || 1)) * 100, 0)} %) · cambio medio ${r(tramos.reduce((s, v) => s + v, 0) / (tramos.length || 1))} st`);
console.log(`  final de cada frase (st): ${tramos.map((s) => r(s)).join('  ')}`);
console.log(`  pausas (s): ${pausas.map((p) => `${r(p.desde)}+${r(p.dur, 2)}`).join('  ')}\n`);
