import React, { useEffect, useRef, useState } from 'react';
import { AbsoluteFill, Audio, Img, Sequence, continueRender, delayRender, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { useFuentes } from '../fuentes.js';

/**
 * Prueba de estilo «Zoom infinito» para jd-website («Hice mi primera web a los 15»).
 * Una sola toma: la cámara entra por una ventana de una ciudad pixel y cada pantalla contiene la siguiente época
 * (web de 2008 → foro de 2010 → código HTML → el mundo de videojuego de Trifuerza). El «whoosh» es la zambullida.
 *
 * Cómo funciona el zoom sin cortes: cada nivel declara un `objetivo` (rectángulo donde vive el nivel siguiente).
 * El hijo se pinta dentro de ese rectángulo, escalado para que su cuadro de 1080×1920 quepa justo a lo alto. La
 * cámara crece en escala exponencial alrededor de un pivote fijo calculado para que, al llegar a Zfin, el cuadro del
 * hijo llene la pantalla; en ese cuadro se cambia la raíz al hijo con zoom 1 y la imagen es idéntica.
 * La ciudad (zoom ×300) se pinta en canvas: a esa escala el DOM rasteriza mal y el canvas mantiene el pixel nítido.
 *
 * Material del banco (trabajo/assets): ciudad de Bongseng (licencia propia, uso comercial), Tiny Swords de Pixel Frog,
 * música «8 bit lofi - Ice Cave» de TAD (CC0), whoosh de pyranostudios (CC0), teclas de Cassie-OrbitGames (CC0),
 * glitch de Packsmithy (CC BY 4.0: crédito «Packsmithy (packsmithy.com)»), clic de Kenney (CC0).
 */

const W = 1080, H = 1920, FPS = 30;
const NARANJA = '#F26B1D';
const ART = 1.6; // la ciudad está pintada a 675×1200 y se amplía ×1,6

// Tiempos en cuadros. Cada nivel: quieto (deriva lenta) hasta `quieto`, zambullida hasta `fin`.
const NIVELES = [
  { id: 'ciudad', ini: 0, quieto: 78, fin: 112, fondo: '#0b1426', objetivo: { x: 325 * ART, y: 288 * ART, w: 8 * ART, h: 4 * ART }, canvas: true },
  { id: 'web2008', ini: 112, quieto: 170, fin: 196, fondo: '#000033', objetivo: { x: 220, y: 1350, w: 640, h: 360, r: 6 } },
  { id: 'foro', ini: 196, quieto: 262, fin: 288, fondo: '#dfe3e8', objetivo: { x: 640, y: 1250, w: 360, h: 240, r: 4 } },
  { id: 'codigo', ini: 288, quieto: 345, fin: 368, fondo: '#050805', objetivo: { x: 0, y: 0, w: 0, h: 0 } }, // se calcula abajo
  { id: 'mundo', ini: 368, quieto: 9999, fin: 9999, fondo: '#47aba9' },
];
export const DURACION_ZOOM = 450;

// El cursor del código: su posición sale de la métrica de la fuente monoespaciada (ancho = 0,6 em).
const COD = { x: 90, y: 520, tam: 46, linea: 72 };
const LINEAS = ['<html>', '<head>', '  <title>Intercolegiados</title>', '</head>', '<body>', '  <h1>Hola, mundo</h1>', '  <p>Hecho por Juan David, 16 años</p>', '</body>', '</html>'];
const ULT = LINEAS.length - 1;
NIVELES[3].objetivo = { x: COD.x + LINEAS[ULT].length * COD.tam * 0.6 + 4, y: COD.y + ULT * COD.linea + 6, w: COD.tam * 0.6, h: COD.tam * 1.12 };

const suave = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lim = (x) => Math.min(1, Math.max(0, x));

function geometria(i) {
  const o = NIVELES[i].objetivo;
  const hb = Math.min(o.h, o.w / (W / H)); // alto del cuadro del hijo dentro del objetivo
  const zfin = H / hb;
  const c = { x: o.x + o.w / 2, y: o.y + o.h / 2 };
  // Pivote fijo P: pantalla = P + Z·(p − P). Con Z = zfin, el centro del objetivo cae en el centro de la pantalla.
  const P = { x: (W / 2 - zfin * c.x) / (1 - zfin), y: (H / 2 - zfin * c.y) / (1 - zfin) };
  return { hb, zfin, c, P, s: hb / H };
}

/** Zoom del nivel i en el cuadro f: deriva lenta mientras se cuenta, zambullida suave (entra y aterriza). */
function zoomDe(i, f) {
  const n = NIVELES[i];
  if (!n.objetivo) return 1 + 0.06 * lim((f - n.ini) / 60);
  const { zfin } = geometria(i);
  const deriva = Math.log(1.1);
  if (f < n.quieto) return Math.exp(deriva * lim((f - n.ini) / (n.quieto - n.ini)));
  const e = suave(lim((f - n.quieto) / (n.fin - n.quieto)));
  return Math.exp(deriva + e * (Math.log(zfin) - deriva));
}

const nivelEn = (f) => NIVELES.findIndex((n) => f < n.fin);

// --- Carga de imágenes para canvas -------------------------------------------------------------------------------
const cache = new Map();
function useImagenes(rutas) {
  const [listas, setListas] = useState(() => rutas.every((r) => cache.get(r)?.complete));
  const [h] = useState(() => (listas ? null : delayRender('imagenes zoom')));
  useEffect(() => {
    if (listas) return;
    Promise.all(rutas.map((r) => new Promise((ok, mal) => {
      if (cache.get(r)?.complete) return ok();
      const im = new Image();
      im.onload = ok; im.onerror = mal; im.src = staticFile(r);
      cache.set(r, im);
    }))).then(() => { setListas(true); continueRender(h); });
  }, []);
  return listas ? rutas.map((r) => cache.get(r)) : null;
}

// --- Nivel 0 · la ciudad ----------------------------------------------------------------------------------------
function Ciudad({ cam }) {
  const f = useCurrentFrame();
  const ref = useRef(null);
  const ims = useImagenes(['ciudad/cielo.png', 'ciudad/edificios.png', 'ciudad/reflejo.png', 'ciudad/frente.png']);
  useEffect(() => {
    if (!ims || !ref.current) return;
    const ctx = ref.current.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b1426'; ctx.fillRect(0, 0, W, H);
    const k = cam.Z * ART;
    const base = (dx = 0, dy = 0) => ctx.setTransform(k, 0, 0, k, cam.P.x * (1 - cam.Z) + dx * k, cam.P.y * (1 - cam.Z) + dy * k);
    const [cielo, edif, reflejo, frente] = ims;
    // Las nubes avanzan a pasos de pixel de arte (sin interpolar): así se mueve el pixel art del tablero.
    base(-Math.floor(f / 6) % 675, 0); ctx.drawImage(cielo, 0, 0); ctx.drawImage(cielo, 675, 0);
    base(); ctx.drawImage(edif, 0, 0);
    // El reflejo tiembla un pixel cada pocos cuadros: el agua viva.
    base(Math.floor(f / 5) % 2, 0); ctx.drawImage(reflejo, 0, 0);
    base(); ctx.drawImage(frente, 0, 0);
    // La ventana se enciende en naranja (el acento de juanda) y parpadea dos veces antes de prenderse del todo.
    const o = NIVELES[0].objetivo;
    const on = f > 34 && !(f >= 40 && f < 43) && !(f >= 47 && f < 49);
    // Cuando la ventana ya llena media pantalla la cubre el nivel siguiente; dejar de pintarla evita que, por la
    // precisión del navegador a ×300, asome un borde naranja alrededor.
    if (on && o.h * cam.Z < 900) { base(); ctx.fillStyle = NARANJA; ctx.fillRect(o.x / ART, o.y / ART, o.w / ART, o.h / ART); }
  });
  return <canvas ref={ref} width={W} height={H} style={{ position: 'absolute', inset: 0 }} />;
}

// --- Nivel 1 · la web de 2008 (recreación genérica, sin marcas) -------------------------------------------------
function Web2008() {
  const f = useCurrentFrame() - NIVELES[1].ini;
  const visitas = String(137 + Math.floor(lim(f / 50) * 9)).padStart(6, '0');
  const marquee = 1080 - ((f * 9) % 1900);
  const cursor = { x: interpolate(f, [0, 45], [900, 600], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), y: interpolate(f, [0, 45], [1850, 1560], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) };
  const clic = f >= 48 && f < 54;
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(#ffffff 1.5px, transparent 2px) 0 0/60px 60px, radial-gradient(#8888ff 1px, transparent 1.5px) 30px 30px/60px 60px, #000033', fontFamily: '"Times New Roman", serif', color: '#ffff66' }}>
      <div style={{ position: 'absolute', top: 380, width: '100%', textAlign: 'center', fontFamily: '"Comic Sans MS", cursive', fontSize: 88, fontWeight: 700, lineHeight: 1.05, background: 'linear-gradient(90deg,#ff0000,#ffa500,#ffff00,#00ff00,#00bfff,#ff00ff)', WebkitBackgroundClip: 'text', color: 'transparent', filter: 'drop-shadow(5px 5px 0 #000)' }}>
        Bienvenidos a<br />mi página web
      </div>
      <div style={{ position: 'absolute', top: 600, left: 0, width: '100%', height: 70, background: '#000080', borderTop: '3px solid #c0c0c0', borderBottom: '3px solid #c0c0c0', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: marquee, top: 8, whiteSpace: 'nowrap', fontSize: 44, color: '#00ff00', fontFamily: 'Arial' }}>★ ¡Actualizada hoy! ★ Fírmame el libro de visitas ★ Pasa a mi foro ★</div>
      </div>
      <div style={{ position: 'absolute', top: 720, left: 80, fontSize: 46, lineHeight: 1.7, color: '#66ccff', textDecoration: 'underline' }}>
        <div>» Inicio</div><div>» Mis fotos</div><div>» Mis juegos</div><div>» Libro de visitas</div>
      </div>
      <div style={{ position: 'absolute', top: 740, left: 560, width: 440, padding: 20, background: '#c0c0c0', border: '4px outset #fff', color: '#000', fontFamily: 'Verdana', fontSize: 30, textAlign: 'center' }}>
        Eres el visitante n.º
        <div style={{ marginTop: 12, background: '#000', color: '#ff2020', fontFamily: '"Courier New", monospace', fontSize: 64, letterSpacing: 8, padding: '6px 0' }}>{visitas}</div>
      </div>
      <div style={{ position: 'absolute', top: 1090, left: 80, width: 920, height: 56, background: 'repeating-linear-gradient(45deg,#ffd700 0 40px,#111 40px 80px)', border: '3px solid #000' }} />
      <div style={{ position: 'absolute', top: 1160, width: '100%', textAlign: 'center', fontSize: 42, color: '#fff', fontFamily: 'Arial', fontWeight: 700, opacity: Math.floor(f / 8) % 2 ? 1 : 0.15 }}>EN CONSTRUCCIÓN</div>
      <div style={{ position: 'absolute', top: 1250, width: '100%', textAlign: 'center', fontSize: 50, fontFamily: '"Comic Sans MS"', color: '#ff66ff' }}>¡¡ENTRA A MI FORO!! <span style={{ color: '#ffff00', opacity: Math.floor(f / 6) % 2 ? 1 : 0 }}>NEW!</span></div>
      {/* El marco del objetivo: el foro se ve vivo por dentro (lo pinta el nivel siguiente). */}
      <div style={{ position: 'absolute', left: 212, top: 1342, width: 656, height: 376, border: '8px ridge #c0c0c0', boxSizing: 'border-box' }} />
      <div style={{ position: 'absolute', top: 1760, width: '100%', textAlign: 'center', fontSize: 30, color: '#aaaaaa', fontFamily: 'Arial' }}>Mejor visto en 800×600 · Hecho por Juan David</div>
      <Cursor x={cursor.x} y={cursor.y} clic={clic} />
      <Crt />
    </AbsoluteFill>
  );
}

function Cursor({ x, y, clic }) {
  // Flecha clásica dibujada con un polígono; al hacer clic se hunde un pixel.
  return (
    <svg style={{ position: 'absolute', left: x, top: y + (clic ? 3 : 0) }} width="56" height="84" viewBox="0 0 14 21" shapeRendering="crispEdges">
      <path d="M0 0 L0 17 L4 13 L7 20 L9 19 L6 12 L11 12 Z" fill="#fff" stroke="#000" strokeWidth="1" />
    </svg>
  );
}

function Crt({ fuerza = 1 }) {
  return (
    <>
      <AbsoluteFill style={{ background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0 3px, transparent 3px 6px)', opacity: fuerza, pointerEvents: 'none' }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)', opacity: fuerza }} />
    </>
  );
}

