import React from 'react';
import { Easing, interpolate, random, spring } from 'remotion';
import { fuente } from '../fuentes.js';
import { useMarca } from '../marca.js';
import { conAlfa } from '../util.js';

/**
 * Lenguaje de movimiento de contrappto.com y trifuerza.co, llevado a cuadros:
 * Remotion no corre transiciones CSS, asi que cada animacion es una funcion
 * del cuadro. Mismas curvas que los sitios: ease [0.22, 1, 0.36, 1] para
 * entradas y resortes 400/25 para lo que "salta" (burbujas, fichas).
 */
export const suave = Easing.bezier(0.22, 1, 0.36, 1);

/** 0 → 1 entre `desde` y `desde + cuadros`, con la curva de los sitios. */
export const avance = (frame, desde, cuadros = 15) =>
  interpolate(frame, [desde, desde + cuadros], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: suave });

/** Resorte rapido de los mockups de Contrappto (stiffness 400, damping 25). */
export const salto = (frame, desde, fps) => spring({ frame: frame - desde, fps, config: { stiffness: 400, damping: 25 } });

/** Entrada estandar: sube 20 px, se enfoca y aparece. El desenfoque es lo que la hace sentir cara. */
export const entrar = (a, distancia = 20, eje = 'Y') => ({
  opacity: a,
  transform: `translate${eje}(${(1 - a) * distancia}px)`,
  filter: a < 1 ? `blur(${(1 - a) * 8}px)` : undefined,
});

/** Latido suave para orbes y brillos: el [.2, .45, .2] en 2,5 s de las tarjetas de Contrappto. */
export const latido = (frame, fps, min = 0.2, max = 0.45, periodo = 2.5) => min + (max - min) * (0.5 - 0.5 * Math.cos((frame / fps / periodo) * 2 * Math.PI));

/**
 * Tarjeta de vidrio: fondo de la marca al 72 %, desenfoque 24 px con
 * saturacion, borde de medio pixel claro y la barra degradada de las tarjetas
 * de trifuerza.co arriba. Un orbe que late adentro le da profundidad.
 */
export const Vidrio = ({ children, ancho = 940, alto, relleno = 44, barra = true, orbe = true, estilo }) => {
  const marca = useMarca();
  const { colores } = marca;
  return (
    <div
      style={{
        position: 'relative',
        width: ancho,
        height: alto,
        padding: relleno,
        boxSizing: 'border-box',
        borderRadius: 32,
        overflow: 'hidden',
        background: `linear-gradient(160deg, ${conAlfa(colores.fondo2, 0.86)} 0%, ${conAlfa(colores.fondo, 0.78)} 100%)`,
        backdropFilter: 'blur(24px) saturate(150%)',
        border: `1px solid ${conAlfa(colores.tinta, 0.1)}`,
        boxShadow: `0 30px 80px rgba(0,0,0,.45), 0 8px 32px rgba(0,0,0,.18), inset 0 1px 0 ${conAlfa(colores.tinta, 0.08)}`,
        color: colores.tinta,
        ...estilo,
      }}
    >
      {barra ? <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, background: `linear-gradient(90deg, ${colores.secundario ?? colores.acento}, ${colores.fondo2}, ${colores.acento})` }} /> : null}
      {orbe ? <Orbe /> : null}
      <div style={{ position: 'relative', height: '100%' }}>{children}</div>
    </div>
  );
};

const Orbe = () => {
  const { colores } = useMarca();
  return (
    <div
      style={{
        position: 'absolute',
        right: -80,
        top: -80,
        width: 320,
        height: 320,
        borderRadius: '50%',
        background: colores.acento,
        opacity: 0.16,
        filter: 'blur(70px)',
      }}
    />
  );
};

/** Cabecera de ventana con los tres puntos (rosa, ambar, esmeralda al 80 %) y una etiqueta. */
export const Ventana = ({ etiqueta, derecha }) => {
  const marca = useMarca();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 30 }}>
      {['#FB7185', '#FBBF24', '#34D399'].map((c) => (
        <span key={c} style={{ width: 16, height: 16, borderRadius: '50%', background: c, opacity: 0.8 }} />
      ))}
      <span style={{ ...fuente(marca.fuentes.texto), fontSize: 24, color: marca.colores.tenue, marginLeft: 12, letterSpacing: '0.02em' }}>{etiqueta}</span>
      <span style={{ marginLeft: 'auto' }}>{derecha}</span>
    </div>
  );
};

