import React from 'react';
import { fuente } from '../fuentes.js';
import { conAlfa } from '../util.js';

/**
 * Primitivas pixel de la plantilla Arcade: marcos de 8 bits, iconos dibujados
 * celda a celda, texto en fuente pixel con sombra escalonada y barras de vida.
 * Todo en colores de la marca (navy, crema, naranja) mas los semanticos de
 * videojuego (vida rojo, XP verde, oro). Sin desenfoques: el render no tiene GPU
 * y, ademas, el pixel art se ve mejor nitido.
 */
export const PIXEL = {
  oro: '#F2C85B',
  vida: '#E8323C',
  xp: '#58D35A',
  cielo: '#5BC0F8',
  magia: '#B388FF',
  negro: '#0A0D16',
};

export const fuentePixel = (tamano, familia = 'Press Start 2P') => ({ ...fuente({ familia, peso: familia === 'Silkscreen Bold' ? 700 : 400 }), fontSize: tamano, lineHeight: 1.45, letterSpacing: familia === 'Press Start 2P' ? '0.02em' : '0.04em' });

/** Sombra escalonada de 8 bits (dos pasos duros), en el color que se indique. */
export const sombraPixel = (color = PIXEL.negro, paso = 4) => `${paso}px ${paso}px 0 ${color}, ${paso * 2}px ${paso * 2}px 0 ${conAlfa(color, 0.55)}`;

/**
 * Marco de 8 bits: borde grueso con esquinas "mordidas" (sin esquina, como las
 * cajas de dialogo de los RPG) y un borde interior fino de otro color.
 */
export const MarcoPixel = ({ children, ancho, alto, fondo = '#0B1426', borde = '#F4EFE6', interior, grosor = 6, relleno = 24, estilo }) => {
  const u = grosor;
  // Esquinas mordidas: el borde se dibuja con cuatro rectangulos que no llegan a la esquina.
  const corte = u * 2;
  return (
    <div style={{ position: 'relative', width: ancho, height: alto, boxSizing: 'border-box', ...estilo }}>
      <div style={{ position: 'absolute', left: corte, right: corte, top: 0, bottom: 0, background: borde }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: corte, bottom: corte, background: borde }} />
      <div style={{ position: 'absolute', left: u, right: u, top: u, bottom: u, background: fondo, clipPath: `polygon(${u}px 0, calc(100% - ${u}px) 0, 100% ${u}px, 100% calc(100% - ${u}px), calc(100% - ${u}px) 100%, ${u}px 100%, 0 calc(100% - ${u}px), 0 ${u}px)` }} />
      {interior ? <div style={{ position: 'absolute', left: u * 2, right: u * 2, top: u * 2, bottom: u * 2, border: `${Math.max(2, u / 2)}px solid ${interior}`, pointerEvents: 'none' }} /> : null}
      <div style={{ position: 'relative', width: '100%', height: '100%', padding: relleno, boxSizing: 'border-box' }}>{children}</div>
    </div>
  );
};

/** Texto pixel con sombra escalonada y, opcionalmente, un contorno del color de fondo. */
export const TextoPixel = ({ texto, tamano = 32, color = '#F4EFE6', sombra = PIXEL.negro, familia, estilo, alinear = 'center' }) => (
  <div style={{ ...fuentePixel(tamano, familia), color, textShadow: sombra ? sombraPixel(sombra, Math.max(2, Math.round(tamano / 9))) : undefined, textAlign: alinear, whiteSpace: 'pre-wrap', ...estilo }}>{texto}</div>
);

