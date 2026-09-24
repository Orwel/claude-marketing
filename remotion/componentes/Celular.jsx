import React from 'react';
import { useMarca } from '../marca.js';

/**
 * Marco de celular generico, sin marca de fabricante: mostrar un iPhone o un
 * Samsung reconocible mete una marca ajena en el video. La pantalla es un
 * hijo cualquiera, para reutilizarlo en DemoApp con grabaciones reales.
 */
export const Celular = ({ ancho = 560, children }) => {
  const { colores } = useMarca();
  const alto = ancho * 2.05;
  const borde = ancho * 0.035;
  return (
    <div
      style={{
        width: ancho,
        height: alto,
        borderRadius: ancho * 0.14,
        padding: borde,
        background: 'linear-gradient(160deg, #3a4550 0%, #11181f 40%, #2a333c 100%)',
        boxShadow: `0 60px 120px rgba(0,0,0,.55), 0 0 0 2px rgba(255,255,255,.06), 0 0 120px ${colores.acento}33`,
        position: 'relative',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: ancho * 0.11,
          overflow: 'hidden',
          position: 'relative',
          background: `linear-gradient(170deg, ${colores.fondo2} 0%, ${colores.fondo} 100%)`,
        }}
      >
        {children}
        <div
          style={{
            position: 'absolute',
            top: ancho * 0.03,
            left: '50%',
            transform: 'translateX(-50%)',
            width: ancho * 0.3,
            height: ancho * 0.065,
            borderRadius: 999,
            background: '#000',
          }}
        />
      </div>
    </div>
  );
};
