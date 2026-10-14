import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { FPS, lineaArcade, sonidosDe } from '../../remotion/arcade/linea.js';
import { RAIZ } from '../config.js';

/**
 * Pista de la plantilla Arcade: musica chiptune y efectos de 8 bits, todo
 * sintetizado (sin licencias). La voz viene del metraje.
 *
 * Chiptune "de verdad" pero con las reglas del estudio: las ondas cuadradas y
 * de pulso pasan por un pasa-bajos de un polo (~3,5 kHz) para que no haya
 * agudos duros ni nada que suene a estatica; la percusion es tonal (bombo de
 * seno que cae, caja de triangulo corta) y no hay canal de ruido. Ataques de
 * 3-5 ms en todo.
 *
 * Musica: 4 canales a 132 BPM en Do mixolidio (alegre, de plataformas):
 * bajo triangular en corcheas, pulso con arpegio de acorde, melodia de pulso
 * fino con un motivo que se varia por frase (semilla del slug), bombo y caja.
 * Entra con brio en el titulo, baja 3 dB bajo la voz (ducking suave) y se
 * recoge con un acorde final en la tarjeta de cierre.
 */
const TASA = 48000;
const nota = (f, x) => Math.sin(2 * Math.PI * f * x);
// Pulso con ancho `w` (0,5 = cuadrada) y pasa-bajos simple: la version "sin agudos" de la onda de 8 bits.
function pulso(f, x, w = 0.5) {
  const fase = (f * x) % 1;
  return fase < w ? 1 : -1;
}
const triangulo = (f, x) => 2 * Math.abs(2 * ((f * x) % 1) - 1) - 1;
const ataque = (x, ms = 4) => Math.min(1, x / (ms / 1000));
const semitono = (n) => 261.63 * 2 ** (n / 12);
// Do mixolidio: C D E F G A Bb (grados en semitonos).
const ESCALA = [0, 2, 4, 5, 7, 9, 10];
const PROGRESIONES = [
  [0, 5, 7, 5],   // C F G F
  [0, 7, 9, 5],   // C G Am F
  [0, 5, 0, 7],   // C F C G
  [9, 5, 0, 7],   // Am F C G
];
function estiloDe(slug, bpm) {
  let h = 2166136261;
  for (const c of slug) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const elegir = (lista, k) => lista[(h >>> k) % lista.length];
  const azar = (k) => ((h >>> k) & 1023) / 1023;
  return { progresion: elegir(PROGRESIONES, 0), bpm: bpm ?? elegir([126, 132, 138], 5), transponer: elegir([0, 0, 2, -2, 3], 9), motivo: Array.from({ length: 8 }, (_, i) => Math.floor(azar(i * 3 + 1) * 7)), ancho: elegir([0.5, 0.25, 0.125], 13), orden: elegir([[0, 1, 2, 3], [0, 2, 1, 3], [1, 0, 2, 3], [2, 1, 0, 3], [1, 2, 0, 3]], 17) };
}

/** Pasa-bajos de un polo sobre un buffer (frecuencia de corte en Hz). */
function pasaBajos(buffer, corte) {
  const a = 1 - Math.exp((-2 * Math.PI * corte) / TASA);
  let y = 0;
  for (let i = 0; i < buffer.length; i++) {
    y += (buffer[i] - y) * a;
    buffer[i] = y;
  }
}

