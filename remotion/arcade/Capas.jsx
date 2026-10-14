import React, { useMemo } from 'react';
import { AbsoluteFill, Img, interpolate, OffthreadVideo, random, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Firma } from '../componentes/Firma.jsx';
import { fuente } from '../fuentes.js';
import { useMarca } from '../marca.js';
import { conAlfa } from '../util.js';
import { FPS } from './linea.js';
import { BarraPixel, Corazones, CRT, fuentePixel, IconoPixel, MarcoPixel, PIXEL, sombraPixel, TextoPixel } from './Pixel.jsx';

/**
 * Capas de la plantilla Arcade sobre el metraje: HUD de juego, cuadro de
 * dialogo RPG (los subtitulos), ficha de personaje, chispas pixel, golpes de
 * texto, efectos de "superpoder" y el barrido pixel entre escenas.
 *
 * Reglas del estudio que se respetan aunque el estilo sea otro: la cara nunca
 * tapada (dialogo abajo, HUD arriba, chispas a los lados), nada se repite
 * (la palabra que va en un golpe no sale en el dialogo), todo lo que se dice
 * sale en pantalla, logo de Trifuerza siempre, sin desenfoques ni ruido.
 */
const resorte = (frame, desde, fps, config = { damping: 14, stiffness: 220, mass: 0.7 }) => spring({ frame: frame - desde, fps, config });
// Entradas en escalones (4 pasos): se siente a 8 bits en vez de a interfaz web.
const escalonado = (a, pasos = 4) => Math.round(Math.min(1, Math.max(0, a)) * pasos) / pasos;

/* ------------------------------------------------------------------ HUD */
/**
 * Barra superior: logo oficial de Trifuerza (tal cual, sobre pastilla oscura),
 * vidas y puntaje. El puntaje sube +100 con cada golpe y +10 con cada chispa:
 * la gente ve "pasar cosas" aunque no lea.
 */
