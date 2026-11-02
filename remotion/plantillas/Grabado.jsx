import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Audio, Img, Sequence, cancelRender, continueRender, delayRender, interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Firma } from '../componentes/Firma.jsx';
import { fuente, useFuentes } from '../fuentes.js';
import { entra } from '../kit/movimiento.js';
import { ContextoMarca } from '../marca.js';
import { conAlfa, partirPalabras, tramosDe } from '../util.js';
import { Escalera3D } from '../tinta/Escalera3D.jsx';

/**
 * Plantilla Grabado: una historia narrada como el pin #2 de referencias/pinterest-2026-11.md,
 * todo dibujado y en movimiento: ilustracion a plumilla que se traza sola (con «line boil», el
 * temblor de 3 en 3 cuadros que hace que lo vectorial se vea dibujado a mano), papel gris moteado,
 * destellos de luz blanca, una rafaga de cortes, una escalera infinita en 3D (three.js), una pausa
 * larga con un arbol de luz que nace de la cabeza y cierre en bucle.
 *
 * - `escenas[]`: { tipo, segundos, ...tiempos locales }; tipos en ESCENAS.
 * - `frases[]`: { desde, hasta, texto } en segundos del audio (`pieza.audio`, ya mezclado).
 *   Zona de texto arriba; cada escena deja ese aire libre para que el texto no tape el dibujo.
 * - `destellos[]`: segundos donde cruza la luz blanca (cortes y golpes).
 * - `trazos`: { id: 'kafka/trazos-x.json' } retratos vectorizados con src/archivo/trazos.py.
 */
export const Grabado = ({ pieza, marca }) => (
  <ContextoMarca.Provider value={marca}>
    <Lienzo pieza={pieza} marca={marca} />
  </ContextoMarca.Provider>
);

const PALETA = { papel: '#D3C7AC', papelOscuro: '#9C8E72', tinta: '#14110D', noche: '#1B1814' };

const Lienzo = ({ pieza, marca }) => {
  useFuentes();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const p = { ...PALETA, ...(pieza.paleta ?? {}), acento: marca.colores.acento };
  const retratos = useTrazos(pieza.trazos ?? {});
  const tramos = tramosDe(pieza, fps);
  const actual = tramos.find((x) => frame >= x.inicio && frame < x.fin) ?? tramos.at(-1);
  const oscuro = !!actual.escena.oscuro;
  const conAcento = frame / fps >= (pieza.acentoDesde ?? Infinity);
  return (
    <AbsoluteFill style={{ background: oscuro ? p.noche : p.papel, overflow: 'hidden' }}>
      {pieza.audio ? <Audio src={staticFile(pieza.audio)} /> : null}
      <Papel p={p} ancho={width} alto={height} oscuro={oscuro} />
      {tramos.map((t, i) => {
        const Dibujo = ESCENAS[t.tipo];
        if (!Dibujo) return null;
        return (
          <Sequence key={i} from={t.inicio} durationInFrames={t.fin - t.inicio}>
            <Dibujo e={t.escena} p={p} retratos={retratos} cuadros={t.fin - t.inicio} />
          </Sequence>
        );
      })}
      <Vineta oscuro={oscuro} />
      {/* Velo detras del texto cuando el dibujo llega arriba: el texto se lee sin tapar el dibujo */}
      {actual.escena.velo ? <AbsoluteFill style={{ background: `linear-gradient(180deg, ${oscuro ? p.noche : p.papel} 0%, ${conAlfa(oscuro ? p.noche : p.papel, 0.85)} 26%, transparent 36%)`, pointerEvents: 'none' }} /> : null}
      {(pieza.destellos ?? []).map((s, i) => (
        <Destello key={i} en={s * fps} frame={frame} fps={fps} ancho={width} alto={height} semilla={i} />
      ))}
      {(pieza.frases ?? []).map((x, i) => (
        <Frase key={i} x={x} frame={frame} fps={fps} p={p} ancho={width} oscuro={oscuro} conAcento={conAcento} />
      ))}
    </AbsoluteFill>
  );
};

/** Carga los retratos vectorizados (JSON) antes de dibujar. */
function useTrazos(mapa) {
  const [datos, setDatos] = useState({});
  const [espera] = useState(() => delayRender('trazos'));
  useEffect(() => {
    Promise.all(Object.entries(mapa).map(([id, ruta]) => fetch(staticFile(ruta)).then((r) => r.json()).then((d) => [id, d])))
      .then((pares) => { setDatos(Object.fromEntries(pares)); continueRender(espera); })
      .catch((e) => cancelRender(e));
  }, []);
  return datos;
}

// --- Utilidades de dibujo ---------------------------------------------------------------

