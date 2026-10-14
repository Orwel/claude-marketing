import React, { useMemo } from 'react';
import { AbsoluteFill, random, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { useMarca } from '../marca.js';
import { conAlfa } from '../util.js';
import { fuentePixel, IconoPixel, MarcoPixel, PIXEL, sombraPixel } from './Pixel.jsx';

/**
 * Efectos de videojuego por tema (SOFA, oct-2026): lo que pasa en pantalla
 * depende de lo que dice el personaje. Juan David: "puños de videojuegos,
 * animaciones efx, saltando en plataformas, volando... capaz de adaptarse a cada
 * persona y su tema sin cosas raras".
 *
 * Dos familias:
 *  - CAPAS (aqui): se dibujan encima del video sin moverlo. Tipos: puño, pow,
 *    plataformas, mapa, turnos, nivelUp, escudo, monedas, dinero, kagune, humo,
 *    combo, vidaMenos, bits, lluvia, luciernagas, polvo, niebla, brasas.
 *  - MOVIMIENTO del video (en Arcade.jsx, `movimientoDe`): salto, dobleSalto,
 *    teletransporte, clones, respawn, golpeado, temblor, crecer (titan).
 */
const escalonado = (a, pasos = 4) => Math.round(Math.min(1, Math.max(0, a)) * pasos) / pasos;
const centroDe = (f) => (f.centro ? { x: f.centro.x * 1080, y: f.centro.y * 1920 } : { x: f.lado === 'izquierda' ? 300 : f.lado === 'derecha' ? 780 : 540, y: 620 });

/** Puño pixel que entra desde el lado contrario y golpea, con "POW!" y estrellitas. */
const Puno = ({ f }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { x, y } = centroDe(f);
  const desdeDerecha = x < 540;
  const a = spring({ frame, fps, config: { damping: 9, stiffness: 320, mass: 0.9 } });
  const impacto = frame >= 6 && frame < 16;
  const fuera = Math.min(1, Math.max(0, (frame - (durationInFrames - 6)) / 6));
  const arte = ['..kkkkkk..', '.kssssssk.', 'kssSssSssk', 'kssssssssk', 'kssSssSssk', 'ksssssssk.', '.ksssssk..', '..kkkkk...'];
  const pal = { k: '#2A1A12', s: '#E4B894', S: '#C8966A' };
  const px = 14;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity: 1 - fuera }}>
      <div style={{ position: 'absolute', left: x - 70 + (desdeDerecha ? 1 : -1) * (1 - a) * 700, top: y - 60, transform: `rotate(${desdeDerecha ? 10 : -10}deg) scaleX(${desdeDerecha ? -1 : 1})` }}>
        {arte.flatMap((fila, j) => [...fila].map((c, i) => (pal[c] ? <div key={`${i}${j}`} style={{ position: 'absolute', left: i * px, top: j * px, width: px + 0.5, height: px + 0.5, background: pal[c] }} /> : null)))}
      </div>
      {impacto ? (
        <>
          <div style={{ position: 'absolute', left: x - 120, top: y - 140, width: 240, height: 240, background: f.color ?? PIXEL.oro, clipPath: 'polygon(50% 0, 62% 34%, 100% 38%, 72% 60%, 82% 100%, 50% 76%, 18% 100%, 28% 60%, 0 38%, 38% 34%)', transform: `scale(${1 + (frame - 6) * 0.12}) rotate(${(frame - 6) * 7}deg)`, opacity: 1 - (frame - 6) / 10 }} />
          <div style={{ position: 'absolute', left: x - 90, top: y - 50, ...fuentePixel(54), color: '#F4EFE6', textShadow: sombraPixel(PIXEL.vida, 6), transform: `rotate(-8deg) scale(${1 + (frame - 6) * 0.05})` }}>{f.texto ?? 'POW!'}</div>
        </>
      ) : null}
    </AbsoluteFill>
  );
};

