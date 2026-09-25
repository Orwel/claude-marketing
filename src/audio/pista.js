import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { aplicarVoz, tramosDe } from '../../remotion/util.js';
import { RAIZ } from '../config.js';

/**
 * Pista sintetizada a la medida de una pieza: bombo, palmas, hi-hats, bajo y
 * un colchon de acordes al tempo de la pieza, mas un golpe en cada impacto de
 * texto y un whoosh en cada barrido.
 *
 * Se genera en vez de descargarse porque asi no hay licencias que revisar y
 * los efectos caen exactos en los cuadros de los cortes: una cancion de
 * biblioteca nunca calza con el montaje. No reemplaza una buena cancion; si
 * el video se publica con audio de la red, se baja volumenPista.
 */
const TASA = 44100;
const FPS = 30;

// Generador pseudoaleatorio con semilla: la misma pieza siempre suena igual.
function azar(semilla = 7) {
  let s = semilla;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
}

export function sintetizar(pieza) {
  const tramos = tramosDe(pieza, FPS);
  const segundos = tramos.at(-1).fin / FPS;
  const n = Math.ceil(segundos * TASA);
  const mezcla = new Float32Array(n);
  const ruido = azar();
  const pulso = 60 / (pieza.bpm ?? 120);
  const seg = (cuadro) => cuadro / FPS;

  const sumar = (inicio, duracion, f) => {
    const a = Math.floor(inicio * TASA);
    const b = Math.min(n, a + Math.floor(duracion * TASA));
    for (let i = Math.max(0, a); i < b; i++) mezcla[i] += f((i - a) / TASA);
  };

  // El ritmo completo entra despues del gancho: el gancho va solo con golpes, asi el "drop" se nota.
  const inicioRitmo = seg(tramos[1]?.inicio ?? 0);
  const finRitmo = seg(tramos.at(-1).inicio) + pulso * 4;

  // Bombo: seno que cae de 130 a 45 Hz. Es el pulso que siente el cuerpo.
  const bombo = (t) => Math.sin(2 * Math.PI * (45 * t + (85 / 30) * (1 - Math.exp(-30 * t)))) * Math.exp(-9 * t) * 0.9;
  // Palma: rafaga de ruido con tres micro-ataques, como varias manos.
  const palma = (t) => ruido() * (Math.exp(-40 * t) + 0.6 * Math.exp(-40 * Math.max(0, t - 0.012)) + 0.4 * Math.exp(-22 * Math.max(0, t - 0.024))) * 0.28;
  let previo = 0;
  const hat = (t) => {
    const x = ruido();
    const agudo = x - previo; // derivada = pasa-altos barato
    previo = x;
    return agudo * Math.exp(-55 * t) * 0.12;
  };

  // Tiempos sobre la rejilla del tempo, desde el inicio del ritmo.
  for (let t = inicioRitmo, k = 0; t < finRitmo; t += pulso / 2, k++) {
    if (k % 2 === 0) sumar(t, 0.4, bombo);
    else sumar(t, 0.08, hat);
    if (k % 4 === 2) sumar(t, 0.3, palma);
  }

  // Bajo y acordes: La menor, Fa, Do, Sol, un compas cada uno.
  const progresion = [
    { bajo: 55.0, acorde: [220.0, 261.63, 329.63] },
    { bajo: 43.65, acorde: [174.61, 220.0, 261.63] },
    { bajo: 65.41, acorde: [261.63, 329.63, 392.0] },
    { bajo: 49.0, acorde: [196.0, 246.94, 293.66] },
  ];
  const compas = pulso * 4;
  for (let t = inicioRitmo, c = 0; t < finRitmo; t += compas, c++) {
    const { bajo, acorde } = progresion[c % progresion.length];
    for (let p = 0; p < 8; p++) {
      // Bajo en corcheas, con el "sidechain" hecho a mano: suena en el contratiempo del bombo.
      sumar(t + p * (pulso / 2), pulso / 2, (x) => {
        const env = Math.min(1, x * 200) * Math.exp(-6 * x) * (p % 2 ? 1 : 0.55);
        return (Math.sin(2 * Math.PI * bajo * 2 * x) * 0.7 + Math.sin(2 * Math.PI * bajo * 4 * x) * 0.2) * env * 0.35;
      });
    }
    sumar(t, compas, (x) => {
      const ataque = Math.min(1, x / 0.3) * Math.min(1, (compas - x) / 0.2);
      const bombeo = 0.55 + 0.45 * Math.min(1, (x % pulso) / (pulso * 0.6));
      return acorde.reduce((suma, f, j) => suma + Math.sin(2 * Math.PI * f * x * (1 + 0.002 * Math.sin(2 * Math.PI * 5 * x + j))), 0) * ataque * bombeo * 0.045;
    });
  }

  // Whoosh en cada corte: ruido que sube filtrado y se abre justo en el corte.
  for (const tramo of tramos.slice(1)) {
    const corte = seg(tramo.inicio);
    let y = 0;
    sumar(corte - 0.3, 0.45, (x) => {
      const p = x / 0.45;
      const coef = 0.02 + p * 0.5;
      y += coef * (ruido() - y);
      const env = p < 0.66 ? (p / 0.66) ** 2 : Math.exp(-12 * (p - 0.66));
      return y * env * 0.9;
    });
  }

  // Impactos: los golpes de texto del gancho y las palabras del ritmo.
  const pulsoCuadros = Math.round(pulso * FPS);
  const impactos = [];
  for (const tramo of tramos) {
    if (tramo.tipo === 'golpe') tramo.escena.lineas.forEach((_, i) => impactos.push(seg(tramo.inicio + 4 + i * pulsoCuadros)));
    if (tramo.tipo === 'ritmo') tramo.escena.palabras.forEach((_, i) => impactos.push(seg(tramo.inicio + 2 + i * pulsoCuadros)));
    if (tramo.tipo === 'partes') impactos.push(seg(tramo.inicio + 4 * pulsoCuadros + 6));
  }
  for (const t of impactos) {
    sumar(t, 0.6, (x) => Math.sin(2 * Math.PI * (38 * x + 2.2 * (1 - Math.exp(-25 * x)))) * Math.exp(-6 * x) * 0.8 + ruido() * Math.exp(-30 * x) * 0.25);
  }

  // Salida suave en el ultimo segundo y normalizacion a -1 dBFS.
  const salida = Math.floor((segundos - 1) * TASA);
  for (let i = salida; i < n; i++) mezcla[i] *= 1 - (i - salida) / (n - salida);
  const pico = mezcla.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1;
  const ganancia = 0.89 / pico;

  const wav = Buffer.alloc(44 + n * 2);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + n * 2, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20); // PCM
  wav.writeUInt16LE(1, 22); // mono
  wav.writeUInt32LE(TASA, 24);
  wav.writeUInt32LE(TASA * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, mezcla[i] * ganancia)) * 32767), 44 + i * 2);
  return wav;
}