const prog = (f, fps, desde, hasta) => interpolate(f, [desde * fps, hasta * fps], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

/** Line boil: el dibujo tiembla un poco y cambia cada 3 cuadros, como animacion hecha a mano. */
const boil = (f, k = 0, fuerza = 1.3) => {
  const n = Math.floor(f / 3);
  return `translate(${(random(`bx${n}${k}`) - 0.5) * 2 * fuerza} ${(random(`by${n}${k}`) - 0.5) * 2 * fuerza})`;
};

/** Trazo de plumilla: se dibuja con `t`, con una segunda pasada fina desplazada (boceto). */
const Pluma = ({ d, t, f, k = 0, color, ancho = 4, segunda = true }) => (
  <g transform={boil(f, k)}>
    <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={ancho} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 1" strokeDashoffset={1 - Math.min(1, t)} />
    {segunda ? <path d={d} pathLength={1} fill="none" stroke={color} strokeOpacity={0.45} strokeWidth={ancho * 0.4} strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1 - Math.min(1, t * 1.1)} transform="translate(2.5 -1.5)" /> : null}
  </g>
);

const Patrones = ({ p, color }) => (
  <defs>
    <pattern id="ray" width="11" height="11" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
      <line x1="0" y1="0" x2="0" y2="11" stroke={color ?? p.tinta} strokeWidth="3" />
    </pattern>
    <pattern id="cruz" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-42)">
      <line x1="0" y1="0" x2="0" y2="9" stroke={color ?? p.tinta} strokeWidth="2.6" />
    </pattern>
    <radialGradient id="halo">
      <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
      <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
    </radialGradient>
  </defs>
);

// --- Escenas -----------------------------------------------------------------------------

const ESCENAS = {};

/**
 * Escritura: el manuscrito real se escribe linea por linea (una mascara avanza) y una plumilla
 * dibujada va adelante del trazo. Es el plano de la mano escribiendo del video de referencia.
 */
ESCENAS.escritura = ({ e, p, cuadros }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lineas = e.lineas ?? 9;
  const area = { x: 60, y: 640, w: 960, h: 1000 };
  const avance = prog(f, fps, 0.2, (cuadros / fps) - 0.4) * lineas;
  const linea = Math.min(lineas - 1, Math.floor(avance));
  const dentro = avance - linea;
  const altoLinea = e.altoLinea ?? 39; // px por renglon del manuscrito ya escalado
  const y0 = area.y + (e.margenArriba ?? 30);
  const empuje = 1 + 0.05 * (f / cuadros);
  const nibX = area.x + 40 + dentro * (area.w - 80);
  const nibY = y0 + linea * altoLinea + altoLinea * 0.7;
  return (
    <AbsoluteFill style={{ transform: `scale(${empuje})`, transformOrigin: '50% 70%' }}>
      <svg width={1080} height={1920}>
        <Patrones p={p} />
        <defs>
          <clipPath id="escrito">
            {Array.from({ length: lineas }, (_, i) => {
              const w = i < linea ? area.w : i === linea ? dentro * area.w : 0;
              return <rect key={i} x={area.x} y={y0 + i * altoLinea - 6} width={w} height={altoLinea + 8} />;
            })}
          </clipPath>
        </defs>
        <image href={staticFile(e.img)} x={area.x} y={area.y} width={area.w} height={area.h} preserveAspectRatio="xMidYMin slice" clipPath="url(#escrito)" />
        {/* La plumilla: mango con rayado, viajando por la linea que se escribe */}
        <g transform={`translate(${nibX} ${nibY + Math.sin(f * 1.7) * 4}) rotate(-32) ${boil(f, 9, 1)}`}>
          <path d="M 0 0 L 16 -60 L 4 -64 Z" fill={p.tinta} />
          <path d="M 4 -64 L 16 -60 L 60 -420 L 28 -428 Z" fill="url(#ray)" stroke={p.tinta} strokeWidth={5} />
          <path d="M 28 -428 L 60 -420 L 72 -520 L 44 -526 Z" fill={p.tinta} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};

/**
 * Retrato o figura vectorizada (src/archivo/trazos.py) que se dibuja sola, como alguien que la
 * va trazando: primero los contornos, luego el sombreado a lapiz franja por franja de arriba abajo
 * y al final los negros. Todo con line boil.
 *
 * Y se mueve como animacion de recortes (cut-out): `respira` sube y baja el cuerpo desde los pies;
 * cada `partes[]` ({ caja: [x, y, w, h], pivote: [x, y] en fracciones de la figura, amp, periodo,
 * fase, inclina }) es una cabeza que se recorta del dibujo y gira sobre el cuello; `humo[]` ({ x, y })
 * son volutas que suben (un cigarro).
 */
const Retrato = ({ d, x, y, ancho, f, fps, desde = 0, dura = 2, p, color, relleno, sombra, id = 'r', respira = 0, partes = [], humo = [] }) => {
  if (!d) return null;
  const s = ancho / d.ancho;
  const W = d.ancho;
  const H = d.alto;
  const pecho = 1 + respira * Math.sin((f / fps) * 1.6);
  const dibujo = <Trazado d={d} f={f} fps={fps} desde={desde} dura={dura} p={p} color={color} relleno={relleno} sombra={sombra} s={s} />;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g transform={`translate(0 ${H}) scale(1 ${pecho}) translate(0 ${-H})`}>
        <defs>
          <mask id={`${id}-cuerpo`}>
            <rect x={-50} y={-50} width={W + 100} height={H + 100} fill="#FFFFFF" />
            {partes.map((c, i) => <rect key={i} x={c.caja[0] * W} y={c.caja[1] * H} width={c.caja[2] * W} height={c.caja[3] * H} fill="#000000" />)}
          </mask>
          {partes.map((c, i) => (
            <clipPath key={i} id={`${id}-parte${i}`}>
              <rect x={c.caja[0] * W} y={c.caja[1] * H} width={c.caja[2] * W} height={c.caja[3] * H} />
            </clipPath>
          ))}
        </defs>
        <g mask={partes.length ? `url(#${id}-cuerpo)` : undefined}>{dibujo}</g>
        {partes.map((c, i) => {
          const ang = (c.amp ?? 4) * Math.sin(((f / fps) * 2 * Math.PI) / (c.periodo ?? 3) + (c.fase ?? 0)) + (c.inclina ?? 0);
          return (
            <g key={i} transform={`rotate(${ang} ${c.pivote[0] * W} ${c.pivote[1] * H})`}>
              <g clipPath={`url(#${id}-parte${i})`}>{dibujo}</g>
            </g>
          );
        })}
        {humo.map((h, i) => <Humo key={i} x={h.x * W} y={h.y * H} f={f} p={p} s={s} />)}
      </g>
    </g>
  );
};

