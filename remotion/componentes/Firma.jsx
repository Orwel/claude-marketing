import React from 'react';
import { Img, staticFile } from 'remotion';
import { fuente } from '../fuentes.js';
import { useMarca } from '../marca.js';

/**
 * La firma de la cuenta: logo en Contrappto, @usuario en la marca personal.
 * El logo oficial de Contrappto tiene la palabra en gris para fondo blanco;
 * sobre fondo oscuro se usa el icono y la palabra se compone en Sora.
 */
export const Firma = ({ tamano = 1 }) => {
  const marca = useMarca();
  const { firma, colores } = marca;

  if (firma.tipo === 'logo') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 * tamano }}>
        <Img src={staticFile(firma.icono)} style={{ height: 78 * tamano }} />
        <span style={{ ...fuente(marca.fuentes.enfasis), fontSize: 64 * tamano, color: colores.tinta, letterSpacing: '0.01em' }}>
          {firma.texto}
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 * tamano }}>
      <span style={{ ...fuente(marca.fuentes.titulo), fontSize: 64 * tamano, color: colores.tinta }}>juanda</span>
      <span style={{ ...fuente(marca.fuentes.titulo), fontSize: 64 * tamano, color: colores.acento }}>.</span>
      <span style={{ ...fuente(marca.fuentes.texto), fontSize: 40 * tamano, color: colores.tenue }}>trifuerza</span>
    </div>
  );
};

/** Pastilla superior con el pilar o la serie. Da contexto en el primer segundo sin gastar palabras del gancho. */
export const Etiqueta = ({ texto }) => {
  const marca = useMarca();
  if (!texto) return null;
  return (
    <div
      style={{
        ...fuente(marca.fuentes.enfasis),
        display: 'inline-flex',
        alignItems: 'center',
        gap: 14,
        fontSize: 30,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: marca.colores.tinta,
        padding: '14px 26px',
        borderRadius: 999,
        border: `2px solid ${marca.colores.linea}`,
        background: marca.colores.fondo2,
      }}
    >
      <span style={{ width: 14, height: 14, borderRadius: 999, background: marca.colores.acento }} />
      {texto}
    </div>
  );
};
