import React from 'react';
import { AbsoluteFill, random, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { useMarca } from '../marca.js';
import { conAlfa } from '../util.js';

const TIPOS = ['anillo', 'punto', 'cuadro', 'mas', 'rombo', 'anillo', 'punto', 'rombo'];

/**
 * Figuras geometricas que flotan detras de todo y laten con la musica.
 * Las posiciones salen de random() con semilla: el mismo video siempre se ve
 * igual, pero nadie tiene que colocar 24 formas a mano.
 *
 * El rombo repite el motivo del logo de Contrappto (capas apiladas vistas en
 * isometrico), asi que el fondo tambien es marca.
 */
export const Formas = ({ cantidad = 24, cuadrosPorPulso = 15 }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const { colores } = useMarca();
  // Cada pulso da un golpe de escala que se asienta solo antes del siguiente.
  const ultimoPulso = Math.floor(frame / cuadrosPorPulso) * cuadrosPorPulso;
  const latido = 1 - spring({ frame: frame - ultimoPulso, fps, config: { damping: 12, stiffness: 200 } });

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {Array.from({ length: cantidad }, (_, i) => {
        const tipo = TIPOS[i % TIPOS.length];
        const x = random(`x${i}`) * width;
        const y0 = random(`y${i}`) * height;
        const velocidad = 0.3 + random(`v${i}`) * 1.2;
        const y = ((y0 - frame * velocidad) % (height + 200) + height + 200) % (height + 200) - 100;
        const tamano = 18 + random(`t${i}`) * 70;
        const giro = frame * (random(`g${i}`) - 0.5) * 2;
        const color = random(`c${i}`) > 0.72 ? colores.alerta : colores.acento;
        const opacidad = 0.18 + random(`o${i}`) * 0.35;
        const escala = 1 + latido * 0.35 * (i % 3 === 0 ? 1 : 0.4);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              opacity: opacidad,
              transform: `translate(-50%, -50%) rotate(${giro}deg) scale(${escala})`,
            }}
          >
            <Figura tipo={tipo} tamano={tamano} color={color} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const Figura = ({ tipo, tamano, color }) => {
  if (tipo === 'anillo') return <div style={{ width: tamano, height: tamano, borderRadius: 999, border: `${Math.max(3, tamano / 9)}px solid ${color}` }} />;
  if (tipo === 'punto') return <div style={{ width: tamano / 2.5, height: tamano / 2.5, borderRadius: 999, background: color }} />;
  if (tipo === 'cuadro') return <div style={{ width: tamano, height: tamano, borderRadius: tamano / 4, border: `${Math.max(3, tamano / 10)}px solid ${color}` }} />;
  if (tipo === 'mas')
    return (
      <svg width={tamano} height={tamano} viewBox="0 0 10 10">
        <path d="M5 1v8M1 5h8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  // rombo: tres capas isometricas, como el logo.
  return (
    <svg width={tamano * 1.4} height={tamano} viewBox="0 0 14 10">
      {[0, 1.6, 3.2].map((d, k) => (
        <path key={k} d={`M7 ${d} L13 ${d + 3} L7 ${d + 6} L1 ${d + 3} Z`} fill={conAlfa(color, 0.35 + k * 0.2)} />
      ))}
    </svg>
  );
};

/**
 * Franjas diagonales que barren la pantalla en cada corte. Tapan el cambio de
 * escena durante unos cuadros, que es lo que hace que un corte seco se sienta
 * como transicion y no como salto.
 */
export const Barrido = ({ cortes, duracion = 12 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const { colores } = useMarca();
  const corte = cortes.find((c) => frame >= c - duracion / 2 && frame < c + duracion / 2);
  if (corte === undefined) return null;
  const avance = (frame - (corte - duracion / 2)) / duracion; // 0 → 1
  const diagonal = Math.hypot(width, height);
  return (
    <AbsoluteFill style={{ overflow: 'hidden', pointerEvents: 'none' }}>
      {[colores.alerta, colores.acento, colores.fondo2].map((color, k) => {
        const retraso = k * 0.12;
        const p = Math.min(1, Math.max(0, (avance - retraso) / (1 - 0.24)));
        const x = -diagonal + p * diagonal * 2.2;
        return (
          <div
            key={k}
            style={{
              position: 'absolute',
              top: -height,
              left: x,
              width: diagonal * 0.55,
              height: height * 3,
              background: color,
              transform: 'rotate(18deg)',
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Sacudida que se apaga sola: se aplica en los golpes de texto para que se sientan como impacto. */
export function sacudida(frame, golpes, intensidad = 18) {
  const golpe = golpes.filter((g) => frame >= g && frame < g + 8).at(-1);
  if (golpe === undefined) return 'none';
  const t = frame - golpe;
  const fuerza = intensidad * (1 - t / 8);
  return `translate(${Math.sin(t * 2.7) * fuerza}px, ${Math.cos(t * 3.1) * fuerza}px)`;
}