// --- Nivel 2 · el foro de 2010 (datos verificados en el guion jd-website) --------------------------------------
function Foro() {
  const f = useCurrentFrame() - NIVELES[2].ini;
  const mensajes = Math.round(41399 * suave(lim(f / 52)));
  const fila = (a, b, c) => (
    <div style={{ display: 'flex', borderBottom: '2px solid #c7cdd6', padding: '18px 24px', fontSize: 34, background: '#f4f6f9' }}>
      <div style={{ flex: 1, color: '#12416b', fontWeight: 700 }}>{a}</div><div style={{ width: 170, textAlign: 'right' }}>{b}</div><div style={{ width: 230, textAlign: 'right', color: '#556' }}>{c}</div>
    </div>
  );
  return (
    <AbsoluteFill style={{ background: '#dfe3e8', fontFamily: 'Verdana, sans-serif', color: '#222' }}>
      <div style={{ height: 200, marginTop: 360, background: 'linear-gradient(#2a6aa3,#0d3254)', color: '#fff', padding: '40px 60px 0', boxSizing: 'border-box' }}>
        <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: 1 }}>Rol Militar</div>
        <div style={{ fontSize: 30, opacity: 0.85 }}>Foro de rol · Índice · Miembros · Buscar</div>
      </div>
      <div style={{ margin: '40px 50px 0', border: '2px solid #9aa6b5' }}>
        <div style={{ background: '#5d7fa3', color: '#fff', padding: '14px 24px', fontSize: 32, fontWeight: 700 }}>Foros</div>
        {fila('Anuncios', '412', 'temas')}
        {fila('Reglamento y ascensos', '1.920', 'mensajes')}
        {fila('Cuartel general', '18.305', 'mensajes')}
      </div>
      <div style={{ margin: '40px 50px 0', border: '2px solid #9aa6b5', background: '#f4f6f9', padding: '26px 30px', fontSize: 36 }}>
        <div style={{ fontWeight: 700, color: '#12416b', marginBottom: 10 }}>Estadísticas</div>
        Nuestros miembros han publicado <b style={{ fontSize: 56, color: '#c0392b' }}>{mensajes.toLocaleString('es-CO')}</b> mensajes
      </div>
      {/* Tarjeta del autor: Octavio es Juan David. El avatar (objetivo del zoom) es el guerrero de Tiny Swords. */}
      <div style={{ position: 'absolute', left: 50, top: 1200, width: 980, height: 320, border: '2px solid #9aa6b5', background: '#eef1f5' }}>
        <div style={{ position: 'absolute', left: 24, top: 24, width: 200, height: 200, background: '#47aba9', border: '3px solid #9aa6b5', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: -48, top: -40, width: 288, height: 288, background: `url(${staticFile('ts/guerrero.png')}) 0 0 / ${1536 * 1.5}px 288px`, imageRendering: 'pixelated' }} />
        </div>
        <div style={{ position: 'absolute', left: 24, top: 236, fontSize: 40, fontWeight: 700, color: '#b8860b' }}>Octavio</div>
        <div style={{ position: 'absolute', left: 250, top: 40, fontSize: 28, lineHeight: 1.6 }}>Inscrito:<br />22/06/2010<br />Mensajes:<br />2.877</div>
        <div style={{ position: 'absolute', left: 590, top: 14, fontSize: 24, color: '#556' }}>Firma (HTML)</div>
      </div>
      <div style={{ position: 'absolute', left: 50, top: 1560, width: 980, fontSize: 30, color: '#556', lineHeight: 1.5 }}>
        <b>Último anuncio</b> · por Octavio<br />«Cierre temporal del foro» · 3 de mayo de 2021
      </div>
      <Crt fuerza={0.6} />
    </AbsoluteFill>
  );
}

