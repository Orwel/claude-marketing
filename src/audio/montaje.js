import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { FPS, lineaMontaje, sonidosDe } from '../../remotion/montaje/linea.js';
import { RAIZ } from '../config.js';

/**
 * Pista de la plantilla Montaje: musica de fondo y efectos, sintetizados (sin
 * licencias que puedan tumbar el video). La voz no va aqui: viene del metraje.
 *
 * Musica: una por pieza, de la familia de la del webinar (ver estiloDe). Presente
 * (~ -18 dBFS RMS sola, 6 dB bajo la voz) y apenas se agacha 3 dB cuando Juan
 * David habla, fade de entrada 500 ms y de salida
 * 1 s. Deja espacio para que el audio trending se ponga desde la app al
 * publicar (el trending tiene dueño: no se incrusta en el archivo).
 *
 * Efectos: campanita, click, tick y "woah". Nada de barridos de ruido: el
 * "foosh" sonaba a estatica de televisor y a Juan David no le gusto (27-sep-2026).
 * Maximo un efecto de beat cada 2 s; los ticks de una lista o un conteo cuentan
 * como uno. Ademas: un pop suave en los cortes con cambio de encuadre (uno cada
 * 3 s como mucho), otro en cada acercamiento, entrada del gancho y el barrido
 * del webinar en cada cambio de grabacion (incluida la entrada a la outro).
 */
const TASA = 48000;
/**
 * Musica al estilo de la version webinar (a Juan David le gusto): pad, arpegio
 * con eco y bombo en 1 y 3 (sin el contratiempo agudo: aqui sonaba a estatica). Cada pieza tiene la suya
 * ("distinta aunque similar", 27-sep-2026): del slug salen progresion,
 * tonalidad, tempo y patron del arpegio, siempre dentro de la misma familia.
 */
const PROGRESIONES = [
  [[220.0, 261.63, 329.63], [174.61, 220.0, 261.63], [261.63, 329.63, 392.0], [196.0, 246.94, 293.66]], // Lam Fa Do Sol (la del webinar)
  [[220.0, 261.63, 329.63], [196.0, 246.94, 293.66], [174.61, 220.0, 261.63], [164.81, 207.65, 246.94]], // Lam Sol Fa Mi
  [[261.63, 329.63, 392.0], [196.0, 246.94, 293.66], [220.0, 261.63, 329.63], [174.61, 220.0, 261.63]], // Do Sol Lam Fa
  [[220.0, 261.63, 329.63], [174.61, 220.0, 261.63], [196.0, 246.94, 293.66], [164.81, 196.0, 246.94]], // Lam Fa Sol Mim
  [[174.61, 220.0, 261.63], [196.0, 246.94, 293.66], [220.0, 261.63, 329.63], [220.0, 261.63, 329.63]], // Fa Sol Lam Lam
  [[146.83, 174.61, 220.0], [174.61, 220.0, 261.63], [261.63, 329.63, 392.0], [196.0, 246.94, 293.66]], // Rem Fa Do Sol
];
const PATRONES = [[0, 1, 2, 1, 2, 0, 1, 2], [0, 2, 1, 2, 0, 2, 1, 2], [2, 1, 0, 1, 2, 1, 0, 2], [0, 1, 2, 0, 1, 2, 0, 1]];
function estiloDe(slug) {
  let h = 2166136261;
  for (const c of slug) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const elegir = (lista, k) => lista[(h >>> k) % lista.length];
  return {
    progresion: elegir(PROGRESIONES, 0),
    patron: elegir(PATRONES, 5),
    bpm: elegir([96, 100, 104, 108], 9),
    transponer: 2 ** (elegir([-3, -2, 0, 0, 1, 2], 13) / 12),
    eco: elegir([0.75, 0.75, 0.5], 17),
  };
}

