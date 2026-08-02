import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const MARCA = {
  fondo: '#0F1620',
  acento: '#E8B04B',
  texto: '#FFFFFF',
  tenue: 'rgba(255,255,255,0.55)',
};

/**
 * El reel completo. Recibe todo por props desde producir.js:
 * nada de rutas hardcodeadas, para que la misma composicion sirva
 * para cualquier guion.
 */
export const Reel = ({ guion, palabras, audio, fondos, duracionSegundos, marca }) => {
  const { fps } = useVideoConfig();
  const colores = { ...MARCA, ...(marca?.colores ?? {}) };

  return (
    <AbsoluteFill style={{ backgroundColor: colores.fondo }}>
      <Fondo fondos={fondos} guion={guion} fps={fps} colores={colores} />

      {/* Velo oscuro: sin el, el texto blanco sobre un fondo generado
          es ilegible en cuanto el fondo tiene zonas claras. */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,.25) 45%, rgba(0,0,0,.75) 100%)`,
        }}
      />

      {audio ? <Audio src={staticFile(audio)} /> : null}

      <Gancho texto={guion.gancho} fps={fps} colores={colores} />
      <Subtitulos palabras={palabras} fps={fps} colores={colores} />
      <BarraProgreso duracionSegundos={duracionSegundos} fps={fps} colores={colores} />
    </AbsoluteFill>
  );
};

/**
 * Fondo por escena. Si hay clips o imagenes generadas, se usan; si no,
 * un degradado animado con los colores de la marca. El modo plantilla no
 * es un placeholder: para contenido que ES texto, es la mejor opcion.
 */
const Fondo = ({ fondos, guion, fps, colores }) => {
  if (!fondos?.length) return <FondoPlantilla colores={colores} />;

  return (
    <>
      {guion.guion.map((escena, i) => {
        const fondo = fondos.find((f) => f.indice === i);
        if (!fondo) return null;

        const desde = Math.round(escena.segundoInicio * fps);
        const duracion = Math.max(1, Math.round((escena.segundoFin - escena.segundoInicio) * fps));

        return (
          <Sequence key={i} from={desde} durationInFrames={duracion}>
            {fondo.ruta.endsWith('.mp4') ? (
              <OffthreadVideo src={staticFile(fondo.archivo)} muted style={cubrir} />
            ) : (
              <ImagenConZoom archivo={fondo.archivo} duracion={duracion} />
            )}
          </Sequence>
        );
      })}
    </>
  );
};

const cubrir = { width: '100%', height: '100%', objectFit: 'cover' };

/** Un zoom lento sobre la imagen fija; sin el, el reel se siente muerto. */
const ImagenConZoom = ({ archivo, duracion }) => {
  const frame = useCurrentFrame();
  const escala = interpolate(frame, [0, duracion], [1, 1.12], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Img src={staticFile(archivo)} style={{ ...cubrir, transform: `scale(${escala})` }} />
    </AbsoluteFill>
  );
};

const FondoPlantilla = ({ colores }) => {
  const frame = useCurrentFrame();
  const giro = interpolate(frame, [0, 900], [0, 40]);
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${135 + giro}deg, ${colores.fondo} 0%, #1B2836 55%, ${colores.fondo} 100%)`,
      }}
    />
  );
};

/** El gancho ocupa la pantalla los primeros 3 segundos: son los que deciden. */
const Gancho = ({ texto, fps, colores }) => {
  const frame = useCurrentFrame();
  const duracion = Math.round(3 * fps);
  if (frame > duracion) return null;

  const entrada = spring({ frame, fps, config: { damping: 200 } });
  const salida = interpolate(frame, [duracion - 10, duracion], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        padding: 90,
        opacity: salida,
        transform: `translateY(${interpolate(entrada, [0, 1], [40, 0])}px)`,
      }}
    >
      <div
        style={{
          fontFamily: 'Georgia, serif',
          fontSize: 82,
          lineHeight: 1.15,
          fontWeight: 700,
          color: colores.texto,
          textAlign: 'center',
          textShadow: '0 6px 30px rgba(0,0,0,.6)',
        }}
      >
        {texto}
      </div>
      <div style={{ height: 6, width: 120, background: colores.acento, marginTop: 40 }} />
    </AbsoluteFill>
  );
};

/**
 * Subtitulos palabra a palabra usando los timestamps reales de ElevenLabs.
 * Se muestran en grupos de pocas palabras, no linea a linea: en vertical
 * y a pantalla completa, una linea larga obliga a leer en vez de escuchar.
 */
const Subtitulos = ({ palabras, fps, colores }) => {
  const frame = useCurrentFrame();
  if (!palabras?.length) return null;

  const segundo = frame / fps;
  const POR_GRUPO = 4;

  const indiceActual = palabras.findIndex((p) => segundo >= p.inicio && segundo <= p.fin);
  if (indiceActual === -1) return null;

  const grupo = Math.floor(indiceActual / POR_GRUPO);
  const visibles = palabras.slice(grupo * POR_GRUPO, grupo * POR_GRUPO + POR_GRUPO);

  return (
    <AbsoluteFill
      style={{ justifyContent: 'flex-end', alignItems: 'center', padding: '0 70px 320px' }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '0 18px',
          fontFamily: 'Georgia, serif',
          fontSize: 66,
          fontWeight: 700,
          lineHeight: 1.25,
          textAlign: 'center',
        }}
      >
        {visibles.map((palabra, i) => {
          const activa = segundo >= palabra.inicio && segundo <= palabra.fin;
          return (
            <span
              key={`${grupo}-${i}`}
              style={{
                color: activa ? colores.acento : colores.texto,
                textShadow: '0 4px 24px rgba(0,0,0,.85)',
                transform: activa ? 'scale(1.06)' : 'scale(1)',
                display: 'inline-block',
              }}
            >
              {palabra.texto}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** Barra de progreso: sube la retencion porque el espectador ve cuanto queda. */
const BarraProgreso = ({ duracionSegundos, fps, colores }) => {
  const frame = useCurrentFrame();
  const avance = Math.min(1, frame / (duracionSegundos * fps));
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end' }}>
      <div style={{ height: 8, width: `${avance * 100}%`, background: colores.acento }} />
    </AbsoluteFill>
  );
};