/** Plataformas pixel que aparecen escalonadas (el personaje "las usaria" para subir). */
const Plataformas = ({ f }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { x } = centroDe(f);
  const fuera = Math.min(1, Math.max(0, (frame - (durationInFrames - 8)) / 8));
  const bloques = [[x - 260, 1080], [x - 60, 940], [x + 150, 800], [x + 320, 660]];
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity: 1 - fuera }}>
      {bloques.map(([bx, by], i) => {
        const a = escalonado(spring({ frame: frame - i * 5, fps, config: { damping: 12, stiffness: 260 } }), 5);
        return (
          <div key={i} style={{ position: 'absolute', left: bx, top: by + (1 - a) * 60, opacity: a, display: 'flex' }}>
            {[0, 1, 2].map((k) => <div key={k} style={{ width: 54, height: 44, background: k === 1 ? '#8B5A2B' : '#A8703A', border: '4px solid #3A2210', boxSizing: 'border-box', boxShadow: 'inset 0 10px 0 #58D35A' }} />)}
          </div>
        );
      })}
      {/* Un "?" bloque arriba del todo, que rebota. */}
      <div style={{ position: 'absolute', left: x + 380, top: 520 + Math.abs(Math.sin(frame / 5)) * -10, width: 60, height: 60, background: PIXEL.oro, border: '5px solid #7A5A14', boxSizing: 'border-box', ...fuentePixel(28), color: '#7A5A14', display: 'grid', placeItems: 'center', opacity: frame > 20 ? 1 : 0 }}>?</div>
    </AbsoluteFill>
  );
};

/** Minimapa pixel en la esquina con "ESTÁS AQUÍ" parpadeando y una ruta que se dibuja. */
const Mapa = ({ f }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const marca = useMarca();
  const a = escalonado(spring({ frame, fps, config: { damping: 14, stiffness: 220 } }), 5);
  const fuera = Math.min(1, Math.max(0, (frame - (durationInFrames - 8)) / 8));
  const celdas = useMemo(() => Array.from({ length: 12 * 10 }, (_, i) => (random(`m${i}`) > 0.72 ? '#3F9D4A' : random(`n${i}`) > 0.8 ? '#5BC0F8' : '#E9D8A6')), []);
  const ruta = [[1, 8], [3, 7], [5, 7], [6, 5], [8, 4], [10, 2]];
  const n = Math.min(ruta.length, Math.floor(frame / 6));
  const lado = f.lado === 'izquierda' ? { right: 50 } : { left: 50 };
  return (
    <div style={{ position: 'absolute', top: 430, ...lado, opacity: Math.min(1, a * 1.5) * (1 - fuera), transform: `scale(${0.7 + 0.3 * a})` }}>
      <MarcoPixel ancho={330} alto={320} fondo="rgba(8,13,26,.92)" borde="#F4EFE6" interior={conAlfa(marca.colores.acento, 0.6)} relleno={16}>
        <div style={{ ...fuentePixel(13), color: marca.colores.tenue, marginBottom: 8 }}>MAPA · CORFERIAS</div>
        <div style={{ position: 'relative', width: 288, height: 240, display: 'grid', gridTemplateColumns: 'repeat(12, 24px)' }}>
          {celdas.map((c, i) => <div key={i} style={{ width: 24, height: 24, background: c, boxSizing: 'border-box', border: '1px solid rgba(0,0,0,.15)' }} />)}
          <svg width={288} height={240} style={{ position: 'absolute', inset: 0 }}>
            <polyline points={ruta.slice(0, n).map(([cx, cy]) => `${cx * 24 + 12},${cy * 24 + 12}`).join(' ')} fill="none" stroke={PIXEL.vida} strokeWidth={5} strokeDasharray="8 6" />
          </svg>
          <div style={{ position: 'absolute', left: ruta[0][0] * 24 - 4, top: ruta[0][1] * 24 - 4, width: 32, height: 32, background: PIXEL.vida, border: '4px solid #FFF', opacity: Math.floor(frame / 8) % 2 ? 0.3 : 1 }} />
          <div style={{ position: 'absolute', left: ruta[0][0] * 24 - 30, top: ruta[0][1] * 24 + 30, ...fuentePixel(11), color: '#FFF', textShadow: sombraPixel('#000', 2), whiteSpace: 'nowrap' }}>ESTÁS AQUÍ</div>
          <div style={{ position: 'absolute', left: ruta.at(-1)[0] * 24, top: ruta.at(-1)[1] * 24, opacity: n >= ruta.length ? 1 : 0.3 }}><IconoPixel nombre="estrella" tamano={26} /></div>
        </div>
      </MarcoPixel>
    </div>
  );
};

