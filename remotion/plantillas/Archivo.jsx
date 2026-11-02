import React from 'react';
import { AbsoluteFill, Audio, Img, interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Firma } from '../componentes/Firma.jsx';
import { fuente, useFuentes } from '../fuentes.js';
import { entra } from '../kit/movimiento.js';
import { ContextoMarca } from '../marca.js';
import { conAlfa, partirPalabras, tramosDe } from '../util.js';

/**
 * Plantilla Archivo: una historia narrada con material de archivo de dominio publico (grabados,
 * manuscritos, fotos de epoca) en sepia, como el pin #2 de referencias/pinterest-2026-11.md:
 * acercamientos lentos a detalles, rafagas de cortes, destellos de luz entre planos, una pausa
 * larga con un arbol de luz que crece y cierre en bucle.
 *
 * Distribucion fija para que el texto nunca pise la imagen: franja de papel arriba (texto),
 * ventana de imagen en el medio y franja de papel abajo (credito del grabado y firma al final).
 *
 * - `imagenes`: { id: { archivo, ancho, alto, credito } }.
 * - `escenas[]` = planos: { segundos, img, zoom: [de, a], foco: [x, y] (fraccion de la imagen),
 *   destello, negro, cierre: [de, a] (puertas que se cierran, s locales), arbol: { desde, x, y } }.
 * - `frases[]`: { desde, hasta, texto } en segundos del audio (`pieza.audio`, ya mezclado).
 */
export const Archivo = ({ pieza, marca }) => (
  <ContextoMarca.Provider value={marca}>
    <Lienzo pieza={pieza} marca={marca} />
  </ContextoMarca.Provider>
);

const PALETA = { papel: '#E6DCC6', papelOscuro: '#C9BB9A', tinta: '#15120E' };

