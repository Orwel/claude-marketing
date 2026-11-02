import React, { useEffect, useRef, useState } from 'react';
import { AbsoluteFill, Audio, Img, Sequence, continueRender, delayRender, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { useFuentes } from '../fuentes.js';

/**
 * «Zoom infinito» · la historia de Juan David pantalla adentro (jd-website, v2 del 2-nov-2026).
 * Una sola toma: la cámara entra por una ventana de una ciudad pixel y cada época vive dentro de una pantalla de la
 * anterior: web de 2008 → foro de 2010 → HTML a los 16 → personero 2012 → Derecho 2013 → Trifuerza 2020 →
 * desarrollador 2022 → y la vista previa del teléfono es otra vez la ciudad: el video cierra en bucle.
 * El hilo (su esencia): siempre ha construido lugares para la gente; cada época es otra manera de hacerlo.
 *
 * Cómo funciona el zoom sin cortes: cada nivel declara un `objetivo` (rectángulo donde vive el nivel siguiente).
 * El hijo se pinta dentro de ese rectángulo, escalado para que su cuadro de 1080×1920 quepa justo a lo alto. La
 * cámara crece en escala exponencial alrededor de un pivote fijo calculado para que, al llegar a Zfin, el cuadro del
 * hijo llene la pantalla; en ese cuadro se cambia la raíz al hijo con zoom 1 y la imagen es idéntica.
 * La ciudad (zoom ×300) se pinta en canvas: a esa escala el DOM rasteriza mal y el canvas mantiene el pixel nítido.
 *
 * Zona segura de Instagram (Reels): arriba 0–250 lo tapa la interfaz, abajo desde ~1500 el texto y los botones, a la
 * derecha ~140 px los íconos. Por eso cada escena deja libre la franja de arriba para el rótulo (270–460) y pone lo
 * importante entre 480 y 1500.
 *
 * Material del banco (trabajo/assets): ciudad de Bongseng (licencia propia, uso comercial), Tiny Swords de Pixel Frog,
 * Justitia de Marcantonio Raimondi (Rijksmuseum, dominio público), sello de lacre de 1846 (Wikimedia Commons, dominio
 * público), papel Paper004 de ambientCG (CC0), música «8 bit lofi - Ice Cave» de TAD (CC0), whoosh de pyranostudios
 * (CC0), teclas de Cassie-OrbitGames (CC0), glitch de Packsmithy (CC BY 4.0: crédito «Packsmithy (packsmithy.com)»),
 * clic de Kenney (CC0).
 */

const W = 1080, H = 1920, FPS = 30;
const NARANJA = '#F26B1D';
const ART = 1.6; // la ciudad está pintada a 675×1200 y se amplía ×1,6
const VENTANA = { x: 325 * ART, y: 288 * ART, w: 8 * ART, h: 4 * ART };

// Tiempos en cuadros. Cada nivel: quieto (deriva lenta) hasta `quieto`, zambullida hasta `fin`.
// `revela`: el contenido del hijo aparece cuando el objetivo mide entre `desde` y `hasta` px en pantalla (antes se
// ve lo que el padre pinta ahí: la ventana encendida, el sello, la puerta del castillo).
const NIVELES = [
  { id: 'ciudad', ini: 0, quieto: 78, fin: 112, fondo: '#0b1426', objetivo: { ...VENTANA, revela: [40, 300] } },
  { id: 'web2008', ini: 112, quieto: 165, fin: 190, fondo: '#000033', objetivo: { x: 250, y: 1330, w: 580, h: 320, r: 6 } },
  { id: 'foro', ini: 190, quieto: 250, fin: 276, fondo: '#dfe3e8', objetivo: { x: 640, y: 1290, w: 360, h: 240, r: 4 } },
  { id: 'codigo', ini: 276, quieto: 325, fin: 348, fondo: '#050805' }, // objetivo: el cursor, se calcula abajo
  { id: 'personero', ini: 348, quieto: 410, fin: 436, fondo: '#22433a', objetivo: { x: 450, y: 1150, w: 180, h: 180, revela: [260, 800] } },
  { id: 'derecho', ini: 436, quieto: 498, fin: 524, fondo: '#efe6d2', objetivo: { x: 390, y: 1180, w: 300, h: 300, r: '50%', revela: [380, 1000] } },
  { id: 'trifuerza', ini: 524, quieto: 590, fin: 616, fondo: '#47aba9', objetivo: { x: 504, y: 920, w: 66, h: 56, r: '30px 30px 0 0', revela: [90, 500] } },
  { id: 'dev', ini: 616, quieto: 676, fin: 702, fondo: '#13141c', objetivo: { x: 640, y: 830, w: 330, h: 586.7, r: 26 } },
  { id: 'ciudadFin', ini: 702, quieto: 99999, fin: 99999, fondo: '#0b1426' },
];
export const DURACION_ZOOM = 810;

// El cursor del código: su posición sale de la métrica de la fuente monoespaciada (ancho = 0,6 em).
const COD = { x: 80, y: 540, tam: 44, linea: 70 };
const LINEAS = ['<html>', '<head>', '  <title>Intercolegiados</title>', '</head>', '<body>', '  <h1>Hola, mundo</h1>', '  <p>Hecho por Juan David, 16 años</p>', '</body>', '</html>'];
const ULT = LINEAS.length - 1;
NIVELES[3].objetivo = { x: COD.x + LINEAS[ULT].length * COD.tam * 0.6 + 4, y: COD.y + ULT * COD.linea + 6, w: COD.tam * 0.6, h: COD.tam * 1.12 };

const suave = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lim = (x) => Math.min(1, Math.max(0, x));
const tramo = (f, a, b) => lim((f - a) / (b - a));

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
  if (!n.objetivo) return 1 + 0.08 * suave(lim((f - n.ini) / 100));
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

// --- Ciudad (primer y último nivel) ----------------------------------------------------------------------------
function Ciudad({ cam, ini, final }) {
  const f = useCurrentFrame() - ini;
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
    const g = f + ini; // el cielo sigue el reloj global: al volver a la ciudad, sigue donde iba
    base(-Math.floor(g / 6) % 675, 0); ctx.drawImage(cielo, 0, 0); ctx.drawImage(cielo, 675, 0);
    base(); ctx.drawImage(edif, 0, 0);
    // El reflejo tiembla un pixel cada pocos cuadros: el agua viva.
    base(Math.floor(g / 5) % 2, 0); ctx.drawImage(reflejo, 0, 0);
    base(); ctx.drawImage(frente, 0, 0);
    // La ventana se enciende en naranja (el acento de juanda) y parpadea dos veces. Al final se vuelve a encender
    // justo antes de cortar: el video empieza otra vez y la historia queda en bucle.
    const o = VENTANA;
    const t0 = final ? 92 : 34;
    const on = f > t0 && !(f >= t0 + 6 && f < t0 + 9) && !(f >= t0 + 13 && f < t0 + 15);
    // A ×300 la ventana ya la cubre el nivel siguiente; dejar de pintarla evita un borde naranja por precisión.
    if (on && o.h * cam.Z < 900) { base(); ctx.fillStyle = NARANJA; ctx.fillRect(o.x / ART, o.y / ART, o.w / ART, o.h / ART); }
  });
  return <canvas ref={ref} width={W} height={H} style={{ position: 'absolute', inset: 0 }} />;
}

