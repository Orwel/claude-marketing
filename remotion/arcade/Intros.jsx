import React, { useMemo } from 'react';
import { AbsoluteFill, random, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { useMarca } from '../marca.js';
import { conAlfa } from '../util.js';
import { fuentePixel, IconoPixel, MarcoPixel, PIXEL, sombraPixel } from './Pixel.jsx';
import { BANDERA_CO, CABALLERO, CABALLERO_SALTO, COFRE_ABIERTO, COFRE_CERRADO, CURSOR_MANO, GEMA, MONEDA2D, NUBE, Sprite, TROFEO2D } from './Sprites.jsx';

/**
 * Pantallas de titulo por tema (SOFA, 13-oct-2026). Juan David sobre la primera
 * tanda: "la intro es simplemente una transicion con ese mapa feo repetido una y
 * otra vez con cero creatividad"; "monedas regadas que representen riqueza en vez
 * de esa montaña". Cada motivo cuenta el tema del video con un recurso de
 * videojuego reconocible, en pixel art 2D (divs: nitido y sin GPU):
 *
 *  - protesto    (¿a quien demandaria? parte 2): el "¡PROTESTO!" de los juegos de abogados
 *  - tesoro      (¿cuanto cobraria? parte 2): lluvia de monedas y un cofre que se abre
 *  - plataformas (mecanicas de videojuego): el caballero del Claustro saltando plataformas
 *  - torneo      (emprendedores, votacion): cuadro de torneo con trofeo
 *  - tienda      (emprendedores, parte 2): tienda de RPG con los productos del stand
 *  - cartuchos   (indies colombianos): cartuchos que entran a la consola
 *  - arcade      (indies, parte 2): maquina arcade con "INSERT COIN"
 *  - poderes     (mecanicas, parte 1): combate por turnos con TURNOS / CLONES / RESPAWN
 *  - mapa        (mecanicas, parte 2): mapa con niebla que se abre, ruta y teletransporte
 *  - espejo      (en que te pareces, parte 1): el reflejo cambia de traje por rasgo hasta coincidir
 *
 * Todos dibujan en la franja 380–1150 (arriba va la serie, abajo el titulo).
 */
const escalonado = (a, pasos = 4) => Math.round(Math.min(1, Math.max(0, a)) * pasos) / pasos;
const res = (frame, desde, fps, config = { damping: 12, stiffness: 220 }) => Math.min(1, Math.max(0, spring({ frame: frame - desde, fps, config })));
const SUELO = 1130;

/** Suelo de ladrillos pixel entre `y` y el borde inferior de la franja. */
const Suelo = ({ y = SUELO, alto = 60, color = '#8B5A2B', oscuro = '#5A3A1A', tapa = '#58D35A' }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, top: y, height: alto, background: `repeating-linear-gradient(90deg, ${color} 0 54px, ${oscuro} 54px 60px)`, boxShadow: `inset 0 12px 0 ${tapa}, inset 0 -6px 0 ${oscuro}` }} />
);

/* ------------------------------------------------------------ protesto */
/** Sala de juicio pixel: estrado de madera y el globo "¡PROTESTO!" entra de golpe. Sin martillo: en pixel art
 *  "parecia un pollo" (Juan David, 13-oct, igual que en SOFA01). */
export const Protesto = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const entra = res(frame, 10, fps, { damping: 7, stiffness: 320, mass: 0.9 });
  const impacto = frame >= 14 && frame < 24;
  const sacude = impacto ? Math.sin(frame * 3) * 8 : 0;
  const segundo = res(frame, 44, fps, { damping: 9, stiffness: 300 });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, #0B1426 0%, #1C2B4A 100%)' }} />
      {/* Estrado: dos bloques de madera y el panel del juez. */}
      <div style={{ position: 'absolute', left: 90, width: 900, top: 820, height: 140, background: '#8B5A2B', boxShadow: 'inset 0 14px 0 #A8703A, inset 0 -10px 0 #5A3A1A' }} />
      <div style={{ position: 'absolute', left: 300, width: 480, top: 700, height: 130, background: '#6B4428', boxShadow: 'inset 0 12px 0 #8B5A2B, inset 0 -10px 0 #3A2210' }} />
      <Suelo y={960} alto={190} color="#2A2F3F" oscuro="#1A1E2A" tapa="#454B5E" />
      {/* Lineas de impacto que salen del globo. */}
      {impacto ? Array.from({ length: 12 }, (_, i) => <div key={i} style={{ position: 'absolute', left: 540, top: 560, width: 420, height: 10, background: '#F4EFE6', transformOrigin: 'left center', transform: `rotate(${i * 30 + frame * 2}deg) scaleX(${(frame - 14) / 10})`, opacity: 1 - (frame - 14) / 10 }} />) : null}
      <div style={{ position: 'absolute', left: 90, width: 900, top: 420 + sacude, transform: `scale(${0.3 + 0.7 * entra}) rotate(${-6 + 6 * entra}deg)`, opacity: entra > 0.05 ? 1 : 0 }}>
        <div style={{ position: 'relative', background: '#F4EFE6', border: '8px solid #0B1426', padding: '46px 30px', boxShadow: '14px 14px 0 rgba(0,0,0,.5)' }}>
          <div style={{ ...fuentePixel(84), color: '#E8323C', textShadow: sombraPixel('#0B1426', 8), textAlign: 'center' }}>¡PROTESTO!</div>
          <div style={{ position: 'absolute', left: 120, bottom: -46, width: 0, height: 0, borderLeft: '34px solid transparent', borderRight: '34px solid transparent', borderTop: '46px solid #0B1426' }} />
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1010, textAlign: 'center', opacity: segundo, transform: `translateY(${(1 - segundo) * 20}px)` }}>
        <span style={{ ...fuentePixel(26), color: PIXEL.oro, textShadow: sombraPixel(PIXEL.negro, 3) }}>SE ABRE EL JUICIO</span>
      </div>
    </AbsoluteFill>
  );
};

