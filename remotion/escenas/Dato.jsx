import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Aparecer } from '../componentes/Aparecer.jsx';
import { ICONOS } from '../componentes/Iconos.jsx';
import { TextoCinetico } from '../componentes/TextoCinetico.jsx';
import { fuente } from '../fuentes.js';
import { useMarca } from '../marca.js';
import { partirPalabras } from '../util.js';

/**
 * La consecuencia en numeros. Primero la frase, luego los inmuebles uno a
 * uno y al final la cifra corriendo: el orden hace que la cifra se lea como
 * la suma de lo que se acaba de ver, no como un numero suelto.
 */
export const Dato = ({ titulo, cantidad = 0, icono = 'casa', cifra, texto, nota }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const { colores } = marca;
  const Icono = ICONOS[icono];

  const finTitulo = 4 + partirPalabras(titulo).length * 3 + 6;
  const inicioCifra = finTitulo + cantidad * 5 + 8;
  const valor = cifra
    ? interpolate(frame, [inicioCifra, inicioCifra + fps * 1.2], [cifra.desde ?? 0, cifra.hasta], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.out(Easing.cubic),
      })
    : 0;

  return (
    <AbsoluteFill style={{ justifyContent: 'center', padding: '0 80px 220px', gap: 56 }}>
      <TextoCinetico texto={titulo} tamano={88} desde={4} />

      {cantidad > 0 ? (
        <div style={{ display: 'flex', gap: 34 }}>
          {Array.from({ length: cantidad }, (_, i) => {
            const e = spring({ frame: frame - finTitulo - i * 5, fps, config: { damping: 11 } });
            return (
              <div key={i} style={{ transform: `scale(${e})`, opacity: e }}>
                <Icono tamano={150} color={colores.tinta} relleno={colores.fondo2} />
              </div>
            );
          })}
        </div>
      ) : null}

      {cifra ? (
        <Aparecer desde={inicioCifra - 4} distancia={30}>
          <div style={{ ...fuente(marca.fuentes.titulo), fontSize: 150, lineHeight: 1, color: colores.alerta, letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}>
            {cifra.prefijo ?? ''}
            {Math.round(valor).toLocaleString('es-CO')}
          </div>
          {cifra.leyenda ? (
            <div style={{ ...fuente(marca.fuentes.enfasis), fontSize: 40, color: colores.tinta, marginTop: 18 }}>{cifra.leyenda}</div>
          ) : null}
        </Aparecer>
      ) : null}

      {texto ? (
        <Aparecer desde={inicioCifra + fps * 0.8}>
          <div style={{ ...fuente(marca.fuentes.texto), fontSize: 42, lineHeight: 1.35, color: colores.tenue, maxWidth: 900 }}>{texto}</div>
        </Aparecer>
      ) : null}

      {nota ? (
        <Aparecer desde={inicioCifra + fps} distancia={0}>
          <div style={{ ...fuente(marca.fuentes.texto), fontSize: 26, color: colores.tenue, opacity: 0.75 }}>{nota}</div>
        </Aparecer>
      ) : null}
    </AbsoluteFill>
  );
};
