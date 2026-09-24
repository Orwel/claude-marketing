import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { ICONOS } from '../componentes/Iconos.jsx';
import { TextoCinetico } from '../componentes/TextoCinetico.jsx';
import { fuente } from '../fuentes.js';
import { useMarca } from '../marca.js';

/**
 * Pasos que se apilan como capas. En Contrappto no es decorativo: el logo son
 * capas apiladas, y el contrato gana una capa en cada etapa de su vida.
 * Cada paso nuevo se enciende y el anterior se atenua, para que el ojo lea
 * uno a la vez.
 */
export const Pasos = ({ titulo, pasos = [], segundos }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const { colores, radio } = marca;
  const inicio = titulo ? 26 : 6;
  const porPaso = Math.floor((segundos * fps - inicio - 10) / pasos.length);
  const actual = Math.min(pasos.length - 1, Math.max(0, Math.floor((frame - inicio) / porPaso)));

  return (
    <AbsoluteFill style={{ justifyContent: 'center', padding: '0 80px', gap: 60 }}>
      {titulo ? <TextoCinetico texto={titulo} tamano={80} desde={2} /> : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
        {pasos.map((paso, i) => {
          const entrada = spring({ frame: frame - inicio - i * porPaso, fps, config: { damping: 16, stiffness: 120 } });
          const Icono = ICONOS[paso.icono] ?? ICONOS.documento;
          const enFoco = i === actual;
          return (
            <div
              key={i}
              style={{
                opacity: entrada * (enFoco ? 1 : 0.45),
                transform: `translateX(${(1 - entrada) * 300}px)`,
                display: 'flex',
                gap: 30,
                alignItems: 'center',
                padding: '34px 36px',
                borderRadius: radio,
                background: enFoco ? colores.fondo2 : 'transparent',
                border: `3px solid ${enFoco ? colores.acento : colores.linea}`,
              }}
            >
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: Math.min(radio, 24),
                  background: enFoco ? colores.acento : colores.fondo2,
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <Icono tamano={54} color={enFoco ? '#FFFFFF' : colores.tenue} />
              </div>
              <div>
                <div style={{ ...fuente(marca.fuentes.enfasis), fontSize: 48, color: colores.tinta }}>{paso.titulo}</div>
                <div style={{ ...fuente(marca.fuentes.texto), fontSize: 33, lineHeight: 1.3, color: colores.tenue, marginTop: 6 }}>{paso.texto}</div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