export const Hud = ({ logo, puntos, nivel, y = 236 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = resorte(frame, 0, fps);
  const ganados = puntos.filter((p) => p.cuadro <= frame);
  const total = ganados.reduce((s, p) => s + p.valor, 0);
  const ultimo = ganados.at(-1);
  const salto = ultimo ? 1 + 0.18 * Math.max(0, 1 - (frame - ultimo.cuadro) / 8) : 1;
  return (
    <div style={{ position: 'absolute', left: 50, right: 50, top: y, display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: Math.min(1, a), transform: `translateY(${(1 - a) * -14}px)` }}>
      {/* Logo oficial de la cuenta: imagen (juanda/Trifuerza) o la firma con icono (Contrappto), sobre pastilla oscura. */}
      <div style={{ padding: '14px 20px', background: 'rgba(8,14,28,.62)', border: '3px solid rgba(244,239,230,.25)', boxShadow: '4px 4px 0 rgba(0,0,0,.45)' }}>
        {logo ? <Img src={staticFile(logo.src)} style={{ display: 'block', height: logo.alto ?? 54, width: 'auto' }} /> : <Firma tamano={0.62} />}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
        <Corazones vidas={3} total={3} tamano={30} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, transform: `scale(${salto})`, transformOrigin: 'right center' }}>
          <span style={{ ...fuentePixel(18), color: '#F4EFE6', textShadow: sombraPixel(PIXEL.negro, 2) }}>{nivel ?? 'SCORE'}</span>
          <span style={{ ...fuentePixel(30), color: PIXEL.oro, textShadow: sombraPixel(PIXEL.negro, 3) }}>{String(total).padStart(6, '0')}</span>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------- dialogo */
// Zona de lectura: el cuadro de dialogo y los golpes viven en el mismo rectangulo (Juan David, 13-oct-2026:
// "que el texto salga en el mismo lugar... el ojo queda perdido porque no se sabe donde mirar").
export const ZONA_TEXTO = { x: 50, y: 1200, ancho: 980, alto: 270 };

/** Tamaño de letra y alto del cuadro segun lo largo de la pagina: hasta 3 lineas sin salirse del marco. */
function medidaDialogo(texto) {
  const n = texto.length;
  // Inter 700: ~0,56 em por caracter → 27 caracteres por linea a 60 px, 33 a 50 px.
  const tamano = n > 81 ? 50 : 60;
  const porLinea = tamano === 60 ? 27 : 33;
  // El marco crece con las lineas (hasta 4): el texto nunca se sale del campo (Juan David, 13-oct).
  const lineas = Math.min(4, Math.max(1, Math.ceil(n / porLinea)));
  return { tamano, alto: Math.max(ZONA_TEXTO.alto, 26 * 2 + 14 + lineas * Math.round(tamano * 1.18) + 12) };
}

/**
 * Cuadro de dialogo RPG: marco pixel abajo (fuera de la franja de 420 px que
 * tapa Instagram), nombre de quien habla en una pestaña y el texto que se
 * escribe palabra por palabra en el cuadro en que se dice. Cursor ▼ al final.
 */
export const Dialogo = ({ paginas, nombres, y = ZONA_TEXTO.y }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const ms = (frame / fps) * 1000;
  const pagina = paginas.find((p) => ms >= p.startMs && ms < p.finMs);
  if (!pagina) return null;
  const quien = nombres[pagina.quien] ?? nombres.jd;
  const dichas = pagina.tokens.filter((t) => t.startMs <= ms + 60);
  const completa = dichas.length === pagina.tokens.length;
  const entrada = escalonado(resorte(frame, Math.round((pagina.startMs / 1000) * fps), fps, { damping: 18, stiffness: 300 }), 3);
  const colorNombre = quien.color ?? marca.colores.acento;
  const { tamano, alto } = medidaDialogo(pagina.tokens.map((t) => t.text).join(' '));
  return (
    <div style={{ position: 'absolute', left: ZONA_TEXTO.x, top: y, width: ZONA_TEXTO.ancho, opacity: Math.min(1, entrada * 1.5), transform: `translateY(${(1 - entrada) * 12}px)` }}>
      <MarcoPixel ancho={ZONA_TEXTO.ancho} alto={alto} fondo="rgba(8,13,26,.9)" borde="#F4EFE6" interior={conAlfa(colorNombre, 0.55)} relleno={26}>
        <div style={{ position: 'absolute', left: 22, top: -26, padding: '8px 18px', background: colorNombre, color: quien.sobre ?? '#0B1426', ...fuentePixel(20), boxShadow: '4px 4px 0 rgba(0,0,0,.5)', whiteSpace: 'nowrap' }}>{quien.nombre}</div>
        <div style={{ ...fuente(marca.fuentes.enfasis), fontSize: tamano, lineHeight: 1.18, color: '#F4EFE6', marginTop: 14, textShadow: '0 3px 0 rgba(0,0,0,.6)' }}>
          {pagina.tokens.map((t, i) => {
            const vista = t.startMs <= ms + 60;
            const clave = i === pagina.tokens.reduce((m, x, k) => (x.text.length > pagina.tokens[m].text.length ? k : m), 0) && t.text.length >= 6;
            return (
              <span key={i} style={{ display: 'inline-block', marginRight: '0.28em', opacity: vista ? 1 : 0, color: clave ? colorNombre : undefined }}>
                {t.text}
              </span>
            );
          })}
        </div>
        {completa ? <div style={{ position: 'absolute', right: 26, bottom: 14, opacity: Math.floor(frame / 9) % 2 ? 0.2 : 1 }}><IconoPixel nombre="flecha" tamano={30} /></div> : null}
      </MarcoPixel>
    </div>
  );
};

/* ---------------------------------------------------------------- ficha */
/**
 * Ficha de personaje: entra desde el lado contrario a la persona, con el
 * retrato pixelado (como el juego del Claustro), nombre, clase/mundo y tres
 * barras que se llenan en bloques. "PLAYER 2 HAS JOINED".
 */
export const Ficha = ({ personaje, retrato, lado = 'izquierda', y = 350, jugador }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const marca = useMarca();
  const a = escalonado(resorte(frame, 0, fps, { damping: 16, stiffness: 180 }), 6);
  const fuera = Math.min(1, Math.max(0, (frame - (durationInFrames - 8)) / 8));
  const stats = personaje.stats ?? [{ n: 'COSPLAY', v: 1 }, { n: 'PODER', v: 0.8 }, { n: 'LORE', v: 0.9 }];
  const ancho = 560;
  const x = lado === 'izquierda' ? 40 : 1080 - ancho - 40;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: ancho, opacity: Math.min(1, a * 1.4) * (1 - fuera), transform: `translateX(${(1 - a) * (lado === 'izquierda' ? -80 : 80)}px) scale(${1 - fuera * 0.08})` }}>
      <div style={{ position: 'absolute', left: 18, top: -22, zIndex: 2, padding: '6px 14px', background: PIXEL.xp, color: '#0B1426', ...fuentePixel(16), boxShadow: '4px 4px 0 rgba(0,0,0,.5)', opacity: Math.floor(frame / 8) % 3 === 0 && frame < 30 ? 0.3 : 1 }}>{personaje.etiqueta ?? `PLAYER ${jugador ?? 2} JOINED`}</div>
      <MarcoPixel ancho={ancho} alto={330} fondo="rgba(8,13,26,.92)" borde="#F4EFE6" interior={conAlfa(marca.colores.acento, 0.6)} relleno={22}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginTop: 8 }}>
          <div style={{ width: 150, height: 170, flex: 'none', background: '#1A2238', border: '4px solid #F4EFE6', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden', imageRendering: 'pixelated' }}>
            {retrato ? <Img src={staticFile(retrato)} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated', transform: `translateY(${Math.sin(frame / 5) > 0 ? 0 : 2}px)` }} /> : <IconoPixel nombre="estrella" tamano={100} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...fuentePixel(personaje.nombre.length > 14 ? 18 : 24), color: marca.colores.acento, textShadow: sombraPixel(PIXEL.negro, 3), lineHeight: 1.3 }}>{personaje.nombre.toUpperCase()}</div>
            {personaje.clase ? <div style={{ ...fuentePixel(14, 'Silkscreen Bold'), color: '#F4EFE6', marginTop: 6, opacity: 0.9 }}>{personaje.clase.toUpperCase()}</div> : null}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
              {stats.map((s, i) => {
                const b = Math.min(1, Math.max(0, (frame - 10 - i * 6) / 14));
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ ...fuentePixel(12), color: '#A7ADBA', width: 96 }}>{s.n}</span>
                    <BarraPixel valor={s.v * b} ancho={230} alto={18} color={i === 0 ? PIXEL.oro : i === 1 ? PIXEL.vida : PIXEL.xp} segmentos={10} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {personaje.mundo ? <div style={{ ...fuente(marca.fuentes.texto), fontSize: 22, color: '#A7ADBA', marginTop: 14 }}>{personaje.mundo}</div> : null}
      </MarcoPixel>
    </div>
  );
};

/* --------------------------------------------------------------- chispa */
/** Icono pixel que salta al lado cuando se dice una palabra con peso, con la palabra en una pastilla. */
export const Chispa = ({ c, y = 390 }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const marca = useMarca();
  const a = escalonado(resorte(frame, 0, fps, { damping: 10, stiffness: 240 }), 5);
  const fuera = Math.min(1, Math.max(0, (frame - (durationInFrames - 6)) / 6));
  const salto = Math.abs(Math.sin(frame / 5)) * 8;
  const derecha = c.lado === 'derecha';
  return (
    <div style={{ position: 'absolute', top: y - salto, [derecha ? 'right' : 'left']: 60, display: 'flex', flexDirection: derecha ? 'row-reverse' : 'row', alignItems: 'center', gap: 14, opacity: (1 - fuera) * Math.min(1, a * 2), transform: `scale(${0.6 + 0.4 * a})`, transformOrigin: derecha ? 'right center' : 'left center' }}>
      <div style={{ padding: 10, background: 'rgba(8,13,26,.85)', border: '4px solid #F4EFE6', boxShadow: '5px 5px 0 rgba(0,0,0,.5)' }}>
        <IconoPixel nombre={c.icono} tamano={72} />
      </div>
      <div style={{ padding: '10px 16px', background: marca.colores.acento, color: '#0B1426', ...fuentePixel(20), boxShadow: '4px 4px 0 rgba(0,0,0,.5)', textTransform: 'uppercase' }}>{c.texto}</div>
    </div>
  );
};

/* ---------------------------------------------------------------- golpe */
/**
 * Texto pixel grande que cae de golpe: "¡A LA FUERZA!", "+100 XP", "DEMANDA". Ocupa el mismo
 * rectangulo que el cuadro de dialogo (ZONA_TEXTO): mientras hay golpe no hay caja, y el ojo no se mueve.
 */
export const Golpe = ({ g, y = ZONA_TEXTO.y }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const marca = useMarca();
  const a = escalonado(resorte(frame, g.clave ?? 0, fps, { damping: 9, stiffness: 260, mass: 0.8 }), 5);
  const fuera = Math.min(1, Math.max(0, (frame - (durationInFrames - 7)) / 7));
  const largo = g.texto.length;
  // Vecinas de la frase, pequeñas, que entran cuando se dicen (asi la frase completa vive en el golpe).
  const vecinas = (lista) => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap', minHeight: 34 }}>
      {lista.map((w, k) => {
        const e = escalonado(resorte(frame, w.cuadro, fps, { damping: 12, stiffness: 240 }), 4);
        return <span key={k} style={{ ...fuentePixel(24), color: '#F4EFE6', textShadow: sombraPixel(PIXEL.negro, 3), opacity: e, transform: `translateY(${(1 - e) * 14}px)` }}>{w.text.replace(/^-\s*/, '')}</span>;
      })}
    </div>
  );
  // Con `lineas` (opcional, por golpe) la frase va en renglones: el tamaño sale del renglon mas largo. Sin `lineas`
  // todo queda como estaba (no mueve los golpes de los videos ya aprobados).
  const renglones = g.lineas?.length ? g.lineas : null;
  const largoMax = renglones ? Math.max(...renglones.map((r) => r.length)) : largo;
  const tamano = Math.min(60, Math.max(30, Math.round(880 / (largoMax * 0.95))));
  // Alto del marco segun las vecinas: a 24 px Press Start caben ~34 caracteres por linea (940 px).
  const lineasDe = (lista) => (lista?.length ? Math.ceil((lista.map((w) => w.text).join(' ').length + lista.length) / 34) : 0);
  const altoGolpe = Math.max(ZONA_TEXTO.alto, 36 + 12 * 2 + (lineasDe(g.antes) + lineasDe(g.despues)) * 38 + Math.round(tamano * 1.45) * (renglones?.length ?? 1) + (g.estilo === 'pastilla' ? 46 : 0));
  const tiembla = g.estilo === 'daño' ? Math.sin(frame * 2.1) * 4 : 0;
  const color = g.estilo === 'xp' ? PIXEL.xp : g.estilo === 'daño' ? PIXEL.vida : g.estilo === 'pastilla' ? '#0B1426' : '#F4EFE6';
  const inclinacion = g.lado === 'derecha' ? 3 : -3;
  const estiloBase = { ...fuentePixel(tamano), color, textShadow: g.estilo === 'pastilla' ? undefined : `${sombraPixel(g.estilo === 'xp' ? '#1B5E20' : g.estilo === 'daño' ? '#5A0E13' : marca.colores.acento, Math.round(tamano / 8))}`, textAlign: 'center', whiteSpace: 'nowrap' };
  return (
    <div style={{ position: 'absolute', left: ZONA_TEXTO.x, width: ZONA_TEXTO.ancho, top: y, opacity: 1 - fuera, transform: `translateX(${tiembla}px) rotate(${inclinacion * 0.5 * (1 - fuera)}deg)` }}>
      {/* El golpe vive en el mismo marco oscuro del dialogo: sobre la feria el texto blanco suelto no se leia. */}
      <MarcoPixel ancho={ZONA_TEXTO.ancho} alto={altoGolpe} fondo="rgba(8,13,26,.86)" borde="#F4EFE6" interior={conAlfa(g.estilo === 'xp' ? PIXEL.xp : g.estilo === 'daño' ? PIXEL.vida : marca.colores.acento, 0.6)} relleno={18} estilo={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      {/* El flex del marco no llega a sus hijos (van en un div interno): con renglones se centra aqui, en todo el alto. */}
      <div style={renglones ? { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 } : { display: 'contents' }}>
      {g.antes?.length ? vecinas(g.antes) : null}
      {/* Sin el ascenso del estilo xp: dentro del marco se montaba sobre las vecinas. */}
      <div style={{ transform: `translateY(${(1 - a) * -60}px) scale(${0.5 + 0.5 * a})`, opacity: frame >= (g.clave ?? 0) ? 1 : 0 }}>
        {g.estilo === 'pastilla' ? (
          <div style={{ padding: '18px 30px', background: marca.colores.acento, border: '5px solid #F4EFE6', boxShadow: '8px 8px 0 rgba(0,0,0,.55)' }}>
            <div style={estiloBase}>{g.texto}</div>
          </div>
        ) : renglones ? (
          renglones.map((r, k) => <div key={k} style={{ ...estiloBase, lineHeight: 1.45 }}>{r}</div>)
        ) : (
          <div style={estiloBase}>{g.texto}</div>
        )}
      </div>
      {g.despues?.length ? vecinas(g.despues) : null}
      </div>
      </MarcoPixel>
    </div>
  );
};

/* -------------------------------------------------------------- efectos */
const centroDe = (lado) => ({ x: lado === 'izquierda' ? 300 : lado === 'derecha' ? 780 : 540, y: 620 });

/**
 * Efecto de "superpoder" alrededor de la persona que habla (lado). Tipos:
 * aura (particulas que suben + halo), rayos (abanico de luz girando detras),
 * corte (tajos diagonales con destello), onda (aros que se expanden), fuego
 * (llamas pixel), estrellas (lluvia de estrellitas), nieve, relampago.
 * Todo son divs y gradientes: nada de filtros.
 */
export const Efecto = ({ f }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const marca = useMarca();
  const color = f.color ?? marca.colores.acento;
  const { x, y } = f.centro ? { x: f.centro.x * 1080, y: f.centro.y * 1920 } : centroDe(f.lado);
  const vida = Math.min(1, frame / 6) * Math.min(1, (durationInFrames - frame) / 8);
  const particulas = useMemo(() => Array.from({ length: f.cantidad ?? 34 }, (_, i) => ({ dx: (random(`${f.tipo}x${i}`) - 0.5) * 2, v: 1.5 + random(`${f.tipo}v${i}`) * 3, t: random(`${f.tipo}t${i}`) * 40, s: 8 + random(`${f.tipo}s${i}`) * 14, c: random(`${f.tipo}c${i}`) })), [f.tipo, f.cantidad]);
  if (f.tipo === 'rayos') {
    return (
      <AbsoluteFill style={{ pointerEvents: 'none', opacity: 0.55 * vida, mixBlendMode: 'screen' }}>
        <div style={{ position: 'absolute', left: x - 900, top: y - 900, width: 1800, height: 1800, background: `repeating-conic-gradient(from ${frame * 1.5}deg, ${conAlfa(color, 0.9)} 0deg 9deg, rgba(0,0,0,0) 9deg 24deg)`, maskImage: 'radial-gradient(circle, black 0%, rgba(0,0,0,.6) 30%, transparent 62%)', WebkitMaskImage: 'radial-gradient(circle, black 0%, rgba(0,0,0,.6) 30%, transparent 62%)' }} />
      </AbsoluteFill>
    );
  }
  if (f.tipo === 'corte') {
    const n = 3;
    return (
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        {frame < 5 ? <AbsoluteFill style={{ background: '#FFFFFF', opacity: 0.7 * (1 - frame / 5) }} /> : null}
        {Array.from({ length: n }, (_, i) => {
          const p = Math.min(1, Math.max(0, (frame - i * 3) / 7));
          const sale = Math.min(1, Math.max(0, (frame - 14 - i * 3) / 8));
          return <div key={i} style={{ position: 'absolute', left: x - 700, top: y - 160 + i * 150, width: 1400 * p, height: 12 - i * 2, background: i ? '#F4EFE6' : color, transform: 'rotate(-28deg)', transformOrigin: 'left center', opacity: 1 - sale, boxShadow: `0 0 0 4px ${conAlfa(color, 0.35)}` }} />;
        })}
      </AbsoluteFill>
    );
  }
  if (f.tipo === 'onda') {
    return (
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        {[0, 7, 14].map((d) => {
          const p = Math.min(1, Math.max(0, (frame - d) / 22));
          return p > 0 && p < 1 ? <div key={d} style={{ position: 'absolute', left: x - 420 * p, top: y - 420 * p, width: 840 * p, height: 840 * p, border: `${Math.round(14 * (1 - p)) + 4}px solid ${conAlfa(color, 0.9 * (1 - p))}`, borderRadius: 8 }} /> : null;
        })}
      </AbsoluteFill>
    );
  }
  if (f.tipo === 'relampago') {
    const activo = frame % 14 < 4;
    return activo ? (
      <AbsoluteFill style={{ pointerEvents: 'none', opacity: 0.85 * vida }}>
        <AbsoluteFill style={{ background: conAlfa(color, 0.12) }} />
        {[0, 1].map((k) => (
          <div key={k} style={{ position: 'absolute', left: x - 60 + k * 90, top: 0, width: 16, height: y, background: `linear-gradient(180deg, ${color}, #FFFFFF)`, clipPath: 'polygon(40% 0, 60% 0, 100% 30%, 70% 32%, 100% 60%, 60% 62%, 80% 100%, 30% 100%, 0 62%, 40% 60%, 10% 30%, 50% 28%)' }} />
        ))}
      </AbsoluteFill>
    ) : null;
  }
  // aura, fuego, estrellas, nieve: particulas pixel que suben (o caen) alrededor del centro.
  const cae = f.tipo === 'nieve' || f.tipo === 'estrellas';
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {f.tipo === 'aura' ? <div style={{ position: 'absolute', left: x - 420, top: y - 460, width: 840, height: 920, background: `radial-gradient(ellipse at center, ${conAlfa(color, 0.42 * vida)} 0%, ${conAlfa(color, 0.18 * vida)} 35%, rgba(0,0,0,0) 68%)`, mixBlendMode: 'screen' }} /> : null}
      {particulas.map((p, i) => {
        const t = (frame + p.t) % 40;
        const alto = f.tipo === 'fuego' ? 300 : 520;
        const px = x + p.dx * (f.tipo === 'fuego' ? 160 : 300) + Math.sin((frame + i * 7) / 6) * 10;
        const py = cae ? y - 520 + t * p.v * 4 : y + 240 - t * p.v * 4;
        const alfa = (cae ? 1 - t / 40 : 1 - t / 40) * vida;
        const colorP = f.tipo === 'fuego' ? (p.c > 0.6 ? '#FFD23F' : p.c > 0.3 ? '#F26B1D' : '#E8323C') : f.tipo === 'estrellas' ? (p.c > 0.5 ? PIXEL.oro : '#FFFFFF') : f.tipo === 'nieve' ? '#FFFFFF' : p.c > 0.7 ? '#FFFFFF' : color;
        if (py < y - alto - 100 || py > y + 300) return null;
        return <div key={i} style={{ position: 'absolute', left: px, top: py, width: p.s, height: p.s, background: colorP, opacity: alfa, boxShadow: `0 0 0 ${Math.round(p.s / 3)}px ${conAlfa(colorP, 0.25)}` }} />;
      })}
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------- transicion */
/**
 * Barrido pixel: una rejilla de bloques que se llena en orden al azar con el
 * navy de la marca hasta tapar todo justo en el corte, y se vacia despues.
 * Dura TRANSICION * 2 cuadros, montado desde (corte - TRANSICION).
 */
export const BarridoPixel = ({ color, variante = 0 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const marca = useMarca();
  const lado = 90;
  const cols = Math.ceil(width / lado);
  const filas = Math.ceil(height / lado);
  const mitad = durationInFrames / 2;
  const p = frame < mitad ? frame / mitad : 1 - (frame - mitad) / mitad;
  // Cuatro barridos distintos que se alternan (Juan David: "no que sea la misma siempre"): al azar,
  // cortina de arriba abajo, diagonal, y circulo desde el centro.
  const orden = (i) => {
    const c = i % cols, f = Math.floor(i / cols);
    if (variante % 4 === 1) return f / filas + random(`b${i}`) * 0.12;
    if (variante % 4 === 2) return (c / cols + f / filas) / 2 + random(`b${i}`) * 0.1;
    if (variante % 4 === 3) return Math.hypot(c - cols / 2, (f - filas / 2) * 0.6) / Math.hypot(cols / 2, filas / 2 * 0.6) + random(`b${i}`) * 0.1;
    return random(`b${i}`);
  };
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {Array.from({ length: cols * filas }, (_, i) => {
        const umbral = orden(i);
        const visible = p >= umbral;
        if (!visible) return null;
        return <div key={i} style={{ position: 'absolute', left: (i % cols) * lado, top: Math.floor(i / cols) * lado, width: lado + 1, height: lado + 1, background: umbral > 0.85 ? (color ?? marca.colores.acento) : marca.colores.fondo }} />;
      })}
    </AbsoluteFill>
  );
};

/* ----------------------------------------------------------- gameplay */
/**
 * Gameplay incrustado: `lleno` (el juego a pantalla completa y la persona en un
 * recuadro pixel abajo, siguiendo con su voz), `dividido` (juego arriba, persona
 * abajo) o `ventana` (un marco pixel sobre el video, como un monitor).
 */
export const VentanaJuego = ({ j, rotulo }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const marca = useMarca();
  const a = escalonado(resorte(frame, 0, fps, { damping: 16, stiffness: 200 }), 5);
  const fuera = Math.min(1, Math.max(0, (frame - (durationInFrames - 8)) / 8));
  const caja = j.modo === 'ventana' ? { x: 60, y: 300, w: 960, h: 760 } : j.modo === 'dividido' ? { x: 0, y: 0, w: 1080, h: 1000 } : { x: 0, y: 0, w: 1080, h: 1920 };
  return (
    <div style={{ position: 'absolute', left: caja.x, top: caja.y, width: caja.w, height: caja.h, opacity: Math.min(1, a * 1.6) * (1 - fuera), transform: j.modo === 'ventana' ? `scale(${0.8 + 0.2 * a})` : undefined, overflow: 'hidden', border: j.modo === 'ventana' ? '6px solid #F4EFE6' : undefined, boxShadow: j.modo === 'ventana' ? '10px 10px 0 rgba(0,0,0,.55)' : undefined, background: marca.colores.fondo }}>
      <OffthreadVideo src={staticFile(j.archivo)} trimBefore={Math.round((j.desdeS ?? 0) * fps)} muted style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} />
    </div>
  );
};

/** Rotulo pixel del gameplay (nombre del juego y URL), en una pestaña arriba a la derecha de la caja. */
export const RotuloJuego = ({ texto, sub, y = 320 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const a = escalonado(resorte(frame, 4, fps), 4);
  return (
    <div style={{ position: 'absolute', right: 50, top: y, opacity: Math.min(1, a * 1.5), transform: `translateX(${(1 - a) * 40}px)` }}>
      <MarcoPixel ancho={560} alto={sub ? 124 : 84} fondo="rgba(8,13,26,.9)" borde="#F4EFE6" interior={conAlfa(marca.colores.acento, 0.6)} relleno={16}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 14, height: 14, background: PIXEL.vida, opacity: Math.floor(frame / 10) % 2 ? 0.3 : 1 }} />
          <TextoPixel texto={texto} tamano={18} alinear="left" />
        </div>
        {sub ? <div style={{ ...fuente(marca.fuentes.texto), fontSize: 22, color: '#A7ADBA', marginTop: 8 }}>{sub}</div> : null}
      </MarcoPixel>
    </div>
  );
};

export { CRT };