/* -------------------------------------------------------------- tesoro */
/** Lluvia de monedas y gemas que caen y se apilan; un cofre se abre a los 1,2 s y suelta mas. */
export const Tesoro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const PISO = 1090;
  // 60 monedas que caen en ciclos de 70 cuadros (lluvia continua) y 12 pilas altas ya regadas.
  const monedas = useMemo(() => Array.from({ length: 60 }, (_, i) => ({ x: 40 + random(`tx${i}`) * 960, t: Math.floor(random(`tt${i}`) * 70), v: 0.7 + random(`tv${i}`) * 0.6, gema: random(`tg${i}`) > 0.82, giro: random(`tr${i}`) * 6, px: 8 + Math.round(random(`tp${i}`) * 4) })), []);
  const pilas = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ x: 20 + i * 88, h: 70 + random(`ph${i}`) * 170 })), []);
  const abierto = frame >= 36;
  const brillo = abierto ? Math.min(1, (frame - 36) / 10) : 0;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, #07141D 0%, #1A1206 60%, #2A1A08 100%)' }} />
      {/* Resplandor dorado del tesoro sobre toda la franja. */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 500, height: 700, background: `radial-gradient(ellipse at 50% 100%, ${conAlfa('#F2C85B', 0.28 + 0.25 * brillo)} 0%, rgba(0,0,0,0) 70%)`, mixBlendMode: 'screen' }} />
      <Suelo y={PISO} alto={60} color="#3A2A10" oscuro="#241A08" tapa="#C9962B" />
      {/* Pilas de monedas ya regadas por el suelo (con monedas pixel encima). */}
      {pilas.map((p, i) => (
        <React.Fragment key={`p${i}`}>
          <div style={{ position: 'absolute', left: p.x, top: PISO - p.h, width: 110, height: p.h, background: `repeating-linear-gradient(180deg, #F2C85B 0 12px, #C9962B 12px 20px)`, clipPath: 'polygon(6% 100%, 0 45%, 22% 0, 78% 0, 100% 45%, 94% 100%)', boxShadow: 'inset -18px 0 0 rgba(0,0,0,.25)' }} />
          <div style={{ position: 'absolute', left: p.x + 20, top: PISO - p.h - 54 }}><Sprite fig={MONEDA2D} px={8} /></div>
        </React.Fragment>
      ))}
      {/* Cofre en el centro; al abrirse ilumina. */}
      <div style={{ position: 'absolute', left: 384, top: PISO - 208 }}>
        <div style={{ position: 'absolute', left: -120, top: -140, width: 560, height: 420, background: `radial-gradient(ellipse at center, ${conAlfa('#FFF2A8', 0.6 * brillo)} 0%, rgba(0,0,0,0) 65%)`, mixBlendMode: 'screen' }} />
        <Sprite fig={abierto ? COFRE_ABIERTO : COFRE_CERRADO} px={26} />
      </div>
      {monedas.map((m, i) => {
        const local = ((frame - m.t) % 70 + 70) % 70;
        const vuelta = Math.floor((frame - m.t) / 70);
        if (frame - m.t < 0) return null;
        const alturaPila = 40 + (i % 6) * 22;
        const piso = PISO - alturaPila;
        // Caida con gravedad y un rebote corto al llegar al suelo; despues de cada ciclo vuelve a caer.
        const tCaida = Math.sqrt((piso - 360) / (16 * m.v));
        let y = 360 + Math.min(16 * local * local * m.v, piso - 360);
        if (local > tCaida) { const r = local - tCaida; y = piso - Math.max(0, Math.sin(Math.min(Math.PI, r / 3)) * 40); }
        if (local > tCaida + 24) return null;
        const escalaX = Math.abs(Math.cos((local + m.giro + vuelta) / 3)) * 0.8 + 0.2;
        return <div key={i} style={{ position: 'absolute', left: m.x, top: y, transform: `scaleX(${escalaX})` }}><Sprite fig={m.gema ? GEMA : MONEDA2D} px={m.px} /></div>;
      })}
      {/* Destellos pixel sobre el oro. */}
      {Array.from({ length: 14 }, (_, i) => { const a = (frame / 6 + i) % 4 < 1; return a ? <div key={`b${i}`} style={{ position: 'absolute', left: 60 + ((i * 97) % 960), top: 840 + ((i * 53) % 240), width: 12, height: 12, background: '#FFFFFF', boxShadow: '0 0 0 5px rgba(255,255,255,.35)' }} /> : null; })}
    </AbsoluteFill>
  );
};