/** Menu de combate por turnos (ATACAR / MAGIA / OBJETO / HUIR) con cursor que baja y elige. */
const Turnos = ({ f }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const marca = useMarca();
  const a = escalonado(spring({ frame, fps, config: { damping: 14, stiffness: 220 } }), 5);
  const fuera = Math.min(1, Math.max(0, (frame - (durationInFrames - 8)) / 8));
  const opciones = f.opciones ?? ['ATACAR', 'MAGIA', 'OBJETO', 'HUIR'];
  const sel = Math.min(opciones.length - 1, Math.floor(Math.max(0, frame - 10) / 9));
  const elegido = frame > 10 + opciones.length * 9 + 6;
  const lado = f.lado === 'izquierda' ? { right: 50 } : { left: 50 };
  return (
    <div style={{ position: 'absolute', top: 440, ...lado, opacity: Math.min(1, a * 1.5) * (1 - fuera), transform: `translateY(${(1 - a) * 20}px)` }}>
      <MarcoPixel ancho={360} alto={70 + opciones.length * 50} fondo="rgba(8,13,26,.94)" borde="#F4EFE6" interior={conAlfa(marca.colores.acento, 0.6)} relleno={18}>
        <div style={{ ...fuentePixel(13), color: marca.colores.tenue, marginBottom: 10 }}>TURNO DE PLAYER 2</div>
        {opciones.map((o, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, height: 50, ...fuentePixel(20), color: i === sel ? (elegido ? PIXEL.oro : '#F4EFE6') : '#A7ADBA' }}>
            <span style={{ width: 24, opacity: i === sel ? (Math.floor(frame / 6) % 2 ? 0.3 : 1) : 0 }}>▶</span>
            <span style={{ transform: elegido && i === sel ? `scale(${1 + 0.06 * Math.sin(frame / 3)})` : undefined }}>{o}</span>
          </div>
        ))}
      </MarcoPixel>
    </div>
  );
};

