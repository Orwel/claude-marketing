import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { useMarca } from '../marca.js';
import { conAlfa } from '../util.js';

/**
 * Fondo continuo bajo todas las escenas. Va fuera de la secuencia de escenas
 * a proposito: si cada escena trajera el suyo, el fundido entre escenas
 * dejaria ver un parpadeo del fondo.
 */
export const Fondo = () => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const { colores, fondoEstilo } = useMarca();

  // El resplandor se desplaza lento: sin movimiento, un fondo liso se lee como imagen fija.
  const x = interpolate(frame, [0, durationInFrames], [30, 70]);
  const y = interpolate(frame, [0, durationInFrames], [25, 60]);

  return (
    <AbsoluteFill style={{ backgroundColor: colores.fondo }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${x}% ${y}%, ${conAlfa(colores.acento, 0.22)} 0%, ${conAlfa(colores.acento, 0)} 45%),
                       linear-gradient(180deg, ${colores.fondo} 0%, ${colores.fondo2} 100%)`,
        }}
      />
      {fondoEstilo === 'rejilla' ? <Rejilla ancho={width} alto={height} color={colores.linea} frame={frame} /> : null}
      {fondoEstilo === 'grano' ? <Grano color={colores.tinta} /> : null}
    </AbsoluteFill>
  );
};

/** Rejilla tenue: evoca documento y producto sin competir con el texto. */
const Rejilla = ({ ancho, alto, color, frame }) => {
  const paso = 90;
  const desplazamiento = (frame * 0.4) % paso;
  return (
    <AbsoluteFill
      style={{
        opacity: 0.35,
        backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
        backgroundSize: `${paso}px ${paso}px`,
        backgroundPosition: `0 ${desplazamiento}px`,
        maskImage: 'radial-gradient(ellipse at 50% 45%, black 20%, transparent 75%)',
        WebkitMaskImage: 'radial-gradient(ellipse at 50% 45%, black 20%, transparent 75%)',
        width: ancho,
        height: alto,
      }}
    />
  );
};

/** Grano editorial para la marca personal: se siente mas humano que una rejilla. */
const Grano = ({ color }) => (
  <AbsoluteFill style={{ opacity: 0.07, mixBlendMode: 'overlay' }}>
    <svg width="100%" height="100%">
      <filter id="grano">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grano)" fill={color} />
    </svg>
  </AbsoluteFill>
);
