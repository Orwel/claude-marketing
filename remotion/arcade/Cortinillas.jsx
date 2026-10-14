import React, { useMemo } from 'react';
import { AbsoluteFill, Img, random, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { fuente } from '../fuentes.js';
import { useMarca } from '../marca.js';
import { conAlfa } from '../util.js';
import { acentoDe, cieloDe, MUNDOS } from './Mundos.jsx';
import { BarraPixel, fuentePixel, IconoPixel, MarcoPixel, PIXEL, sombraPixel } from './Pixel.jsx';
import { CABALLERO, CABALLERO_SALTO, NUBE, Sprite } from './Sprites.jsx';

/**
 * Cortinillas entre entrevistas (SOFA, 13-oct-2026). Juan David sobre el mapa
 * voxel: "te quedaste en el mismo concepto estilo minecraft medio feo... varialas
 * de verdad, de concepto, algo que se entienda, no solo un muñeco saltando".
 * Cada estilo es un recurso de videojuego que la gente reconoce y usa al
 * personaje que viene (`prox`: ficha, retrato, color, mundo) o al que acaba de
 * hablar (`prev`):
 *
 *  vs         pantalla de versus de juego de pelea: quien habló contra quien viene
 *  seleccion  "elige tu personaje": cuadricula con los retratos, el cursor va al siguiente
 *  encuentro  "¡un X salvaje apareció!": el retrato entra sobre su mundo
 *  mundo2d    "NIVEL N": paisaje pixel 2D del mundo del personaje y el caballero corriendo
 *  jefe       aviso de jefe: franjas rojas, el retrato tiembla, barra de vida del jefe
 *  resultado  "STAGE CLEAR": resumen de la respuesta anterior y puntos, y quien sigue
 *  mision     registro de misiones: objetivo, lugar y recompensa escribiendose
 */
const escalonado = (a, pasos = 4) => Math.round(Math.min(1, Math.max(0, a)) * pasos) / pasos;
const res = (frame, desde, fps, config = { damping: 12, stiffness: 220 }) => Math.min(1, Math.max(0, spring({ frame: frame - desde, fps, config })));
const nombreDe = (p) => (p?.personaje?.anonimo ? `PLAYER ${p.jugador ?? 2}` : (p?.personaje?.nombre ?? 'JUAN DAVID').toUpperCase());

/** Retrato pixel en marco; sin retrato, el caballero del Claustro (Juan David) o una estrella. */
const Retrato = ({ p, tamano = 220, borde = '#F4EFE6' }) => (
  <div style={{ width: tamano, height: tamano * 1.13, background: '#1A2238', border: `6px solid ${borde}`, boxSizing: 'border-box', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', imageRendering: 'pixelated', boxShadow: '8px 8px 0 rgba(0,0,0,.5)' }}>
    {p?.retrato ? <Img src={staticFile(p.retrato)} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} /> : p?.personaje?.nombre === 'Juan David' || !p ? <Sprite fig={CABALLERO} px={Math.round(tamano / 18)} /> : <IconoPixel nombre="estrella" tamano={tamano * 0.6} />}
  </div>
);

/* ------------------------------------------------------------------ vs */
export const Versus = ({ e }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const izq = e.prev ?? { personaje: { nombre: 'Juan David', clase: 'Legal engineer', color: marca.colores.acento } };
  const der = e.prox;
  const a = escalonado(res(frame, 2, fps, { damping: 14, stiffness: 200 }), 5);
  const b = escalonado(res(frame, 8, fps, { damping: 14, stiffness: 200 }), 5);
  const vs = res(frame, 18, fps, { damping: 6, stiffness: 300 });
  const flash = frame >= 20 && frame < 24;
  const cIzq = izq.personaje?.color ?? marca.colores.acento;
  const cDer = der?.personaje?.color ?? PIXEL.cielo;
  return (
    <AbsoluteFill style={{ background: '#0B1426' }}>
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(115deg, ${conAlfa(cIzq, 0.55)} 0%, ${conAlfa(cIzq, 0.55)} 48%, #F4EFE6 48%, #F4EFE6 52%, ${conAlfa(cDer, 0.55)} 52%, ${conAlfa(cDer, 0.55)} 100%)` }} />
      {flash ? <AbsoluteFill style={{ background: '#FFFFFF', opacity: 0.8 }} /> : null}
      <div style={{ position: 'absolute', left: 70 - (1 - a) * 300, top: 480, display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'flex-start' }}>
        <Retrato p={izq} tamano={300} borde={cIzq} />
        <div style={{ ...fuentePixel(24), color: '#F4EFE6', textShadow: sombraPixel(PIXEL.negro, 3) }}>{nombreDe(izq)}</div>
        <div style={{ ...fuentePixel(13), color: cIzq }}>{(izq.personaje?.clase ?? '').toUpperCase()}</div>
      </div>
      <div style={{ position: 'absolute', right: 70 - (1 - b) * 300, top: 980, display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'flex-end' }}>
        <Retrato p={der} tamano={300} borde={cDer} />
        <div style={{ ...fuentePixel(24), color: '#F4EFE6', textShadow: sombraPixel(PIXEL.negro, 3), textAlign: 'right' }}>{nombreDe(der)}</div>
        <div style={{ ...fuentePixel(13), color: cDer, textAlign: 'right' }}>{(der?.personaje?.clase ?? '').toUpperCase()}</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 860, textAlign: 'center', transform: `scale(${0.4 + 0.6 * vs}) rotate(${-8 + 8 * vs}deg)`, opacity: vs }}>
        <span style={{ ...fuentePixel(120), color: PIXEL.oro, textShadow: sombraPixel(PIXEL.vida, 10) }}>VS</span>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1500, textAlign: 'center', ...fuentePixel(26), color: '#F4EFE6', textShadow: sombraPixel(PIXEL.negro, 3), opacity: frame > 30 ? (Math.floor(frame / 8) % 2 ? 0.4 : 1) : 0 }}>ROUND {e.numero ?? 2} · {e.nombre?.toUpperCase() ?? 'FIGHT!'}</div>
    </AbsoluteFill>
  );
};

