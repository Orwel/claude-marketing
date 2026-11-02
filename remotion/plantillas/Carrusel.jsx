import React from 'react';
import { AbsoluteFill, Freeze, interpolate, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { Firma } from '../componentes/Firma.jsx';
import { fuente, useFuentes } from '../fuentes.js';
import { avance, latido } from '../graficos/base.jsx';
import { ContextoMarca } from '../marca.js';
import { METAFORAS } from '../metaforas/index.js';
import { conAlfa, partirPalabras } from '../util.js';

/**
 * Una lamina de carrusel (4:5) o una story (9:16): metafora animada arriba y
 * texto abajo. Cada lamina se renderiza como su propio MP4 corto porque
 * Instagram arma el carrusel con archivos sueltos; LinkedIn recibe las mismas
 * laminas unidas en un solo video (src/carrusel/render.js).
 *
 * La lamina termina quieta pero viva (latidos): en Instagram un video de
 * carrusel se repite en bucle y un corte seco al volver se nota.
 */
export const Carrusel = ({ pieza, marca, indice }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  // Instagram toma el cuadro 0 como portada: en la primera lamina ese cuadro muestra la lamina ya
  // armada (el ultimo cuadro) y desde el 1 corre la animacion. Sin esto la portada salia vacia (30-sep-2026).
  const portada = indice === 0 && pieza.tipo !== 'historias' && frame === 0;
  return (
    // `pieza.colores` cambia el acento de un producto dentro de la cuenta (Trifuerza Legal: dorado sobre casi negro).
    <ContextoMarca.Provider value={pieza.colores ? { ...marca, colores: { ...marca.colores, ...pieza.colores } } : marca}>
      <Freeze frame={durationInFrames - 1} active={portada}>
        <Lamina pieza={pieza} indice={indice} />
      </Freeze>
    </ContextoMarca.Provider>
  );
};

// Zonas seguras: en story Instagram tapa ~220 px arriba y ~380 abajo; en carrusel casi nada.
const DISENO = {
  carrusel: { lado: 60, arriba: 48, escenario: { y: 112, alto: 500 }, texto: 636, abajo: 48, titulo: 58, cuerpo: 30 },
  cuadrado: { lado: 64, arriba: 60, escenario: { y: 150, alto: 660 }, texto: 850, abajo: 64, titulo: 66, cuerpo: 34 },
  vertical: { lado: 72, arriba: 236, escenario: { y: 360, alto: 660 }, texto: 1070, abajo: 420, titulo: 100, cuerpo: 44 },
};

const Lamina = ({ pieza, indice }) => {
  useFuentes();
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const marca = React.useContext(ContextoMarca);
  const { colores } = marca;
  const d = DISENO[pieza.formato] ?? DISENO.cuadrado;
  const lamina = pieza.laminas[indice];
  const total = pieza.laminas.length;
  const esHistoria = pieza.tipo === 'historias';
  const Metafora = METAFORAS[lamina.metafora];
  if (!Metafora) throw new Error(`Metafora "${lamina.metafora}" no existe (ver remotion/metaforas/index.js)`);
  const primera = indice === 0 && !esHistoria && total > 1;
  const ultima = indice === total - 1 || esHistoria;
  const pie = lamina.pie ?? (ultima ? pieza.pie : null);

  return (
    <AbsoluteFill style={{ color: colores.tinta }}>
      <FondoLamina />
      {/* Cabecera: firma pequena de la cuenta y, en carrusel, el contador de laminas. */}
      <div style={{ position: 'absolute', top: d.arriba, left: d.lado, right: d.lado, display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: avance(frame, 0, 10) }}>
        <Firma tamano={0.42} />
        {!esHistoria && total > 1 ? (
          <span style={{ ...fuente(marca.fuentes.enfasis), fontSize: 26, letterSpacing: '0.12em', color: colores.tenue, fontVariantNumeric: 'tabular-nums' }}>
            {String(indice + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </span>
        ) : null}
      </div>

      <div style={{ position: 'absolute', top: d.escenario.y, left: d.lado - 20, width: width - 2 * (d.lado - 20), height: d.escenario.alto, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Sequence from={6} layout="none">
          <Metafora d={lamina.datos ?? {}} />
        </Sequence>
      </div>

      <div style={{ position: 'absolute', top: d.texto, left: d.lado, right: d.lado, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {lamina.antetitulo ? (
          <span style={{ ...fuente(marca.fuentes.enfasis), fontSize: d.cuerpo * 0.72, letterSpacing: '0.16em', textTransform: 'uppercase', color: colores.acento, ...entrar(avance(frame, 8, 12), 14) }}>
            {lamina.antetitulo}
          </span>
        ) : null}
        <div style={{ ...fuente(marca.fuentes.titulo), fontSize: d.titulo, lineHeight: 1.08, letterSpacing: '-0.02em', display: 'flex', flexWrap: 'wrap', columnGap: d.titulo * 0.24 }}>
          {partirPalabras(lamina.titulo ?? '').map((p, i) => (
            <span key={i} style={{ display: 'inline-block', color: p.enfasis ? colores.acento : colores.tinta, ...entrar(avance(frame, 12 + i * 2, 14), 22) }}>{p.texto}</span>
          ))}
        </div>
        {lamina.texto ? (
          <p style={{ ...fuente(marca.fuentes.texto), fontSize: d.cuerpo, lineHeight: 1.35, color: colores.tenue, margin: 0, maxWidth: '30em', ...entrar(avance(frame, 26, 16), 14) }}>
            {lamina.texto}
          </p>
        ) : null}
      </div>

      <div style={{ position: 'absolute', bottom: d.abajo, left: d.lado, right: d.lado, display: 'flex', alignItems: 'center', justifyContent: pie ? 'flex-start' : 'space-between' }}>
        {pie ? <Boton texto={pie} frame={frame} /> : null}
        {primera ? <Desliza frame={frame} /> : null}
        {!pie && !primera && !esHistoria ? <Puntos total={total} activo={indice} /> : null}
      </div>
    </AbsoluteFill>
  );
};

/** CTA con el brillo que late del boton de Contrappto. */
const Boton = ({ texto, frame }) => {
  const marca = React.useContext(ContextoMarca);
  const { colores } = marca;
  const { fps } = useVideoConfig();
  const brillo = latido(frame, fps, 0, 1, 2);
  return (
    <span style={{
      ...fuente(marca.fuentes.enfasis), fontSize: 32, padding: '20px 36px', borderRadius: 999, color: colores.fondo, background: colores.acento,
      boxShadow: `0 0 ${6 + brillo * 16}px ${conAlfa(colores.acento, 0.3 + brillo * 0.4)}`, ...entrar(avance(frame, 40, 14), 16),
    }}>{texto}</span>
  );
};

/** Invitacion a deslizar en la primera lamina: flecha que empuja hacia la derecha. */
const Desliza = ({ frame }) => {
  const marca = React.useContext(ContextoMarca);
  const empuje = Math.max(0, Math.sin(frame / 6)) * 14;
  return (
    <span style={{ ...fuente(marca.fuentes.enfasis), marginLeft: 'auto', fontSize: 28, letterSpacing: '0.08em', color: marca.colores.tenue, display: 'flex', alignItems: 'center', gap: 14, opacity: avance(frame, 40, 14) }}>
      Desliza <span style={{ color: marca.colores.acento, fontSize: 40, transform: `translateX(${empuje}px)` }}>→</span>
    </span>
  );
};

const Puntos = ({ total, activo }) => {
  const { colores } = React.useContext(ContextoMarca);
  return (
    <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} style={{ width: i === activo ? 34 : 10, height: 10, borderRadius: 5, background: i === activo ? colores.acento : conAlfa(colores.tinta, 0.25) }} />
      ))}
    </div>
  );
};

/** Entrada sin desenfoque (ESTANDAR 1b: sin GPU el blur cuesta y se ensucia al comprimir). */
const entrar = (a, distancia = 20) => ({ opacity: a, transform: `translateY(${(1 - a) * distancia}px)` });

/**
 * Fondo propio de la lamina: degradado de la marca y un resplandor del acento
 * que se mueve lento. Sin grano: en video se lee como estatica (ESTANDAR 1b).
 */
const FondoLamina = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { colores } = React.useContext(ContextoMarca);
  const x = interpolate(frame, [0, durationInFrames], [70, 55]);
  const y = interpolate(frame, [0, durationInFrames], [20, 32]);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at ${x}% ${y}%, ${conAlfa(colores.acento, 0.2)} 0%, ${conAlfa(colores.acento, 0)} 48%),
      radial-gradient(circle at 10% 95%, ${conAlfa(colores.secundario ?? colores.acento, 0.14)} 0%, transparent 40%),
      linear-gradient(180deg, ${colores.fondo} 0%, ${colores.fondo2} 100%)` }} />
  );
};