export function sintetizarArcade(pieza, marca) {
  const linea = lineaArcade(pieza);
  const segundos = linea.total / FPS;
  const n = Math.ceil(segundos * TASA);
  const musica = new Float32Array(n);
  const efectos = new Float32Array(n);
  // `pieza.bpm` acelera el chiptune original sin cambiar su sonido (Juan David, 14-oct-2026: "hazlo mas rapido").
  const estilo = estiloDe(pieza.slug, pieza.bpm);
  const pulsoS = 60 / estilo.bpm;
  const sumar = (buffer, inicio, duracion, f) => {
    const a = Math.floor(inicio * TASA);
    const b = Math.min(n, a + Math.floor(duracion * TASA));
    for (let i = Math.max(0, a); i < b; i++) buffer[i] += f((i - a) / TASA);
  };
  const final = linea.escenas.at(-1);
  const finVoz = final.inicio / FPS;
  const tr = (semi) => semitono(semi + estilo.transponer);

  // --- Musica: el chiptune original (`pieza.bpm` lo acelera). La orquesta y las variantes de chip se descartaron (14-oct-2026).
  const compas = pulsoS * 4;
  const grado = (g, octava = 0) => ESCALA[((g % 7) + 7) % 7] + Math.floor(g / 7) * 12 + octava * 12;
  // `pieza.capas` (14-oct-2026, "que varie"): mismo chiptune, pero por secciones de 2 compases que cambian de
  // timbre, arpegio y ritmo (A pulso · B flauta de triangulo una octava arriba y bombo sincopado · C melodia con
  // segunda voz · D respiro: solo bombo en 1 y eco de la melodia), y las capas entran al arrancar (bajo y arpegio,
  // luego bateria, luego melodia). Sin `capas`, el loop de siempre.
  const capas = !!pieza.capas;
  for (let t = 0, c = 0; t < finVoz; t += compas, c++) {
    const raiz = estilo.progresion[c % 4];
    const acorde = [raiz, raiz + (raiz === 9 ? 3 : 4), raiz + 7];
    // Cada pieza recorre las secciones en su propio orden (la D, el respiro, siempre al final): la idea es la misma, el video no.
    const seccion = capas ? (pieza.orden ?? estilo.orden)[Math.floor(c / 2) % 4] : 0;
    // Bajo: triangulo en corcheas, raiz y quinta, una octava abajo (en B salta de octava).
    for (let k = 0; k < 8; k++) {
      const semi = (k % 4 === 2 ? raiz + 7 : raiz) + (seccion === 1 && k % 2 === 1 ? 12 : 0);
      sumar(musica, t + k * (pulsoS / 2), pulsoS / 2 - 0.02, (x) => triangulo(tr(semi - 24), x) * ataque(x) * Math.exp(-3 * x) * 0.16);
    }
    // Arpegio de pulso en semicorcheas: sube (A), baja (B), quebrado (C) o solo a contratiempo (D).
    for (let k = 0; k < 16; k++) {
      if (seccion === 3 && k % 4 !== 2) continue;
      const idx = seccion === 1 ? 2 - (k % 3) : seccion === 2 ? [0, 2, 1, 2][k % 4] : k % 3;
      const semi = acorde[idx] + (k % 6 === 5 ? 12 : 0);
      sumar(musica, t + k * (pulsoS / 4), pulsoS / 4 - 0.01, (x) => pulso(tr(semi - 12), x, 0.25) * ataque(x, 3) * Math.exp(-9 * x) * (capas ? 0.06 : 0.07));
    }
    // Melodia: el motivo de la pieza, variado por frase (inversion, retrogrado, transposicion), en corcheas con silencios.
    const frase = Math.floor(c / 2) % 4;
    const motivo = frase === 1 ? estilo.motivo.map((g) => 6 - g) : frase === 2 ? [...estilo.motivo].reverse() : frase === 3 ? estilo.motivo.map((g) => (g + 2) % 7) : estilo.motivo;
    if (!(capas && c < 2)) for (let k = 0; k < 8; k++) {
      if ((k + c) % 5 === 4) continue; // un silencio por compas para que respire
      const semi = grado(motivo[k], 1);
      const dur = k % 4 === 3 ? pulsoS : pulsoS / 2;
      const env = (x) => ataque(x, 4) * Math.min(1, (dur - 0.02 - x) / 0.03) * (0.6 + 0.4 * Math.exp(-4 * x));
      if (seccion === 1) sumar(musica, t + k * (pulsoS / 2), dur - 0.02, (x) => triangulo(tr(semi + 12), x) * env(x) * 0.11);
      else sumar(musica, t + k * (pulsoS / 2), dur - 0.02, (x) => pulso(tr(semi), x, estilo.ancho) * env(x) * 0.075);
      if (seccion === 2) sumar(musica, t + k * (pulsoS / 2), dur - 0.02, (x) => pulso(tr(grado(motivo[k] - 2, 1)), x, 0.5) * env(x) * 0.035);
      if (seccion === 3) sumar(musica, t + k * (pulsoS / 2) + pulsoS * 0.75, dur - 0.02, (x) => pulso(tr(semi), x, estilo.ancho) * env(x) * 0.03);
    }
    if (t < 0.6 || (capas && c < 1)) continue;
    // Bombo tonal en 1 y 3 (B: sincopado; D: solo en 1), caja de triangulo corta en 2 y 4 (no en D).
    const bombos = seccion === 1 ? [0, 1.5, 2] : seccion === 3 ? [0] : [0, 2];
    for (const b of bombos) sumar(musica, t + b * pulsoS, 0.22, (x) => Math.sin(2 * Math.PI * (45 * x + 2.2 * (1 - Math.exp(-28 * x)))) * Math.exp(-14 * x) * 0.5);
    if (seccion !== 3) for (const k of [1, 3]) sumar(musica, t + k * pulsoS, 0.09, (x) => triangulo(180, x) * Math.exp(-40 * x) * ataque(x, 2) * 0.3);
  }
  pasaBajos(musica, 3600);
  // Acorde final arpegiado que queda sonando en la tarjeta de cierre.
  [0, 4, 7, 12].forEach((semi, i) => sumar(musica, finVoz + i * 0.07, segundos - finVoz - i * 0.07, (x) => (pulso(tr(semi), x, 0.5) * 0.5 + triangulo(tr(semi - 12), x) * 0.5) * ataque(x) * Math.exp(-0.8 * x) * 0.09));

  // --- Efectos de 8 bits (todos con pasa-bajos despues).
  const fx = new Float32Array(n);
  const suma = (inicio, duracion, f) => sumar(fx, inicio, duracion, f);
  const sonidos = {
    // Moneda: dos notas que suben (Si-Mi), pulso cuadrado corto.
    moneda: (t0) => { suma(t0, 0.07, (x) => pulso(987.8, x) * ataque(x) * 0.18); suma(t0 + 0.07, 0.3, (x) => pulso(1318.5, x) * ataque(x) * Math.exp(-7 * x) * 0.18); },
    // Blip de menu / palabra.
    blip: (t0) => suma(t0, 0.07, (x) => pulso(880 + 400 * Math.min(1, x / 0.03), x, 0.25) * ataque(x, 3) * Math.exp(-25 * x) * 0.16),
    // Tecla de maquina de escribir (texto del dialogo): muy corta y grave.
    texto: (t0) => suma(t0, 0.035, (x) => pulso(520, x, 0.5) * ataque(x, 2) * Math.exp(-70 * x) * 0.09),
    tecla: (t0) => suma(t0, 0.05, (x) => pulso(700, x, 0.25) * ataque(x, 2) * Math.exp(-50 * x) * 0.12),
    // Power-up: arpegio ascendente rapido de 6 notas.
    poder: (t0) => [0, 4, 7, 12, 16, 19].forEach((s, i) => suma(t0 + i * 0.055, 0.12, (x) => pulso(semitono(s + 12), x, 0.5) * ataque(x) * Math.exp(-12 * x) * 0.16)),
    // Golpe de texto: pulso grave que cae + impacto.
    golpe: (t0) => { suma(t0, 0.18, (x) => pulso(220 * Math.exp(-6 * x) + 60, x, 0.5) * ataque(x) * Math.exp(-10 * x) * 0.3); suma(t0, 0.3, (x) => Math.sin(2 * Math.PI * (50 * x + 2 * (1 - Math.exp(-20 * x)))) * Math.exp(-9 * x) * 0.5); },
    // Daño: dos pulsos que bajan, tipo "hit".
    daño: (t0) => [0, 0.09].forEach((d) => suma(t0 + d, 0.09, (x) => pulso(300 - 1200 * x, x, 0.5) * ataque(x) * Math.exp(-18 * x) * 0.22)),
    // XP: tres notas ascendentes cortas.
    xp: (t0) => [0, 5, 9].forEach((s, i) => suma(t0 + i * 0.07, 0.1, (x) => pulso(semitono(s + 24), x, 0.25) * ataque(x) * Math.exp(-14 * x) * 0.15)),
    // Zoom / acercamiento: pop de pulso que baja.
    zoom: (t0) => suma(t0, 0.08, (x) => pulso(600 * Math.exp(-14 * x) + 180, x, 0.5) * ataque(x) * Math.exp(-28 * x) * 0.18),
    pop: (t0) => suma(t0, 0.06, (x) => triangulo(520 * Math.exp(-20 * x) + 200, x) * ataque(x) * Math.exp(-35 * x) * 0.16),
    // Corte / tajo: barrido descendente rapido de pulso.
    corte: (t0) => suma(t0, 0.16, (x) => pulso(2200 * Math.exp(-18 * x) + 150, x, 0.125) * ataque(x, 2) * Math.exp(-12 * x) * 0.2),
    // Seleccion (entrar al juego): dos notas.
    seleccion: (t0) => [0, 7].forEach((s, i) => suma(t0 + i * 0.08, 0.1, (x) => pulso(semitono(s + 12), x, 0.5) * ataque(x) * Math.exp(-14 * x) * 0.16)),
    // Ficha: "player joined", tres notas y campana corta.
    ficha: (t0) => [0, 4, 7, 12].forEach((s, i) => suma(t0 + i * 0.06, 0.14, (x) => pulso(semitono(s + 12), x, 0.5) * ataque(x) * Math.exp(-10 * x) * 0.16)),
    // Nivel: fanfarria corta ascendente.
    nivel: (t0) => [0, 0, 7, 12].forEach((s, i) => suma(t0 + i * 0.11, i === 3 ? 0.5 : 0.1, (x) => (pulso(semitono(s + 12), x, 0.5) + 0.5 * pulso(semitono(s + 24), x, 0.25)) * ataque(x) * Math.exp(-(i === 3 ? 3 : 14) * x) * 0.14)),
    // Inicio (titulo): subida de pulso larga + golpe grave.
    inicio: (t0) => { suma(t0, 0.5, (x) => pulso(120 + 900 * x, x, 0.5) * ataque(x) * Math.min(1, (0.5 - x) / 0.05) * 0.14); suma(t0 + 0.5, 0.4, (x) => Math.sin(2 * Math.PI * (55 * x + 2 * (1 - Math.exp(-20 * x)))) * Math.exp(-8 * x) * 0.5); },
    // Salto de plataformas: pulso que sube rapido.
    salto: (t0) => suma(t0, 0.18, (x) => pulso(300 + 900 * Math.min(1, x / 0.12), x, 0.5) * ataque(x) * Math.exp(-9 * x) * 0.16),
    // Teletransporte: barrido descendente con vibrato.
    teletransporte: (t0) => suma(t0, 0.35, (x) => pulso(1400 * Math.exp(-5 * x) + 80 * Math.sin(60 * x), x, 0.25) * ataque(x) * Math.exp(-6 * x) * 0.14),
    // Respawn: tres notas que bajan y una que sube.
    respawn: (t0) => [[0, 0.1], [-5, 0.1], [-10, 0.1], [7, 0.4]].forEach(([s2, d], i) => suma(t0 + i * 0.11, d, (x) => pulso(semitono(s2 + 12), x, 0.5) * ataque(x) * Math.exp(-(i === 3 ? 4 : 14) * x) * 0.15)),
    // Fanfarria final (1-UP larga).
    fanfarria: (t0) => [0, 4, 7, 12, 7, 12, 16, 19].forEach((s, i) => suma(t0 + i * 0.09, i === 7 ? 0.9 : 0.11, (x) => (pulso(semitono(s + 12), x, 0.5) + 0.4 * triangulo(semitono(s), x)) * ataque(x) * Math.exp(-(i === 7 ? 2.5 : 12) * x) * 0.15)),
  };
  for (const e of linea.escenas) {
    for (const s of sonidosDe(e)) {
      const t0 = (e.inicio + s.cuadro) / FPS;
      if (t0 >= 0 && t0 < segundos) sonidos[s.tipo]?.(t0);
    }
  }
  // Barrido pixel entre escenas: subida corta de pulso que se corta seco en el corte, y golpe grave.
  for (const c of linea.cambios) {
    const t0 = c / FPS;
    suma(t0 - 0.3, 0.3, (x) => pulso(200 + 1400 * (x / 0.3) ** 2, x, 0.5) * ataque(x) * (x / 0.3) ** 2 * 0.16);
    suma(t0, 0.35, (x) => Math.sin(2 * Math.PI * (50 * x + 2 * (1 - Math.exp(-20 * x)))) * Math.exp(-9 * x) * 0.45);
  }
  pasaBajos(fx, 3800);
  for (let i = 0; i < n; i++) efectos[i] = fx[i];

  // --- Mezcla: musica a ~-20 dBFS RMS bajo la voz (ducking de 3 dB), -14 en el titulo y el final.
  const habla = new Float32Array(n);
  for (const e of linea.escenas) {
    if (e.tipo !== 'clip' && e.tipo !== 'cierre') continue;
    for (const s of e.subtitulos ?? []) {
      const a = Math.floor(((e.inicio / FPS) + s.startMs / 1000 - 0.12) * TASA);
      const b = Math.floor(((e.inicio / FPS) + s.endMs / 1000 + 0.35) * TASA);
      for (let i = Math.max(0, a); i < Math.min(n, b); i++) habla[i] = 1;
    }
  }
  const conVoz = new Float32Array(n);
  for (const e of linea.escenas) {
    if (e.tipo !== 'clip' && e.tipo !== 'cierre') continue;
    for (let i = Math.floor((e.inicio / FPS) * TASA); i < Math.min(n, Math.floor(((e.inicio + e.cuadros) / FPS) * TASA)); i++) conVoz[i] = 1;
  }
  const k = 1 - Math.exp(-1 / (0.08 * TASA));
  let env = 0;
  let envEscena = 0;
  const rms = Math.sqrt(musica.reduce((s, v) => s + v * v, 0) / n) || 1;
  const nivel = 10 ** (-19 / 20) / rms;
  const mezcla = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    env += (habla[i] - env) * k;
    envEscena += (conVoz[i] - envEscena) * k;
    const x = i / TASA;
    const fade = Math.min(1, x / 0.3) * Math.min(1, Math.max(0, (segundos - x) / 1));
    // Escenas con voz: musica 5 dB mas baja que en titulos/mapa, y 3 dB mas cuando habla.
    const duck = 10 ** ((-5 * envEscena - 3 * env) / 20);
    mezcla[i] = Math.tanh(musica[i] * nivel * duck * fade + efectos[i] * 0.9);
  }
  return aWav(mezcla);
}

function aWav(mezcla) {
  const n = mezcla.length;
  const wav = Buffer.alloc(44 + n * 2);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + n * 2, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(TASA, 24);
  wav.writeUInt32LE(TASA * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, mezcla[i])) * 32767), 44 + i * 2);
  return wav;
}

export function escribirPistaArcade(pieza, marca) {
  const destino = path.join(RAIZ, 'public', 'audio', 'arcade', `${pieza.slug}--${marca.id}.wav`);
  mkdirSync(path.dirname(destino), { recursive: true });
  writeFileSync(destino, sintetizarArcade(pieza, marca));
  return destino;
}
