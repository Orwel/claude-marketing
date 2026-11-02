import React from 'react';
import { AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { CABALLERO, Sprite } from '../arcade/Sprites.jsx';
import { CRT, fuentePixel, MarcoPixel } from '../arcade/Pixel.jsx';
import { useFuentes } from '../fuentes.js';
import palabras from '../../public/n01/palabras.json';

/**
 * N01 · La pantalla de carga prohibida (juanda, nov-2026). Todo el reel es una
 * pantalla de carga en pixel art: la barra de abajo se llena de principio a fin
 * y el monitor cambia de escena en las palabras que la voz marca. Pixel art
 * porque la historia es de consolas de los noventa (pidió "mucho pixel art").
 * El dinosaurio y los invasores son diseños propios: no se copia el de Chrome
 * ni los de ningún juego.
 */

const C = { fondo: '#0B1426', crema: '#F4EFE6', naranja: '#F26B1D', gris: '#5E6878', oscuro: '#060A14', verde: '#58D35A', oro: '#F2C85B', rojo: '#E8323C', cielo: '#5BC0F8', pantalla: '#101C33' };
const S = (s) => Math.round(s * 30);
// Silkscreen y no Press Start 2P: esta dibuja las tildes en mayúscula como minúsculas («CAíA»).
const FAM = 'Silkscreen Bold';

// Escenas por segundo de la voz (public/n01/palabras.json): cada cambio cae en una palabra.
const ESCENAS = [
  { id: 'dino', desde: 0, hasta: 4.6 },
  { id: 'carga', desde: 4.6, hasta: 9.55 },
  { id: 'anios', desde: 9.55, hasta: 14.15 },
  { id: 'patente', desde: 14.15, hasta: 17.85 },
  { id: 'documento', desde: 17.85, hasta: 27.45 },
  { id: 'concedida', desde: 27.45, hasta: 34.2 },
  { id: 'consejos', desde: 34.2, hasta: 39.5 },
  { id: 'forma', desde: 39.5, hasta: 44.05 },
  { id: 'cierre', desde: 44.05, hasta: 50.5 },
];
export const DURACION_N01 = S(50.5);

// --- Sprites propios (una letra = un color; '.' vacío) ---
const DINO = (paso) => ({
  arte: ['......gggggg', '.....gggkggg', '.....gggggggg', '.....ggggg...', '.g..gggggggg.', '.gggggggg....', '.ggggggggg...', '..gggggg.....', '...gggg......', paso ? '...g..gg.....' : '...gg..g.....', paso ? '..gg....g....' : '....g.gg.....'],
  pal: { g: C.verde, k: C.oscuro },
});
const CACTUS = { arte: ['..o..', '..o.o', 'o.o.o', 'o.ooo', 'ooo..', '..o..', '..o..'], pal: { o: '#3E8E41' } };
const FOCO = { arte: ['..yyyy..', '.yyyyyy.', 'yyywyyyy', 'yyyyyyyy', 'yyyyyyyy', '.yyyyyy.', '..gggg..', '..gggg..', '...gg...'], pal: { y: C.oro, w: '#FFFBE0', g: C.gris } };
const CANDADO = { arte: ['...cccc...', '..c....c..', '..c....c..', '..c....c..', 'oooooooooo', 'oOOOOOOOOo', 'oOOOkkOOOo', 'oOOOkkOOOo', 'oOOOOkOOOo', 'oOOOOOOOOo', 'oooooooooo'], pal: { c: '#B9C2D0', o: '#C9962B', O: C.oro, k: C.oscuro } };
const NAVE = { arte: ['....c....', '...ccc...', '...cwc...', '.c.ccc.c.', 'ccccccccc', 'cc.ccc.cc', 'o...o...o'], pal: { c: C.cielo, w: C.crema, o: C.naranja } };
const BICHO = (abre) => ({ arte: abre ? ['.m.....m.', '..mmmmm..', '.mmkmkmm.', 'mmmmmmmmm', 'm.m...m.m', '.m.....m.'] : ['.m.....m.', '..mmmmm..', '.mmkmkmm.', 'mmmmmmmmm', '.mm...mm.', 'm.......m'], pal: { m: '#B388FF', k: C.oscuro } });
const RELOJ = { arte: ['wwwwwwww', '.wyyyyw.', '..wyyw..', '...ww...', '...ww...', '..w..w..', '.w.yy.w.', 'wwwwwwww'], pal: { w: C.crema, y: C.oro } };
const BURBUJA = { arte: ['.cccccccccc.', 'cwwwwwwwwwwc', 'cwkwkwkwkwwc', 'cwwwwwwwwwwc', 'cwkwkwkwwwwc', 'cwwwwwwwwwwc', '.cccccccccc.', '..cc........', '.c..........'], pal: { c: C.crema, w: C.fondo, k: C.naranja } };

const Texto = ({ children, t = 40, color = C.crema, estilo }) => (
  <div style={{ ...fuentePixel(t, FAM), color, textShadow: `${Math.max(2, t / 10)}px ${Math.max(2, t / 10)}px 0 ${C.oscuro}`, textAlign: 'center', ...estilo }}>{children}</div>
);

// Entrada con rebote (resorte) y salto de 8 bits: la escala se redondea a pasos para que se sienta pixel.
const pop = (f, fps, desde, rigidez = 220) => {
  const v = spring({ frame: f - desde, fps, config: { stiffness: rigidez, damping: 12, mass: 0.6 } });
  return Math.round(v * 8) / 8;
};

// --- Escenas del monitor (cada una recibe f = cuadros desde el inicio del reel) ---
const Dino = ({ f }) => {
  const corre = f >= S(2.84);
  const avance = corre ? (f - S(2.84)) * 14 : 0;
  const ciclo = Math.floor(f / 4) % 2;
  const salto = corre ? Math.max(0, Math.sin(((f - S(2.84)) / 30) * Math.PI * 1.4)) : 0;
  return (
    <AbsoluteFill>
      <Texto t={34} color={C.gris} estilo={{ position: 'absolute', top: 120, width: '100%' }}>SIN CONEXIÓN</Texto>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 560, height: 6, background: C.gris }} />
      {[0, 1, 2, 3].map((i) => <div key={i} style={{ position: 'absolute', top: 580 + (i % 2) * 18, left: ((i * 260 - avance * 0.6) % 1100 + 1100) % 1100 - 60, width: 30 + i * 6, height: 6, background: C.gris, opacity: 0.6 }} />)}
      {[0, 1].map((i) => <Sprite key={i} fig={CACTUS} px={14} estilo={{ position: 'absolute', top: 462, left: ((700 + i * 520 - avance) % 1300 + 1300) % 1300 - 100 }} />)}
      <Sprite fig={DINO(corre && ciclo)} px={12} estilo={{ position: 'absolute', left: 170, top: 430 - salto * 170 }} />
      {corre ? <Texto t={30} color={C.naranja} estilo={{ position: 'absolute', top: 210, width: '100%' }}>{String(Math.floor((f - S(2.84)) / 3)).padStart(5, '0')}</Texto> : null}
    </AbsoluteFill>
  );
};