/** Banner LEVEL UP con barras que suben y destellos. */
const NivelUp = ({ f }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const marca = useMarca();
  const a = spring({ frame, fps, config: { damping: 9, stiffness: 260, mass: 0.8 } });
  const fuera = Math.min(1, Math.max(0, (frame - (durationInFrames - 7)) / 7));
  const stats = f.stats ?? [['FUERZA', 0.6, 0.9], ['DEFENSA', 0.5, 0.75], ['SUERTE', 0.3, 0.7]];
  return (
    <div style={{ position: 'absolute', left: 90, width: 900, top: 460, opacity: 1 - fuera, transform: `scale(${0.6 + 0.4 * Math.min(1, a)}) rotate(${(1 - Math.min(1, a)) * -6}deg)` }}>
      <div style={{ textAlign: 'center', ...fuentePixel(52), color: PIXEL.oro, textShadow: sombraPixel(marca.colores.acento, 6) }}>{f.texto ?? 'LEVEL UP!'}</div>
      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
        {stats.map(([n, de, hasta], i) => {
          const p = Math.min(1, Math.max(0, (frame - 10 - i * 5) / 16));
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ ...fuentePixel(14), color: '#F4EFE6', width: 110, textShadow: sombraPixel('#000', 2) }}>{n}</span>
              <div style={{ width: 340, height: 20, background: 'rgba(8,13,26,.85)', border: '3px solid #F4EFE6' }}><div style={{ width: `${(de + (hasta - de) * p) * 100}%`, height: '100%', background: PIXEL.xp }} /></div>
              <span style={{ ...fuentePixel(14), color: PIXEL.xp, opacity: p }}>+{Math.round((hasta - de) * 100)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Escudo hexagonal que parpadea alrededor de la persona (Halo, defensa). */
const Escudo = ({ f }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { x, y } = centroDe(f);
  const vida = Math.min(1, frame / 6) * Math.min(1, (durationInFrames - frame) / 8);
  const color = f.color ?? '#5BC0F8';
  const hex = useMemo(() => { const h = []; for (let r = 0; r < 7; r++) for (let c = 0; c < 6; c++) h.push({ x: c * 110 + (r % 2) * 55, y: r * 96, d: random(`h${r}${c}`) }); return h; }, []);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity: 0.8 * vida, mixBlendMode: 'screen' }}>
      <div style={{ position: 'absolute', left: x - 330, top: y - 400, width: 660, height: 760, maskImage: 'radial-gradient(ellipse 50% 50% at 50% 50%, black 40%, transparent 72%)', WebkitMaskImage: 'radial-gradient(ellipse 50% 50% at 50% 50%, black 40%, transparent 72%)' }}>
        {hex.map((h, i) => <div key={i} style={{ position: 'absolute', left: h.x, top: h.y, width: 100, height: 100, clipPath: 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0 50%)', border: `3px solid ${color}`, boxSizing: 'border-box', background: conAlfa(color, 0.1 + 0.25 * (0.5 + 0.5 * Math.sin(frame / 5 + h.d * 10))) }} />)}
      </div>
    </AbsoluteFill>
  );
};

/** Combo: contador que sube "x2 x3 x4" al lado, con sacudida. */
const Combo = ({ f }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { x, y } = centroDe(f);
  const n = Math.min(f.max ?? 5, 1 + Math.floor(frame / 8));
  const golpe = (frame % 8) < 3 ? 1.25 : 1;
  const fuera = Math.min(1, Math.max(0, (frame - (durationInFrames - 6)) / 6));
  return (
    <div style={{ position: 'absolute', left: x + 160, top: y - 240, opacity: 1 - fuera, transform: `scale(${golpe}) rotate(6deg)`, ...fuentePixel(60), color: PIXEL.oro, textShadow: sombraPixel(PIXEL.vida, 6) }}>x{n}<div style={{ ...fuentePixel(18), color: '#F4EFE6', textShadow: sombraPixel('#000', 3) }}>COMBO</div></div>
  );
};

/** Barra de vida que baja a golpes (daño) o sube (cura). */
const Vida = ({ f }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { x, y } = centroDe(f);
  const a = escalonado(spring({ frame, fps, config: { damping: 14, stiffness: 220 } }), 4);
  const fuera = Math.min(1, Math.max(0, (frame - (durationInFrames - 6)) / 6));
  const baja = f.modo !== 'cura';
  const p = Math.min(1, Math.max(0, (frame - 8) / 24));
  const valor = baja ? 1 - 0.7 * p : 0.3 + 0.7 * p;
  const tiembla = baja && frame > 8 && frame < 32 ? Math.sin(frame * 2.5) * 4 : 0;
  return (
    <div style={{ position: 'absolute', left: x - 170 + tiembla, top: y - 300, opacity: a * (1 - fuera) }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}><IconoPixel nombre="corazon" tamano={28} /><span style={{ ...fuentePixel(14), color: '#F4EFE6', textShadow: sombraPixel('#000', 2) }}>HP</span></div>
      <div style={{ width: 340, height: 26, background: 'rgba(8,13,26,.85)', border: '4px solid #F4EFE6' }}><div style={{ width: `${valor * 100}%`, height: '100%', background: valor < 0.4 ? PIXEL.vida : PIXEL.xp }} /></div>
      {frame > 8 && frame < 40 ? <div style={{ position: 'absolute', right: -40, top: -50 - (frame - 8) * 2, ...fuentePixel(30), color: baja ? PIXEL.vida : PIXEL.xp, textShadow: sombraPixel('#000', 3), opacity: 1 - (frame - 8) / 32 }}>{baja ? '-70' : '+70'}</div> : null}
    </div>
  );
};

/** Particulas de ambiente de un mundo (lluvia, bits, luciernagas, polvo, niebla, brasas, monedas). */
const Ambiente = ({ f }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const vida = Math.min(1, frame / 8) * Math.min(1, (durationInFrames - frame) / 10);
  const n = f.cantidad ?? 40;
  const ps = useMemo(() => Array.from({ length: n }, (_, i) => ({ x: random(`px${i}`), y: random(`py${i}`), v: 0.4 + random(`pv${i}`), s: 6 + random(`ps${i}`) * 10, d: random(`pd${i}`) })), [n]);
  const tipo = f.tipo;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity: vida }}>
      {ps.map((p, i) => {
        let x = p.x * 1080, y = p.y * 1920, w = p.s, h = p.s, color = '#FFFFFF', op = 0.8;
        if (tipo === 'lluvia') { y = ((p.y * 1920 + frame * 34 * p.v) % 2000) - 40; x += frame * 2; w = 3; h = 40 + p.s * 2; color = '#BAE6FD'; op = 0.5; }
        if (tipo === 'bits') { y = ((p.y * 1920 - frame * 6 * p.v) % 1920 + 1920) % 1920; color = i % 3 ? '#5BC0F8' : '#FFFFFF'; op = 0.5 + 0.5 * Math.sin(frame / 6 + p.d * 9); }
        if (tipo === 'luciernagas') { x += Math.sin(frame / 20 + p.d * 9) * 40; y += Math.cos(frame / 24 + p.d * 7) * 30; w = h = 8; color = '#D8FF8A'; op = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(frame / 7 + p.d * 11)); }
        if (tipo === 'polvo') { y = 1500 + Math.sin(frame / 15 + p.d * 9) * 120 + p.y * 300; x += frame * 1.5 * p.v; w = h = 5 + p.s; color = '#C8B890'; op = 0.35; }
        if (tipo === 'niebla') { y = 1300 + p.y * 500; x = ((p.x * 1080 + frame * 1.2 * p.v) % 1300) - 110; w = 220 + p.s * 10; h = 50; color = '#C0B0D0'; op = 0.12; }
        if (tipo === 'brasas') { y = ((p.y * 1920 - frame * 5 * p.v) % 1920 + 1920) % 1920; x += Math.sin(frame / 9 + p.d * 9) * 14; w = h = 4 + p.s * 0.6; color = i % 2 ? '#FFB03A' : '#FF5A1F'; op = 0.5 + 0.5 * Math.sin(frame / 5 + p.d * 9); }
        if (tipo === 'monedas') { y = ((p.y * 1920 + frame * 12 * p.v) % 2000) - 60; w = h = 14 + p.s; color = Math.floor(frame / 4 + p.d * 8) % 2 ? '#F2C85B' : '#C9962B'; op = 0.9; }
        return <div key={i} style={{ position: 'absolute', left: x, top: y, width: w, height: h, background: color, opacity: op, borderRadius: tipo === 'monedas' ? '50%' : 0, boxShadow: tipo === 'monedas' ? 'inset -4px -4px 0 rgba(0,0,0,.25)' : undefined }} />;
      })}
    </AbsoluteFill>
  );
};