/** El dibujo en si: contornos, sombreado a lapiz y negros, en ese orden de trazado. */
const Trazado = ({ d, f, fps, desde, dura, p, color, relleno, sombra, s }) => {
  const n = d.trazos.length;
  const nS = (d.sombras ?? []).length;
  return (
    <g>
      {d.manchas.map((m, i) => (
        <path key={`m${i}`} d={m} fill={relleno ?? color ?? p.tinta} opacity={0.82 * prog(f, fps, desde + dura * 0.55, desde + dura * 0.95)} transform={boil(f, i, 1.5 / s)} />
      ))}
      {(d.sombras ?? []).map((sd, i) => {
        const ini = desde + dura * 0.25 + (i / Math.max(1, nS)) * dura * 0.6;
        return <path key={`s${i}`} d={sd} stroke={sombra ?? color ?? p.tinta} strokeWidth={1.5 / s} strokeLinecap="round" opacity={0.85 * prog(f, fps, ini, ini + 0.3)} transform={boil(f, 50 + i, 1.2 / s)} />;
      })}
      {d.trazos.map((t, i) => {
        const ini = desde + (i / n) * dura * 0.8;
        return <Pluma key={i} d={t.d} t={prog(f, fps, ini, ini + 0.35)} f={f} k={i} color={color ?? p.tinta} ancho={3.4 / s} segunda={t.largo > 120} />;
      })}
    </g>
  );
};

/** Volutas de humo que suben, se ondulan y se desvanecen (en bucle). */
const Humo = ({ x, y, f, p, s }) => (
  <g>
    {[0, 1, 2].map((k) => {
      const c = ((f + k * 22) % 66) / 66;
      const dy = -c * 220;
      return (
        <path key={k} d={`M ${x} ${y + dy} c -18 -30 22 -50 4 -80 s -26 -50 6 -90`} fill="none" stroke={p.tinta} strokeWidth={2.4 / s} strokeLinecap="round" opacity={0.7 * Math.sin(c * Math.PI)} transform={`rotate(${Math.sin(f / 20 + k) * 8} ${x} ${y + dy})`} />
      );
    })}
  </g>
);

/** El ojo: primer plano que se dibuja rapido y se acerca (la rafaga del video de referencia). */
ESCENAS.ojo = ({ e, p, retratos, cuadros }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const z = 1 + 0.25 * (f / cuadros);
  return (
    <AbsoluteFill style={{ transform: `scale(${z})`, transformOrigin: '60% 55%' }}>
      <svg width={1080} height={1920}>
        <Patrones p={p} />
        <Retrato d={retratos[e.trazos]} x={-60} y={760} ancho={1200} f={f} fps={fps} dura={0.9} p={p} />
      </svg>
    </AbsoluteFill>
  );
};

