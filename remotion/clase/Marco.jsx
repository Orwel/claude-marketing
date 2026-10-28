import React from 'react';
import { AbsoluteFill, Img, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { icons } from 'lucide-react';
import { useFuentes } from '../fuentes.js';
import { SEG_CAMBIO, SEG_ENTRA, SEG_SALE, itemEn, paradaEn } from './tiempo.js';

/**
 * El marco de una clase grabada: todo lo que va ALREDEDOR de la pantalla compartida y la
 * cámara. La grabación de LiveKit (layout speaker) deja la cámara arriba a la izquierda y la
 * pantalla a la derecha, con franjas negras vacías: ahí vive el material gráfico, así nunca
 * tapa lo que el profesor está mostrando.
 *
 *   banda superior  → la parada (tema) en que va la clase, y el logo
 *   riel izquierdo  → el itinerario de la clase y, debajo, fichas y comentarios del chat
 *
 * Los huecos de cámara y pantalla quedan del color de fondo: ffmpeg pega encima el video.
 * Fuera de las ventanas de animación (tiempo.js) el marco es estático a propósito.
 */
const RES = { stiffness: 260, damping: 26 };

export const Marco = ({ clase, desde, tiempos }) => {
  useFuentes();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // `tiempos`: un segundo del crudo por cuadro. Así armar.js pide en un solo render todos los
  // tramos animados y un cuadro de cada tramo quieto, en vez de lanzar un render por tramo.
  const t = tiempos ? tiempos[Math.min(frame, tiempos.length - 1)] : desde + frame / fps;
  const T = clase.tema;
  const [cx, cy, cw, ch] = clase.marco.camara;
  const [px, py, pw, ph] = clase.marco.pantalla;

  return (
    <AbsoluteFill style={{ background: T.fondo, fontFamily: `'Inter'`, color: T.tinta }}>
      <Estrellas ancho={1920} alto={1080} color={T.tenue} />
      {/* Hueco de la pantalla: un borde fino para que el video no flote. */}
      <div style={{ position: 'absolute', left: px - 1, top: py - 1, width: pw + 2, height: ph + 2, border: `1px solid ${T.linea}`, background: '#000' }} />
      <div style={{ position: 'absolute', left: cx, top: cy, width: cw, height: ch, background: '#000' }} />
      <div style={{ position: 'absolute', left: cx, top: cy + ch, width: cw, height: 3, background: T.acento }} />
      <BandaSuperior clase={clase} t={t} x={px} ancho={pw} alto={py} fps={fps} />
      <Riel clase={clase} t={t} x={cx} y={cy + ch + 3} ancho={cw} alto={1080 - cy - ch - 3} fps={fps} />
      <BandaInferior clase={clase} x={px} y={py + ph} ancho={pw} alto={1080 - py - ph} />
    </AbsoluteFill>
  );
};

/** Puntos de fondo con semilla fija: el cielo del «vuelo», sin moverse. */
const Estrellas = ({ ancho, alto, color }) => (
  <svg width={ancho} height={alto} style={{ position: 'absolute', inset: 0 }}>
    {Array.from({ length: 140 }, (_, i) => (
      <circle key={i} cx={random(`x${i}`) * ancho} cy={random(`y${i}`) * alto} r={random(`r${i}`) * 1.3 + 0.3} fill={color} opacity={0.12 + random(`o${i}`) * 0.25} />
    ))}
  </svg>
);

const Mono = ({ children, style }) => (
  <span style={{ fontFamily: `'JetBrains Mono'`, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', ...style }}>{children}</span>
);

function BandaSuperior({ clase, t, x, ancho, alto, fps }) {
  const T = clase.tema;
  const k = paradaEn(clase, t);
  const p = clase.paradas[k];
  const a = p ? spring({ frame: Math.round((t - p.desde) * fps), fps, config: RES }) : 0;
  const barra = p ? interpolate(t - p.desde, [0, SEG_CAMBIO], [0, 1], { extrapolateRight: 'clamp' }) : 0;
  return (
    <div style={{ position: 'absolute', left: x, top: 0, width: ancho, height: alto, display: 'flex', alignItems: 'center', padding: '0 26px', gap: 22, overflow: 'hidden' }}>
      {p && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, opacity: a, transform: `translateY(${(1 - a) * 26}px)` }}>
          <span style={{ background: T.acento, color: T.fondo, borderRadius: 999, padding: '6px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
            <Mono style={{ fontSize: 17, color: T.fondo }}>{p.etiqueta}</Mono>
          </span>
          <span style={{ fontFamily: `'Space Grotesk'`, fontWeight: 700, fontSize: 30, letterSpacing: '-0.01em' }}>
            {p.titulo}
          </span>
        </div>
      )}
      <div style={{ flex: 1 }} />
      <Img src={staticFile(clase.logo)} style={{ height: 34, opacity: 0.95 }} />
      {/* Hilo naranja bajo la banda: avanza en cada cambio de parada, como la barra de la presentación. */}
      <div style={{ position: 'absolute', left: 0, bottom: 0, height: 3, width: `${barra * 100}%`, background: T.acento, opacity: 0.85 }} />
    </div>
  );
}

function BandaInferior({ clase, x, y, ancho, alto }) {
  // Los subtítulos (ASS, ffmpeg) van en esta franja; aquí solo un degradado que los asiente.
  const T = clase.tema;
  return <div style={{ position: 'absolute', left: x, top: y, width: ancho, height: alto, background: `linear-gradient(180deg, ${T.fondo}00, ${T.fondo2}cc)` }} />;
}

function Riel({ clase, t, x, y, ancho, alto, fps }) {
  const T = clase.tema;
  const k = paradaEn(clase, t);
  const paradas = clase.paradas;
  const FILA = 38;
  const top0 = 96;
  const p = paradas[k];
  // El avión baja de la parada anterior a la nueva durante el cambio.
  const viaje = p ? spring({ frame: Math.round((t - p.desde) * fps), fps, config: { stiffness: 90, damping: 18 } }) : 1;
  const yAvion = top0 + (Math.max(0, k - 1) + (k > 0 ? viaje : 0)) * FILA;
  const item = itemEn(clase, t);
  const Avion = icons.Plane;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: ancho, height: alto, padding: '22px 18px' }}>
      <Mono style={{ fontSize: 12, color: T.tenue, display: 'block' }}>{clase.vuelo?.antetitulo ?? 'Itinerario'}</Mono>
      <div style={{ fontFamily: `'Space Grotesk'`, fontWeight: 700, fontSize: 25, marginTop: 6, lineHeight: 1.1 }}>{clase.vuelo?.titulo ?? clase.titulo}</div>
      {/* línea de ruta */}
      <div style={{ position: 'absolute', left: 37, top: y0(top0), width: 2, height: (paradas.length - 1) * FILA, background: T.linea }} />
      <div style={{ position: 'absolute', left: 37, top: y0(top0), width: 2, height: Math.max(0, yAvion - top0), background: T.acento }} />
      {paradas.map((pa, i) => {
        const pasada = i < k;
        const actual = i === k;
        return (
          <div key={i} style={{ position: 'absolute', left: 18, top: y0(top0 + i * FILA) - 13, display: 'flex', alignItems: 'center', gap: 12, width: ancho - 36 }}>
            <div style={{ width: 40, display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: actual ? 14 : 10, height: actual ? 14 : 10, borderRadius: 99, background: actual ? T.acento : pasada ? T.acento : T.fondo, border: `2px solid ${actual || pasada ? T.acento : T.linea}`, opacity: pasada ? 0.6 : 1 }} />
            </div>
            <Mono style={{ fontSize: 14, width: 44, color: actual ? T.acento : pasada ? T.tenue : T.apagado }}>{pa.codigo}</Mono>
            <span style={{ fontSize: 15, fontWeight: actual ? 700 : 500, color: actual ? T.tinta : pasada ? T.tenue : T.apagado, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{pa.ciudad}</span>
            <Mono style={{ fontSize: 11, color: actual ? T.tinta : T.apagado, letterSpacing: '0.06em' }}>{pa.anio}</Mono>
          </div>
        );
      })}
      {k >= 0 && (
        <div style={{ position: 'absolute', left: 25, top: y0(yAvion) - 13, width: 26, height: 26, borderRadius: 99, background: T.fondo, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Avion size={20} color={T.acento} style={{ transform: 'rotate(135deg)' }} strokeWidth={2.2} />
        </div>
      )}
      {item && <ItemRiel clase={clase} {...item} top={y0(top0 + paradas.length * FILA) + 6} ancho={ancho - 36} fps={fps} />}
    </div>
  );
}

// El riel tiene 22 px de relleno arriba; las filas se cuentan desde ahí.
const y0 = (v) => v + 22;

function ItemRiel({ clase, it, desde, hasta, top, ancho, fps }) {
  const T = clase.tema;
  const ent = spring({ frame: Math.round(desde * fps), fps, config: RES, durationInFrames: Math.round(SEG_ENTRA * fps) });
  const sal = interpolate(hasta, [0, SEG_SALE], [0, 1], { extrapolateRight: 'clamp' });
  const a = Math.min(ent, sal);
  const estilo = { position: 'absolute', left: 18, top, width: ancho, opacity: a, transform: `translateX(${(1 - a) * -30}px)` };
  if (it.tipo === 'comentario') {
    const Cita = icons.MessageCircle;
    return (
      <div style={{ ...estilo, background: T.fondo2, border: `1px solid ${T.linea}`, borderRadius: 14, padding: '16px 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Cita size={16} color={T.cian} />
          <Mono style={{ fontSize: 11, color: T.cian }}>Desde el chat</Mono>
        </div>
        <div style={{ fontSize: 17, lineHeight: 1.38, color: T.tinta }}>«{it.texto}»</div>
        <div style={{ fontSize: 14, marginTop: 10, color: T.tenue, fontWeight: 600 }}>— {it.autor}</div>
      </div>
    );
  }
  const Icono = icons[it.icono] ?? icons.Sparkles;
  // Los renglones del texto aparecen escalonados, como los fragmentos de la presentación.
  const lineas = (it.puntos ?? []).map((txt, i) => {
    const b = spring({ frame: Math.round((desde - 0.35 - i * 0.25) * fps), fps, config: RES });
    return (
      <div key={i} style={{ display: 'flex', gap: 8, fontSize: 15, lineHeight: 1.35, color: T.tenue, opacity: Math.min(b, a), transform: `translateY(${(1 - b) * 8}px)`, marginTop: 7 }}>
        <span style={{ color: T.acento, fontWeight: 700 }}>—</span>
        <span>{txt}</span>
      </div>
    );
  });
  return (
    <div style={{ ...estilo, background: T.fondo2, border: `1px solid ${T.linea}`, borderRadius: 14, padding: 16, boxShadow: `0 18px 40px ${T.fondo}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${T.acento}22`, border: `1px solid ${T.acento}66`, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${0.6 + 0.4 * ent}) rotate(${(1 - ent) * -20}deg)` }}>
          <Icono size={24} color={T.acento} strokeWidth={2} />
        </div>
        <Mono style={{ fontSize: 11, color: T.acento, flex: 1, lineHeight: 1.4 }}>{it.antetitulo}</Mono>
      </div>
      <div style={{ fontFamily: `'Space Grotesk'`, fontWeight: 700, fontSize: 24, lineHeight: 1.12, marginTop: 12, letterSpacing: '-0.01em' }}>{it.titulo}</div>
      {it.texto && <div style={{ fontSize: 15, lineHeight: 1.4, color: T.tenue, marginTop: 8 }}>{it.texto}</div>}
      {lineas}
    </div>
  );
}