// --- 2008 · la primera web (recreación genérica, sin marcas) ---------------------------------------------------
function Web2008() {
  const f = useCurrentFrame() - NIVELES[1].ini;
  const visitas = String(137 + Math.floor(lim(f / 50) * 9)).padStart(6, '0');
  const marquee = 1080 - ((f * 9) % 1900);
  const cl = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
  const cursor = { x: interpolate(f, [0, 42], [880, 600], cl), y: interpolate(f, [0, 42], [1700, 1500], cl) };
  const clic = f >= 45 && f < 51;
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(#ffffff 1.5px, transparent 2px) 0 0/60px 60px, radial-gradient(#8888ff 1px, transparent 1.5px) 30px 30px/60px 60px, #000033', fontFamily: '"Times New Roman", serif', color: '#ffff66' }}>
      <div style={{ position: 'absolute', top: 480, width: '100%', textAlign: 'center', fontFamily: '"Comic Sans MS", cursive', fontSize: 80, fontWeight: 700, lineHeight: 1.05, background: 'linear-gradient(90deg,#ff0000,#ffa500,#ffff00,#00ff00,#00bfff,#ff00ff)', WebkitBackgroundClip: 'text', color: 'transparent', filter: 'drop-shadow(5px 5px 0 #000)' }}>
        Bienvenidos a<br />mi página web
      </div>
      <div style={{ position: 'absolute', top: 680, left: 0, width: '100%', height: 64, background: '#000080', borderTop: '3px solid #c0c0c0', borderBottom: '3px solid #c0c0c0', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: marquee, top: 6, whiteSpace: 'nowrap', fontSize: 42, color: '#00ff00', fontFamily: 'Arial' }}>★ ¡Actualizada hoy! ★ Fírmame el libro de visitas ★ Pasa a mi foro ★</div>
      </div>
      <div style={{ position: 'absolute', top: 780, left: 80, fontSize: 42, lineHeight: 1.65, color: '#66ccff', textDecoration: 'underline' }}>
        <div>» Inicio</div><div>» Mis fotos</div><div>» Mis juegos</div><div>» Libro de visitas</div>
      </div>
      <div style={{ position: 'absolute', top: 800, left: 540, width: 400, padding: 18, background: '#c0c0c0', border: '4px outset #fff', color: '#000', fontFamily: 'Verdana', fontSize: 28, textAlign: 'center' }}>
        Eres el visitante n.º
        <div style={{ marginTop: 10, background: '#000', color: '#ff2020', fontFamily: '"Courier New", monospace', fontSize: 58, letterSpacing: 8, padding: '6px 0' }}>{visitas}</div>
      </div>
      <div style={{ position: 'absolute', top: 1100, left: 80, width: 860, height: 48, background: 'repeating-linear-gradient(45deg,#ffd700 0 40px,#111 40px 80px)', border: '3px solid #000' }} />
      <div style={{ position: 'absolute', top: 1162, width: 1020, textAlign: 'center', fontSize: 38, color: '#fff', fontFamily: 'Arial', fontWeight: 700, opacity: Math.floor(f / 8) % 2 ? 1 : 0.15 }}>EN CONSTRUCCIÓN</div>
      <div style={{ position: 'absolute', top: 1240, width: 1020, textAlign: 'center', fontSize: 46, fontFamily: '"Comic Sans MS"', color: '#ff66ff' }}>¡¡ENTRA A MI FORO!! <span style={{ color: '#ffff00', opacity: Math.floor(f / 6) % 2 ? 1 : 0 }}>NEW!</span></div>
      {/* El marco del objetivo: el foro se ve vivo por dentro (lo pinta el nivel siguiente). */}
      <div style={{ position: 'absolute', left: 242, top: 1322, width: 596, height: 336, border: '8px ridge #c0c0c0', boxSizing: 'border-box' }} />
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

// --- 2010 · el foro (datos verificados en el guion jd-website) -------------------------------------------------
function Foro() {
  const f = useCurrentFrame() - NIVELES[2].ini;
  const mensajes = Math.round(41399 * suave(lim(f / 50)));
  const fila = (a, b, c) => (
    <div style={{ display: 'flex', borderBottom: '2px solid #c7cdd6', padding: '16px 24px', fontSize: 32, background: '#f4f6f9' }}>
      <div style={{ flex: 1, color: '#12416b', fontWeight: 700 }}>{a}</div><div style={{ width: 160, textAlign: 'right' }}>{b}</div><div style={{ width: 210, textAlign: 'right', color: '#556' }}>{c}</div>
    </div>
  );
  return (
    <AbsoluteFill style={{ background: '#dfe3e8', fontFamily: 'Verdana, sans-serif', color: '#222' }}>
      <div style={{ height: 180, marginTop: 480, background: 'linear-gradient(#2a6aa3,#0d3254)', color: '#fff', padding: '34px 60px 0', boxSizing: 'border-box' }}>
        <div style={{ fontSize: 60, fontWeight: 700, letterSpacing: 1 }}>Rol Militar</div>
        <div style={{ fontSize: 28, opacity: 0.85 }}>Foro de rol · Índice · Miembros · Buscar</div>
      </div>
      <div style={{ margin: '30px 50px 0', border: '2px solid #9aa6b5' }}>
        <div style={{ background: '#5d7fa3', color: '#fff', padding: '12px 24px', fontSize: 30, fontWeight: 700 }}>Foros</div>
        {fila('Anuncios', '412', 'temas')}
        {fila('Reglamento y ascensos', '1.920', 'mensajes')}
        {fila('Cuartel general', '18.305', 'mensajes')}
      </div>
      <div style={{ margin: '30px 50px 0', border: '2px solid #9aa6b5', background: '#f4f6f9', padding: '22px 30px', fontSize: 34 }}>
        <div style={{ fontWeight: 700, color: '#12416b', marginBottom: 8 }}>Estadísticas</div>
        Nuestros miembros han publicado <b style={{ fontSize: 54, color: '#c0392b' }}>{mensajes.toLocaleString('es-CO')}</b> mensajes
      </div>
      {/* Tarjeta del autor: Octavio es Juan David. Avatar: el guerrero de Tiny Swords. La firma en HTML es el objetivo. */}
      <div style={{ position: 'absolute', left: 50, top: 1240, width: 980, height: 320, border: '2px solid #9aa6b5', background: '#eef1f5' }}>
        <div style={{ position: 'absolute', left: 24, top: 24, width: 200, height: 200, background: '#47aba9', border: '3px solid #9aa6b5', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: -48, top: -40, width: 288, height: 288, background: `url(${staticFile('ts/guerrero.png')}) ${-Math.floor(f / 4) % 8 * 288}px 0 / ${1536 * 1.5}px 288px`, imageRendering: 'pixelated' }} />
        </div>
        <div style={{ position: 'absolute', left: 24, top: 236, fontSize: 40, fontWeight: 700, color: '#b8860b' }}>Octavio</div>
        <div style={{ position: 'absolute', left: 250, top: 40, fontSize: 28, lineHeight: 1.6 }}>Inscrito:<br />22/06/2010<br />Mensajes:<br />2.877</div>
        <div style={{ position: 'absolute', left: 590, top: 14, fontSize: 24, color: '#556' }}>Firma (HTML)</div>
      </div>
      <Crt fuerza={0.6} />
    </AbsoluteFill>
  );
}

// --- A los 16 · el HTML que se escribe solo (empieza a escribirse cuando todavía es la firma del foro) ----------
function Codigo() {
  const f = useCurrentFrame() - (NIVELES[2].ini + 10);
  const total = LINEAS.join('\n').length;
  const n = Math.floor(lim(f / 120) * total);
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

// --- 2012 · personero: tablero de tiza, conteo de votos y un tarjetón marcado -----------------------------------
function Trazo({ d, p, ancho = 10, color = '#f4f1e6', largo = 400 }) {
  // Trazo que se dibuja solo (dasharray): la tiza o el lapicero avanzan con `p` de 0 a 1.
  return <path d={d} fill="none" stroke={color} strokeWidth={ancho} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={largo} strokeDashoffset={largo * (1 - p)} />;
}
function Personero() {
  const f = useCurrentFrame() - NIVELES[4].ini;
  const tiza = { fontFamily: '"Segoe Print", "Ink Free", cursive', color: '#f4f1e6' };
  // Palitos de conteo: grupos de cinco que aparecen uno por uno, como en el tablero del salón.
  const palitos = [];
  for (let g = 0; g < 4; g++) for (let k = 0; k < 5; k++) {
    const idx = g * 5 + k, p = tramo(f, 4 + idx * 1.6, 7 + idx * 1.6);
    const x0 = 120 + g * 190;
    const d = k < 4 ? `M${x0 + k * 30} 820 L${x0 + k * 30 + 6} 930` : `M${x0 - 14} 900 L${x0 + 118} 845`;
    palitos.push(<Trazo key={idx} d={d} p={p} ancho={9} largo={160} />);
  }
  const marca = tramo(f, 30, 44);
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 40%, #2f5a4c, #1b352d 70%, #12241f)' }}>
      {/* Polvo de tiza: manchas borradas */}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 300px 90px at 30% 30%, rgba(255,255,255,0.07), transparent), radial-gradient(ellipse 380px 120px at 70% 62%, rgba(255,255,255,0.05), transparent)' }} />
      <div style={{ ...tiza, position: 'absolute', top: 500, left: 90, fontSize: 64, fontWeight: 700, transform: 'rotate(-2deg)', opacity: tramo(f, 0, 8) }}>Elección de personero</div>
      <div style={{ ...tiza, position: 'absolute', top: 600, left: 92, fontSize: 46, opacity: tramo(f, 4, 12) }}>Votos:</div>
      <svg style={{ position: 'absolute', inset: 0 }} width={W} height={H}>{palitos}</svg>
      {/* El tarjetón: papel sobre el tablero, con la casilla marcada como objetivo */}
      <div style={{ position: 'absolute', left: 120, top: 1040, width: 840, height: 400, background: '#f7f3ea', boxShadow: '0 18px 40px rgba(0,0,0,0.45)', transform: 'rotate(1.2deg)', fontFamily: 'Arial', color: '#222' }}>
        <div style={{ position: 'absolute', top: 24, width: '100%', textAlign: 'center', fontSize: 32, fontWeight: 700, letterSpacing: 2 }}>TARJETÓN · PERSONERO ESTUDIANTIL</div>
        {[0, 1, 2].map((k) => (
          <div key={k} style={{ position: 'absolute', left: 50 + k * 270, top: 100, width: 200, height: 200, border: '5px solid #222', boxSizing: 'border-box' }}>
            <div style={{ position: 'absolute', bottom: -52, width: '100%', textAlign: 'center', fontSize: 28 }}>{['N.º 1', 'N.º 2', 'En blanco'][k]}</div>
          </div>
        ))}
      </div>
      <svg style={{ position: 'absolute', inset: 0 }} width={W} height={H}>
        <Trazo d="M462 1162 L618 1318" p={tramo(marca, 0, 0.5)} ancho={16} color="#1a2a6c" largo={220} />
        <Trazo d="M618 1162 L462 1318" p={tramo(marca, 0.5, 1)} ancho={16} color="#1a2a6c" largo={220} />
      </svg>
    </AbsoluteFill>
  );
}

// --- 2013 · Derecho: Justitia de Raimondi sobre papel y un sello de lacre que cae ------------------------------
function Derecho() {
  const f = useCurrentFrame() - NIVELES[5].ini;
  const cae = tramo(f, 18, 26);
  const golpe = f >= 26 && f < 30;
  const o = NIVELES[5].objetivo;
  return (
    <AbsoluteFill style={{ background: `url(${staticFile('archivo/papel.jpg')}) 0 0 / 1080px 1080px, #efe6d2` }}>
      <Img src={staticFile('archivo/justitia.jpg')} style={{ position: 'absolute', left: 90, top: 470, width: 900, mixBlendMode: 'multiply', transform: `scale(${1.02 - 0.02 * tramo(f, 0, 40)})` }} />
      {/* El sello cae y golpea: de grande y transparente a su sitio, con una sombra que se aprieta. */}
      <div style={{ position: 'absolute', left: o.x, top: o.y, width: o.w, height: o.h, borderRadius: '50%', overflow: 'hidden', opacity: cae, transform: `scale(${1.8 - 0.8 * cae}) rotate(${-8 + 8 * cae}deg)`, boxShadow: `0 ${20 * (1 - cae) + 6}px ${30 * (1 - cae) + 12}px rgba(60,10,0,${0.25 + 0.3 * cae})` }}>
        <Img src={staticFile('archivo/sello.jpg')} style={{ position: 'absolute', left: -44, top: -38, width: 360, height: 360 }} />
      </div>
      {golpe && <AbsoluteFill style={{ background: 'rgba(120,20,0,0.08)' }} />}
    </AbsoluteFill>
  );
}

// --- 2020 · Trifuerza: el mundo de videojuego que se construye (Tiny Swords, Pixel Frog) ------------------------
const TS = 2; // escala del pixel art de Tiny Swords
function Sprite({ src, x, y, cuadros, tam = 192, vel = 4, f, espejo, op = 1 }) {
  const i = Math.floor(Math.max(0, f) / vel) % cuadros;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: tam * TS, height: tam * TS, overflow: 'hidden', transform: espejo ? 'scaleX(-1)' : undefined, opacity: op }}>
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