/** El arresto: los tres hombres de bombin (foto de epoca dibujada a lapiz) se trazan; en `golpe` todo tiembla. */
ESCENAS.arresto = ({ e, p, retratos, cuadros }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const g = (e.golpe ?? 2.2) * fps;
  const temblor = f > g && f < g + 8 ? Math.sin(f * 3) * 12 : 0;
  const d = retratos[e.trazos];
  const ancho = 1180;
  const alto = d ? (d.alto * ancho) / d.ancho : 940;
  return (
    <AbsoluteFill style={{ transform: `translateX(${temblor}px) scale(${1 + 0.07 * (f / cuadros)})`, transformOrigin: '50% 60%' }}>
      <svg width={1080} height={1920}>
        <Patrones p={p} />
        <g transform={`translate(${interpolate(f, [0, cuadros], [30, -30])} 0)`}>
          <Retrato d={d} x={-50} y={1780 - alto} ancho={ancho} f={f} fps={fps} dura={2.2} p={p} id="guardias" respira={0.006} partes={e.partes ?? []} humo={e.humo ?? []} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};

/** Lluvia de papeles: hojas con renglones manuscritos caen girando y se amontonan. */
ESCENAS.papeles = ({ p }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <svg width={1080} height={1920}>
        {Array.from({ length: 34 }, (_, i) => {
          const k = Math.max(0, f - i * 1.5);
          const piso = 1700 - Math.floor(i / 4) * 26;
          const y = Math.min(piso, 560 + (random(`py${i}`) - 0.5) * 200 + k * 34);
          const x = 80 + random(`px${i}`) * 820 + Math.sin(k / 6 + i) * 30;
          const rot = (random(`pr${i}`) - 0.5) * 70 + (y < piso ? k * 4 * (i % 2 ? 1 : -1) : 0);
          if (k <= 0) return null;
          return (
            <g key={i} transform={`translate(${x} ${y}) rotate(${rot}) ${boil(f, i, 1)}`}>
              <rect x={-80} y={-105} width={160} height={210} fill={p.papel} stroke={p.tinta} strokeWidth={4} />
              {Array.from({ length: 7 }, (_, j) => (
                <path key={j} d={`M -60 ${-75 + j * 24} q 20 ${-6 + random(`q${i}${j}`) * 12} 40 0 t 40 0 t ${20 + random(`l${i}${j}`) * 30} 0`} fill="none" stroke={p.tinta} strokeWidth={2.4} opacity={0.8} />
              ))}
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

/** La escalera infinita en 3D (three.js) a tinta. */
ESCENAS.escalera = ({ p, cuadros }) => (
  <AbsoluteFill>
    <Escalera3D papel={p.papel} tinta={p.tinta} duracion={cuadros} />
  </AbsoluteFill>
);

/**
 * La puerta de la ley, monumental como un grabado: arco de piedra con dovelas, dos hojas con
 * molduras, remaches y bisagras, piso en perspectiva y un haz de luz con polvo que sale de la
 * rendija y se derrama en el piso. El guardian de pie y el hombre que espera (figuras dibujadas)
 * a los lados; el que espera se encoge con los anos. En `cierra` las hojas se juntan, la luz del
 * piso se apaga y todo baja a negro sin golpe.
 */
ESCENAS.puerta = ({ e, p, retratos }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dib = prog(f, fps, 0, 1.4);
  const envejece = prog(f, fps, e.envejece?.[0] ?? 3.4, e.envejece?.[1] ?? 7);
  const cierra = prog(f, fps, e.cierra?.[0] ?? 7.4, e.cierra?.[1] ?? 8);
  const negro = prog(f, fps, e.negro?.[0] ?? 7.95, e.negro?.[1] ?? 8.3);
  const base = 1560;
  const cx = 560;
  const r = 250;
  const arriba = 860;
  // La puerta empieza cerrada, se entreabre (sale la luz) y al final se cierra.
  const abre = prog(f, fps, 1.0, 2.6);
  const rendija = 42 * (1 - Math.pow(1 - abre, 2)) * (1 - Math.pow(cierra, 1.5));
  const luz = abre * (1 - cierra);
  const sombrea = prog(f, fps, 0.6, 2.2); // el rayado de las hojas avanza de arriba abajo
  const fuga = { x: cx, y: 980 };
  // Hoja de la puerta (lado -1 izquierda, 1 derecha): borde exterior en el arco, borde interior en la rendija.
  const hoja = (lado) => {
    const xi = cx + (lado * rendija) / 2;
    const xe = cx + lado * r;
    const tope = (x) => arriba - Math.sqrt(Math.max(0, r * r - (x - cx) * (x - cx)));
    return `M ${xi} ${base} L ${xi} ${tope(xi)} A ${r} ${r} 0 0 ${lado > 0 ? 1 : 0} ${xe} ${arriba} L ${xe} ${base} Z`;
  };
  return (
    <AbsoluteFill style={{ transform: `scale(${1 + 0.08 * prog(f, fps, 0, 8)})`, transformOrigin: '50% 62%' }}>
      <svg width={1080} height={1920}>
        <Patrones p={p} />
        <defs>
          <linearGradient id="haz" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Piso en perspectiva: losas que convergen hacia la puerta */}
        <g opacity={0.75}>
          {Array.from({ length: 13 }, (_, i) => {
            const x = -400 + i * 160;
            const ini = 0.15 + Math.abs(i - 6) * 0.06;
            return <Pluma key={`v${i}`} d={`M ${fuga.x + (x - fuga.x) * 0.18} ${base} L ${x} 1920`} t={prog(f, fps, ini, ini + 0.5)} f={f} k={60 + i} color={p.tinta} ancho={2.6} segunda={false} />;
          })}
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const y = base + Math.pow(i / 5, 1.7) * 360;
            return <Pluma key={`h${i}`} d={`M ${cx} ${y} L 0 ${y} M ${cx} ${y} L 1080 ${y}`} t={prog(f, fps, 0.3 + i * 0.08, 0.9 + i * 0.08)} f={f} k={80 + i} color={p.tinta} ancho={2.6} segunda={false} />;
          })}
        </g>
        {/* Muro de piedra alrededor, rayado */}
        <rect x={0} y={560} width={1080} height={(base - 560) * prog(f, fps, 0.2, 1.6)} fill="url(#ray)" opacity={0.35} transform={boil(f, 21, 1.2)} />
        {/* Arco de piedra: marco ancho con dovelas que irradian */}
        <path d={`M ${cx - r - 80} ${base} L ${cx - r - 80} ${arriba} A ${r + 80} ${r + 80} 0 0 1 ${cx + r + 80} ${arriba} L ${cx + r + 80} ${base} Z`} fill={p.papel} opacity={dib} />
        {Array.from({ length: 13 }, (_, i) => {
          const a = Math.PI + (i / 12) * Math.PI;
          const ini = 0.5 + i * 0.07;
          return <Pluma key={`d${i}`} d={`M ${cx + Math.cos(a) * r} ${arriba + Math.sin(a) * r} L ${cx + Math.cos(a) * (r + 80)} ${arriba + Math.sin(a) * (r + 80)}`} t={prog(f, fps, ini, ini + 0.25)} f={f} k={30 + i} color={p.tinta} ancho={4} segunda={false} />;
        })}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <g key={`j${i}`}>
            <Pluma d={`M ${cx - r - 80} ${arriba + 20 + i * 100} L ${cx - r} ${arriba + 20 + i * 100}`} t={prog(f, fps, 1.2 + i * 0.06, 1.45 + i * 0.06)} f={f} k={40 + i} color={p.tinta} ancho={4} segunda={false} />
            <Pluma d={`M ${cx + r} ${arriba + 70 + i * 100} L ${cx + r + 80} ${arriba + 70 + i * 100}`} t={prog(f, fps, 1.25 + i * 0.06, 1.5 + i * 0.06)} f={f} k={45 + i} color={p.tinta} ancho={4} segunda={false} />
          </g>
        ))}
        <Pluma d={`M ${cx - r - 80} ${base} L ${cx - r - 80} ${arriba} A ${r + 80} ${r + 80} 0 0 1 ${cx + r + 80} ${arriba} L ${cx + r + 80} ${base}`} t={dib} f={f} k={3} color={p.tinta} ancho={9} />
        {/* Lo que hay detras de la puerta: luz */}
        <path d={`M ${cx - r} ${base} L ${cx - r} ${arriba} A ${r} ${r} 0 0 1 ${cx + r} ${arriba} L ${cx + r} ${base} Z`} fill="#FFF6DE" opacity={dib} />
        {/* Las dos hojas: rayado cruzado, molduras, remaches y bisagras */}
        {[-1, 1].map((lado) => (
          <g key={lado} transform={boil(f, 50 + lado, 1)}>
            <clipPath id={`sombrea${lado}`}><rect x={0} y={0} width={1080} height={arriba - r + (base - arriba + r) * sombrea} /></clipPath>
            <path d={hoja(lado)} fill={p.papel} opacity={dib} />
            <g clipPath={`url(#sombrea${lado})`}>
              <path d={hoja(lado)} fill="url(#cruz)" opacity={0.75} />
              <path d={hoja(lado)} fill="url(#ray)" opacity={0.55} />
            </g>
            <path d={hoja(lado)} pathLength={1} fill="none" stroke={p.tinta} strokeWidth={7} strokeDasharray="1 1" strokeDashoffset={1 - dib} />
            {[0, 1, 2].map((k) => {
              const x0 = lado < 0 ? cx - r + 36 : cx + rendija / 2 + 30;
              const w = r - rendija / 2 - 66;
              const y0 = arriba + 40 + k * 215;
              return <rect key={k} x={x0} y={y0} width={Math.max(0, w)} height={170} fill="none" stroke={p.tinta} strokeWidth={5} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - prog(f, fps, 1.3 + k * 0.2, 1.8 + k * 0.2)} />;
            })}
            {Array.from({ length: 6 }, (_, k) => [0, 1].map((j) => (
              <circle key={`${k}${j}`} cx={lado < 0 ? cx - r + 20 : cx + r - 20} cy={arriba + 30 + k * 125} r={6 * prog(f, fps, 2 + k * 0.08, 2.2 + k * 0.08)} fill={p.tinta} />
            )))}
            <rect x={lado < 0 ? cx - r - 14 : cx + r - 30} y={arriba + 90} width={44} height={22} fill={p.tinta} opacity={prog(f, fps, 1.8, 2.1)} />
            <rect x={lado < 0 ? cx - r - 14 : cx + r - 30} y={base - 160} width={44} height={22} fill={p.tinta} opacity={prog(f, fps, 1.9, 2.2)} />
          </g>
        ))}
        {/* Haz de luz desde la rendija hasta el piso, y el charco de luz en las losas */}
        <path d={`M ${cx - rendija / 2} ${arriba - 200} L ${cx + rendija / 2} ${arriba - 200} L ${cx + rendija * 7} 1920 L ${cx - rendija * 7} 1920 Z`} fill="url(#haz)" opacity={0.55 * luz} />
        <ellipse cx={cx} cy={base + 120} rx={60 + rendija * 6} ry={40 + rendija * 1.5} fill="#FFFFFF" opacity={0.35 * luz} />
        {Array.from({ length: 30 }, (_, i) => {
          const yy = base + 300 - ((f * (0.7 + random(`dv${i}`)) + random(`dy${i}`) * 900) % 900);
          const xx = cx + (random(`dx${i}`) - 0.5) * (rendija * 8) * Math.max(0.2, (yy - arriba + 200) / 900);
          return <circle key={i} cx={xx} cy={yy} r={1.6 + random(`dr${i}`) * 2.6} fill="#FFFFFF" opacity={0.75 * luz} />;
        })}
        {/* El guardian, de pie junto a la puerta */}
        <Retrato d={retratos[e.guardian]} x={828} y={base - 600} ancho={270} f={f} fps={fps} desde={0.4} dura={1.6} p={p} id="guardian" respira={0.008}
          partes={[{ caja: [0.3, 0, 0.4, 0.15], pivote: [0.5, 0.14], amp: 1.5, periodo: 5, inclina: -7 * prog(f, fps, 2.5, 3.5) }]} />
        {/* El hombre que espera: sentado, se va encogiendo con los anos */}
        <g transform={`translate(150 ${base}) scale(${1 - envejece * 0.12}) translate(-150 ${-base})`}>
          <Retrato d={retratos[e.espera]} x={-40} y={base - 440} ancho={245} f={f} fps={fps} desde={0.7} dura={1.6} p={p} id="espera" respira={0.01 * (1 - envejece * 0.5)}
            partes={[{ caja: [0.12, 0.05, 0.32, 0.2], pivote: [0.3, 0.23], amp: 2, periodo: 4, inclina: 16 * envejece }]} />
        </g>
      </svg>
      <AbsoluteFill style={{ background: p.noche, opacity: negro }} />
    </AbsoluteFill>
  );
};

