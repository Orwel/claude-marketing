import { icons } from 'lucide-react';
import React from 'react';
import { Img, interpolate, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { fuente } from '../fuentes.js';
import { conAlfa } from '../util.js';
import { aparece, azar, cuandoItem, entra } from './movimiento.js';
import { useTema } from './tema.js';

/**
 * Material propio (fotos y clips del evento) como overlay de cine. Cada item es
 * { foto | clip, pie?, desde? (s del clip), icono? } y entra cuando se dice su
 * palabra: vuela desde abajo girando en 3D, se asienta con una leve inclinacion,
 * hace un acercamiento lento (Ken Burns) y le pasa un barrido de luz. Los items
 * se apilan como polaroids: el nuevo cae encima del anterior.
 */
export const Medio = ({ b, ancho, alto }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTema(b);
  const items = b.items ?? [];
  return (
    <div style={{ position: 'relative', width: ancho, height: alto, perspective: 1600 }}>
      {items.map((m, i) => {
        const desde = cuandoItem(b, i, 0, 40);
        if (frame < desde) return null;
        const a = entra(frame, desde, fps, { stiffness: 120, damping: 16 });
        const local = frame - desde;
        const giroFinal = (azar(`g${i}${m.foto ?? m.clip}`) - 0.5) * 8;
        const dx = (azar(`x${i}${m.foto ?? m.clip}`) - 0.5) * ancho * 0.14;
        const vertical = m.vertical ?? false;
        const h = alto * (vertical ? 0.98 : 0.86);
        const w = vertical ? h * 0.62 : Math.min(ancho * 0.8, h * 1.45);
        const brillo = interpolate(local, [8, 30], [-40, 140], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const zoom = 1.04 + local * 0.0012;
        const C = m.icono ? icons[m.icono] : null;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: ancho / 2 - w / 2 + dx,
              top: alto / 2 - h / 2,
              width: w,
              height: h,
              padding: 12,
              paddingBottom: m.pie ? 58 : 12,
              boxSizing: 'border-box',
              background: '#F7F5F0',
              borderRadius: 10,
              boxShadow: '0 30px 70px rgba(0,0,0,.55)',
              transform: `translateY(${(1 - a) * alto * 0.9}px) rotateX(${(1 - Math.min(1, a)) * 35}deg) rotateZ(${giroFinal + (1 - a) * -18}deg)`,
              opacity: Math.min(1, a * 2),
            }}
          >
            <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', borderRadius: 4, background: '#111' }}>
              <div style={{ width: '100%', height: '100%', transform: `scale(${zoom})`, transformOrigin: m.foco ?? '50% 45%' }}>
                {m.foto ? <Img src={staticFile(m.foto)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: m.foco ?? '50% 45%' }} /> : null}
                {m.clip ? <OffthreadVideo src={staticFile(m.clip)} trimBefore={Math.round((m.desde ?? 0) * fps)} muted style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: m.foco ?? '50% 45%' }} /> : null}
              </div>
              <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(110deg, transparent ${brillo - 20}%, ${conAlfa('#FFFFFF', 0.35)} ${brillo}%, transparent ${brillo + 20}%)`, mixBlendMode: 'screen' }} />
            </div>
            {m.pie ? (
              <div style={{ position: 'absolute', left: 16, right: 16, bottom: 12, height: 36, display: 'flex', alignItems: 'center', gap: 10, ...aparece(entra(frame, desde + 10, fps), { y: 6 }) }}>
                {C ? <C size={24} strokeWidth={2} color={t.acento} absoluteStrokeWidth /> : null}
                <span style={{ ...fuente(t.marca.fuentes.titulo), fontSize: 26, color: '#1B1B1B', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden' }}>{m.pie}</span>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
