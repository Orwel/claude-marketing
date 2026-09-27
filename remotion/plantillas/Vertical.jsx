import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, Easing, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Fondo } from '../componentes/Fondo.jsx';
import { Etiqueta } from '../componentes/Firma.jsx';
import { TextoCinetico } from '../componentes/TextoCinetico.jsx';
import { Cierre } from '../escenas/Cierre.jsx';
import { fuente, useFuentes } from '../fuentes.js';
import { avance, entrar, Vidrio } from '../graficos/base.jsx';
import { CajaNegra } from '../graficos/CajaNegra.jsx';
import { Ensayo } from '../graficos/Ensayo.jsx';
import { Lenguaje } from '../graficos/Lenguaje.jsx';
import { Sello } from '../graficos/Sello.jsx';
import { SALIDA, TRANSICION } from '../graficos/tiempos.js';
import { Webinar } from '../graficos/Webinar.jsx';
import { ContextoMarca, useMarca } from '../marca.js';
import { aCuadros, conAlfa, lineaVertical, SEGUNDOS_CIERRE } from '../util.js';

/**
 * Plantilla Vertical: el metraje de Juan David, ya cortado, con gancho,
 * subtitulos quemados, graficos de lo que va diciendo y cierre en la marca.
 *
 * El corte lo decide src/vertical/corte.js (pieza.metraje.segmentos) y los
 * graficos se anclan a palabras dichas (pieza.graficos, ver lineaVertical en
 * util.js). Cuando entra un grafico "arriba", el video se encoge a una
 * tarjeta en la mitad de abajo y el grafico ocupa la de arriba: la cara nunca
 * queda tapada y el grafico tiene espacio para leerse.
 */
const GRAFICOS = { cajaNegra: CajaNegra, ensayo: Ensayo, lenguaje: Lenguaje, sello: Sello, webinar: Webinar };

// Modo "arriba": grafico arriba, franja de subtitulos en medio y el video en tarjeta abajo
// (48 %). Los subtitulos suben a la franja: sobre la tarjeta caerian encima de la cara.
const TARJETA = { escala: 0.48, arriba: 960, radio: 40 };
const ZONA_GRAFICO = { arriba: 300, izquierda: 70, ancho: 940, alto: 530 };
const SUBTITULOS_Y = { normal: 1180, tarjeta: 850 };

export const Vertical = ({ pieza, marca }) => {
  useFuentes();
  const { fps } = useVideoConfig();
  const variante = pieza.variantes?.[marca.id] ?? {};
  const { tramos, cambios, graficos, cuadrosMetraje } = useMemo(() => lineaVertical(pieza, fps), [pieza, fps]);
  const visibles = graficos.filter((g) => GRAFICOS[g.tipo]);
  const zooms = graficos.filter((g) => g.tipo === 'zoom');
  const conCierre = Boolean(variante.cierre || variante.cta);
  const primerArriba = visibles.find((g) => g.modo === 'arriba')?.inicio ?? Infinity;
  const finGancho = Math.min(cuadrosMetraje, Math.round(3.2 * fps), primerArriba + 6);
  const cortes = conCierre ? [...cambios, cuadrosMetraje] : cambios;
  const frame = useCurrentFrame();
  const enTarjeta = useMemo(() => tramosTarjeta(visibles), [visibles]);
  const p = progresoTarjeta(frame, enTarjeta);
  // Un sello grande ya dice la palabra: el subtitulo repetido debajo sobra.
  const sinSubtitulos = visibles.filter((g) => g.estilo === 'tachar').map((g) => [g.inicio, g.fin]);

  return (
    <ContextoMarca.Provider value={marca}>
      <AbsoluteFill style={{ backgroundColor: marca.colores.fondo }}>
        <Fondo />
        <Escenario tramos={tramos} p={p} zooms={zooms} cambios={cambios} />

        {/* Velos: arriba para el gancho, abajo para los subtitulos. Suaves: la cara es el valor. */}
        <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,.40) 0%, rgba(0,0,0,0) 24%, rgba(0,0,0,0) 55%, rgba(0,0,0,.50) 100%)' }} />

        <Sequence durationInFrames={cuadrosMetraje}>
          <Subtitulos subtitulos={pieza.subtitulos ?? []} y={SUBTITULOS_Y.normal + (SUBTITULOS_Y.tarjeta - SUBTITULOS_Y.normal) * p} ocultos={sinSubtitulos} />
        </Sequence>

        {visibles.map((g, i) => (
          <Sequence key={i} from={g.inicio} durationInFrames={Math.max(1, g.fin - g.inicio)} name={`${g.tipo} · "${g.en}"`}>
            <CapaGrafico g={g} />
          </Sequence>
        ))}

        {variante.gancho ? (
          <Sequence durationInFrames={finGancho}>
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

        {cortes.map((c) => (
          <Sequence key={c} from={c - TRANSICION} durationInFrames={TRANSICION * 2} name="barrido">
            <Barrido />
          </Sequence>
        ))}

        {pieza.pista ? <Audio src={staticFile(`audio/${pieza.slug}--${marca.id}.wav`)} /> : null}
        <Progreso />
      </AbsoluteFill>
    </ContextoMarca.Provider>
  );
};

