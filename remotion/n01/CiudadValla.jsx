import React, { useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame } from 'remotion';
import { cargarFuentes, fuente, useFuentes } from '../fuentes.js';
import palabras from '../../public/n01/palabras.json';

/**
 * N01 v2 · La pantalla de carga prohibida, estilo 8b «Ciudad pixel con valla» (docs/ESTILOS.md),
 * imitando el pin px344 de Kirokaze: una ciudad de noche a pantalla completa, alguien pequeño de
 * espaldas en una terraza y una valla gigante que cuenta la historia. La v1 (monitor con marco,
 * barra, chiptune) se rechazó por ser «como todo lo que hemos hecho».
 *
 * Se pinta en un canvas de 270×480 (el tamaño del arte) y se amplía ×4 con `pixelated`: así todo,
 * texto incluido, cae en la misma rejilla. Fondo: Warped City 2 de ansimuz (CC0).
 * Movimiento como en el tablero: casi todo quieto, velocidad fija a pasos de pixel, poses «en tres».
 */

const W = 270, H = 480, ESC = 4;
const VEL = 1.07; // la voz va a 1,07× en la mezcla: los tiempos de palabras.json se dividen por esto
const FPS = 30;
const t = (s) => s / VEL;
export const DURACION_N01V2 = Math.round(t(47.84) * FPS + 1.6 * FPS);

// Planos: cortes secos en palabras de la voz entre el general, la pantalla ampliada ×2 y la figura ×2.
// Siempre en múltiplos enteros del pixel para que el arte siga nítido. `c` = punto del arte que queda al centro.
const PLANOS = [
  { desde: 0, zoom: 1 },
  { desde: 4.7, zoom: 2, c: [147, 191] },     // «Jugar mientras esperas»: NOW LOADING en grande
  { desde: 9.64, zoom: 1 },                   // «durante veinte años»: vuelve el general
  { desde: 14.24, zoom: 2, c: [147, 300] },   // «No era un problema técnico»: la figura mira
  { desde: 16.79, zoom: 2, c: [147, 191] },   // «Era una patente»: el sello lleno
  { desde: 23.82, zoom: 1 },                  // el minijuego, con la figura mirando
  { desde: 27.57, zoom: 2, c: [147, 191] },   // «Se la concedieron»
  { desde: 31.5, zoom: 1 },                   // el dron que vigila
  { desde: 34.3, zoom: 2, c: [147, 300] },    // los consejos: la figura bosteza
  { desde: 39.6, zoom: 2, c: [147, 191] },    // dibujo contra forma de hacerlo
  { desde: 44.04, zoom: 1 },                  // la pregunta y el cierre en bucle
];

const PAL = { cielo: '#2a003f', cielo2: '#3a0a52', luna: '#f6d9ea', luna2: '#d9a9c9', menta: '#5ef2c8', menta2: '#2bb08f', menta3: '#13594d', torre: '#1c0826', torre2: '#2c0f3a', ventana: '#ff3b6b', rojo: '#fd0c3f', crema: '#f4efe6', negro: '#0b0410', piel: '#7a4a3a', buzo: '#3b6fb0', buzo2: '#244a7e', pelo: '#140a12' };

// Bloques de la valla: cada uno empieza en la palabra que lo dispara (segundo de la voz original).
const BLOQUES = [
  { id: 'sinConexion', desde: 0 },
  { id: 'cargando', desde: 4.7 },
  { id: 'anios', desde: 9.64 },
  { id: 'patente', desde: 16.79 },
  { id: 'documento', desde: 17.92 },
  { id: 'minijuego', desde: 23.82 },
  { id: 'concedida', desde: 27.57 },
  { id: 'candado', desde: 31.5 },
  { id: 'consejo', desde: 34.3 },
  { id: 'dibujo', desde: 39.6 },
  { id: 'forma', desde: 42.43 },
  { id: 'pregunta', desde: 44.14 },
];
const GOLPES = [16.79, 27.72]; // destello e inversión de 1 cuadro (el sello)

// --- Sprites propios a mano (una letra = un color). Diseños originales: no son el de Chrome ni los de ningún juego.
const DINO = [
  ['....mmmmm', '...mmkmmm', '...mmmmmm', '...mmmm..', 'm.mmmmmm.', 'mmmmmmm..', '.mmmmmm..', '..mmmm...', '..m..m...', '..mm.mm..'],
  ['....mmmmm', '...mmkmmm', '...mmmmmm', '...mmmm..', 'm.mmmmmm.', 'mmmmmmm..', '.mmmmmm..', '..mmmm...', '..mm.m...', '...m.mm..'],
];
// La figura de espaldas, sentada (capucha, hombros, espalda). Poses: quieta, cabeza girada, brazos arriba (bostezo).
const FIGURA = {
  quieta: ['.......pppp.......', '.....pppppppp.....', '....pppppppppp....', '....pppppppppp....', '.....pppppppp.....', '......pppppp......', '....hhhhhhhhhh....', '..hhhbbbbbbbbhhh..', '.hbbbbbbbbbbbbbbh.', '.bbbbbbBBBBbbbbbb.', 'bbbbbbbBBBBbbbbbbb', 'bbbbbbbBBBBbbbbbbb', 'bbbbbbbbbbbbbbbbbb', 'bbbbbbbbbbbbbbbbbb', '.bbbbbbbbbbbbbbbb.', '.bbbbbbbbbbbbbbbb.', '..bbbbbbbbbbbbbb..', '..BBBBBBBBBBBBBB..', '.BBBBBBBBBBBBBBBB.', 'BBBBBBBBBBBBBBBBBB', 'BBBBBBBBBBBBBBBBBB', '.ssss........ssss.'],
  gira: ['.......ppppss.....', '.....ppppppsss....', '....pppppppsss....', '....ppppppppss....', '.....ppppppps.....', '......pppppp......', '....hhhhhhhhhh....', '..hhhbbbbbbbbhhh..', '.hbbbbbbbbbbbbbbh.', '.bbbbbbBBBBbbbbbb.', 'bbbbbbbBBBBbbbbbbb', 'bbbbbbbBBBBbbbbbbb', 'bbbbbbbbbbbbbbbbbb', 'bbbbbbbbbbbbbbbbbb', '.bbbbbbbbbbbbbbbb.', '.bbbbbbbbbbbbbbbb.', '..bbbbbbbbbbbbbb..', '..BBBBBBBBBBBBBB..', '.BBBBBBBBBBBBBBBB.', 'BBBBBBBBBBBBBBBBBB', 'BBBBBBBBBBBBBBBBBB', '.ssss........ssss.'],
  bosteza: ['ss.....pppp.....ss', 'bb...pppppppp...bb', 'bb..pppppppppp..bb', '.bb.pppppppppp.bb.', '.bbb.pppppppp.bbb.', '..bbb.pppppp.bbb..', '...bbhhhhhhhhbb...', '...hhbbbbbbbbhh...', '..hbbbbbbbbbbbbh..', '.bbbbbbBBBBbbbbbb.', '.bbbbbbBBBBbbbbbb.', 'bbbbbbbBBBBbbbbbbb', 'bbbbbbbbbbbbbbbbbb', 'bbbbbbbbbbbbbbbbbb', '.bbbbbbbbbbbbbbbb.', '.bbbbbbbbbbbbbbbb.', '..bbbbbbbbbbbbbb..', '..BBBBBBBBBBBBBB..', '.BBBBBBBBBBBBBBBB.', 'BBBBBBBBBBBBBBBBBB', 'BBBBBBBBBBBBBBBBBB', '.ssss........ssss.'],
};
const COLF = { p: PAL.pelo, s: PAL.piel, b: PAL.buzo, B: PAL.buzo2, h: '#5a8fd0' };