function Construye({ src, x, y, ancho, f, desde }) {
  // Cada edificio «se monta»: cae desde arriba a pasos (sin suavizar, como un juego) y rebota un pixel.
  const p = tramo(f, desde, desde + 8);
  if (p <= 0) return null;
  const dy = Math.round((1 - p) * -12) * 8 + (p === 1 && f < desde + 11 ? 4 : 0);
  return <Img src={staticFile(src)} style={{ position: 'absolute', left: x, top: y + dy, width: ancho, imageRendering: 'pixelated' }} />;
}

function Trifuerza() {
  const f = useCurrentFrame() - NIVELES[6].ini;
  return (
    <AbsoluteFill style={{ background: '#47aba9', overflow: 'hidden' }}>
      <Isla x={60} y={700} cols={7} filas={7} />
      <Img src={staticFile('ts/castillo.png')} style={{ position: 'absolute', left: 220, top: 520, width: 320 * TS, imageRendering: 'pixelated' }} />
      <Construye src="ts/torre.png" x={830} y={640} ancho={205} f={f} desde={6} />
      <Construye src="ts/casa1.png" x={100} y={960} ancho={205} f={f} desde={14} />
      <Construye src="ts/casa2.png" x={780} y={1040} ancho={205} f={f} desde={22} />
      <Sprite src="ts/peon.png" x={400} y={1130} cuadros={8} f={f + 3} espejo />
      <Sprite src="ts/guerrero.png" x={120} y={1200} cuadros={8} f={f} />
      <Sprite src="ts/arquero.png" x={620} y={1230} cuadros={6} f={f + 5} />
      <Img src={staticFile('ts/nube1.png')} style={{ position: 'absolute', left: -400 + f * 2, top: 380, width: 576 * TS, imageRendering: 'pixelated', opacity: 0.85 }} />
    </AbsoluteFill>
  );
}

