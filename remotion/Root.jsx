import React from 'react';
import { Composition } from 'remotion';
import { Reel } from './Reel.jsx';

const FPS = 30;

/**
 * La duracion NO es fija: sale de la locucion real de ElevenLabs.
 * calculateMetadata la lee de las props en tiempo de render, que es la
 * unica forma de que el video dure exactamente lo que dura la voz.
 */
export const Root = () => (
  <Composition
    id="Reel"
    component={Reel}
    durationInFrames={30 * FPS}
    fps={FPS}
    width={1080}
    height={1920}
    defaultProps={{
      guion: { gancho: 'Vista previa', guion: [] },
      palabras: [],
      audio: null,
      fondos: [],
      metraje: null,
      duracionSegundos: 30,
      marca: {},
    }}
    calculateMetadata={({ props }) => ({
      durationInFrames: Math.max(1, Math.round((props.duracionSegundos ?? 30) * FPS)),
    })}
  />
);