/* --------------------------------------------------------- plataformas */
/** Nivel de plataformas 2D: el caballero corre, salta dos veces y toma la moneda del bloque "?". */
export const Plataformas = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const plataformas = [[120, 1000, 220], [420, 880, 220], [720, 740, 240]];
  // Recorrido guionado: corre (0-0,6 s), salta a la 1.ª (0,6-1,0), a la 2.ª (1,0-1,5) con doble salto, a la 3.ª (1,5-2,1).
  const tramo = t < 0.6 ? 0 : t < 1.05 ? 1 : t < 1.55 ? 2 : t < 2.1 ? 3 : 4;
  const f = (a, b, p) => a + (b - a) * p;
  let x, y, salta = false;
  if (tramo === 0) { x = f(-80, 110, t / 0.6); y = SUELO; }
  else if (tramo === 1) { const p = (t - 0.6) / 0.45; x = f(110, 190, p); y = f(SUELO, 1000, p) - Math.sin(Math.PI * p) * 150; salta = true; }
  else if (tramo === 2) { const p = (t - 1.05) / 0.5; x = f(190, 480, p); y = f(1000, 880, p) - Math.abs(Math.sin(Math.PI * 2 * p)) * 130; salta = true; }
  else if (tramo === 3) { const p = (t - 1.55) / 0.55; x = f(480, 790, p); y = f(880, 740, p) - Math.sin(Math.PI * p) * 170; salta = true; }
  else { x = 790 + Math.sin((t - 2.1) * 6) * 6; y = 740; }
  const moneda = t >= 2.1;
  const nubes = [[80, 420], [600, 470], [860, 400]];
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, #0B1426 0%, #1C2B4A 55%, #2F4A7A 100%)' }} />
      {nubes.map(([cx, cy], i) => <div key={i} style={{ position: 'absolute', left: ((cx + frame * 0.6 + i * 50) % 1300) - 150, top: cy }}><Sprite fig={NUBE} px={9} /></div>)}
      <Suelo y={SUELO} alto={60} />
      {plataformas.map(([px, py, pw], i) => <div key={i} style={{ position: 'absolute', left: px, top: py, width: pw, height: 44, background: 'repeating-linear-gradient(90deg, #A8703A 0 50px, #8B5A2B 50px 56px)', boxShadow: 'inset 0 10px 0 #58D35A, inset 0 -6px 0 #3A2210' }} />)}
      {/* Bloque "?" sobre la ultima plataforma: al tocarlo suelta la moneda. */}
      <div style={{ position: 'absolute', left: 900, top: 560 + (moneda && t < 2.3 ? -12 : 0), width: 64, height: 64, background: moneda ? '#8B5A2B' : PIXEL.oro, border: '6px solid #7A5A14', boxSizing: 'border-box', ...fuentePixel(28), color: '#7A5A14', display: 'grid', placeItems: 'center' }}>{moneda ? '' : '?'}</div>
      {moneda ? <div style={{ position: 'absolute', left: 914, top: 500 - Math.min(80, (t - 2.1) * 260), opacity: Math.max(0, 1 - (t - 2.1) / 0.8) }}><Sprite fig={MONEDA2D} px={5} /></div> : null}
      {moneda ? <div style={{ position: 'absolute', left: 850, top: 420 - (t - 2.1) * 60, ...fuentePixel(22), color: PIXEL.xp, textShadow: sombraPixel(PIXEL.negro, 3), opacity: Math.max(0, 1 - (t - 2.1) / 1.2) }}>+100</div> : null}
      {/* Monedas sobre las plataformas que el caballero va tomando. */}
      {plataformas.map(([px, py], i) => { const tomada = x > px + 60; return tomada ? null : <div key={`m${i}`} style={{ position: 'absolute', left: px + 90, top: py - 60 + Math.sin(frame / 5 + i) * 4 }}><Sprite fig={MONEDA2D} px={5} /></div>; })}
      <div style={{ position: 'absolute', left: x, top: y - 176, transform: tramo === 0 && Math.floor(frame / 4) % 2 ? 'translateY(-4px)' : undefined }}><Sprite fig={salta ? CABALLERO_SALTO : CABALLERO} px={8} /></div>
      {tramo === 2 && t - 1.05 > 0.2 && t - 1.05 < 0.35 ? <div style={{ position: 'absolute', left: x - 20, top: y - 20, ...fuentePixel(18), color: '#F4EFE6', textShadow: sombraPixel(PIXEL.negro, 2) }}>x2</div> : null}
    </AbsoluteFill>
  );
};

