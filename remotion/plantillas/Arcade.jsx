import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, Freeze, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Fondo } from '../componentes/Fondo.jsx';
import { Firma } from '../componentes/Firma.jsx';
import { fuente, useFuentes } from '../fuentes.js';
import { ContextoMarca, useMarca } from '../marca.js';
import { conAlfa } from '../util.js';
import { BarridoPixel, Chispa, CRT, Dialogo, Efecto, Ficha, Golpe, Hud, RotuloJuego, VentanaJuego } from '../arcade/Capas.jsx';
import { FPS, lineaArcade, TRANSICION } from '../arcade/linea.js';
import { BarraPixel, fuentePixel, IconoPixel, MarcoPixel, PIXEL, sombraPixel, TextoPixel } from '../arcade/Pixel.jsx';
import { Martillo3D, Moneda3D, Mundo3D, Personaje3D, Trifuerza3D } from '../arcade/Tres.jsx';
import { acentoDe, cieloDe, Isla3D, MUNDOS, particulasDe } from '../arcade/Mundos.jsx';
import { Bloques, CAPAS_FX, MOVIMIENTOS, movimientoDe } from '../arcade/Efectos.jsx';
import { INTROS } from '../arcade/Intros.jsx';
import { CORTINILLAS } from '../arcade/Cortinillas.jsx';

/**
 * Plantilla Arcade (SOFA, oct-2026): las entrevistas de Juan David en el Salon
 * del Ocio y la Fantasia contadas como un videojuego. El es el jugador (tunica,
 * varita y microfono) y cada entrevistado es un personaje que se une a la
 * partida: ficha con retrato pixelado, cuadro de dialogo RPG en vez de
 * subtitulos, HUD con el logo de Trifuerza, vidas y puntaje, golpes de texto
 * pixel, chispas, superpoderes (aura, rayos, cortes...) y, entre escenas,
 * barridos pixel, el mapa de niveles en 3D (voxeles) y la Trifuerza voxel.
 *
 * Lo que no cambia aunque el estilo sea otro: la marca (logo oficial, navy,
 * crema y naranja de juanda), nada se corta de lo que se dice, la cara nunca
 * queda tapada y todo lo dicho sale en pantalla.
 */
const NOMBRES_BASE = { jd: { nombre: 'JUAN DAVID' } };

