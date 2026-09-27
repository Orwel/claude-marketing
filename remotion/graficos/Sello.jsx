import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { fuente } from '../fuentes.js';
import { useMarca } from '../marca.js';
import { conAlfa, partirPalabras } from '../util.js';
import { avance, latido, salto } from './base.jsx';
import { T } from './tiempos.js';

/**
 * Una idea que se estampa sobre el video, a la altura del pecho (debajo de la
 * cara y encima de la interfaz de Instagram).
 *  - pregunta: pastilla de vidrio que salta, con un barrido de brillo.
 *  - tachar: una palabra enorme que cae con golpe y a la que luego se le
 *    tacha el comienzo ("IMPOSIBLE" → "POSIBLE"). Sombras escalonadas en los
 *    dos colores de la marca, como los titulos de seccion de trifuerza.co.
 */
export const Sello = ({ g }) => (g.estilo === 'tachar' ? <Tachar g={g} /> : <Pregunta g={g} />);

const Pregunta = ({ g }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const { colores } = marca;
  const a = salto(frame, 0, fps);
  const brillo = interpolate(frame, [T.sello.brillo, T.sello.brillo + 20], [-30, 130], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        padding: '26px 44px',
        borderRadius: 999,
        background: conAlfa(colores.fondo, 0.72),
        backdropFilter: 'blur(24px) saturate(150%)',
        border: `1px solid ${conAlfa(colores.acento, 0.45)}`,
        boxShadow: `0 0 ${latido(frame, fps, 8, 30, 2)}px ${conAlfa(colores.acento, 0.45)}, 0 20px 60px rgba(0,0,0,.4)`,
        opacity: a,
        transform: `translateY(${(1 - a) * 16}px) scale(${0.92 + a * 0.08})`,
      }}
    >
      <div style={{ ...fuente(marca.fuentes.titulo), fontSize: 60, lineHeight: 1.1, color: colores.tinta, textAlign: 'center', whiteSpace: 'nowrap' }}>
        {partirPalabras(g.texto).map((p, i) => (
          <span key={i} style={{ color: p.enfasis ? colores.acento : undefined }}>
            {i ? ' ' : ''}
            {p.texto}
          </span>
        ))}
      </div>
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(100deg, transparent ${brillo - 15}%, ${conAlfa('#FFFFFF', 0.18)} ${brillo}%, transparent ${brillo + 15}%)` }} />
    </div>
  );
};

const Tachar = ({ g }) => {
  const frame = useCurrentFrame();
  const marca = useMarca();
  const { colores } = marca;
  const t = T.sello;
  const golpe = interpolate(frame, [0, 6], [1.9, 1], { extrapolateRight: 'clamp', easing: (x) => 1 - (1 - x) ** 3 });
  const temblor = frame < 12 ? Math.sin(frame * 2.4) * (12 - frame) * 0.9 : 0;
  const tachon = avance(frame, t.tachon, 8);
  const quita = avance(frame, t.tachon + 8, 10);
  const [tachado, resto] = [g.tachado ?? '', g.texto.slice((g.tachado ?? '').length)];
  const sombra = `4px 4px 0 ${colores.secundario ?? colores.acento}, 8px 8px 0 ${colores.acento}`;
  const estilo = { ...fuente({ familia: marca.fuentes.enfasis.familia, peso: 900 }), fontSize: 132, letterSpacing: '-0.02em', textTransform: 'uppercase', color: colores.tinta, textShadow: sombra };
  return (
    <div style={{ display: 'flex', justifyContent: 'center', opacity: Math.min(1, frame / 3), transform: `scale(${golpe}) translateX(${temblor}px)` }}>
      <span style={{ position: 'relative', display: 'inline-block', ...estilo, opacity: 1 - quita * 0.75, transform: `translateY(${quita * 24}px) rotate(${quita * -6}deg)` }}>
        {tachado}
        <span style={{ position: 'absolute', left: -8, right: -8, top: '52%', height: 14, borderRadius: 7, background: colores.acento, transform: `scaleX(${tachon})`, transformOrigin: 'left', boxShadow: `0 0 20px ${colores.acento}` }} />
      </span>
      <span style={{ ...estilo, textShadow: quita > 0 ? `${sombra}, 0 0 ${quita * 40}px ${conAlfa(colores.acento, 0.8)}` : sombra }}>{resto}</span>
    </div>
  );
};