// Ruido determinista: las estrellas y la lluvia quedan iguales en cada render.
const azar = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

const pintarSprite = (c, arte, x, y, colores, escala = 1) => {
  arte.forEach((fila, j) => [...fila].forEach((ch, i) => {
    if (!colores[ch]) return;
    c.fillStyle = colores[ch];
    c.fillRect(Math.round(x + i * escala), Math.round(y + j * escala), escala, escala);
  }));
};

const texto = (c, s, x, y, tam, color, alinear = 'center') => {
  c.font = `${tam}px 'Silkscreen Bold'`;
  c.textAlign = alinear;
  c.textBaseline = 'top';
  c.fillStyle = color;
  c.fillText(s, Math.round(x), Math.round(y));
};

// --- Contenido de la valla (pantalla de 104×146 en coordenadas del arte) ---
const VX = 78, VY = 64, VW = 138, VH = 254;
const SX = VW / 104, SY = VH / 146; // el contenido se diseñó a 104×146: sus posiciones se escalan

const pintarValla = (c, bloque, seg, f) => {
  const local = seg - t(bloque.desde);
  const cx = VX + VW / 2;
  // Pantalla luminosa: fondo menta oscuro con bandas más claras arriba, como la valla del pin.
  c.fillStyle = '#1a7a68'; c.fillRect(VX, VY, VW, VH);
  c.fillStyle = '#22917b'; c.fillRect(VX, VY, VW, Math.round(VH * 0.35));
  c.fillStyle = '#2aa88d'; c.fillRect(VX, VY, VW, Math.round(VH * 0.12));
  switch (bloque.id) {
    case 'sinConexion': {
      texto(c, 'SIN', cx, VY + Math.round(18 * SY), 16, PAL.crema); texto(c, 'CONEXIÓN', cx, VY + Math.round(18 * SY) + 20, 16, PAL.crema);
      c.fillStyle = PAL.menta2; c.fillRect(VX + Math.round(8 * SX), VY + Math.round(110 * SY), VW - 16, 1);
      const corre = seg >= t(2.84);
      const salto = corre ? Math.max(0, Math.round(Math.sin(f / 6) * 12)) : 0;
      pintarSprite(c, DINO[Math.floor(f / 3) % 2], VX + Math.round(16 * SX), VY + Math.round(110 * SY) - 30 - salto * 2, { m: PAL.crema, k: PAL.menta3 }, 3);
      const cactus = (VX + VW + 10 - ((f * 2) % (VW + 20)));
      if (corre) { c.fillStyle = PAL.menta; c.fillRect(Math.round(cactus), VY + Math.round(102 * SY), 3, 8); c.fillRect(Math.round(cactus) - 2, VY + Math.round(104 * SY), 2, 3); }
      break;
    }
    case 'cargando': {
      texto(c, 'NOW', cx, VY + Math.round(30 * SY), 16, PAL.menta);
      texto(c, 'LOADING', cx, VY + Math.round(46 * SY), 16, PAL.menta);
      // Matriz LED con persistencia: los puntos se encienden de a uno y dejan estela.
      for (let i = 0; i < 12; i++) {
        const fase = (Math.floor(f / 3) - i + 120) % 12;
        c.fillStyle = fase === 0 ? PAL.crema : fase < 3 ? PAL.menta : PAL.menta2;
        c.fillRect(VX + Math.round(10 * SX) + i * 7, VY + Math.round(100 * SY), 5, 5);
      }
      break;
    }
    case 'anios': {
      const anio = Math.round(Math.min(2015, Math.max(1995, 1995 + ((seg - t(11.35)) / (t(12.9) - t(11.35))) * 20)));
      texto(c, String(anio), cx, VY + Math.round(46 * SY), 32, PAL.crema);
      texto(c, 'CASI NADIE', cx, VY + Math.round(92 * SY), 16, PAL.menta);
      texto(c, 'LO HIZO', cx, VY + Math.round(108 * SY), 16, PAL.menta);
      break;
    }
    case 'patente': {
      c.fillStyle = '#3d0614'; c.fillRect(VX, VY, VW, VH);
      c.save(); c.translate(cx, VY + Math.round(70 * SY)); c.rotate(-0.18);
      c.strokeStyle = PAL.rojo; c.lineWidth = 3; c.strokeRect(-44, -16, 88, 32);
      texto(c, 'PATENTE', 0, -8, 16, PAL.rojo);
      c.restore();
      break;
    }
    case 'documento': {
      c.fillStyle = PAL.crema; c.fillRect(VX + Math.round(8 * SX), VY + Math.round(8 * SY), VW - 16, VH - 16);
      const lineas = ['PATENTE EE. UU.', 'NAMCO', 'PRESENTADA: 1995', 'UN MINIJUEGO', 'MIENTRAS CARGA'];
      const marcas = [17.92, 19.53, 18.53, 23.82, 25.0];
      lineas.forEach((l, i) => {
        const n = Math.max(0, Math.floor((seg - t(marcas[i])) * 18));
        texto(c, l.slice(0, n), VX + Math.round(14 * SX), VY + Math.round(18 * SY) + i * 24, 8, i === 0 ? PAL.rojo : PAL.negro, 'left');
      });
      break;
    }
    case 'minijuego': {
      for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) {
        const x = VX + Math.round(14 * SX) + i * 17 + Math.round(Math.sin(f / 10) * 4), y = VY + Math.round(14 * SY) + j * 14;
        c.fillStyle = PAL.menta; c.fillRect(x, y, 9, 5); c.fillRect(x + (Math.floor(f / 6) % 2 ? 0 : 1), y + 5, 2, 2); c.fillRect(x + 7 - (Math.floor(f / 6) % 2 ? 0 : 1), y + 5, 2, 2);
      }
      const nx = VX + Math.round(46 * SX) + Math.round(Math.sin(f / 9) * 30);
      c.fillStyle = PAL.crema; c.fillRect(nx, VY + Math.round(78 * SY), 9, 3); c.fillRect(nx + 3, VY + Math.round(74 * SY), 3, 4);
      c.fillRect(nx + 4, VY + Math.round(70 * SY) - ((f * 3) % 40), 1, 4);
      c.fillStyle = PAL.menta2; c.fillRect(VX + Math.round(4 * SX), VY + Math.round(92 * SY), VW - 8, 1);
      texto(c, 'CARGANDO', cx, VY + Math.round(98 * SY), 16, PAL.crema);
      const carga = Math.min(1, Math.max(0, (seg - t(23.82)) / (t(27.4) - t(23.82))));
      c.strokeStyle = PAL.menta; c.lineWidth = 1; c.strokeRect(VX + Math.round(10 * SX) + 0.5, VY + Math.round(118 * SY) + 0.5, VW - 21, 9);
      c.fillStyle = PAL.menta; c.fillRect(VX + Math.round(13 * SX), VY + Math.round(121 * SY), Math.floor((VW - 26) * carga), 5);
      break;
    }
    case 'concedida': {
      c.fillStyle = PAL.crema; c.fillRect(VX + Math.round(8 * SX), VY + Math.round(8 * SY), VW - 16, VH - 16);
      texto(c, 'PATENTE NAMCO', cx, VY + Math.round(20 * SY), 8, PAL.negro);
      if (seg >= t(27.72)) {
        c.save(); c.translate(cx, VY + Math.round(62 * SY)); c.rotate(-0.16);
        c.strokeStyle = '#1f8a4c'; c.lineWidth = 2; c.strokeRect(-62, -15, 124, 30);
        texto(c, 'CONCEDIDA', 0, -8, 16, '#1f8a4c');
        c.restore();
      }
      if (seg >= t(29.67)) texto(c, 'VENCE', cx, VY + Math.round(92 * SY), 16, PAL.negro);
      if (seg >= t(30.4)) texto(c, '27.11.2015', cx, VY + Math.round(108 * SY), 16, PAL.rojo);
      break;
    }
    case 'candado': {
      const x = cx - 20, y = VY + Math.round(46 * SY);
      c.fillStyle = PAL.menta2; c.fillRect(x + 8, y - 18, 4, 20); c.fillRect(x + 28, y - 18, 4, 20); c.fillRect(x + 8, y - 22, 24, 4);
      c.fillStyle = PAL.menta; c.fillRect(x, y, 40, 32);
      c.fillStyle = PAL.menta3; c.fillRect(x + 17, y + 10, 6, 6); c.fillRect(x + 19, y + 16, 2, 8);
      if (seg >= t(33.24)) texto(c, 'PERMISO', cx, VY + Math.round(104 * SY), 16, PAL.crema);
      break;
    }
    case 'consejo': {
      const s = 'CONSEJO: SIGUE ESPERANDO.';
      const n = Math.max(0, Math.floor(local * 12));
      const palabrasC = s.slice(0, n).split(' ');
      palabrasC.forEach((p, i) => texto(c, p, cx, VY + Math.round(36 * SY) + i * 28, 16, i === 0 ? PAL.menta : PAL.crema));
      break;
    }
    case 'dibujo': {
      pintarSprite(c, DINO[0], cx - 18, VY + Math.round(40 * SY), { m: PAL.menta, k: PAL.menta3 }, 4);
      if (seg >= t(40.46)) { c.strokeStyle = PAL.rojo; c.lineWidth = 3; c.beginPath(); c.moveTo(VX + Math.round(14 * SX), VY + Math.round(100 * SY)); c.lineTo(VX + VW - 14, VY + Math.round(34 * SY)); c.stroke(); }
      texto(c, 'DIBUJO', cx, VY + Math.round(112 * SY), 16, PAL.crema);
      break;
    }
    case 'forma': {
      ['CARGA', 'MINIJUEGO', 'JUEGO'].forEach((p, i) => {
        c.strokeStyle = PAL.menta; c.lineWidth = 1; c.strokeRect(VX + Math.round(14 * SX) + 0.5, VY + Math.round(14 * SY) + 0.5 + i * 48, VW - 29, 26);
        texto(c, p, cx, VY + Math.round(14 * SY) + 6 + i * 48, 12, PAL.crema);
        if (i < 2) { c.fillStyle = PAL.menta; c.fillRect(cx - 1, VY + Math.round(14 * SY) + 27 + i * 48, 2, 20); }
      });
      if (seg >= t(43.28)) texto(c, 'FORMA DE HACERLO', cx, VY + Math.round(118 * SY) + 20, 8, PAL.crema);
      break;
    }
    case 'pregunta': {
      ['¿QUÉ OTRA', 'MECÁNICA', 'ESTÁ', 'PATENTADA?'].forEach((p, i) => texto(c, p, cx, VY + Math.round(26 * SY) + i * 30, 16, i === 1 ? PAL.menta : PAL.crema));
      break;
    }
    default:
  }
  // Scanlines de la pantalla y parpadeo leve, como la valla del pin.
  c.fillStyle = 'rgba(0,0,0,0.22)';
  for (let y = VY; y < VY + VH; y += 2) c.fillRect(VX, y, VW, 1);
};