// --- Nivel 3 · el HTML que se escribe solo ----------------------------------------------------------------------
function Codigo() {
  // Se escribe desde que se ve como firma del foro: así la vista previa ya está viva.
  const f = useCurrentFrame() - (NIVELES[2].ini + 10);
  const total = LINEAS.join('\n').length;
  const n = Math.floor(lim(f / 125) * total);
  const texto = LINEAS.join('\n').slice(0, n);
  const o = NIVELES[3].objetivo;
  return (
    <AbsoluteFill style={{ background: '#050805' }}>
      <pre style={{ position: 'absolute', left: COD.x, top: COD.y, margin: 0, fontFamily: '"JetBrains Mono", monospace', fontSize: COD.tam, lineHeight: `${COD.linea}px`, color: '#39ff6e', textShadow: '0 0 14px rgba(57,255,110,0.6)' }}>{texto}</pre>
      {n >= total && <div style={{ position: 'absolute', left: o.x, top: o.y, width: o.w, height: o.h, background: '#39ff6e', boxShadow: '0 0 24px #39ff6e' }} />}
      <Crt fuerza={0.8} />
    </AbsoluteFill>
  );
}

// --- Nivel 4 · el mundo de videojuego (Tiny Swords, Pixel Frog) -------------------------------------------------
const TS = 2; // escala del pixel art de Tiny Swords
function Sprite({ src, x, y, cuadros, tam = 192, vel = 4, f, espejo }) {
  const i = Math.floor(f / vel) % cuadros;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: tam * TS, height: tam * TS, overflow: 'hidden', transform: espejo ? 'scaleX(-1)' : undefined }}>
      <Img src={staticFile(src)} style={{ position: 'absolute', left: -i * tam * TS, top: 0, height: tam * TS, imageRendering: 'pixelated' }} />
    </div>
  );
}

