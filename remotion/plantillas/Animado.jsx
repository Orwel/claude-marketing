import React from 'react';
import { AbsoluteFill, Audio, interpolate, Sequence, Series, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Fondo } from '../componentes/Fondo.jsx';
import { Barrido, Formas } from '../componentes/Formas.jsx';
import { Etiqueta, Firma } from '../componentes/Firma.jsx';
import { CelularReal } from '../escenas/CelularReal.jsx';
import { Cierre } from '../escenas/Cierre.jsx';
import { Dato } from '../escenas/Dato.jsx';
import { Frase } from '../escenas/Frase.jsx';
import { Gancho } from '../escenas/Gancho.jsx';
import { Golpe } from '../escenas/Golpe.jsx';
import { LineaTiempo } from '../escenas/LineaTiempo.jsx';
import { Notificacion } from '../escenas/Notificacion.jsx';
import { Pantalla } from '../escenas/Pantalla.jsx';
import { Partes } from '../escenas/Partes.jsx';
import { Pasos } from '../escenas/Pasos.jsx';
import { Ritmo } from '../escenas/Ritmo.jsx';
import { useFuentes } from '../fuentes.js';
import { ContextoMarca, useMarca } from '../marca.js';
import { aCuadros, resolver, solapeDe, tramosDe } from '../util.js';

/** Tipos de escena que una pieza puede pedir. Agregar uno nuevo es agregarlo aqui. */
const ESCENAS = {
  gancho: Gancho,
  frase: Frase,
  lineaTiempo: LineaTiempo,
  dato: Dato,
  notificacion: Notificacion,
  pasos: Pasos,
  cierre: Cierre,
  golpe: Golpe,
  partes: Partes,
  pantalla: Pantalla,
  ritmo: Ritmo,
  celularReal: CelularReal,
};

/**
 * Plantilla Animado: video 100 % generado, sin metraje.
 *
 * Lee dos capas por props y no sabe nada de ninguna cuenta en particular:
 *   marca → como se ve (marcas/<cuenta>.json)
 *   pieza → que dice (piezas/AAAA-MM/<slug>.json), con su variante por cuenta
 */
export const Animado = ({ pieza, marca, voz }) => {
  useFuentes();
  const variante = pieza.variantes?.[marca.id] ?? {};
  const { fps } = useVideoConfig();

  const tramos = tramosDe(pieza, fps);
  const solape = solapeDe(pieza);
  // Cuadros entre pulsos de la musica. Las escenas con ritmo golpean sobre este compas.
  const pulso = Math.round((60 / (pieza.bpm ?? 120)) * fps);

  return (
    <ContextoMarca.Provider value={marca}>
      <AbsoluteFill>
        <Fondo />
        {pieza.formas ? <Formas cuadrosPorPulso={pulso} /> : null}
        {pieza.pista ? <Audio src={staticFile(`audio/${pieza.slug}--${marca.id}.wav`)} volume={(pieza.volumenPista ?? 0.8) * (voz ? 0.35 : 1)} /> : null}
        <Series>
          {pieza.escenas.map((escena, i) => {
            const Escena = ESCENAS[escena.tipo];
            if (!Escena) throw new Error(`Escena desconocida: "${escena.tipo}" en ${pieza.slug}`);
            const props = Object.fromEntries(Object.entries(escena).map(([k, v]) => [k, resolver(v, variante)]));
            const duracion = aCuadros(escena.segundos, fps);
            return (
              <Series.Sequence key={i} durationInFrames={duracion} offset={i === 0 ? 0 : -solape} name={escena.tipo}>
                <Fundido duracion={duracion} solape={solape} primera={i === 0} ultima={i === pieza.escenas.length - 1}>
                  <Escena {...props} pulso={pulso} />
                  {/* La voz entra 6 cuadros despues del corte: pegada al corte se pisa con el barrido. */}
                  {voz?.escenas[i] ? (
                    <Sequence from={6}>
                      <Audio src={staticFile(voz.escenas[i].archivo)} />
                    </Sequence>
                  ) : null}
                </Fundido>
              </Series.Sequence>
            );
          })}
        </Series>
        {pieza.transicion === 'barrido' ? <Barrido cortes={tramos.slice(1).map((t) => t.inicio)} /> : null}
        <Marco etiqueta={resolver(variante.etiqueta ?? '', variante)} tramos={tramos} solape={solape || 8} />
      </AbsoluteFill>
    </ContextoMarca.Provider>
  );
};

/** Fundido cruzado: la escena entrante sube mientras la saliente baja, en los cuadros que se solapan. */
const Fundido = ({ duracion, solape, primera, ultima, children }) => {
  const frame = useCurrentFrame();
  // Sin solape (barrido) no hay fundido: la escena entra y sale en seco.
  if (!solape) return <AbsoluteFill>{children}</AbsoluteFill>;
  const entrada = primera ? 1 : interpolate(frame, [0, solape], [0, 1], { extrapolateRight: 'clamp' });
  const salida = ultima ? 1 : interpolate(frame, [duracion - solape, duracion], [1, 0], { extrapolateLeft: 'clamp' });
  const escala = ultima ? 1 : interpolate(frame, [duracion - solape, duracion], [1, 0.96], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ opacity: Math.min(entrada, salida), transform: `scale(${escala})` }}>{children}</AbsoluteFill>;
};

/**
 * Escenas donde la firma pequeña estorba: el celular ocupa ese espacio y el
 * cierre ya trae la firma en grande.
 */
const SIN_FIRMA = new Set(['gancho', 'golpe', 'ritmo', 'notificacion', 'celularReal', 'cierre']);

/**
 * Lo que se queda fijo durante todo el video: etiqueta arriba, firma pequeña
 * abajo y barra de progreso. Respeta las zonas que tapa la interfaz de
 * Instagram (unos 220 px arriba y 380 abajo).
 */
const Marco = ({ etiqueta, tramos, solape }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  // Visible en las escenas que la admiten, con el mismo fundido que las escenas.
  const firma = Math.max(
    0,
    ...tramos
      .filter((t) => !SIN_FIRMA.has(t.tipo))
      .map((t) => interpolate(frame, [t.inicio, t.inicio + solape, t.fin - solape, t.fin], [0, 0.85, 0.85, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }))
  );
  const marca = useMarca();
  return (
    <>
      <AbsoluteFill style={{ top: 150, left: 80, height: 'auto', alignItems: 'flex-start' }}>
        <Etiqueta texto={etiqueta} />
      </AbsoluteFill>
      <AbsoluteFill style={{ top: 'auto', bottom: 400, left: 80, height: 'auto', opacity: firma }}>
        <Firma tamano={0.55} />
      </AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          height: 8,
          width: `${(frame / (durationInFrames - 1)) * 100}%`,
          background: marca.colores.acento,
        }}
      />
    </>
  );
};
