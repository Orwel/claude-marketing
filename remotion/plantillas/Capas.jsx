import React from 'react';
import { AbsoluteFill, Audio, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Firma } from '../componentes/Firma.jsx';
import { fuente, useFuentes } from '../fuentes.js';
import { entra, RESORTE_SUAVE } from '../kit/movimiento.js';
import { useTema } from '../kit/tema.js';
import { ContextoMarca } from '../marca.js';
import { conAlfa, partirPalabras, tramosDe } from '../util.js';

/**
 * Plantilla Capas: el telefono con la app y sus partes saliendo hacia la camara
 * (vista explotada, referencia #8 de referencias/pinterest-2026-11.md).
 *
 * Una sola linea de tiempo continua, partida por las escenas de la pieza (sirven
 * para la duracion y para la pista): `gancho` (entra el telefono), `explota`
 * (las capas se separan), `recorrido` (cada capa con `etiqueta` pasa al frente,
 * una por una), `cierra` (vuelven a la pantalla) y `cta`.
 *
 * Las capas son recortes reales de la grabacion de la app, sin datos de clientes:
 * lo que no se pudo dejar fuera del recorte se tapa con `base.tapar`. No sabe de
 * ninguna cuenta: colores, fuentes y firma vienen de la marca.
 */
export const Capas = ({ pieza, marca }) => (
  <ContextoMarca.Provider value={marca}>
    <Lienzo pieza={pieza} marca={marca} />
  </ContextoMarca.Provider>
);