// Iconos de 11×11 celdas: '.' vacio, letras = color. Se dibujan con divs: nitidos a cualquier escala.
const ICONOS = {
  martillo: { pal: { m: '#B9C2D0', M: '#6E7684', t: '#8B5A2B' }, arte: ['...MMMM....', '..MmmmmM...', '..MmmmmM...', '..MmmmmM...', '...MMMM....', '.....tt....', '....tt.....', '...tt......', '..tt.......', '.tt........', 'tt.........'] },
  moneda: { pal: { g: '#F2C85B', G: '#C9962B', k: '#8A5A12' }, arte: ['...ggggg...', '..gGGGGGg..', '.gGggkggGg.', 'gGgkkkkkgGg', 'gGgkg.gkgGg', 'gGgkkkkkgGg', 'gGg.gkggGg.', 'gGgkkkkkgGg', '.gGggkggGg.', '..gGGGGGg..', '...ggggg...'] },
  control: { pal: { c: '#2A2F3F', C: '#454B5E', r: '#E8323C', b: '#5BC0F8', w: '#F4EFE6' }, arte: ['...........', '.ccccccccc.', 'cCCCCCCCCCc', 'cCwCCCCCrCc', 'cwwwCCCCbCc', 'cCwCCCCCCCc', 'cCCCCCCCCCc', '.ccccccccc.', '..cc...cc..', '...........', '...........'] },
  estrella: { pal: { g: '#F2C85B', G: '#C9962B' }, arte: ['.....g.....', '.....g.....', '....ggg....', 'gggggggggg.', '.ggggggggg.', '..ggggggg..', '...ggggg...', '...gg.gg...', '..gg...gg..', '.g.......g.', '...........'] },
  espada: { pal: { m: '#DDE3EC', M: '#8E97A8', t: '#8B5A2B', g: '#F2C85B' }, arte: ['........mM.', '.......mM..', '......mM...', '.....mM....', '....mM.....', '..g.mM.....', '...ggg.....', '..ggtgg....', '.g..tt..g..', '....tt.....', '...tt......'] },
  varita: { pal: { t: '#8B5A2B', T: '#5A3A1A', s: '#FFF6C8', y: '#F2C85B' }, arte: ['........s..', '.......sys.', '........s..', '......t....', '.....tT....', '....tT.....', '...tT......', '..tT.......', '.tT........', 'tT.........', '...........'] },
  corazon: { pal: { r: '#E8323C', R: '#A81E2C', w: '#FFD5D8' }, arte: ['...........', '..rr...rr..', '.rwrr.rrrr.', 'rwrrrrrrrrr', 'rrrrrrrrrrr', 'rrrrrrrrrrr', '.rrrrrrrrr.', '..rrrrrrr..', '...rrrrr...', '....rrr....', '.....r.....'] },
  chip: { pal: { c: '#2E3A4F', g: '#58D35A', y: '#F2C85B' }, arte: ['.y.y.y.y.y.', 'ccccccccccc', 'yccccccccck', 'cccgggggccc', 'yccgcgcgccy', 'cccgggggccc', 'yccgcgcgccy', 'cccgggggccc', 'yccccccccck', 'ccccccccccc', '.y.y.y.y.y.'] },
  libro: { pal: { r: '#A81E2C', R: '#7E1420', w: '#F4EFE6', g: '#F2C85B' }, arte: ['...........', '.rrrrrrrrr.', 'rRrrrrrrrrr', 'rRrwwwwwwrr', 'rRrwwwwwwrr', 'rRrwwggwwrr', 'rRrwwwwwwrr', 'rRrwwwwwwrr', 'rRrrrrrrrrr', '.rrrrrrrrr.', '...........'] },
  calavera: { pal: { w: '#F4EFE6', W: '#B8B4A8', k: '#0A0D16' }, arte: ['...wwwww...', '..wwwwwww..', '.wwwwwwwww.', '.wkkwwwkkw.', '.wkkwwwkkw.', '.wwwwkwwww.', '..wwwwwww..', '...wkwkw...', '...wwwww...', '....w.w....', '...........'] },
  vida: { pal: { r: '#E8323C', w: '#F4EFE6' }, arte: ['...........', '....www....', '....wrw....', '.wwwwrwwww.', '.wrrrrrrrw.', '.wwwwrwwww.', '....wrw....', '....www....', '...........', '...........', '...........'] },
  trofeo: { pal: { g: '#F2C85B', G: '#C9962B', t: '#8B5A2B' }, arte: ['gggggggggg.', 'gGgggggggGg', 'gG.ggggg.Gg', 'gG.ggggg.Gg', '.gGgggggGg.', '..ggggggg..', '...ggggg...', '....ggg....', '....ggg....', '..ttttttt..', '..ttttttt..'] },
  mapa: { pal: { p: '#E9D8A6', g: '#58D35A', b: '#5BC0F8', r: '#E8323C' }, arte: ['ppppppppppp', 'pggpppbbbpp', 'pgggppbbbpp', 'ppggpppbppp', 'pppppppbbpp', 'pprppppbbpp', 'pprrppppppp', 'pppppgggppp', 'ppppggggppp', 'pppppggpppp', 'ppppppppppp'] },
  rayo: { pal: { y: '#F2C85B', Y: '#FFF6C8' }, arte: ['......yy...', '.....yY....', '....yY.....', '...yY......', '..yyyyyy...', '...yyyyy...', '.....yY....', '....yY.....', '...yY......', '..yY.......', '.y.........'] },
  flecha: { pal: { w: '#F4EFE6' }, arte: ['...........', '...........', '...........', 'wwwwwwwwwww', '.wwwwwwwww.', '..wwwwwww..', '...wwwww...', '....www....', '.....w.....', '...........', '...........'] },
};