/**
 * El arbol de luz: Kafka dibujandose en lineas claras sobre la noche y, desde su cabeza, ramas de
 * luz blanca que crecen hacia arriba (el plano largo del video de referencia).
 */
ESCENAS.arbol = ({ e, p, retratos }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = retratos[e.trazos];
  const ancho = 760;
  const x = (1080 - ancho) / 2;
  const y = 1920 - 380 - (d ? (d.alto * ancho) / d.ancho : 960) + 120;
  const cabeza = { x: 540, y: y + 40 };
  return (
    <AbsoluteFill>
      <svg width={1080} height={1920}>
        <Patrones p={p} color="#6B6052" />
        <circle cx={cabeza.x} cy={cabeza.y + 120} r={420} fill="url(#halo)" opacity={0.18 * prog(f, fps, 1.6, 3)} />
        <g transform={`rotate(${-2.5 * prog(f, fps, 1.6, 3.5) + Math.sin(f / 40) * 0.6} 540 ${y + 900})`}>
          <Retrato d={d} x={x} y={y} ancho={ancho} f={f} fps={fps} dura={1.8} p={p} color="#D9CFBA" sombra="#5C5349" relleno="#0B0A08" id="kafka" respira={0.007} />
        </g>
        <ArbolLuz origen={cabeza} f={f} fps={fps} desde={e.arbol ?? 1.6} />
      </svg>
    </AbsoluteFill>
  );
};

