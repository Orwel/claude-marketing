import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { fuente } from '../fuentes.js';
import { useMarca } from '../marca.js';
import { partirPalabras } from '../util.js';

/**
 * Texto que entra palabra a palabra. El ritmo de lectura lo marca la
 * animacion: si todo aparece de golpe, el ojo salta al final y el gancho
 * pierde fuerza.
 *
 * Las palabras entre *asteriscos* se resaltan segun la marca: marcador
 * (Contrappto, producto) o subrayado (juanda, editorial).
 */
export const TextoCinetico = ({
  texto,
  tamano = 96,
  desde = 0,
  paso = 3,
  estilo = 'titulo',
  color,
  alineacion = 'left',
  anchoMax = 920,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const palabras = partirPalabras(texto);

  return (
    <div
      style={{
        ...fuente(marca.fuentes[estilo]),
        fontSize: tamano,
        lineHeight: 1.12,
        letterSpacing: estilo === 'titulo' ? '-0.02em' : '0',
        color: color ?? marca.colores.tinta,
        textAlign: alineacion,
        maxWidth: anchoMax,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: alineacion === 'center' ? 'center' : 'flex-start',
        columnGap: tamano * 0.26,
        rowGap: tamano * 0.08,
      }}
    >
      {palabras.map((p, i) => {
        const inicio = desde + i * paso;
        const avance = spring({ frame: frame - inicio, fps, config: { damping: 18, stiffness: 140, mass: 0.7 } });
        const resaltado = spring({ frame: frame - inicio - 8, fps, config: { damping: 200 } });
        return (
          <span
            key={i}
            style={{
              position: 'relative',
              display: 'inline-block',
              opacity: Math.min(1, avance * 1.4),
              transform: `translateY(${(1 - avance) * tamano * 0.45}px)`,
              color: p.enfasis && marca.resaltado === 'subrayado' ? marca.colores.acento : undefined,
            }}
          >
            {p.enfasis ? <Resaltado tipo={marca.resaltado} avance={resaltado} tamano={tamano} puente={p.sigue ? tamano * 0.26 : 0} previo={p.previo} /> : null}
            <span style={{ position: 'relative' }}>{p.texto}</span>
          </span>
        );
      })}
    </div>
  );
};

const Resaltado = ({ tipo, avance, tamano, puente, previo }) => {
  const { colores, radio } = useMarca();
  if (tipo === 'subrayado') {
    return (
      <span
        style={{
          position: 'absolute',
          left: 0,
          right: -puente,
          bottom: -tamano * 0.06,
          height: Math.max(6, tamano * 0.07),
          background: colores.acento,
          transform: `scaleX(${avance})`,
          transformOrigin: 'left',
          borderRadius: 4,
        }}
      />
    );
  }
  // Marcador: bloque de color detras de la palabra, un poco mas ancho que ella.
  return (
    <span
      style={{
        position: 'absolute',
        left: previo ? 0 : -tamano * 0.12,
        right: puente ? -puente : -tamano * 0.12,
        top: tamano * 0.08,
        bottom: tamano * 0.02,
        background: colores.acento,
        // Solo se redondean los extremos del tramo resaltado; las uniones quedan rectas.
        borderRadius: `${previo ? 0 : Math.min(radio, 14)}px ${puente ? 0 : Math.min(radio, 14)}px ${puente ? 0 : Math.min(radio, 14)}px ${previo ? 0 : Math.min(radio, 14)}px`,
        transform: `scaleX(${avance})`,
        transformOrigin: 'left',
      }}
    />
  );
};