const IMAGENES = ['back', 'middle', 'front', 'banner-b1', 'banner-b2', 'banner-b3', 'banner-b4', 'banner-e1', 'banner-e2', 'banner-e3', 'banner-e4', 'lights1', 'lights2', 'lights3', 'lights4', 'drone-1', 'drone-2', 'drone-3', 'drone-4'];

// Paleta del pin de Kirokaze (px344): azul petróleo de base, la valla en menta como única luz fuerte,
// rosa neón y ámbar de acento. El arte de Warped City (rojo y morado) se recolorea a esta paleta al cargar.
const KZ = { n0: '#07121a', n1: '#0c2029', n2: '#123140', n3: '#1b4652', n4: '#285f68', n5: '#3d8580', menta: '#5ef2c8', mentaClara: '#c4fff0', rosa: '#ff4fa3', rosa2: '#a8287a', ambar: '#f2a33b', ambar2: '#9a5a20', crema: '#f4efe6' };
const RAMPA = [KZ.n0, KZ.n1, KZ.n2, KZ.n3, KZ.n4, KZ.n5];
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

// Recoloreo por luminancia: cada pixel cae en un escalón de la rampa; los rojos saturados pasan a rosa neón
// y los blancos (ventanas) a ámbar. Se hace una sola vez por imagen, en un canvas aparte.
const recolorear = (imagen) => {
  const cv = document.createElement('canvas'); cv.width = imagen.width; cv.height = imagen.height;
  const c = cv.getContext('2d'); c.drawImage(imagen, 0, 0);
  const d = c.getImageData(0, 0, cv.width, cv.height); const a = d.data;
  const rampa = RAMPA.map(rgb), rosa = rgb(KZ.rosa), ambar = rgb(KZ.ambar);
  for (let i = 0; i < a.length; i += 4) {
    if (a[i + 3] === 0) continue;
    const [r, g, b] = [a[i], a[i + 1], a[i + 2]];
    const lum = 0.3 * r + 0.59 * g + 0.11 * b;
    let col;
    if (lum > 190) col = ambar;
    else if (r > 170 && g < 90) col = rosa;
    else col = rampa[Math.min(rampa.length - 1, Math.floor((lum / 150) * rampa.length))];
    a[i] = col[0]; a[i + 1] = col[1]; a[i + 2] = col[2];
  }
  c.putImageData(d, 0, 0);
  return cv;
};