/** Dinero: billetes y monedas pixel que caen alrededor, con el total que sube. */
const Dinero = ({ f }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { x, y } = centroDe(f);
  const fuera = Math.min(1, Math.max(0, (frame - (durationInFrames - 6)) / 6));
  const total = Math.min(1, frame / 30);
  // Sin cifra propia: la cifra la dice el golpe (nada se lee dos veces); aqui solo llueven monedas.
  const cifra = f.cifra;
  if (!cifra) return <Ambiente f={{ tipo: 'monedas', cantidad: 28 }} />;
  return (
    <>
      <Ambiente f={{ tipo: 'monedas', cantidad: 28 }} />
      <div style={{ position: 'absolute', left: x - 220, top: y - 330, width: 440, textAlign: 'center', opacity: 1 - fuera, transform: `scale(${0.8 + 0.2 * total})` }}>
        <div style={{ ...fuentePixel(44), color: PIXEL.oro, textShadow: sombraPixel('#7A5A14', 5), whiteSpace: 'nowrap' }}>{cifra}</div>
        {f.sub ? <div style={{ ...fuentePixel(14), color: '#F4EFE6', textShadow: sombraPixel('#000', 2), marginTop: 8 }}>{f.sub}</div> : null}
      </div>
    </>
  );
};

/** Kagune / tentaculos pixel que salen de la espalda (Tokyo Ghoul), rojos, ondulando. */
const Kagune = ({ f }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { x, y } = centroDe(f);
  const vida = Math.min(1, frame / 8) * Math.min(1, (durationInFrames - frame) / 8);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity: vida }}>
      {[-1, 1].flatMap((lado) => [0, 1].map((k) => (
        <div key={`${lado}${k}`} style={{ position: 'absolute', left: x, top: y - 120 + k * 60, display: 'flex', transformOrigin: 'left center', transform: `rotate(${lado * (40 + k * 25) + Math.sin(frame / 6 + k) * 8}deg) scaleX(${lado})` }}>
          {Array.from({ length: 9 }, (_, i) => <div key={i} style={{ width: 40 - i * 3, height: 40 - i * 3, background: i % 2 ? '#B71C1C' : '#E8323C', marginTop: Math.sin(frame / 5 + i) * 6, boxShadow: `0 0 12px ${conAlfa('#E8323C', 0.6)}` }} />)}
        </div>
      )))}
    </AbsoluteFill>
  );
};

/*
 * Juego de peleas (SOFA13, Bogo Fighters, 13-oct-2026). Juan David: el puño "parece una arepa" y "este video es
 * de videojuegos y se le puede explotar". En vez de un objeto suelto, las metaforas son la interfaz del genero:
 * barras de vida con ROUND 1 / FIGHT!, la pantalla de seleccion de luchador, la invocacion de un asistente y el
 * PERFECT del final. Todo vive arriba (330–660) o a los lados: la cara y la zona de texto quedan libres.
 */
const salidaDe = (frame, total, n = 8) => Math.min(1, Math.max(0, (frame - (total - n)) / n));