export const Arcade = ({ pieza, marca }) => {
  useFuentes();
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const linea = useMemo(() => lineaArcade(pieza), [pieza]);
  const nombres = { ...NOMBRES_BASE, ...(pieza.nombres ?? {}) };
  // Puntaje acumulado: +100 por golpe, +10 por chispa, +250 por ficha nueva, +500 al final.
  const puntos = useMemo(() => {
    const p = [];
    for (const e of linea.escenas) {
      if (e.tipo !== 'clip' && e.tipo !== 'cierre') continue;
      if (e.ficha) p.push({ cuadro: e.inicio + e.ficha.inicio + 12, valor: 250 });
      for (const g of e.golpes) p.push({ cuadro: e.inicio + g.inicio + 3, valor: 100 });
    }
    return p.sort((a, b) => a.cuadro - b.cuadro);
  }, [linea]);
  const cfg = marca.montaje ?? {};
  // Todos los personajes de la pieza en orden de aparicion (la cortinilla "elige tu personaje" los muestra).
  const todos = useMemo(() => {
    const lista = [];
    for (const e of linea.escenas) {
      if (!e.personaje || e.tipo === 'nivel' || lista.some((x) => x.personaje.nombre === e.personaje.nombre)) continue;
      lista.push({ personaje: e.personaje, retrato: e.retratoPng, jugador: e.jugador });
    }
    return lista;
  }, [linea]);
  const final = linea.escenas.at(-1);
  const enFinal = frame >= final.inicio;

  return (
    <ContextoMarca.Provider value={marca}>
      <AbsoluteFill style={{ backgroundColor: marca.colores.fondo }}>
        {linea.escenas.map((e, i) => (
          <Sequence key={i} from={e.inicio} durationInFrames={Math.max(1, e.cuadros)} name={`${e.tipo} ${e.personaje?.nombre ?? e.texto ?? ''}`}>
            {e.tipo === 'clip' || e.tipo === 'cierre' ? <EscenaClip e={e} pieza={pieza} nombres={nombres} /> : null}
            {e.tipo === 'titulo' ? <EscenaTitulo e={e} pieza={pieza} nombres={nombres} /> : null}
            {e.tipo === 'nivel' ? <EscenaNivel e={{ ...e, todos }} pieza={pieza} /> : null}
            {e.tipo === 'juego' ? <EscenaJuego e={e} /> : null}
            {e.tipo === 'final' ? <EscenaFinal e={e} pieza={pieza} nombres={nombres} /> : null}
          </Sequence>
        ))}

        {/* HUD durante el cuerpo (no en titulo ni final): logo de marca, vidas y puntaje. */}
        {!enFinal ? (
          <Sequence from={linea.escenas[0].tipo === 'titulo' ? linea.escenas[0].cuadros : 0} durationInFrames={Math.max(1, final.inicio - (linea.escenas[0].tipo === 'titulo' ? linea.escenas[0].cuadros : 0))} name="hud">
            <Hud logo={cfg.logo} puntos={puntos} nivel={pieza.nivel} />
          </Sequence>
        ) : null}

        {linea.cambios.map((c, k) => (
          <Sequence key={c} from={c - TRANSICION} durationInFrames={TRANSICION * 2} name="barrido">
            <BarridoPixel variante={k} />
          </Sequence>
        ))}
        <CRT fuerza={0.6} />
        <Audio src={staticFile(`audio/arcade/${pieza.slug}--${marca.id}.wav`)} />
      </AbsoluteFill>
    </ContextoMarca.Provider>
  );
};

/* ----------------------------------------------------------------- clip */
/**
 * Escena de entrevista: el metraje con zoom al que habla (`lados` de la pieza
 * dicen de que lado esta cada uno), acercamientos de golpe en palabras con peso,
 * y encima las capas: efectos, ficha, chispas, golpes, gameplay y dialogo.
 */