const useImagenes = () => {
  const [img, setImg] = useState(null);
  const [espera] = useState(() => delayRender('Imágenes de la ciudad'));
  useLayoutEffect(() => {
    Promise.all(IMAGENES.map((n) => new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok([n, recolorear(i)]); i.onerror = mal; i.src = staticFile(`n01/ciudad/${n}.png`); })))
      // El canvas no espera a useFuentes: la fuente pixel se carga aquí antes de soltar el cuadro.
      .then(async (pares) => { await cargarFuentes(); await document.fonts.load("8px 'Silkscreen Bold'"); setImg(Object.fromEntries(pares)); continueRender(espera); });
  }, [espera]);
  return img;
};

const rect = (c, col, x, y, w, h) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
const poli = (c, col, pts) => { c.fillStyle = col; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill(); };
const disco = (c, col, x, y, r) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };
const ovalo = (c, col, x, y, rx, ry) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); };

const camino = (c, col, fn) => { c.fillStyle = col; c.beginPath(); fn(c); c.closePath(); c.fill(); };
const tramado = (c, col, x, y, w, h, fase = 0) => { c.fillStyle = col; for (let j = 0; j < h; j++) for (let i = (j + fase) % 2; i < w; i += 2) c.fillRect(x + i, y + j, 1, 1); };

