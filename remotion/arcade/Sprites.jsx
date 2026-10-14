import React from 'react';

/**
 * Sprites pixel 2D de la plantilla Arcade (SOFA, oct-2026): arte como lineas de
 * texto (una letra por color, '.' vacio) dibujado con divs, nitido a cualquier
 * escala y sin imagenes. Los usan las intros y las cortinillas de nivel.
 *
 * El caballero es el del Claustro (sprites.ts del juego de trifuerza.co): asi la
 * ficha que recorre los niveles es la misma que el jugador ve en el juego real.
 */
export const CABALLERO = {
  arte: ['........rr......', '.......rr.......', '......mmmm......', '.....mwmmmM.....', '.....mkkkkM.....', '.....mmmmmM.....', '......mmmM......', '.....mmmmmmM....', '....mmrrrrmM....', '...mmrrggrrmM...', '...mmrggggrmM...', '...mmrrggrrmM...', '...kmrrggrrmk...', '...k.rrrrrr.k...', '....mrrrrrrM....', '....mrrRRrrM....', '.....mm..mM.....', '.....mm..mM.....', '.....mm..mM.....', '.....mm..mM.....', '.....MM..MM.....', '....MMM..MMM....'],
  pal: { m: '#B4BCC8', M: '#6E7684', w: '#F2F5FA', k: '#2E323A', r: '#A81E2C', R: '#7E1420', g: '#E0B040', t: '#6B4428' },
  extra: [[14, 3, 'w'], [14, 4, 'w'], [14, 5, 'w'], [14, 6, 'w'], [14, 7, 'w'], [14, 8, 'w'], [14, 9, 'w'], [14, 10, 'w'], [14, 11, 'w'], [13, 12, 'g'], [14, 12, 'g'], [15, 12, 'g'], [14, 13, 't']],
};

/** Caballero en pose de salto: piernas recogidas. */
export const CABALLERO_SALTO = {
  arte: CABALLERO.arte.slice(0, 16).concat(['....mm....mM....', '...mm......mM...', '................', '................', '................', '................']),
  pal: CABALLERO.pal,
  extra: CABALLERO.extra,
};

export const NUBE = { arte: ['....wwww....', '..wwwwwwww..', '.wwwwwwwwwww', 'wwwwwwwwwwww', '.wwwwwwwwww.'], pal: { w: '#F4EFE6' } };
export const MONEDA2D = { arte: ['..gggg..', '.gGGGGg.', 'gGkggkGg', 'gGgkkgGg', 'gGgkkgGg', 'gGkggkGg', '.gGGGGg.', '..gggg..'], pal: { g: '#F2C85B', G: '#C9962B', k: '#8A5A12' } };
export const GEMA = { arte: ['..bbbb..', '.bBBBBb.', 'bBwBBBBb', 'bBBBBBBb', '.bBBBBb.', '..bBBb..', '...bb...'], pal: { b: '#5BC0F8', B: '#2E86C1', w: '#FFFFFF' } };
export const COFRE_CERRADO = { arte: ['.tttttttttt.', 'tTTTTTTTTTTt', 'tTTTTggTTTTt', 'tttttttttttt', 'tTTTTggTTTTt', 'tTTTTggTTTTt', 'tTTTTTTTTTTt', 'tttttttttttt'], pal: { t: '#5A3A1A', T: '#8B5A2B', g: '#F2C85B' } };
export const COFRE_ABIERTO = { arte: ['.tttttttttt.', 'tTTTTTTTTTTt', 'tttttttttttt', 'tyyyyyyyyyyt', 'tTTTTggTTTTt', 'tTTTTggTTTTt', 'tTTTTTTTTTTt', 'tttttttttttt'], pal: { t: '#5A3A1A', T: '#8B5A2B', g: '#F2C85B', y: '#FFF2A8' } };
export const MARTILLO2D = { arte: ['......mmmmm..', '.....mMMMMMm.', '.....mMMMMMm.', '..tttmMMMMMm.', '.tttt.mmmmm..', 'ttt..........', 'tt...........'], pal: { m: '#5A3A1A', M: '#8B5A2B', t: '#C8A070' } };
export const TROFEO2D = { arte: ['gggggggggg', 'gGggggggGg', 'gG.gggg.Gg', 'gG.gggg.Gg', '.gGggggGg.', '..gggggg..', '...gggg...', '....gg....', '...tttt...', '..tttttt..'], pal: { g: '#F2C85B', G: '#C9962B', t: '#8B5A2B' } };
export const BANDERA_CO = { arte: ['yyyyyyyyyyyy', 'yyyyyyyyyyyy', 'bbbbbbbbbbbb', 'rrrrrrrrrrrr'], pal: { y: '#FCD116', b: '#003893', r: '#CE1126' } };
export const CURSOR_MANO = { arte: ['...ww....', '..wkw....', '..wkw....', '..wkwwww.', 'wwwkkkkkw', 'wkkkkkkkw', '.wkkkkkkw', '..wkkkkw.', '...wwww..'], pal: { w: '#F4EFE6', k: '#0B1426' } };

/** Dibuja un sprite con celdas de `px` pixeles. `espejo` lo voltea horizontalmente. */
export const Sprite = ({ fig, px = 8, espejo = false, estilo }) => {
  const arte = fig.arte.map((f) => [...f]);
  for (const [c, r, l] of fig.extra ?? []) if (arte[r]?.[c] !== undefined) arte[r][c] = l;
  const ancho = Math.max(...arte.map((f) => f.length));
  return (
    <div style={{ position: 'relative', width: ancho * px, height: arte.length * px, transform: espejo ? 'scaleX(-1)' : undefined, ...estilo }}>
      {arte.flatMap((fila, j) => fila.map((ch, i) => (fig.pal[ch] ? <div key={`${i}-${j}`} style={{ position: 'absolute', left: i * px, top: j * px, width: px + 0.5, height: px + 0.5, background: fig.pal[ch] }} /> : null)))}
    </div>
  );
};