/** Ramas deterministas que se dibujan hacia arriba en blanco con un halo de trazo ancho. */
const ArbolLuz = ({ origen, f, fps, desde }) => {
  const ramas = [];
  const crecer = (x, y, ang, largo, nivel, sem, ini) => {
    if (nivel > 6 || largo < 10) return;
    const x2 = x + Math.cos(ang) * largo;
    const y2 = y + Math.sin(ang) * largo;
    const cx = (x + x2) / 2 + (random(`c${sem}`) - 0.5) * largo * 0.5;
    const cy = (y + y2) / 2 + (random(`d${sem}`) - 0.5) * largo * 0.2;
    ramas.push({ d: `M ${x} ${y} Q ${cx} ${cy} ${x2} ${y2}`, ini, ancho: Math.max(1.4, 6 - nivel * 0.8) });
    const hijos = nivel < 2 ? 3 : 2;
    for (let i = 0; i < hijos; i++) {
      const giro = (i - (hijos - 1) / 2) * (0.3 + random(`g${sem}${i}`) * 0.45) + (random(`h${sem}${i}`) - 0.5) * 0.3;
      crecer(x2, y2, ang + giro, largo * (0.66 + random(`l${sem}${i}`) * 0.16), nivel + 1, `${sem}${i}`, ini + 0.32);
    }
  };
  [-0.5, -0.17, 0.17, 0.5].forEach((da, i) => crecer(origen.x + da * 40, origen.y, -Math.PI / 2 + da * 0.85, 150 + random(`r${i}`) * 40, 0, `r${i}`, desde));
  return (
    <g transform={boil(f, 99, 1)}>
      {ramas.map((r, i) => {
        const k = prog(f, fps, r.ini, r.ini + 0.8);
        if (k <= 0) return null;
        const pulso = 0.85 + 0.15 * Math.sin(f / 9 + i);
        return (
          <g key={i} opacity={pulso}>
            <path d={r.d} pathLength={1} stroke="#FFFFFF" strokeOpacity={0.16} strokeWidth={r.ancho * 5} fill="none" strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1 - k} />
            <path d={r.d} pathLength={1} stroke="#FFFFFF" strokeWidth={r.ancho} fill="none" strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1 - k} />
          </g>
        );
      })}
    </g>
  );
};

