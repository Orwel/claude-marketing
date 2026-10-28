import React from 'react';
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { icons } from 'lucide-react';
import { useFuentes } from '../fuentes.js';

/**
 * Tráiler de venta de una clase grabada (clases/<slug>.json → venta). Sale en 16:9 y 9:16 de la
 * misma composición: cada escena lee el ancho y alto y acomoda su diseño.
 *
 * Los clips son cortes de la versión editada (marco, difuminado y subtítulos ya puestos). Aquí se
 * recorta solo la pantalla compartida y aparte la cámara en un círculo: el profesor en la esquina
 * de 320 px no se vería en un celular. La subtitulación quemada queda fuera del recorte y la frase
 * la escribe el tráiler en grande, palabra por palabra.
 *
 * Los comentarios imitan el chat de la sala (tri-app, components/eventos/LiveChat.tsx): la sala ya
 * cerró y no se pueden capturar, así que se recrean con sus colores y su forma, con el texto real.
 */
const RES = { stiffness: 240, damping: 24 };
const FPS = 30;
const CHAT = { fondo: '#111827', borde: '#1f2937', nombre: '#d1d5db', hora: '#6b7280', texto: '#e5e7eb' };

export const Mono = ({ children, style }) => (
  <span style={{ fontFamily: `'JetBrains Mono'`, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', ...style }}>{children}</span>
);

export const cuadrosEscena = (e) => Math.round(e.dura * FPS);
/** `lista`: 'escenas' (tráiler), 'historia' (v2 de venta) o un índice del carrusel ('carrusel.2'). */
export const escenasDe = (clase, lista = 'escenas') => {
  const [k, i] = lista.split('.');
  const todas = clase.venta[k];
  return i === undefined ? todas : [todas[Number(i)]];
};
export const duracionTrailer = (clase, lista) => escenasDe(clase, lista).reduce((s, e) => s + cuadrosEscena(e), 0);

const useEntrada = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (d, config = RES) => spring({ frame: frame - d, fps, config });
};

const Estrellas = ({ T, semilla = 's' }) => {
  const { width: W, height: H } = useVideoConfig();
  const frame = useCurrentFrame();
  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
      {Array.from({ length: 170 }, (_, k) => (
        <circle key={k} cx={((random(`${semilla}x${k}`) * W + frame * (0.2 + random(`${semilla}v${k}`) * 0.6)) % W)} cy={random(`${semilla}y${k}`) * H}
          r={random(`${semilla}r${k}`) * 1.5 + 0.3} fill={T.tenue} opacity={0.12 + random(`${semilla}o${k}`) * 0.3} />
      ))}
    </svg>
  );
};