// La figura, a contraluz contra la valla: una silueta oscura, sentada en un banquito, con un pixel de luz menta
// en el borde de arriba y de los lados (la luz de la pantalla). Se dibuja con formas en un canvas aparte y luego se
// «pixela»: cada pixel queda lleno o vacío (sin bordes suavizados), que es lo que hace que se vea pixel art.
const FIG_W = 40, FIG_H = 64;
const figuraCache = {};
const figuraPixel = (pose, respira) => {
  const clave = `${pose}-${respira}`;
  if (figuraCache[clave]) return figuraCache[clave];
  const cv = document.createElement('canvas'); cv.width = FIG_W; cv.height = FIG_H;
  const k = cv.getContext('2d');
  k.fillStyle = '#000';
  const r = respira;
  const forma = (fn) => { k.beginPath(); fn(); k.closePath(); k.fill(); };
  // Cabeza de pelo crespo (contorno irregular de rizos) y cuello.
  const hx = pose === 'gira' ? 21 : 20, hy = 9 - r;
  forma(() => k.arc(hx, hy, 7, 0, Math.PI * 2));
  for (const [dx, dy] of [[-6, -3], [-3, -7], [2, -7], [6, -3], [-7, 2], [7, 2]]) forma(() => k.arc(hx + dx, hy + dy, 2.6, 0, Math.PI * 2));
  k.fillRect(17, 14 - r, 6, 5);
  // Espalda: hombros redondeados y cintura, levemente encorvada hacia la pantalla.
  forma(() => { k.moveTo(9, 22 - r); k.quadraticCurveTo(10, 17 - r, 20, 17 - r); k.quadraticCurveTo(30, 17 - r, 31, 22 - r); k.lineTo(29, 42); k.lineTo(11, 42); });
  if (pose === 'bosteza') {
    forma(() => { k.moveTo(9, 22 - r); k.lineTo(5, 4); k.lineTo(8, 3); k.lineTo(13, 20 - r); });
    forma(() => { k.moveTo(31, 22 - r); k.lineTo(35, 4); k.lineTo(32, 3); k.lineTo(27, 20 - r); });
  } else {
    // Brazos con el codo hacia afuera, apoyados en las rodillas.
    forma(() => { k.moveTo(10, 20 - r); k.lineTo(5, 32); k.lineTo(7, 42); k.lineTo(10, 42); k.lineTo(9, 32); k.lineTo(13, 24); });
    forma(() => { k.moveTo(30, 20 - r); k.lineTo(35, 32); k.lineTo(33, 42); k.lineTo(30, 42); k.lineTo(31, 32); k.lineTo(27, 24); });
  }
  // Piernas cruzadas sobre el banquito: rodillas que asoman a los lados.
  forma(() => { k.moveTo(3, 46); k.quadraticCurveTo(4, 41, 12, 41); k.lineTo(28, 41); k.quadraticCurveTo(36, 41, 37, 46); k.lineTo(34, 49); k.lineTo(6, 49); });
  // Pixelado duro y borde de luz: un pixel de menta donde arriba o al costado hay vacío.
  const d = k.getImageData(0, 0, FIG_W, FIG_H); const a = d.data;
  const lleno = (x, y) => x >= 0 && y >= 0 && x < FIG_W && y < FIG_H && a[(y * FIG_W + x) * 4 + 3] > 110;
  const salida = k.createImageData(FIG_W, FIG_H); const s = salida.data;
  const pon = (x, y, [rr, gg, bb]) => { const i = (y * FIG_W + x) * 4; s[i] = rr; s[i + 1] = gg; s[i + 2] = bb; s[i + 3] = 255; };
  for (let y = 0; y < FIG_H; y++) for (let x = 0; x < FIG_W; x++) {
    if (!lleno(x, y)) continue;
    const arriba = !lleno(x, y - 1), izq = !lleno(x - 1, y), der = !lleno(x + 1, y);
    if (arriba && y < 30) pon(x, y, [196, 255, 240]);
    else if ((izq || der) && y < 44) pon(x, y, [63, 174, 154]);
    else pon(x, y, y < 16 ? [10, 8, 14] : [14, 18, 28]);
  }
  k.clearRect(0, 0, FIG_W, FIG_H); k.putImageData(salida, 0, 0);
  figuraCache[clave] = cv;
  return cv;
};

const figura = (c, x, y, pose, f) => {
  const respira = Math.floor(f / 45) % 2;
  // Banquito bajo donde está sentada, y su sombra en el piso (así no flota).
  rect(c, 'rgba(4,10,14,0.8)', x + 2, y + 58, 40, 4);
  rect(c, '#1c3a44', x + 8, y + 48, 28, 4); rect(c, '#3fae9a', x + 8, y + 48, 28, 1);
  rect(c, '#132a32', x + 10, y + 52, 3, 7); rect(c, '#132a32', x + 31, y + 52, 3, 7);
  c.drawImage(figuraPixel(pose, respira), x + 2, y);
};

// Degradado tramado entre dos colores (en pasos, como el pixel art pintado a mano): sin desenfoques.
const degradeTramado = (c, a, b, x, y, w, h) => {
  rect(c, a, x, y, w, h);
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  c.fillStyle = b;
  for (let j = 0; j < h; j++) {
    const nivel = (j / h) * 16;
    for (let i = 0; i < w; i++) if (bayer[(i % 4) + 4 * (j % 4)] < nivel) c.fillRect(x + i, y + j, 1, 1);
  }
};

// Cable que cuelga entre dos puntos (catenaria aproximada), con una gota de luz que lo recorre.
const cable = (c, x1, y1, x2, y2, caida, col) => {
  c.strokeStyle = col; c.lineWidth = 1; c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo((x1 + x2) / 2, Math.max(y1, y2) + caida, x2, y2); c.stroke();
};

// Planta en maceta: hojas en abanico con dos verdes y el borde iluminado por la valla.
const planta = (c, x, y, tam, f, semilla) => {
  rect(c, '#5a3a24', x - tam * 0.5, y, tam, tam * 0.7); rect(c, '#7a5032', x - tam * 0.5, y, tam, 2);
  const mece = Math.floor(f / 20 + semilla) % 2;
  for (let i = 0; i < 6; i++) {
    const ang = -Math.PI / 2 + (i - 2.5) * 0.42 + (mece ? 0.05 : -0.05);
    const largo = tam * (0.9 + (i % 3) * 0.25);
    c.fillStyle = i % 2 ? '#2f7a4a' : '#4fa465';
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(ang - 0.3) * largo * 0.6, y + Math.sin(ang - 0.3) * largo * 0.6, x + Math.cos(ang) * largo, y + Math.sin(ang) * largo);
    c.quadraticCurveTo(x + Math.cos(ang + 0.3) * largo * 0.6, y + Math.sin(ang + 0.3) * largo * 0.6, x, y); c.fill();
  }
  rect(c, KZ.mentaClara, x - 1, y - tam, 1, 2);
};