const Barra = ({ valor, ancho = 700, alto = 56, color = C.naranja, seg = 14 }) => (
  <div style={{ width: ancho, height: alto, border: `6px solid ${C.crema}`, padding: 6, boxSizing: 'border-box', display: 'flex', gap: 6 }}>
    {Array.from({ length: seg }, (_, i) => <div key={i} style={{ flex: 1, background: i < Math.floor(valor * seg) ? color : 'transparent' }} />)}
  </div>
);

const Carga = ({ f, fps }) => {
  const t = (f - S(4.6)) / (S(9.55) - S(4.6));
  const ciclo = Math.floor(f / 4) % 2;
  const puntos = '.'.repeat(1 + (Math.floor(f / 10) % 3));
  const foco = pop(f, fps, S(7.24));
  const brinco = Math.abs(Math.sin((f / 30) * Math.PI * 2)) * 60;
  return (
    <AbsoluteFill style={{ alignItems: 'center' }}>
      <Texto t={40} estilo={{ position: 'absolute', top: 150, width: '100%' }}>{`CARGANDO${puntos}`}</Texto>
      <div style={{ position: 'absolute', top: 420 }}><Barra valor={t} /></div>
      <Sprite fig={DINO(ciclo)} px={8} estilo={{ position: 'absolute', top: 330 - brinco, left: 190 + t * 600 }} />
      <div style={{ position: 'absolute', top: 540, transform: `scale(${foco})` }}><Sprite fig={FOCO} px={16} /></div>
    </AbsoluteFill>
  );
};

