import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { sacudida } from '../componentes/Formas.jsx';
import { fuente } from '../fuentes.js';
import { useMarca } from '../marca.js';
import { Estallido } from './Golpe.jsx';

/**
 * Una palabra por pulso a pantalla completa, cada una sobre un bloque de color
 * distinto que entra barriendo. Es el momento de mas energia del video: se
 * usa una vez, para el resumen, no para explicar.
 */
export const Ritmo = ({ palabras = [], pulso = 15 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const { colores } = marca;
  const fondos = [colores.acento, colores.alerta, colores.tinta, colores.acento];
  const tintas = ['#FFFFFF', colores.fondo, colores.fondo, '#FFFFFF'];
  const i = Math.min(palabras.length - 1, Math.floor(frame / pulso));
  const inicio = i * pulso;
  const bloque = spring({ frame: frame - inicio, fps, config: { damping: 20, stiffness: 300 } });
  const texto = spring({ frame: frame - inicio - 2, fps, config: { damping: 12, stiffness: 260 } });
  const golpes = palabras.map((_, k) => k * pulso + 2);

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', transform: sacudida(frame, golpes, 14) }}>
      <div
        style={{
          position: 'absolute',
          width: 1300,
          height: 520,
          background: fondos[i % fondos.length],
          transform: `rotate(-6deg) scaleX(${bloque})`,
          transformOrigin: i % 2 ? 'right' : 'left',
        }}
      />
      <div style={{ position: 'relative', ...fuente(marca.fuentes.titulo), fontSize: Math.min(190, 1650 / Math.max(1, palabras[i].length)), letterSpacing: '-0.04em', color: tintas[i % tintas.length], transform: `scale(${1.6 - texto * 0.6}) rotate(-6deg)`, opacity: texto }}>
        {palabras[i]}
      </div>
      <Estallido desde={inicio + 2} cantidad={9} radio={560} />
    </AbsoluteFill>
  );
};