/** Barras de vida de juego de peleas con reloj, ROUND 1 → FIGHT! y el escenario (`f.escenario`). */
const Pelea = ({ f }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const a = escalonado(spring({ frame, fps, config: { damping: 14, stiffness: 220 } }), 5);
  const fuera = salidaDe(frame, durationInFrames);
  const [izq, der] = f.nombres ?? ['PLAYER 1', 'PLAYER 2'];
  // La barra del rival baja un poco al "FIGHT!" (primer golpe) y el reloj cuenta hacia atras.
  const golpe = Math.min(1, Math.max(0, (frame - 30) / 10));
  const anuncio = frame < 26 ? 'ROUND 1' : frame < 52 ? 'FIGHT!' : null;
  const b = spring({ frame: frame < 26 ? frame : frame - 26, fps, config: { damping: 8, stiffness: 300, mass: 0.7 } });
  const Barra = ({ nombre, valor, espejo }) => (
    <div style={{ width: 400, display: 'flex', flexDirection: 'column', alignItems: espejo ? 'flex-end' : 'flex-start', gap: 8 }}>
      <div style={{ width: 400, height: 34, background: PIXEL.vida, border: '5px solid #F4EFE6', boxSizing: 'border-box', boxShadow: '5px 5px 0 rgba(0,0,0,.55)', display: 'flex', justifyContent: espejo ? 'flex-start' : 'flex-end' }}>
        <div style={{ width: `${valor * 100}%`, height: '100%', background: `repeating-linear-gradient(90deg, ${PIXEL.oro} 0 22px, #E0B040 22px 26px)` }} />
      </div>
      <span style={{ ...fuentePixel(17), color: '#F4EFE6', textShadow: sombraPixel('#000', 3), whiteSpace: 'nowrap' }}>{nombre}</span>
    </div>
  );
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity: 1 - fuera }}>
      <div style={{ position: 'absolute', left: 40, right: 40, top: 340 - (1 - a) * 40, opacity: a, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Barra nombre={izq} valor={1} />
        <div style={{ width: 120, height: 84, marginTop: -8, background: 'rgba(8,13,26,.92)', border: '5px solid #F4EFE6', boxSizing: 'border-box', display: 'grid', placeItems: 'center', ...fuentePixel(34), color: PIXEL.oro }}>{Math.max(0, 99 - Math.floor(frame / fps))}</div>
        <Barra nombre={der} valor={1 - 0.18 * golpe} espejo />
      </div>
      {f.escenario && frame > 40 ? (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 470, textAlign: 'center', ...fuentePixel(18), color: '#F4EFE6', textShadow: sombraPixel('#000', 3), opacity: Math.min(1, (frame - 40) / 6) }}>STAGE · {f.escenario}</div>
      ) : null}
      {anuncio ? (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 500, textAlign: 'center', ...fuentePixel(anuncio === 'FIGHT!' ? 96 : 70), color: anuncio === 'FIGHT!' ? PIXEL.vida : '#F4EFE6', textShadow: sombraPixel(anuncio === 'FIGHT!' ? '#F4EFE6' : '#0B1426', 7), transform: `scale(${0.4 + 0.6 * Math.min(1.2, b)}) rotate(${anuncio === 'FIGHT!' ? -4 : 0}deg)` }}>{anuncio}</div>
      ) : null}
    </AbsoluteFill>
  );
};

/** Silueta pixel de luchador (sin rostro: los personajes del juego no se inventan, se insinuan). */
const SILUETAS = [
  ['..kkk..', '..kkk..', '.kkkkk.', 'kkkkkkk', 'k.kkk.k', '..kkk..', '..k.k..', '.kk.kk.'],
  ['.kkkk..', '..kkk..', '.kkkkkk', 'kkkkk.k', '..kkk..', '..kkk..', '.kk.k..', 'kk..kk.'],
  ['..kkk..', '.kkkkk.', '..kkk..', '.kkkkk.', 'kkkkkkk', '.kkkkk.', '..k.k..', '..k.k..'],
  ['...kkk.', '..kkk..', 'kkkkk..', '.kkkkk.', '..kkkkk', '..kkk..', '.kk.kk.', 'kk...kk'],
];

/** Pantalla de seleccion de luchador: cuadricula de siluetas "?" y el cursor que recorre hasta elegir. */
const Seleccion = ({ f }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const marca = useMarca();
  const a = escalonado(spring({ frame, fps, config: { damping: 14, stiffness: 220 } }), 5);
  const fuera = salidaDe(frame, durationInFrames);
  const colores = ['#F26B1D', '#5BC0F8', '#58D35A', '#B388FF', '#F2C85B', '#E8323C', '#9FE3FF', '#F06292'];
  const sel = Math.min(colores.length - 1, Math.floor(frame / 6) % colores.length);
  const elegido = frame > colores.length * 6 + 8;
  const px = 9;
  return (
    <div style={{ position: 'absolute', left: 140, width: 800, top: 330, opacity: Math.min(1, a * 1.5) * (1 - fuera), transform: `translateY(${(1 - a) * -24}px)` }}>
      <MarcoPixel ancho={800} alto={300} fondo="rgba(8,13,26,.92)" borde="#F4EFE6" interior={conAlfa(marca.colores.acento, 0.6)} relleno={18}>
        <div style={{ ...fuentePixel(20), color: PIXEL.oro, textAlign: 'center', marginBottom: 14, textShadow: sombraPixel('#000', 3) }}>{f.texto ?? 'SELECT YOUR FIGHTER'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 172px)', gap: 12, justifyContent: 'center' }}>
          {colores.map((c, i) => {
            const activo = i === (elegido ? colores.length - 3 : sel);
            return (
              <div key={i} style={{ position: 'relative', height: 92, background: conAlfa(c, activo ? 0.9 : 0.5), border: `4px solid ${activo ? (elegido && Math.floor(frame / 4) % 2 ? PIXEL.oro : '#F4EFE6') : conAlfa('#F4EFE6', 0.35)}`, boxSizing: 'border-box', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 86 - 3.5 * px, top: 10 }}>
                  {SILUETAS[i % SILUETAS.length].flatMap((fila, j) => [...fila].map((k, x) => (k === 'k' ? <div key={`${x}${j}`} style={{ position: 'absolute', left: x * px, top: j * px, width: px, height: px, background: '#0B1426' }} /> : null)))}
                </div>
                <div style={{ position: 'absolute', right: 8, top: 6, ...fuentePixel(16), color: '#F4EFE6' }}>?</div>
              </div>
            );
          })}
        </div>
      </MarcoPixel>
    </div>
  );
};

