import React from 'react';
import { AbsoluteFill, Audio, interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Firma } from '../componentes/Firma.jsx';
import { fuente, useFuentes } from '../fuentes.js';
import { entra } from '../kit/movimiento.js';
import { ContextoMarca } from '../marca.js';
import { conAlfa, partirPalabras, tramosDe } from '../util.js';

/**
 * Plantilla Tinta: una historia narrada (voz clonada + musica ya mezcladas en `pieza.audio`)
 * contada con ilustraciones a tinta sobre papel que se dibujan trazo a trazo. Referencia:
 * el grabado del pin #2 de referencias/pinterest-2026-11.md, hecho aqui en SVG, sin imagenes.
 *
 * - `escenas[]`: { tipo, segundos, ...tiempos locales } con tipo pluma | arresto | escalera |
 *   puerta | revelacion | pregunta. Son dibujos genericos; la historia la ponen las frases.
 * - `frases[]`: { desde, hasta, texto } en segundos del audio. Una sola zona de texto arriba:
 *   cada palabra dicha sale en pantalla (mucha gente ve sin sonido). `*enfasis*` subraya.
 * - `paleta`: papel y tinta. El acento de la marca no aparece hasta `acentoDesde` (segundos):
 *   el primer color del video llega cuando la puerta se abre.
 */
export const Tinta = ({ pieza, marca }) => (
  <ContextoMarca.Provider value={marca}>
    <Lienzo pieza={pieza} marca={marca} />
  </ContextoMarca.Provider>
);

const ESCENAS = {};