// Edificio lateral con volumen: degradado tramado hacia abajo, borde de luz del lado de la valla,
// balcones con baranda, ventanas que se encienden de a poco y un tubo.
const edificio = (c, x0, ancho, y0, f, semilla, ladoLuz) => {
  degradeTramado(c, KZ.n2, KZ.n0, x0, y0, ancho, 330 - y0);
  rect(c, KZ.n3, x0, y0, ancho, 2);
  for (let y = y0 + 12; y < 320; y += 24) {
    rect(c, KZ.n3, x0, y + 16, ancho, 2); rect(c, KZ.n1, x0, y + 18, ancho, 2);
    for (let x = x0 + 2; x < x0 + ancho; x += 4) rect(c, KZ.n3, x, y + 12, 1, 4); // baranda del balcón
    for (let x = x0 + 4; x < x0 + ancho - 6; x += 10) {
      const on = azar(semilla + x * 3 + y + Math.floor(f / 120)) > 0.6;
      rect(c, on ? KZ.ambar : '#05101a', x, y, 6, 10);
      if (on) { rect(c, '#ffd27a', x + 1, y + 1, 2, 3); rect(c, KZ.ambar2, x, y + 8, 6, 2); c.fillStyle = 'rgba(242,163,59,0.18)'; c.fillRect(x - 1, y + 10, 8, 3); }
    }
  }
  rect(c, KZ.n3, x0 + (semilla % 2 ? ancho - 3 : 1), y0 + 4, 2, 320 - y0);
  // Borde de luz menta en la arista que mira a la valla.
  const xl = ladoLuz === 'derecha' ? x0 + ancho - 1 : x0;
  for (let y = y0; y < 330; y += 1) if (azar(y + semilla) > 0.25) rect(c, y < 200 ? '#3fae9a' : '#2a7c6e', xl, y, 1, 1);
};

