import React, { useEffect, useMemo, useState } from 'react';
import { AbsoluteFill, cancelRender, continueRender, delayRender, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { icons } from 'lucide-react';
import { useFuentes } from '../fuentes.js';
import { Globo } from './Globo.jsx';
import { Barrido, Kicker, Mono } from './Trailer.jsx';

/**
 * Escenas contextuales de una clase remontada (clases/<slug>.json → remontaje.contexto): tapan la
 * pantalla compartida (1600×900) mientras el profesor explica, y muestran exactamente lo que dice.
 * El catálogo de tipos y parámetros está en trabajo/clases/<slug>/40-remontaje/CATALOGO.md.
 *
 * Todo sale del número de cuadro (Remotion renderiza cuadros sueltos en paralelo) y con los colores
 * de la presentación de la clase (clase.tema). El barrio 3D usa los modelos de Panadería Tycoon.
 */
const RES = { stiffness: 230, damping: 22 };
const SG = `'Space Grotesk'`;

const useT = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: D } = useVideoConfig();
  const sp = (d, config = RES) => spring({ frame: frame - d, fps, config });
  return { frame, fps, D, sp };
};
const Ic = ({ n, size = 40, color, sw = 1.8, style }) => {
  const I = icons[n] ?? icons.Sparkles;
  return <I size={size} color={color} strokeWidth={sw} style={style} />;
};
const sel = (o, k, def) => o?.[k] ?? def;