/** Icono pixel de 11×11 celdas escalado a `tamano` px. */
export const IconoPixel = ({ nombre, tamano = 88 }) => {
  const ic = ICONOS[nombre] ?? ICONOS.estrella;
  const n = ic.arte.length;
  const celda = tamano / n;
  return (
    <div style={{ position: 'relative', width: tamano, height: tamano }}>
      {ic.arte.flatMap((fila, j) =>
        [...fila].map((ch, i) => {
          const color = ic.pal[ch];
          if (!color) return null;
          return <div key={`${i}-${j}`} style={{ position: 'absolute', left: i * celda, top: j * celda, width: celda + 0.5, height: celda + 0.5, background: color }} />;
        })
      )}
    </div>
  );
};

/** Corazones de vida: `vidas` llenos de `total`. */
export const Corazones = ({ vidas = 3, total = 3, tamano = 34 }) => (
  <div style={{ display: 'flex', gap: Math.round(tamano * 0.22) }}>
    {Array.from({ length: total }, (_, i) => (
      <div key={i} style={{ opacity: i < vidas ? 1 : 0.28 }}>
        <IconoPixel nombre="corazon" tamano={tamano} />
      </div>
    ))}
  </div>
);

/** Barra de 8 bits: fondo oscuro, relleno en bloques de `segmentos`, `valor` entre 0 y 1. */
export const BarraPixel = ({ valor = 1, ancho = 320, alto = 22, color = PIXEL.xp, fondo = '#1A2238', segmentos = 10, borde = '#F4EFE6' }) => {
  const llenos = Math.round(valor * segmentos);
  const hueco = 3;
  const w = (ancho - 8 - hueco * (segmentos - 1)) / segmentos;
  return (
    <div style={{ width: ancho, height: alto, boxSizing: 'border-box', border: `3px solid ${borde}`, background: fondo, display: 'flex', gap: hueco, padding: 1 }}>
      {Array.from({ length: segmentos }, (_, i) => (
        <div key={i} style={{ width: w, height: '100%', background: i < llenos ? color : 'transparent', boxShadow: i < llenos ? `inset 0 -${Math.round(alto * 0.3)}px 0 ${conAlfa('#000000', 0.25)}` : undefined }} />
      ))}
    </div>
  );
};

/** Capa CRT: lineas de barrido finas y viñeta, muy sutiles. Da textura de pantalla sin ruido. */
export const CRT = ({ fuerza = 1 }) => (
  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `repeating-linear-gradient(180deg, rgba(0,0,0,${0.09 * fuerza}) 0px, rgba(0,0,0,${0.09 * fuerza}) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 5px), radial-gradient(ellipse 80% 70% at 50% 45%, rgba(0,0,0,0) 60%, rgba(0,0,0,${0.35 * fuerza}) 100%)` }} />
);