const Lienzo = ({ pieza, marca }) => {
  useFuentes();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const p = { ...PALETA, ...(pieza.paleta ?? {}), acento: marca.colores.acento };
  const v = { x: 0, y: pieza.ventana?.y ?? 600, w: width, h: pieza.ventana?.h ?? 960 };
  const tramos = tramosDe(pieza, fps);
  const t = tramos.find((x) => frame >= x.inicio && frame < x.fin) ?? tramos.at(-1);
  const e = t.escena;
  const local = frame - t.inicio;
  const dur = t.fin - t.inicio;
  const img = pieza.imagenes[e.img];
  const oscuro = !!e.negro || !!e.oscuro;
  const conAcento = frame / fps >= (pieza.acentoDesde ?? Infinity);
  const fondo = oscuro ? p.tinta : p.papel;
  return (
    <AbsoluteFill style={{ background: fondo, overflow: 'hidden' }}>
      {pieza.audio ? <Audio src={staticFile(pieza.audio)} /> : null}
      {!oscuro ? <Fibras p={p} ancho={width} alto={height} /> : null}

      {/* Ventana de imagen */}
      <div style={{ position: 'absolute', left: v.x, top: v.y, width: v.w, height: v.h, overflow: 'hidden', background: p.tinta }}>
        {img && !e.negro ? <Plano img={img} e={e} local={local} dur={dur} v={v} p={p} /> : null}
        {e.arbol ? <Arbol a={e.arbol} local={local} fps={fps} v={v} /> : null}
        {e.cierre ? <Cierre c={e.cierre} local={local} fps={fps} v={v} p={p} /> : null}
        {/* Vineta y textura de papel encima de la imagen: la amarra al mismo mundo */}
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 50%, transparent 50%, ${conAlfa('#000000', 0.55)} 100%)` }} />
        <Fibras p={p} ancho={v.w} alto={v.h} claro />
        {e.destello ? <Destello local={local} fps={fps} v={v} semilla={t.inicio} /> : null}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: v.y - 3, height: 3, background: oscuro ? conAlfa(p.papel, 0.25) : p.tinta }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: v.y + v.h, height: 3, background: oscuro ? conAlfa(p.papel, 0.25) : p.tinta }} />

      {/* Franja de abajo: credito del material (honesto y de archivo) y firma al final */}
      {img?.credito && !e.negro ? (
        <div style={{ position: 'absolute', left: 90, right: 90, top: v.y + v.h + 22, ...fuente({ familia: 'Fraunces', peso: 400 }), fontStyle: 'italic', fontSize: 26, color: oscuro ? conAlfa(p.papel, 0.6) : conAlfa(p.tinta, 0.6) }}>{img.credito}</div>
      ) : null}
      {e.firma ? (
        <div style={{ position: 'absolute', left: 0, right: 0, top: v.y + v.h + 70, display: 'flex', justifyContent: 'center', opacity: entra(local, 10, fps) }}>
          <Firma tamano={0.75} />
        </div>
      ) : null}

      {(pieza.frases ?? []).map((x, i) => (
        <Frase key={i} x={x} frame={frame} fps={fps} p={p} ancho={width} oscuro={oscuro} conAcento={conAcento} alto={v.y} />
      ))}
    </AbsoluteFill>
  );
};

/** Un plano: la imagen cubre la ventana y se acerca despacio hacia `foco` (Ken Burns), en sepia. */
const Plano = ({ img, e, local, dur, v, p }) => {
  const [z0, z1] = e.zoom ?? [1, 1.12];
  const [fx, fy] = e.foco ?? [0.5, 0.5];
  const avance = local / Math.max(1, dur);
  const z = z0 + (z1 - z0) * (1 - Math.pow(1 - avance, 2));
  const s = Math.max(v.w / img.ancho, v.h / img.alto) * z;
  const w = img.ancho * s;
  const h = img.alto * s;
  // El foco va al centro de la ventana, sin dejar bordes vacios.
  const x = Math.min(0, Math.max(v.w - w, v.w / 2 - fx * w));
  const y = Math.min(0, Math.max(v.h - h, v.h / 2 - fy * h));
  const filtro = e.filtro ?? 'grayscale(1) sepia(0.32) contrast(1.18) brightness(0.9)';
  // `contener`: la imagen no cubre la ventana sino que queda mas pequena y abajo, fundida al negro
  // con una mascara, para dejar aire arriba (el arbol de luz necesita espacio para crecer).
  if (e.contener) {
    const cw = v.w * e.contener.ancho * z;
    const ch = cw * (img.alto / img.ancho);
    const mascara = 'radial-gradient(ellipse 40% 48% at 50% 40%, #000 45%, transparent 92%)';
    return <Img src={staticFile(img.archivo)} style={{ position: 'absolute', left: (v.w - cw) / 2, top: v.h * e.contener.y - (z - z0) * 40, width: cw, height: ch, filter: filtro, WebkitMaskImage: mascara, maskImage: mascara }} />;
  }
  return <Img src={staticFile(img.archivo)} style={{ position: 'absolute', left: x, top: y, width: w, height: h, filter: filtro, opacity: e.tenue ?? 1 }} />;
};

/** Destello entre planos: una franja de luz blanca que cruza en diagonal (los del video de referencia). */
const Destello = ({ local, fps, v, semilla }) => {
  const k = interpolate(local, [0, 0.35 * fps], [0, 1], { extrapolateRight: 'clamp' });
  if (k >= 1) return null;
  const ang = 20 + random(`d${semilla}`) * 40;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: '#FFFFFF', opacity: 0.55 * (1 - k) }} />
      <div style={{ position: 'absolute', left: -400 + k * (v.w + 800), top: -300, width: 140, height: v.h + 600, transform: `rotate(${ang}deg)`, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.9), transparent)' }} />
    </div>
  );
};

/** Puertas que se cierran sobre la imagen: dos hojas negras desde los lados. */
const Cierre = ({ c, local, fps, v, p }) => {
  const k = interpolate(local, [c[0] * fps, c[1] * fps], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const hoja = (v.w / 2) * Math.pow(k, 1.6);
  return (
    <>
      <div style={{ position: 'absolute', left: 0, top: 0, width: hoja, height: v.h, background: p.tinta }} />
      <div style={{ position: 'absolute', right: 0, top: 0, width: hoja, height: v.h, background: p.tinta }} />
    </>
  );
};

/**
 * Arbol de luz que sale de la cabeza (el momento largo del video de referencia): ramas
 * deterministas que se dibujan hacia arriba, en blanco con un halo de trazo ancho.
 */
const Arbol = ({ a, local, fps, v }) => {
  const ramas = [];
  const crecer = (x, y, ang, largo, nivel, semilla, inicio) => {
    if (nivel > 5 || largo < 12) return;
    const x2 = x + Math.cos(ang) * largo;
    const y2 = y + Math.sin(ang) * largo;
    const cx = (x + x2) / 2 + (random(`c${semilla}`) - 0.5) * largo * 0.4;
    const cy = (y + y2) / 2 + (random(`d${semilla}`) - 0.5) * largo * 0.2;
    ramas.push({ d: `M ${x} ${y} Q ${cx} ${cy} ${x2} ${y2}`, inicio, ancho: Math.max(1.2, 5 - nivel * 0.7) });
    const hijos = nivel < 2 ? 3 : 2;
    for (let i = 0; i < hijos; i++) {
      const giro = (i - (hijos - 1) / 2) * (0.3 + random(`g${semilla}${i}`) * 0.45) + (random(`h${semilla}${i}`) - 0.5) * 0.25;
      crecer(x2, y2, ang + giro, largo * (0.68 + random(`l${semilla}${i}`) * 0.15), nivel + 1, `${semilla}${i}`, inicio + 0.35);
    }
  };
  const ox = (a.x ?? 0.5) * v.w;
  const oy = (a.y ?? 0.45) * v.h;
  [-0.45, -0.15, 0.15, 0.45].forEach((da, i) => crecer(ox + da * 30, oy, -Math.PI / 2 + da * 0.9, (a.largo ?? 150) + random(`r${i}`) * 50, 0, `r${i}`, a.desde ?? 0.5));
  const brillo = interpolate(local, [(a.desde ?? 0.5) * fps, ((a.desde ?? 0.5) + 1) * fps], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <svg width={v.w} height={v.h} style={{ position: 'absolute', inset: 0 }}>
      <circle cx={ox} cy={oy} r={26} fill="#FFFFFF" opacity={0.5 * brillo} />
      {ramas.map((r, i) => {
        const k = interpolate(local, [r.inicio * fps, (r.inicio + 0.9) * fps], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        if (k <= 0) return null;
        return (
          <g key={i}>
            <path d={r.d} pathLength={1} stroke="#FFFFFF" strokeOpacity={0.18} strokeWidth={r.ancho * 4} fill="none" strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1 - k} />
            <path d={r.d} pathLength={1} stroke="#FFFFFF" strokeWidth={r.ancho} fill="none" strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1 - k} />
          </g>
        );
      })}
    </svg>
  );
};

/** Fibras de papel deterministas (sin filtros de grano: no hay GPU). */
const Fibras = ({ p, ancho, alto, claro }) => (
  <svg width={ancho} height={alto} style={{ position: 'absolute', inset: 0 }}>
    {Array.from({ length: claro ? 120 : 200 }, (_, i) => {
      const x = random(`fx${i}${claro}`) * ancho;
      const y = random(`fy${i}${claro}`) * alto;
      const l = 6 + random(`fl${i}`) * 34;
      const a = random(`fa${i}`) * Math.PI;
      return <line key={i} x1={x} y1={y} x2={x + Math.cos(a) * l} y2={y + Math.sin(a) * l} stroke={claro ? '#F3EAD6' : p.tinta} strokeOpacity={claro ? 0.1 : 0.07} strokeWidth={1} />;
    })}
  </svg>
);

/**
 * Frase de la voz en la franja de arriba (nunca sobre la imagen): palabra a palabra, centrada en
 * la franja. La puntuacion que `partirPalabras` separa del enfasis se pega a la palabra anterior.
 */
const Frase = ({ x, frame, fps, p, ancho, oscuro, conAcento, alto }) => {
  const desde = x.desde * fps;
  const hasta = x.hasta * fps;
  if (frame < desde - 1 || frame > hasta + 8) return null;
  const palabras = partirPalabras(x.texto).reduce((acc, w) => {
    if (/^[.,:;?!…]+$/.test(w.texto) && acc.length) acc[acc.length - 1] = { ...acc[acc.length - 1], cola: (acc[acc.length - 1].cola ?? '') + w.texto };
    else acc.push(w);
    return acc;
  }, []);
  const sale = interpolate(frame, [hasta + 1, hasta + 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const tam = x.tamano ?? (palabras.length <= 4 ? 96 : palabras.length <= 8 ? 80 : 68);
  const color = oscuro ? p.papel : p.tinta;
  // Franja de texto: de 230 (debajo de lo que tapa Instagram) hasta la ventana de imagen.
  return (
    <div style={{ position: 'absolute', left: 80, width: ancho - 160, top: 230, height: alto - 230 - 30, display: 'flex', alignItems: 'center', opacity: 1 - sale }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: tam * 0.26 }}>
        {palabras.map((w, k) => {
          const n = (hasta - desde) / Math.max(1, palabras.length);
          const a = entra(frame, desde + k * Math.min(5, n * 0.6), fps, { stiffness: 220, damping: 22 });
          const acento = w.enfasis && conAcento;
          return (
            <span key={k} style={{ ...fuente({ familia: 'Fraunces', peso: w.enfasis ? 700 : 500 }), fontSize: tam, lineHeight: 1.08, letterSpacing: '-0.015em', color: acento ? p.acento : color, opacity: Math.min(1, a * 1.5), transform: `translateY(${(1 - a) * 16}px)`, display: 'inline-block', fontStyle: w.enfasis ? 'italic' : 'normal' }}>
              {w.texto}
              {w.cola ?? ''}
            </span>
          );
        })}
      </div>
    </div>
  );
};
