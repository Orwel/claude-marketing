import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Aparecer } from '../componentes/Aparecer.jsx';
import { Firma } from '../componentes/Firma.jsx';
import { TextoCinetico } from '../componentes/TextoCinetico.jsx';
import { fuente } from '../fuentes.js';
import { useMarca } from '../marca.js';
import { partirPalabras } from '../util.js';

/** Frase de cierre, firma y un solo llamado a la accion: dos CTA compiten y ninguno gana. */
export const Cierre = ({ texto, cta, web }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const { colores, radio } = marca;
  const finTexto = 4 + partirPalabras(texto).length * 3 + 6;
  const boton = spring({ frame: frame - finTexto - 10, fps, config: { damping: 13 } });
  // Un latido suave del boton despues de entrar: el ojo termina ahi.
  const latido = 1 + Math.max(0, Math.sin((frame - finTexto - 30) / 7)) * 0.025;

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: 80, padding: '0 80px' }}>
      <Aparecer desde={0} distancia={40}>
        <Firma tamano={1.25} />
      </Aparecer>
      <TextoCinetico texto={texto} tamano={100} desde={6} alineacion="center" />
      {cta ? (
        <div
          style={{
            ...fuente(marca.fuentes.enfasis),
            transform: `scale(${boton * latido})`,
            opacity: boton,
            background: colores.acento,
            color: marca.id === 'contrappto' ? '#FFFFFF' : colores.fondo,
            fontSize: 40,
            padding: '30px 48px',
            borderRadius: radio === 14 ? 14 : 999,
            textAlign: 'center',
            maxWidth: 960,
            boxShadow: `0 20px 60px ${colores.acento}55`,
          }}
        >
          {cta}
        </div>
      ) : null}
      {web ? (
        <Aparecer desde={finTexto + 22}>
          <div style={{ ...fuente(marca.fuentes.texto), fontSize: 36, color: colores.tenue }}>{web}</div>
        </Aparecer>
      ) : null}
    </AbsoluteFill>
  );
};