const Lienzo = ({ pieza, marca }) => {
  useFuentes();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const p = { ...PALETA, ...(pieza.paleta ?? {}), acento: marca.colores.acento };
  const tramos = tramosDe(pieza, fps);
  const actual = tramos.find((x) => frame >= x.inicio && frame < x.fin) ?? tramos.at(-1);
  const local = frame - actual.inicio;
  const Dibujo = ESCENAS[actual.tipo];
  const seg = frame / fps;
  const oscuro = actual.escena.oscuro ? interpolate(local, actual.escena.oscuro.map((s) => s * fps), [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
  const empujon = 1 + 0.06 * (local / (actual.fin - actual.inicio));
  const conAcento = seg >= (pieza.acentoDesde ?? Infinity);
  return (
    <AbsoluteFill style={{ background: p.papel, overflow: 'hidden' }}>
      {pieza.audio ? <Audio src={staticFile(pieza.audio)} /> : null}
      <Papel p={p} ancho={width} alto={height} />
      <AbsoluteFill style={{ transform: `scale(${empujon})`, transformOrigin: '50% 62%' }}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <Patrones p={p} />
          {Dibujo ? <Dibujo e={actual.escena} f={local} fps={fps} p={p} total={actual.fin - actual.inicio} /> : null}
        </svg>
      </AbsoluteFill>
      {/* Negro de tinta que cae sobre todo cuando la escena lo pide (la puerta que se cierra) */}
      <AbsoluteFill style={{ background: p.tinta, opacity: oscuro }} />
      {(pieza.frases ?? []).map((x, i) => (
        <Frase key={i} x={x} frame={frame} fps={fps} p={p} ancho={width} sobreOscuro={actual.escena.fondoOscuro || oscuro > 0.5} conAcento={conAcento} />
      ))}
      {actual.tipo === 'pregunta' ? (
        <div style={{ position: 'absolute', left: 0, right: 0, top: height - 380 - 150, display: 'flex', justifyContent: 'center', opacity: entra(local, 20, fps) }}>
          <Firma tamano={0.8} />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const PALETA = { papel: '#EDE4D0', papelOscuro: '#CFC1A1', tinta: '#17130F' };

/** Papel viejo: vineta y fibras deterministas (sin grano por filtro: no hay GPU). */
const Papel = ({ p, ancho, alto }) => (
  <AbsoluteFill>
    <svg width={ancho} height={alto}>
      {Array.from({ length: 220 }, (_, i) => {
        const x = random(`fx${i}`) * ancho;
        const y = random(`fy${i}`) * alto;
        const l = 8 + random(`fl${i}`) * 40;
        const a = random(`fa${i}`) * Math.PI;
        return <line key={i} x1={x} y1={y} x2={x + Math.cos(a) * l} y2={y + Math.sin(a) * l} stroke={p.tinta} strokeOpacity={0.05 + random(`fo${i}`) * 0.05} strokeWidth={1} />;
      })}
    </svg>
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, transparent 45%, ${conAlfa(p.papelOscuro, 0.9)} 100%)` }} />
  </AbsoluteFill>
);

/** Rayado de grabado: una direccion para sombra media y cruzado para sombra profunda. */
const Patrones = ({ p }) => (
  <defs>
    <pattern id="rayado" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
      <line x1="0" y1="0" x2="0" y2="9" stroke={p.tinta} strokeWidth="2.4" />
    </pattern>
    <pattern id="cruzado" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)">
      <line x1="0" y1="0" x2="0" y2="9" stroke={p.tinta} strokeWidth="2.4" />
    </pattern>
  </defs>
);

/** 0 -> 1 lineal entre dos segundos locales. */
const prog = (f, fps, desde, hasta) => interpolate(f, [desde * fps, hasta * fps], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

/** Trazo que se dibuja solo: pathLength normalizado, el dash avanza con `t`. */
const Trazo = ({ d, t, p, ancho = 5, relleno, opacidad = 1 }) => (
  <path d={d} pathLength={1} fill={relleno ?? 'none'} fillOpacity={relleno ? Math.max(0, t * 2 - 1) : 0} stroke={p.tinta} strokeWidth={ancho} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 1" strokeDashoffset={1 - Math.min(1, t)} opacity={opacidad} />
);

/** Silueta de tinta: cabeza, cuerpo con abrigo y, si se pide, bombin. `encorva` 0..1 dobla la espalda. */
const Figura = ({ x, y, s = 1, p, sombrero = false, encorva = 0, aparece = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} opacity={aparece}>
    <g transform={`rotate(${encorva * 28} 0 -120)`}>
      <circle cx={0} cy={-205} r={26} fill={p.tinta} />
      {sombrero ? (
        <g>
          <ellipse cx={0} cy={-224} rx={40} ry={8} fill={p.tinta} />
          <path d="M -24 -224 Q -24 -262 0 -262 Q 24 -262 24 -224 Z" fill={p.tinta} />
        </g>
      ) : null}
      <path d="M -40 -170 Q 0 -185 40 -170 L 52 -40 Q 0 -28 -52 -40 Z" fill={p.tinta} />
    </g>
    <path d="M -26 -40 L -30 0 M 26 -40 L 30 0" stroke={p.tinta} strokeWidth={14} strokeLinecap="round" />
  </g>
);

// --- Escenas ---------------------------------------------------------------------------

/** La pluma: un plumin grande que se dibuja y, en `mancha`, una gota de tinta que se extiende. */
ESCENAS.pluma = ({ e, f, fps, p }) => {
  const dib = prog(f, fps, 0.1, 1.6);
  const m = entra(f, (e.mancha ?? 2.2) * fps, fps, { stiffness: 60, damping: 14 });
  return (
    <g>
      <g transform="translate(540 1180) rotate(-35)">
        <Trazo p={p} t={dib} ancho={6} relleno="url(#rayado)" d="M 0 -420 L 70 -120 Q 80 -60 40 0 L 0 120 L -40 0 Q -80 -60 -70 -120 Z" />
        <Trazo p={p} t={dib} ancho={5} d="M 0 -60 L 0 110" />
        <Trazo p={p} t={dib} ancho={5} d="M -16 -80 a 16 16 0 1 0 32 0 a 16 16 0 1 0 -32 0" />
        <Trazo p={p} t={prog(f, fps, 0.6, 1.8)} ancho={6} relleno={p.tinta} d="M -70 -120 L -90 -560 L 90 -560 L 70 -120 Z" />
      </g>
      {/* Mancha: circulos irregulares que crecen desde la punta */}
      <g transform="translate(615 1290)">
        {Array.from({ length: 9 }, (_, i) => {
          const a = (i / 9) * Math.PI * 2;
          const r = 40 + random(`m${i}`) * 70;
          return <circle key={i} cx={Math.cos(a) * r * 0.9 * m} cy={Math.sin(a) * r * 0.5 * m} r={(30 + random(`mr${i}`) * 45) * m} fill={p.tinta} />;
        })}
        <ellipse cx={0} cy={0} rx={150 * m} ry={80 * m} fill={p.tinta} />
      </g>
    </g>
  );
};

/** El arresto: un marco de puerta, dos hombres de bombin y uno sin sombrero; luego llueven papeles. */
ESCENAS.arresto = ({ e, f, fps, p }) => {
  const marco = prog(f, fps, 0, 1.2);
  const papeles = f - (e.papeles ?? 5.7) * fps;
  return (
    <g>
      <Trazo p={p} t={marco} ancho={7} d="M 240 1620 L 240 820 L 840 820 L 840 1620" />
      <rect x={250} y={830} width={580} height={790} fill="url(#rayado)" opacity={0.35 * marco} />
      <line x1={120} y1={1620} x2={960} y2={1620} stroke={p.tinta} strokeWidth={6} />
      <Figura p={p} x={540} y={1610} s={1.25} aparece={prog(f, fps, 0.3, 0.9)} />
      <Figura p={p} x={330} y={1615} s={1.45} sombrero aparece={prog(f, fps, 0.8, 1.4)} />
      <Figura p={p} x={760} y={1615} s={1.45} sombrero aparece={prog(f, fps, 1.1, 1.7)} />
      {papeles > 0
        ? Array.from({ length: 16 }, (_, i) => {
            const t0 = i * 2;
            const k = Math.max(0, papeles - t0);
            const y = Math.min(1560 - (i % 6) * 14, -100 + k * 38);
            const x = 200 + random(`px${i}`) * 680;
            return <rect key={i} x={x} y={y} width={120} height={150} fill={p.papel} stroke={p.tinta} strokeWidth={4} transform={`rotate(${(random(`pr${i}`) - 0.5) * 60 + k} ${x + 60} ${y + 75})`} />;
          })
        : null}
    </g>
  );
};

/** La escalera infinita: sube en zigzag hacia el fondo; una figura la recorre; aparecen puertas. */
ESCENAS.escalera = ({ e, f, fps, p }) => {
  // Escalera en zigzag que se achica hacia arriba: cada 5 peldanos cambia de sentido (un descanso).
  const peldanos = 20;
  const puntos = [];
  const descansos = [];
  let x = 220;
  let y = 1720;
  for (let i = 0; i < peldanos; i++) {
    const s = 1 - i * 0.032;
    if (i % 5 === 4) descansos.push([x, y, s]);
    puntos.push([x, y]);
    x += 120 * s * (Math.floor(i / 5) % 2 ? -1 : 1);
    puntos.push([x, y]);
    y -= 56 * s;
    puntos.push([x, y]);
  }
  const d = `M ${puntos.map(([a, b]) => `${a} ${b}`).join(' L ')}`;
  const dib = prog(f, fps, 0, 2.2);
  const sube = prog(f, fps, 0.4, 3.4);
  const i = Math.min(puntos.length - 1, Math.floor(sube * (puntos.length - 1)));
  const [fx, fy] = puntos[i];
  return (
    <g>
      <Trazo p={p} t={dib} ancho={7} d={d} />
      <Trazo p={p} t={dib} ancho={3} opacidad={0.5} d={`M ${puntos.map(([a, b]) => `${a + 40} ${b + 30}`).join(' L ')}`} />
      <Figura p={p} x={fx + 20} y={fy} s={0.75 - sube * 0.35} />
      {(e.puertas ?? []).map((t, k) => {
        const a = prog(f, fps, t, t + 0.5);
        const [dx, dy, ds] = descansos[k % descansos.length];
        const px = dx + (k % 2 ? -150 : 150) * ds;
        const py = dy - 140 * ds;
        const s = ds * 0.85;
        return (
          <g key={k} transform={`translate(${px} ${py}) scale(${s})`}>
            <Trazo p={p} t={a} ancho={7} d="M -90 140 L -90 -140 L 90 -140 L 90 140 Z" />
            <rect x={-80} y={-130} width={160} height={260} fill="url(#cruzado)" opacity={0.6 * a} />
            <circle cx={55} cy={10} r={9} fill={p.tinta} opacity={a} />
          </g>
        );
      })}
    </g>
  );
};

/** La puerta de la ley: enorme, con una rendija de luz; un guardian de pie y un hombre que envejece esperando. */
ESCENAS.puerta = ({ e, f, fps, p }) => {
  const dib = prog(f, fps, 0, 1.4);
  const envejece = prog(f, fps, e.envejece?.[0] ?? 3.4, e.envejece?.[1] ?? 7);
  const cierra = prog(f, fps, e.cierra?.[0] ?? 7.4, e.cierra?.[1] ?? 8);
  const rendija = 34 * (1 - cierra);
  return (
    <g>
      <rect x={300} y={560} width={560} height={1080} fill="url(#cruzado)" opacity={dib} />
      <rect x={300} y={560} width={560} height={1080} fill="url(#rayado)" opacity={dib} />
      <Trazo p={p} t={dib} ancho={10} d="M 270 1650 L 270 530 L 890 530 L 890 1650" />
      <rect x={580 - rendija / 2} y={570} width={rendija} height={1070} fill={p.papel} />
      <line x1={60} y1={1650} x2={1020} y2={1650} stroke={p.tinta} strokeWidth={6} />
      <Figura p={p} x={950} y={1645} s={1.6} sombrero aparece={prog(f, fps, 0.8, 1.5)} />
      {/* Taburete y el hombre que espera: se encorva y se encoge con los anos */}
      <path d="M 120 1650 L 140 1540 L 230 1540 L 250 1650" stroke={p.tinta} strokeWidth={8} fill="none" opacity={prog(f, fps, 0.6, 1.2)} />
      <Figura p={p} x={185} y={1545} s={0.95 - envejece * 0.12} encorva={envejece} aparece={prog(f, fps, 0.9, 1.6)} />
    </g>
  );
};

/** Revelacion: sobre negro, la puerta se abre y entra la luz (el primer color del video). */
ESCENAS.revelacion = ({ e, f, fps, p }) => {
  const abre = entra(f, (e.abre ?? 5.5) * fps, fps, { stiffness: 50, damping: 16 });
  const ancho = 30 + abre * 520;
  return (
    <g>
      <rect x={0} y={0} width={1080} height={1920} fill={p.tinta} />
      <path d={`M ${580 - ancho / 2} 560 L ${580 + ancho / 2} 560 L ${580 + ancho * 1.3} 1920 L ${580 - ancho * 1.3} 1920 Z`} fill={p.acento} opacity={0.18 * abre} />
      <rect x={580 - ancho / 2} y={560} width={ancho} height={1080} fill={p.acento} opacity={0.25 + 0.75 * abre} />
      <rect x={270} y={530} width={620} height={1120} fill="none" stroke={p.papel} strokeOpacity={0.25} strokeWidth={6} />
    </g>
  );
};

/** La pregunta final: papel limpio y un subrayado del acento que se dibuja. */
ESCENAS.pregunta = ({ f, fps, p }) => (
  <path d="M 160 1010 Q 540 1040 920 1005" pathLength={1} stroke={p.acento} strokeWidth={10} strokeLinecap="round" fill="none" strokeDasharray="1 1" strokeDashoffset={1 - prog(f, fps, 0.6, 1.6)} />
);

/**
 * Frase de la voz en la zona de texto: entra palabra a palabra, se va al terminar. Las de
 * pocas palabras salen mas grandes. El enfasis subraya en tinta (o en el acento al final).
 */
const Frase = ({ x, frame, fps, p, ancho, sobreOscuro, conAcento }) => {
  const desde = x.desde * fps;
  const hasta = x.hasta * fps;
  if (frame < desde - 1 || frame > hasta + 10) return null;
  // partirPalabras deja la puntuacion que sigue a un *enfasis* como palabra suelta: se pega a la anterior.
  const palabras = partirPalabras(x.texto).reduce((acc, w) => {
    if (/^[.,:;?!…]+$/.test(w.texto) && acc.length) acc[acc.length - 1] = { ...acc[acc.length - 1], cola: (acc[acc.length - 1].cola ?? '') + w.texto };
    else acc.push(w);
    return acc;
  }, []);
  const sale = interpolate(frame, [hasta + 2, hasta + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const tam = x.tamano ?? (palabras.length <= 4 ? 112 : palabras.length <= 8 ? 92 : 80);
  const color = sobreOscuro ? p.papel : p.tinta;
  return (
    <div style={{ position: 'absolute', left: 90, width: ancho - 180, top: x.arriba ?? 270, display: 'flex', flexWrap: 'wrap', columnGap: tam * 0.26, rowGap: 0, opacity: 1 - sale }}>
      {palabras.map((w, k) => {
        const n = (hasta - desde) / Math.max(1, palabras.length);
        const a = entra(frame, desde + k * Math.min(5, n * 0.6), fps, { stiffness: 220, damping: 22 });
        const marca = w.enfasis ? (conAcento ? p.acento : color) : null;
        return (
          <span key={k} style={{ ...fuente({ familia: 'Fraunces', peso: w.enfasis ? 700 : 500 }), fontSize: tam, lineHeight: 1.1, letterSpacing: '-0.015em', color: w.enfasis && conAcento ? p.acento : color, opacity: Math.min(1, a * 1.5), transform: `translateY(${(1 - a) * 18}px)`, display: 'inline-block', textDecoration: marca ? 'underline' : 'none', textDecorationThickness: 5, textUnderlineOffset: 12 }}>
            {w.texto}
            {w.cola ? <span style={{ textDecoration: 'none', display: 'inline-block' }}>{w.cola}</span> : null}
          </span>
        );
      })}
    </div>
  );
};