function Isla({ x, y, cols, filas }) {
  // Isla con el 9-slice de pasto plano del tilemap (bloque 3×3 de 64 px arriba a la izquierda).
  const t = 64, k = t * TS, celdas = [];
  for (let r = 0; r < filas; r++) for (let c = 0; c < cols; c++) {
    const sx = c === 0 ? 0 : c === cols - 1 ? 2 : 1, sy = r === 0 ? 0 : r === filas - 1 ? 2 : 1;
    celdas.push(
      <div key={`${r}-${c}`} style={{ position: 'absolute', left: x + c * k, top: y + r * k, width: k, height: k, background: `url(${staticFile('ts/tilemap.png')}) ${-sx * k}px ${-sy * k}px / ${576 * TS}px ${384 * TS}px`, imageRendering: 'pixelated' }} />
    );
  }
  return <>{celdas}</>;
}

function Mundo() {
  const f = useCurrentFrame() - NIVELES[4].ini;
  const titulo = lim((f - 26) / 14);
  return (
    <AbsoluteFill style={{ background: '#47aba9', overflow: 'hidden' }}>
      <Isla x={60} y={560} cols={7} filas={8} />
      <Img src={staticFile('ts/castillo.png')} style={{ position: 'absolute', left: 220, top: 380, width: 320 * TS, imageRendering: 'pixelated' }} />
      <Img src={staticFile('ts/torre.png')} style={{ position: 'absolute', left: 820, top: 520, width: 128 * TS * 0.8, imageRendering: 'pixelated' }} />
      <Img src={staticFile('ts/casa1.png')} style={{ position: 'absolute', left: 100, top: 820, width: 128 * TS * 0.8, imageRendering: 'pixelated' }} />
      <Img src={staticFile('ts/casa2.png')} style={{ position: 'absolute', left: 760, top: 900, width: 128 * TS * 0.8, imageRendering: 'pixelated' }} />
      <Sprite src="ts/guerrero.png" x={300} y={1060} cuadros={8} f={f} />
      <Sprite src="ts/peon.png" x={560} y={1150} cuadros={8} f={f + 3} espejo />
      <Sprite src="ts/arquero.png" x={120} y={1250} cuadros={6} f={f + 5} />
      <Sprite src="ts/guerrero-corre.png" x={-200 + f * 7} y={1380} cuadros={6} f={f} vel={3} />
      <Img src={staticFile('ts/nube1.png')} style={{ position: 'absolute', left: -300 + f * 2, top: 120, width: 576 * TS, imageRendering: 'pixelated', opacity: 0.9 }} />
      <Img src={staticFile('ts/nube2.png')} style={{ position: 'absolute', left: 500 - f * 1.5, top: 1500, width: 576 * TS, imageRendering: 'pixelated', opacity: 0.85 }} />
      <div style={{ position: 'absolute', bottom: 170, width: '100%', textAlign: 'center', opacity: titulo, transform: `translateY(${(1 - titulo) * 40}px)` }}>
        <div style={{ fontFamily: 'Fraunces', fontStyle: 'italic', fontWeight: 700, fontSize: 132, color: '#fff', textShadow: '0 6px 0 #1d3557' }}>trifuerza<span style={{ color: NARANJA }}>.co</span></div>
      </div>
    </AbsoluteFill>
  );
}