const pintar = (c, img, f) => {
  const seg = f / FPS;
  c.imageSmoothingEnabled = false;
  // Cielo: degradado tramado de petróleo a más claro hacia el horizonte, estrellas que titilan.
  degradeTramado(c, KZ.n1, KZ.n2, 0, 0, W, 160);
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(azar(i) * W), y = Math.floor(azar(i + 99) * 140);
    if (Math.floor(f / 8 + azar(i + 7) * 10) % 9 === 0) continue;
    rect(c, azar(i + 3) > 0.8 ? KZ.mentaClara : KZ.n4, x, y, 1, 1);
  }
  // Planeta enorme arriba: bandas, terminador tramado y borde iluminado (sin la firma del artista).
  c.save(); c.beginPath(); c.arc(135, -40, 96, 0, Math.PI * 2); c.clip();
  rect(c, KZ.n4, 0, 0, W, 60);
  for (let y = -10; y < 60; y += 8) rect(c, KZ.n5, 0, y, W, 2);
  degradeTramado(c, 'rgba(0,0,0,0)', KZ.n3, 150, 0, 90, 60);
  c.restore();
  c.strokeStyle = '#7fd8c4'; c.lineWidth = 1; c.beginPath(); c.arc(135, -40, 96, 0.14 * Math.PI, 0.5 * Math.PI); c.stroke();
  // Ciudad lejana (Warped City 2 recoloreada) y bruma tramada encima para dar profundidad.
  for (let x = 0; x < W; x += img.back.width) c.drawImage(img.back, x, 70);
  // Edificios laterales, el toldo morado con flecos, el letrero rosado y el toldo azul.
  edificio(c, 0, 72, 30, f, 11, 'derecha');
  edificio(c, 220, 50, 92, f, 4, 'izquierda');
  c.drawImage(img[`banner-b${1 + (Math.floor(f / 6) % 4)}`], 2, 130);
  c.fillStyle = 'rgba(255,79,163,0.10)'; c.fillRect(0, 124, 30, 60);
  poli(c, '#7a1f5c', [[0, 166], [72, 194], [72, 204], [0, 204]]);
  poli(c, KZ.rosa2, [[0, 166], [72, 194], [72, 198], [0, 172]]);
  for (let x = 0; x < 72; x += 6) poli(c, KZ.rosa, [[x, 203 - (72 - x) * 0.0], [x + 4, 203], [x + 2, 207]]);
  rect(c, '#24508f', 212, 112, 58, 10); rect(c, '#3f7fe0', 212, 112, 58, 2); for (let x = 214; x < 270; x += 6) rect(c, '#2d5fb8', x, 122, 3, 3);
  c.drawImage(img[`banner-e${1 + (Math.floor(f / 6) % 4)}`], 240, 180);
  c.fillStyle = 'rgba(255,79,163,0.10)'; c.fillRect(236, 176, 34, 56);
  // Cables colgando entre los edificios y la torre.
  cable(c, 0, 110, 62, 96, 14, '#0a1820'); cable(c, 0, 150, 62, 140, 10, '#0a1820'); cable(c, 216, 100, 270, 118, 12, '#0a1820');
  // El edificio de la valla: techo con aires acondicionados y antenas, columnas con plantas y la pantalla en la fachada.
  rect(c, KZ.n2, 54, 50, 166, 12); rect(c, KZ.n3, 54, 50, 166, 2); rect(c, KZ.mentaClara, 60, 61, 154, 1);
  for (const x of [62, 96, 170]) { rect(c, KZ.n3, x, 38, 22, 12); rect(c, KZ.n1, x + 2, 40, 18, 8); rect(c, Math.floor(f / 4) % 2 ? KZ.n5 : KZ.n4, x + 7, 42, 8, 4); rect(c, '#3fae9a', x, 38, 22, 1); }
  rect(c, KZ.n3, 136, 18, 2, 32); rect(c, KZ.n3, 128, 26, 18, 2); if (Math.floor(f / 15) % 2) rect(c, KZ.rosa, 136, 16, 2, 2);
  degradeTramado(c, KZ.n2, KZ.n0, 62, 62, 16, 256); degradeTramado(c, KZ.n2, KZ.n0, 216, 62, 6, 256);
  rect(c, '#3fae9a', 77, 62, 1, 256); rect(c, '#3fae9a', 216, 62, 1, 256);
  for (const y of [120, 200, 270]) { rect(c, KZ.n3, 60, y, 20, 3); planta(c, 69, y - 1, 9, f, y); }
  const bloque = [...BLOQUES].reverse().find((b) => seg >= t(b.desde));
  pintarValla(c, bloque, seg, f);
  const previo = BLOQUES[BLOQUES.indexOf(bloque) - 1];
  const dt = seg - t(bloque.desde);
  if (previo && dt < 0.4) {
    const corte = Math.floor((dt / 0.4) * 12) / 12;
    const yc = VY + Math.floor(VH * corte);
    c.save(); c.beginPath(); c.rect(VX, yc, VW, VY + VH - yc); c.clip(); pintarValla(c, previo, seg, f); c.restore();
    rect(c, KZ.mentaClara, VX, yc, VW, 1);
  }
  // Paneles de la valla (3 × 4), finos como los del pin: la pantalla no queda encerrada en un marco.
  c.fillStyle = 'rgba(7,18,26,0.6)';
  for (let i = 1; i < 3; i++) c.fillRect(VX + Math.round((VW / 3) * i), VY, 1, VH);
  for (let j = 1; j < 4; j++) c.fillRect(VX, VY + Math.round((VH / 4) * j), VW, 1);
  // Carro volador rosado que cruza delante del edificio, con su estela de luz.
  const ciclo = (seg % 9) / 9;
  const cxCarro = Math.round(W + 30 - ciclo * (W + 80));
  c.fillStyle = 'rgba(255,79,163,0.18)'; c.fillRect(cxCarro + 32, 250, 24, 2);
  camino(c, KZ.rosa2, (k) => { k.moveTo(cxCarro, 254); k.quadraticCurveTo(cxCarro + 2, 244, cxCarro + 12, 243); k.lineTo(cxCarro + 26, 243); k.quadraticCurveTo(cxCarro + 33, 246, cxCarro + 32, 254); });
  rect(c, KZ.rosa, cxCarro + 6, 243, 20, 2); rect(c, KZ.n0, cxCarro + 10, 247, 12, 3); rect(c, '#3fae9a', cxCarro + 11, 247, 4, 1);
  rect(c, KZ.mentaClara, cxCarro, 251, 3, 2); rect(c, KZ.ambar, cxCarro + 29, 251, 3, 2);
  // Dron con cono de luz en «pedirle permiso».
  if (seg > t(31.5) && seg < t(35.5)) {
    const dx = Math.round(-50 + (seg - t(31.5)) * 80);
    c.fillStyle = 'rgba(94,242,200,0.12)'; c.beginPath(); c.moveTo(dx + 20, 172); c.lineTo(dx - 4, 330); c.lineTo(dx + 50, 330); c.fill();
    c.drawImage(img[`drone-${1 + (Math.floor(f / 3) % 4)}`], dx, 150);
  }
  // Base del edificio con borde iluminado y una jardinera a la derecha.
  rect(c, KZ.n0, 0, 318, W, 16); rect(c, KZ.n3, 0, 318, W, 1); rect(c, '#3fae9a', 54, 318, 166, 1);
  rect(c, '#2f4a55', 192, 306, 36, 14); rect(c, '#4f7380', 192, 306, 36, 2); planta(c, 202, 306, 12, f, 3); planta(c, 218, 306, 10, f, 7);
  // Piso: baldosas en perspectiva, degradado tramado hacia el frente y charcos que reflejan la valla y el neón.
  degradeTramado(c, KZ.n2, KZ.n0, 0, 334, W, 146);
  c.strokeStyle = 'rgba(31,77,90,0.8)'; c.lineWidth = 1;
  for (let i = -8; i <= 8; i++) { c.beginPath(); c.moveTo(135 + i * 14, 334); c.lineTo(135 + i * 46, 480); c.stroke(); }
  for (const y of [344, 358, 376, 400, 430, 466]) rect(c, 'rgba(31,77,90,0.8)', 0, y, W, 1);
  c.strokeStyle = '#07121a'; c.beginPath(); c.moveTo(40, 470); c.lineTo(52, 452); c.lineTo(49, 444); c.lineTo(60, 430); c.stroke();
  poli(c, 'rgba(94,242,200,0.10)', [[VX, 334], [VX + VW, 334], [250, 480], [20, 480]]);
  for (const [px, py, rx, ry] of [[150, 348, 26, 4], [60, 398, 18, 3], [210, 446, 22, 4]]) {
    c.fillStyle = '#0e2c33'; c.beginPath(); c.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2); c.fill();
    const brillo = Math.floor(f / 12 + px) % 3;
    rect(c, '#5ef2c8', px - rx * 0.5 + brillo, py - 1, rx * 0.7, 1); rect(c, 'rgba(255,79,163,0.7)', px + rx * 0.3, py, 4, 1);
  }
  // Objetos con volumen: caja con tapa, banquito, caja de pizza, dos tanques y un cajón de madera con tablas.
  rect(c, '#2a434d', 0, 330, 44, 34); rect(c, '#4a6a76', 0, 330, 44, 4); rect(c, '#1a2c34', 32, 334, 12, 30); rect(c, '#3fae9a', 0, 330, 44, 1); tramado(c, '#1a2c34', 26, 334, 6, 30, 0);
  rect(c, '#3e5a64', 62, 360, 20, 26); tramado(c, '#2a434d', 74, 362, 8, 24, 1); c.fillStyle = '#6d929c'; c.beginPath(); c.ellipse(72, 360, 10, 3, 0, 0, Math.PI * 2); c.fill(); rect(c, KZ.n0, 62, 384, 20, 3);
  poli(c, '#8a5530', [[200, 400], [248, 394], [256, 406], [208, 414]]); poli(c, '#b07440', [[200, 400], [248, 394], [250, 398], [202, 404]]); c.fillStyle = '#d4a868'; c.beginPath(); c.ellipse(228, 404, 7, 2, 0, 0, Math.PI * 2); c.fill();
  for (const dy of [0, 12]) { rect(c, '#55697a', 58, 424 + dy, 46, 10); rect(c, '#8aa2ae', 58, 424 + dy, 46, 2); tramado(c, '#3a4a58', 58, 430 + dy, 46, 4, 0); c.fillStyle = '#3a4a58'; c.beginPath(); c.ellipse(104, 429 + dy, 3, 5, 0, 0, Math.PI * 2); c.fill(); }
  poli(c, '#5e371d', [[110, 440], [210, 432], [218, 480], [104, 480]]);
  for (let k = 0; k < 4; k++) { const yk = 446 + k * 9; c.strokeStyle = '#43260f'; c.beginPath(); c.moveTo(108 - k * 1.5, yk); c.lineTo(212 + k * 1.5, yk - 7 + k * 0.5); c.stroke(); }
  poli(c, '#8a5530', [[110, 440], [210, 432], [211, 437], [111, 445]]); rect(c, '#3fae9a', 112, 440, 96, 1);
  rect(c, KZ.ambar, 150, 452, 22, 10); rect(c, KZ.n0, 154, 455, 14, 4);
  // La figura, grande y al centro, como en el pin.
  const pose = seg > t(34.53) && seg < t(37.0) ? 'bosteza' : (seg > t(5.74) && seg < t(7.2)) || (seg > t(44.14) && seg < t(45.5)) ? 'gira' : 'quieta';
  figura(c, 110, 288, pose, f);
  // Lluvia en dos planos: líneas de 1 px que bajan a velocidad fija, y salpicaduras en el piso.
  for (let i = 0; i < 90; i++) {
    const cerca = i % 3 === 0;
    const x = Math.floor((azar(i + 500) * (W + 60) - ((f * (cerca ? 3 : 2)) % (W + 60)) * 0.3 + W + 60) % (W + 60)) - 30;
    const y = Math.floor((azar(i + 900) * H + f * (cerca ? 9 : 6)) % H);
    c.fillStyle = cerca ? 'rgba(196,255,240,0.30)' : 'rgba(120,180,190,0.22)';
    c.fillRect(x, y, 1, cerca ? 4 : 3);
  }
  for (let i = 0; i < 6; i++) { const k = Math.floor(f / 4) + i * 13; const sx = Math.floor(azar(k) * W), sy = 340 + Math.floor(azar(k + 1) * 130); rect(c, 'rgba(196,255,240,0.5)', sx - 1, sy, 1, 1); rect(c, 'rgba(196,255,240,0.5)', sx + 1, sy, 1, 1); }
  if (GOLPES.some((g) => Math.abs(seg - t(g)) < 0.5 / FPS)) { c.globalCompositeOperation = 'difference'; c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over'; }
};