/* ----------------------------------------------------------- seleccion */
export const Seleccion = ({ e }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const todos = e.todos ?? [];
  const objetivo = Math.max(0, todos.findIndex((p) => p.personaje?.nombre === e.prox?.personaje?.nombre));
  const origen = Math.max(0, todos.findIndex((p) => p.personaje?.nombre === e.prev?.personaje?.nombre));
  // El cursor camina casilla a casilla cada 8 cuadros desde el anterior al siguiente.
  const pasos = Math.abs(objetivo - origen);
  const avance = Math.min(pasos, Math.floor(Math.max(0, frame - 6) / 8));
  const sel = origen + Math.sign(objetivo - origen) * avance;
  const elegido = frame > 6 + pasos * 8 + 6;
  const cols = 3;
  const ancho = 300, alto = 340, gap = 24;
  const x0 = (1080 - (cols * ancho + (cols - 1) * gap)) / 2;
  const y0 = 560;
  const a = escalonado(res(frame, 0, fps), 5);
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #0B1426 0%, #1C2B4A 100%)' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 420, textAlign: 'center', ...fuentePixel(30), color: PIXEL.oro, textShadow: sombraPixel(PIXEL.negro, 4), opacity: a }}>ELIGE TU PERSONAJE</div>
      {todos.map((p, i) => {
        const cx = x0 + (i % cols) * (ancho + gap);
        const cy = y0 + Math.floor(i / cols) * (alto + gap);
        const activo = i === sel;
        const entra = escalonado(res(frame, i * 3, fps), 4);
        return (
          <div key={i} style={{ position: 'absolute', left: cx, top: cy, width: ancho, height: alto, opacity: entra, transform: `scale(${activo && elegido ? 1.06 : 1})`, background: activo ? conAlfa(p.personaje?.color ?? marca.colores.acento, 0.35) : 'rgba(8,13,26,.85)', border: `6px solid ${activo ? PIXEL.oro : '#F4EFE6'}`, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, boxShadow: activo ? `0 0 0 6px ${conAlfa(PIXEL.oro, 0.35)}` : '6px 6px 0 rgba(0,0,0,.45)' }}>
            <Retrato p={p} tamano={170} borde={p.personaje?.color ?? '#F4EFE6'} />
            <div style={{ ...fuentePixel(12), color: '#F4EFE6', textAlign: 'center', lineHeight: 1.5, padding: '0 10px' }}>{nombreDe(p)}</div>
          </div>
        );
      })}
      {/* Marco del jugador seleccionado abajo, con su nombre grande y PLAYER N READY. */}
      <div style={{ position: 'absolute', left: 50, width: 980, top: 1330, opacity: elegido ? 1 : 0.6 }}>
        <MarcoPixel ancho={980} alto={150} fondo="rgba(8,13,26,.92)" borde="#F4EFE6" interior={conAlfa(e.prox?.personaje?.color ?? marca.colores.acento, 0.6)} relleno={22} estilo={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ ...fuentePixel(24), color: e.prox?.personaje?.color ?? marca.colores.acento, textShadow: sombraPixel(PIXEL.negro, 3) }}>{nombreDe(todos[sel])}</div>
            <div style={{ ...fuentePixel(12), color: '#A7ADBA', marginTop: 10 }}>{(todos[sel]?.personaje?.clase ?? '').toUpperCase()}</div>
          </div>
          <div style={{ ...fuentePixel(16), color: PIXEL.xp, opacity: elegido ? (Math.floor(frame / 6) % 2 ? 0.3 : 1) : 0 }}>PLAYER {todos[sel]?.jugador ?? 2} READY</div>
        </MarcoPixel>
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------- mundo2d */
/** Siluetas pixel 2D del decorado de cada mundo, hechas de divs (bloques), sobre el cielo del mundo. */
const Decorado2D = ({ mundo, frame }) => {
  const m = MUNDOS[mundo] ?? MUNDOS.pradera;
  const bloques = useMemo(() => {
    const b = [];
    const add = (x, y, w, h, color) => b.push({ x, y, w, h, color });
    const base = 1130;
    if (mundo === 'ciudad') for (let i = 0; i < 9; i++) { const h = 180 + random(`c${i}`) * 300, w = 100; add(i * 120, base - h, w, h, i % 2 ? '#3A3A42' : '#2E2E36'); for (let y = base - h + 20; y < base - 20; y += 40) for (let x = i * 120 + 14; x < i * 120 + w - 14; x += 34) if (random(`v${i}${x}${y}`) > 0.45) add(x, y, 16, 22, '#FFD88A'); }
    if (mundo === 'mazmorra') for (let i = 0; i < 7; i++) { add(40 + i * 160, base - 420, 60, 420, i % 2 ? '#4A4652' : '#3C3844'); add(40 + i * 160 + 14, base - 300, 32, 32, '#FF8A2A'); }
    if (mundo === 'fuego') { for (let i = 0; i < 12; i++) add(100 + i * 70, base - 60 - i * (i < 6 ? 55 : 0) + (i >= 6 ? (i - 6) * 55 : 0), 70, 60 + (i < 6 ? i * 55 : (11 - i) * 55), '#2E2424'); add(430, base - 410, 200, 40, '#FF7A1A'); for (let i = 0; i < 8; i++) add(80 + i * 130, base - 24, 50, 24, '#FF7A1A'); }
    if (mundo === 'hielo') for (let i = 0; i < 8; i++) { const h = 120 + random(`h${i}`) * 260; add(60 + i * 130, base - h, 50, h, i % 2 ? '#9FE3FF' : '#DCEBFF'); add(60 + i * 130 + 14, base - h - 30, 22, 30, '#FFFFFF'); }
    if (mundo === 'bosque') for (let i = 0; i < 8; i++) { const h = 200 + random(`a${i}`) * 180; add(60 + i * 135, base - h, 40, h, '#4A3220'); add(60 + i * 135 - 50, base - h - 80, 140, 120, '#2E8B3C'); add(60 + i * 135 - 20, base - h - 130, 80, 60, '#3FA74C'); }
    if (mundo === 'terror') { for (let i = 0; i < 7; i++) { add(80 + i * 150, base - 90, 60, 90, '#6E6A78'); add(80 + i * 150 + 10, base - 110, 40, 20, '#8A8694'); } add(760, 480, 120, 120, '#FFF4C8'); }
    if (mundo === 'espacio') { for (let i = 0; i < 40; i++) add(random(`sx${i}`) * 1080, 380 + random(`sy${i}`) * 600, 8, 8, '#FFFFFF'); add(700, 520, 200, 200, '#C8B8FF'); add(700, 620, 200, 100, '#8C78C8'); for (let i = 0; i < 9; i++) add(60 + i * 115, base - 40 - random(`r${i}`) * 60, 100, 100, '#5A4C7A'); }
    if (mundo === 'digital') { for (let x = 0; x < 1080; x += 90) add(x, 500, 4, 630, conAlfa(m.acento, 0.5)); for (let y = 500; y < base; y += 90) add(0, y, 1080, 4, conAlfa(m.acento, 0.5)); for (let i = 0; i < 6; i++) { const h = 140 + random(`d${i}`) * 260; add(90 + i * 165, base - h, 70, h, '#0EA5E9'); add(90 + i * 165, base - h - 20, 70, 20, '#BAE6FD'); } }
    if (mundo === 'muro') { add(0, base - 420, 1080, 420, '#8A7A5A'); for (let y = base - 420; y < base; y += 60) for (let x = (y / 60) % 2 ? 60 : 0; x < 1080; x += 120) add(x, y, 118, 58, '#766848'); for (let x = 0; x < 1080; x += 120) add(x, base - 460, 80, 40, '#5A4A30'); }
    if (mundo === 'oro') for (let i = 0; i < 10; i++) { const h = 60 + random(`o${i}`) * 160; add(40 + i * 104, base - h, 90, h, i % 2 ? '#F2C85B' : '#C9962B'); }
    if (mundo === 'claustro') { for (let i = 0; i < 6; i++) { add(60 + i * 170, base - 360, 50, 360, '#E9DCC8'); add(60 + i * 170 + 50, base - 360, 120, 50, '#D8C8A8'); } add(0, base - 420, 1080, 60, '#B3202E'); }
    if (mundo === 'pradera') { add(240, base - 260, 600, 260, '#E8ECF2'); add(200, base - 300, 680, 40, '#9AA3B2'); for (let i = 0; i < 5; i++) add(290 + i * 110, base - 200, 60, 80, '#5BC0F8'); }
    return b;
  }, [mundo]);
  return (
    <>
      {mundo !== 'espacio' && mundo !== 'digital' ? [[60, 420], [560, 470], [900, 400]].map(([cx, cy], i) => <div key={`n${i}`} style={{ position: 'absolute', left: ((cx + frame * 0.5 + i * 60) % 1300) - 150, top: cy, opacity: 0.35 }}><Sprite fig={NUBE} px={8} /></div>) : null}
      {bloques.map((b, i) => <div key={i} style={{ position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h, background: b.color }} />)}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1130, height: 70, background: `repeating-linear-gradient(90deg, ${m.suelo[0]} 0 54px, ${m.suelo[1]} 54px 60px)`, boxShadow: `inset 0 -10px 0 ${m.tierra}` }} />
    </>
  );
};

