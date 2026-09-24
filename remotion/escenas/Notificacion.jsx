import React from 'react';
import { AbsoluteFill, Img, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Aparecer } from '../componentes/Aparecer.jsx';
import { Celular } from '../componentes/Celular.jsx';
import { TextoCinetico } from '../componentes/TextoCinetico.jsx';
import { fuente } from '../fuentes.js';
import { useMarca } from '../marca.js';

/**
 * El producto resolviendo el problema: la pantalla bloqueada recibe el
 * aviso. Es pantalla bloqueada y no la app abierta porque el valor es
 * justamente que no hay que abrir nada para enterarse.
 *
 * El aviso siempre lleva el icono de Contrappto, aunque el video salga en
 * otra cuenta: es el producto el que avisa, no la cuenta que publica.
 */
export const Notificacion = ({ titulo, hora = '9:41', fecha, avisos = [] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const { colores } = marca;
  const celular = spring({ frame: frame - 2, fps, config: { damping: 18, stiffness: 90 } });

  return (
    <AbsoluteFill style={{ alignItems: 'center', paddingTop: 250, gap: 56 }}>
      {titulo ? (
        <div style={{ width: 920 }}>
          <TextoCinetico texto={titulo} tamano={76} desde={0} alineacion="center" />
        </div>
      ) : null}
      <div style={{ transform: `translateY(${(1 - celular) * 500}px) rotate(${(1 - celular) * -6}deg)` }}>
        <Celular ancho={540}>
          <div style={{ position: 'absolute', top: 120, width: '100%', textAlign: 'center', color: '#fff' }}>
            <div style={{ ...fuente(marca.fuentes.texto), fontSize: 28, opacity: 0.8 }}>{fecha}</div>
            <div style={{ ...fuente(marca.fuentes.titulo), fontSize: 128, lineHeight: 1.05 }}>{hora}</div>
          </div>
          <div style={{ position: 'absolute', top: 390, left: 22, right: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {avisos.map((aviso, i) => (
              <Aviso key={i} aviso={aviso} desde={18 + i * 22} />
            ))}
          </div>
        </Celular>
      </div>
    </AbsoluteFill>
  );
};

const Aviso = ({ aviso, desde }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const entrada = spring({ frame: frame - desde, fps, config: { damping: 16, stiffness: 160 } });
  return (
    <div
      style={{
        transform: `translateY(${(1 - entrada) * -120}px) scale(${0.9 + entrada * 0.1})`,
        opacity: entrada,
        background: 'rgba(240,246,252,0.94)',
        borderRadius: 30,
        padding: '20px 22px',
        display: 'flex',
        gap: 16,
        boxShadow: '0 20px 40px rgba(0,0,0,.35)',
      }}
    >
      <div style={{ width: 62, height: 62, borderRadius: 16, background: '#07141D', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <Img src={staticFile('marcas/contrappto/icono.png')} style={{ width: 46 }} />
      </div>
      <div style={{ flex: 1, color: '#07141D' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', ...fuente(marca.fuentes.texto), fontSize: 20, opacity: 0.6 }}>
          <span>CONTRAPPTO</span>
          <span>{aviso.cuando ?? 'ahora'}</span>
        </div>
        <div style={{ ...fuente(marca.fuentes.enfasis), fontSize: 27, marginTop: 4 }}>{aviso.titulo}</div>
        <div style={{ ...fuente(marca.fuentes.texto), fontSize: 23, lineHeight: 1.3, marginTop: 4, opacity: 0.85 }}>{aviso.cuerpo}</div>
      </div>
    </div>
  );
};