/** El tintero: la plumilla baja, se moja y sube (vuelve al primer plano: el bucle). */
ESCENAS.tintero = ({ e, p }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dib = prog(f, fps, 0, 1);
  const baja = Math.sin(Math.min(1, f / (2.2 * fps)) * Math.PI);
  return (
    <AbsoluteFill>
      <svg width={1080} height={1920}>
        <Patrones p={p} />
        {/* Todo el tintero sube para dejar abajo el cierre con el logo */}
        <g transform="translate(0 -380)">
        <g transform={boil(f, 1, 1.4)}>
          <path d="M 400 1660 Q 380 1380 470 1330 L 470 1260 L 610 1260 L 610 1330 Q 700 1380 680 1660 Z" fill="url(#cruz)" opacity={dib} />
        </g>
        <Pluma d="M 400 1660 Q 380 1380 470 1330 L 470 1260 L 610 1260 L 610 1330 Q 700 1380 680 1660 Z" t={dib} f={f} k={2} color={p.tinta} ancho={8} />
        <Pluma d="M 60 1662 L 1020 1662" t={dib} f={f} k={3} color={p.tinta} ancho={6} />
        <ellipse cx={540} cy={1262} rx={70} ry={14} fill={p.tinta} opacity={dib} />
        <g transform={`translate(${560} ${1100 + baja * 150}) rotate(-25) scale(0.6) ${boil(f, 4, 1)}`}>
          <path d="M 0 0 L 14 -70 L 2 -74 Z" fill={p.tinta} />
          <path d="M 2 -74 L 14 -70 L 44 -520 L 14 -526 Z" fill="url(#ray)" stroke={p.tinta} strokeWidth={6} />
        </g>
        </g>
      </svg>
      {/* Cierre: el logo directo sobre el papel, sin cajas ni resplandores */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1380, display: 'flex', justifyContent: 'center', opacity: prog(f, fps, 0.9, 1.6) }}>
        {e.logo ? <Img src={staticFile(e.logo)} style={{ height: 86, filter: 'brightness(0)', opacity: 0.88 }} /> : <Firma tamano={0.7} />}
      </div>
    </AbsoluteFill>
  );
};

// --- Capas comunes -----------------------------------------------------------------------