const ESCENAS = { ciudad: Ciudad, web2008: Web2008, foro: Foro, codigo: Codigo, mundo: Mundo };

// --- La cámara ---------------------------------------------------------------------------------------------------
function Escena({ i, Z, prof }) {
  const n = NIVELES[i];
  const Comp = ESCENAS[n.id];
  const g = n.objetivo ? geometria(i) : null;
  const P = g ? g.P : { x: W / 2, y: H / 2 };
  const tr = `translate(${P.x * (1 - Z)}px, ${P.y * (1 - Z)}px) scale(${Z})`;
  const hijo = prof > 0 && g && NIVELES[i + 1] ? <Hijo i={i} g={g} prof={prof} Z={Z} /> : null;
  if (n.canvas) {
    return (
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        <Comp cam={{ Z, P }} />
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transform: tr, transformOrigin: '0 0' }}>{hijo}</div>
      </AbsoluteFill>
    );
  }
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transform: tr, transformOrigin: '0 0', background: n.fondo, overflow: 'visible' }}>
      <Comp />
      {hijo}
    </div>
  );
}

function Hijo({ i, g, prof, Z }) {
  const o = NIVELES[i].objetivo;
  const sig = NIVELES[i + 1];
  // Lo que se ve del hijo aparece cuando su ventana ya mide algo en pantalla; antes, la ventana es solo luz.
  const tam = o.h * Z;
  const visible = i === 0 ? lim((tam - 40) / 260) : 1;
  return (
    <div style={{ position: 'absolute', left: o.x, top: o.y, width: o.w, height: o.h, overflow: 'hidden', borderRadius: o.r ?? 0, background: sig.fondo }}>
      <div style={{ position: 'absolute', left: o.w / 2 - (W * g.s) / 2, top: o.h / 2 - (H * g.s) / 2, width: W, height: H, transform: `scale(${g.s})`, transformOrigin: '0 0', opacity: visible }}>
        <Escena i={i + 1} Z={1} prof={prof - 1} />
      </div>
      {i === 0 && <div style={{ position: 'absolute', inset: 0, background: NARANJA, opacity: 1 - visible }} />}
    </div>
  );
}

