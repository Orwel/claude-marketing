import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';

/** Entrada comun (sube y aparece). Un solo sitio para que todo el video se mueva con el mismo caracter. */
export const Aparecer = ({ desde = 0, distancia = 60, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const avance = spring({ frame: frame - desde, fps, config: { damping: 20, stiffness: 120 } });
  return (
    <div style={{ ...style, opacity: Math.min(1, avance * 1.3), transform: `translateY(${(1 - avance) * distancia}px)` }}>
      {children}
    </div>
  );
};