/* -------------------------------------------------------------- torneo */
/** Cuadro de torneo: cuatro tarjetas con los emprendimientos, lineas que suben al trofeo y "VOTA". */
export const Torneo = ({ participantes = [], ganador, premio = 'PÁGINA WEB GRATIS' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  // Con `ganador` el torneo ya se resolvio: una sola tarjeta, en dorado, unida al trofeo (SOFA10, 19-oct-2026).
  if (ganador) return <TorneoGanado ganador={ganador} premio={premio} />;
  const lista = [...participantes, '?', '?', '?', '?'].slice(0, 4);
  const trofeo = res(frame, 4, fps, { damping: 8, stiffness: 240 });
  const linea = Math.min(1, Math.max(0, (frame - 30) / 18));
  const latido = 1 + 0.04 * Math.sin(frame / 4);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, #0B1426 0%, #1C2B4A 100%)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 400, display: 'flex', justifyContent: 'center', transform: `scale(${trofeo * latido})` }}>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: -120, top: -80, width: 400, height: 340, background: `radial-gradient(ellipse at center, ${conAlfa(PIXEL.oro, 0.35)} 0%, rgba(0,0,0,0) 65%)`, mixBlendMode: 'screen' }} />
          <Sprite fig={TROFEO2D} px={16} />
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 580, textAlign: 'center', ...fuentePixel(20), color: PIXEL.oro, textShadow: sombraPixel(PIXEL.negro, 3), opacity: trofeo }}>PÁGINA WEB GRATIS</div>
      {/* Llaves del torneo: de cada tarjeta sube una linea hasta la barra central y de ahi al trofeo. */}
      <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {lista.map((_, i) => { const cx = 135 + i * 270; return <polyline key={i} points={`${cx},900 ${cx},${900 - 110 * linea}`} fill="none" stroke="#F4EFE6" strokeWidth={8} />; })}
        <line x1={135} y1={790} x2={135 + 810 * linea} y2={790} stroke="#F4EFE6" strokeWidth={8} opacity={linea > 0.95 ? 1 : 0.4} />
        <line x1={540} y1={790} x2={540} y2={790 - 150 * Math.max(0, (frame - 48) / 12)} stroke={PIXEL.oro} strokeWidth={10} />
      </svg>
      {lista.map((nombre, i) => {
        const a = escalonado(res(frame, 12 + i * 6, fps, { damping: 12, stiffness: 260 }), 5);
        const incognita = nombre === '?';
        return (
          <div key={i} style={{ position: 'absolute', left: 20 + i * 270, width: 230, top: 900 + (1 - a) * 60, opacity: a }}>
            <MarcoPixel ancho={230} alto={210} fondo="rgba(8,13,26,.9)" borde={incognita ? '#A7ADBA' : marca.colores.acento} interior={conAlfa(marca.colores.acento, 0.6)} relleno={14} estilo={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              {incognita ? <div style={{ ...fuentePixel(54), color: '#A7ADBA' }}>?</div> : <IconoPixel nombre={['estrella', 'varita', 'libro', 'calavera'][i]} tamano={66} />}
              <div style={{ ...fuentePixel(incognita ? 14 : 13), color: '#F4EFE6', textAlign: 'center', lineHeight: 1.5 }}>{incognita ? 'POR VOTAR' : nombre.toUpperCase()}</div>
            </MarcoPixel>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const TorneoGanado = ({ ganador, premio }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const trofeo = res(frame, 4, fps, { damping: 8, stiffness: 240 });
  const tarjeta = escalonado(res(frame, 16, fps, { damping: 12, stiffness: 260 }), 5);
  const linea = Math.min(1, Math.max(0, (frame - 30) / 16));
  const latido = 1 + 0.04 * Math.sin(frame / 4);
  const brillo = 0.6 + 0.4 * Math.abs(Math.sin(frame / 10));
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, #0B1426 0%, #1C2B4A 100%)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 400, display: 'flex', justifyContent: 'center', transform: `scale(${trofeo * latido})` }}>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: -120, top: -80, width: 400, height: 340, background: `radial-gradient(ellipse at center, ${conAlfa(PIXEL.oro, 0.35 * brillo)} 0%, rgba(0,0,0,0) 65%)`, mixBlendMode: 'screen' }} />
          <Sprite fig={TROFEO2D} px={16} />
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 580, textAlign: 'center', ...fuentePixel(20), color: PIXEL.oro, textShadow: sombraPixel(PIXEL.negro, 3), opacity: trofeo }}>{premio}</div>
      <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <line x1={540} y1={860} x2={540} y2={860 - 200 * linea} stroke={PIXEL.oro} strokeWidth={10} />
      </svg>
      <div style={{ position: 'absolute', left: 540 - 170, width: 340, top: 860 + (1 - tarjeta) * 60, opacity: tarjeta }}>
        <MarcoPixel ancho={340} alto={240} fondo="rgba(8,13,26,.92)" borde={PIXEL.oro} interior={conAlfa(PIXEL.oro, 0.6)} relleno={16} estilo={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <IconoPixel nombre="estrella" tamano={76} />
          <div style={{ ...fuentePixel(22), color: '#F4EFE6', textAlign: 'center', lineHeight: 1.4 }}>{ganador.toUpperCase()}</div>
        </MarcoPixel>
      </div>
    </AbsoluteFill>
  );
};

/* -------------------------------------------------------------- tienda */
/** Tienda de RPG: casillas con los productos del stand, cursor que recorre y elige, y el tendero que pregunta. */
export const Tienda = ({ productos = [] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const items = [...productos, 'Amuletos', 'Dragones', 'Pesebres', 'Piezas 3D', 'Talleres', 'Criaturas'].slice(0, 6);
  const iconos = ['corazon', 'varita', 'libro', 'calavera', 'estrella', 'trofeo'];
  const sel = Math.min(5, Math.floor(Math.max(0, frame - 12) / 9));
  const elegido = frame > 12 + 6 * 9 + 4;
  const a = escalonado(res(frame, 4, fps), 5);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, #0B1426 0%, #2A1A3A 100%)' }} />
      <div style={{ position: 'absolute', left: 50, width: 980, top: 400, opacity: a, transform: `translateY(${(1 - a) * 20}px)` }}>
        <MarcoPixel ancho={980} alto={120} fondo="rgba(8,13,26,.92)" borde="#F4EFE6" interior={conAlfa(marca.colores.acento, 0.6)} relleno={22} estilo={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <IconoPixel nombre="moneda" tamano={56} />
          <div style={{ ...fuentePixel(22), color: '#F4EFE6', lineHeight: 1.5 }}>{elegido ? '¡BUENA ELECCIÓN!' : '¿QUÉ DESEAS COMPRAR?'}</div>
        </MarcoPixel>
      </div>
      <div style={{ position: 'absolute', left: 50, width: 980, top: 560, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        {items.map((nombre, i) => {
          const entra = escalonado(res(frame, 8 + i * 4, fps), 4);
          const activo = i === sel;
          return (
            <div key={i} style={{ opacity: entra, transform: `scale(${0.8 + 0.2 * entra}) ${activo && elegido ? `scale(${1 + 0.05 * Math.sin(frame / 3)})` : ''}` }}>
              <MarcoPixel ancho={313} alto={240} fondo={activo ? conAlfa(marca.colores.acento, 0.35) : 'rgba(8,13,26,.92)'} borde={activo ? PIXEL.oro : '#F4EFE6'} interior={conAlfa(marca.colores.acento, 0.5)} relleno={16} estilo={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <IconoPixel nombre={iconos[i]} tamano={76} />
                <div style={{ ...fuentePixel(13), color: '#F4EFE6', textAlign: 'center', lineHeight: 1.5 }}>{nombre.toUpperCase()}</div>
                <div style={{ ...fuentePixel(14), color: PIXEL.oro }}>{activo && elegido ? 'VOTADO' : '$ ???'}</div>
              </MarcoPixel>
            </div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', left: 60 + (sel % 3) * 333 + 230, top: 560 + Math.floor(sel / 3) * 260 + 150 + Math.abs(Math.sin(frame / 4)) * 8 }}><Sprite fig={CURSOR_MANO} px={7} /></div>
    </AbsoluteFill>
  );
};

/* ----------------------------------------------------------- cartuchos */
/** Cartuchos pixel con los nombres de los juegos caen y el ultimo entra en la consola; sello "HECHO EN COLOMBIA". */
export const Cartuchos = ({ juegos = [] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const lista = juegos.length ? juegos : ['MITO', 'BERRACOS ESPANTOS', 'BOGO FIGHTERS'];
  const colores = ['#9FE3FF', '#E8323C', '#F26B1D', '#58D35A'];
  const sello = res(frame, 56, fps, { damping: 8, stiffness: 300 });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, #0B1426 0%, #1C2B4A 100%)' }} />
      {/* Consola: caja gris con ranura y luz. */}
      <div style={{ position: 'absolute', left: 140, width: 800, top: 900, height: 230, background: '#B4BCC8', boxShadow: 'inset 0 16px 0 #DDE3EC, inset 0 -18px 0 #6E7684, 10px 10px 0 rgba(0,0,0,.45)' }}>
        <div style={{ position: 'absolute', left: 150, width: 500, top: 0, height: 40, background: '#2E323A' }} />
        <div style={{ position: 'absolute', left: 60, top: 120, width: 90, height: 34, background: '#6E7684' }} />
        <div style={{ position: 'absolute', left: 170, top: 128, width: 18, height: 18, background: frame > 50 ? PIXEL.vida : '#3A3A42', boxShadow: frame > 50 ? `0 0 0 6px ${conAlfa(PIXEL.vida, 0.3)}` : undefined }} />
        <div style={{ position: 'absolute', right: 60, top: 100, ...fuentePixel(14), color: '#2E323A' }}>SOFA 2026</div>
      </div>
      {lista.map((nombre, i) => {
        const desde = 10 + i * 14;
        const p = res(frame, desde, fps, { damping: 11, stiffness: 150, mass: 1.1 });
        const ultimo = i === lista.length - 1;
        // Los primeros se apilan a la izquierda; el ultimo baja a la ranura de la consola.
        const xFin = ultimo ? 390 : 40 + i * 150;
        const yFin = ultimo ? 820 : 720 + i * 30;
        const giro = ultimo ? 0 : -10 + i * 8;
        return (
          <div key={i} style={{ position: 'absolute', left: xFin, top: -200 + (yFin + 200) * p, width: 300, height: 340, transform: `rotate(${giro * p}deg)`, background: '#6E7684', boxShadow: 'inset 0 10px 0 #8E97A8, inset 0 -10px 0 #454B5E, 8px 8px 0 rgba(0,0,0,.45)', zIndex: ultimo ? 0 : 1 }}>
            <div style={{ position: 'absolute', left: 30, right: 30, top: 40, bottom: 90, background: colores[i % colores.length], display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14, textAlign: 'center' }}>
              <div style={{ ...fuentePixel(nombre.length > 12 ? 18 : 24), color: '#0B1426', lineHeight: 1.5 }}>{nombre.toUpperCase()}</div>
            </div>
            <div style={{ position: 'absolute', left: 30, right: 30, bottom: 30, height: 40, background: 'repeating-linear-gradient(90deg, #454B5E 0 16px, #6E7684 16px 24px)' }} />
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: 640, top: 560, transform: `scale(${sello}) rotate(-12deg)`, opacity: sello }}>
        <div style={{ padding: '14px 20px', border: '6px solid #FCD116', background: 'rgba(8,13,26,.85)', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '8px 8px 0 rgba(0,0,0,.5)' }}>
          <Sprite fig={BANDERA_CO} px={5} />
          <span style={{ ...fuentePixel(16), color: '#FCD116', lineHeight: 1.5 }}>HECHO EN<br />COLOMBIA</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* -------------------------------------------------------------- arcade */
/** Maquina arcade: marquesina, pantalla con la lista de juegos, joystick y "INSERT COIN"; la moneda entra y prende. */
export const Arcade = ({ juegos = [], marquesina = 'INDIES COLOMBIANOS' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const lista = juegos.length ? juegos : ['BERRACOS ESPANTOS', 'BOGO FIGHTERS'];
  const moneda = res(frame, 8, fps, { damping: 14, stiffness: 120, mass: 1.2 });
  const prendida = frame > 30;
  const sel = Math.floor(frame / 12) % lista.length;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, #0B1426 0%, #1C2B4A 100%)' }} />
      {/* Gabinete. */}
      <div style={{ position: 'absolute', left: 190, width: 700, top: 380, height: 780, background: '#2A2F3F', boxShadow: 'inset 0 0 0 10px #454B5E, 12px 12px 0 rgba(0,0,0,.5)' }}>
        <div style={{ position: 'absolute', left: 20, right: 20, top: 24, height: 90, background: prendida ? marca.colores.acento : '#5A3A1A', display: 'grid', placeItems: 'center', boxShadow: prendida ? `0 0 0 8px ${conAlfa(marca.colores.acento, 0.35)}` : undefined }}>
          <div style={{ ...fuentePixel(20), color: '#0B1426', letterSpacing: '0.1em' }}>{marquesina}</div>
        </div>
        <div style={{ position: 'absolute', left: 60, right: 60, top: 150, height: 330, background: prendida ? '#0A1A30' : '#06080E', border: '10px solid #6E7684', boxSizing: 'border-box', padding: 24, overflow: 'hidden' }}>
          {prendida ? (
            <>
              <div style={{ ...fuentePixel(13), color: PIXEL.oro, marginBottom: 16 }}>SELECCIONA TU JUEGO</div>
              {lista.map((n, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, height: 44, ...fuentePixel(16), color: i === sel ? '#F4EFE6' : '#A7ADBA' }}>
                  <span style={{ width: 20, opacity: i === sel && Math.floor(frame / 5) % 2 ? 0.2 : i === sel ? 1 : 0 }}>▶</span>
                  <span>{n.toUpperCase()}</span>
                </div>
              ))}
              <div style={{ position: 'absolute', right: 20, bottom: 14, ...fuentePixel(11), color: '#58D35A' }}>1 CREDITO</div>
            </>
          ) : (
            <div style={{ ...fuentePixel(16), color: '#A7ADBA', opacity: Math.floor(frame / 8) % 2 ? 0.2 : 1, textAlign: 'center', marginTop: 120 }}>INSERT COIN</div>
          )}
          {/* Lineas CRT de la pantallita. */}
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(180deg, rgba(0,0,0,.25) 0 2px, rgba(0,0,0,0) 2px 5px)', pointerEvents: 'none' }} />
        </div>
        {/* Panel de control: palanca y botones. */}
        <div style={{ position: 'absolute', left: 20, right: 20, top: 520, height: 120, background: '#454B5E', boxShadow: 'inset 0 10px 0 #6E7684' }}>
          <div style={{ position: 'absolute', left: 120, top: 10, width: 14, height: 60, background: '#B4BCC8', transform: `rotate(${Math.sin(frame / 6) * 18}deg)`, transformOrigin: 'bottom center' }} />
          <div style={{ position: 'absolute', left: 106, top: -14, width: 42, height: 42, borderRadius: '50%', background: PIXEL.vida, transform: `translateX(${Math.sin(frame / 6) * 14}px)` }} />
          {[0, 1, 2].map((k) => <div key={k} style={{ position: 'absolute', left: 330 + k * 90, top: 36, width: 50, height: 50, borderRadius: '50%', background: [PIXEL.oro, PIXEL.xp, PIXEL.cielo][k], boxShadow: 'inset 0 -8px 0 rgba(0,0,0,.3)', transform: frame % 24 === k * 8 ? 'translateY(6px)' : undefined }} />)}
        </div>
        {/* Ranura de la moneda. */}
        <div style={{ position: 'absolute', left: 300, top: 680, width: 100, height: 44, background: '#0A0D16', border: '6px solid #6E7684' }} />
        <div style={{ position: 'absolute', left: 300, top: 690, ...fuentePixel(10), color: '#A7ADBA', width: 100, textAlign: 'center', marginTop: 50 }}>25¢</div>
      </div>
      <div style={{ position: 'absolute', left: 520, top: 300 + 380 * moneda, opacity: moneda < 0.98 ? 1 : 0, transform: `scaleX(${Math.abs(Math.cos(frame / 3)) * 0.8 + 0.2})` }}><Sprite fig={MONEDA2D} px={6} /></div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------- poderes */
const SLIME = { arte: ['....gggg....', '..gGGGGGGg..', '.gGwkGGwkGg.', 'gGGwkGGwkGGg', 'gGGGGGGGGGGg', 'gGGGrrrrGGGg', '.gGGGGGGGGg.', 'gggggggggggg'], pal: { g: '#2E7D32', G: '#58D35A', w: '#F4EFE6', k: '#0A0D16', r: '#E8323C' } };
/**
 * Mecanicas, parte 1 (SOFA06: respawn, combates por turnos, clones): un combate por turnos de RPG. El cursor del
 * menu recorre TURNOS → CLONES → RESPAWN y cada opcion pasa en pantalla: el caballero ataca en su turno, se
 * clona y, cuando el slime lo deja en 0 PV, reaparece con +1 VIDA. Juan David, 13-oct: "una intro bien creativa,
 * contextual".
 */
export const Poderes = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Tiempos apretados para que el respawn se vea antes de la transicion de salida (el titulo dura 3,4 s).
  const opcion = frame < 24 ? 0 : frame < 44 ? 1 : 2;
  const OPCIONES = ['TURNOS', 'CLONES', 'RESPAWN'];
  // Turno: el caballero avanza, golpea al slime y vuelve.
  const ataque = frame >= 4 && frame < 20 ? Math.sin(((frame - 4) / 16) * Math.PI) : 0;
  const golpeSlime = frame >= 10 && frame < 17;
  // Clones: dos copias translucidas que salen a los lados.
  const clon = opcion >= 1 ? res(frame, 25, fps, { damping: 10, stiffness: 200 }) * (opcion === 1 ? 1 : Math.max(0, 1 - (frame - 44) / 5)) : 0;
  // Respawn: el slime contraataca, la vida baja a 0, el caballero parpadea y desaparece, y vuelve con destellos.
  const vida = frame < 46 ? 1 : frame < 52 ? 1 - (frame - 46) / 6 : frame < 58 ? 0 : Math.min(1, (frame - 58) / 10);
  const muerto = frame >= 52 && frame < 58;
  const visible = !muerto && !(frame >= 48 && frame < 52 && frame % 2);
  const reaparece = frame >= 58 ? Math.min(1, (frame - 58) / 12) : 0;
  const kx = 170 + ataque * 330;
  const rotulo = opcion === 0 ? 'TU TURNO' : opcion === 1 ? '¡CLONES!' : frame < 58 ? 'GAME OVER?' : '¡RESPAWN! +1 VIDA';
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, #0B1426 0%, #241B3F 60%, #3A2458 100%)' }} />
      {/* Arena: piso a cuadros. */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 900, height: 250, background: 'repeating-linear-gradient(90deg, #2A2F4A 0 90px, #1E2238 90px 180px)', boxShadow: 'inset 0 10px 0 #454B6E' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 420, textAlign: 'center' }}>
        <span style={{ ...fuentePixel(30), color: PIXEL.oro, textShadow: sombraPixel(PIXEL.negro, 4) }}>{rotulo}</span>
      </div>
      {/* Barras de vida del caballero y del slime. */}
      <div style={{ position: 'absolute', left: 90, top: 520, display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ ...fuentePixel(18), color: '#F4EFE6', textShadow: sombraPixel(PIXEL.negro, 2) }}>PV</span>
        <div style={{ width: 300, height: 26, background: '#1A2238', border: '4px solid #F4EFE6' }}><div style={{ width: `${vida * 100}%`, height: '100%', background: vida > 0.4 ? PIXEL.xp : PIXEL.vida }} /></div>
      </div>
      <div style={{ position: 'absolute', right: 90, top: 520, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 300, height: 26, background: '#1A2238', border: '4px solid #F4EFE6' }}><div style={{ width: `${frame < 13 ? 100 : 55}%`, height: '100%', background: PIXEL.vida }} /></div>
        <span style={{ ...fuentePixel(18), color: '#F4EFE6', textShadow: sombraPixel(PIXEL.negro, 2) }}>PV</span>
      </div>
      {/* Slime enemigo: recibe el golpe y luego embiste. */}
      <div style={{ position: 'absolute', left: 690 + (golpeSlime ? 18 : 0) - (frame >= 44 && frame < 50 ? 60 : 0), top: 780 + Math.round(Math.sin(frame / 4) * 6), filter: golpeSlime ? 'brightness(2.2)' : undefined }}><Sprite fig={SLIME} px={20} /></div>
      {golpeSlime ? <div style={{ position: 'absolute', left: 700, top: 650 - (frame - 10) * 6, ...fuentePixel(40), color: '#F4EFE6', textShadow: sombraPixel(PIXEL.vida, 4) }}>-45</div> : null}
      {clon > 0 ? [-1, 1].map((d) => <div key={d} style={{ position: 'absolute', left: kx + d * 150 * clon, top: 724, opacity: 0.45 * clon }}><Sprite fig={CABALLERO} px={8} /></div>) : null}
      {visible ? <div style={{ position: 'absolute', left: kx, top: 724 - (reaparece > 0 ? (1 - reaparece) * 120 : 0), opacity: frame >= 58 ? reaparece : 1 }}><Sprite fig={ataque > 0.2 ? CABALLERO_SALTO : CABALLERO} px={8} /></div> : null}
      {/* Destellos del respawn. */}
      {frame >= 56 ? Array.from({ length: 10 }, (_, i) => { const k = (frame - 56 + i * 3) % 18; return <div key={i} style={{ position: 'absolute', left: kx + 10 + ((i * 37) % 120), top: 880 - k * 14, width: 12, height: 12, background: i % 2 ? PIXEL.oro : '#FFFFFF', opacity: 1 - k / 18 }} />; }) : null}
      {/* Menu de batalla con cursor. */}
      <div style={{ position: 'absolute', left: 90, top: 940 }}>
        <MarcoPixel ancho={900} alto={180} fondo="rgba(8,13,26,.92)" borde="#F4EFE6" relleno={22} estilo={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
          {OPCIONES.map((o, i) => <span key={o} style={{ ...fuentePixel(30), color: i === opcion ? PIXEL.oro : '#9AA4B4', textShadow: sombraPixel(PIXEL.negro, 3), whiteSpace: 'pre' }}>{(i === opcion ? '▶' : ' ') + o}</span>)}
        </MarcoPixel>
      </div>
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- mapa */
/**
 * Mecanicas, parte 2 (SOFA07: ver todo el mapa con un boton, teletransportarse, plataformeo): un mapa de mundo
 * visto desde arriba tapado por niebla. Se pulsa [M], la niebla se abre desde el jugador, aparece la ruta
 * punteada hasta la bandera y el caballero se teletransporta (columna de luz) al destino.
 */
export const Mapa = () => {
  const frame = useCurrentFrame();
  const T = 60, C = 15, F = 11, X0 = 90, Y0 = 470;
  const celdas = useMemo(() => Array.from({ length: C * F }, (_, k) => {
    const i = k % C, j = Math.floor(k / C);
    const agua = Math.hypot(i - 11.5, j - 2) < 2.6 || (j > 8 && i < 4);
    const bosque = !agua && random(`mb${k}`) > 0.72;
    return { i, j, tipo: agua ? 'agua' : bosque ? 'bosque' : 'pasto' };
  }), []);
  const ini = [2, 7], fin = [12, 8];
  const centro = [X0 + ini[0] * T + T / 2, Y0 + ini[1] * T + T / 2];
  const radio = frame < 14 ? 1.2 : Math.min(20, 1.2 + (frame - 14) * 0.55);
  const ruta = Math.min(1, Math.max(0, (frame - 36) / 16));
  const tele = frame >= 56 && frame < 66;
  const llego = frame >= 66;
  const pos = llego ? fin : ini;
  const px = X0 + pos[0] * T + T / 2, py = Y0 + pos[1] * T + T / 2;
  const pct = Math.round(Math.min(100, (radio / 16) * 100));
  const COLOR = { agua: '#2E86C1', bosque: '#2E7D32', pasto: '#58A84A' };
  const RELIEVE = { agua: 'inset 0 -8px 0 #1F6A9A', bosque: 'inset 14px 14px 0 #3E9A44, inset -10px -10px 0 #1F5E24', pasto: 'inset 0 -6px 0 #4A9040' };
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: '#0B1426' }} />
      <div style={{ position: 'absolute', left: 90, right: 90, top: 395, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ ...fuentePixel(22), color: '#0B1426', background: frame >= 6 && frame < 14 ? PIXEL.oro : '#F4EFE6', padding: '6px 12px', boxShadow: '4px 4px 0 rgba(0,0,0,.5)' }}>[M] MAPA</span>
        <span style={{ ...fuentePixel(22), color: PIXEL.xp, textShadow: sombraPixel(PIXEL.negro, 3) }}>EXPLORADO {pct}%</span>
      </div>
      {celdas.map((c) => {
        const cx = X0 + c.i * T + T / 2, cy = Y0 + c.j * T + T / 2;
        const ve = Math.hypot((cx - centro[0]) / T, (cy - centro[1]) / T) <= radio;
        return <div key={`${c.i}-${c.j}`} style={{ position: 'absolute', left: X0 + c.i * T, top: Y0 + c.j * T, width: T, height: T, background: ve ? COLOR[c.tipo] : '#141A2C', boxShadow: ve ? RELIEVE[c.tipo] : 'inset 0 0 0 2px #0F1424' }} />;
      })}
      {/* Ruta punteada del jugador a la bandera. */}
      {Array.from({ length: 14 }, (_, k) => k / 13).filter((p) => p <= ruta).map((p, k) => {
        const x = X0 + (ini[0] + (fin[0] - ini[0]) * p) * T + T / 2, y = Y0 + (ini[1] + (fin[1] - ini[1]) * p - Math.sin(p * Math.PI) * 3) * T + T / 2;
        return <div key={k} style={{ position: 'absolute', left: x - 7, top: y - 7, width: 14, height: 14, background: '#F4EFE6' }} />;
      })}
      {/* Bandera de destino. */}
      <div style={{ position: 'absolute', left: X0 + fin[0] * T + 26, top: Y0 + fin[1] * T - 70, opacity: radio > 9 ? 1 : 0 }}>
        <div style={{ width: 8, height: 90, background: '#F4EFE6' }} />
        <div style={{ position: 'absolute', left: 8, top: 0, width: 48, height: 32, background: PIXEL.vida, transform: `skewY(${Math.sin(frame / 4) * 6}deg)` }} />
      </div>
      {/* Columna de luz del teletransporte: se apaga en el origen y se enciende en el destino. */}
      {tele ? [ini, fin].map(([i, j], k) => <div key={k} style={{ position: 'absolute', left: X0 + i * T + 4, top: 380, width: T - 8, height: Y0 + j * T + T - 380, background: `linear-gradient(180deg, rgba(91,192,248,0) 0%, ${conAlfa('#9FE3FF', 0.85)} 100%)`, opacity: k === 0 ? 1 - (frame - 56) / 10 : (frame - 56) / 10 }} />) : null}
      {!tele ? <div style={{ position: 'absolute', left: px - 32, top: py - 92 - (llego ? Math.max(0, 1 - (frame - 66) / 6) * 40 : 0) }}><Sprite fig={CABALLERO} px={4} /></div> : null}
      {!llego ? <div style={{ position: 'absolute', left: px - 100, top: py + 20, width: 200, textAlign: 'center', ...fuentePixel(14), color: '#F4EFE6', textShadow: sombraPixel(PIXEL.negro, 2), opacity: Math.floor(frame / 8) % 2 ? 1 : 0.4 }}>ESTÁS AQUÍ</div> : null}
      {llego ? <div style={{ position: 'absolute', left: px - 200, top: py + 22, width: 320, textAlign: 'center', ...fuentePixel(18), color: PIXEL.oro, textShadow: sombraPixel(PIXEL.negro, 3) }}>¡TELETRANSPORTE!</div> : null}
    </AbsoluteFill>
  );
};

/* -------------------------------------------------------------- espejo */
// Trajes del reflejo: cada uno con el rasgo que dijo un entrevistado de SOFA02 (Hollow Knight, Aurora, Von Lycaon,
// la Estatua de Dios). Son colores del caballero, no los personajes: nada de arte de las franquicias.
const TRAJES = [
  { rasgo: 'PERSEVERANCIA', pal: { m: '#F4EFE6', M: '#9AA4B4', r: '#1A1E2A', R: '#0A0D16', g: '#F4EFE6' } },
  { rasgo: 'SOLEDAD', pal: { m: '#C9B6F2', M: '#7E5BC2', r: '#B388FF', R: '#6B48B0', g: '#F2C85B' } },
  { rasgo: 'RESPETO', pal: { m: '#3A3F4E', M: '#1E2230', r: '#F2C85B', R: '#C9962B', g: '#F4EFE6' } },
  { rasgo: 'RISA MACABRA', pal: { m: '#B8B4A8', M: '#7E7A70', r: '#9A968C', R: '#6E6A60', g: '#E8323C' } },
];
/**
 * ¿En que te pareces a tu personaje?, parte 1 (SOFA02; el tema del SOFA 2026 fue la identidad): el caballero frente
 * a un espejo. El reflejo cambia de traje con cada rasgo que dijeron los entrevistados y la barra de coincidencia
 * sube; al final el reflejo es el mismo caballero: COINCIDENCIA 100 %. Juan David, 13-oct: "algo mas creativo como
 * las del 6 y 7, adaptado al contexto del video".
 */
export const Espejo = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const final = frame >= 60;
  const traje = TRAJES[Math.min(3, Math.floor(frame / 15))];
  const reflejo = final ? CABALLERO : { ...CABALLERO, pal: { ...CABALLERO.pal, ...traje.pal } };
  // El cambio de traje es un parpadeo de 2 cuadros, como un cambio de equipo en un RPG.
  const cambio = !final && frame % 15 < 2 && frame > 2;
  const coincide = Math.min(100, Math.round((frame / 60) * 100));
  const golpe = final ? res(frame, 60, fps, { damping: 8, stiffness: 260 }) : 0;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, #0B1426 0%, #2A1B3F 65%, #3A2458 100%)' }} />
      <Suelo y={1090} alto={60} color="#4A2E5A" oscuro="#2E1B3A" tapa="#7E5BC2" />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 410, textAlign: 'center' }}>
        <span style={{ ...fuentePixel(28), color: PIXEL.oro, textShadow: sombraPixel(PIXEL.negro, 4) }}>{final ? '¡ERES TÚ!' : traje.rasgo}</span>
      </div>
      {/* Jugador frente al espejo. */}
      <div style={{ position: 'absolute', left: 130, top: 870 }}><Sprite fig={CABALLERO} px={10} /></div>
      {/* Espejo: marco dorado escalonado y cristal con un brillo diagonal. */}
      <div style={{ position: 'absolute', left: 540, top: 500, width: 400, height: 590, background: '#C9962B', boxShadow: 'inset 0 0 0 10px #F2C85B, inset 0 0 0 20px #8A5A12, 10px 10px 0 rgba(0,0,0,.45)' }}>
        <div style={{ position: 'absolute', inset: 26, background: 'linear-gradient(180deg, #9FE3FF 0%, #5BC0F8 55%, #2E86C1 100%)', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: -80 + ((frame * 9) % 600), top: -40, width: 46, height: 700, background: 'rgba(255,255,255,.35)', transform: 'rotate(24deg)' }} />
          <div style={{ position: 'absolute', left: 94, top: 300, filter: cambio ? 'brightness(3)' : undefined, transform: `scale(${1 + 0.08 * golpe})`, transformOrigin: '50% 100%' }}><Sprite fig={reflejo} px={10} espejo /></div>
        </div>
      </div>
      {/* Destellos al coincidir. */}
      {final ? Array.from({ length: 12 }, (_, i) => { const k = (frame - 60 + i * 2) % 20; return <div key={i} style={{ position: 'absolute', left: 560 + ((i * 61) % 360), top: 1040 - k * 26, width: 12, height: 12, background: i % 2 ? PIXEL.oro : '#FFFFFF', opacity: 1 - k / 20 }} />; }) : null}
      {/* Barra de coincidencia. */}
      <div style={{ position: 'absolute', left: 90, top: 1110, display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ ...fuentePixel(20), color: '#F4EFE6', textShadow: sombraPixel(PIXEL.negro, 2) }}>COINCIDENCIA</span>
        <div style={{ width: 420, height: 26, background: '#1A2238', border: '4px solid #F4EFE6' }}><div style={{ width: `${coincide}%`, height: '100%', background: final ? PIXEL.xp : PIXEL.magia }} /></div>
        <span style={{ ...fuentePixel(20), color: final ? PIXEL.xp : '#F4EFE6', textShadow: sombraPixel(PIXEL.negro, 2) }}>{coincide}%</span>
      </div>
    </AbsoluteFill>
  );
};

export const INTROS = { protesto: Protesto, tesoro: Tesoro, plataformas: Plataformas, torneo: Torneo, tienda: Tienda, cartuchos: Cartuchos, arcade: Arcade, poderes: Poderes, mapa: Mapa, espejo: Espejo };