function Rotulo({ f }) {
  // Rótulo moderno arriba, fuera del mundo: edad o año de cada pantalla. Entra al aterrizar y sale antes de la
  // zambullida, porque al acercarse la cámara el contenido sube hasta su zona.
  const R = [
    { desde: 10, hasta: 100, a: 'Hoy, 2026', b: 'una ventana encendida' },
    { desde: 118, hasta: 160, a: 'A los 15', b: 'mi primera web' },
    { desde: 202, hasta: 240, a: '2010', b: 'el foro que administré once años' },
    { desde: 294, hasta: 340, a: 'A los 16', b: 'HTML de verdad' },
    { desde: 372, hasta: 450, a: 'Hoy', b: 'tecnología con base en videojuegos' },
  ];
  return R.map((r) => {
    const op = lim((f - r.desde) / 6) * lim((r.hasta - f) / 6);
    if (op <= 0) return null;
    return (
      <div key={r.a + r.desde} style={{ position: 'absolute', top: 150, left: 70, right: 70, opacity: op, transform: `translateY(${(1 - lim((f - r.desde) / 8)) * -24}px)` }}>
        <div style={{ fontFamily: 'Fraunces', fontStyle: 'italic', fontWeight: 800, fontSize: 118, color: NARANJA, lineHeight: 1, textShadow: '0 4px 30px rgba(0,0,0,0.55)' }}>{r.a}</div>
        <div style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: 44, color: '#fff', marginTop: 10, textShadow: '0 2px 18px rgba(0,0,0,0.8)' }}>{r.b}</div>
      </div>
    );
  });
}

