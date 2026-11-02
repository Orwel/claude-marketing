import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { useMarca } from '../marca.js';
import { SEMANTICOS } from '../kit/tema.js';
import { suave } from '../graficos/base.jsx';
import { conAlfa } from '../util.js';

/**
 * Lienzo comun de las metaforas: 900 × 560 unidades SVG. Cada metafora dibuja
 * en ese espacio y la lamina la escala a lo que tenga (4:5 o 9:16). Asi una
 * misma metafora sirve para carrusel y para story sin recalcular posiciones.
 */
export const ANCHO = 900;
export const ALTO = 560;

/** Todo lo que una metafora necesita: cuadro, colores y las dos curvas de los sitios. */
export function useMetafora() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const c = { ...marca.colores, ...SEMANTICOS };
  // A: entrada con la curva de los sitios; S: salto con el resorte de Contrappto.
  const A = (desde, cuadros = 15) => interpolate(f, [desde, desde + cuadros], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: suave });
  const S = (desde, config = { stiffness: 400, damping: 25 }) => spring({ frame: f - desde, fps, config });
  // Latido periodico para el reposo: una lamina de carrusel se repite en bucle y no debe quedar muerta.
  const L = (periodo = 2.4, min = 0, max = 1, desfase = 0) => min + (max - min) * (0.5 - 0.5 * Math.cos(((f / fps - desfase) / periodo) * 2 * Math.PI));
  return { f, fps, c, A, S, L, a: conAlfa, marca };
}

export const TEXTO = "'Inter', system-ui, sans-serif";
export const TITULO = (marca) => `'${marca.fuentes.titulo.familia}', Georgia, serif`;
export const MONO = 'ui-monospace, Consolas, monospace';
