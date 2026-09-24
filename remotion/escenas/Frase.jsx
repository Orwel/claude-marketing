import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Aparecer } from '../componentes/Aparecer.jsx';
import { TextoCinetico } from '../componentes/TextoCinetico.jsx';
import { fuente } from '../fuentes.js';
import { useMarca } from '../marca.js';
import { partirPalabras } from '../util.js';

/** Una idea y su explicacion. El subtexto entra cuando termina la frase, no antes. */
export const Frase = ({ texto, subtexto }) => {
  const marca = useMarca();
  const finFrase = 4 + partirPalabras(texto).length * 3 + 8;
  return (
    <AbsoluteFill style={{ justifyContent: 'center', padding: '0 80px', gap: 48 }}>
      <TextoCinetico texto={texto} tamano={104} desde={4} />
      {subtexto ? (
        <Aparecer desde={finFrase}>
          <div style={{ ...fuente(marca.fuentes.texto), fontSize: 46, lineHeight: 1.35, color: marca.colores.tenue, maxWidth: 880 }}>
            {subtexto}
          </div>
        </Aparecer>
      ) : null}
    </AbsoluteFill>
  );
};