export function ZoomWeb() {
  useFuentes();
  const f = useCurrentFrame();
  const i = Math.max(0, nivelEn(f));
  const Z = zoomDe(i, f);
  // Estela de la zambullida: dos copias un poco atrás en el zoom, más visibles cuanto más rápido va la cámara.
  const n = NIVELES[i];
  const vel = n.objetivo && f >= n.quieto ? Math.sin(Math.PI * lim((f - n.quieto) / (n.fin - n.quieto))) : 0;
  const destello = NIVELES.slice(1).some((m) => f >= m.ini && f < m.ini + 2);
  return (
    <AbsoluteFill style={{ background: '#000', overflow: 'hidden' }}>
      {vel > 0.25 && [0.86, 0.93].map((k) => (
        <AbsoluteFill key={k} style={{ opacity: 0.35 * vel }}><Escena i={i} Z={Z * k} prof={1} /></AbsoluteFill>
      ))}
      <AbsoluteFill style={{ opacity: vel > 0.25 ? 1 - 0.3 * vel : 1 }}><Escena i={i} Z={Z} prof={2} /></AbsoluteFill>
      {destello && <AbsoluteFill style={{ background: '#fff', opacity: 0.55 }} />}
      <Rotulo f={f} />
      <Audio src={staticFile('audio/musica.mp3')} volume={(fr) => interpolate(fr, [0, 20, DURACION_ZOOM - 30, DURACION_ZOOM], [0, 0.55, 0.55, 0])} />
      <Audio src={staticFile('audio/ciudad.mp3')} volume={(fr) => interpolate(fr, [0, 10, 90, 112], [0, 0.35, 0.35, 0], { extrapolateRight: 'clamp' })} />
      {NIVELES.filter((m) => m.objetivo).map((m, k) => (
        <Sequence key={m.id} from={m.quieto - 4} durationInFrames={30}>
          <Audio src={staticFile('audio/whoosh.wav')} startFrom={Math.round(k * 1.05 * FPS) % 150} volume={2.2} />
        </Sequence>
      ))}
      <Sequence from={NIVELES[1].ini + 48} durationInFrames={10}><Audio src={staticFile('audio/click.ogg')} volume={0.9} /></Sequence>
      <Sequence from={NIVELES[2].fin - 2} durationInFrames={14}><Audio src={staticFile('audio/glitch.wav')} volume={0.5} /></Sequence>
      {Array.from({ length: 16 }, (_, k) => (
        <Sequence key={k} from={NIVELES[3].ini + 2 + k * 3} durationInFrames={8}><Audio src={staticFile(k % 2 ? 'audio/tecla1.wav' : 'audio/tecla2.wav')} volume={0.5} /></Sequence>
      ))}
    </AbsoluteFill>
  );
}