/** Fondo común: cielo de la clase con retícula que se desplaza y dos brillos. */
const Fondo = ({ T }) => {
  const { frame } = useT();
  return (
    <AbsoluteFill style={{ background: T.fondo, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: -80, backgroundImage: `radial-gradient(${T.linea} 1.4px, transparent 1.6px)`, backgroundSize: '40px 40px', transform: `translate(${(frame * 0.6) % 40}px, ${(frame * 0.3) % 40}px)`, opacity: 0.55 }} />
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at ${20 + Math.sin(frame / 60) * 6}% 15%, ${T.acento}24 0%, transparent 42%), radial-gradient(circle at 85% 90%, ${T.cian}1c 0%, transparent 40%)` }} />
    </AbsoluteFill>
  );
};

/** Marco de toda escena: fondo, entrada con barrido naranja, salida en fundido y el rótulo. */
const Escena = ({ T, kicker, children, sinFondo }) => {
  const { frame, D, sp } = useT();
  const sale = interpolate(frame, [D - 9, D], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const a = sp(2);
  return (
    <AbsoluteFill style={{ opacity: sale, fontFamily: `'Inter'`, color: T.tinta }}>
      {!sinFondo && <Fondo T={T} />}
      <AbsoluteFill style={{ transform: `scale(${0.97 + 0.03 * a})`, opacity: Math.min(1, a * 1.4) }}>{children}</AbsoluteFill>
      {kicker && <div style={{ position: 'absolute', left: 56, top: 40 }}><Kicker T={T} a={sp(5)}>{kicker}</Kicker></div>}
      {frame < 12 && <Barrido T={T} />}
    </AbsoluteFill>
  );
};

const Titulo = ({ T, texto, resalta = [], tam = 76, d = 6, alinear = 'left', ancho }) => {
  const { sp } = useT();
  return (
    <div style={{ fontFamily: SG, fontWeight: 700, fontSize: tam, lineHeight: 1.04, letterSpacing: '-0.03em', display: 'flex', flexWrap: 'wrap', columnGap: tam * 0.26, justifyContent: alinear === 'center' ? 'center' : 'flex-start', maxWidth: ancho }}>
      {String(texto).split(' ').map((p, i) => {
        const s = sp(d + i * 2.5);
        return <span key={i} style={{ display: 'inline-block', opacity: s, transform: `translateY(${(1 - s) * 28}px)`, color: resalta.includes(p) ? T.acento : T.tinta }}>{p}</span>;
      })}
    </div>
  );
};

const Texto = ({ T, children, d = 18, tam = 30, style }) => {
  const { sp } = useT();
  const s = sp(d);
  return <div style={{ fontSize: tam, lineHeight: 1.4, color: T.tenue, opacity: s, transform: `translateY(${(1 - s) * 16}px)`, ...style }}>{children}</div>;
};

// ---------------------------------------------------------------------------------------------

const Titular = ({ T, e }) => {
  const { frame, sp } = useT();
  const s = sp(4, { stiffness: 200, damping: 14 });
  return (
    <Escena T={T} kicker={e.kicker}>
      <div style={{ position: 'absolute', left: 120, top: 200, right: 120, display: 'flex', gap: 70, alignItems: 'center' }}>
        <div style={{ position: 'relative', width: 280, height: 280, flexShrink: 0 }}>
          {[0, 1, 2].map((k) => {
            const r = ((frame + k * 30) % 90) / 90;
            return <div key={k} style={{ position: 'absolute', inset: -r * 90, borderRadius: '50%', border: `2px solid ${T.acento}`, opacity: (1 - r) * 0.5 }} />;
          })}
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `${T.acento}1f`, border: `3px solid ${T.acento}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${s}) rotate(${(1 - s) * -40}deg)` }}>
            <Ic n={e.icono ?? 'Sparkles'} size={130} color={T.acento} sw={1.6} />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <Titulo T={T} texto={e.titulo} resalta={e.resalta} tam={88} />
          {e.texto && <Texto T={T} d={22} tam={34} style={{ marginTop: 30, maxWidth: 900 }}>{e.texto}</Texto>}
        </div>
      </div>
    </Escena>
  );
};

/** Retrato ilustrado (no foto): cabeza, pelo, gafas y barba según `rasgos`, con traje. */
const Retrato = ({ T, rasgos = {}, tam = 360 }) => {
  const piel = { claro: '#f1c9a5', medio: '#c98d62', oscuro: '#7a4a2e' }[rasgos.tono ?? 'claro'];
  const pelo = '#2b2118';
  return (
    <svg width={tam} height={tam} viewBox="0 0 200 200">
      <defs>
        <clipPath id="circ"><circle cx="100" cy="100" r="96" /></clipPath>
      </defs>
      <circle cx="100" cy="100" r="98" fill={T.fondo2} stroke={T.acento} strokeWidth="3" />
      <g clipPath="url(#circ)">
        <path d="M30 200 Q32 140 100 136 Q168 140 170 200 Z" fill="#2a2f4a" />
        <path d="M84 138 L100 168 L116 138 Z" fill="#e8ecf6" />
        <path d="M96 146 L100 176 L104 146 Z" fill={T.acento} />
        <rect x="88" y="118" width="24" height="24" rx="8" fill={piel} />
        <ellipse cx="100" cy="92" rx="34" ry="40" fill={piel} />
        {rasgos.pelo === 'calvo' && <path d="M66 86 Q68 70 76 66 L74 92 Z M134 86 Q132 70 124 66 L126 92 Z" fill={pelo} />}
        {rasgos.pelo === 'corto' && <path d="M66 88 Q62 52 100 50 Q138 52 134 88 Q130 66 100 64 Q72 66 66 88 Z" fill={pelo} />}
        {rasgos.pelo === 'rizado' && [60, 72, 84, 96, 108, 120, 132, 140, 64, 136].map((x, i) => <circle key={i} cx={x} cy={i > 7 ? 80 : 58 + (i % 2) * 6} r="11" fill={pelo} />)}
        {rasgos.pelo === 'largo' && <path d="M62 120 Q56 52 100 48 Q144 52 138 120 L128 120 Q132 70 100 66 Q70 70 72 120 Z" fill={pelo} />}
        {rasgos.barba && <path d="M70 100 Q72 134 100 136 Q128 134 130 100 Q118 120 100 120 Q82 120 70 100 Z" fill={pelo} opacity="0.9" />}
        <ellipse cx="87" cy="92" rx="3.2" ry="3.6" fill="#1b1b1b" />
        <ellipse cx="113" cy="92" rx="3.2" ry="3.6" fill="#1b1b1b" />
        <path d="M90 112 Q100 118 110 112" stroke="#6b3a2a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        {rasgos.gafas && (
          <g stroke="#1b1b1b" strokeWidth="2.6" fill="none">
            <circle cx="87" cy="92" r="10" />
            <circle cx="113" cy="92" r="10" />
            <path d="M97 92 L103 92" />
          </g>
        )}
      </g>
    </svg>
  );
};

const Personaje = ({ T, e }) => {
  const { frame, sp } = useT();
  const s = sp(4, { stiffness: 180, damping: 16 });
  const n = Math.max(0, Math.floor((frame - 30) * 1.2));
  return (
    <Escena T={T} kicker={e.kicker ?? 'Personaje'}>
      <div style={{ position: 'absolute', left: 110, top: 150, display: 'flex', gap: 80, alignItems: 'center', right: 110 }}>
        <div style={{ position: 'relative', transform: `scale(${0.7 + 0.3 * s}) rotate(${(1 - s) * -8}deg)`, opacity: s }}>
          <div style={{ position: 'absolute', inset: -30, borderRadius: '50%', border: `2px dashed ${T.linea}`, transform: `rotate(${frame * 0.6}deg)` }} />
          <Retrato T={T} rasgos={e.rasgos} tam={420} />
          <div style={{ position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)', background: T.acento, color: T.fondo, borderRadius: 999, padding: '8px 22px' }}>
            <Mono style={{ fontSize: 22, color: T.fondo }}>{e.anio}</Mono>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <Titulo T={T} texto={e.nombre} tam={84} d={10} />
          <Texto T={T} d={18} tam={30} style={{ marginTop: 14, color: T.cian }}>{e.rol}</Texto>
          {e.cita && (
            <div style={{ marginTop: 40, fontFamily: SG, fontWeight: 600, fontSize: 42, lineHeight: 1.25, color: T.tinta, borderLeft: `5px solid ${T.acento}`, paddingLeft: 28, maxWidth: 820 }}>
              «{e.cita.slice(0, n)}{n < e.cita.length ? <span style={{ color: T.acento }}>|</span> : '»'}
            </div>
          )}
        </div>
      </div>
    </Escena>
  );
};

const Linea = ({ T, e }) => {
  const { frame, D, sp } = useT();
  const hitos = e.hitos ?? [];
  const n = hitos.length;
  const x0 = 140;
  const x1 = 1460;
  const xs = hitos.map((_, i) => x0 + ((x1 - x0) * i) / Math.max(1, n - 1));
  const act = Math.min(n - 1, e.activo ?? n - 1);
  const u = interpolate(frame, [20, Math.min(D - 30, 20 + 26 * (act + 1))], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const xa = x0 + (xs[act] - x0) * (1 - Math.pow(1 - u, 3));
  return (
    <Escena T={T} kicker={e.kicker ?? 'Línea de tiempo'}>
      <div style={{ position: 'absolute', left: 140, top: 130 }}><Titulo T={T} texto={e.titulo} tam={64} ancho={1300} /></div>
      <div style={{ position: 'absolute', left: x0, top: 520, width: x1 - x0, height: 4, background: T.linea, borderRadius: 2 }} />
      <div style={{ position: 'absolute', left: x0, top: 520, width: xa - x0, height: 4, background: T.acento, borderRadius: 2 }} />
      <div style={{ position: 'absolute', left: xa - 26, top: 496 }}><Ic n="Plane" size={52} color={T.acento} sw={2} style={{ transform: 'rotate(45deg)' }} /></div>
      {hitos.map((h, i) => {
        const s = sp(12 + i * 6);
        const llegado = xa >= xs[i] - 2;
        const es = i === act && llegado;
        return (
          <div key={i} style={{ position: 'absolute', left: xs[i] - 120, width: 240, top: i % 2 ? 560 : 300, textAlign: 'center', opacity: s }}>
            {i % 2 === 0 && <Caja T={T} h={h} es={es} />}
            <div style={{ position: 'absolute', left: 108, top: i % 2 ? -50 : 206, width: 24, height: 24, borderRadius: 12, background: llegado ? T.acento : T.fondo, border: `3px solid ${llegado ? T.acento : T.linea}`, transform: `scale(${es ? 1.4 : 1})` }} />
            {i % 2 === 1 && <Caja T={T} h={h} es={es} />}
          </div>
        );
      })}
    </Escena>
  );
};
const Caja = ({ T, h, es }) => (
  <div style={{ background: es ? `${T.acento}22` : `${T.fondo2}ee`, border: `2px solid ${es ? T.acento : T.linea}`, borderRadius: 16, padding: '14px 12px', transform: `scale(${es ? 1.1 : 1})` }}>
    <div style={{ fontFamily: SG, fontWeight: 700, fontSize: 40, color: es ? T.acento : T.tinta }}>{h.anio}</div>
    <div style={{ fontSize: 20, color: T.tenue, marginTop: 4, lineHeight: 1.3 }}>{h.texto}</div>
  </div>
);

const Turing = ({ T, e }) => {
  const { frame } = useT();
  const CEL = 110;
  const paso = 22;
  const k = Math.floor(frame / paso);
  const f = (frame % paso) / paso;
  const mov = f < 0.5 ? 0 : (f - 0.5) * 2;
  const celdas = Array.from({ length: 18 }, (_, i) => i + k - 8);
  const sim = (j) => (random(`t${j}`) > 0.5 ? '1' : '0');
  return (
    <Escena T={T} kicker={e.kicker ?? 'Máquina de Turing · 1936'}>
      <div style={{ position: 'absolute', left: 120, top: 120 }}><Titulo T={T} texto={e.titulo} resalta={e.resalta} tam={64} ancho={1360} /></div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 380, height: CEL, overflow: 'hidden' }}>
        {celdas.map((j, i) => {
          const x = 800 - CEL / 2 + (i - 8) * CEL - mov * CEL;
          const escrito = j < k || (j === k && f > 0.3);
          const v = escrito ? (sim(j) === '1' ? '0' : '1') : sim(j);
          return (
            <div key={j} style={{ position: 'absolute', left: x, width: CEL - 8, height: CEL - 8, top: 4, borderRadius: 12, background: T.fondo2, border: `2px solid ${T.linea}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: `'JetBrains Mono'`, fontWeight: 700, fontSize: 52, color: j === k ? T.acento : escrito ? T.cian : T.tenue }}>{v}</span>
            </div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', left: 800 - 70, top: 340, width: 140, height: 190, border: `4px solid ${T.acento}`, borderRadius: 18, boxShadow: `0 0 40px ${T.acento}66` }} />
      <div style={{ position: 'absolute', left: 800 - 90, top: 560, width: 180, textAlign: 'center' }}>
        <div style={{ width: 0, height: 0, margin: '0 auto', borderLeft: '20px solid transparent', borderRight: '20px solid transparent', borderBottom: `26px solid ${T.acento}` }} />
        <Mono style={{ fontSize: 22, color: T.acento, display: 'block', marginTop: 8 }}>cabezal · estado q{(k % 3) + 1}</Mono>
      </div>
      {e.texto && <div style={{ position: 'absolute', left: 120, right: 120, top: 680, textAlign: 'center' }}><Texto T={T} d={20} tam={32}>{e.texto}</Texto></div>}
    </Escena>
  );
};

