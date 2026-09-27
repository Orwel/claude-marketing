import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { fuente } from '../fuentes.js';
import { useMarca } from '../marca.js';
import { conAlfa } from '../util.js';
import { avance, entrar, latido, Pastilla, salto, Ventana, Vidrio } from './base.jsx';
import { T } from './tiempos.js';

/**
 * Una referencia (ensayo, libro, articulo) que se escribe sola: titulo a
 * maquina con cursor, renglones que aparecen y la fila del autor cuando se
 * nombra. El cursor parpadea en escalon, como el typewriter de trifuerza.co.
 */
export const Ensayo = ({ g }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const { colores } = marca;
  const t = T.ensayo;
  const titulo = g.titulo ?? '';
  const letras = Math.max(0, Math.floor((frame - t.titulo) / t.cuadrosPorLetra));
  const escribiendo = letras < titulo.length;
  const cursor = escribiendo || Math.floor(frame / (fps * 0.35)) % 2 === 0;
  const autor = g.marcas?.autor ?? 40;
  const a = salto(frame, autor, fps);
  // Barrido de brillo sobre el titulo cuando termina de escribirse.
  const finTitulo = t.titulo + titulo.length * t.cuadrosPorLetra;
  const brillo = interpolate(frame, [finTitulo, finTitulo + 18], [-40, 140], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <Vidrio alto={530}>
      <div style={entrar(avance(frame, 0, 12))}>
        <Ventana etiqueta={g.etiqueta ?? 'ensayo'} derecha={<Pastilla texto={g.pastilla ?? String(g.anio ?? '')} color={colores.secundario} />} />
      </div>
      <div
        style={{
          ...fuente(marca.fuentes.titulo),
          fontSize: 50,
          lineHeight: 1.15,
          minHeight: 176,
          backgroundImage: `linear-gradient(100deg, ${colores.tinta} ${brillo - 20}%, ${colores.acento} ${brillo}%, ${colores.tinta} ${brillo + 20}%)`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        }}
      >
        {titulo.slice(0, letras)}
        <span style={{ display: 'inline-block', width: 4, height: 48, marginLeft: 6, verticalAlign: 'middle', background: colores.acento, opacity: cursor ? 1 : 0 }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 22 }}>
        {[0.92, 0.78, 0.86].map((w, i) => {
          const r = avance(frame, t.lineas + i * t.pasoLinea, 12);
          return <div key={i} style={{ height: 14, width: `${w * 100 * r}%`, borderRadius: 7, background: conAlfa(colores.tinta, 0.12) }} />;
        })}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 22,
          opacity: a,
          transform: `translateX(${(1 - a) * -12}px) scale(${0.95 + a * 0.05})`,
        }}
      >
        <div
          style={{
            ...fuente(marca.fuentes.enfasis),
            width: 76,
            height: 76,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            color: colores.fondo,
            background: `linear-gradient(135deg, ${colores.acento}, ${colores.secundario ?? colores.acento})`,
            boxShadow: `0 0 0 ${latido(frame, fps, 2, 8, 1.4)}px ${conAlfa(colores.acento, 0.25)}`,
          }}
        >
          {(g.autor ?? '')
            .split(' ')
            .map((p) => p[0])
            .join('')}
        </div>
        <div>
          <div style={{ ...fuente(marca.fuentes.enfasis), fontSize: 36 }}>{g.autor}</div>
          {g.rol ? <div style={{ ...fuente(marca.fuentes.texto), fontSize: 26, color: colores.tenue, marginTop: 4 }}>{g.rol}</div> : null}
        </div>
      </div>
    </Vidrio>
  );
};
