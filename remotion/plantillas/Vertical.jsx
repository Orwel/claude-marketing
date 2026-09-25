import React, { useMemo } from 'react';
import { AbsoluteFill, interpolate, OffthreadVideo, Sequence, Series, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Fondo } from '../componentes/Fondo.jsx';
import { Etiqueta } from '../componentes/Firma.jsx';
import { TextoCinetico } from '../componentes/TextoCinetico.jsx';
import { Cierre } from '../escenas/Cierre.jsx';
import { fuente, useFuentes } from '../fuentes.js';
import { ContextoMarca, useMarca } from '../marca.js';
import { aCuadros, conAlfa, SEGUNDOS_CIERRE } from '../util.js';

/**
 * Plantilla Vertical: el metraje de Juan David, ya cortado, con gancho,
 * subtitulos quemados y cierre en la marca de la cuenta.
 *
 * El corte (que tramos del video quedan) lo decide src/vertical/corte.js y
 * llega en pieza.metraje.segmentos; los subtitulos llegan ya en la linea de
 * tiempo del video cortado. Esta plantilla solo monta y viste.
 */
export const Vertical = ({ pieza, marca }) => {
  useFuentes();
  const { fps } = useVideoConfig();
  const variante = pieza.variantes?.[marca.id] ?? {};
  const segmentos = pieza.metraje?.segmentos ?? [];
  const cuadrosMetraje = segmentos.reduce((s, x) => s + aCuadros(x.hasta - x.desde, fps), 0);
  const conCierre = Boolean(variante.cierre || variante.cta);

  return (
    <ContextoMarca.Provider value={marca}>
      <AbsoluteFill style={{ backgroundColor: marca.colores.fondo }}>
        <Series>
          {segmentos.map((s, i) => (
            <Series.Sequence key={i} durationInFrames={aCuadros(s.hasta - s.desde, fps)} name={`toma ${i + 1}`}>
              <Tramo archivo={s.archivo ?? pieza.metraje.archivo} desde={s.desde} hasta={s.hasta} indice={i} />
            </Series.Sequence>
          ))}
        </Series>

        {/* Velos: arriba para el gancho, abajo para los subtitulos. Suaves: la cara es el valor. */}
        <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,.45) 0%, rgba(0,0,0,0) 26%, rgba(0,0,0,0) 55%, rgba(0,0,0,.55) 100%)' }} />

        <Sequence durationInFrames={cuadrosMetraje}>
          <Subtitulos subtitulos={pieza.subtitulos ?? []} />
        </Sequence>
        {variante.gancho ? (
          <Sequence durationInFrames={Math.min(cuadrosMetraje, Math.round(3.2 * fps))}>
            <Gancho texto={variante.gancho} />
          </Sequence>
        ) : null}
        {variante.etiqueta ? (
          <AbsoluteFill style={{ top: 232, left: 80, height: 'auto', alignItems: 'flex-start' }}>
            <Etiqueta texto={variante.etiqueta} />
          </AbsoluteFill>
        ) : null}

        {conCierre ? (
          <Sequence from={cuadrosMetraje} durationInFrames={aCuadros(SEGUNDOS_CIERRE, fps)}>
            <AbsoluteFill>
              <Fondo />
              <Cierre texto={variante.cierre || ''} cta={variante.cta} web={variante.web} />
            </AbsoluteFill>
          </Sequence>
        ) : null}
        <Progreso />
      </AbsoluteFill>
    </ContextoMarca.Provider>
  );
};

/**
 * Un tramo del metraje. Los tramos alternan entre plano normal y un empuje
 * de camara (1.12x): en un video de cortes secos, cambiar el encuadre en cada
 * corte es lo que hace que el salto se sienta intencional y no un error.
 */
