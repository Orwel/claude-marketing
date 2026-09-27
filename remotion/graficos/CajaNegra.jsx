import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fuente } from '../fuentes.js';
import { useMarca } from '../marca.js';
import { conAlfa } from '../util.js';
import { avance, Constelacion, entrar, latido, Pastilla, Ventana, Vidrio } from './base.jsx';
import { T } from './tiempos.js';

/**
 * "La IA por dentro": una red que se enciende sola dentro de una ventana y,
 * en el centro, la pregunta. La red es la constelacion de trifuerza.co; los
 * aros que se expanden son los del escaneo de Contrappto.
 */
export const CajaNegra = ({ g }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const { colores } = marca;
  const t = T.cajaNegra;
  const red = avance(frame, t.nodos, 24);
  const pregunta = avance(frame, t.pregunta, 12);
  const aro = (k) => ((frame - t.pregunta - k * 10) / (fps * 1.4)) % 1;

  return (
    <Vidrio alto={530}>
      <div style={entrar(avance(frame, 0, 12))}>
        <Ventana etiqueta={g.etiqueta ?? 'modelo de lenguaje'} derecha={<Pastilla texto={g.pastilla ?? 'caja negra'} vivo frame={frame} fps={fps} />} />
      </div>
      <div style={{ position: 'absolute', top: 70, left: 0, right: 0, bottom: 0 }}>
        <Constelacion frame={frame} fps={fps} ancho={852} alto={360} aparicion={red} semilla="caja" />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {[0, 1].map((k) =>
            frame > t.pregunta + k * 10 ? (
              <div
                key={k}
                style={{
                  position: 'absolute',
                  width: 200,
                  height: 200,
                  borderRadius: '50%',
                  border: `3px solid ${colores.acento}`,
                  transform: `scale(${0.85 + aro(k) * 0.9})`,
                  opacity: (1 - aro(k)) * 0.6,
                }}
              />
            ) : null
          )}
          <div
            style={{
              ...fuente(marca.fuentes.titulo),
              fontSize: 210,
              lineHeight: 1,
              color: colores.acento,
              opacity: pregunta,
              transform: `scale(${0.6 + pregunta * 0.4})`,
              textShadow: `0 0 ${30 + latido(frame, fps, 0, 40, 1.2)}px ${conAlfa(colores.acento, 0.8)}`,
            }}
          >
            ?
          </div>
        </div>
        {g.titulo ? (
          <div style={{ position: 'absolute', left: 0, bottom: 0, ...fuente(marca.fuentes.titulo), fontSize: 46, ...entrar(avance(frame, t.pregunta + 6, 14)) }}>{g.titulo}</div>
        ) : null}
      </div>
    </Vidrio>
  );
};
