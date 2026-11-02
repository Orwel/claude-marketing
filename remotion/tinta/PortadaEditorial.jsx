import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Img, cancelRender, continueRender, delayRender, random, staticFile } from 'remotion';
import { fuente, useFuentes } from '../fuentes.js';

/**
 * Portada editorial para reels (nov-2026), artistica y de serie, con identidad propia: grotesca
 * condensada gigante con la palabra clave en la serif italica de la marca (en el acento), el objeto
 * protagonista dibujado a lapiz (src/archivo/trazos.py) cortado por el borde, etiqueta con flecha,
 * numero de serie («N.º 01»), logo visible y flecha en circulo, fibras y grano de papel. Todo se
 * reparte en el recuadro 3:4 que muestra la cuadricula del perfil (ver `G`).
 *
 * Props: { titular: [lineas; la que empieza con * va en serif y acento], etiqueta, serie, firma (numero), trazos, tinta, papel, acento, logo }.
 */
export const PortadaEditorial = ({ titular = [], etiqueta, serie, firma, trazos, tinta = '#121110', papel = '#E7E3DA', acento = '#F26B1D', logo }) => {
  useFuentes();
  const d = useJSON(trazos);
  const W = 1080;
  const H = 1920;
  const cond = { ...fuente({ familia: 'Inter', peso: 800 }), letterSpacing: '-0.055em', lineHeight: 0.84, textTransform: 'uppercase', color: tinta, transform: 'scaleX(0.82)', transformOrigin: 'left top', whiteSpace: 'nowrap' };
  // Cuadricula del perfil de Instagram: muestra un recorte 3:4 centrado del 1080x1920, o sea la franja
  // y 240-1680 a todo el ancho. Se disena para ese recuadro con margenes de ~9 % (95 px), como las cuentas
  // de referencia; lo que queda fuera (arriba y abajo) solo se ve al abrir el reel y es fondo.
  const G = { x: 95, y: 240 + 70, w: W - 190, h: 1440 - 140 };
  const ancho = 820;
  const s = d ? ancho / d.ancho : 1;
  const serif = { ...fuente({ familia: 'Fraunces', peso: 600 }), fontStyle: 'italic', letterSpacing: '-0.03em', lineHeight: 0.9 };
  const chico = { ...fuente({ familia: 'Inter', peso: 600 }), fontSize: 24, letterSpacing: '0.02em', color: tinta, lineHeight: 1.15 };
  return (
    <AbsoluteFill style={{ background: papel, overflow: 'hidden' }}>
      {/* Fibras de papel */}
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        {Array.from({ length: 260 }, (_, i) => {
          const x = random(`fx${i}`) * W;
          const y = random(`fy${i}`) * H;
          const a = random(`fa${i}`) * Math.PI;
          const l = 6 + random(`fl${i}`) * 26;
          return <line key={i} x1={x} y1={y} x2={x + Math.cos(a) * l} y2={y + Math.sin(a) * l} stroke={tinta} strokeOpacity={0.09} strokeWidth={1} />;
        })}
      </svg>

      {/* El objeto: el retrato a lapiz, a la derecha, cortado por el borde inferior del recuadro 3:4 */}
      {d ? (
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          <g transform={`translate(${W - ancho + 150} ${1680 - d.alto * s + 300}) scale(${s})`}>
            {d.manchas.map((m, i) => <path key={`m${i}`} d={m} fill={tinta} opacity={0.88} />)}
            {(d.sombras ?? []).map((sd, i) => <path key={`s${i}`} d={sd} stroke={tinta} strokeWidth={1.6 / s} opacity={0.8} />)}
            {d.trazos.map((t, i) => <path key={`t${i}`} d={t.d} fill="none" stroke={tinta} strokeWidth={3.2 / s} strokeLinecap="round" strokeLinejoin="round" />)}
          </g>
        </svg>
      ) : null}

      {/* Esquinas de arriba: tema y numero de la serie */}
      <div style={{ position: 'absolute', left: G.x, right: W - G.x - G.w, top: G.y, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ ...chico, width: 260 }}>{serie}</span>
        <span style={{ ...serif, fontSize: 44, color: tinta }}>{firma}</span>
      </div>

      {/* Titular: grotesca condensada y la palabra clave en la serif italica de la marca */}
      <div style={{ position: 'absolute', left: G.x - 6, top: G.y + 100 }}>
        {titular.map((l, i) => (l.startsWith('*')
          ? <div key={i} style={{ ...serif, fontSize: 190, color: acento, marginTop: 4, marginLeft: 6 }}>{l.replace(/\*/g, '')}</div>
          : <div key={i} style={{ ...cond, fontSize: 250 }}>{l}</div>))}
      </div>

      {/* Etiqueta con flecha, a media altura a la izquierda */}
      {etiqueta ? (
        <div style={{ position: 'absolute', left: G.x, top: G.y + 860, display: 'flex', alignItems: 'center', gap: 16 }}>
          <svg width={120} height={30}><path d="M 4 15 L 112 15 M 98 4 L 114 15 L 98 26" stroke={tinta} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span style={{ ...serif, fontSize: 60, color: tinta }}>{etiqueta}</span>
        </div>
      ) : null}

      {/* Pie del recuadro: logo visible a la izquierda y flecha en circulo a la derecha */}
      {logo ? <Img src={staticFile(logo)} style={{ position: 'absolute', left: G.x, top: G.y + G.h - 60, height: 56, filter: 'brightness(0)' }} /> : null}
      <svg width={64} height={64} style={{ position: 'absolute', left: G.x + G.w - 64, top: G.y + G.h - 64 }}>
        <circle cx={32} cy={32} r={29} fill={papel} stroke={tinta} strokeWidth={3} />
        <path d="M 19 32 L 44 32 M 35 23 L 45 32 L 35 41" stroke={tinta} strokeWidth={3.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {/* Grano fino */}
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0, mixBlendMode: 'multiply' }}>
        {Array.from({ length: 900 }, (_, i) => (
          <circle key={i} cx={random(`gx${i}`) * W} cy={random(`gy${i}`) * H} r={0.6 + random(`gr${i}`) * 1.2} fill={tinta} opacity={0.06 + random(`go${i}`) * 0.1} />
        ))}
      </svg>
    </AbsoluteFill>
  );
};

function useJSON(ruta) {
  const [datos, setDatos] = useState(null);
  const [espera] = useState(() => delayRender('portada'));
  useEffect(() => {
    if (!ruta) { continueRender(espera); return; }
    fetch(staticFile(ruta)).then((r) => r.json()).then((d) => { setDatos(d); continueRender(espera); }).catch((e) => cancelRender(e));
  }, []);
  return datos;
}
