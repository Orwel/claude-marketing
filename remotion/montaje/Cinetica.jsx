import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { fuente } from '../fuentes.js';
import { useMarca } from '../marca.js';
import { conAlfa } from '../util.js';

/**
 * Tipografia cinetica de un golpe (ver golpesDe en linea.js): la frase que Juan
 * David esta diciendo, palabra por palabra en el cuadro en que la dice, y la
 * palabra clave que explota letra por letra. Nada queda quieto: las palabras
 * chicas entran con resorte y giro, la clave cae letra a letra, ondula mientras
 * esta en pantalla, deja una onda expansiva y un estallido de trazos, y al final
 * todo sale volando en cascada.
 *
 * Cuatro estilos para no repetir (27-sep-2026: "juegale mas a la tipografia pero
 * con animaciones amazing"):
 *  - golpe: sans pesada en mayusculas, sombras escalonadas de marca.
 *  - serif: titulo en italica, color de acento, letras que suben girando.
 *  - pastilla: la clave dentro de una pastilla de acento que rebota.
 *  - contorno: la clave en contorno que se llena de color de izquierda a derecha.
 * Sin desenfoques ni backdrop-filter: en el render no hay GPU.
 */
const azar = (n) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

export const Cinetica = ({ g }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const marca = useMarca();
  const { colores } = marca;
  const sale = Math.max(0, frame - (durationInFrames - 9));
  const antes = g.palabras.filter((_, i) => i < g.palabras.findIndex((p) => p.clave));
  const clave = g.palabras.find((p) => p.clave);
  const despues = g.palabras.slice(g.palabras.findIndex((p) => p.clave) + 1);

  const chica = (p, i, base) => {
    const a = spring({ frame: frame - p.cuadro, fps, config: { damping: 12, stiffness: 200, mass: 0.6 } });
    const giro = (azar(base + i) - 0.5) * 16;
    const fuga = Math.max(0, sale - i * 1.2);
    return (
      <span
        key={`${base}-${i}`}
        style={{
          display: 'inline-block',
          margin: '0 0.14em',
          opacity: Math.min(1, a * 1.5) * (1 - Math.min(1, fuga / 6)),
          transform: `translateY(${(1 - a) * 40 - fuga * 14}px) rotate(${(1 - a) * giro}deg) scale(${0.6 + 0.4 * Math.min(1, a)})`,
        }}
      >
        {p.text}
      </span>
    );
  };

  const estiloChicas = {
    ...fuente(g.estilo === 'serif' ? marca.fuentes.texto : marca.fuentes.enfasis),
    fontSize: 64,
    lineHeight: 1.1,
    color: '#FFFFFF',
    textShadow: '0 4px 18px rgba(0,0,0,.85), 0 2px 4px rgba(0,0,0,.9)',
    textAlign: 'center',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 980 }}>
      {antes.length ? <div style={estiloChicas}>{antes.map((p, i) => chica(p, i, 1))}</div> : null}
      {clave ? <Clave p={clave} estilo={g.estilo} sale={sale} /> : null}
      {despues.length ? <div style={estiloChicas}>{despues.map((p, i) => chica(p, i + 3, 7))}</div> : null}
    </div>
  );
};