const Tramo = ({ archivo, desde, hasta, indice }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const base = indice % 2 === 1 ? 1.12 : 1;
  const deriva = interpolate(frame, [0, (hasta - desde) * fps], [0, 0.03]);
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <OffthreadVideo
        src={staticFile(archivo)}
        trimBefore={Math.round(desde * fps)}
        trimAfter={Math.round(hasta * fps)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${base + deriva})`, transformOrigin: '50% 35%' }}
      />
    </AbsoluteFill>
  );
};

const Gancho = ({ texto }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { colores, radio } = useMarca();
  const salida = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ top: 312, height: 'auto', padding: '0 70px', opacity: salida }}>
      <div style={{ background: conAlfa(colores.fondo, 0.82), borderRadius: radio, padding: '30px 36px', backdropFilter: 'blur(6px)' }}>
        <TextoCinetico texto={texto} tamano={70} desde={2} paso={2} anchoMax={880} />
      </div>
    </AbsoluteFill>
  );
};

/**
 * Paginas de subtitulos. Se abre una nueva al terminar una frase (coma, punto),
 * tras una pausa o cuando la pagina ya lleva 1,2 s o 5 palabras: asi ninguna
 * mezcla el final de una idea con el comienzo de otra (ni de otro video, en
 * piezas que unen varias grabaciones). Cada pagina se queda hasta que empieza
 * la siguiente, para que los subtitulos no parpadeen en las pausas cortas.
 */
function paginar(subtitulos) {
  const paginas = [];
  let actual = null;
  for (const s of subtitulos) {
    const previo = actual?.tokens.at(-1);
    if (!actual || /[,.;:?!]$/.test(previo.text) || s.startMs - previo.toMs > 300 || s.startMs - actual.startMs > 1200 || actual.tokens.length >= 5) {
      actual = { startMs: s.startMs, tokens: [] };
      paginas.push(actual);
    }
    actual.tokens.push({ text: s.text.trim(), fromMs: s.startMs, toMs: s.endMs });
  }
  paginas.forEach((p, i) => {
    const fin = p.tokens.at(-1).toMs + 250;
    p.finMs = Math.min(fin, paginas[i + 1]?.startMs ?? fin);
  });
  return paginas;
}

/**
 * Subtitulos por paginas de pocas palabras, con la palabra que se esta
 * diciendo resaltada. Van en el tercio inferior, por encima de la zona que
 * tapa la interfaz de Instagram.
 */
const Subtitulos = ({ subtitulos }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const { colores } = marca;
  const paginas = useMemo(() => paginar(subtitulos), [subtitulos]);
  const ms = (frame / fps) * 1000;
  const pagina = paginas.find((p) => ms >= p.startMs && ms < p.finMs);
  if (!pagina) return null;
  const entrada = spring({ frame: frame - Math.round((pagina.startMs / 1000) * fps), fps, config: { damping: 18, stiffness: 220 } });
  const caja = marca.subtitulo?.caja;

  return (
    <AbsoluteFill style={{ top: 1180, height: 'auto', alignItems: 'center', padding: '0 70px' }}>
      <div
        style={{
          ...fuente(marca.fuentes.enfasis),
          fontSize: 66,
          lineHeight: 1.15,
          textAlign: 'center',
          color: colores.tinta,
          transform: `scale(${0.9 + entrada * 0.1})`,
          ...(caja
            ? { background: conAlfa(colores.fondo, 0.78), padding: '14px 26px', borderRadius: 18 }
            : { textShadow: '0 4px 18px rgba(0,0,0,.85), 0 2px 4px rgba(0,0,0,.9)' }),
        }}
      >
        {pagina.tokens.map((t, i) => {
          const activa = ms >= t.fromMs && ms < t.toMs;
          return (
            <span key={i} style={{ color: activa ? colores.acento : undefined }}>
              {i ? ' ' : ''}
              {t.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Progreso = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { colores } = useMarca();
  return <div style={{ position: 'absolute', left: 0, bottom: 0, height: 8, width: `${(frame / (durationInFrames - 1)) * 100}%`, background: colores.acento }} />;
};
