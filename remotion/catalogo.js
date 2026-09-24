import contrappto from '../marcas/contrappto.json';
import juanda from '../marcas/juanda.json';

export const MARCAS = { contrappto, juanda };

/**
 * Todas las piezas de piezas/AAAA-MM/*.json, sin registrarlas a mano:
 * crear el JSON basta para que aparezca en el Studio y se pueda renderizar.
 */
const contexto = import.meta.webpackContext('../piezas', { recursive: true, regExp: /\.json$/ });
export const PIEZAS = contexto.keys().map((ruta) => {
  const pieza = contexto(ruta);
  return { ...pieza, mes: ruta.split('/')[1] };
});

/** El id de composicion que usan Studio y render: <slug>--<marca>. */
export const idComposicion = (pieza, marcaId) => `${pieza.slug}--${marcaId}`;
