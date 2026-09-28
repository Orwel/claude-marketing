import { interpolate, random, spring } from 'remotion';

/**
 * El metodo de animacion de contrappto.com y trifuerza.co/legal, pasado a
 * cuadros (30 fps). En la web van con framer-motion y setInterval; aqui todo
 * sale del cuadro actual, para que cada render sea identico.
 *
 * Lo que se copio es el lenguaje, no las pantallas:
 *  - entradas cortas con resorte firme (stiffness 400, damping 25), desplazando
 *    8-14 px, escalonadas 2-3 cuadros;
 *  - estados que cambian por fases (pendiente -> activo -> listo) con colores
 *    semanticos;
 *  - cada cosa aparece CUANDO Juan David la nombra: los items de una escena
 *    llevan `en` (la palabra) y armar.js resuelve el cuadro (itemsCuadros).
 */
export const RESORTE_WEB = { stiffness: 400, damping: 25 };
export const RESORTE_SUAVE = { stiffness: 180, damping: 20 };

/** 0 -> 1 con el resorte de la web, desde el cuadro `desde`. */
export const entra = (frame, desde, fps, config = RESORTE_WEB) => spring({ frame: frame - desde, fps, config });

/** Lineal con clamp: el `transition: { duration }` de framer-motion. */
export const tramo = (frame, desde, cuadros) => interpolate(frame, [desde, desde + cuadros], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

/** Estilo de entrada tipo web: opacidad y un desplazamiento corto. */
export const aparece = (a, { x = 0, y = 8, escala = 0 } = {}) => ({
  opacity: Math.min(1, Math.max(0, a) * 1.3),
  transform: `translate(${(1 - a) * x}px, ${(1 - a) * y}px) scale(${1 - (1 - Math.min(1, a)) * escala})`,
});

/** Loop infinito de la web (opacity [0.3, 1, 0.3], repeat: Infinity) como funcion periodica. */
export const pulso = (frame, periodo, min = 0.3, max = 1, desfase = 0) => min + (max - min) * (0.5 - 0.5 * Math.cos(((frame - desfase) / periodo) * 2 * Math.PI));

/** Fase de un loop de N pasos (el setInterval de la web). */
export const fase = (frame, pasos, cuadros) => ({ fase: Math.floor(frame / cuadros) % pasos, enFase: frame % cuadros });

/**
 * Cuadro en que entra el item i de una escena: el que resolvio armar.js a partir
 * de la palabra (`en`), o un escalon por defecto. Asi nada se desconecta de lo que dice.
 */
export const cuandoItem = (b, i, inicio = 8, paso = 14) => (b.itemsCuadros?.[i] != null ? b.itemsCuadros[i] : inicio + i * (b.paso ?? paso));

/** Azar con semilla (Math.random haria cada render distinto). */
export const azar = (semilla) => random(semilla);