const Lienzo = ({ pieza, marca }) => {
  useFuentes();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = useTema();
  const tramos = tramosDe(pieza, fps);
  const tramo = (tipo) => tramos.find((x) => x.tipo === tipo) ?? { inicio: 0, fin: 0 };
  const [gancho, explota, recorrido, cierra, cta] = ['gancho', 'explota', 'recorrido', 'cierra', 'cta'].map(tramo);

  const base = pieza.base;
  const escala = pieza.escala ?? 0.72; // px de la grabacion -> px del video
  const anchoPantalla = base.ancho * escala;
  const altoPantalla = base.alto * escala;
  const marco = 16;

  // Entrada del telefono y "camara": gira despacio todo el video para que se lea la profundidad.
  const llega = entra(frame, 0, fps, { stiffness: 90, damping: 16 });
  const separa = entra(frame, explota.inicio, fps, { stiffness: 70, damping: 14 });
  const junta = entra(frame, cierra.inicio, fps, { stiffness: 120, damping: 18 });
  const abierto = Math.max(0, separa - junta);
  const alCta = entra(frame, cta.inicio, fps, RESORTE_SUAVE);
  // La firma espera a que el telefono termine de subir, para no montarse encima.
  const firma = entra(frame, cta.inicio + 14, fps, RESORTE_SUAVE);
  const giroY = interpolate(frame, [0, cierra.inicio, cta.inicio + 20], [-30, -16, -6], { extrapolateRight: 'clamp' }) + Math.sin(frame / 50) * 2;
  const giroX = 6 + 8 * abierto;
  const centroY = height * 0.55 - (1 - llega) * 300 - alCta * 170 + 70 * abierto;
  const escalaGrupo = (0.8 + 0.2 * llega) * (1 - 0.42 * alCta) * (1 - 0.12 * abierto);

  // Capa al frente durante el recorrido: un tramo igual para cada capa con etiqueta.
  const conEtiqueta = pieza.capas.filter((c) => c.etiqueta);
  const paso = (recorrido.fin - recorrido.inicio) / Math.max(1, conEtiqueta.length);
  const enRecorrido = frame >= recorrido.inicio && frame < recorrido.fin;
  const iFrente = enRecorrido ? Math.min(conEtiqueta.length - 1, Math.floor((frame - recorrido.inicio) / paso)) : -1;
  const frente = conEtiqueta[iFrente];

  // Texto: una sola zona arriba (fuera de los 220 px que tapa Instagram).
  const textos = [
    { desde: gancho.inicio, hasta: explota.inicio, texto: gancho.escena?.texto },
    { desde: explota.inicio, hasta: recorrido.inicio, texto: explota.escena?.texto },
    ...conEtiqueta.map((c, i) => ({ desde: recorrido.inicio + i * paso, hasta: recorrido.inicio + (i + 1) * paso, texto: c.etiqueta })),
    { desde: cierra.inicio, hasta: cta.inicio, texto: cierra.escena?.texto },
    { desde: cta.inicio, hasta: cta.fin + 1, texto: cta.escena?.texto },
  ].filter((x) => x.texto);

  return (
    <AbsoluteFill style={{ background: t.fondo, overflow: 'hidden' }}>
      <Luz frame={frame} t={t} ancho={width} alto={height} />
      {pieza.pista ? <Audio src={staticFile(`audio/${pieza.slug}--${marca.id}.wav`)} volume={pieza.volumenPista ?? 0.8} /> : null}

      {/* Sombra en el piso: crece cuando las capas se separan */}
      <div style={{ position: 'absolute', left: width / 2 - 360, top: centroY + altoPantalla * 0.42 * escalaGrupo, width: 720, height: 140, borderRadius: '50%', background: `radial-gradient(ellipse, ${conAlfa('#000000', 0.55)} 0%, transparent 70%)`, transform: `scale(${0.8 + 0.4 * abierto})`, opacity: llega }} />

      <div style={{ position: 'absolute', left: 0, top: 0, width, height, perspective: 2400, perspectiveOrigin: `50% ${centroY}px` }}>
        <div style={{ position: 'absolute', left: width / 2, top: centroY, transformStyle: 'preserve-3d', transform: `scale(${escalaGrupo}) rotateX(${giroX}deg) rotateY(${giroY}deg)` }}>
          <Telefono base={base} escala={escala} ancho={anchoPantalla} alto={altoPantalla} marco={marco} t={t} llega={llega} frame={frame} />
          {pieza.capas.map((c, i) => {
            const sale = entra(frame, explota.inicio + i * 3, fps, { stiffness: 80, damping: 13 });
            const vuelve = entra(frame, cierra.inicio + (pieza.capas.length - i) * 2, fps, { stiffness: 140, damping: 18 });
            const a = Math.max(0, sale - vuelve);
            const alFrente = c === frente ? entra(frame, recorrido.inicio + iFrente * paso, fps, { stiffness: 160, damping: 18 }) : 0;
            const sueltaFrente = c === frente ? entra(frame, recorrido.inicio + (iFrente + 1) * paso - 8, fps, { stiffness: 160, damping: 18 }) : 0;
            const f = Math.max(0, alFrente - sueltaFrente);
            return <Capa key={c.archivo} c={c} i={i} a={a} f={f} atenuar={frente && c !== frente ? 1 : 0} escala={escala} anchoPantalla={anchoPantalla} altoPantalla={altoPantalla} frame={frame} t={t} />;
          })}
        </div>
      </div>

      {textos.map((x, i) => (
        <Titular key={i} {...x} frame={frame} fps={fps} t={t} ancho={width} />
      ))}

      {/* Cierre: firma y CTA, por encima de los 380 px que tapa Instagram abajo */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: height - 380 - 230, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, opacity: firma, transform: `translateY(${(1 - firma) * 30}px)` }}>
        <Firma tamano={0.9} />
        {pieza.boton ? (
          <div style={{ ...fuente(t.marca.fuentes.enfasis), fontSize: 38, color: '#FFFFFF', background: t.acento, padding: '20px 38px', borderRadius: 999, boxShadow: `0 0 ${30 + 20 * Math.sin(frame / 8)}px ${conAlfa(t.acento, 0.55)}` }}>{pieza.boton}</div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

/** Luz de ventana: franjas diagonales tenues que se desplazan, sin desenfoques (no hay GPU). */
const Luz = ({ frame, t, ancho, alto }) => (
  <>
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 55%, ${conAlfa(t.acento, 0.16)} 0%, transparent 60%)` }} />
    {[0, 1, 2, 3].map((k) => (
      <div key={k} style={{ position: 'absolute', left: -400 + k * 380 + ((frame * 0.6) % 380), top: -300, width: 150 + (k % 2) * 80, height: alto + 600, transform: 'rotate(28deg)', background: `linear-gradient(180deg, transparent 0%, ${conAlfa('#FFFFFF', 0.045)} 35%, ${conAlfa('#FFFFFF', 0.02)} 70%, transparent 100%)` }} />
    ))}
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${conAlfa(t.fondo, 0.0)} 60%, ${conAlfa('#000000', 0.45)} 100%)` }} />
  </>
);