/**
 * Invocacion de asistentes (la mecanica que el entrevistado traeria al mundo real): circulo de runas que gira a
 * los pies de quien habla y tres siluetas que suben a los lados con "ASSIST!", como en los juegos de peleas por
 * equipos. A los lados y abajo: la cara no se tapa.
 */
const Invocacion = ({ f }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { x } = centroDe(f);
  const color = f.color ?? '#9FE3FF';
  const vida = Math.min(1, frame / 8) * (1 - salidaDe(frame, durationInFrames, 10));
  const runas = 16;
  const lugares = [{ x: 90, y: 600 }, { x: 90, y: 860 }, { x: 1000, y: 1000 }];
  const px = 17;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity: vida }}>
      {/* Circulo de runas: bloques en elipse que giran a los pies. */}
      {Array.from({ length: runas }, (_, i) => {
        const ang = (i / runas) * Math.PI * 2 + frame / 14;
        const r = Math.min(1, frame / 12);
        return <div key={i} style={{ position: 'absolute', left: x + Math.cos(ang) * 300 * r - 10, top: 1100 + Math.sin(ang) * 60 * r - 10, width: 20, height: 20, background: i % 2 ? color : '#F4EFE6', boxShadow: `0 0 14px ${conAlfa(color, 0.8)}`, opacity: 0.55 + 0.45 * Math.sin(frame / 4 + i) }} />;
      })}
      {lugares.map((l, i) => {
        const t = spring({ frame: frame - 10 - i * 7, fps, config: { damping: 11, stiffness: 200 } });
        if (t <= 0.01) return null;
        return (
          <div key={i} style={{ position: 'absolute', left: l.x - 3.5 * px, top: l.y + (1 - t) * 260, opacity: Math.min(1, t * 1.4) }}>
            <div style={{ position: 'relative', width: 7 * px, height: 8 * px, filter: `drop-shadow(0 0 10px ${color})` }}>
              {SILUETAS[(i + 1) % SILUETAS.length].flatMap((fila, j) => [...fila].map((k, c) => (k === 'k' ? <div key={`${c}${j}`} style={{ position: 'absolute', left: c * px, top: j * px, width: px, height: px, background: j < 2 ? '#F4EFE6' : color }} /> : null)))}
            </div>
            <div style={{ marginTop: 8, marginLeft: -12, ...fuentePixel(14), color: '#F4EFE6', textShadow: sombraPixel('#000', 3), whiteSpace: 'nowrap', opacity: Math.floor(frame / 6) % 3 === 0 ? 0.4 : 1 }}>ASSIST!</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** "PERFECT!" de fin de round, con destellos escalonados (cuando la respuesta gusta). */
const Perfecto = ({ f }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const a = spring({ frame, fps, config: { damping: 8, stiffness: 280, mass: 0.8 } });
  const fuera = salidaDe(frame, durationInFrames, 7);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity: 1 - fuera }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 540, textAlign: 'center', ...fuentePixel(84), color: PIXEL.oro, textShadow: sombraPixel(PIXEL.vida, 7), transform: `scale(${0.5 + 0.5 * Math.min(1.15, a)}) rotate(-3deg)` }}>{f.texto ?? 'PERFECT!'}</div>
      {[[180, 520], [880, 560], [260, 680], [820, 690]].map(([sx, sy], i) => (
        <div key={i} style={{ position: 'absolute', left: sx, top: sy, opacity: Math.floor((frame + i * 3) / 5) % 2 ? 1 : 0.2 }}><IconoPixel nombre="estrella" tamano={34} /></div>
      ))}
    </AbsoluteFill>
  );
};