// Subtítulo moderno (no pixel), sin caja, sobre la terraza oscura: cada palabra dicha, la actual en menta.
const FRASES = (() => {
  const out = []; let actual = [];
  for (const p of palabras) { actual.push({ ...p, t: p.t === '20' ? 'veinte' : p.t }); if (/[.?,:]$/.test(p.t) && actual.length >= 3) { out.push(actual); actual = []; } }
  if (actual.length) out.push(actual);
  return out;
})();

const Subtitulo = ({ seg }) => {
  const s = seg * VEL;
  const i = FRASES.findIndex((fr, k) => s < (FRASES[k + 1]?.[0].i ?? 99) - 0.05);
  const frase = FRASES[i < 0 ? FRASES.length - 1 : i];
  if (s < frase[0].i - 0.2) return null;
  return (
    <div style={{ position: 'absolute', left: 80, right: 80, top: 1436, textAlign: 'center', ...fuente({ familia: 'Inter', peso: 600 }), fontSize: 46, lineHeight: 1.3, color: PAL.crema, textShadow: '0 3px 0 #0b0410, 0 0 2px #0b0410' }}>
      {frase.map((p, k) => <span key={k} style={{ color: s >= p.i && s < p.f + 0.12 ? PAL.menta : s >= p.i ? PAL.crema : 'rgba(244,239,230,0.35)' }}>{p.t} </span>)}
    </div>
  );
};

export const CiudadValla = ({ desde = 0 }) => {
  useFuentes();
  const f = useCurrentFrame() + desde;
  const img = useImagenes();
  const ref = useRef(null);
  useLayoutEffect(() => { if (img && ref.current) pintar(ref.current.getContext('2d'), img, f); }, [img, f]);
  const seg = f / FPS;
  const plano = [...PLANOS].reverse().find((p) => seg >= t(p.desde));
  let encuadre;
  if (plano.zoom > 1) {
    const k = plano.zoom, mitadW = W / (2 * k), mitadH = H / (2 * k);
    const cx = Math.min(W - mitadW, Math.max(mitadW, plano.c[0])), cy = Math.min(H - mitadH, Math.max(mitadH, plano.c[1]));
    encuadre = `translate(${Math.round(540 - cx * ESC * k)}px, ${Math.round(960 - cy * ESC * k)}px) scale(${k})`;
  }
  // Un destello suave de dos cuadros en cada corte de plano.
  const destello = PLANOS.some((p) => p.desde > 0 && seg >= t(p.desde) && seg < t(p.desde) + 2 / FPS);
  return (
    <AbsoluteFill style={{ background: PAL.negro }}>
      <canvas ref={ref} width={W} height={H} style={{ width: W * ESC, height: H * ESC, imageRendering: 'pixelated', transformOrigin: '0 0', transform: encuadre }} />
      {destello ? <AbsoluteFill style={{ background: 'rgba(196,255,240,0.25)' }} /> : null}
      <Subtitulo seg={f / FPS} />
      <Audio src={staticFile('n01/mezcla-v2.wav')} startFrom={desde} />
    </AbsoluteFill>
  );
};
