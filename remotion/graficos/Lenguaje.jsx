import React from 'react';
import { interpolate, random, useCurrentFrame, useVideoConfig } from 'remotion';
import { fuente } from '../fuentes.js';
import { useMarca } from '../marca.js';
import { conAlfa } from '../util.js';
import { avance, entrar, Pastilla, salto, Ventana, Vidrio } from './base.jsx';
import { T } from './tiempos.js';

/**
 * "Explicar el lenguaje con matematicas", en tres tiempos: las palabras caen
 * como fichas, debajo de cada una aparecen sus numeros, y al final las barras
 * de que palabra viene despues. Es un ejemplo ilustrativo, no datos de un
 * modelo real: la pieza lo dice en pantalla y en verificar[].
 */
export const Lenguaje = ({ g }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const { colores } = marca;
  const t = T.lenguaje;
  const fichas = g.fichas ?? [];
  const opciones = g.opciones ?? [];
  const vectores = avance(frame, t.vectores, 16);
  const barras = avance(frame, t.barras - 6, 10);
  const ganadora = avance(frame, t.ganadora, 10);

  return (
    <Vidrio alto={530}>
      <div style={entrar(avance(frame, 0, 12))}>
        <Ventana etiqueta={g.etiqueta ?? 'lenguaje → números'} derecha={<Pastilla texto={g.pastilla ?? 'predicción'} color={colores.secundario} vivo frame={frame} fps={fps} />} />
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'nowrap', alignItems: 'flex-start' }}>
        {fichas.map((f, i) => {
          const a = salto(frame, t.fichas + i * t.pasoFicha, fps);
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, opacity: a, transform: `translateY(${(1 - a) * 18}px) scale(${0.9 + a * 0.1})` }}>
              <div
                style={{
                  ...fuente(marca.fuentes.enfasis),
                  fontSize: 30,
                  padding: '10px 16px',
                  borderRadius: 14,
                  background: conAlfa(colores.secundario ?? colores.acento, 0.14 + vectores * 0.1),
                  border: `1px solid ${conAlfa(colores.secundario ?? colores.acento, 0.5)}`,
                  boxShadow: `0 0 ${vectores * 18}px ${conAlfa(colores.secundario ?? colores.acento, 0.35)}`,
                }}
              >
                {f}
              </div>
              <div style={{ ...fuente(marca.fuentes.texto), fontSize: 20, lineHeight: 1.35, color: colores.tenue, fontVariantNumeric: 'tabular-nums', textAlign: 'center', opacity: vectores, maxHeight: vectores * 90, overflow: 'hidden' }}>
                {[0, 1, 2].map((k) => {
                  // Los numeros "ruedan" mientras aparecen y luego se quedan quietos.
                  const quieto = frame > t.vectores + 16 + i * 2;
                  const semilla = quieto ? `${f}-${k}` : `${f}-${k}-${Math.floor(frame / 2)}`;
                  return <div key={k}>{((random(semilla) * 2 - 1) * 0.99).toFixed(2)}</div>;
                })}
              </div>
            </div>
          );
        })}
        <div style={{ ...fuente(marca.fuentes.enfasis), fontSize: 30, padding: '10px 16px', borderRadius: 14, border: `2px dashed ${conAlfa(colores.acento, 0.7)}`, color: colores.acento, opacity: avance(frame, t.fichas + fichas.length * t.pasoFicha, 8) }}>
          {ganadora > 0.5 ? opciones[0]?.texto : '___'}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', gap: 14, opacity: barras }}>
        {opciones.map((o, i) => {
          const b = avance(frame, t.barras + i * t.pasoBarra, 18);
          const gana = i === 0;
          const color = gana ? colores.acento : colores.tenue;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ ...fuente(marca.fuentes.enfasis), width: 170, fontSize: 30, color: gana ? colores.tinta : colores.tenue }}>{o.texto}</div>
              <div style={{ flex: 1, height: 22, borderRadius: 11, background: conAlfa(colores.tinta, 0.08), overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${o.valor * b}%`, borderRadius: 11, background: gana ? `linear-gradient(90deg, ${colores.acento}, ${colores.secundario ?? colores.acento})` : conAlfa(color, 0.6), boxShadow: gana ? `0 0 ${ganadora * 24}px ${conAlfa(colores.acento, 0.7)}` : undefined }} />
              </div>
              <div style={{ ...fuente(marca.fuentes.enfasis), width: 90, textAlign: 'right', fontSize: 30, color, fontVariantNumeric: 'tabular-nums' }}>{Math.round(o.valor * b)}%</div>
            </div>
          );
        })}
        {g.nota ? <div style={{ ...fuente(marca.fuentes.texto), fontSize: 20, color: colores.tenue, opacity: interpolate(barras, [0, 1], [0, 0.8]) }}>{g.nota}</div> : null}
      </div>
    </Vidrio>
  );
};
