import React from 'react';

/** Iconos de trazo propio: evita depender de una libreria de iconos por cuatro dibujos. */
export const Casa = ({ tamano = 120, color, relleno = 'none' }) => (
  <svg width={tamano} height={tamano} viewBox="0 0 48 48" fill="none">
    <path d="M6 22 24 7l18 15" stroke={color} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M11 19v21h26V19" fill={relleno} stroke={color} strokeWidth="3.4" strokeLinejoin="round" />
    <path d="M20 40V29h8v11" stroke={color} strokeWidth="3.4" strokeLinejoin="round" />
  </svg>
);

export const Campana = ({ tamano = 40, color }) => (
  <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none">
    <path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2Z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    <path d="M10 20a2 2 0 0 0 4 0" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const Documento = ({ tamano = 40, color }) => (
  <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none">
    <path d="M6 3h8l4 4v14H6z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    <path d="M9 12h6M9 16h6M14 3v4h4" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const Firmar = ({ tamano = 40, color }) => (
  <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none">
    <path d="M3 18c3-6 5-9 6-9 2 0-2 8 0 8s3-4 4-4 1 3 3 3 3-2 5-2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 21h18" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const Ciclo = ({ tamano = 40, color }) => (
  <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none">
    <path d="M20 12a8 8 0 0 1-14 5.3M4 12a8 8 0 0 1 14-5.3" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <path d="M18 3v4h-4M6 21v-4h4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ICONOS = { casa: Casa, campana: Campana, documento: Documento, firmar: Firmar, ciclo: Ciclo };