const Anios = ({ f }) => {
  // El contador corre de 1995 a 2015 mientras dice "durante veinte años".
  const anio = Math.round(interpolate(f, [S(11.35), S(12.9)], [1995, 2015], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const mini = f >= S(12.99);
  return (
    <AbsoluteFill>
      <Texto t={30} color={C.gris} estilo={{ position: 'absolute', top: 90, width: '100%' }}>NOW LOADING</Texto>
      <Texto t={150} color={C.oro} estilo={{ position: 'absolute', top: 210, width: '100%' }}>{anio}</Texto>
      {mini ? (
        <div style={{ position: 'absolute', top: 470, left: 60, right: 60, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 22 }}>
          {Array.from({ length: 8 }, (_, i) => {
            const vis = f >= S(12.99) + i * 2;
            return (
              <div key={i} style={{ height: 110, border: `5px solid ${C.gris}`, background: C.oscuro, opacity: vis ? 1 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ ...fuentePixel(12, FAM), color: C.gris }}>{'.'.repeat(1 + ((Math.floor(f / 8) + i) % 3))}</div>
              </div>
            );
          })}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const Patente = ({ f, fps }) => {
  const golpe = S(16.79);
  const tecnico = f >= S(15.16);
  const sello = pop(f, fps, golpe, 320);
  return (
    <AbsoluteFill style={{ alignItems: 'center' }}>
      <div style={{ position: 'absolute', top: 150, opacity: f >= golpe ? 0.25 : 1 }}>
        <Texto t={44}>¿PROBLEMA</Texto>
        <Texto t={44} estilo={{ marginTop: 18 }}>TÉCNICO?</Texto>
        {tecnico ? <div style={{ position: 'absolute', left: -40, right: -40, top: 60, height: 14, background: C.rojo, transform: 'rotate(-8deg)' }} /> : null}
      </div>
      {f >= golpe ? (
        <div style={{ position: 'absolute', top: 330, transform: `scale(${sello * 1}) rotate(${-6 * sello}deg)` }}>
          <Sprite fig={CANDADO} px={22} estilo={{ margin: '0 auto' }} />
          <Texto t={64} color={C.naranja} estilo={{ marginTop: 30 }}>PATENTE</Texto>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const LINEAS_DOC = ['PATENTE · EE. UU.', 'SOLICITANTE: NAMCO', 'PRESENTADA: 1995', 'IDEA:', 'UN MINIJUEGO', 'MIENTRAS CARGA', 'EL JUEGO PRINCIPAL'];
const Documento = ({ f }) => {
  const minijuego = f >= S(23.82);
  if (!minijuego) {
    // El documento se escribe renglón a renglón, al ritmo de lo que dice.
    const marcas = [S(18.0), S(19.53), S(18.53) + 6, S(23.3), 99999, 99999, 99999];
    return (
      <AbsoluteFill style={{ alignItems: 'center' }}>
        <div style={{ position: 'absolute', top: 70, width: 760, height: 640, background: C.crema, padding: 40, boxSizing: 'border-box', boxShadow: `14px 14px 0 ${C.oscuro}` }}>
          {LINEAS_DOC.map((l, i) => {
            const n = Math.max(0, Math.floor((f - marcas[i]) / 1.5));
            return <div key={i} style={{ ...fuentePixel(i === 0 ? 30 : 26), color: i === 0 ? C.naranja : C.fondo, marginBottom: 26, minHeight: 34 }}>{l.slice(0, n)}{n > 0 && n < l.length && Math.floor(f / 4) % 2 ? '█' : ''}</div>;
          })}
        </div>
      </AbsoluteFill>
    );
  }
  // Minijuego genérico arriba, barra del juego principal abajo: la idea que se patentó.
  const t = f - S(23.82);
  const x = 450 + Math.sin(t / 9) * 260;
  const carga = interpolate(f, [S(23.82), S(27.4)], [0.05, 0.92], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', top: 40, left: 60, right: 60, height: 470, border: `6px solid ${C.cielo}`, background: C.oscuro, overflow: 'hidden' }}>
        {Array.from({ length: 10 }, (_, i) => <Sprite key={i} fig={BICHO(Math.floor(f / 8) % 2)} px={9} estilo={{ position: 'absolute', left: 50 + (i % 5) * 160 + Math.sin(t / 15) * 40, top: 40 + Math.floor(i / 5) * 90 }} />)}
        {[0, 1, 2].map((k) => { const y = 360 - ((t * 18 + k * 120) % 360); return <div key={k} style={{ position: 'absolute', left: x + 36, top: y, width: 8, height: 26, background: C.naranja }} />; })}
        <Sprite fig={NAVE} px={9} estilo={{ position: 'absolute', left: x, top: 380 }} />
        <div style={{ ...fuentePixel(18, FAM), color: C.cielo, position: 'absolute', left: 16, top: 12 }}>MINIJUEGO</div>
      </div>
      <div style={{ position: 'absolute', top: 560, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
        <div style={{ ...fuentePixel(24, FAM), color: C.crema }}>CARGANDO JUEGO PRINCIPAL</div>
        <Barra valor={carga} ancho={760} alto={48} color={C.verde} seg={16} />
      </div>
    </AbsoluteFill>
  );
};

const Concedida = ({ f, fps }) => {
  const sello = pop(f, fps, S(27.72), 320);
  const anio = Math.round(interpolate(f, [S(28.87), S(30.4)], [1998, 2015], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const guardia = f >= S(31.5);
  if (!guardia) {
    return (
      <AbsoluteFill style={{ alignItems: 'center' }}>
        <div style={{ position: 'absolute', top: 90, width: 640, height: 300, background: C.crema, boxShadow: `14px 14px 0 ${C.oscuro}` }}>
          <div style={{ ...fuentePixel(24, FAM), color: C.fondo, padding: 34 }}>PATENTE · NAMCO</div>
          <div style={{ position: 'absolute', left: 120, top: 120, transform: `scale(${sello}) rotate(-10deg)`, border: `8px solid ${C.verde}`, padding: '14px 22px', ...fuentePixel(40, FAM), color: C.verde }}>CONCEDIDA</div>
        </div>
        {f >= S(28.87) ? <Texto t={40} color={C.gris} estilo={{ position: 'absolute', top: 470 }}>HASTA</Texto> : null}
        {f >= S(28.87) ? <Texto t={120} color={anio === 2015 ? C.naranja : C.oro} estilo={{ position: 'absolute', top: 540 }}>{anio}</Texto> : null}
      </AbsoluteFill>
    );
  }
  // "Quien quisiera hacerlo tenía que pedirle permiso": un guardia cierra el paso.
  const ciclo = Math.floor(f / 5) % 2;
  const llega = interpolate(f, [S(31.5), S(32.6)], [40, 300], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 640, height: 10, background: C.gris }} />
      <Sprite fig={DINO(ciclo && llega < 300)} px={10} estilo={{ position: 'absolute', left: llega, top: 520 }} />
      <Sprite fig={CABALLERO} px={13} espejo estilo={{ position: 'absolute', left: 560, top: 354 }} />
      {f >= S(33.24) ? (
        <div style={{ position: 'absolute', left: 36, top: 90 }}>
          <MarcoPixel ancho={860} alto={170} grosor={6} relleno={30}>
            <div style={{ ...fuentePixel(30, FAM), color: C.crema, lineHeight: 1.6 }}>{'¿TIENES PERMISO DE NAMCO?'.slice(0, Math.floor((f - S(33.24)) / 1.2))}</div>
          </MarcoPixel>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const CONSEJOS = ['CONSEJO: PRESIONA X PARA SALTAR.', 'CONSEJO: LOS COFRES TIENEN COSAS.', 'CONSEJO: ESPERA.', 'CONSEJO: SIGUE ESPERANDO.'];
const Consejos = ({ f }) => {
  const i = Math.min(CONSEJOS.length - 1, Math.floor((f - S(34.2)) / S(1.3)));
  const giro = Math.floor(f / 10) % 4;
  return (
    <AbsoluteFill style={{ alignItems: 'center' }}>
      <div style={{ position: 'absolute', top: 120, transform: `rotate(${giro * 90}deg)` }}><Sprite fig={RELOJ} px={22} /></div>
      <div style={{ position: 'absolute', top: 420, left: 70, right: 70 }}>
        <MarcoPixel ancho={820} alto={210} grosor={6} relleno={32} interior={C.naranja}>
          <div style={{ ...fuentePixel(30, FAM), color: C.crema, lineHeight: 1.7 }}>{CONSEJOS[i]}</div>
        </MarcoPixel>
      </div>
    </AbsoluteFill>
  );
};

const Forma = ({ f, fps }) => {
  const tacha = f >= S(40.46);
  const derecha = pop(f, fps, S(42.43));
  const cierra = f >= S(43.28);
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 60, top: 110, width: 380, alignItems: 'center', display: 'flex', flexDirection: 'column', gap: 30 }}>
        <Sprite fig={DINO(0)} px={18} />
        <Texto t={30}>DIBUJO</Texto>
        {tacha ? <Texto t={24} color={C.gris}>NO SE PATENTA</Texto> : null}
      </div>
      {tacha ? <div style={{ position: 'absolute', left: 70, top: 220, width: 360, height: 14, background: C.rojo, transform: 'rotate(-18deg)' }} /> : null}
      <div style={{ position: 'absolute', right: 50, top: 70, width: 430, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, transform: `scale(${derecha})` }}>
        {['CARGA', 'MINIJUEGO', 'JUEGO'].map((p, k) => (
          <React.Fragment key={p}>
            <div style={{ border: `5px solid ${C.cielo}`, padding: '14px 20px', ...fuentePixel(24, FAM), color: C.cielo }}>{p}</div>
            {k < 2 ? <div style={{ ...fuentePixel(24, FAM), color: C.cielo }}>▼</div> : null}
          </React.Fragment>
        ))}
        <Texto t={24} estilo={{ marginTop: 10 }}>FORMA DE HACERLO</Texto>
        {cierra ? <Sprite fig={CANDADO} px={9} /> : null}
      </div>
    </AbsoluteFill>
  );
};

const Cierre = ({ f, fps }) => {
  const burbuja = pop(f, fps, S(47.42));
  return (
    <AbsoluteFill style={{ alignItems: 'center' }}>
      <Texto t={46} color={C.oro} estilo={{ position: 'absolute', top: 110, left: 60, right: 60, lineHeight: 1.6 }}>¿QUÉ OTRA MECÁNICA CREES QUE ESTÁ PATENTADA?</Texto>
      <div style={{ position: 'absolute', top: 470, transform: `scale(${burbuja})` }}><Sprite fig={BURBUJA} px={20} /></div>
      {f >= S(48.3) && Math.floor(f / 12) % 2 ? <Texto t={28} estilo={{ position: 'absolute', top: 690 }}>PRESS START</Texto> : null}
    </AbsoluteFill>
  );
};

const COMPONENTES = { dino: Dino, carga: Carga, anios: Anios, patente: Patente, documento: Documento, concedida: Concedida, consejos: Consejos, forma: Forma, cierre: Cierre };

// Transición de mosaico: bloques que tapan la pantalla en orden de tramado (dither) y la destapan.
const Mosaico = ({ f, corte }) => {
  const d = f - corte;
  if (d < -6 || d > 6) return null;
  const n = 12;
  const umbral = 1 - Math.abs(d) / 6;
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: `repeat(${n}, 1fr)` }}>
      {Array.from({ length: n * 10 }, (_, i) => <div key={i} style={{ background: C.oscuro, opacity: bayer[(i % 4) + 4 * (Math.floor(i / n) % 4)] / 16 < umbral ? 1 : 0 }} />)}
    </div>
  );
};

// Subtítulo: la frase en curso en la franja de arriba, la palabra dicha en naranja (una sola zona de texto).
const FRASES = (() => {
  const out = [];
  let actual = [];
  for (const p of palabras) {
    actual.push({ ...p, t: p.t === '20' ? 'veinte' : p.t });
    if (/[.?,:]$/.test(p.t) && actual.length >= 3) { out.push(actual); actual = []; }
  }
  if (actual.length) out.push(actual);
  return out;
})();

const Subtitulo = ({ seg }) => {
  const frase = FRASES.find((fr, i) => seg < (FRASES[i + 1]?.[0].i ?? 99) - 0.05) ?? FRASES.at(-1);
  if (seg < frase[0].i - 0.3) return null;
  return (
    <div style={{ position: 'absolute', top: 250, left: 70, right: 70, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ ...fuentePixel(52, FAM), lineHeight: 1.6, textAlign: 'center', textShadow: `4px 4px 0 ${C.oscuro}` }}>
        {frase.map((p, k) => <span key={k} style={{ color: seg >= p.i ? (seg < p.f + 0.15 ? C.naranja : C.crema) : '#3A4560' }}>{p.t.toUpperCase()} </span>)}
      </div>
    </div>
  );
};

export const PantallaCarga = () => {
  useFuentes();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seg = f / fps;
  const escena = ESCENAS.find((e) => seg < e.hasta) ?? ESCENAS.at(-1);
  const Comp = COMPONENTES[escena.id];
  // Sacudida de cámara en los dos sellos (patente y concedida): 6 cuadros, paso de 8 px.
  const sacude = [S(16.79), S(27.72)].some((g) => f >= g && f < g + 6) ? ((f % 2) * 2 - 1) * 8 : 0;
  // Push-in lento dentro de cada escena: el monitor se acerca un 3 % y vuelve en el corte.
  const avance = (seg - escena.desde) / (escena.hasta - escena.desde);
  const zoom = 1 + Math.round(avance * 0.03 * 100) / 100;
  const total = interpolate(f, [0, S(48.3)], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: C.fondo }}>
      {/* Cuadrícula de fondo: la textura de "pantalla de juego" sin desenfoques. */}
      <AbsoluteFill style={{ backgroundImage: `linear-gradient(${C.pantalla} 2px, transparent 2px), linear-gradient(90deg, ${C.pantalla} 2px, transparent 2px)`, backgroundSize: '40px 40px', opacity: 0.6 }} />
      <Subtitulo seg={seg} />
      <div style={{ position: 'absolute', left: 50, top: 580, width: 980, height: 820, transform: `translate(${sacude}px, ${sacude / 2}px) scale(${zoom})` }}>
        <MarcoPixel ancho={980} alto={820} fondo={C.oscuro} borde={C.crema} interior={C.naranja} grosor={8} relleno={0}>
          <div style={{ position: 'absolute', inset: 24, overflow: 'hidden' }}>
            <Comp f={f} fps={fps} />
            {ESCENAS.slice(1).map((e) => <Mosaico key={e.id} f={f} corte={S(e.desde)} />)}
            {[S(16.79), S(27.72)].map((g) => (f >= g && f < g + 3 ? <AbsoluteFill key={g} style={{ background: C.crema }} /> : null))}
          </div>
          <CRT fuerza={1.2} />
        </MarcoPixel>
      </div>
      {/* La barra de todo el reel: el video entero es una pantalla de carga. */}
      <div style={{ position: 'absolute', left: 140, right: 140, top: 1450, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <Barra valor={total} ancho={800} alto={44} seg={20} />
        <div style={{ ...fuentePixel(24, FAM), color: C.crema }}>{`${Math.round(total * 100)}% · JUANDA.TRIFUERZA`}</div>
      </div>
      <Audio src={staticFile('n01/mezcla.wav')} />
    </AbsoluteFill>
  );
};