/**
 * Tramos de tiempo en que el video va en tarjeta. Dos graficos "arriba"
 * seguidos (menos de 20 cuadros entre ellos) se unen: si el video se agranda
 * y se vuelve a encoger en medio segundo, se siente como un tropiezo.
 */
function tramosTarjeta(graficos) {
  const tramos = [];
  for (const g of graficos.filter((x) => x.modo === 'arriba').sort((a, b) => a.inicio - b.inicio)) {
    const u = tramos.at(-1);
    if (u && g.inicio - u.fin < 20) u.fin = Math.max(u.fin, g.fin);
    else tramos.push({ inicio: g.inicio, fin: g.fin });
  }
  return tramos;
}

/**
 * 0 (video a pantalla completa) → 1 (video en tarjeta). Se encoge al entrar el
 * grafico y se agranda cuando el grafico ya salio: si crecieran a la vez, el
 * grafico que se desvanece quedaria como un fantasma sobre la cara.
 */
function progresoTarjeta(frame, enTarjeta) {
  return Math.max(0, ...enTarjeta.map((t) => Math.min(avance(frame, t.inicio, 16), 1 - avance(frame, t.fin - 1, 14))));
}

const Escenario = ({ tramos, p, zooms, cambios }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const { colores } = useMarca();
  const s = 1 - (1 - TARJETA.escala) * p;
  const x = ((1 - s) * width) / 2;
  const y = TARJETA.arriba * p;

  // Acercamientos: entra rapido (6 cuadros), se sostiene y vuelve suave. Dan golpe a una palabra.
  const zoom = zooms.reduce((z, g) => {
    const dentro = avance(frame, g.inicio, 6) * (1 - avance(frame, g.fin - 10, 10));
    return z * (1 + ((g.escala ?? 1.15) - 1) * dentro);
  }, 1);

  return (
    <AbsoluteFill
      style={{
        width,
        height,
        transformOrigin: 'top left',
        transform: `translate(${x}px, ${y}px) scale(${s})`,
        borderRadius: (TARJETA.radio * p) / s,
        overflow: 'hidden',
        boxShadow: p > 0 ? `0 40px 120px rgba(0,0,0,${0.55 * p}), 0 0 0 ${3 / s}px ${conAlfa(colores.tinta, 0.14 * p)}` : undefined,
      }}
    >
      {tramos.map((t, i) => (
        <Sequence key={i} from={t.inicio} durationInFrames={t.cuadros} name={`toma ${i + 1}`}>
          <Tramo t={t} indice={i} tramos={tramos} zoom={zoom} entra={cambios.includes(t.inicio)} sale={cambios.includes(t.inicio + t.cuadros)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

/**
 * Un tramo del metraje. Dentro de una misma grabacion, los tramos alternan
 * entre plano normal y un empuje de camara (1.12x): en cortes secos, cambiar
 * el encuadre hace que el salto se sienta intencional. Al cambiar de
 * grabacion no hace falta: ya cambia el plano, y el barrido tapa el corte
 * con un desenfoque de movimiento a cada lado.
 */
const Tramo = ({ t, indice, tramos, zoom, entra, sale }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  let seguidos = 0;
  for (let k = indice; k > 0 && tramos[k - 1].archivo === t.archivo; k--) seguidos++;
  const base = seguidos % 2 === 1 ? 1.12 : 1;
  const deriva = interpolate(frame, [0, t.cuadros], [0, 0.03]);
  const fxEntra = entra ? 1 - avance(frame, 0, TRANSICION) : 0;
  const fxSale = sale ? avance(frame, t.cuadros - TRANSICION, TRANSICION) : 0;
  const fx = Math.max(fxEntra, fxSale);
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <OffthreadVideo
        src={staticFile(t.archivo)}
        trimBefore={Math.round(t.desde * fps)}
        trimAfter={Math.round(t.hasta * fps)}
        volume={t.volumen ?? 1}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${(base + deriva) * zoom * (1 + fx * 0.08)})`,
          transformOrigin: '50% 35%',
          filter: fx > 0.02 ? `blur(${fx * 10}px)` : undefined,
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * Barrido entre grabaciones: una franja diagonal con los dos colores de la
 * marca cruza la pantalla y la cubre entera justo en el cuadro del corte.
 */
const Barrido = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const { colores } = useMarca();
  const inclinacion = height * Math.tan((14 * Math.PI) / 180);
  const ancho = width + inclinacion * 2 + 200;
  const x = interpolate(frame, [0, TRANSICION * 2], [-ancho - inclinacion, width + inclinacion], { easing: Easing.inOut(Easing.cubic) });
  return (
    <AbsoluteFill style={{ overflow: 'hidden', pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: x,
          width: ancho,
          height,
          transform: 'skewX(-14deg)',
          background: `linear-gradient(90deg, ${colores.secundario ?? colores.acento} 0%, ${colores.acento} 18%, ${colores.fondo2} 60%, ${colores.fondo} 100%)`,
          boxShadow: `0 0 80px ${conAlfa(colores.acento, 0.6)}`,
        }}
      />
    </AbsoluteFill>
  );
};

/** Posicion del grafico segun su modo, y la salida comun a todos: se desenfoca y se va. */
const CapaGrafico = ({ g }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const Componente = GRAFICOS[g.tipo];
  const fuera = avance(frame, durationInFrames - SALIDA, SALIDA);
  const salida = { opacity: 1 - fuera, filter: fuera > 0 ? `blur(${fuera * 10}px)` : undefined, transform: `translateY(${-fuera * 14}px)` };
  if (g.modo === 'arriba') {
    return (
      <AbsoluteFill style={{ top: ZONA_GRAFICO.arriba, left: ZONA_GRAFICO.izquierda, width: ZONA_GRAFICO.ancho, height: ZONA_GRAFICO.alto, ...salida }}>
        <Componente g={g} />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ top: g.y ?? 1400, height: 'auto', alignItems: 'center', ...salida }}>
      <Componente g={g} />
    </AbsoluteFill>
  );
};

const Gancho = ({ texto }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const a = avance(frame, 0, 12);
  const fuera = avance(frame, durationInFrames - SALIDA, SALIDA);
  return (
    <AbsoluteFill style={{ top: 312, height: 'auto', padding: '0 70px', opacity: 1 - fuera, filter: fuera > 0 ? `blur(${fuera * 10}px)` : undefined }}>
      <div style={entrar(a, 30)}>
        <Vidrio ancho={940} relleno={40} orbe={false}>
          <TextoCinetico texto={texto} tamano={72} desde={3} paso={2} anchoMax={860} />
        </Vidrio>
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
const Subtitulos = ({ subtitulos, y, ocultos = [] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const { colores } = marca;
  const paginas = useMemo(() => paginar(subtitulos), [subtitulos]);
  const ms = (frame / fps) * 1000;
  const pagina = paginas.find((p) => ms >= p.startMs && ms < p.finMs);
  if (!pagina || ocultos.some(([a, b]) => frame >= a && frame < b)) return null;
  const entrada = spring({ frame: frame - Math.round((pagina.startMs / 1000) * fps), fps, config: { damping: 18, stiffness: 220 } });
  const caja = marca.subtitulo?.caja;

  return (
    <AbsoluteFill style={{ top: y, height: 'auto', alignItems: 'center', padding: '0 70px' }}>
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
