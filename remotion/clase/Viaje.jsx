import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { useFuentes } from '../fuentes.js';
import { Globo, kmEntre } from './Globo.jsx';
import { Barrido, Kicker, Momento, Mono, Texto } from './Trailer.jsx';

/**
 * Tráiler de venta en forma de viaje (clases/<slug>.json → venta.viaje): el avión de la clase recorre
 * el planeta y en cada parada aparece el tema en grande; después habla el profesor (un fragmento real
 * de la clase editada) y el avión sigue. El precio va al final, cuando ya se convenció.
 *
 * El planeta corre debajo de todo el video sin cortes (Globo.jsx); las escenas son capas encima.
 * Sale en 16:9 y 9:16 de la misma composición, como Trailer.jsx.
 */
const FPS = 30;
const RES = { stiffness: 240, damping: 24 };
export const cuadrosViaje = (clase) => clase.venta.viaje.reduce((s, e) => s + Math.round(e.dura * FPS), 0);

const useEntrada = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (d, config = RES) => spring({ frame: frame - d, fps, config });
};

/** Velo oscuro sobre el planeta: el texto y los clips se leen, el viaje sigue viéndose detrás. */
const Velo = ({ T, fuerza = 0.6, entra = 8 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const a = interpolate(frame, [0, entra, durationInFrames - 6, durationInFrames], [0, 1, 1, 0.6], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, ${T.fondo}${Math.round(fuerza * 200).toString(16).padStart(2, '0')} 0%, ${T.fondo}${Math.round(fuerza * 255).toString(16).padStart(2, '0')} 75%)`, opacity: a }} />;
};

/**
 * Intro estándar: el logo de Trifuerza (public/intros, sin la estrella de Gemini), acelerado. Va como
 * secuencia de JPG y su sonido aparte: como video, OffthreadVideo fallaba («No frame found at position»).
 */
const Logo = ({ e }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H, durationInFrames } = useVideoConfig();
  const vert = H > W;
  const sal = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const src = staticFile(`${e.cuadros}/${String(Math.min(frame + 1, e.n)).padStart(4, '0')}.jpg`);
  // En vertical el logo se agranda (cabe el nombre entero) y el fondo gris liso se completa con la
  // misma toma desenfocada: no se nota la costura.
  return (
    <AbsoluteFill style={{ opacity: sal }}>
      {vert && <Img src={src} style={{ position: 'absolute', height: H, width: (H * 16) / 9, left: (W - (H * 16) / 9) / 2, filter: 'blur(30px)', transform: 'scale(1.1)' }} />}
      <Img src={src} style={vert ? { position: 'absolute', width: W * 1.85, height: (W * 1.85 * 9) / 16, left: -W * 0.425, top: (H - (W * 1.85 * 9) / 16) / 2 } : { width: W, height: H }} />
      {e.sonido && <Audio src={staticFile(e.sonido)} volume={e.volumen ?? 0.8} />}
    </AbsoluteFill>
  );
};

/** Despegue: el título de la clase como pase de abordar, con el avión dando vueltas sobre Bogotá. */
const Despegue = ({ clase, e }) => {
  const { width: W, height: H } = useVideoConfig();
  const T = clase.tema;
  const ent = useEntrada();
  const vert = H > W;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: vert ? `linear-gradient(180deg, ${T.fondo}f0 0%, ${T.fondo}c0 40%, transparent 62%)` : `linear-gradient(90deg, ${T.fondo}f2 0%, ${T.fondo}b0 45%, transparent 70%)` }} />
      <div style={{ position: 'absolute', left: vert ? 70 : 140, right: vert ? 70 : 'auto', top: vert ? 260 : 250, width: vert ? 'auto' : 980, textAlign: vert ? 'center' : 'left' }}>
        <div style={{ opacity: ent(2) }}><Mono style={{ fontSize: vert ? 28 : 26, color: T.acento }}>{e.antetitulo}</Mono></div>
        <div style={{ fontFamily: `'Space Grotesk'`, fontWeight: 700, fontSize: vert ? 150 : 160, lineHeight: 0.95, letterSpacing: '-0.035em', color: T.tinta, marginTop: 26,
          opacity: ent(5), transform: `translateY(${(1 - ent(5)) * 30}px)` }}>{e.titulo}</div>
        <div style={{ fontFamily: `'Inter'`, fontSize: vert ? 42 : 38, color: T.tenue, marginTop: 28, lineHeight: 1.3, opacity: ent(11), transform: `translateY(${(1 - ent(11)) * 14}px)` }}>{e.bajada}</div>
        <div style={{ marginTop: 36, display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: vert ? 'center' : 'flex-start' }}>
          {e.chips.map((c, i) => (
            <span key={i} style={{ border: `1.5px solid ${i === 0 ? T.acento : T.linea}`, background: i === 0 ? `${T.acento}22` : `${T.fondo2}e6`, borderRadius: 999, padding: '12px 24px', opacity: ent(16 + i * 4) }}>
              <Mono style={{ fontSize: vert ? 24 : 20, color: T.tinta, letterSpacing: '0.1em' }}>{c}</Mono>
            </span>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Parada del vuelo: primero la ruta con su barra de progreso; al aterrizar, el tema en grande. */
const Parada = ({ clase, e, de }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H, fps } = useVideoConfig();
  const T = clase.tema;
  const vert = H > W;
  const mapa = clase.venta.mapa;
  const vuelo = Math.round((e.vuelo ?? 1.2) * fps);
  const u = Math.min(1, frame / vuelo);
  const A = mapa[de];
  const B = mapa[e.parada];
  const hud = interpolate(frame, [0, 6, vuelo + 2, vuelo + 10], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const llega = (d, c = { stiffness: 260, damping: 20 }) => spring({ frame: frame - vuelo + 4 - d, fps, config: c });
  const palabras = e.titulo.split(' ');
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', top: vert ? 230 : 60, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: hud }}>
        <div style={{ background: `${T.fondo}e6`, border: `1.5px solid ${T.linea}`, borderRadius: 22, padding: vert ? '20px 34px' : '16px 30px', minWidth: vert ? 760 : 620 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, justifyContent: 'space-between' }}>
            <Mono style={{ fontSize: vert ? 34 : 28, color: T.tinta }}>{A.codigo} <span style={{ color: T.acento }}>→</span> {B.codigo}</Mono>
            <Mono style={{ fontSize: vert ? 24 : 20, color: T.tenue, letterSpacing: '0.08em' }}>{kmEntre(A, B).toLocaleString('es-CO')} km</Mono>
          </div>
          <div style={{ marginTop: 12, height: 6, borderRadius: 3, background: T.linea, overflow: 'hidden' }}>
            <div style={{ width: `${u * 100}%`, height: '100%', background: T.acento }} />
          </div>
        </div>
      </div>
      {frame >= vuelo - 6 && (
        <>
          <AbsoluteFill style={{ background: vert ? `linear-gradient(180deg, ${T.fondo}f0 0%, ${T.fondo}b8 42%, transparent 64%)` : `linear-gradient(90deg, ${T.fondo}f2 0%, ${T.fondo}a8 48%, transparent 72%)`, opacity: llega(0) }} />
          <div style={{ position: 'absolute', left: vert ? 60 : 140, right: vert ? 60 : 'auto', top: vert ? 250 : 230, width: vert ? 'auto' : 1000, textAlign: vert ? 'center' : 'left' }}>
            <Kicker T={T} a={llega(0)}>{e.etiqueta}</Kicker>
            {e.grande && (
              <div style={{ fontFamily: `'Space Grotesk'`, fontWeight: 700, fontSize: vert ? 230 : 220, lineHeight: 0.9, letterSpacing: '-0.04em', color: T.acento, marginTop: 26,
                opacity: llega(2), transform: `scale(${0.8 + 0.2 * llega(2, { stiffness: 320, damping: 14 })})`, transformOrigin: vert ? 'center' : 'left' }}>{e.grande}</div>
            )}
            <div style={{ fontFamily: `'Space Grotesk'`, fontWeight: 700, fontSize: vert ? 100 : 104, lineHeight: 1.02, letterSpacing: '-0.03em', color: T.tinta, marginTop: e.grande ? 10 : 30,
              display: 'flex', flexWrap: 'wrap', columnGap: 26, justifyContent: vert ? 'center' : 'flex-start' }}>
              {palabras.map((p, i) => {
                const a = llega(5 + i * 2);
                return <span key={i} style={{ display: 'inline-block', opacity: a, transform: `translateY(${(1 - a) * 30}px)`, color: e.resalta?.includes(p) ? T.acento : T.tinta }}>{p}</span>;
              })}
            </div>
            {e.chips && (
              <div style={{ marginTop: 34, display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: vert ? 'center' : 'flex-start', maxWidth: vert ? 'none' : 900 }}>
                {e.chips.map((c, i) => {
                  const a = llega(10 + i * 2, { stiffness: 380, damping: 18 });
                  return (
                    <span key={i} style={{ fontFamily: `'Space Grotesk'`, fontWeight: 700, fontSize: vert ? 46 : 40, color: i % 3 === 0 ? T.fondo : T.tinta, background: i % 3 === 0 ? T.acento : `${T.fondo2}ee`,
                      border: `1.5px solid ${i % 3 === 0 ? T.acento : T.linea}`, borderRadius: 16, padding: '8px 22px', opacity: a, transform: `translateY(${(1 - a) * 26}px) scale(${0.8 + 0.2 * a})` }}>{c}</span>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};

/** El precio al final: el de lista tachado y el de lanzamiento en grande, con la ruta de compra. */
const PrecioLanzamiento = ({ clase, e }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const T = clase.tema;
  const ent = useEntrada();
  const vert = H > W;
  const tacha = interpolate(frame, [14, 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const golpe = ent(30, { stiffness: 400, damping: 14 });
  const pulso = frame > 60 ? 1 + 0.03 * Math.max(0, Math.sin((frame - 60) / 7)) : 1;
  // La ruta se escribe completa y en una línea: el tamaño se ajusta al ancho disponible.
  const anchoRuta = vert ? 960 : 1500;
  const tamRuta = Math.min(vert ? 44 : 46, anchoRuta / (e.ruta.length * 0.62));
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: vert ? 50 : 100 }}>
      <Kicker T={T} a={ent(0)}>{e.kicker}</Kicker>
      <div style={{ marginTop: vert ? 60 : 36, opacity: ent(4), position: 'relative', display: 'inline-block' }}>
        <span style={{ fontFamily: `'Space Grotesk'`, fontWeight: 700, fontSize: vert ? 120 : 110, letterSpacing: '-0.03em', color: T.tenue }}>{e.antes}</span>
        <span style={{ fontFamily: `'JetBrains Mono'`, fontWeight: 700, fontSize: vert ? 36 : 34, color: T.apagado, marginLeft: 14 }}>{e.moneda}</span>
        <div style={{ position: 'absolute', left: -12, top: '52%', height: vert ? 12 : 11, borderRadius: 6, width: `calc(${tacha * 100}% + ${24 * tacha}px)`, background: T.acento, transform: 'rotate(-6deg)', transformOrigin: 'left center', boxShadow: `0 0 20px ${T.acento}88` }} />
      </div>
      <div style={{ marginTop: vert ? 40 : 18, opacity: ent(26) }}>
        <Mono style={{ fontSize: vert ? 34 : 30, color: T.acento }}>{e.etiqueta}</Mono>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 22, marginTop: vert ? 6 : 0, opacity: golpe, transform: `scale(${(0.7 + 0.3 * golpe) * pulso})` }}>
        <span style={{ fontFamily: `'Space Grotesk'`, fontWeight: 700, fontSize: vert ? 200 : 260, letterSpacing: '-0.045em', color: T.tinta, lineHeight: 1, textShadow: `0 0 ${70 * golpe}px ${T.acento}77` }}>{e.precio}</span>
        <span style={{ fontFamily: `'JetBrains Mono'`, fontWeight: 700, fontSize: vert ? 46 : 60, color: T.acento }}>{e.moneda}</span>
      </div>
      <div style={{ marginTop: vert ? 70 : 40, background: T.acento, color: T.fondo, borderRadius: 999, padding: vert ? '26px 56px' : '22px 56px', fontFamily: `'Inter'`, fontWeight: 800,
        fontSize: vert ? 50 : 44, boxShadow: `0 24px 60px ${T.acento}55`, opacity: ent(44), transform: `translateY(${(1 - ent(44)) * 30}px)` }}>{e.cta}</div>
      <div style={{ marginTop: vert ? 30 : 22, fontFamily: `'JetBrains Mono'`, fontWeight: 600, fontSize: tamRuta, color: T.tinta, whiteSpace: 'nowrap', opacity: ent(50) }}>{e.ruta}</div>
      {e.incluye && <div style={{ marginTop: vert ? 40 : 26, fontFamily: `'Inter'`, fontWeight: 500, fontSize: vert ? 32 : 28, color: T.tenue, maxWidth: vert ? 900 : 'none', lineHeight: 1.4, opacity: ent(56) }}>{e.incluye}</div>}
      <Img src={staticFile(clase.logo)} style={{ height: vert ? 72 : 60, marginTop: vert ? 70 : 40, opacity: ent(60) }} />
    </AbsoluteFill>
  );
};

/** Una escena: la capa de texto o de clip que va encima del planeta. */
const Capa = ({ clase, e, de }) => {
  const T = clase.tema;
  if (e.tipo === 'logo') return <Logo e={e} />;
  if (e.tipo === 'parada') return <Parada clase={clase} e={e} de={de} />;
  if (e.tipo === 'despegue') return <Despegue clase={clase} e={e} />;
  if (e.tipo === 'momento') return (<><Velo T={T} fuerza={0.72} /><Momento clase={clase} e={e} /></>);
  if (e.tipo === 'texto') return (<><Velo T={T} fuerza={0.62} entra={4} /><Texto clase={clase} e={e} /></>);
  if (e.tipo === 'precio') return (<><Velo T={T} fuerza={0.7} entra={14} /><PrecioLanzamiento clase={clase} e={e} /></>);
  throw new Error(`Escena desconocida en venta.viaje: ${e.tipo}`);
};

export const Viaje = ({ clase, musica = 'trailer/musica-viaje.wav' }) => {
  useFuentes();
  const frame = useCurrentFrame();
  const T = clase.tema;
  const escenas = clase.venta.viaje;
  let t = 0;
  let previa = null;
  const tramos = escenas.map((e) => {
    const r = { e, desde: t, dura: Math.round(e.dura * FPS), de: previa };
    t += r.dura;
    previa = e.parada ?? previa;
    return r;
  });
  // La música entra cuando termina el logo (que trae su propio sonido) y baja cuando habla el profesor.
  const inicioMusica = tramos.filter((r) => r.e.tipo === 'logo').reduce((s, r) => s + r.dura, 0);
  const habla = tramos.filter((r) => r.e.tipo === 'momento').map((r) => [r.desde - inicioMusica, r.desde + r.dura - inicioMusica]);
  const volumen = (f) => (habla.some(([a, b]) => f >= a - 4 && f < b + 2) ? 0.18 : 0.7);
  const sal = interpolate(frame, [t - 10, t], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // Barrido solo donde cambia la capa (clip ↔ planeta); entre paradas la transición es el vuelo.
  const conBarrido = tramos.slice(1).filter((r, i) => r.e.tipo !== 'parada' && tramos[i].e.tipo !== 'logo');
  return (
    <AbsoluteFill style={{ background: T.fondo, opacity: sal }}>
      <Globo escenas={escenas} mapa={clase.venta.mapa} />
      {tramos.map(({ e, desde, dura, de }, i) => (
        <Sequence key={i} from={desde} durationInFrames={dura}>
          <Capa clase={clase} e={e} de={de} />
        </Sequence>
      ))}
      {conBarrido.map(({ desde }, i) => (
        <Sequence key={`b${i}`} from={desde - 5} durationInFrames={11}>
          <Barrido T={T} />
        </Sequence>
      ))}
      {musica && (
        <Sequence from={inicioMusica}>
          <Audio src={staticFile(musica)} volume={volumen} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};