// --- 2022 · desarrollador: editor moderno con la vista previa en un teléfono --------------------------------------
const CODIGO_DEV = [
  ['k', 'export function '], ['f', 'Ciudad'], ['p', '() {'],
  ['n', ''], ['k', '  const '], ['v', 'ventana'], ['p', ' = '], ['f', 'useLuz'], ['p', '('], ['s', "'naranja'"], ['p', ');'],
  ['n', ''], ['k', '  return '], ['p', '<'], ['t', 'Mundo'], ['a', ' gente'], ['p', '={'], ['v', 'todos'], ['p', '} />;'],
  ['n', ''], ['p', '}'],
];
const COLOR = { k: '#c792ea', f: '#82aaff', p: '#bfc7d5', v: '#f78c6c', s: '#c3e88d', t: '#ffcb6b', a: '#89ddff' };
function Dev() {
  const f = useCurrentFrame() - NIVELES[7].ini;
  const total = CODIGO_DEV.reduce((a, [, s]) => a + s.length, 0);
  let quedan = Math.floor(tramo(f, 2, 36) * total);
  const lineas = [[]];
  for (const [t, s] of CODIGO_DEV) {
    if (t === 'n') { lineas.push([]); continue; }
    const parte = s.slice(0, Math.max(0, quedan)); quedan -= s.length;
    if (parte) lineas[lineas.length - 1].push(<span key={lineas.length + s} style={{ color: COLOR[t] }}>{parte}</span>);
  }
  const o = NIVELES[7].objetivo;
  return (
    <AbsoluteFill style={{ background: '#13141c', fontFamily: '"JetBrains Mono", monospace' }}>
      <div style={{ position: 'absolute', top: 480, left: 0, right: 0, height: 64, background: '#1b1d29', display: 'flex', alignItems: 'center', gap: 28, paddingLeft: 40, fontSize: 26, color: '#8a90a6' }}>
        <span style={{ color: '#fff', borderBottom: `3px solid ${NARANJA}`, paddingBottom: 6 }}>Ciudad.jsx</span><span>Foro.jsx</span><span>Web.html</span>
      </div>
      <div style={{ position: 'absolute', top: 580, left: 30, fontSize: 30, lineHeight: '56px', color: '#4b5068', textAlign: 'right', width: 40 }}>
        {lineas.map((_, k) => <div key={k}>{k + 1}</div>)}
      </div>
      <pre style={{ position: 'absolute', top: 580, left: 90, margin: 0, fontFamily: 'inherit', fontSize: 30, lineHeight: '56px', width: 530, whiteSpace: 'pre-wrap' }}>
        {lineas.map((l, k) => <div key={k}>{l}</div>)}
      </pre>
      {/* El teléfono de vista previa: adentro vive otra vez la ciudad del principio. */}
      <div style={{ position: 'absolute', left: o.x - 18, top: o.y - 18, width: o.w + 36, height: o.h + 36, borderRadius: 44, background: '#05060a', boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 2px #2a2d3a' }} />
      <div style={{ position: 'absolute', left: 90, top: 1440, fontSize: 24, color: '#6b7189' }}>vista previa · localhost:3000</div>
    </AbsoluteFill>
  );
}

const ESCENAS = { ciudad: Ciudad, web2008: Web2008, foro: Foro, codigo: Codigo, personero: Personero, derecho: Derecho, trifuerza: Trifuerza, dev: Dev, ciudadFin: Ciudad };

// --- La cámara ---------------------------------------------------------------------------------------------------
function Escena({ i, Z, prof }) {
  const n = NIVELES[i];
  const Comp = ESCENAS[n.id];
  const g = n.objetivo ? geometria(i) : null;
  const P = g ? g.P : { x: W / 2, y: H / 2 };
  const tr = `translate(${P.x * (1 - Z)}px, ${P.y * (1 - Z)}px) scale(${Z})`;
  const hijo = prof > 0 && g && NIVELES[i + 1] ? <Hijo i={i} g={g} prof={prof} Z={Z} /> : null;
  if (Comp === Ciudad) {
    return (
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        <Ciudad cam={{ Z, P }} ini={n.ini} final={n.id === 'ciudadFin'} />
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
  // Con `revela`, lo que pinta el padre (ventana, sello, puerta) se ve hasta que el objetivo crece en pantalla.
  const visible = o.revela ? lim((o.h * Z - o.revela[0]) / (o.revela[1] - o.revela[0])) : 1;
  if (visible <= 0) return null;
  return (
    <div style={{ position: 'absolute', left: o.x, top: o.y, width: o.w, height: o.h, overflow: 'hidden', borderRadius: o.r ?? 0, background: sig.fondo, opacity: visible }}>
      <div style={{ position: 'absolute', left: o.w / 2 - (W * g.s) / 2, top: o.h / 2 - (H * g.s) / 2, width: W, height: H, transform: `scale(${g.s})`, transformOrigin: '0 0' }}>
        <Escena i={i + 1} Z={1} prof={prof - 1} />
      </div>
    </div>
  );
}

// Rótulo moderno arriba (zona segura: debajo de la interfaz de Reels y lejos de los íconos de la derecha). Entra al
// aterrizar y sale antes de la zambullida, porque al acercarse la cámara el contenido sube hasta su zona.
const ROTULOS = [
  { desde: 8, hasta: 72, a: 'Hoy', b: 'Todo empezó con una pantalla encendida' },
  { desde: 118, hasta: 160, a: 'A los 15', b: 'Hice mi primera página web' },
  { desde: 196, hasta: 244, a: '2010', b: 'Un foro me enseñó que una web es gente' },
  { desde: 282, hasta: 320, a: 'A los 16', b: 'Aprendí a escribir el código' },
  { desde: 354, hasta: 404, a: '2012', b: 'Personero: me tocó representar a otros' },
  { desde: 442, hasta: 492, a: '2013', b: 'Estudié Derecho: las reglas del juego' },
  { desde: 530, hasta: 584, a: '2020', b: 'Empecé a construir Trifuerza' },
  { desde: 622, hasta: 670, a: '2022', b: 'Me volví desarrollador de software' },
  { desde: 712, hasta: 800, a: 'Hasta hoy', b: 'Tecnología con base en videojuegos' },
];
function Rotulo({ f }) {
  return ROTULOS.map((r) => {
    const o2 = Math.min(tramo(f, r.desde, r.desde + 6), 1 - tramo(f, r.hasta, r.hasta + 6));
    if (o2 <= 0) return null;
    return (
      <div key={r.a + r.desde} style={{ position: 'absolute', top: 270, left: 70, right: 170, opacity: o2, transform: `translateY(${(1 - tramo(f, r.desde, r.desde + 8)) * -24}px)` }}>
        <div style={{ fontFamily: 'Fraunces', fontStyle: 'italic', fontWeight: 800, fontSize: 110, color: NARANJA, lineHeight: 1, textShadow: '0 4px 30px rgba(0,0,0,0.55)' }}>{r.a}</div>
        <div style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: 42, lineHeight: 1.15, color: '#fff', marginTop: 12, textShadow: '0 2px 18px rgba(0,0,0,0.85)' }}>{r.b}</div>
      </div>
    );
  });
}

function Firma({ f }) {
  // Cierre: la marca dentro de la zona segura de abajo, sobre el agua de la ciudad.
  const p = tramo(f, 730, 748) * (1 - tramo(f, 796, 808));
  if (p <= 0) return null;
  return (
    <div style={{ position: 'absolute', top: 1330, width: '100%', textAlign: 'center', opacity: p, transform: `translateY(${(1 - p) * 30}px)` }}>
      <div style={{ fontFamily: 'Fraunces', fontStyle: 'italic', fontWeight: 700, fontSize: 104, color: '#fff', textShadow: '0 6px 30px rgba(0,0,0,0.6)' }}>trifuerza<span style={{ color: NARANJA }}>.co</span></div>
    </div>
  );
}

export function ZoomWeb({ zonaSegura = false }) {
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
        <AbsoluteFill key={k} style={{ opacity: 0.3 * vel }}><Escena i={i} Z={Z * k} prof={1} /></AbsoluteFill>
      ))}
      <AbsoluteFill style={{ opacity: vel > 0.25 ? 1 - 0.28 * vel : 1 }}><Escena i={i} Z={Z} prof={2} /></AbsoluteFill>
      {destello && <AbsoluteFill style={{ background: '#fff', opacity: 0.5 }} />}
      <Rotulo f={f} />
      <Firma f={f} />
      {zonaSegura && (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 250, background: 'rgba(255,0,0,0.25)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 420, background: 'rgba(255,0,0,0.25)' }} />
          <div style={{ position: 'absolute', top: 250, bottom: 420, right: 0, width: 140, background: 'rgba(255,0,0,0.25)' }} />
        </AbsoluteFill>
      )}
      <Audio src={staticFile('audio/musica.mp3')} volume={(fr) => interpolate(fr, [0, 20, DURACION_ZOOM - 40, DURACION_ZOOM], [0, 0.55, 0.55, 0])} />
      <Audio src={staticFile('audio/ciudad.mp3')} volume={(fr) => interpolate(fr, [0, 10, 90, 112], [0, 0.35, 0.35, 0], { extrapolateRight: 'clamp' })} />
      <Sequence from={NIVELES[8].ini}><Audio src={staticFile('audio/ciudad.mp3')} volume={(fr) => interpolate(fr, [0, 20], [0, 0.3], { extrapolateRight: 'clamp' })} /></Sequence>
      {NIVELES.filter((m) => m.objetivo).map((m, k) => (
        <Sequence key={m.id} from={m.quieto - 4} durationInFrames={30}>
          <Audio src={staticFile('audio/whoosh.wav')} startFrom={Math.round((k % 5) * 1.05 * FPS)} volume={2.2} />
        </Sequence>
      ))}
      <Sequence from={NIVELES[1].ini + 45} durationInFrames={10}><Audio src={staticFile('audio/click.ogg')} volume={0.9} /></Sequence>
      <Sequence from={NIVELES[2].fin - 2} durationInFrames={14}><Audio src={staticFile('audio/glitch.wav')} volume={0.5} /></Sequence>
      {Array.from({ length: 14 }, (_, k) => (
        <Sequence key={k} from={NIVELES[3].ini + 2 + k * 3} durationInFrames={8}><Audio src={staticFile(k % 2 ? 'audio/tecla1.wav' : 'audio/tecla2.wav')} volume={0.5} /></Sequence>
      ))}
      {Array.from({ length: 12 }, (_, k) => (
        <Sequence key={`d${k}`} from={NIVELES[7].ini + 3 + k * 3} durationInFrames={8}><Audio src={staticFile(k % 2 ? 'audio/tecla1.wav' : 'audio/tecla2.wav')} volume={0.35} /></Sequence>
      ))}
      <Sequence from={NIVELES[5].ini + 26} durationInFrames={20}><Audio src={staticFile('audio/sello.ogg')} volume={0.9} /></Sequence>
    </AbsoluteFill>
  );
}
