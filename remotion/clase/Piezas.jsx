import React from 'react';
import { AbsoluteFill, Img, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { icons } from 'lucide-react';
import { useFuentes } from '../fuentes.js';

/**
 * Las piezas que van ENCIMA del video de la clase (con transparencia) o antes y después:
 *   Cartel → nombre y perfil del profesor al empezar (tercio inferior, sobre la pantalla)
 *   Intro  → apertura de 4 s con el título de la clase
 *   Cierre → despedida con el logo
 * Colores y textos salen de clases/<slug>.json, nunca de aquí.
 */
const RES = { stiffness: 260, damping: 26 };
const Mono = ({ children, style }) => (
  <span style={{ fontFamily: `'JetBrains Mono'`, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', ...style }}>{children}</span>
);

export const Cartel = ({ clase }) => {
  useFuentes();
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const T = clase.tema;
  const c = clase.cartel;
  const ent = spring({ frame, fps, config: RES });
  const sal = interpolate(frame, [durationInFrames - 15, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const barra = spring({ frame: frame - 4, fps, config: { stiffness: 120, damping: 20 } });
  return (
    <AbsoluteFill style={{ fontFamily: `'Inter'`, color: T.tinta }}>
      <div style={{ position: 'absolute', left: c.x ?? 340, top: c.y ?? 806, opacity: sal, display: 'flex', alignItems: 'stretch' }}>
        <div style={{ width: 8, background: T.acento, borderRadius: 4, transform: `scaleY(${barra})`, transformOrigin: 'top' }} />
        <div style={{ marginLeft: 0, background: `${T.fondo}f2`, border: `1px solid ${T.linea}`, borderLeft: 'none', borderRadius: '0 16px 16px 0', padding: '20px 30px 20px 26px', clipPath: `inset(0 ${(1 - ent) * 100}% 0 0)`, boxShadow: `0 20px 50px #0009` }}>
          <div style={{ fontFamily: `'Space Grotesk'`, fontWeight: 700, fontSize: 44, letterSpacing: '-0.015em', lineHeight: 1 }}>{c.nombre}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14 }}>
            {c.lineas.map((l, i) => {
              const a = spring({ frame: frame - 10 - i * 5, fps, config: RES });
              return (
                <div key={i} style={{ fontSize: 22, color: i === 0 ? T.tinta : T.tenue, fontWeight: i === 0 ? 600 : 500, opacity: a, transform: `translateX(${(1 - a) * -14}px)` }}>
                  {l}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Intro = ({ clase }) => {
  useFuentes();
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const T = clase.tema;
  const i = clase.intro;
  const a = (d) => spring({ frame: frame - d, fps, config: RES });
  const sal = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // La ruta del vuelo se dibuja de izquierda a derecha: guiño a la presentación de esa noche.
  const ruta = interpolate(frame, [6, 70], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const Avion = icons.Plane;
  return (
    <AbsoluteFill style={{ background: T.fondo, color: T.tinta, fontFamily: `'Inter'`, opacity: sal }}>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        {Array.from({ length: 160 }, (_, k) => (
          <circle key={k} cx={random(`ix${k}`) * 1920} cy={random(`iy${k}`) * 1080} r={random(`ir${k}`) * 1.4 + 0.3} fill={T.tenue} opacity={0.15 + random(`io${k}`) * 0.3} />
        ))}
        <path d="M 160 860 Q 960 420 1760 700" stroke={T.linea} strokeWidth={2} fill="none" strokeDasharray="6 10" />
        <path d="M 160 860 Q 960 420 1760 700" stroke={T.acento} strokeWidth={3} fill="none" pathLength={1} strokeDasharray={`${ruta} 1`} />
      </svg>
      <div style={{ position: 'absolute', left: 160, top: 250, width: 1400 }}>
        <div style={{ opacity: a(4), transform: `translateY(${(1 - a(4)) * 14}px)` }}>
          <Mono style={{ fontSize: 22, color: T.acento }}>{i.antetitulo}</Mono>
        </div>
        <div style={{ fontFamily: `'Space Grotesk'`, fontWeight: 700, fontSize: 132, lineHeight: 0.98, letterSpacing: '-0.03em', marginTop: 26, opacity: a(9), transform: `translateY(${(1 - a(9)) * 24}px)` }}>
          {i.titulo}
        </div>
        <div style={{ fontSize: 34, color: T.tenue, marginTop: 30, maxWidth: 1100, lineHeight: 1.35, opacity: a(16), transform: `translateY(${(1 - a(16)) * 14}px)` }}>{i.bajada}</div>
        <div style={{ marginTop: 44, display: 'flex', gap: 18, opacity: a(24) }}>
          {i.chips.map((ch, k) => (
            <span key={k} style={{ border: `1px solid ${T.linea}`, borderRadius: 999, padding: '10px 20px', background: T.fondo2 }}>
              <Mono style={{ fontSize: 16, color: T.tinta, letterSpacing: '0.1em' }}>{ch}</Mono>
            </span>
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 160 + ruta * 1560, top: 860 - Math.sin(ruta * Math.PI) * 220 - ruta * 0 - 20, transform: `rotate(${interpolate(ruta, [0, 0.5, 1], [-30, 0, 20])}deg)` }}>
        <Avion size={40} color={T.acento} style={{ transform: 'rotate(45deg)' }} />
      </div>
      <Img src={staticFile(clase.logo)} style={{ position: 'absolute', right: 120, bottom: 90, height: 56, opacity: a(30) }} />
    </AbsoluteFill>
  );
};

export const Cierre = ({ clase }) => {
  useFuentes();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const T = clase.tema;
  const c = clase.cierre;
  const a = (d) => spring({ frame: frame - d, fps, config: RES });
  const ent = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: T.fondo, color: T.tinta, fontFamily: `'Inter'`, opacity: ent, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        {Array.from({ length: 160 }, (_, k) => (
          <circle key={k} cx={random(`cx${k}`) * 1920} cy={random(`cy${k}`) * 1080} r={random(`cr${k}`) * 1.4 + 0.3} fill={T.tenue} opacity={0.15 + random(`co${k}`) * 0.3} />
        ))}
      </svg>
      <div style={{ opacity: a(4), transform: `translateY(${(1 - a(4)) * 14}px)` }}>
        <Mono style={{ fontSize: 22, color: T.acento }}>{c.antetitulo}</Mono>
      </div>
      <div style={{ fontFamily: `'Space Grotesk'`, fontWeight: 700, fontSize: 104, letterSpacing: '-0.03em', marginTop: 22, opacity: a(9), transform: `translateY(${(1 - a(9)) * 20}px)` }}>{c.titulo}</div>
      <div style={{ fontSize: 32, color: T.tenue, marginTop: 24, maxWidth: 1200, lineHeight: 1.4, opacity: a(16) }}>{c.texto}</div>
      <Img src={staticFile(clase.logo)} style={{ height: 64, marginTop: 70, opacity: a(26) }} />
      <div style={{ marginTop: 18, opacity: a(30) }}>
        <Mono style={{ fontSize: 18, color: T.tenue }}>{c.web}</Mono>
      </div>
    </AbsoluteFill>
  );
};