/** El telefono con la pantalla base (la app real) y los parches que tapan datos. */
const Telefono = ({ base, escala, ancho, alto, marco, t, llega, frame }) => (
  <div style={{ position: 'absolute', left: -(ancho / 2 + marco), top: -(alto / 2 + marco), width: ancho + marco * 2, height: alto + marco * 2, borderRadius: 64, padding: marco, boxSizing: 'border-box', background: 'linear-gradient(145deg, #2A3444, #0B1018)', boxShadow: `0 50px 100px rgba(0,0,0,.6), 0 0 0 2px ${conAlfa('#FFFFFF', 0.1)}, inset 0 0 0 2px ${conAlfa('#FFFFFF', 0.08)}`, opacity: Math.min(1, llega * 1.4), transformStyle: 'preserve-3d' }}>
    <div style={{ position: 'relative', width: ancho, height: alto, borderRadius: 50, overflow: 'hidden', background: t.fondo }}>
      <Img src={staticFile(base.archivo)} style={{ width: ancho, height: alto }} />
      {(base.tapar ?? []).map((r, i) => (
        <div key={i} style={{ position: 'absolute', left: r.x * ancho, top: r.y * alto, width: r.w * ancho, height: r.h * alto, background: r.fondo ?? t.fondo, display: 'flex', alignItems: 'center' }}>
          {r.texto ? <span style={{ ...fuente(t.marca.fuentes.enfasis), fontSize: (r.tamano ?? 26) * escala, color: r.color ?? t.tinta, whiteSpace: 'nowrap' }}>{r.texto}</span> : null}
        </div>
      ))}
      <div style={{ position: 'absolute', top: 14, left: '50%', width: ancho * 0.3, height: 30, marginLeft: -ancho * 0.15, borderRadius: 16, background: '#000' }} />
      {/* Reflejo de vidrio que barre la pantalla */}
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(115deg, transparent ${20 + ((frame * 0.5) % 120) - 40}%, ${conAlfa('#FFFFFF', 0.07)} ${30 + ((frame * 0.5) % 120) - 40}%, transparent ${42 + ((frame * 0.5) % 120) - 40}%)` }} />
    </div>
  </div>
);

/**
 * Una capa: sale de su lugar en la pantalla (`origen`, px de la grabacion; si no tiene,
 * del centro) hacia `destino` {x, y, z} y flota. En el recorrido, la del frente se acerca,
 * se agranda y gana un aro del acento; las demas se apagan un poco.
 */
const Capa = ({ c, i, a, f, atenuar, escala, anchoPantalla, altoPantalla, frame, t }) => {
  const ancho = c.ancho * escala * (c.escala ?? 1);
  const alto = c.alto * escala * (c.escala ?? 1);
  const ox = c.origen ? c.origen.x * escala - anchoPantalla / 2 + ancho / 2 : 0;
  const oy = c.origen ? c.origen.y * escala - altoPantalla / 2 + alto / 2 : 0;
  const d = c.destino;
  const flota = Math.sin((frame + i * 23) / 26) * 10 * a;
  // La del frente se corre hacia el centro para que no se salga del cuadro al crecer.
  const x = (ox + (d.x - ox) * a) * (1 - 0.65 * f);
  const y = (oy + (d.y - oy) * a) * (1 - 0.3 * f) + flota;
  const z = 2 + d.z * a + f * 260;
  const giro = (c.giro ?? 0) * a * (1 - f);
  if (a < 0.01) return null;
  return (
    <div style={{ position: 'absolute', left: x - ancho / 2, top: y - alto / 2, width: ancho, height: alto, transform: `translateZ(${z}px) rotateZ(${giro}deg) scale(${1 + 0.25 * f})`, opacity: Math.min(1, a * 2.5) * (1 - 0.45 * atenuar), borderRadius: 22, overflow: 'hidden', border: `2px solid ${conAlfa(f > 0.05 ? t.acento : '#FFFFFF', f > 0.05 ? 0.4 + 0.5 * f : 0.12)}`, boxShadow: `0 ${30 + 30 * a}px ${60 + 30 * a}px rgba(0,0,0,.55), 0 0 ${50 * f}px ${conAlfa(t.acento, 0.6 * f)}` }}>
      <Img src={staticFile(c.archivo)} style={{ width: ancho, height: alto, display: 'block' }} />
    </div>
  );
};

/** Titular de la zona de texto: entra palabra a palabra con resorte y sale hacia arriba. */
const Titular = ({ desde, hasta, texto, frame, fps, t, ancho }) => {
  if (frame < desde - 2 || frame > hasta + 8) return null;
  const sale = entra(frame, hasta - 6, fps, { stiffness: 200, damping: 22 });
  const palabras = partirPalabras(texto);
  return (
    <div style={{ position: 'absolute', left: 80, width: ancho - 160, top: 250, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: 18, rowGap: 4, opacity: 1 - sale, transform: `translateY(${-30 * sale}px)` }}>
      {palabras.map((p, k) => {
        const a = entra(frame, desde + k * 3, fps, { stiffness: 220, damping: 20 });
        return (
          <span key={k} style={{ ...fuente(t.marca.fuentes.titulo), fontSize: 78, lineHeight: 1.08, letterSpacing: '-0.02em', color: p.enfasis ? t.acentoTexto : t.tinta, opacity: Math.min(1, a * 1.4), transform: `translateY(${(1 - a) * 26}px)`, display: 'inline-block' }}>
            {p.texto}
          </span>
        );
      })}
    </div>
  );
};