/** Pastilla en mayusculas con punto, como las de estado de Contrappto. `vivo` agrega el aro que late. */
export const Pastilla = ({ texto, color, vivo = false, frame = 0, fps = 30 }) => {
  const marca = useMarca();
  const c = color ?? marca.colores.acento;
  const aro = (frame % (fps * 1.4)) / (fps * 1.4);
  return (
    <span
      style={{
        ...fuente(marca.fuentes.enfasis),
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 20px',
        borderRadius: 999,
        border: `1px solid ${conAlfa(c, 0.35)}`,
        background: conAlfa(c, 0.12),
        color: c,
        fontSize: 22,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      <span style={{ position: 'relative', width: 12, height: 12 }}>
        <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: c }} />
        {vivo ? <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2px solid ${c}`, transform: `scale(${1 + aro * 1.6})`, opacity: 1 - aro }} /> : null}
      </span>
      {texto}
    </span>
  );
};

const GLIFOS = ['λ', '§', '</>', '∑', 'Art. 1°', '0.87', '{ }', '∂', '△', '01', 'π', '→', '≈', '#'];

/**
 * Constelacion del hero de trifuerza.co: nodos con glifos que derivan, enlaces
 * entre vecinos (solidos entre los del mismo tipo, punteados entre tipos) y
 * pulsos de luz que viajan por los enlaces. Semilla fija: mismo dibujo en
 * cada render.
 */
export const Constelacion = ({ frame, fps, ancho, alto, cantidad = 26, semilla = 'ia', aparicion = 1, intensidad = 1, glifos = true }) => {
  const { colores } = useMarca();
  const tipos = [colores.secundario ?? colores.acento, colores.acento, colores.tinta];
  const nodos = Array.from({ length: cantidad }, (_, i) => {
    const r = (k) => random(`${semilla}-${i}-${k}`);
    const t = frame / fps;
    return {
      x: (0.06 + r('x') * 0.88) * ancho + Math.sin(t * (0.3 + r('vx') * 0.5) + r('fx') * 6) * 14,
      y: (0.08 + r('y') * 0.84) * alto + Math.cos(t * (0.25 + r('vy') * 0.5) + r('fy') * 6) * 12,
      tipo: Math.floor(r('t') * 3),
      glifo: GLIFOS[Math.floor(r('g') * GLIFOS.length)],
      radio: 2.6 + r('r') * 3,
      opacidad: (0.35 + r('o') * 0.55) * Math.min(1, Math.max(0, aparicion * 1.6 - r('a') * 0.6)),
      conGlifo: glifos && r('c') > 0.55,
    };
  });
  const limite = Math.min(ancho, alto) * 0.34;
  const enlaces = [];
  nodos.forEach((a, i) =>
    nodos.slice(i + 1).forEach((b, k) => {
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < limite) enlaces.push({ a, b, d, mismo: a.tipo === b.tipo, clave: `${i}-${i + 1 + k}` });
    })
  );
  return (
    <svg width={ancho} height={alto} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
      {enlaces.map(({ a, b, d, mismo, clave }) => {
        const alfa = (1 - d / limite) * (mismo ? 0.65 : 0.38) * Math.min(a.opacidad, b.opacidad) * intensidad;
        // Pulso: un punto blanco viaja por algunos enlaces, con envolvente sin(t·π).
        const fase = (frame / fps) * (0.35 + random(`p-${clave}`) * 0.35) + random(`q-${clave}`);
        const p = fase % 1;
        const conPulso = random(`s-${clave}`) > 0.6;
        return (
          <g key={clave}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={tipos[a.tipo]} strokeOpacity={alfa} strokeWidth={mismo ? 1.6 : 1.2} strokeDasharray={mismo ? undefined : '4 8'} />
            {conPulso ? <circle cx={a.x + (b.x - a.x) * p} cy={a.y + (b.y - a.y) * p} r={3.2} fill="#FFFFFF" opacity={Math.sin(p * Math.PI) * alfa * 1.6} style={{ filter: `drop-shadow(0 0 8px ${tipos[a.tipo]})` }} /> : null}
          </g>
        );
      })}
      {nodos.map((n, i) => (
        <g key={i} opacity={n.opacidad * intensidad}>
          <circle cx={n.x} cy={n.y} r={n.radio} fill={tipos[n.tipo]} style={{ filter: `drop-shadow(0 0 6px ${tipos[n.tipo]})` }} />
          {n.conGlifo ? (
            <text x={n.x + 10} y={n.y - 10} fill={tipos[n.tipo]} fontSize={20} fontFamily="Inter" fontWeight={600} opacity={0.8}>
              {n.glifo}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
};
