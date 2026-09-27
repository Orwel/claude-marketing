import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fuente } from '../fuentes.js';
import { useMarca } from '../marca.js';
import { conAlfa, partirPalabras } from '../util.js';
import { avance, Constelacion, entrar, latido, Pastilla, salto, Vidrio } from './base.jsx';
import { T } from './tiempos.js';

/**
 * Invitacion con forma de boleta: insignia en vivo, titulo del evento, linea
 * perforada y un boton con el brillo que late del CTA de Contrappto
 * (cta-glow-progress: sombra de 4 a 28 px en 2 s). Detras, la constelacion
 * muy tenue. Solo muestra lo que la pieza trae: fecha y hora no se inventan.
 */
export const Webinar = ({ g }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const { colores } = marca;
  const t = T.webinar;
  const brillo = latido(frame, fps, 0, 1, 2);
  const boton = salto(frame, t.boton, fps);

  return (
    <Vidrio alto={530} relleno={48}>
      <div style={{ position: 'absolute', inset: -48, opacity: 0.55 }}>
        <Constelacion frame={frame} fps={fps} ancho={940} alto={530} cantidad={18} semilla="webinar" intensidad={0.6} glifos={false} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, ...entrar(avance(frame, t.insignia, 12)) }}>
        <Pastilla texto={g.insignia ?? 'Gratis'} vivo frame={frame} fps={fps} />
        <span style={{ ...fuente(marca.fuentes.enfasis), fontSize: 24, letterSpacing: '0.2em', color: colores.tenue, textTransform: 'uppercase' }}>{g.etiqueta ?? 'Webinar'}</span>
      </div>
      <div style={{ ...fuente(marca.fuentes.titulo), fontSize: 70, lineHeight: 1.06, letterSpacing: '-0.02em', marginTop: 30, display: 'flex', flexWrap: 'wrap', columnGap: 18 }}>
        {partirPalabras(g.titulo ?? '').map((p, i) => (
          <span key={i} style={{ color: p.enfasis ? colores.acento : undefined, display: 'inline-block', ...entrar(avance(frame, t.titulo + i * 2, 14), 26) }}>
            {p.texto}
          </span>
        ))}
      </div>
      {/* Perforacion de boleta: linea punteada con dos muescas en los bordes. */}
      <div style={{ position: 'absolute', left: -48, right: -48, bottom: 118, height: 0, borderTop: `3px dashed ${conAlfa(colores.tinta, 0.18)}`, opacity: avance(frame, t.titulo + 10, 12) }}>
        {[-1, 1].map((lado) => (
          <span key={lado} style={{ position: 'absolute', top: -22, [lado < 0 ? 'left' : 'right']: -22, width: 44, height: 44, borderRadius: '50%', background: colores.fondo }} />
        ))}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ ...fuente(marca.fuentes.texto), fontSize: 28, color: colores.tenue, opacity: avance(frame, t.boton - 4, 12) }}>{g.detalle ?? ''}</span>
        <span
          style={{
            ...fuente(marca.fuentes.enfasis),
            fontSize: 30,
            padding: '18px 34px',
            borderRadius: 999,
            color: colores.fondo,
            background: colores.acento,
            border: `1px solid ${conAlfa(colores.acento, 0.45 + brillo * 0.4)}`,
            boxShadow: `0 0 ${4 + brillo * 12}px ${conAlfa(colores.acento, 0.25 + brillo * 0.5)}, 0 0 ${brillo * 28}px ${conAlfa(colores.acento, brillo * 0.4)}`,
            opacity: boton,
            transform: `scale(${0.9 + boton * 0.1})`,
          }}
        >
          {g.boton ?? 'Link en mi perfil'}
        </span>
      </div>
    </Vidrio>
  );
};
