import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { ContextoMarca } from '../marca.js';
import { useFuentes, fuente } from '../fuentes.js';
import { Moneda3D, Mundo3D, Trifuerza3D } from './Tres.jsx';

/** Laboratorio de la plantilla Arcade: prueba de three.js y fuentes pixel en el render sin GPU. */
export const LabArcade = ({ marca, escena = 'trifuerza' }) => {
  useFuentes();
  const { width, height } = useVideoConfig();
  return (
    <ContextoMarca.Provider value={marca}>
      <AbsoluteFill style={{ backgroundColor: marca.colores.fondo }}>
        {escena === 'trifuerza' ? <Trifuerza3D ancho={width} alto={height} /> : escena === 'moneda' ? <Moneda3D ancho={width} alto={height} /> : <Mundo3D ancho={width} alto={height} nivel={2} />}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 260, textAlign: 'center', ...fuente({ familia: 'Press Start 2P', peso: 400 }), fontSize: 44, color: marca.colores.tinta, lineHeight: 1.6, textShadow: `6px 6px 0 ${marca.colores.acento}` }}>
          SOFA 2026<br />PRESS START
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 420, textAlign: 'center', ...fuente({ familia: 'VT323', peso: 400 }), fontSize: 64, color: marca.colores.tinta }}>¿A quién demandaría tu personaje?</div>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 340, textAlign: 'center', ...fuente({ familia: 'Silkscreen', peso: 400 }), fontSize: 40, color: marca.colores.acento }}>PLAYER 2 · CABALLERO</div>
      </AbsoluteFill>
    </ContextoMarca.Provider>
  );
};