/** Fondo de todo el tráiler: azul de la presentación, estrellas que derivan y un brillo naranja que respira. */
export const Fondo = ({ T }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const x = W * (0.5 + 0.3 * Math.sin(frame / 90));
  const y = H * (0.45 + 0.2 * Math.cos(frame / 120));
  return (
    <AbsoluteFill style={{ background: T.fondo }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at ${x}px ${y}px, ${T.acento}26 0%, transparent 45%), radial-gradient(circle at ${W - x}px ${H - y}px, ${T.cian}1c 0%, transparent 40%)` }} />
      <Estrellas T={T} />
    </AbsoluteFill>
  );
};

export const Kicker = ({ T, children, a = 1, style }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: `${T.fondo}e6`, border: `1.5px solid ${T.acento}`, borderRadius: 999, padding: '10px 22px',
    opacity: a, transform: `translateY(${(1 - a) * 12}px)`, ...style }}>
    <div style={{ width: 10, height: 10, borderRadius: 5, background: T.acento }} />
    <Mono style={{ fontSize: 20, color: T.tinta }}>{children}</Mono>
  </div>
);

/** Frase que aparece palabra por palabra al ritmo en que el profesor la dice (voz = [ini, fin] en s). */
export const Frase = ({ T, texto, resalta = [], voz, tamano, alinear = 'center' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const palabras = texto.split(' ');
  const [a, b] = voz ?? [0.2, 1.2];
  return (
    <div style={{ fontFamily: `'Space Grotesk'`, fontWeight: 700, fontSize: tamano, lineHeight: 1.08, letterSpacing: '-0.025em', color: T.tinta, textAlign: alinear,
      display: 'flex', flexWrap: 'wrap', justifyContent: alinear === 'center' ? 'center' : 'flex-start', columnGap: tamano * 0.26 }}>
      {palabras.map((p, i) => {
        const en = (a + ((b - a) * i) / palabras.length) * fps - 3;
        const s = spring({ frame: frame - en, fps, config: { stiffness: 320, damping: 22 } });
        const fuerte = resalta.includes(p);
        return (
          <span key={i} style={{ display: 'inline-block', opacity: s, transform: `translateY(${(1 - s) * 22}px) scale(${0.92 + 0.08 * s})`, color: fuerte ? T.acento : T.tinta }}>{p}</span>
        );
      })}
    </div>
  );
};

/** Un clip de la v1: la pantalla compartida en una tarjeta y la cámara del profesor en un círculo. */
export const Momento = ({ clase, e }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H, durationInFrames } = useVideoConfig();
  const T = clase.tema;
  const ent = useEntrada();
  const vert = H > W;
  const [px, py, pw, ph] = clase.marco.pantalla;
  const [cx, cy, cw, chh] = clase.marco.camara;
  // Vertical: la pantalla de borde a borde (en un celular no sobra ni un píxel). Horizontal: la
  // tarjeta a la derecha y el profesor a la izquierda, así el círculo no tapa la frase de abajo.
  const ancho = vert ? W : 1300;
  const alto = (ancho * ph) / pw;
  const izq = vert ? 0 : W - ancho - 110;
  const arriba = vert ? 380 : 70;
  const s = ancho / pw;
  const zoom = interpolate(frame, [0, durationInFrames], [1, 1.07]);
  const a = ent(0);
  const lado = Math.min(cw, chh) - 10;
  const d = vert ? 330 : 300;
  const k = d / lado;
  const fc = ent(8);
  const src = staticFile(e.clip);
  // Con `cuadros` el clip va como JPG cuadro a cuadro y su sonido aparte (Viaje.jsx): con poca RAM libre el
  // compositor de OffthreadVideo perdía cuadros («No frame found at position») y tumbaba el render.
  const Medio = e.cuadros
    ? ({ style }) => <Img src={staticFile(`${e.cuadros}/${String(Math.min(frame + 1, e.n)).padStart(4, '0')}.jpg`)} style={style} />
    : ({ style, muted }) => <OffthreadVideo src={src} muted={muted} style={style} />;
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: izq, top: arriba, width: ancho, height: alto, borderRadius: vert ? 0 : 26, overflow: 'hidden', border: vert ? 'none' : `2px solid ${T.linea}`,
        boxShadow: `0 40px 90px #000a, 0 0 0 1px ${T.acento}22`, opacity: a, transform: `scale(${0.9 + 0.1 * a})` }}>
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${zoom})`, transformOrigin: '60% 40%' }}>
          <Medio style={{ position: 'absolute', width: 1920 * s, height: 1080 * s, left: -px * s, top: -py * s, maxWidth: 'none' }} />
        </div>
      </div>
      <div style={{ position: 'absolute', left: vert ? 50 : 130, top: vert ? arriba + alto - d * 0.55 : arriba + alto - d - 10, width: d, height: d, borderRadius: '50%', overflow: 'hidden',
        border: `5px solid ${T.acento}`, boxShadow: '0 20px 50px #000b', opacity: fc, transform: `scale(${0.6 + 0.4 * fc})`, background: T.fondo2 }}>
        <Medio muted style={{ position: 'absolute', width: 1920 * k, height: 1080 * k, left: -(cx + (cw - lado) / 2) * k, top: -(cy + (chh - lado) / 2) * k, maxWidth: 'none' }} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: vert ? 270 : 40, display: 'flex', justifyContent: vert ? 'center' : 'flex-start', paddingLeft: vert ? 0 : izq + 30 }}>
        <Kicker T={T} a={ent(4)}>{e.kicker}</Kicker>
      </div>
      <div style={{ position: 'absolute', left: vert ? 60 : 120, right: vert ? 60 : 120, top: vert ? arriba + alto + 230 : arriba + alto + 44 }}>
        <Frase T={T} texto={e.cita} resalta={e.resalta} voz={e.voz} tamano={vert ? 96 : 64} />
      </div>
      {e.sonido && <Audio src={staticFile(e.sonido)} />}
      {vert && <Img src={staticFile(clase.logo)} style={{ position: 'absolute', left: (W - 300) / 2, width: 300, bottom: 110, opacity: 0.85 }} />}
    </AbsoluteFill>
  );
};

const Titulo = ({ clase, e }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const T = clase.tema;
  const ent = useEntrada();
  const vert = H > W;
  const ruta = interpolate(frame, [0, 70], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const [x0, y0, x1, y1, qx, qy] = vert ? [80, 1500, 1000, 1300, 540, 1000] : [140, 900, 1780, 720, 960, 460];
  const bez = (t, a, q, b) => (1 - t) ** 2 * a + 2 * (1 - t) * t * q + t ** 2 * b;
  const ax = bez(ruta, x0, qx, x1);
  const ay = bez(ruta, y0, qy, y1);
  const ang = (Math.atan2(2 * (1 - ruta) * (qy - y0) + 2 * ruta * (y1 - qy), 2 * (1 - ruta) * (qx - x0) + 2 * ruta * (x1 - qx)) * 180) / Math.PI;
  const Avion = icons.Plane;
  const camino = `M ${x0} ${y0} Q ${qx} ${qy} ${x1} ${y1}`;
  return (
    <AbsoluteFill style={{ color: T.tinta, fontFamily: `'Inter'` }}>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        <path d={camino} stroke={T.linea} strokeWidth={2} fill="none" strokeDasharray="6 10" />
        <path d={camino} stroke={T.acento} strokeWidth={4} fill="none" pathLength={1} strokeDasharray={`${ruta} 1`} />
      </svg>
      <div style={{ position: 'absolute', left: ax - 26, top: ay - 26, transform: `rotate(${ang + 45}deg)` }}>
        <Avion size={52} color={T.acento} fill={T.acento} />
      </div>
      <div style={{ position: 'absolute', left: vert ? 70 : 150, right: vert ? 70 : 150, top: vert ? 470 : 200, textAlign: vert ? 'center' : 'left' }}>
        <div style={{ opacity: ent(2), transform: `translateY(${(1 - ent(2)) * 14}px)` }}>
          <Mono style={{ fontSize: vert ? 26 : 24, color: T.acento }}>{e.antetitulo}</Mono>
        </div>
        <div style={{ fontFamily: `'Space Grotesk'`, fontWeight: 700, fontSize: vert ? 150 : 170, lineHeight: 0.95, letterSpacing: '-0.035em', marginTop: 28,
          opacity: ent(5), transform: `translateY(${(1 - ent(5)) * 30}px) scale(${0.94 + 0.06 * ent(5)})`, transformOrigin: vert ? 'center' : 'left' }}>
          {e.titulo}
        </div>
        <div style={{ fontSize: vert ? 44 : 40, color: T.tenue, marginTop: 30, maxWidth: vert ? 'none' : 1200, lineHeight: 1.3, opacity: ent(11), transform: `translateY(${(1 - ent(11)) * 14}px)` }}>
          {e.bajada}
        </div>
        <div style={{ marginTop: 40, display: 'flex', gap: 16, justifyContent: vert ? 'center' : 'flex-start', flexWrap: 'wrap' }}>
          {e.chips.map((c, i) => (
            <span key={i} style={{ border: `1.5px solid ${i === 0 ? T.acento : T.linea}`, background: i === 0 ? `${T.acento}22` : T.fondo2, borderRadius: 999, padding: '12px 24px', opacity: ent(16 + i * 4) }}>
              <Mono style={{ fontSize: vert ? 24 : 20, color: T.tinta, letterSpacing: '0.1em' }}>{c}</Mono>
            </span>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Conceptos = ({ clase, e }) => {
  const { width: W, height: H } = useVideoConfig();
  const T = clase.tema;
  const ent = useEntrada();
  const vert = H > W;
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: vert ? 60 : 160, gap: 50 }}>
      <Kicker T={T} a={ent(0)}>{e.kicker}</Kicker>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: vert ? 20 : 22, maxWidth: vert ? 960 : 1600 }}>
        {e.palabras.map((p, i) => {
          const a = ent(3 + i * 3, { stiffness: 380, damping: 20 });
          const fuerte = i % 4 === 0;
          return (
            <span key={i} style={{ fontFamily: `'Space Grotesk'`, fontWeight: 700, fontSize: vert ? 76 : 60, letterSpacing: '-0.02em', color: fuerte ? T.fondo : T.tinta,
              background: fuerte ? T.acento : T.fondo2, border: `1.5px solid ${fuerte ? T.acento : T.linea}`, borderRadius: 18, padding: '12px 28px',
              opacity: a, transform: `translateY(${(1 - a) * 40}px) scale(${0.7 + 0.3 * a}) rotate(${(1 - a) * (random(`r${i}`) - 0.5) * 20}deg)` }}>
              {p}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** Un mensaje del chat de la sala, con el estilo de LiveChat.tsx a escala de video. */
export const Burbuja = ({ c, tam = 30, ancho, style }) => (
  <div style={{ width: ancho, boxSizing: 'border-box', background: CHAT.fondo, border: `${Math.max(1.5, tam / 20)}px solid ${CHAT.borde}`, borderRadius: tam * 0.6,
    padding: `${tam * 0.7}px ${tam * 0.9}px`, fontFamily: `'Inter'`, ...style }}>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: tam * 0.4 }}>
      <span style={{ fontWeight: 600, fontSize: tam, color: CHAT.nombre }}>{c.autor}</span>
      <span style={{ marginLeft: 'auto', fontSize: tam * 0.7, color: CHAT.hora, whiteSpace: 'nowrap' }}>{c.hora}</span>
    </div>
    <div style={{ marginTop: tam * 0.25, fontSize: tam, lineHeight: 1.4, color: CHAT.texto }}>{c.texto}</div>
  </div>
);

const Comentarios = ({ clase, e }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const T = clase.tema;
  const ent = useEntrada();
  const vert = H > W;
  // En 4:5 (carrusel) caben tres mensajes; en 9:16 y 16:9, todos.
  const compacto = vert && H / W < 1.5;
  const lista = e.ids.slice(0, compacto ? 3 : undefined).map((id) => clase.venta.comentarios.find((c) => c.id === id));
  return (
    <AbsoluteFill style={{ alignItems: 'center', paddingTop: compacto ? 110 : vert ? 300 : 70 }}>
      <Kicker T={T} a={ent(0)}>{e.kicker}</Kicker>
      <div style={{ fontFamily: `'Space Grotesk'`, fontWeight: 700, fontSize: vert ? 96 : 80, letterSpacing: '-0.03em', color: T.tinta, marginTop: 28, textAlign: 'center',
        lineHeight: 1, maxWidth: vert ? 900 : 'none', opacity: ent(4), transform: `translateY(${(1 - ent(4)) * 20}px)` }}>
        {e.titulo}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: vert ? 34 : 22, marginTop: vert ? 80 : 46, width: vert ? 940 : 1180 }}>
        {lista.map((c, i) => {
          const a = ent(14 + i * 14, { stiffness: 300, damping: 20 });
          const lado = i % 2 === 0 ? -1 : 1;
          const flota = Math.sin((frame + i * 20) / 30) * 4;
          return (
            <div key={c.id} style={{ alignSelf: lado < 0 ? 'flex-start' : 'flex-end', opacity: a, transform: `translate(${(1 - a) * lado * 80}px, ${flota}px) scale(${0.85 + 0.15 * a})` }}>
              <Burbuja c={c} tam={vert ? 38 : 32} ancho={vert ? 860 : 1000} style={{ boxShadow: `0 24px 60px #000c, 0 0 0 1px ${i === 0 ? T.acento : 'transparent'}` }} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const Incluye = ({ clase, e }) => {
  const { width: W, height: H } = useVideoConfig();
  const T = clase.tema;
  const ent = useEntrada();
  const vert = H > W;
  return (
    <AbsoluteFill style={{ flexDirection: vert ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', gap: vert ? 80 : 130, padding: vert ? 70 : 150 }}>
      <div style={{ textAlign: vert ? 'center' : 'left' }}>
        <Kicker T={T} a={ent(0)}>{e.kicker}</Kicker>
        <div style={{ fontFamily: `'Space Grotesk'`, fontWeight: 700, fontSize: vert ? 190 : 200, letterSpacing: '-0.04em', color: T.tinta, lineHeight: 0.95, marginTop: 30,
          opacity: ent(4), transform: `scale(${0.9 + 0.1 * ent(4)})`, transformOrigin: vert ? 'center' : 'left' }}>
          {e.titulo}
        </div>
        <div style={{ fontFamily: `'Space Grotesk'`, fontWeight: 700, fontSize: vert ? 96 : 92, color: T.acento, letterSpacing: '-0.02em', marginTop: 6, opacity: ent(9) }}>{e.subtitulo}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: vert ? 26 : 22 }}>
        {e.items.map((it, i) => {
          const Icono = icons[it.icono];
          const a = ent(12 + i * 6);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 26, opacity: a, transform: `translateX(${(1 - a) * 60}px)` }}>
              <div style={{ width: vert ? 96 : 84, height: vert ? 96 : 84, borderRadius: 22, background: `${T.acento}1f`, border: `1.5px solid ${T.acento}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icono size={vert ? 50 : 44} color={T.acento} strokeWidth={2} />
              </div>
              <span style={{ fontFamily: `'Inter'`, fontWeight: 600, fontSize: vert ? 50 : 46, color: T.tinta }}>{it.texto}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Precio = ({ clase, e }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const T = clase.tema;
  const ent = useEntrada();
  const vert = H > W;
  // El precio cuenta hasta su valor: el número es el remate del tráiler.
  const meta = Number(e.precio.replace(/\D/g, ''));
  const cuenta = Math.round(interpolate(frame, [6, 26], [0, meta], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) / 1000) * 1000;
  const texto = `$${cuenta.toLocaleString('es-CO')}`;
  const pulso = 1 + 0.035 * Math.max(0, Math.sin((frame - 40) / 7)) * (frame > 40 ? 1 : 0);
  const golpe = ent(26, { stiffness: 400, damping: 14 });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <Kicker T={T} a={ent(0)}>{e.kicker}</Kicker>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 24, marginTop: 30, transform: `scale(${0.85 + 0.15 * ent(4)})` }}>
        <span style={{ fontFamily: `'Space Grotesk'`, fontWeight: 700, fontSize: vert ? 210 : 250, letterSpacing: '-0.045em', color: T.tinta, lineHeight: 1,
          textShadow: `0 0 ${60 * golpe}px ${T.acento}88` }}>{texto}</span>
        <span style={{ fontFamily: `'JetBrains Mono'`, fontWeight: 700, fontSize: vert ? 54 : 60, color: T.acento }}>{e.moneda}</span>
      </div>
      <div style={{ marginTop: vert ? 70 : 50, background: T.acento, color: T.fondo, borderRadius: 999, padding: vert ? '30px 50px' : '26px 56px', fontFamily: `'Inter'`, fontWeight: 800,
        fontSize: vert ? 48 : 46, maxWidth: vert ? 900 : 'none', lineHeight: 1.2, boxShadow: `0 24px 60px ${T.acento}55`, opacity: ent(30), transform: `translateY(${(1 - ent(30)) * 30}px) scale(${pulso})` }}>
        {e.cta}
      </div>
      {e.cta2 && <div style={{ marginTop: 26, fontFamily: `'Inter'`, fontWeight: 600, fontSize: vert ? 34 : 30, color: T.tenue, opacity: ent(36) }}>{e.cta2}</div>}
      <Img src={staticFile(clase.logo)} style={{ height: vert ? 76 : 66, marginTop: vert ? 90 : 60, opacity: ent(40) }} />
    </AbsoluteFill>
  );
};

/** Una afirmación en grande, línea por línea: ganchos y giros de la historia. */
export const Texto = ({ clase, e }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const T = clase.tema;
  const ent = useEntrada();
  const vert = H > W;
  const tam = vert ? (H / W < 1.5 ? 92 : 86) : 112;
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: vert ? 70 : 140, textAlign: 'center' }}>
      {e.kicker && <Kicker T={T} a={ent(0)} style={{ marginBottom: 44 }}>{e.kicker}</Kicker>}
      {e.lineas.map((l, i) => {
        const a = ent(4 + i * 9, { stiffness: 300, damping: 22 });
        return (
          <div key={i} style={{ fontFamily: `'Space Grotesk'`, fontWeight: 700, fontSize: tam, lineHeight: 1.06, letterSpacing: '-0.035em', color: T.tinta,
            opacity: a, transform: `translateY(${(1 - a) * 40}px)`, filter: `blur(${(1 - a) * 8}px)` }}>
            {l.split(' ').map((p, j) => (
              <span key={j} style={{ color: e.resalta?.includes(p) ? T.acento : T.tinta }}>{p}{' '}</span>
            ))}
          </div>
        );
      })}
      {e.desliza && (
        <div style={{ position: 'absolute', bottom: vert ? 110 : 70, opacity: ent(30) * (0.6 + 0.4 * Math.sin(frame / 6)) }}>
          <Mono style={{ fontSize: 26, color: T.tenue }}>Desliza →</Mono>
        </div>
      )}
    </AbsoluteFill>
  );
};

/** La clase con su precio desde el principio: quien sigue viendo ya sabe cuánto cuesta. */
const Presenta = ({ clase, e }) => {
  const { width: W, height: H } = useVideoConfig();
  const T = clase.tema;
  const ent = useEntrada();
  const vert = H > W;
  const d = vert ? 220 : 200;
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: vert ? 60 : 120 }}>
      <div style={{ opacity: ent(0) }}><Mono style={{ fontSize: vert ? 26 : 24, color: T.acento }}>{e.antetitulo}</Mono></div>
      <div style={{ fontFamily: `'Space Grotesk'`, fontWeight: 700, fontSize: vert ? 140 : 160, lineHeight: 0.95, letterSpacing: '-0.035em', color: T.tinta, marginTop: 26,
        opacity: ent(3), transform: `scale(${0.92 + 0.08 * ent(3)})` }}>{e.titulo}</div>
      <div style={{ display: 'flex', gap: 18, marginTop: 40, flexWrap: 'wrap', justifyContent: 'center' }}>
        <span style={{ background: T.acento, color: T.fondo, borderRadius: 999, padding: '16px 34px', fontFamily: `'Space Grotesk'`, fontWeight: 700, fontSize: vert ? 54 : 50,
          opacity: ent(10), transform: `scale(${0.7 + 0.3 * ent(10, { stiffness: 380, damping: 14 })})`, boxShadow: `0 20px 50px ${T.acento}55` }}>{e.precio}</span>
        <span style={{ border: `1.5px solid ${T.linea}`, background: T.fondo2, borderRadius: 999, padding: '16px 34px', fontFamily: `'Space Grotesk'`, fontWeight: 700, fontSize: vert ? 54 : 50,
          color: T.tinta, opacity: ent(14) }}>{e.duracion}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 26, marginTop: vert ? 70 : 50, opacity: ent(20), transform: `translateY(${(1 - ent(20)) * 20}px)`,
        flexDirection: vert ? 'column' : 'row' }}>
        <Img src={staticFile('trailer/cara.png')} style={{ width: d, height: d, borderRadius: '50%', border: `5px solid ${T.acento}` }} />
        <div style={{ textAlign: vert ? 'center' : 'left', maxWidth: vert ? 900 : 760 }}>
          <div style={{ fontFamily: `'Space Grotesk'`, fontWeight: 700, fontSize: vert ? 52 : 46, color: T.tinta }}>{e.nombre}</div>
          <div style={{ fontFamily: `'Inter'`, fontSize: vert ? 32 : 28, color: T.tenue, marginTop: 8, lineHeight: 1.35 }}>{e.perfil}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ESCENAS = { momento: Momento, titulo: Titulo, conceptos: Conceptos, comentarios: Comentarios, incluye: Incluye, precio: Precio, texto: Texto, presenta: Presenta };

/** Barrido naranja que tapa cada corte: da ritmo y esconde el salto entre clips. */
export const Barrido = ({ T }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const x = interpolate(frame, [0, 10], [-1.3, 1.3]);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -H, height: H * 3, width: W * 0.35, left: W * (0.5 + x * 0.6) - W * 0.175, background: `linear-gradient(90deg, transparent, ${T.acento}cc, ${T.acento}, ${T.acento}cc, transparent)`, transform: 'rotate(14deg)' }} />
    </AbsoluteFill>
  );
};

export const Trailer = ({ clase, lista = 'escenas', musica = 'trailer/musica.wav' }) => {
  useFuentes();
  const frame = useCurrentFrame();
  const T = clase.tema;
  const escenas = escenasDe(clase, lista);
  let t = 0;
  const tramos = escenas.map((e) => {
    const r = { e, desde: t, dura: cuadrosEscena(e) };
    t += r.dura;
    return r;
  });
  // La música baja cuando habla el profesor y sube en las escenas de texto.
  const habla = tramos.filter((r) => r.e.tipo === 'momento').map((r) => [r.desde, r.desde + r.dura]);
  const volumen = (f) => {
    const cerca = habla.some(([a, b]) => f >= a - 4 && f < b + 2);
    return cerca ? 0.2 : 0.75;
  };
  const sal = interpolate(frame, [t - 8, t], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: T.fondo, opacity: sal }}>
      <Fondo T={T} />
      {tramos.map(({ e, desde, dura }, i) => {
        const Escena = ESCENAS[e.tipo];
        return (
          <Sequence key={i} from={desde} durationInFrames={dura}>
            <Escena clase={clase} e={e} />
          </Sequence>
        );
      })}
      {tramos.slice(1).map(({ desde }, i) => (
        <Sequence key={`b${i}`} from={desde - 5} durationInFrames={11}>
          <Barrido T={T} />
        </Sequence>
      ))}
      {musica && <Audio src={staticFile(musica)} volume={volumen} />}
    </AbsoluteFill>
  );
};

/** Un comentario suelto sobre fondo transparente, para la página de venta (se recorta después). */
export const ComentarioSuelto = ({ clase, id }) => {
  useFuentes();
  const c = clase.venta.comentarios.find((x) => x.id === id);
  return (
    <AbsoluteFill style={{ background: 'transparent', padding: 0 }}>
      <Burbuja c={c} tam={28} ancho={800} />
    </AbsoluteFill>
  );
};

/** Los mejores comentarios juntos en 1600x900, con el fondo de la clase. */
export const ComentariosCompuesto = ({ clase }) => {
  useFuentes();
  const T = clase.tema;
  const lista = clase.venta.compuesto.map((id) => clase.venta.comentarios.find((c) => c.id === id));
  return (
    <AbsoluteFill style={{ background: T.fondo, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 20% 15%, ${T.acento}22 0%, transparent 45%), radial-gradient(circle at 85% 90%, ${T.cian}18 0%, transparent 40%)` }} />
      <Estrellas T={T} semilla="cc" />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Kicker T={T}>Chat de la clase en vivo · 27 oct 2026</Kicker>
        <div style={{ fontFamily: `'Space Grotesk'`, fontWeight: 700, fontSize: 64, letterSpacing: '-0.03em', color: T.tinta, marginTop: 22 }}>Lo que dijeron los asistentes</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, marginTop: 44, width: 1100 }}>
          {lista.map((c, i) => (
            <div key={c.id} style={{ alignSelf: i % 2 === 0 ? 'flex-start' : 'flex-end' }}>
              <Burbuja c={c} tam={28} ancho={900} style={{ boxShadow: `0 20px 50px #000b, 0 0 0 1px ${i === 0 ? T.acento : 'transparent'}` }} />
            </div>
          ))}
        </div>
        <Img src={staticFile(clase.logo)} style={{ height: 40, marginTop: 44, opacity: 0.9 }} />
      </div>
    </AbsoluteFill>
  );
};
