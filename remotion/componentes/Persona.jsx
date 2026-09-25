import React from 'react';
import { useMarca } from '../marca.js';

/**
 * Persona plana, sin rasgos: representa a una parte del contrato sin que sea
 * nadie en particular (ni cliente ni caso identificable). Cambia el tono de
 * piel y la ropa para que las dos partes no se vean iguales.
 */
export const Persona = ({ tamano = 300, ropa, piel = '#E0B08A', pelo = '#2B1B12', variante = 0 }) => {
  const { colores } = useMarca();
  const color = ropa ?? colores.acento;
  return (
    <svg width={tamano} height={tamano * 1.25} viewBox="0 0 100 125">
      {/* cuerpo */}
      <path d="M14 125 C14 88 30 76 50 76 C70 76 86 88 86 125 Z" fill={color} />
      <path d="M42 76 L50 90 L58 76 Z" fill={colores.tinta} opacity="0.9" />
      {/* cuello y cabeza */}
      <rect x="44" y="60" width="12" height="18" rx="5" fill={piel} />
      <circle cx="50" cy="44" r="22" fill={piel} />
      {variante === 0 ? (
        <path d="M28 42 C28 22 42 16 52 18 C66 19 74 28 72 42 C66 34 56 30 44 32 C38 33 32 36 28 42 Z" fill={pelo} />
      ) : (
        <path d="M27 48 C24 24 40 14 52 16 C68 17 78 30 73 50 C74 38 66 28 50 28 C38 28 30 36 27 48 Z" fill={pelo} />
      )}
    </svg>
  );
};