/* ----------------------------------------------------------- encuentro */
export const Encuentro = ({ e }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const mundo = e.mundo ?? 'pradera';
  const m = MUNDOS[mundo] ?? MUNDOS.pradera;
  const flash = frame < 6;
  const entra = escalonado(res(frame, 6, fps, { damping: 13, stiffness: 160 }), 6);
  const texto = `¡${nombreDe(e.prox)} SALVAJE APARECIÓ!`;
  const letras = Math.min(texto.length, Math.floor(Math.max(0, frame - 16) * 1.6));
  return (
    <AbsoluteFill style={{ background: cieloDe(mundo) }}>
      {flash ? <AbsoluteFill style={{ background: '#FFFFFF', opacity: 1 - frame / 6 }} /> : null}
      {/* Paisaje pixel del mundo del personaje y una plataforma donde para. */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.8 }}><Decorado2D mundo={mundo} frame={frame} /></div>
      <div style={{ position: 'absolute', left: 90, width: 900, top: 1060, height: 120, background: m.suelo[0], clipPath: 'polygon(8% 0, 92% 0, 100% 50%, 92% 100%, 8% 100%, 0 50%)', boxShadow: `inset 0 -30px 0 ${m.suelo[1]}` }} />
      <div style={{ position: 'absolute', left: 540 - 210 + (1 - entra) * 600, top: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <Retrato p={e.prox} tamano={420} borde={e.prox?.personaje?.color ?? m.acento} />
      </div>
      <div style={{ position: 'absolute', left: 50, width: 980, top: 1260 }}>
        <MarcoPixel ancho={980} alto={230} fondo="rgba(8,13,26,.92)" borde="#F4EFE6" interior={conAlfa(m.acento, 0.6)} relleno={26}>
          <div style={{ ...fuente(marca.fuentes.enfasis), fontSize: 50, lineHeight: 1.2, color: '#F4EFE6' }}>{texto.slice(0, letras)}</div>
          <div style={{ ...fuentePixel(14), color: m.acento, marginTop: 14, opacity: letras >= texto.length ? 1 : 0 }}>{(e.prox?.personaje?.clase ?? '').toUpperCase()}</div>
          {letras >= texto.length ? <div style={{ position: 'absolute', right: 26, bottom: 14, opacity: Math.floor(frame / 9) % 2 ? 0.2 : 1 }}><IconoPixel nombre="flecha" tamano={30} /></div> : null}
        </MarcoPixel>
      </div>
    </AbsoluteFill>
  );
};

export const Mundo2D = ({ e }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mundo = e.mundo ?? 'pradera';
  const m = MUNDOS[mundo] ?? MUNDOS.pradera;
  // 0,7 s de tarjeta negra "NIVEL N" (como el "WORLD 1-1") y luego se abre el mundo con el caballero corriendo.
  const tarjeta = frame < 22;
  const abre = Math.min(1, Math.max(0, (frame - 22) / 8));
  const x = -100 + (frame - 22) * 11;
  const salto = frame > 48 && frame < 62;
  const a = escalonado(res(frame, 2, fps), 4);
  return (
    <AbsoluteFill style={{ background: tarjeta ? '#0A0D16' : cieloDe(mundo) }}>
      {!tarjeta ? <Decorado2D mundo={mundo} frame={frame} /> : null}
      {!tarjeta ? <div style={{ position: 'absolute', left: x, top: 1130 - 176 - (salto ? Math.sin(Math.PI * (frame - 48) / 14) * 180 : 0) }}><Sprite fig={salto ? CABALLERO_SALTO : CABALLERO} px={8} /></div> : null}
      {!tarjeta ? <AbsoluteFill style={{ background: '#0A0D16', opacity: 1 - abre }} /> : null}
      <div style={{ position: 'absolute', left: 0, right: 0, top: tarjeta ? 760 : 420, textAlign: 'center', transform: `scale(${a})` }}>
        <div style={{ ...fuentePixel(tarjeta ? 72 : 54), color: '#F4EFE6', textShadow: sombraPixel(acentoDe(mundo), 7) }}>NIVEL {e.numero ?? 1}</div>
        {e.nombre ? <div style={{ ...fuentePixel(24), color: PIXEL.oro, textShadow: sombraPixel(PIXEL.negro, 3), marginTop: 26 }}>{e.nombre.toUpperCase()}</div> : null}
        {tarjeta ? <div style={{ marginTop: 50, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20 }}><Sprite fig={CABALLERO} px={5} /><span style={{ ...fuentePixel(26), color: '#F4EFE6' }}>× {e.vidas ?? 3}</span></div> : null}
      </div>
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- jefe */
export const Jefe = ({ e }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tiembla = Math.sin(frame * 2.7) * 6;
  const entra = escalonado(res(frame, 4, fps, { damping: 9, stiffness: 240 }), 5);
  const vida = Math.min(1, Math.max(0, (frame - 24) / 24));
  const rojo = Math.floor(frame / 6) % 2;
  const color = e.prox?.personaje?.color ?? PIXEL.vida;
  return (
    <AbsoluteFill style={{ background: '#0A0D16' }}>
      {/* Franjas de advertencia que corren en diagonal, arriba y abajo. */}
      {[380, 1480].map((y) => <div key={y} style={{ position: 'absolute', left: -200, right: -200, top: y, height: 70, background: `repeating-linear-gradient(45deg, ${PIXEL.vida} 0 60px, #0A0D16 60px 120px)`, backgroundPosition: `${frame * 6}px 0`, opacity: 0.9 }} />)}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 470, textAlign: 'center', ...fuentePixel(44), color: rojo ? PIXEL.vida : '#F4EFE6', textShadow: sombraPixel(rojo ? '#5A0E13' : PIXEL.vida, 6) }}>¡JEFE A LA VISTA!</div>
      <AbsoluteFill style={{ background: conAlfa(PIXEL.vida, rojo ? 0.12 : 0.04) }} />
      <div style={{ position: 'absolute', left: 540 - 190 + tiembla, top: 600, transform: `scale(${0.6 + 0.4 * entra})`, opacity: entra }}>
        <Retrato p={e.prox} tamano={380} borde={color} />
      </div>
      <div style={{ position: 'absolute', left: 90, width: 900, top: 1080 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <span style={{ ...fuentePixel(26), color: '#F4EFE6', textShadow: sombraPixel(PIXEL.negro, 3) }}>{nombreDe(e.prox)}</span>
          <span style={{ ...fuentePixel(14), color: color }}>{(e.prox?.personaje?.clase ?? '').toUpperCase()}</span>
        </div>
        <BarraPixel valor={vida} ancho={900} alto={36} color={PIXEL.vida} segmentos={20} />
        <div style={{ ...fuentePixel(14), color: '#A7ADBA', marginTop: 12 }}>HP {Math.round(vida * 9999).toString().padStart(4, '0')} / 9999</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1300, textAlign: 'center', ...fuentePixel(22), color: PIXEL.oro, textShadow: sombraPixel(PIXEL.negro, 3), opacity: frame > 40 ? 1 : 0 }}>NIVEL {e.numero ?? 2} · {(e.nombre ?? '').toUpperCase()}</div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------ resultado */
export const Resultado = ({ e }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const a = escalonado(res(frame, 2, fps, { damping: 9, stiffness: 260 }), 5);
  const filas = [['RESPUESTA', (e.prev?.personaje?.resumen ?? '').toUpperCase(), null], ['BONUS DE COSPLAY', '', '+250'], ['RESPUESTA ÉPICA', '', '+500']];
  const total = Math.min(750, Math.floor(Math.max(0, frame - 22) * 40));
  const sigue = res(frame, 40, fps);
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #0B1426 0%, #1C2B4A 100%)' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 440, textAlign: 'center', transform: `scale(${a})` }}>
        <div style={{ ...fuentePixel(56), color: PIXEL.xp, textShadow: sombraPixel('#1B5E20', 6) }}>STAGE CLEAR</div>
      </div>
      <div style={{ position: 'absolute', left: 50, width: 980, top: 600 }}>
        <MarcoPixel ancho={980} alto={470} fondo="rgba(8,13,26,.92)" borde="#F4EFE6" interior={conAlfa(marca.colores.acento, 0.6)} relleno={30}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 22 }}>
            <Retrato p={e.prev} tamano={110} borde={e.prev?.personaje?.color ?? '#F4EFE6'} />
            <div>
              <div style={{ ...fuentePixel(22), color: e.prev?.personaje?.color ?? marca.colores.acento, textShadow: sombraPixel(PIXEL.negro, 3) }}>{nombreDe(e.prev)}</div>
              <div style={{ ...fuentePixel(12), color: '#A7ADBA', marginTop: 8 }}>{(e.prev?.personaje?.clase ?? '').toUpperCase()}</div>
            </div>
          </div>
          {filas.map(([k, v, pts], i) => {
            const f = escalonado(res(frame, 14 + i * 8, fps), 4);
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, marginBottom: 16, opacity: f, transform: `translateX(${(1 - f) * -20}px)` }}>
                <span style={{ ...fuentePixel(14), color: '#A7ADBA', flex: 'none' }}>{k}</span>
                {v ? <span style={{ ...fuentePixel(16), color: '#F4EFE6', textAlign: 'right', lineHeight: 1.5 }}>{v}</span> : null}
                {pts ? <span style={{ ...fuentePixel(20), color: PIXEL.oro, flex: 'none' }}>{pts}</span> : null}
              </div>
            );
          })}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '4px solid rgba(244,239,230,.25)', paddingTop: 16 }}>
            <span style={{ ...fuentePixel(16), color: '#F4EFE6' }}>TOTAL</span>
            <span style={{ ...fuentePixel(32), color: PIXEL.oro, textShadow: sombraPixel(PIXEL.negro, 3) }}>{String(total).padStart(6, '0')}</span>
          </div>
        </MarcoPixel>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1300, textAlign: 'center', opacity: sigue, transform: `translateY(${(1 - sigue) * 16}px)` }}>
        <span style={{ ...fuentePixel(18), color: '#A7ADBA' }}>SIGUE: </span>
        <span style={{ ...fuentePixel(22), color: '#F4EFE6', textShadow: sombraPixel(PIXEL.negro, 3) }}>{nombreDe(e.prox)}</span>
      </div>
    </AbsoluteFill>
  );
};