const EscenaClip = ({ e, pieza, nombres }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const lados = e.lados ?? pieza.lados ?? { jd: 'derecha', p2: 'izquierda' };
  const turno = e.turnos.find((t) => frame >= t.inicio && frame < t.fin) ?? e.turnos[0];
  const indice = e.turnos.indexOf(turno);
  // Zoom al que habla: el centro se desliza con resorte desde el turno anterior; el entrevistado
  // va mas cerrado (1,3) que Juan David (1,2). Con `foco` por persona la pieza afina el encuadre.
  const foco = (quien) => {
    const f = e.foco?.[quien] ?? pieza.foco?.[quien];
    if (f) return { x: f.x, y: f.y ?? 0.32, escala: f.escala ?? (quien === 'jd' ? 1.2 : 1.3) };
    const lado = lados[quien] ?? 'centro';
    return { x: lado === 'izquierda' ? 0.3 : lado === 'derecha' ? 0.7 : 0.5, y: 0.32, escala: quien === 'jd' ? 1.2 : 1.3 };
  };
  const actual = foco(turno.quien);
  const previo = indice > 0 ? foco(e.turnos[indice - 1].quien) : actual;
  const p = Math.min(1, spring({ frame: frame - turno.inicio, fps, config: { damping: 22, stiffness: 120, mass: 1 } }));
  const mezclar = (a, b) => a + (b - a) * p;
  const golpeZoom = e.zooms.reduce((z, g) => z * (1 + (g.escala - 1) * Math.min(1, Math.max(0, (frame - g.inicio) / 5)) * (1 - Math.min(1, Math.max(0, (frame - (g.fin - 8)) / 8)))), 1);
  const base = e.sinZoom ? { x: 0.5, y: 0.5, escala: 1 } : { x: mezclar(previo.x, actual.x), y: mezclar(previo.y, actual.y), escala: mezclar(previo.escala, actual.escala) };
  // Juego a pantalla completa: la persona pasa a un recuadro pixel abajo a la izquierda.
  const juego = e.juego.find((j) => frame >= j.inicio && frame < j.fin);
  const enJuego = juego ? Math.min(1, (frame - juego.inicio) / 8) * Math.min(1, (juego.fin - frame) / 8) : 0;
  const pip = juego?.modo === 'lleno' ? enJuego : 0;
  const dividido = juego?.modo === 'dividido' ? enJuego : 0;
  // Efectos que mueven el video: levitar y vuelo.
  const mov = e.fx.find((f) => MOVIMIENTOS.has(f.tipo) && frame >= f.inicio && frame < f.fin);
  const m = mov ? movimientoDe(mov.tipo, frame - mov.inicio, mov.fin - mov.inicio, frame) : movimientoDe('', 0, 1, frame);
  const dy = m.dy;
  const giro = m.giro;
  const caja = pip > 0 ? { x: 50 + (0) * pip, y: 1920 - 420 - 560 - 40, w: 360, h: 560 } : dividido > 0 ? { x: 0, y: 1000, w: 1080, h: 920 } : { x: 0, y: 0, w: 1080, h: 1920 };
  const lerp = (a, b, q) => a + (b - a) * q;
  const q = Math.max(pip, dividido);
  const r = { x: lerp(0, caja.x, q), y: lerp(0, caja.y, q), w: lerp(1080, caja.w, q), h: lerp(1920, caja.h, q) };
  return (
    <AbsoluteFill>
      {/* El juego va debajo de la persona en lleno/dividido (ella pasa a un recuadro) y encima en modo ventana. */}
      {juego && juego.modo !== 'ventana' ? <VentanaJuego j={juego} /> : null}
      <div style={{ position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h, overflow: 'hidden', border: q > 0.5 ? '6px solid #F4EFE6' : undefined, boxShadow: q > 0.5 ? '8px 8px 0 rgba(0,0,0,.55)' : undefined, boxSizing: 'border-box', transform: `translate(${m.dx}px, ${dy}px) rotate(${giro}deg) scale(${m.escala * m.escalaX}, ${m.escala * m.escalaY})`, transformOrigin: '50% 85%' }}>
        {/* Clones: copias desplazadas y teñidas del mismo tramo (sin audio). */}
        {m.copias.map((c, k) => (
          <div key={`cl${k}`} style={{ position: 'absolute', inset: 0, transform: `translateX(${c.dx}px)`, opacity: c.opacidad, filter: c.tinte, pointerEvents: 'none' }}>
            {e.tramos.filter((t) => frame >= t.inicio && frame < t.inicio + t.cuadros).map((t, i) => (
              <Sequence key={i} from={t.inicio} durationInFrames={t.cuadros}>
                <OffthreadVideo src={staticFile(t.archivo)} trimBefore={Math.round(t.desde * FPS)} trimAfter={Math.round(t.hasta * FPS)} playbackRate={t.velocidad ?? 1} muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${base.escala * golpeZoom})`, transformOrigin: `${base.x * 100}% ${base.y * 100}%` }} />
              </Sequence>
            ))}
          </div>
        ))}
        {e.tramos.map((t, i) => (
          <Sequence key={i} from={t.inicio} durationInFrames={t.cuadros} name={`tramo ${i + 1}`}>
            <OffthreadVideo
              src={staticFile(t.archivo)}
              trimBefore={Math.round(t.desde * FPS)}
              trimAfter={Math.round(t.hasta * FPS)}
              playbackRate={t.velocidad ?? 1}
              volume={(f) => (t.volumen ?? 1) * Math.min(1, (f + 1) / 3, (t.cuadros - f) / 3)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${base.escala * golpeZoom * (i % 2 ? 1.04 : 1)})`, transformOrigin: `${base.x * 100}% ${base.y * 100}%`, filter: e.grado ?? pieza.grado ?? 'contrast(1.06) saturate(1.12)' }}
            />
          </Sequence>
        ))}
        {/* Cola de lectura: el crudo no tiene aire despues de la ultima frase, asi que el ultimo cuadro se queda
            quieto (sin audio) con un empuje lento mientras la ultima pagina termina de leerse. */}
        {e.cola > 0 ? (() => {
          const u = e.tramos.at(-1);
          const desdeCola = e.cuadros - e.cola;
          return (
            <Sequence from={desdeCola} durationInFrames={e.cola} name="cola">
              <Freeze frame={u.cuadros - 1}>
                <Sequence from={0} durationInFrames={u.cuadros}>
                  <OffthreadVideo src={staticFile(u.archivo)} trimBefore={Math.round(u.desde * FPS)} trimAfter={Math.round(u.hasta * FPS)} playbackRate={u.velocidad ?? 1} muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${base.escala * (1 + Math.max(0, frame - desdeCola) * 0.0015)})`, transformOrigin: `${base.x * 100}% ${base.y * 100}%`, filter: e.grado ?? pieza.grado ?? 'contrast(1.06) saturate(1.12)' }} />
                </Sequence>
              </Freeze>
            </Sequence>
          );
        })() : null}
        {mov?.tipo === 'vuelo' ? <LineasVelocidad /> : null}
        {m.bloques > 0 ? <Bloques p={m.bloques} color={marca.colores.fondo} /> : null}
        {m.flash ? <AbsoluteFill style={{ background: '#FFFFFF', opacity: 0.85 }} /> : null}
        {/* Viñeta y degradado para que HUD y dialogo lean sobre cualquier fondo. */}
        <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,.35) 0%, rgba(0,0,0,0) 20%, rgba(0,0,0,0) 62%, rgba(0,0,0,.45) 100%)', pointerEvents: 'none' }} />
      </div>
      {juego?.modo === 'ventana' ? <VentanaJuego j={juego} /> : null}
      {juego ? <RotuloJuego texto={juego.rotulo ?? 'EL CLAUSTRO EN VIVO'} sub={juego.sub ?? 'trifuerza.co/juego-urosario'} y={juego.modo === 'dividido' ? 1030 : 400} /> : null}
      {e.fx.filter((f) => !MOVIMIENTOS.has(f.tipo)).map((f, i) => {
        const Capa = CAPAS_FX[f.tipo] ?? Efecto;
        const ff = { ...f, lado: f.lado ?? lados[f.quien ?? 'p2'], centro: f.centro ?? (f.quien ? (() => { const q = foco(f.quien); return { x: q.x, y: q.y + 0.08 }; })() : undefined) };
        return (
          <Sequence key={`f${i}`} from={f.inicio} durationInFrames={Math.max(1, f.fin - f.inicio)} name={`fx ${f.tipo}`}>
            <Capa f={ff} />
          </Sequence>
        );
      })}
      {e.ficha && e.personaje && !e.personaje.anonimo ? (
        <Sequence from={e.ficha.inicio} durationInFrames={e.ficha.fin - e.ficha.inicio} name="ficha">
          <Ficha personaje={e.personaje} retrato={e.retratoPng} lado={lados.p2 === 'izquierda' ? 'derecha' : 'izquierda'} jugador={e.jugador} />
        </Sequence>
      ) : null}
      {e.golpes.map((g, i) => (
        <Sequence key={`g${i}`} from={g.inicio} durationInFrames={g.fin - g.inicio} name={`golpe ${g.texto}`}>
          <Golpe g={g} />
        </Sequence>
      ))}
      {/* Personaje sin identificar (`anonimo`): en vez de inventarle nombre, la pestaña dice PLAYER N. */}
      <Dialogo paginas={e.paginas} nombres={{ ...nombres, p2: e.personaje ? { nombre: e.personaje.anonimo ? `PLAYER ${e.jugador ?? 2}` : e.personaje.nombre.toUpperCase(), color: e.personaje.color } : nombres.p2 ?? { nombre: 'PLAYER 2' } }} />
      {e.tipo === 'cierre' && e.cta ? <CTA texto={e.cta} /> : null}
    </AbsoluteFill>
  );
};

/** Lineas de velocidad verticales (vuelo): rayas blancas que bajan rapido. */
const LineasVelocidad = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity: 0.7 }}>
      {Array.from({ length: 14 }, (_, i) => (
        <div key={i} style={{ position: 'absolute', left: 30 + i * 76, top: ((frame * 60 + i * 137) % 2200) - 300, width: 6, height: 160 + (i % 3) * 80, background: '#FFFFFF' }} />
      ))}
    </AbsoluteFill>
  );
};

/** Llamado a la accion del cierre, como pastilla pixel que late. */
const CTA = ({ texto }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const a = spring({ frame: frame - 10, fps, config: { damping: 10, stiffness: 200 } });
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 420, display: 'flex', justifyContent: 'center', transform: `scale(${Math.max(0, a) * (1 + 0.03 * Math.sin(frame / 4))})` }}>
      <div style={{ padding: '18px 32px', background: marca.colores.acento, border: '5px solid #F4EFE6', boxShadow: '8px 8px 0 rgba(0,0,0,.55)', ...fuentePixel(24), color: '#0B1426', whiteSpace: 'nowrap' }}>{texto}</div>
    </div>
  );
};

/* --------------------------------------------------------------- titulo */
/** Pantalla de titulo: Trifuerza voxel girando, el nombre de la serie, la pregunta del video y "PRESS START" que parpadea. */
const EscenaTitulo = ({ e, pieza, nombres }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const marca = useMarca();
  const a = Math.min(1, spring({ frame: frame - 14, fps, config: { damping: 12, stiffness: 180 } }));
  const b = Math.min(1, spring({ frame: frame - 26, fps, config: { damping: 12, stiffness: 180 } }));
  const titulo = e.texto ?? pieza.titulo;
  return (
    <AbsoluteFill>
      <Fondo />
      {/* Motivo 3D segun el tema del video: la Trifuerza (marca), la moneda (cuanto cobraria) o el mapa (mecanicas). */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.9 }}>
        {(() => {
          const m = e.motivo ?? pieza.motivo;
          if (m === 'moneda') return <Moneda3D ancho={width} alto={height} />;
          if (m === 'mundo') return <Mundo3D ancho={width} alto={height} niveles={pieza.niveles ?? 5} nivel={0} acento={marca.colores.acento} />;
          if (m === 'personaje') return <Personaje3D ancho={width} alto={height} />;
          if (m === 'martillo') return <Martillo3D ancho={width} alto={height} />;
          if (typeof m === 'string' && m.startsWith('isla:')) return <><AbsoluteFill style={{ background: cieloDe(m.slice(5)) }} /><Isla3D ancho={width} alto={height} mundo={m.slice(5)} semilla={pieza.slug} niveles={pieza.niveles ?? 4} nivel={0} orbita={0.4} /></>;
          // Intros 2D por tema (remotion/arcade/Intros.jsx): protesto, tesoro, plataformas, torneo, tienda, cartuchos, arcade.
          if (INTROS[m]) { const Intro = INTROS[m]; return <Intro {...(e.intro ?? pieza.intro ?? {})} />; }
          // Cinematica del juego real: el gameplay a pantalla completa, con un zoom lento, como la demo que corre sola en un arcade.
          if (m === 'juego') return <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}><OffthreadVideo src={staticFile((e.juegoFondo ?? pieza.juegoFondo).archivo)} trimBefore={Math.round(((e.juegoFondo ?? pieza.juegoFondo).desdeS ?? 0) * 30)} muted style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated', transform: `scale(${1.05 + frame * 0.0012})`, transformOrigin: '50% 40%' }} /><div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(5,8,16,.55) 0%, rgba(5,8,16,.15) 40%, rgba(5,8,16,.7) 100%)' }} /></div>;
          return <Trifuerza3D ancho={width} alto={height} />;
        })()}
      </div>
      {/* Pantalla de carga: barra grande que se llena en bloques. Sin "TIP" (13-oct-2026: nadie lo leia). */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1640, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, opacity: b }}>
        <span style={{ ...fuentePixel(22), color: '#F4EFE6', textShadow: sombraPixel(PIXEL.negro, 3) }}>{'CARGANDO' + '.'.repeat(1 + (Math.floor(frame / 8) % 3))}</span>
        <BarraPixel valor={Math.min(1, Math.max(0, (frame - 20) / (e.cuadros - 30)))} ancho={520} alto={34} color={marca.colores.acento} segmentos={14} />
      </div>
      <div style={{ position: 'absolute', left: 60, right: 60, top: 300, textAlign: 'center' }}>
        <div style={{ ...fuentePixel(22), color: marca.colores.tinta, textShadow: sombraPixel(PIXEL.negro, 3), letterSpacing: '0.1em', opacity: Math.min(1, frame / 8) }}>{e.serie ?? pieza.serie ?? 'SOFA 2026 · BOGOTÁ'}</div>
      </div>
      {/* Con locucion (`voz`) la frase dicha ocupa la zona del titulo en el cuadro de dialogo: dos textos ahi no se leen. */}
      {e.voz ? (
        <>
          <Sequence from={Math.round((e.voz.en ?? 0.5) * fps)} name="voz"><Audio src={staticFile(e.voz.archivo)} /></Sequence>
          <Dialogo paginas={e.paginas ?? []} nombres={nombres} />
        </>
      ) : (
      <div style={{ position: 'absolute', left: 50, right: 50, top: 1180, textAlign: 'center', transform: `scale(${0.7 + 0.3 * a})`, opacity: a }}>
        <MarcoPixel ancho={980} alto={e.alto ?? 300} fondo="rgba(8,13,26,.9)" borde="#F4EFE6" interior={conAlfa(marca.colores.acento, 0.6)} relleno={30} estilo={{ margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
            {/* `parte` (videos partidos en dos): va dentro del recuadro del titulo, sobre la pregunta (Juan David, 13-oct-2026). */}
            {e.parte ? <div style={{ ...fuentePixel(34), color: '#0B1426', background: marca.colores.acento, padding: '12px 26px', boxShadow: '6px 6px 0 rgba(0,0,0,.55)' }}>{e.parte}</div> : null}
            <div style={{ ...fuentePixel(titulo.length > 30 ? 34 : 42), color: marca.colores.tinta, textShadow: sombraPixel(marca.colores.acento, 5), lineHeight: 1.5 }}>{titulo}</div>
          </div>
        </MarcoPixel>
      </div>
      )}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1545, textAlign: 'center', opacity: b * (Math.floor(frame / 12) % 2 ? 0.25 : 1) }}>
        <span style={{ ...fuentePixel(30), color: PIXEL.oro, textShadow: sombraPixel(PIXEL.negro, 4) }}>PRESS START</span>
      </div>
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- nivel */
/**
 * Entre entrevistas: una cortinilla de videojuego distinta por escena (`estilo` en la pieza:
 * vs, seleccion, encuentro, mundo2d, jefe, resultado, mision; remotion/arcade/Cortinillas.jsx).
 * Sin estilo, el mapa voxel de antes.
 */
const EscenaNivel = ({ e, pieza }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const marca = useMarca();
  const a = Math.min(1, spring({ frame: frame - 4, fps, config: { damping: 10, stiffness: 220 } }));
  const mundo = e.mundo ?? 'pradera';
  if (CORTINILLAS[e.estilo]) { const Cortinilla = CORTINILLAS[e.estilo]; return <Cortinilla e={e} pieza={pieza} />; }
  const Particulas = CAPAS_FX[particulasDe(mundo)];
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: cieloDe(mundo) }} />
      <Isla3D ancho={width} alto={height} mundo={mundo} semilla={`${pieza.slug}-${e.numero ?? 1}`} niveles={e.total ?? pieza.niveles ?? 5} nivel={(e.numero ?? 1) - 1} orbita={((e.numero ?? 1) % 4) * 0.5} />
      {Particulas ? <Particulas f={{ tipo: particulasDe(mundo), cantidad: 30 }} /> : null}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 520, textAlign: 'center', transform: `scale(${a})` }}>
        <div style={{ ...fuentePixel(64), color: marca.colores.tinta, textShadow: sombraPixel(acentoDe(mundo), 7) }}>NIVEL {e.numero ?? 1}</div>
        {e.nombre ? <div style={{ ...fuentePixel(24), color: PIXEL.oro, textShadow: sombraPixel(PIXEL.negro, 3), marginTop: 26 }}>{e.nombre.toUpperCase()}</div> : null}
      </div>
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- juego */
/** Gameplay a pantalla completa como escena propia (sin voz encima), con su rotulo. */
const EscenaJuego = ({ e }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <OffthreadVideo src={staticFile(e.archivo)} trimBefore={Math.round((e.desdeS ?? 0) * fps)} muted style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} />
      <RotuloJuego texto={e.rotulo ?? 'EL CLAUSTRO EN VIVO'} sub={e.sub ?? 'trifuerza.co/juego-urosario'} y={e.y ?? 320} />
      {e.texto ? (
        <div style={{ position: 'absolute', left: 50, width: 980, top: 1190 }}>
          <MarcoPixel ancho={980} alto={200} fondo="rgba(8,13,26,.9)" borde="#F4EFE6" relleno={26} estilo={{ display: 'flex', alignItems: 'center' }}>
            <TextoPixel texto={e.texto} tamano={24} alinear="left" />
          </MarcoPixel>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- final */
/** Tarjeta final: "CONTINUE?" con cuenta regresiva, firma de la cuenta y el CTA. */
const EscenaFinal = ({ e, pieza, nombres }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const a = Math.min(1, spring({ frame, fps, config: { damping: 14, stiffness: 200 } }));
  // La cuenta regresiva dura lo que dura la tarjeta: con locucion la tarjeta es larga y no debe quedarse en 0.
  const paso = e.voz ? Math.max(8, Math.floor(e.cuadros / 10)) : 8;
  const cuenta = Math.max(0, 9 - Math.floor(frame / paso));
  const cta = 'cta' in (pieza.variantes?.[marca.id] ?? {}) ? pieza.variantes[marca.id].cta : pieza.cta ?? marca.montaje?.cta;
  return (
    <AbsoluteFill>
      <Fondo />
      {/* Con locucion, el bloque sube para dejar libre la zona del dialogo (ZONA_TEXTO). */}
      <AbsoluteFill style={{ justifyContent: e.voz ? 'flex-start' : 'center', paddingTop: e.voz ? 420 : 0, alignItems: 'center', gap: e.voz ? 40 : 50 }}>
        <div style={{ ...fuentePixel(44), color: marca.colores.tinta, textShadow: sombraPixel(marca.colores.acento, 5), opacity: a }}>CONTINUE?</div>
        <div style={{ ...fuentePixel(110), color: PIXEL.oro, textShadow: sombraPixel(PIXEL.negro, 8), transform: `scale(${1 + 0.1 * Math.max(0, 1 - (frame % 8) / 4)})` }}>{cuenta}</div>
        <div style={{ opacity: a, transform: `translateY(${(1 - a) * 16}px)` }}><Firma tamano={1.1} /></div>
        {cta ? (
          <div style={{ padding: '22px 40px', background: marca.colores.acento, border: '5px solid #F4EFE6', boxShadow: '8px 8px 0 rgba(0,0,0,.55)', ...fuentePixel(26), color: '#0B1426', opacity: Math.floor(frame / 10) % 2 ? 0.85 : 1 }}>{cta}</div>
        ) : null}
      </AbsoluteFill>
      {e.voz ? (
        <>
          <Sequence from={Math.round((e.voz.en ?? 0.5) * fps)} name="voz"><Audio src={staticFile(e.voz.archivo)} /></Sequence>
          <Dialogo paginas={e.paginas ?? []} nombres={nombres} />
        </>
      ) : null}
    </AbsoluteFill>
  );
};
