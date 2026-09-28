import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { useMarca } from '../marca.js';
import { conAlfa } from '../util.js';

/**
 * Capa de cine (27-sep-2026: "QUE TODO QUEDE NIVEL CINEMATOGRAFICO"). Todo es
 * gradiente y opacidad: nada de grano ni ruido (a Juan David el ruido le suena y
 * se le ve a estatica) y nada de desenfoques (en el render no hay GPU).
 */

/** Viñeta: oscurece los bordes y lleva el ojo a la cara. */
export const Vineta = ({ fuerza = 1 }) => (
  <AbsoluteFill style={{ pointerEvents: 'none', background: `radial-gradient(ellipse 75% 60% at 50% 42%, rgba(0,0,0,0) 55%, rgba(0,0,0,${0.42 * fuerza}) 100%)` }} />
);

/** Apertura: franjas de cine que se abren en el primer segundo. */
export const Franjas = () => {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const alto = interpolate(frame, [4, 26], [height * 0.16, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.7, 0, 0.2, 1) });
  if (alto <= 0) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: alto, background: '#000' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: alto, background: '#000' }} />
    </AbsoluteFill>
  );
};

/**
 * Destello de luz: un resplandor calido del color de acento que barre en
 * diagonal y se apaga en ~16 cuadros (mezcla "screen", como una fuga de luz).
 */
export const Destello = ({ desdeIzquierda = true }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { colores } = useMarca();
  const t = frame / Math.max(1, durationInFrames - 1);
  const x = desdeIzquierda ? interpolate(t, [0, 1], [-10, 90]) : interpolate(t, [0, 1], [110, 10]);
  const o = Math.sin(Math.PI * Math.min(1, t)) * 0.55;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        mixBlendMode: 'screen',
        opacity: o,
        background: `radial-gradient(ellipse 55% 40% at ${x}% 35%, ${conAlfa(colores.acento, 0.9)} 0%, ${conAlfa(colores.acento, 0.25)} 40%, rgba(0,0,0,0) 70%), linear-gradient(115deg, rgba(0,0,0,0) 30%, ${conAlfa('#FFE6C7', 0.35)} 50%, rgba(0,0,0,0) 70%)`,
      }}
    />
  );
};
