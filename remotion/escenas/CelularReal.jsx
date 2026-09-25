import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { TextoCinetico } from '../componentes/TextoCinetico.jsx';
import { fuente } from '../fuentes.js';
import { useMarca } from '../marca.js';

/**
 * El celular con la app real (la imagen de la portada de contrappto.com)
 * flotando, y avisos que salen disparados de el uno por pulso.
 */
export const CelularReal = ({ titulo, imagen, avisos = [], pulso = 15, segundos }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const { colores, radio } = marca;
  const subida = spring({ frame: frame - 2, fps, config: { damping: 16, stiffness: 110 } });
  const flote = Math.sin(frame / 14) * 12;
  const giro = interpolate(frame, [0, segundos * fps], [-4, 3]);

  return (
    <AbsoluteFill style={{ alignItems: 'center', paddingTop: 280 }}>
      <div style={{ width: 920 }}>
        <TextoCinetico texto={titulo} tamano={84} desde={0} alineacion="center" />
      </div>
      <div style={{ position: 'relative', marginTop: 20, transform: `translateY(${(1 - subida) * 700 + flote}px) rotate(${giro}deg)` }}>
        <Img src={staticFile(imagen)} style={{ width: 760, filter: 'drop-shadow(0 60px 80px rgba(0,0,0,.6))' }} />
        {avisos.map((aviso, k) => {
          const e = spring({ frame: frame - (pulso * (k + 1.5)), fps, config: { damping: 11, stiffness: 190 } });
          const lado = k % 2 ? 1 : -1;
          return (
            <div
              key={k}
              style={{
                position: 'absolute',
                top: 180 + k * 250,
                left: lado < 0 ? -60 : 'auto',
                right: lado > 0 ? -60 : 'auto',
                width: 470,
                transform: `translateX(${(1 - e) * lado * 400}px) scale(${0.7 + e * 0.3}) rotate(${lado * (1 - e) * 10}deg)`,
                opacity: Math.min(1, e * 1.4),
                background: colores.fondo2,
                border: `3px solid ${k % 2 ? colores.alerta : colores.acento}`,
                borderRadius: radio,
                padding: '22px 28px',
                boxShadow: '0 30px 60px rgba(0,0,0,.5)',
              }}
            >
              <div style={{ ...fuente(marca.fuentes.enfasis), fontSize: 31, color: colores.tinta }}>{aviso.titulo}</div>
              <div style={{ ...fuente(marca.fuentes.texto), fontSize: 26, color: colores.tenue, marginTop: 6 }}>{aviso.cuerpo}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