const Bits = ({ T, e }) => {
  const { frame, sp } = useT();
  const on = Math.floor(frame / 24) % 2 === 0;
  const letra = (e.palabra ?? 'A')[0];
  const cod = letra.charCodeAt(0).toString(2).padStart(8, '0');
  return (
    <Escena T={T} kicker={e.kicker ?? 'Transistor · bit'}>
      <div style={{ position: 'absolute', left: 110, top: 120 }}><Titulo T={T} texto={e.titulo} resalta={e.resalta} tam={60} ancho={1380} /></div>
      {/* El transistor como interruptor: cuando cierra, pasa la corriente y se enciende el bombillo. */}
      <svg width="640" height="420" style={{ position: 'absolute', left: 90, top: 300 }} viewBox="0 0 640 420">
        <path d="M60 300 L60 120 L250 120" stroke={T.linea} strokeWidth="8" fill="none" />
        <path d="M390 120 L580 120 L580 300 L60 300" stroke={T.linea} strokeWidth="8" fill="none" />
        <circle cx="250" cy="120" r="12" fill={T.tinta} />
        <circle cx="390" cy="120" r="12" fill={T.tinta} />
        <line x1="250" y1="120" x2={on ? 390 : 360} y2={on ? 120 : 50} stroke={on ? T.acento : T.tenue} strokeWidth="10" strokeLinecap="round" />
        <circle cx="580" cy="210" r="46" fill={on ? '#ffd76a' : T.fondo2} stroke={T.tinta} strokeWidth="4" style={{ filter: on ? 'drop-shadow(0 0 30px #ffd76a)' : 'none' }} />
        {on && Array.from({ length: 10 }, (_, i) => {
          const p = ((frame * 6 + i * 96) % 960) / 960;
          const L = [[60, 300], [60, 120], [580, 120], [580, 300], [60, 300]];
          const seg = Math.min(3, Math.floor(p * 4));
          const q = p * 4 - seg;
          const [ax, ay] = L[seg];
          const [bx, by] = L[seg + 1];
          return <circle key={i} cx={ax + (bx - ax) * q} cy={ay + (by - ay) * q} r="7" fill={T.cian} />;
        })}
        <text x="320" y="380" textAnchor="middle" fill={on ? T.acento : T.tenue} style={{ font: "700 44px 'JetBrains Mono'" }}>{on ? 'ENCENDIDO = 1' : 'APAGADO = 0'}</text>
      </svg>
      <div style={{ position: 'absolute', left: 820, top: 330, width: 680 }}>
        <Mono style={{ fontSize: 22, color: T.tenue }}>8 bits = 1 letra</Mono>
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          {cod.split('').map((b, i) => {
            const s = sp(30 + i * 6, { stiffness: 380, damping: 18 });
            return (
              <div key={i} style={{ width: 72, height: 92, borderRadius: 12, background: b === '1' ? `${T.acento}2a` : T.fondo2, border: `2px solid ${b === '1' ? T.acento : T.linea}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${s})` }}>
                <span style={{ fontFamily: `'JetBrains Mono'`, fontWeight: 700, fontSize: 48, color: b === '1' ? T.acento : T.tenue }}>{b}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 30, opacity: sp(84) }}>
          <Ic n="ArrowRight" size={48} color={T.tenue} />
          <span style={{ fontFamily: SG, fontWeight: 700, fontSize: 150, color: T.tinta, lineHeight: 1, transform: `scale(${0.6 + 0.4 * sp(84, { stiffness: 300, damping: 12 })})`, display: 'inline-block' }}>{letra}</span>
        </div>
        {e.texto && <Texto T={T} d={96} tam={26} style={{ marginTop: 10 }}>{e.texto}</Texto>}
      </div>
    </Escena>
  );
};

const Red = ({ T, e }) => {
  const { frame, sp } = useT();
  const capas = [4, 6, 6, 3];
  const X = [470, 730, 990, 1230];
  const pos = capas.map((n, c) => Array.from({ length: n }, (_, i) => [X[c], 470 + (i - (n - 1) / 2) * 76]));
  const ola = ((frame - 20) / 26) % 4;
  return (
    <Escena T={T} kicker={e.kicker ?? 'Red neuronal'}>
      <div style={{ position: 'absolute', left: 110, top: 110 }}><Titulo T={T} texto={e.titulo} resalta={e.resalta} tam={60} ancho={1380} /></div>
      <svg width="1600" height="900" style={{ position: 'absolute', inset: 0 }}>
        {pos.slice(0, -1).map((cap, c) => cap.flatMap(([x1, y1], i) => pos[c + 1].map(([x2, y2], j) => {
          const viva = frame > 20 && Math.floor(ola) === c;
          const p = ola - Math.floor(ola);
          const peso = random(`w${c}-${i}-${j}`);
          return (
            <g key={`${c}-${i}-${j}`}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={viva && peso > 0.5 ? T.acento : T.linea} strokeWidth={1 + peso * 2.5} opacity={viva ? 0.9 : 0.5} />
              {viva && peso > 0.55 && <circle cx={x1 + (x2 - x1) * p} cy={y1 + (y2 - y1) * p} r="5" fill={T.cian} />}
            </g>
          );
        })))}
        {pos.map((cap, c) => cap.map(([x, y], i) => {
          const act = frame > 20 && ola >= c && random(`a${c}-${i}`) > 0.35;
          return <circle key={`n${c}-${i}`} cx={x} cy={y} r={22 * sp(4 + c * 4)} fill={act ? T.acento : T.fondo2} stroke={act ? T.acento : T.tenue} strokeWidth="3" />;
        }))}
      </svg>
      <div style={{ position: 'absolute', left: 90, top: 400, width: 300, textAlign: 'center', opacity: sp(10) }}>
        <div style={{ width: 150, height: 150, margin: '0 auto', borderRadius: 24, background: T.fondo2, border: `2px solid ${T.linea}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic n="Image" size={80} color={T.cian} /></div>
        <div style={{ fontSize: 24, color: T.tenue, marginTop: 12 }}>{e.entrada}</div>
      </div>
      <div style={{ position: 'absolute', left: 1320, top: 430, width: 240, opacity: sp(70), transform: `scale(${0.6 + 0.4 * sp(70, { stiffness: 300, damping: 14 })})` }}>
        <div style={{ background: T.acento, color: T.fondo, borderRadius: 16, padding: '16px 18px', fontFamily: SG, fontWeight: 700, fontSize: 40, textAlign: 'center' }}>{e.salida}</div>
      </div>
      {e.texto && <div style={{ position: 'absolute', left: 120, right: 120, top: 790, textAlign: 'center' }}><Texto T={T} d={60} tam={28}>{e.texto}</Texto></div>}
    </Escena>
  );
};

const COLORES = (T) => [T.acento, T.cian, '#9b87f5', '#5fb27c', '#f2a900', '#e5484d'];

const Tokens = ({ T, e }) => {
  const { frame, sp } = useT();
  // Partición simple: palabras y signos; las palabras largas se parten en dos (como hace un tokenizador).
  const piezas = useMemo(() => (e.frase ?? '').split(/(\s+|[.,;:¿?¡!])/).filter((x) => x && x.trim()).flatMap((w) => (w.length > 7 ? [w.slice(0, Math.ceil(w.length / 2)), w.slice(Math.ceil(w.length / 2))] : [w])), [e.frase]);
  const parte = interpolate(frame, [30, 50], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <Escena T={T} kicker={e.kicker ?? 'Tokens'}>
      <div style={{ position: 'absolute', left: 120, top: 120 }}><Titulo T={T} texto={e.titulo} resalta={e.resalta} tam={60} ancho={1360} /></div>
      <div style={{ position: 'absolute', left: 100, right: 100, top: 360, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: `${30 * parte}px ${4 + 18 * parte}px` }}>
        {piezas.map((p, i) => {
          const c = COLORES(T)[i % 6];
          const s = sp(34 + i * 3, { stiffness: 320, damping: 18 });
          return (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: SG, fontWeight: 700, fontSize: 64, padding: `${6 * parte}px ${16 * parte}px`, borderRadius: 14, background: `${c}${Math.round(parte * 40).toString(16).padStart(2, '0')}`, border: `2px solid ${parte > 0.5 ? c : 'transparent'}`, color: T.tinta }}>{p}</div>
              <Mono style={{ fontSize: 20, color: c, opacity: s, display: 'block', marginTop: 8 }}>{Math.floor(random(`id${p}`) * 90000) + 1000}</Mono>
            </div>
          );
        })}
      </div>
      {e.texto && <div style={{ position: 'absolute', left: 120, right: 120, top: 720, textAlign: 'center' }}><Texto T={T} d={60} tam={28}>{e.texto}</Texto></div>}
    </Escena>
  );
};

const Prediccion = ({ T, e }) => {
  const { frame, sp } = useT();
  const frase = e.frase ?? '';
  const n = Math.floor(interpolate(frame, [12, 42], [0, frase.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const ops = e.opciones ?? [];
  const elegida = frame > 110;
  const se = sp(110, { stiffness: 300, damping: 16 });
  return (
    <Escena T={T} kicker={e.kicker ?? 'La siguiente palabra'}>
      <div style={{ position: 'absolute', left: 120, top: 120 }}><Titulo T={T} texto={e.titulo} resalta={e.resalta} tam={58} ancho={1360} /></div>
      <div style={{ position: 'absolute', left: 120, top: 300, fontFamily: SG, fontWeight: 700, fontSize: 62, color: T.tinta }}>
        {frase.slice(0, n)}{' '}
        {elegida ? <span style={{ color: T.acento, display: 'inline-block', transform: `scale(${0.6 + 0.4 * se})` }}>{ops[0]?.p}</span> : <span style={{ color: T.acento, opacity: Math.floor(frame / 8) % 2 }}>▍</span>}
      </div>
      <div style={{ position: 'absolute', left: 120, top: 430, width: 1100 }}>
        {ops.map((o, i) => {
          const s = sp(46 + i * 7);
          const w = interpolate(frame, [50 + i * 7, 90 + i * 7], [0, o.prob], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const gana = i === 0 && elegida;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 18, opacity: s }}>
              <div style={{ width: 220, fontSize: 34, fontWeight: 700, color: gana ? T.acento : T.tinta, textAlign: 'right' }}>{o.p}</div>
              <div style={{ flex: 1, height: 44, background: T.fondo2, borderRadius: 10, overflow: 'hidden', border: `1px solid ${T.linea}` }}>
                <div style={{ width: `${w * 100}%`, height: '100%', background: i === 0 ? T.acento : T.cian, opacity: i === 0 ? 1 : 0.6 }} />
              </div>
              <Mono style={{ width: 110, fontSize: 26, color: T.tenue }}>{Math.round(w * 100)} %</Mono>
            </div>
          );
        })}
      </div>
    </Escena>
  );
};

const Nube = ({ T, e }) => {
  const { frame, sp } = useT();
  const baja = sp(30, { stiffness: 120, damping: 18 });
  return (
    <Escena T={T} kicker={e.kicker ?? 'La nube'}>
      <div style={{ position: 'absolute', left: 120, top: 110 }}><Titulo T={T} texto={e.titulo} resalta={e.resalta} tam={60} ancho={1360} /></div>
      <div style={{ position: 'absolute', left: 700, top: 230 - baja * 40, opacity: 1 - baja * 0.6, transform: `scale(${1 - baja * 0.3})` }}><Ic n="Cloud" size={200} color={T.cian} sw={1.4} /></div>
      <div style={{ position: 'absolute', left: 230, right: 230, top: 420, display: 'flex', gap: 26, justifyContent: 'center' }}>
        {Array.from({ length: 6 }, (_, r) => {
          const s = sp(34 + r * 5, { stiffness: 260, damping: 20 });
          return (
            <div key={r} style={{ width: 150, height: 330, borderRadius: 12, background: '#11163a', border: `2px solid ${T.linea}`, padding: 12, display: 'flex', flexDirection: 'column', gap: 10, transform: `translateY(${(1 - s) * 200}px)`, opacity: s }}>
              {Array.from({ length: 8 }, (_, u) => (
                <div key={u} style={{ height: 26, borderRadius: 4, background: T.fondo2, display: 'flex', alignItems: 'center', gap: 6, padding: '0 8px' }}>
                  {[0, 1, 2].map((l) => <div key={l} style={{ width: 7, height: 7, borderRadius: 4, background: random(`l${r}${u}${l}${Math.floor(frame / 6)}`) > 0.45 ? (l === 0 ? '#5fb27c' : T.cian) : '#26305a' }} />)}
                  <div style={{ flex: 1, height: 3, background: '#26305a', marginLeft: 6 }} />
                </div>
              ))}
            </div>
          );
        })}
      </div>
      {e.texto && <div style={{ position: 'absolute', left: 120, right: 120, top: 790, textAlign: 'center' }}><Texto T={T} d={50} tam={30}>{e.texto}</Texto></div>}
    </Escena>
  );
};

// --- Barrio 3D con los modelos de Panadería Tycoon ---------------------------------------------
const MODELOS = {
  edificios: ['building-type-a', 'building-type-c', 'building-type-e', 'building-type-h', 'building-type-k', 'building-type-n', 'building-type-q'].map((n) => `juegos/barrio/${n}.glb`),
  arboles: ['juegos/barrio/tree-large.glb', 'juegos/barrio/tree-small.glb'],
  carros: ['sedan', 'taxi', 'suv', 'van', 'delivery'].map((n) => `juegos/carros/${n}.glb`),
};
const useModelos = () => {
  const [m, setM] = useState(null);
  const [h] = useState(() => delayRender('Modelos 3D del barrio'));
  useEffect(() => {
    const L = new GLTFLoader();
    const todos = [...MODELOS.edificios, ...MODELOS.arboles, ...MODELOS.carros];
    Promise.all(todos.map((u) => L.loadAsync(staticFile(u)).then((g) => [u, g.scene])))
      .then((r) => { setM(Object.fromEntries(r)); continueRender(h); })
      .catch((err) => cancelRender(err));
  }, [h]);
  return m;
};
const Barrio = ({ m }) => {
  const frame = useCurrentFrame();
  const { camera } = useThree();
  const escena = useMemo(() => {
    const g = new THREE.Group();
    const piso = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x1c2550 }));
    piso.rotation.x = -Math.PI / 2;
    g.add(piso);
    const via = new THREE.Mesh(new THREE.PlaneGeometry(400, 6), new THREE.MeshStandardMaterial({ color: 0x2a2f4a }));
    via.rotation.x = -Math.PI / 2;
    via.position.y = 0.01;
    g.add(via);
    for (let i = -20; i < 20; i++) {
      const raya = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.15), new THREE.MeshBasicMaterial({ color: 0xffd76a }));
      raya.rotation.x = -Math.PI / 2;
      raya.position.set(i * 3, 0.02, 0);
      g.add(raya);
    }
    for (let i = -14; i <= 14; i++) {
      for (const lado of [-1, 1]) {
        const u = MODELOS.edificios[Math.floor(random(`b${i}${lado}`) * MODELOS.edificios.length)];
        const b = m[u].clone();
        b.scale.setScalar(3.2);
        b.position.set(i * 5.2, 0, lado * 8);
        b.rotation.y = lado > 0 ? Math.PI : 0;
        g.add(b);
        if (random(`a${i}${lado}`) > 0.5) {
          const a = m[MODELOS.arboles[i & 1]].clone();
          a.scale.setScalar(2.4);
          a.position.set(i * 5.2 + 2.6, 0, lado * 4.6);
          g.add(a);
        }
      }
    }
    const carros = MODELOS.carros.map((u, k) => {
      const c = m[u].clone();
      c.scale.setScalar(1.3);
      g.add(c);
      return { c, carril: k % 2 ? 1.4 : -1.4, v: 0.18 + k * 0.03, off: k * 17 };
    });
    g.userData.carros = carros;
    return g;
  }, [m]);
  for (const { c, carril, v, off } of escena.userData.carros) {
    const dir = carril > 0 ? -1 : 1;
    const x = ((((frame * v + off) % 90) + 90) % 90) - 45;
    c.position.set(x * dir, 0, carril);
    c.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  }
  const t = frame / 30;
  camera.position.set(-18 + t * 1.6, 9 + Math.sin(t / 3) * 0.8, 17);
  camera.lookAt(-6 + t * 1.6, 1.5, 0);
  return <primitive object={escena} />;
};
const Ciudad = ({ T, e }) => {
  const m = useModelos();
  const { width, height } = useVideoConfig();
  const { frame } = useT();
  return (
    <Escena T={T} kicker={e.kicker ?? 'En la vida real'} sinFondo>
      <AbsoluteFill style={{ background: '#0a1330' }}>
        {m && (
          <ThreeCanvas width={width} height={height} camera={{ fov: 45, near: 0.5, far: 600 }} gl={{ antialias: true }}>
            <color attach="background" args={['#0a1330']} />
            <fog attach="fog" args={['#0a1330', 30, 90]} />
            <hemisphereLight args={[0xdfefff, 0x1a2a5a, 1.5]} />
            <directionalLight position={[20, 30, 10]} intensity={2.2} />
            <Barrio m={m} />
          </ThreeCanvas>
        )}
        {/* Un avión cruza el cielo, como en la presentación. */}
        <div style={{ position: 'absolute', top: 70, left: -120 + ((frame * 5) % 1900) }}><Ic n="Plane" size={56} color={T.acento} sw={2} style={{ transform: 'rotate(45deg)' }} /></div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${T.fondo}f0 0%, ${T.fondo}80 30%, transparent 55%)` }} />
      <div style={{ position: 'absolute', left: 110, top: 120 }}>
        <Titulo T={T} texto={e.titulo} resalta={e.resalta} tam={64} ancho={1380} />
        {e.texto && <Texto T={T} d={20} tam={30} style={{ marginTop: 16, maxWidth: 1100, color: T.tinta }}>{e.texto}</Texto>}
      </div>
    </Escena>
  );
};

const Alucina = ({ T, e }) => {
  const { sp } = useT();
  const citas = e.citas ?? [];
  return (
    <Escena T={T} kicker={e.kicker ?? 'Alucinación'}>
      <div style={{ position: 'absolute', left: 110, top: 110 }}><Titulo T={T} texto={e.titulo} resalta={e.resalta} tam={58} ancho={1380} /></div>
      <div style={{ position: 'absolute', left: 110, right: 110, top: 290, display: 'flex', gap: 30, justifyContent: 'center', flexWrap: 'wrap' }}>
        {citas.slice(0, 6).map((c, i) => {
          const s = sp(14 + i * 6);
          const sello = sp(50 + i * 12, { stiffness: 420, damping: 16 });
          return (
            <div key={i} style={{ position: 'relative', width: 400, minHeight: 180, background: '#f4f1e8', borderRadius: 10, padding: '20px 22px', color: '#1d2440', opacity: s, transform: `translateY(${(1 - s) * 40}px) rotate(${(random(`r${i}`) - 0.5) * 4}deg)`, boxShadow: '0 16px 30px rgba(0,0,0,.35)' }}>
              <Mono style={{ fontSize: 14, color: '#6b7299' }}>Cita {i + 1}</Mono>
              <div style={{ fontSize: 24, fontWeight: 600, marginTop: 8, lineHeight: 1.3 }}>{c}</div>
              {[0, 1].map((l) => <div key={l} style={{ height: 8, background: '#d9d4c4', borderRadius: 4, marginTop: 12, width: `${80 - l * 25}%` }} />)}
              <div style={{ position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%,-50%) rotate(-14deg) scale(${2.4 - 1.4 * sello})`, opacity: sello, border: '5px solid #e5484d', color: '#e5484d', borderRadius: 10, padding: '6px 16px', fontFamily: SG, fontWeight: 800, fontSize: 40, whiteSpace: 'nowrap', background: '#f4f1e8cc' }}>NO EXISTE</div>
            </div>
          );
        })}
      </div>
      {e.texto && <div style={{ position: 'absolute', left: 120, right: 120, top: 790, textAlign: 'center' }}><Texto T={T} d={60 + citas.length * 12} tam={30}>{e.texto}</Texto></div>}
    </Escena>
  );
};

const Contexto = ({ T, e }) => {
  const { frame, sp } = useT();
  const lineas = 40;
  const scroll = frame * 1.4;
  return (
    <Escena T={T} kicker={e.kicker ?? 'Ventana de contexto'}>
      <div style={{ position: 'absolute', left: 110, top: 110 }}><Titulo T={T} texto={e.titulo} resalta={e.resalta} tam={58} ancho={760} /></div>
      {e.texto && <div style={{ position: 'absolute', left: 110, top: 380, width: 640 }}><Texto T={T} d={24} tam={30}>{e.texto}</Texto></div>}
      <div style={{ position: 'absolute', left: 900, top: 90, width: 560, height: 720, borderRadius: 16, background: '#0d1233', overflow: 'hidden', border: `2px solid ${T.linea}`, opacity: sp(8) }}>
        {Array.from({ length: lineas }, (_, i) => {
          const y = ((i * 34 - scroll) % (lineas * 34) + lineas * 34) % (lineas * 34) - 20;
          const dentro = y > 230 && y < 470;
          return <div key={i} style={{ position: 'absolute', left: 30, top: y, height: 14, borderRadius: 7, width: `${50 + random(`ln${i}`) * 42}%`, background: dentro ? T.cian : '#2a3260', opacity: dentro ? 0.95 : 0.35 }} />;
        })}
        <div style={{ position: 'absolute', left: 12, right: 12, top: 216, height: 270, border: `4px solid ${T.acento}`, borderRadius: 14, boxShadow: `0 0 0 2000px ${T.fondo}88, 0 0 40px ${T.acento}55` }} />
        <div style={{ position: 'absolute', right: 24, top: 186, background: T.acento, color: T.fondo, borderRadius: 999, padding: '4px 14px' }}><Mono style={{ fontSize: 14, color: T.fondo }}>lo que ve</Mono></div>
      </div>
    </Escena>
  );
};

const Riesgo = ({ T, e }) => {
  const { sp } = useT();
  const pisos = e.pisos ?? [];
  const col = ['#e5484d', '#ff8a3d', '#f2c200', '#5fb27c'];
  return (
    <Escena T={T} kicker={e.kicker ?? 'Regulación por riesgo'}>
      <div style={{ position: 'absolute', left: 110, top: 110 }}><Titulo T={T} texto={e.titulo} resalta={e.resalta} tam={56} ancho={1380} /></div>
      {pisos.map((p, i) => {
        const k = pisos.length - 1 - i; // se arma de abajo hacia arriba
        const s = sp(12 + k * 10, { stiffness: 260, damping: 18 });
        const w = 260 + i * 150;
        return (
          <div key={i} style={{ position: 'absolute', top: 280 + i * 132, left: 480 - w / 2, width: w, height: 116, opacity: s, transform: `translateY(${(1 - s) * -60}px)` }}>
            <div style={{ position: 'absolute', inset: 0, background: col[i % 4], clipPath: 'polygon(12% 0, 88% 0, 100% 100%, 0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: SG, fontWeight: 700, fontSize: 30, color: '#10142e' }}>{p.nombre}</span>
            </div>
            <div style={{ position: 'absolute', left: w + 50 + (3 - i) * 75, top: 30, width: 620, fontSize: 26, color: T.tinta, opacity: sp(30 + k * 10) }}>
              <span style={{ color: col[i % 4], fontWeight: 700 }}>—</span> {p.ejemplo}
            </div>
          </div>
        );
      })}
    </Escena>
  );
};

/** Programas que se abren, muestran una función y se cierran, con un cursor que hace clic. */
const Apps = ({ T, e }) => {
  const { frame, D } = useT();
  const apps = e.apps ?? [];
  const n = Math.max(1, apps.length);
  const tramo = (D - 20) / n;
  const k = Math.min(n - 1, Math.floor(Math.max(0, frame - 14) / tramo));
  const f = frame - 14 - k * tramo;
  const abre = spring({ frame: f, fps: 30, config: { stiffness: 220, damping: 20 } });
  const cierra = interpolate(f, [tramo - 10, tramo], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const a = apps[k] ?? {};
  const escrito = (a.accion ?? '').slice(0, Math.max(0, Math.floor((f - 20) * 1.1)));
  const cx = interpolate(f, [0, 18], [1300, 820], { extrapolateRight: 'clamp' });
  const cy = interpolate(f, [0, 18], [800, 640], { extrapolateRight: 'clamp' });
  const clic = f > 18 && f < 26;
  return (
    <Escena T={T} kicker={e.kicker ?? 'La IA en tus programas'}>
      <div style={{ position: 'absolute', left: 110, top: 110 }}><Titulo T={T} texto={e.titulo} resalta={e.resalta} tam={56} ancho={1380} /></div>
      {/* Dock con todas las apps: la activa se ilumina. */}
      <div style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 18, background: `${T.fondo2}ee`, border: `1px solid ${T.linea}`, borderRadius: 22, padding: '12px 20px' }}>
        {apps.map((x, i) => (
          <div key={i} style={{ width: 64, height: 64, borderRadius: 16, background: i === k ? `${T.acento}33` : T.fondo, border: `2px solid ${i === k ? T.acento : T.linea}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ic n={x.icono} size={34} color={i === k ? T.acento : T.tenue} />
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', left: 260, top: 250, width: 1080, height: 470, borderRadius: 18, background: '#f6f7fb', overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,.45)',
        transform: `scale(${0.3 + 0.7 * abre * cierra}) translateY(${(1 - abre) * 300}px)`, opacity: Math.min(abre, cierra), transformOrigin: '50% 100%' }}>
        <div style={{ height: 52, background: '#e8eaf2', display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px' }}>
          {['#ff5f57', '#febc2e', '#28c840'].map((c) => <div key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c }} />)}
          <Ic n={a.icono} size={24} color="#1d2440" style={{ marginLeft: 14 }} />
          <span style={{ fontSize: 22, fontWeight: 700, color: '#1d2440' }}>{a.nombre}</span>
        </div>
        <div style={{ display: 'flex', height: 418 }}>
          <div style={{ width: 220, background: '#eef0f6', padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[70, 55, 80, 45, 60].map((w, i) => <div key={i} style={{ height: 14, width: `${w}%`, borderRadius: 7, background: '#d5d9e6' }} />)}
          </div>
          <div style={{ flex: 1, padding: 28 }}>
            {[90, 75, 85, 60].map((w, i) => <div key={i} style={{ height: 16, width: `${w}%`, borderRadius: 8, background: '#e3e6ef', marginBottom: 16 }} />)}
            <div style={{ marginTop: 26, background: '#fff', border: '2px solid #d97757', borderRadius: 14, padding: '18px 22px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <Ic n="Sparkle" size={28} color="#d97757" />
              <div style={{ fontSize: 28, color: '#1d2440', fontWeight: 600, lineHeight: 1.35 }}>{escrito}<span style={{ color: '#d97757' }}>{escrito.length < (a.accion ?? '').length ? '|' : ''}</span></div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: cx, top: cy, transform: `scale(${clic ? 0.85 : 1})` }}>
        <Ic n="MousePointer2" size={46} color="#ffffff" sw={2} style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,.5))', fill: '#1d2440' }} />
        {clic && <div style={{ position: 'absolute', left: -14, top: -14, width: 40, height: 40, borderRadius: 20, border: `3px solid ${T.acento}`, opacity: 1 - (f - 18) / 8 }} />}
      </div>
    </Escena>
  );
};

const Planeta = ({ clase, T, e }) => {
  const { durationInFrames, fps } = useVideoConfig();
  const mapa = clase.remontaje.mapa;
  const escenas = useMemo(() => [{ parada: 'ATL', dura: durationInFrames / fps, vista: 'lejos', centro: [25, -40], off: [-0.18, 0] }], [durationInFrames, fps]);
  return (
    <Escena T={T} kicker={e.kicker ?? 'El planeta'} sinFondo>
      <AbsoluteFill><Globo escenas={escenas} mapa={mapa} /></AbsoluteFill>
      <AbsoluteFill style={{ background: `linear-gradient(90deg, ${T.fondo}f2 0%, ${T.fondo}a0 45%, transparent 70%)` }} />
      <div style={{ position: 'absolute', left: 110, top: 220, width: 820 }}>
        <Titulo T={T} texto={e.titulo} resalta={e.resalta} tam={70} ancho={820} />
        {e.texto && <Texto T={T} d={20} tam={32} style={{ marginTop: 22 }}>{e.texto}</Texto>}
      </div>
    </Escena>
  );
};

const Cifra = ({ T, e }) => {
  const { frame, sp } = useT();
  const u = interpolate(frame, [10, 70], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const v = Math.round(Number(e.numero) * (1 - Math.pow(1 - u, 3)));
  const golpe = sp(70, { stiffness: 400, damping: 12 });
  return (
    <Escena T={T} kicker={e.kicker}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 100 }}>
        <div style={{ fontFamily: SG, fontWeight: 700, fontSize: String(v).length > 9 ? 150 : 210, letterSpacing: '-0.04em', color: T.tinta, lineHeight: 1, transform: `scale(${1 + 0.06 * golpe * (u >= 1 ? 1 : 0)})`, textShadow: `0 0 60px ${T.acento}55` }}>
          {e.prefijo}{v.toLocaleString('es-CO')}<span style={{ color: T.acento }}>{e.sufijo}</span>
        </div>
        {e.texto && <Texto T={T} d={40} tam={38} style={{ marginTop: 34, maxWidth: 1200, color: T.tinta }}>{e.texto}</Texto>}
      </AbsoluteFill>
    </Escena>
  );
};

const Comparacion = ({ T, e }) => {
  const { sp } = useT();
  const Col = ({ c, lado, d }) => {
    const s = sp(d, { stiffness: 200, damping: 20 });
    return (
      <div style={{ width: 600, background: `${T.fondo2}ee`, border: `2px solid ${lado < 0 ? T.cian : T.acento}`, borderRadius: 24, padding: 36, transform: `translateX(${(1 - s) * lado * 300}px)`, opacity: s }}>
        <Ic n={c.icono} size={64} color={lado < 0 ? T.cian : T.acento} />
        <div style={{ fontFamily: SG, fontWeight: 700, fontSize: 50, marginTop: 14 }}>{c.titulo}</div>
        {(c.puntos ?? []).map((p, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, fontSize: 27, color: T.tenue, marginTop: 16, opacity: sp(d + 14 + i * 7), lineHeight: 1.35 }}>
            <span style={{ color: lado < 0 ? T.cian : T.acento, fontWeight: 700 }}>—</span><span>{p}</span>
          </div>
        ))}
      </div>
    );
  };
  const vs = sp(24, { stiffness: 380, damping: 12 });
  return (
    <Escena T={T} kicker={e.kicker}>
      <div style={{ position: 'absolute', left: 110, top: 110 }}><Titulo T={T} texto={e.titulo} resalta={e.resalta} tam={56} ancho={1380} /></div>
      <div style={{ position: 'absolute', left: 110, right: 110, top: 270, display: 'flex', justifyContent: 'space-between' }}>
        <Col c={e.izq ?? {}} lado={-1} d={8} />
        <Col c={e.der ?? {}} lado={1} d={14} />
      </div>
      <div style={{ position: 'absolute', left: 800 - 50, top: 440, width: 100, height: 100, borderRadius: 50, background: T.acento, color: T.fondo, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SG, fontWeight: 800, fontSize: 38, transform: `scale(${vs})` }}>VS</div>
    </Escena>
  );
};

const Lista = ({ T, e }) => {
  const { frame, D, sp } = useT();
  const items = e.items ?? [];
  const paso = Math.max(14, Math.min(40, (D - 60) / Math.max(1, items.length)));
  return (
    <Escena T={T} kicker={e.kicker}>
      <div style={{ position: 'absolute', left: 120, top: 110 }}><Titulo T={T} texto={e.titulo} resalta={e.resalta} tam={58} ancho={1360} /></div>
      <div style={{ position: 'absolute', left: 120, top: 270, right: 120, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {items.map((it, i) => {
          const d = 16 + i * paso;
          const s = sp(d);
          const ok = frame > d + 12;
          const k = sp(d + 12, { stiffness: 420, damping: 16 });
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 24, opacity: s, transform: `translateX(${(1 - s) * -40}px)`, background: ok ? `${T.acento}14` : 'transparent', borderRadius: 16, padding: '12px 18px' }}>
              <div style={{ width: 54, height: 54, borderRadius: 14, border: `3px solid ${ok ? T.acento : T.linea}`, background: ok ? T.acento : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {ok && <Ic n="Check" size={36} color={T.fondo} sw={3} style={{ transform: `scale(${k})` }} />}
              </div>
              <span style={{ fontSize: 36, fontWeight: 600, color: T.tinta }}>{it}</span>
            </div>
          );
        })}
      </div>
    </Escena>
  );
};

const Frase = ({ T, e }) => {
  const { D } = useT();
  const { fps } = useVideoConfig();
  const palabras = String(e.texto ?? '').split(' ');
  const frame = useCurrentFrame();
  const fin = Math.min(D * 0.7, palabras.length * 9 + 20);
  return (
    <Escena T={T} kicker={e.kicker ?? 'En palabras del profesor'}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: '0 130px' }}>
        <div style={{ fontFamily: SG, fontWeight: 700, fontSize: palabras.length > 14 ? 70 : 90, lineHeight: 1.1, letterSpacing: '-0.03em', textAlign: 'center', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: 22 }}>
          <span style={{ color: T.acento }}>«</span>
          {palabras.map((p, i) => {
            const s = spring({ frame: frame - (10 + (fin - 10) * (i / palabras.length)), fps, config: { stiffness: 320, damping: 22 } });
            return <span key={i} style={{ display: 'inline-block', opacity: s, transform: `translateY(${(1 - s) * 24}px)`, color: (e.resalta ?? []).includes(p) ? T.acento : T.tinta }}>{p}</span>;
          })}
          <span style={{ color: T.acento }}>»</span>
        </div>
      </AbsoluteFill>
    </Escena>
  );
};

const TIPOS = { titular: Titular, personaje: Personaje, linea: Linea, turing: Turing, bits: Bits, red: Red, tokens: Tokens, prediccion: Prediccion, nube: Nube, ciudad: Ciudad, alucina: Alucina, contexto: Contexto, riesgo: Riesgo, apps: Apps, planeta: Planeta, cifra: Cifra, comparacion: Comparacion, lista: Lista, frase: Frase };
export const TIPOS_CONTEXTO = Object.keys(TIPOS);

export const EscenaContexto = ({ clase, e }) => {
  useFuentes();
  const C = TIPOS[e.tipo];
  if (!C) throw new Error(`Escena contextual desconocida: ${e.tipo}`);
  return <C clase={clase} T={clase.tema} e={e} />;
};
