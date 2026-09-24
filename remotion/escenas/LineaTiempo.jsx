import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Aparecer } from '../componentes/Aparecer.jsx';
import { TextoCinetico } from '../componentes/TextoCinetico.jsx';
import { fuente } from '../fuentes.js';
import { useMarca } from '../marca.js';
import { conAlfa } from '../util.js';

const ANCHO = 900;

/**
 * La vida de un contrato en una linea. Un punto recorre los meses y cada
 * pago se enciende al pasar; el hito destacado (el reajuste) llega al final
 * y ahi se detiene. La espera es el mensaje: lo que nadie recuerda esta al
 * final del año, cuando ya nadie mira.
 */
export const LineaTiempo = ({ titulo, meses = 12, hitos = [], etiquetaPagos }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const { colores } = marca;

  const trazo = interpolate(frame, [10, 34], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  // El recorrido acelera y frena: se siente como tiempo que pasa, no como una barra de carga.
  const recorrido = interpolate(frame, [30, 30 + fps * 2.4], [0, meses], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.quad),
  });
  const xDe = (mes) => (mes / meses) * ANCHO;

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: 140 }}>
      <div style={{ width: ANCHO }}>
        <TextoCinetico texto={titulo} tamano={84} desde={2} />
      </div>

      <div style={{ position: 'relative', width: ANCHO, height: 360 }}>
        {/* linea base */}
        <div style={{ position: 'absolute', top: 180, left: 0, height: 6, width: ANCHO * trazo, borderRadius: 3, background: colores.linea }} />
        {/* tramo recorrido */}
        <div style={{ position: 'absolute', top: 180, left: 0, height: 6, width: xDe(recorrido), borderRadius: 3, background: colores.acento }} />

        {Array.from({ length: meses + 1 }, (_, mes) => {
          const pasado = recorrido >= mes - 0.01;
          const pop = spring({ frame: frame - (30 + (mes / meses) * fps * 2.4), fps, config: { damping: 12 } });
          const esPago = mes > 0 && mes < meses;
          return (
            <div
              key={mes}
              style={{
                position: 'absolute',
                top: 183,
                left: xDe(mes),
                transform: `translate(-50%, -50%) scale(${esPago && pasado ? 0.8 + pop * 0.2 : 1})`,
                width: esPago ? 22 : 34,
                height: esPago ? 22 : 34,
                borderRadius: 999,
                background: pasado ? colores.acento : colores.fondo,
                border: `4px solid ${pasado ? colores.acento : colores.linea}`,
                opacity: trazo > mes / meses ? 1 : 0,
              }}
            />
          );
        })}

        {etiquetaPagos ? (
          <Aparecer desde={50} style={{ position: 'absolute', top: 222, left: xDe(1), width: xDe(meses - 1) - xDe(1), textAlign: 'center' }}>
            <div style={{ borderTop: `3px solid ${colores.linea}`, margin: '0 0 14px', height: 12, borderLeft: `3px solid ${colores.linea}`, borderRight: `3px solid ${colores.linea}` }} />
            <span style={{ ...fuente(marca.fuentes.texto), fontSize: 34, color: colores.tenue }}>{etiquetaPagos}</span>
          </Aparecer>
        ) : null}

        {hitos.map((hito, i) => (
          <Hito key={i} hito={hito} x={xDe(hito.mes)} activo={recorrido >= hito.mes - 0.01} frameLlegada={30 + (hito.mes / meses) * fps * 2.4} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Hito = ({ hito, x, activo, frameLlegada }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const { colores, radio } = marca;
  const color = hito.destacado ? colores.alerta : colores.tinta;
  const entrada = spring({ frame: frame - (hito.destacado ? frameLlegada : 14), fps, config: { damping: 14 } });
  // Pulso que se repite: el hito destacado sigue llamando la atencion mientras se lee.
  const pulso = hito.destacado && activo ? ((frame - frameLlegada) % 30) / 30 : 0;
  const alineado = x > 700 ? 'right' : x < 200 ? 'left' : 'center';
  const desplazamiento = alineado === 'right' ? '-100%' : alineado === 'left' ? '0%' : '-50%';

  return (
    <>
      {hito.destacado && activo ? (
        <div
          style={{
            position: 'absolute',
            top: 183,
            left: x,
            width: 34 + pulso * 90,
            height: 34 + pulso * 90,
            transform: 'translate(-50%, -50%)',
            borderRadius: 999,
            border: `4px solid ${conAlfa(colores.alerta, 1 - pulso)}`,
          }}
        />
      ) : null}
      {hito.destacado && activo ? (
        <div style={{ position: 'absolute', top: 183, left: x, width: 34, height: 34, transform: 'translate(-50%, -50%)', borderRadius: 999, background: colores.alerta }} />
      ) : null}
      <div
        style={{
          position: 'absolute',
          left: x + (alineado === 'right' ? 24 : alineado === 'left' ? -24 : 0),
          top: hito.lado === 'abajo' ? 236 : 0,
          transform: `translate(${desplazamiento}, ${(1 - entrada) * 30}px)`,
          opacity: entrada,
          textAlign: alineado,
          ...(hito.destacado
            ? { background: colores.fondo2, border: `3px solid ${colores.alerta}`, borderRadius: radio, padding: '18px 26px' }
            : {}),
        }}
      >
        {hito.detalle ? (
          <div style={{ ...fuente(marca.fuentes.texto), fontSize: 28, color: colores.tenue, whiteSpace: 'nowrap' }}>{hito.detalle}</div>
        ) : null}
        <div style={{ ...fuente(marca.fuentes.enfasis), fontSize: hito.destacado ? 46 : 36, color, whiteSpace: 'nowrap' }}>{hito.texto}</div>
      </div>
    </>
  );
};