export function sintetizarMontaje(pieza, marca) {
  const linea = lineaMontaje(pieza, marca.id, marca.montaje?.densidad ?? 2);
  const segundos = linea.total / FPS;
  const n = Math.ceil(segundos * TASA);
  const musica = new Float32Array(n);
  const efectos = new Float32Array(n);
  const estilo = estiloDe(pieza.slug);
  const pulso = 60 / estilo.bpm;
  const nota = (f, x) => Math.sin(2 * Math.PI * f * x);
  const sumar = (buffer, inicio, duracion, f) => {
    const a = Math.floor(inicio * TASA);
    const b = Math.min(n, a + Math.floor(duracion * TASA));
    for (let i = Math.max(0, a); i < b; i++) buffer[i] += f((i - a) / TASA);
  };

  // --- Musica (misma receta que sintetizarVertical): pad, arpegio con eco y bombo.
  const compas = pulso * 4;
  const finVoz = linea.finVoz / FPS;
  for (let t = 0, c = 0; t < segundos; t += compas, c++) {
    const acorde = estilo.progresion[c % estilo.progresion.length].map((fr) => fr * estilo.transponer);
    sumar(musica, t, compas + 0.4, (x) => {
      const env = Math.min(1, x / 0.6) * Math.min(1, Math.max(0, (compas + 0.4 - x) / 0.5));
      return acorde.reduce((s, fr) => s + nota(fr / 2, x) + 0.5 * nota((fr / 2) * 1.004, x) + 0.2 * nota(fr, x), 0) * env * 0.05;
    });
    for (let k = 0; k < 8; k++) {
      const fr = acorde[estilo.patron[k]] * 2;
      for (const [retardo, nivel] of [[0, 1], [pulso * estilo.eco, 0.35], [pulso * estilo.eco * 2, 0.12]]) {
        sumar(musica, t + k * (pulso / 2) + retardo, 0.5, (x) => nota(fr, x) * Math.exp(-7 * x) * Math.min(1, x * 300) * 0.07 * nivel);
      }
    }
    if (t < 1.5) continue;
    for (let k = 0; k < 8; k++) {
      const tk = t + k * (pulso / 2);
      if (k % 4 === 0 && tk < finVoz) sumar(musica, tk, 0.35, (x) => Math.sin(2 * Math.PI * (48 * x + (60 / 25) * (1 - Math.exp(-25 * x)))) * Math.exp(-10 * x) * 0.45);
      // Sin el contratiempo agudo del webinar: con la musica mas alta sonaba a estatica.
    }
  }
  // Acorde final que se queda sonando en la tarjeta de marca.
  const final = estilo.progresion[0].map((fr) => fr * estilo.transponer);
  sumar(musica, finVoz, segundos - finVoz, (x) => final.reduce((s, fr) => s + nota(fr, x) + 0.4 * nota(fr * 2, x), 0) * Math.min(1, x / 0.05) * Math.exp(-0.9 * x) * 0.06);

  // --- Efectos, todos tonales.
  const sonidos = {
    // Campanita de tonos puros (Mi y Si, con la octava de Mi muy suave), como el brillo del webinar. La
    // de FM tenia armonicos metalicos sobre 5 kHz que se oian como estatica (27-sep-2026).
    campana: (t0) => {
      for (const [f, nivel] of [[1318.5, 1], [1975.5, 0.45], [2637, 0.12]]) {
        sumar(efectos, t0, 1.2, (x) => Math.sin(2 * Math.PI * f * x) * Math.exp(-4 * x) * Math.min(1, x / 0.005) * 0.06 * nivel);
      }
    },
    // Click y tick tonales, graves y con ataque de 4 ms. Los de antes (rafaga de 3,2 kHz que arrancaba
    // de golpe) sonaban a chasquido de estatica (Juan David, 27-sep-2026).
    click: (t0) => sumar(efectos, t0, 0.12, (x) => (nota(880, x) + 0.4 * nota(1320, x)) * Math.exp(-30 * x) * Math.min(1, x / 0.004) * 0.12),
    tick: (t0) => sumar(efectos, t0, 0.08, (x) => nota(1175, x) * Math.exp(-45 * x) * Math.min(1, x / 0.004) * 0.08),
    // Impacto: seno grave que cae de 110 a 40 Hz con un cuerpo a 80 Hz. Da peso al golpe sin agudos.
    impacto: (t0) => sumar(efectos, t0, 0.7, (x) => (Math.sin(2 * Math.PI * (40 * x + 2.4 * (1 - Math.exp(-22 * x)))) * 0.75 + nota(80, x) * 0.2) * Math.exp(-6 * x) * Math.min(1, x / 0.003) * 0.9),
    // Pop de corte: seno que cae de 700 a 260 Hz en 70 ms. Tonal, nada de ruido.
    pop: (t0) => sumar(efectos, t0, 0.09, (x) => Math.sin(2 * Math.PI * (260 * x + (440 / 30) * (1 - Math.exp(-30 * x)))) * Math.exp(-40 * x) * Math.min(1, x * 2000) * 0.22),
    // Barrido (el mismo del webinar): acorde "al reves" que crece hasta el corte y se corta seco, y golpe grave.
    barrido: (t0) => {
      sumar(efectos, t0 - 0.45, 0.47, (x) => {
        const p = x / 0.47;
        const acorde = nota(220, x) + 0.7 * nota(329.63, x) + 0.5 * nota(440, x) + 0.25 * nota(659.26, x);
        return acorde * p ** 3 * Math.min(1, (0.47 - x) / 0.02) * 0.13;
      });
      sumar(efectos, t0, 0.5, (x) => nota(55, x) * Math.exp(-8 * x) * 0.4);
    },
    // "Woah": vocal sintetica que va de o a a mientras sube el tono (formantes sobre armonicos).
    woah: (t0) => {
      const dur = 0.75;
      sumar(efectos, t0, dur, (x) => {
        const p = x / dur;
        const f0 = 150 + 70 * Math.sin((Math.PI / 2) * Math.min(1, p * 1.4));
        const f1 = 450 + 300 * p;
        const f2 = 800 + 450 * p;
        let s = 0;
        for (let h = 1; h <= 14; h++) {
          const fh = f0 * h;
          const g = Math.exp(-(((fh - f1) / 110) ** 2)) + 0.6 * Math.exp(-(((fh - f2) / 160) ** 2)) + 0.05;
          s += (g * Math.sin(2 * Math.PI * f0 * h * x)) / h ** 0.3;
        }
        return s * Math.sin(Math.PI * Math.min(1, p * 1.05)) ** 1.5 * 0.045;
      });
    },
  };

  const t = (cuadro) => cuadro / FPS;
  let ultimo = -Infinity;
  for (const b of [...linea.beats].sort((a, x) => a.inicio - x.inicio)) {
    const inicio = t(b.inicio);
    const libre = inicio - ultimo >= 2;
    for (const s of sonidosDe(b)) {
      // Los ticks van con su lista o conteo; lo demas respeta el limite de uno cada 4 s.
      if (s.tipo !== 'tick' && !libre) continue;
      sonidos[s.tipo](inicio + t(s.cuadro));
    }
    if (libre) ultimo = inicio;
  }
  // Gancho: entra con click y campana. Outro: subida cuando se divide la pantalla y campana en la palabra clave.
  if (pieza.variantes?.[marca.id]?.gancho) {
    sonidos.click(t(2));
    sonidos.campana(t(4));
  }
  for (const c of linea.cambios) sonidos.barrido(t(c));
  if (linea.cierre != null) sonidos.campana(t(linea.cierre + 12));
  // Golpes tipograficos: impacto grave (sin agudos). La pregunta y la frase entran con campanita.
  // Tipografia cinetica: tick suave por cada palabra que aparece, y la clave cae con impacto
  // (golpe, contorno) o con pop y campanita (serif, pastilla).
  for (const g of linea.golpes) {
    for (const p of g.palabras) {
      if (!p.clave) sonidos.tick(t(g.inicio + p.cuadro));
      else if (g.estilo === 'golpe' || g.estilo === 'contorno') sonidos.impacto(t(g.inicio + p.cuadro));
      else {
        sonidos.pop(t(g.inicio + p.cuadro));
        sonidos.campana(t(g.inicio + p.cuadro + 4));
      }
    }
  }
  // Cada icono al vuelo entra con click y un tick cuando aparece la palabra.
  for (const c of linea.chispas) {
    sonidos.click(t(c.inicio + 1));
    sonidos.tick(t(c.inicio + 6));
  }
  // Cada acercamiento de golpe lleva su pop.
  for (const z of linea.zooms) sonidos.pop(t(z.inicio));
  // Pops en los cortes con cambio de encuadre (misma grabacion, zoom alterno), lejos de otros efectos.
  const ocupados = [...linea.beats.map((b) => t(b.inicio)), ...linea.zooms.map((z) => t(z.inicio)), ...linea.chispas.map((c) => t(c.inicio)), ...linea.golpes.map((g) => t(g.inicio)), ...linea.cambios.map(t), 0];
  let ultimoPop = -Infinity;
  linea.tramos.forEach((tr, i) => {
    if (!i || tr.archivo !== linea.tramos[i - 1].archivo || tr.parte === 'cierre') return;
    const x = t(tr.inicio);
    if (x - ultimoPop < 3 || ocupados.some((o) => Math.abs(o - x) < 1.2)) return;
    sonidos.pop(x);
    ultimoPop = x;
  });
  sonidos.campana(linea.finVoz / FPS + 0.05);

  // --- Voz presente: de los subtitulos, con 120 ms de ataque y 350 ms de relajacion.
  const habla = new Float32Array(n);
  for (const s of linea.subtitulos) {
    const a = Math.floor((s.startMs / 1000 - 0.12) * TASA);
    const b = Math.floor((s.endMs / 1000 + 0.35) * TASA);
    for (let i = Math.max(0, a); i < Math.min(n, b); i++) habla[i] = 1;
  }
  // Suavizado de la envolvente del ducking (constante de ~80 ms) para que no bombee.
  const k = 1 - Math.exp(-1 / (0.08 * TASA));
  let env = 0;
  // Nivel: la musica sola ~ -18 dBFS RMS (unos 6 dB bajo la voz limpia, la misma proporcion del
  // webinar) y solo se agacha 3 dB con la voz. Con -9 dB de ducking
  // casi no se oia (la voz ocupa todo el video): Juan David dijo "no tiene musiquita".
  const rms = Math.sqrt(musica.reduce((s, v) => s + v * v, 0) / n) || 1;
  const nivel = 10 ** (-18 / 20) / rms;
  const mezcla = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    env += (habla[i] - env) * k;
    const x = i / TASA;
    const fade = Math.min(1, x / 0.5) * Math.min(1, Math.max(0, (segundos - x) / 1));
    const duck = 1 - env * (1 - 10 ** (-3 / 20));
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

export function escribirPistaMontaje(pieza, marca) {
  const destino = path.join(RAIZ, 'public', 'audio', 'montaje', `${pieza.slug}--${marca.id}.wav`);
  mkdirSync(path.dirname(destino), { recursive: true });
  writeFileSync(destino, sintetizarMontaje(pieza, marca));
  return destino;
}