const Clave = ({ p, estilo, sale }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const { colores } = marca;
  const texto = p.text.replace(/[,.;:?!¿¡]+/g, '');
  const letras = [...(estilo === 'serif' ? texto : texto.toUpperCase())];
  const local = frame - p.cuadro;
  const serif = estilo === 'serif';
  // Que quepa en 960 px: la sans pesada ocupa ~0,66 del cuerpo por letra, la serif ~0,52.
  const tamano = Math.min(serif ? 150 : 140, Math.round(960 / ((serif ? 0.52 : 0.66) * letras.length)));
  const sombra = `4px 4px 0 ${colores.secundario ?? colores.acento}, 9px 9px 0 ${colores.acento}`;
  const base =
    estilo === 'serif'
      ? { ...fuente(marca.fuentes.titulo), fontStyle: 'italic', color: colores.acento, textShadow: '0 10px 36px rgba(0,0,0,.6)' }
      : estilo === 'pastilla'
        ? { ...fuente({ familia: marca.fuentes.enfasis.familia, peso: 900 }), color: marca.claro || marca.id === 'contrappto' ? '#FFFFFF' : colores.fondo }
        : estilo === 'contorno'
          ? { ...fuente({ familia: marca.fuentes.enfasis.familia, peso: 900 }), color: 'transparent', WebkitTextStroke: `3px ${colores.acento}` }
          : { ...fuente({ familia: marca.fuentes.enfasis.familia, peso: 900 }), color: colores.tinta, textShadow: sombra };
  const impacto = Math.min(1, Math.max(0, local / 16));
  const llenado = interpolate(local, [6, 22], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pastilla = spring({ frame: local, fps, config: { damping: 9, stiffness: 170, mass: 0.8 } });

  const palabra = (
    <span style={{ position: 'relative', display: 'inline-flex', fontSize: tamano, lineHeight: 1, letterSpacing: serif ? '0' : '-0.02em', whiteSpace: 'nowrap' }}>
      {letras.map((l, i) => {
        const d = local - i * 1.3;
        const a = spring({ frame: d, fps, config: { damping: serif ? 14 : 9, stiffness: serif ? 150 : 260, mass: 0.7 } });
        const r = azar(i + letras.length);
        const onda = d > 12 ? Math.sin((frame - i * 3) / 5) * 5 : 0;
        const fuga = Math.max(0, sale - i * 0.8);
        const entradaY = serif ? 70 : -140;
        const giro = (r - 0.5) * (serif ? 50 : 70);
        return (
          <span
            key={i}
            style={{
              ...base,
              display: 'inline-block',
              whiteSpace: 'pre',
              opacity: Math.min(1, a * 2) * (1 - Math.min(1, fuga / 5)),
              transform: `translateY(${(1 - a) * entradaY + onda - fuga * 22}px) rotate(${(1 - a) * giro + fuga * (r - 0.5) * 30}deg) scale(${(serif ? 0.7 : 1.7) + (1 - (serif ? 0.7 : 1.7)) * Math.min(1.2, a)})`,
            }}
          >
            {l}
          </span>
        );
      })}
      {estilo === 'contorno' ? (
        // El relleno de color avanza de izquierda a derecha sobre el contorno.
        <span aria-hidden style={{ ...base, position: 'absolute', inset: 0, color: colores.acento, WebkitTextStroke: '0px', clipPath: `inset(0 ${100 - llenado}% 0 0)`, display: 'inline-flex', opacity: 1 - Math.min(1, sale / 6) }}>
          {letras.map((l, i) => {
            const d = local - i * 1.3;
            const onda = d > 12 ? Math.sin((frame - i * 3) / 5) * 5 : 0;
            return <span key={i} style={{ display: 'inline-block', whiteSpace: 'pre', transform: `translateY(${onda - Math.max(0, sale - i * 0.8) * 22}px)` }}>{l}</span>;
          })}
        </span>
      ) : null}
    </span>
  );

  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '6px 0' }}>
      {/* Onda expansiva: dos aros que se abren desde la palabra cuando cae. */}
      {[0, 6].map((retardo) => {
        const o = Math.min(1, Math.max(0, (local - retardo) / 18));
        return o > 0 && o < 1 ? (
          <div key={retardo} style={{ position: 'absolute', width: 300 + o * 700, height: 120 + o * 260, borderRadius: '50%', border: `3px solid ${conAlfa(colores.acento, 0.7 * (1 - o))}` }} />
        ) : null;
      })}
      {/* Estallido: trazos que salen disparados desde el centro. */}
      {Array.from({ length: 12 }, (_, i) => {
        const ang = (i / 12) * Math.PI * 2 + azar(i) * 0.4;
        const dist = impacto * (260 + azar(i + 5) * 220);
        return impacto > 0 && impacto < 1 ? (
          <div key={i} style={{ position: 'absolute', width: 34, height: 6, borderRadius: 3, background: i % 3 ? colores.acento : '#FFFFFF', opacity: 1 - impacto, transform: `translate(${Math.cos(ang) * dist}px, ${Math.sin(ang) * dist * 0.5}px) rotate(${ang}rad)` }} />
        ) : null;
      })}
      {estilo === 'pastilla' ? (
        <div style={{ padding: '18px 48px', borderRadius: 999, background: colores.acento, boxShadow: `0 18px 60px ${conAlfa(colores.acento, 0.55)}`, transform: `scale(${Math.max(0, pastilla) * (1 + 0.03 * Math.sin(frame / 4))}) rotate(${(1 - Math.min(1, pastilla)) * -8}deg)`, opacity: 1 - Math.min(1, sale / 6) }}>
          {palabra}
        </div>
      ) : (
        palabra
      )}
      {/* Subrayado que se dibuja bajo la clave (menos en la pastilla, que ya tiene su forma). */}
      {estilo !== 'pastilla' ? (
        <div style={{ position: 'absolute', bottom: -14, height: 10, borderRadius: 5, width: '70%', background: `linear-gradient(90deg, ${colores.acento}, ${colores.secundario ?? colores.acento})`, transform: `scaleX(${interpolate(local, [10, 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) * (1 - Math.min(1, sale / 6))})`, transformOrigin: 'left' }} />
      ) : null}
    </div>
  );
};