/** Una pista por cuenta: con voz, cada cuenta puede durar distinto y la musica tiene que seguirla. */
export function escribirPista(pieza, cuenta) {
  const id = `${pieza.slug}--${cuenta}`;
  const manifiesto = path.join(RAIZ, 'public', 'voz', `${id}.json`);
  const voz = existsSync(manifiesto) ? JSON.parse(readFileSync(manifiesto, 'utf8')) : null;
  const destino = path.join(RAIZ, 'public', 'audio', `${id}.wav`);
  mkdirSync(path.dirname(destino), { recursive: true });
  writeFileSync(destino, sintetizar(aplicarVoz(pieza, voz)));
  return destino;
}

// Uso directo: npm run pista -- <slug>
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const slug = process.argv[2];
  const carpeta = path.join(RAIZ, 'piezas');
  const mes = readdirSync(carpeta).find((m) => readdirSync(path.join(carpeta, m)).includes(`${slug}.json`));
  if (!slug || !mes) {
    console.error('Uso: npm run pista -- <slug>');
    process.exit(1);
  }
  const pieza = JSON.parse(readFileSync(path.join(carpeta, mes, `${slug}.json`), 'utf8'));
  for (const cuenta of pieza.cuentas) console.log(`✓ Pista: ${escribirPista(pieza, cuenta)}`);
}
