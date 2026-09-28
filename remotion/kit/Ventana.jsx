import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fuente } from '../fuentes.js';
import { conAlfa } from '../util.js';
import { entra } from './movimiento.js';
import { useTema } from './tema.js';

/**
 * "Ventana de app", el marco de todos los mockups de las dos webs: barra con
 * tres puntos, titulo con la segunda palabra en acento ("Trifuerza **Legal**"),
 * cuerpo con patron de cruces al 3 % y pie opcional con un caption. Entra con
 * el resorte de la web y un leve giro 3D que se endereza (el "flat -> 0°" del
 * contrato interactivo de Contrappto).
 */
export const Ventana = ({ b, ancho, alto, children, derecha, pie }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTema(b);
  const a = entra(frame, 0, fps, { stiffness: 180, damping: 20 });
  const [uno, ...resto] = (b.ventana ?? t.titulo ?? '').split(' ');
  return (
    <div style={{ width: ancho, height: alto, perspective: 1400 }}>
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 26,
          overflow: 'hidden',
          background: t.fondo,
          border: `1.5px solid ${conAlfa(t.tinta, 0.1)}`,
          boxShadow: `0 30px 80px rgba(0,0,0,.5), 0 0 0 1px ${conAlfa('#FFFFFF', 0.04)}, 0 0 60px ${conAlfa(t.acento, 0.12)}`,
          opacity: Math.min(1, a * 1.4),
          transform: `rotateX(${(1 - Math.min(1, a)) * 10}deg) translateY(${(1 - a) * 24}px) scale(${0.96 + 0.04 * Math.min(1, a)})`,
          transformOrigin: '50% 100%',
        }}
      >
        <div style={{ height: 52, flex: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '0 22px', background: conAlfa(t.panel, 0.9), borderBottom: `1px solid ${t.borde}` }}>
          {['#F87171', '#FBBF24', '#34D399'].map((c) => (
            <span key={c} style={{ width: 12, height: 12, borderRadius: 6, background: conAlfa(c, 0.8) }} />
          ))}
          <span style={{ ...fuente(t.marca.fuentes.enfasis), fontSize: 22, color: t.tinta, marginLeft: 12 }}>
            {uno} {resto.length ? <span style={{ color: t.acentoTexto }}>{resto.join(' ')}</span> : null}
          </span>
          <div style={{ flex: 1 }} />
          {derecha}
        </div>
        <div
          style={{
            position: 'relative',
            flex: 1,
            padding: 24,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cpath d='M30 26v8M26 30h8' stroke='white' stroke-opacity='.035' stroke-width='1.5'/%3E%3C/svg%3E")`,
            overflow: 'hidden',
          }}
        >
          {children}
        </div>
        {pie ? (
          <div style={{ height: 44, flex: 'none', display: 'flex', alignItems: 'center', padding: '0 22px', borderTop: `1px solid ${t.borde}`, background: conAlfa(t.panel, 0.7) }}>
            <span style={{ ...fuente(t.marca.fuentes.texto), fontSize: 18, color: t.tenue }}>{pie}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};

/** Pastilla de estado (Crítico, Listo, Pendiente...) en su color semantico. */
export const Pill = ({ texto, color, relleno = 0.14, tamano = 16 }) => {
  const t = useTema();
  return (
    <span style={{ ...fuente(t.marca.fuentes.enfasis), fontSize: tamano, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '5px 12px', borderRadius: 999, color, background: conAlfa(color, relleno), border: `1px solid ${conAlfa(color, 0.35)}`, whiteSpace: 'nowrap' }}>
      {texto}
    </span>
  );
};
