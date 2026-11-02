import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { DURACION_ZOOM, ZoomWeb } from './ZoomWeb.jsx';

// Entrada propia de la prueba «Zoom infinito»: no toca Root.jsx (otras sesiones lo editan) y se renderiza con un
// public liviano (trabajo/zoom/public) para que el bundle no copie los ~9 GB de public/.
const Raiz = () => (
  <Composition id="zoom-web-prueba" component={ZoomWeb} fps={30} width={1080} height={1920} durationInFrames={DURACION_ZOOM} />
);

registerRoot(Raiz);
