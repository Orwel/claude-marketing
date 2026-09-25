import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Figura, sacudida } from '../componentes/Formas.jsx';
import { fuente } from '../fuentes.js';
import { useMarca } from '../marca.js';
import { partirPalabras } from '../util.js';

/**
 * Gancho a golpes: una linea por pulso, entra grande y cae en su sitio con
 * sacudida. Es el gancho para videos con musica; sin musica se usa "gancho".
 */
export const Golpe = ({ lineas = [], pulso = 15, tamano = 150 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const golpes = lineas.map((_, i) => 4 + i * pulso);

  return (
    <AbsoluteFill style={{ justifyContent: 'center', padding: '0 80px', transform: sacudida(frame, golpes) }}>
      {lineas.map((linea, i) => {
        const avance = spring({ frame: frame - golpes[i], fps, config: { damping: 14, stiffness: 260, mass: 0.6 } });
        if (frame < golpes[i]) return null;
        const palabras = partirPalabras(linea);
        const destacada = palabras.some((p) => p.enfasis);
        return (
          <div key={i} style={{ position: 'relative', alignSelf: 'flex-start', transform: `scale(${2.2 - avance * 1.2})`, transformOrigin: 'left center', opacity: Math.min(1, avance * 2) }}>
            {destacada ? (
              <div style={{ position: 'absolute', inset: '8% -3% 4% -3%', background: marca.colores.acento, borderRadius: 18, transform: `scaleX(${avance})`, transformOrigin: 'left' }} />
            ) : null}
            <div style={{ position: 'relative', ...fuente(marca.fuentes.titulo), fontSize: tamano, lineHeight: 1.05, letterSpacing: '-0.03em', color: marca.colores.tinta }}>
              {palabras.map((p) => p.texto).join(' ')}
            </div>
            <Estallido desde={golpes[i]} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** Anillos y puntos que salen disparados del impacto. */
export const Estallido = ({ desde, cantidad = 7, radio = 260 }) => {
  const frame = useCurrentFrame();
  const { colores } = useMarca();
  const t = frame - desde;
  if (t < 0 || t > 20) return null;
  const p = t / 20;
  return (
    <div style={{ position: 'absolute', left: '50%', top: '50%', pointerEvents: 'none' }}>
      {Array.from({ length: cantidad }, (_, k) => {
        const ang = (k / cantidad) * Math.PI * 2 + desde;
        return (
          <div key={k} style={{ position: 'absolute', transform: `translate(${Math.cos(ang) * radio * p}px, ${Math.sin(ang) * radio * p}px) scale(${1 - p})`, opacity: 1 - p }}>
            <Figura tipo={k % 2 ? 'punto' : 'mas'} tamano={36} color={k % 3 ? colores.acento : colores.alerta} />
          </div>
        );
      })}
    </div>
  );
};