export const CAPAS_FX = { pelea: Pelea, seleccion: Seleccion, invocacion: Invocacion, perfecto: Perfecto, puño: Puno, pow: Puno, plataformas: Plataformas, mapa: Mapa, turnos: Turnos, nivelUp: NivelUp, escudo: Escudo, combo: Combo, vida: Vida, dinero: Dinero, kagune: Kagune, lluvia: Ambiente, bits: Ambiente, luciernagas: Ambiente, polvo: Ambiente, niebla: Ambiente, brasas: Ambiente, monedas: Ambiente };
/** Efectos que mueven el video (los resuelve Arcade.jsx). */
export const MOVIMIENTOS = new Set(['levitar', 'vuelo', 'salto', 'dobleSalto', 'teletransporte', 'clones', 'respawn', 'golpeado', 'temblor', 'crecer']);

/**
 * Transformacion del contenedor del video para un efecto de movimiento, en el
 * cuadro `t` (0..1 del efecto) y `frame` local. Devuelve { dy, dx, giro, escala,
 * escalaX, escalaY, opacidad, copias[], bloques } que Arcade.jsx aplica.
 */
export function movimientoDe(tipo, local, dur, frame) {
  const t = local / Math.max(1, dur);
  const env = Math.sin(Math.PI * Math.min(1, t));
  const r = { dy: 0, dx: 0, giro: 0, escala: 1, escalaX: 1, escalaY: 1, opacidad: 1, copias: [], bloques: 0, flash: 0 };
  if (tipo === 'levitar') { r.dy = -env * 60 - Math.sin(frame / 4) * 10; r.giro = Math.sin(frame / 7) * 1.5; }
  if (tipo === 'vuelo') { r.dy = -env * 420; r.giro = -env * 6; }
  if (tipo === 'salto' || tipo === 'dobleSalto') {
    const saltos = tipo === 'dobleSalto' ? 2 : 1;
    const fase = (t * saltos) % 1;
    const arco = Math.sin(Math.PI * fase);
    r.dy = -arco * (tipo === 'dobleSalto' ? 260 : 320);
    // Agacharse antes de saltar y aplastarse al caer (squash & stretch de plataformas).
    r.escalaY = fase < 0.08 ? 0.92 : fase > 0.92 ? 0.9 : 1 + arco * 0.05;
    r.escalaX = fase < 0.08 || fase > 0.92 ? 1.06 : 1 - arco * 0.03;
  }
  if (tipo === 'teletransporte') {
    // Se deshace en bloques, destello, y se rearma 12 cuadros despues un poco corrido.
    const mitad = dur / 2;
    r.bloques = local < mitad ? local / mitad : 1 - (local - mitad) / mitad;
    r.flash = Math.abs(local - mitad) < 3 ? 1 : 0;
    r.dx = local >= mitad ? 60 * (1 - (local - mitad) / mitad) : 0;
  }
  if (tipo === 'clones') { const a = Math.min(1, local / 10) * Math.min(1, (dur - local) / 8); r.copias = [{ dx: -260 * a, opacidad: 0.7 * a, tinte: 'hue-rotate(40deg)' }, { dx: 260 * a, opacidad: 0.7 * a, tinte: 'hue-rotate(-40deg)' }]; }
  if (tipo === 'respawn') { const mitad = dur * 0.45; r.bloques = local < mitad ? local / mitad : local < mitad + 8 ? 1 : 1 - (local - mitad - 8) / (dur - mitad - 8); r.flash = Math.abs(local - mitad - 8) < 3 ? 1 : 0; }
  if (tipo === 'golpeado') { const k = Math.max(0, 1 - local / 14); r.dx = Math.sin(local * 2.6) * 24 * k; r.giro = -4 * k; r.flash = local < 2 ? 1 : 0; }
  if (tipo === 'temblor') { r.dx = Math.sin(local * 3.1) * 10; r.dy = Math.cos(local * 2.3) * 8; }
  if (tipo === 'crecer') { r.escala = 1 + env * 0.35; r.dy = env * 120; }
  return r;
}

/** Mascara de bloques para teletransporte/respawn: cuadricula que se vacia en orden al azar. */
export const Bloques = ({ p, color = '#0B1426' }) => {
  const lado = 60;
  const cols = 18, filas = 32;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {Array.from({ length: cols * filas }, (_, i) => (random(`t${i}`) < p ? <div key={i} style={{ position: 'absolute', left: (i % cols) * lado, top: Math.floor(i / cols) * lado, width: lado + 1, height: lado + 1, background: random(`u${i}`) > 0.8 ? '#5BC0F8' : color }} /> : null))}
    </AbsoluteFill>
  );
};