/** Papel gris moteado del video de referencia (o carbon en las escenas de noche). */
const Papel = ({ p, ancho, alto, oscuro }) => (
  <svg width={ancho} height={alto} style={{ position: 'absolute', inset: 0 }}>
    <defs>
      {Array.from({ length: 16 }, (_, i) => (
        <radialGradient key={i} id={`mot${i}`}>
          <stop offset="0%" stopColor={oscuro ? '#000000' : '#5E513C'} stopOpacity={0.12 + random(`mo${i}`) * 0.1} />
          <stop offset="100%" stopColor={oscuro ? '#000000' : '#5E513C'} stopOpacity={0} />
        </radialGradient>
      ))}
    </defs>
    {Array.from({ length: 16 }, (_, i) => (
      <ellipse key={i} cx={random(`mx${i}`) * ancho} cy={random(`my${i}`) * alto} rx={160 + random(`mr${i}`) * 320} ry={120 + random(`mq${i}`) * 280} fill={`url(#mot${i})`} />
    ))}
    {Array.from({ length: 260 }, (_, i) => {
      const x = random(`fx${i}`) * ancho;
      const y = random(`fy${i}`) * alto;
      const a = random(`fa${i}`) * Math.PI;
      const l = 5 + random(`fl${i}`) * 28;
      return <line key={i} x1={x} y1={y} x2={x + Math.cos(a) * l} y2={y + Math.sin(a) * l} stroke={oscuro ? '#FFFFFF' : '#2A2116'} strokeOpacity={oscuro ? 0.05 : 0.1} strokeWidth={1} />;
    })}
  </svg>
);

const Vineta = ({ oscuro }) => <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 55%, transparent 42%, rgba(15,12,8,${oscuro ? 0.75 : 0.5}) 100%)`, pointerEvents: 'none' }} />;

/** Destello: un golpe de luz blanca con una franja diagonal que cruza (los cortes del video de referencia). */
const Destello = ({ en, frame, fps, ancho, alto, semilla }) => {
  const k = (frame - en) / (0.4 * fps);
  if (k < 0 || k > 1) return null;
  const ang = 18 + random(`ds${semilla}`) * 40;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <AbsoluteFill style={{ background: '#FFFFFF', opacity: 0.6 * (1 - k) }} />
      <div style={{ position: 'absolute', left: -500 + k * (ancho + 1000), top: -400, width: 180, height: alto + 800, transform: `rotate(${ang}deg)`, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.95), transparent)' }} />
    </AbsoluteFill>
  );
};

/**
 * Frase de la voz arriba, moderna: serif grande con el enfasis en italica. Sobre papel va en tinta;
 * sobre la noche, en papel. La puntuacion que sigue a un *enfasis* se pega a la palabra anterior.
 */
const Frase = ({ x, frame, fps, p, ancho, oscuro, conAcento }) => {
  const desde = x.desde * fps;
  const hasta = x.hasta * fps;
  if (frame < desde - 1 || frame > hasta + 8) return null;
  const palabras = partirPalabras(x.texto).reduce((acc, w) => {
    if (/^[.,:;?!…]+$/.test(w.texto) && acc.length) acc[acc.length - 1] = { ...acc[acc.length - 1], cola: (acc[acc.length - 1].cola ?? '') + w.texto };
    else acc.push(w);
    return acc;
  }, []);
  const sale = interpolate(frame, [hasta + 1, hasta + 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const tam = x.tamano ?? (palabras.length <= 4 ? 104 : palabras.length <= 8 ? 84 : 72);
  const color = oscuro ? '#EFE6D2' : p.tinta;
  return (
    <div style={{ position: 'absolute', left: 80, width: ancho - 160, top: x.arriba ?? 250, display: 'flex', flexWrap: 'wrap', columnGap: tam * 0.26, opacity: 1 - sale, transform: `translateY(${-14 * sale}px)` }}>
      {palabras.map((w, k) => {
        const n = (hasta - desde) / Math.max(1, palabras.length);
        const a = entra(frame, desde + k * Math.min(5, n * 0.6), fps, { stiffness: 220, damping: 22 });
        const acento = w.enfasis && conAcento;
        return (
          <span key={k} style={{ ...fuente({ familia: 'Fraunces', peso: w.enfasis ? 700 : 500 }), fontSize: tam, lineHeight: 1.06, letterSpacing: '-0.02em', color: acento ? p.acento : color, opacity: Math.min(1, a * 1.5), transform: `translateY(${(1 - a) * 18}px)`, display: 'inline-block', fontStyle: w.enfasis ? 'italic' : 'normal', textShadow: oscuro ? '0 0 30px rgba(0,0,0,.6)' : `0 0 24px ${conAlfa(p.papel, 0.9)}` }}>
            {w.texto}
            {w.cola ?? ''}
          </span>
        );
      })}
    </div>
  );
};