/* -------------------------------------------------------------- mision */
export const Mision = ({ e }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const a = escalonado(res(frame, 2, fps), 5);
  const lineas = [['OBJETIVO', `Hablar con ${e.prox?.personaje?.anonimo ? `PLAYER ${e.prox.jugador ?? 2}` : e.prox?.personaje?.nombre ?? 'el siguiente'}`], ['LUGAR', e.nombre ?? 'Corferias'], ['RECOMPENSA', '+100 XP · una respuesta']];
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #0B1426 0%, #1C2B4A 100%)' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 440, textAlign: 'center', transform: `scale(${a})` }}>
        <div style={{ ...fuentePixel(40), color: PIXEL.oro, textShadow: sombraPixel(PIXEL.negro, 5) }}>NUEVA MISIÓN</div>
        <div style={{ ...fuentePixel(16), color: '#A7ADBA', marginTop: 16 }}>NIVEL {e.numero ?? 2}</div>
      </div>
      <div style={{ position: 'absolute', left: 50, width: 980, top: 620 }}>
        <MarcoPixel ancho={980} alto={500} fondo="#E9D8A6" borde="#8B5A2B" interior="#C8A070" relleno={34}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 26 }}>
            <Retrato p={e.prox} tamano={120} borde="#5A3A1A" />
            <div style={{ ...fuentePixel(20), color: '#3A2210', lineHeight: 1.5 }}>{nombreDe(e.prox)}</div>
          </div>
          {lineas.map(([k, v], i) => {
            const desde = 18 + i * 10;
            const letras = Math.min(v.length, Math.floor(Math.max(0, frame - desde) * 1.4));
            return (
              <div key={i} style={{ display: 'flex', gap: 20, alignItems: 'baseline', marginBottom: 22, opacity: frame >= desde ? 1 : 0 }}>
                <span style={{ ...fuentePixel(13), color: '#8B5A2B', width: 190, flex: 'none' }}>{k}</span>
                <span style={{ ...fuente(marca.fuentes.enfasis), fontSize: 38, color: '#3A2210', lineHeight: 1.2 }}>{v.slice(0, letras)}<span style={{ opacity: letras < v.length && Math.floor(frame / 4) % 2 ? 1 : 0 }}>▌</span></span>
              </div>
            );
          })}
          <div style={{ position: 'absolute', right: 34, bottom: 26, display: 'flex', alignItems: 'center', gap: 12, opacity: frame > 56 ? 1 : 0 }}>
            <div style={{ width: 28, height: 28, border: '4px solid #3A2210', background: frame > 60 ? PIXEL.xp : 'transparent' }} />
            <span style={{ ...fuentePixel(13), color: '#3A2210' }}>ACEPTADA</span>
          </div>
        </MarcoPixel>
      </div>
    </AbsoluteFill>
  );
};

export const CORTINILLAS = { vs: Versus, seleccion: Seleccion, encuentro: Encuentro, mundo2d: Mundo2D, jefe: Jefe, resultado: Resultado, mision: Mision };
