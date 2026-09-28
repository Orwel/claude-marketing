import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { TRANSICION } from '../graficos/tiempos.js';
import { useMarca } from '../marca.js';
import { conAlfa } from '../util.js';

/**
 * Barrido entre grabaciones: una franja diagonal con los dos colores de la
 * marca cruza la pantalla y la cubre entera justo en el cuadro del corte.
 * Dura TRANSICION * 2 cuadros; se monta desde (corte - TRANSICION).
 * Lo usan Vertical y Montaje: a Juan David le gusto en la version webinar.
 */
export const Barrido = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const { colores } = useMarca();
  const inclinacion = height * Math.tan((14 * Math.PI) / 180);
  const ancho = width + inclinacion * 2 + 200;
  const x = interpolate(frame, [0, TRANSICION * 2], [-ancho - inclinacion, width + inclinacion], { easing: Easing.inOut(Easing.cubic) });
  return (
    <AbsoluteFill style={{ overflow: 'hidden', pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: x,
          width: ancho,
          height,
          transform: 'skewX(-14deg)',
          background: `linear-gradient(90deg, ${colores.secundario ?? colores.acento} 0%, ${colores.acento} 18%, ${colores.fondo2} 60%, ${colores.fondo} 100%)`,
          boxShadow: `0 0 80px ${conAlfa(colores.acento, 0.6)}`,
        }}
      />
    </AbsoluteFill>
  );
};
