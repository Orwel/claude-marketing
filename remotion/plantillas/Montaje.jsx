import { icons } from 'lucide-react';
import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Barrido } from '../componentes/Barrido.jsx';
import { Certificado } from '../componentes/Certificado.jsx';
import { Fondo } from '../componentes/Fondo.jsx';
import { Etiqueta, Firma } from '../componentes/Firma.jsx';
import { fuente, useFuentes } from '../fuentes.js';
import { avance } from '../graficos/base.jsx';
import { TRANSICION } from '../graficos/tiempos.js';
import { ContextoMarca, useMarca } from '../marca.js';
import { BEATS, resorte, subir, Texto } from '../montaje/Beats.jsx';
import { Cinetica } from '../montaje/Cinetica.jsx';
import { paginar } from '../montaje/subtitulos.js';
import { Destello, Franjas, Vineta } from '../montaje/Cine.jsx';
import { FPS, lineaMontaje, SEGUNDOS_FINAL } from '../montaje/linea.js';
import { conAlfa } from '../util.js';

/**
 * Plantilla Montaje: intro de la cuenta + cuerpo + cierre grabado, limpios
 * (src/montaje/limpiar.js) y cortados (src/montaje/armar.js), con beats
 * graficos, lower third, subtitulos segun la cuenta y tarjeta final de marca.
 *
 * El cuerpo hablado es el mismo en todas las cuentas; cambian intro, gancho,
 * cierre, paleta, grado de color, subtitulos y densidad de beats (marca.montaje).
 *
 * Un beat "panel" encoge el video a una tarjeta y ocupa el otro espacio: la
 * cara nunca queda tapada. En 16:9 (LinkedIn de Contrappto) el video va siempre
 * en tarjeta a la izquierda y los beats a la derecha.
 */

// Geometria por formato. Zonas seguras de Instagram: 220 px arriba y 420 abajo.
const DISENOS = {
  '1080x1920': {
    lleno: { x: 0, y: 0, w: 1080, h: 1920 },
    tarjeta: { x: 281, y: 960, w: 518, h: 921 },
    // Outro dividida: la persona abajo (cara en ~1200, fuera de la franja de 420 px de la app) y el CTA arriba.
    mitad: { x: 0, y: 860, w: 1080, h: 1060 },
    arriba: { x: 70, y: 230, w: 940, h: 600 },
    panel: { x: 70, y: 300, w: 940, h: 540 },
    // En la outro el subtitulo va bajo la barbilla (con el cierre en plano cerrado, a 1400 tapaba la boca).
    subtitulos: { lleno: 1170, tarjeta: 856, mitad: 1470, ancho: 940 },
    gancho: { y: 300, ancho: 940 },
    lowerThird: { x: 70, y: 1340 },
    marcaDeAgua: { derecha: 60, arriba: 236, alto: 64 },
    cta: { y: 1330 },
  },
  '1080x1350': {
    lleno: { x: 0, y: 0, w: 1080, h: 1350 },
    tarjeta: { x: 300, y: 630, w: 480, h: 672 },
    mitad: { x: 0, y: 560, w: 1080, h: 790 },
    arriba: { x: 70, y: 50, w: 940, h: 480 },
    panel: { x: 70, y: 50, w: 940, h: 470 },
    subtitulos: { lleno: 1000, tarjeta: 538, mitad: 1150, ancho: 940 },
    gancho: { y: 70, ancho: 940 },
    lowerThird: { x: 60, y: 1200 },
    marcaDeAgua: { derecha: 50, arriba: 50, alto: 56 },
    cta: { y: 1200 },
  },
  '1920x1080': {
    lleno: { x: 90, y: 60, w: 540, h: 960 },
    tarjeta: { x: 90, y: 60, w: 540, h: 960 },
    panel: { x: 720, y: 170, w: 1110, h: 640 },
    subtitulos: { lleno: 880, tarjeta: 880, ancho: 1110, x: 720 },
    gancho: { y: 200, ancho: 1110, x: 720 },
    // Sobre la tarjeta del video, abajo: en (720, 880) caia encima de los subtitulos (29-sep-2026).
    lowerThird: { x: 110, y: 868 },
    marcaDeAgua: { derecha: 60, arriba: 50, alto: 60 },
    cta: { y: 880, x: 720 },
    siempreTarjeta: true,
  },
};

export const Montaje = ({ pieza, marca, red }) => {
  useFuentes();
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const d = DISENOS[`${width}x${height}`];
  const cfg = marca.montaje ?? {};
  const variante = pieza.variantes?.[marca.id] ?? {};
  const linea = useMemo(() => lineaMontaje(pieza, marca.id, cfg.densidad ?? 2), [pieza, marca.id, cfg.densidad]);
  const paneles = linea.beats.filter((b) => b.modo !== 'encima' && BEATS[b.tipo]);
  const conPanel = progresoTarjeta(frame, tramosPanel(paneles));
  const p = d.siempreTarjeta ? 1 : conPanel;
  const conSubtitulos = cfg.subtitulos?.[red] ?? false;
  const lower = pieza.lowerThird ? { desde: Math.round(3.4 * FPS), dura: 3 * FPS } : null;
  const finGancho = Math.min(Math.round(3 * FPS), paneles[0]?.inicio ?? Infinity);
  // 0 = cuerpo, 1 = outro dividida. En 16:9 el video ya va en tarjeta: ahi no se divide.
  const q = linea.cierre != null && d.mitad ? avance(frame, linea.cierre - 2, 4) : 0;

  return (
    <ContextoMarca.Provider value={marca}>
      <AbsoluteFill style={{ backgroundColor: marca.colores.fondo }}>
        {/* Con el video a pantalla completa el fondo no se ve: no se dibuja (el grano y los desenfoques son caros sin GPU). */}
        {d.siempreTarjeta || p > 0 ? <Fondo /> : null}
        {d.siempreTarjeta ? <Titular pieza={pieza} variante={variante} d={d} oculto={conPanel} finGancho={variante.gancho && finGancho > 20 ? finGancho : 0} /> : null}
        <Escenario linea={linea} d={d} p={p * (1 - q)} q={q} grado={cfg.grado} />

        {!d.siempreTarjeta ? (
          <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,.28) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 60%, rgba(0,0,0,.42) 100%)', opacity: (1 - p) * (1 - q) }} />
        ) : null}
        {/* Capa de cine: viñeta sobre el metraje (no sobre graficos ni subtitulos). */}
        {!d.siempreTarjeta ? <Vineta fuerza={(1 - p) * (1 - q)} /> : null}

        {conSubtitulos ? (
          <Sequence durationInFrames={linea.finVoz}>
            <Subtitulos subtitulos={linea.subtitulos} golpes={linea.golpes} d={d} p={p} q={q} tamano={cfg.subtitulos?.tamano ?? 64} resaltar={pieza.resaltar ?? []} />
          </Sequence>
        ) : null}

        {paneles.map((b, i) => (
          <Sequence key={i} from={b.inicio} durationInFrames={Math.max(1, b.fin - b.inicio)} name={`${b.tipo} · ${b.en ?? ''}`}>
            <CapaBeat b={b} zona={d.panel} />
          </Sequence>
        ))}

        {!d.siempreTarjeta
          ? linea.chispas.map((c, i) => (
              <Sequence key={`c${i}`} from={c.inicio} durationInFrames={c.fin - c.inicio} name={`chispa · ${c.texto}`}>
                <Chispa c={c} y={d.gancho.y + 40} />
              </Sequence>
            ))
          : null}

        {!d.siempreTarjeta
          ? linea.golpes.map((g, i) => (
              <Sequence key={`g${i}`} from={g.inicio} durationInFrames={g.fin - g.inicio} name={`golpe · ${g.estilo} · ${g.palabras.map((w) => w.text).join(' ')}`}>
                <div style={{ position: 'absolute', left: 50, top: d.subtitulos.lleno - 60, width: 980, display: 'flex', justifyContent: 'center' }}>
                  <Cinetica g={g} />
                </div>
              </Sequence>
            ))
          : null}

        {/* Logo de marca arriba a la izquierda, desde que sale el gancho hasta la outro. */}
        {cfg.logo && !d.siempreTarjeta ? (
          <Sequence from={finGancho} durationInFrames={Math.max(1, (linea.cierre ?? linea.finVoz) - finGancho)} name="logo">
            <LogoMarca logo={cfg.logo} y={d.marcaDeAgua.arriba} p={p} />
          </Sequence>
        ) : null}

        {/* Etiqueta de serie solo si la pieza la pide (variantes.<cuenta>.etiqueta): no va en todos los videos. */}
        {variante.etiqueta && !d.siempreTarjeta ? (
          <Sequence from={finGancho} durationInFrames={Math.max(1, (linea.cierre ?? linea.finVoz) - finGancho)} name="etiqueta">
            <EtiquetaSerie texto={variante.etiqueta} y={d.marcaDeAgua.arriba + (cfg.logo ? (cfg.logo.alto ?? 54) + 16 : 0)} p={p} />
          </Sequence>
        ) : null}

        {variante.gancho && finGancho > 20 ? (
          <Sequence durationInFrames={finGancho}>
            <Gancho texto={variante.gancho} d={d} />
          </Sequence>
        ) : null}

        {lower ? (
          <Sequence from={lower.desde} durationInFrames={lower.dura}>
            <LowerThird rol={pieza.lowerThird} d={d} />
          </Sequence>
        ) : null}

        {linea.cierre != null && cfg.cta && d.mitad ? (
          <Sequence from={linea.cierre - 2} durationInFrames={linea.finVoz - linea.cierre + 2} name="outro">
            <Outro texto={cfg.cta} zona={d.arriba} />
          </Sequence>
        ) : null}
        {linea.cierre != null && cfg.cta && !d.mitad ? (
          <Sequence from={linea.cierre + 10} durationInFrames={linea.finVoz - linea.cierre - 10}>
            <PildoraCTA texto={cfg.cta} d={d} />
          </Sequence>
        ) : null}

        {cfg.marcaDeAgua ? <MarcaDeAgua src={cfg.marcaDeAgua} d={d} hasta={d.mitad && linea.cierre != null ? linea.cierre : linea.finVoz} /> : null}

        {linea.cambios.map((c) => (
          <Sequence key={c} from={c - TRANSICION} durationInFrames={TRANSICION * 2} name="barrido">
            <Barrido />
          </Sequence>
        ))}

        {/* Destellos de luz: al salir del barrido y cuando cae la palabra clave de cada golpe. */}
        {[...linea.cambios.map((c) => c + TRANSICION - 4), ...(d.siempreTarjeta ? [] : linea.golpes.map((g) => g.inicio + g.palabras.find((w) => w.clave).cuadro + 2))].map((c, i) => (
          <Sequence key={`d${i}`} from={c} durationInFrames={18} name="destello">
            <Destello desdeIzquierda={i % 2 === 0} />
          </Sequence>
        ))}

        <Franjas />

        <Sequence from={linea.finVoz} durationInFrames={SEGUNDOS_FINAL * FPS}>
          {/* La pieza puede cambiar el llamado de la tarjeta final o quitarlo (variantes.<cuenta>.cta: null): no se pide 'Comenta CLASE' en un video que no lo dice. */}
          <Final cta={'cta' in variante ? variante.cta : cfg.cta} />
        </Sequence>

        <Audio src={staticFile(`audio/montaje/${pieza.slug}--${marca.id}.wav`)} />
      </AbsoluteFill>
    </ContextoMarca.Provider>
  );
};

/** Tramos en que hay un panel en pantalla; dos paneles casi seguidos se unen para no "respirar" en medio. */
function tramosPanel(paneles) {
  const tramos = [];
  for (const b of [...paneles].sort((x, y) => x.inicio - y.inicio)) {
    const u = tramos.at(-1);
    if (u && b.inicio - u.fin < 24) u.fin = Math.max(u.fin, b.fin);
    else tramos.push({ inicio: b.inicio, fin: b.fin });
  }
  return tramos;
}

/** 0 = video lleno, 1 = tarjeta. Se encoge con el panel (12 cuadros) y vuelve cuando el panel ya salio. */
function progresoTarjeta(frame, tramos) {
  return Math.max(0, ...tramos.map((t) => Math.min(avance(frame, t.inicio - 2, 12), 1 - avance(frame, t.fin, 12))));
}

const mezclar = (a, b, p) => a + (b - a) * p;

const Escenario = ({ linea, d, p, q = 0, grado }) => {
  const { colores } = useMarca();
  const frame = useCurrentFrame();
  // Acercamientos (como en el webinar): entra en 6 cuadros, se sostiene y vuelve suave en 10.
  const zoom = linea.zooms.reduce((z, g) => z * (1 + (g.escala - 1) * avance(frame, g.inicio, 6) * (1 - avance(frame, g.fin - 10, 10))), 1);
  const zona = (k) => mezclar(mezclar(d.lleno[k], d.tarjeta[k], p), d.mitad?.[k] ?? 0, q);
  const r = { x: zona('x'), y: zona('y'), w: zona('w'), h: zona('h') };
  const radio = d.siempreTarjeta ? 36 : 36 * Math.max(p, q);
  // En la outro solo se redondean las esquinas de arriba: abajo el video llega al borde.
  const esquinas = q > 0 ? `${radio}px ${radio}px 0 0` : radio;
  return (
    <div style={{ position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h, borderRadius: esquinas, overflow: 'hidden', boxShadow: q > 0 ? `0 -20px 60px rgba(0,0,0,${0.4 * q})` : p > 0 ? `0 30px 90px rgba(0,0,0,${0.45 * p}), 0 0 0 2px ${conAlfa(colores.tinta, 0.12 * p)}` : undefined }}>
      {linea.tramos.map((t, i) => (
        <Sequence key={i} from={t.inicio} durationInFrames={t.cuadros} name={`${t.parte} ${i + 1}`}>
          <Tramo t={t} indice={i} tramos={linea.tramos} grado={grado} zoom={zoom} q={q} caja={r} entra={linea.cambios.includes(t.inicio)} sale={linea.cambios.includes(t.inicio + t.cuadros)} />
        </Sequence>
      ))}
    </div>
  );
};

/**
 * Un tramo del metraje. En cortes dentro de la misma grabacion se alterna el
 * encuadre (1 / 1,12, el empuje de camara del webinar) para que el salto se
 * sienta intencional; al cambiar de grabacion lo tapa el barrido, con un
 * desenfoque de movimiento a cada lado. En la outro el cierre esta grabado en
 * plano abierto: se cierra a 1,35× para que la cara no quede chiquita.
 */
const Tramo = ({ t, indice, tramos, grado, zoom = 1, q = 0, caja, entra, sale }) => {
  const frame = useCurrentFrame();
  let seguidos = 0;
  for (let k = indice; k > 0 && tramos[k - 1].archivo === t.archivo; k--) seguidos++;
  // Outro: si armar midio donde esta el (seguirPersona), el recorte se centra en su cara y pecho y el
  // zoom se ajusta a su tamaño (hasta 1,8×: mas se ve blando). Si no, el recorte fijo de siempre.
  const enc = t.parte === 'cierre' && t.encuadre && caja ? t.encuadre : null;
  let cierre = t.parte === 'cierre' ? 1 + 0.35 * q : 1;
  let posicion;
  let origen = t.parte === 'cierre' ? '50% 30%' : '50% 32%';
  if (enc) {
    const foco = Math.max(0.1, enc.y - enc.alto * 0.25);
    const altoImg = (caja.w * 16) / 9;
    const p = altoImg > caja.h ? Math.min(1, Math.max(0, (caja.h / 2 - foco * altoImg) / (caja.h - altoImg))) : 0.5;
    posicion = `${enc.x * 100}% ${p * 100}%`;
    origen = `${enc.x * 100}% ${(caja.h - altoImg) * p + foco * altoImg}px`;
    const objetivo = Math.min(1.8, Math.max(1, (0.8 * (caja.h / altoImg)) / Math.max(0.05, enc.alto)));
    cierre = 1 + (objetivo - 1) * q;
  }
  const base = (seguidos % 2 === 1 ? 1.12 : 1) * cierre;
  const deriva = interpolate(frame, [0, t.cuadros], [0, 0.03]);
  const fx = Math.max(entra ? 1 - avance(frame, 0, TRANSICION) : 0, sale ? avance(frame, t.cuadros - TRANSICION, TRANSICION) : 0);
  return (
    <OffthreadVideo
      src={staticFile(t.archivo)}
      trimBefore={Math.round(t.desde * FPS)}
      trimAfter={Math.round(t.hasta * FPS)}
      playbackRate={t.velocidad ?? 1}
      // Fundido de 3 cuadros en cada borde: sin el, cada corte salta la onda y suena un chasquido
      // (con muchos cortes se oia como estatica).
      volume={(f) => (t.volumen ?? 1) * Math.min(1, (f + 1) / 3, (t.cuadros - f) / 3)}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: posicion,
        transform: `scale(${(base + deriva) * zoom * (1 + fx * 0.08)})`,
        transformOrigin: origen,
        filter: [grado, fx > 0.02 ? `blur(${fx * 10}px)` : ''].filter(Boolean).join(' ') || undefined,
      }}
    />
  );
};

/** Salida mas rapida que la entrada: 6 cuadros, baja la opacidad y se va 10 px hacia arriba. */
const CapaBeat = ({ b, zona }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const Componente = BEATS[b.tipo];
  const fuera = avance(frame, durationInFrames - 6, 6);
  return (
    <div style={{ position: 'absolute', left: zona.x, top: zona.y, width: zona.w, height: zona.h, opacity: 1 - fuera, transform: `translateY(${-fuera * 10}px)` }}>
      <Componente b={b} ancho={zona.w} alto={zona.h} />
    </div>
  );
};

const Gancho = ({ texto, d }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const marca = useMarca();
  const a = resorte(frame, 2, fps);
  const fuera = avance(frame, durationInFrames - 6, 6);
  return (
    <div style={{ position: 'absolute', left: d.gancho.x ?? 70, top: d.gancho.y, width: d.gancho.ancho, opacity: 1 - fuera, ...(fuera ? {} : subir(a)) }}>
      <div style={{ display: 'inline-block', padding: '26px 34px', borderRadius: 26, background: conAlfa(marca.colores.fondo, marca.claro ? 0.92 : 0.8), border: `1px solid ${conAlfa(marca.colores.tinta, 0.1)}`, boxShadow: '0 20px 60px rgba(0,0,0,.35)' }}>
        <Texto texto={texto} tamano={d.gancho.ancho > 1000 ? 64 : 60} familia="titulo" />
      </div>
    </div>
  );
};

/** Nombre y rol, una sola vez por video, 3 s. Barra de acento que crece y texto que sube. */
const LowerThird = ({ rol, d }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const marca = useMarca();
  const { colores } = marca;
  const barra = resorte(frame, 0, fps);
  const nombre = resorte(frame, 3, fps);
  const cargo = resorte(frame, 6, fps);
  const fuera = avance(frame, durationInFrames - 6, 6);
  return (
    <div style={{ position: 'absolute', left: d.lowerThird.x, top: d.lowerThird.y, display: 'flex', gap: 18, opacity: 1 - fuera }}>
      <div style={{ width: 6, borderRadius: 3, background: colores.acento, transform: `scaleY(${barra})`, transformOrigin: 'top' }} />
      <div style={{ padding: '16px 26px', borderRadius: 18, background: conAlfa(colores.fondo, marca.claro ? 0.94 : 0.82), boxShadow: '0 16px 40px rgba(0,0,0,.3)' }}>
        <div style={subir(nombre)}><span style={{ ...fuente(marca.fuentes.enfasis), fontSize: 40, color: colores.tinta }}>Juan David Vanegas</span></div>
        <div style={subir(cargo)}><span style={{ ...fuente(marca.fuentes.texto), fontSize: 30, color: colores.acento }}>{rol}</span></div>
      </div>
    </div>
  );
};

/** Refuerzo en pantalla del cierre grabado. */
const PildoraCTA = ({ texto, d }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const a = resorte(frame, 0, fps);
  return (
    <div style={{ position: 'absolute', left: d.cta.x ?? 0, width: d.cta.x ? d.panel.w : '100%', top: d.cta.y, display: 'flex', justifyContent: 'center', ...subir(a) }}>
      <span style={{ ...fuente(marca.fuentes.enfasis), fontSize: 42, padding: '22px 40px', borderRadius: 999, background: marca.colores.acento, color: marca.claro || marca.id === 'contrappto' ? '#FFFFFF' : marca.colores.fondo, boxShadow: `0 16px 50px ${conAlfa(marca.colores.acento, 0.45)}` }}>{texto}</span>
    </div>
  );
};

/** Isotipo al 40 % en la esquina superior, todo el video (menos la tarjeta final, donde va grande). */
const MarcaDeAgua = ({ src, d, hasta }) => {
  const frame = useCurrentFrame();
  if (frame >= hasta) return null;
  return <Img src={staticFile(src)} style={{ position: 'absolute', right: d.marcaDeAgua.derecha, top: d.marcaDeAgua.arriba, height: d.marcaDeAgua.alto, opacity: 0.4 }} />;
};

/** Ultimos 2 s: firma de la cuenta centrada y el CTA. Entra con resorte y se queda quieta. */
const Final = ({ cta }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const a = resorte(frame, 0, fps);
  const b = resorte(frame, 5, fps);
  return (
    <AbsoluteFill>
      <Fondo />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: 70 }}>
        <div style={subir(a, 16)}><Firma tamano={1.3} /></div>
        {cta ? (
          <div style={subir(b, 16)}>
            <span style={{ ...fuente(marca.fuentes.enfasis), fontSize: 46, padding: '26px 46px', borderRadius: 999, background: marca.colores.acento, color: marca.claro || marca.id === 'contrappto' ? '#FFFFFF' : marca.colores.fondo }}>{cta}</span>
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** En 16:9, la columna derecha lleva el titulo de la pieza mientras no hay un beat. */
const Titular = ({ pieza, variante, d, oculto, finGancho = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const a = resorte(frame, 6, fps);
  // Mientras el gancho ocupa la parte de arriba, el titular espera debajo de el y sube cuando sale
  // (29-sep-2026: se encimaban en los videos 16:9 de Contrappto).
  const y = finGancho ? mezclar(d.panel.y + 330, d.panel.y + 120, avance(frame, finGancho, 12)) : d.panel.y + 120;
  return (
    <div style={{ position: 'absolute', left: d.panel.x, top: y, width: d.panel.w, ...subir(a), opacity: Math.min(1, a * 1.4) * (1 - oculto) }}>
      <div style={{ width: 70, height: 6, borderRadius: 3, background: marca.colores.acento, marginBottom: 34 }} />
      <Texto texto={variante.titular ?? pieza.titulo} tamano={70} familia="titulo" />
    </div>
  );
};


const Subtitulos = ({ subtitulos, golpes = [], d, p, q = 0, tamano, resaltar }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const { colores } = marca;
  const paginas = useMemo(() => paginar(subtitulos, resaltar, golpes, fps), [subtitulos, resaltar, golpes, fps]);
  const ms = (frame / fps) * 1000;
  const pagina = paginas.find((x) => ms >= x.startMs && ms < x.finMs);
  if (!pagina) return null;
  const entrada = spring({ frame: frame - Math.round((pagina.startMs / 1000) * fps), fps, config: { damping: 20, stiffness: 240 } });
  const y = mezclar(mezclar(d.subtitulos.lleno, d.subtitulos.tarjeta, p), d.subtitulos.mitad ?? d.subtitulos.lleno, q);
  const inicioPagina = Math.round((pagina.startMs / 1000) * fps);
  const caja = marca.subtitulo?.caja;
  return (
    <div style={{ position: 'absolute', left: d.subtitulos.x ?? (1080 - d.subtitulos.ancho) / 2, top: y, width: d.subtitulos.ancho, display: 'flex', justifyContent: 'center' }}>
      <div
        style={{
          ...fuente(marca.fuentes.enfasis),
          fontSize: tamano,
          lineHeight: 1.15,
          textAlign: 'center',
          color: caja ? colores.tinta : '#FFFFFF',
          opacity: Math.min(1, entrada * 1.5),
          transform: `translateY(${(1 - entrada) * 10}px)`,
          ...(caja ? { background: conAlfa(colores.fondo, 0.86), padding: '12px 24px', borderRadius: 16 } : { textShadow: '0 4px 18px rgba(0,0,0,.85), 0 2px 4px rgba(0,0,0,.9)' }),
        }}
      >
        {pagina.tokens.map((t, i) => (
          <span key={i} style={{ display: 'inline-block', marginLeft: i ? '0.26em' : 0 }}>
            {i === pagina.resaltada ? <Resaltada texto={t.text} color={colores.acento} desde={Math.round((t.fromMs / 1000) * fps) - inicioPagina} /> : t.text}
          </span>
        ))}
      </div>
    </div>
  );
};

/**
 * La palabra clave de la pagina entra con un golpe de escala cuando se dice (no karaoke: una por pagina).
 * El margen propio evita que al crecer se coma el espacio con sus vecinas.
 */
const Resaltada = ({ texto, color, desde }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const g = Math.min(1, spring({ frame: frame - desde, fps, config: { damping: 9, stiffness: 260, mass: 0.6 } }));
  // Tope de +8 %: con mas, en el pico del golpe la palabra invade el espacio y se pega a las vecinas.
  const escala = frame < desde ? 1 : 1 + 0.06 * Math.sin(g * Math.PI) + 0.02 * g;
  return <span style={{ display: 'inline-block', color, margin: '0 0.14em', transform: `scale(${escala})`, transformOrigin: '50% 70%' }}>{texto}</span>;
};

/**
 * Outro dividida (Juan David, 27-sep-2026): la persona en la mitad de abajo y
 * arriba el CTA en grande. "Comenta CLASE" se parte en verbo y palabra clave; la
 * palabra va en una pastilla que late, con el icono de comentario que rebota y
 * flechas que apuntan hacia abajo. Todo con resorte y sin desenfoques: en el
 * render no hay GPU.
 */
const Outro = ({ texto, zona }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const { colores } = marca;
  const palabras = texto.split(' ');
  const clave = palabras.pop();
  const verbo = palabras.join(' ');
  const firma = resorte(frame, 4, fps);
  const a = resorte(frame, 8, fps);
  const b = spring({ frame: frame - 14, fps, config: { damping: 8, stiffness: 180, mass: 0.8 } });
  const latir = 1 + 0.04 * Math.sin(Math.max(0, frame - 30) / 5);
  const rebote = Math.abs(Math.sin(Math.max(0, frame - 20) / 7)) * 14;
  const Comentario = icons.MessageCircle;
  const Flecha = icons.ChevronDown;
  const sobreAcento = marca.claro || marca.id === 'contrappto' ? '#FFFFFF' : colores.fondo;
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1080, height: zona.y + zona.h + 80, background: `linear-gradient(180deg, ${colores.fondo} 0%, ${colores.fondo2 ?? colores.fondo} 100%)`, opacity: Math.min(1, frame / 8), overflow: 'hidden' }}>
        {[0, 1, 2].map((k) => {
          const tam = 380 + k * 170;
          return (
            <div
              key={k}
              style={{
                position: 'absolute',
                left: 540 - tam / 2,
                top: zona.y + zona.h / 2 - tam / 2,
                width: tam,
                height: tam,
                borderRadius: '50%',
                border: `3px dashed ${conAlfa(colores.acento, 0.28 - k * 0.07)}`,
                transform: `rotate(${(frame * (0.6 + k * 0.3) * (k % 2 ? -1 : 1) + k * 120) % 360}deg) scale(${Math.min(1, a)})`,
              }}
            />
          );
        })}
      </div>
      {marca.montaje?.certificado ? (
        <OutroCertificado c={marca.montaje.certificado} zona={zona} verbo={verbo} clave={clave} sobreAcento={sobreAcento} />
      ) : (
      <div style={{ position: 'absolute', left: zona.x, top: zona.y, width: zona.w, height: zona.h, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30 }}>
        <div style={subir(firma, 20)}>
          <Firma tamano={0.75} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, ...subir(a, 30) }}>
          <div style={{ transform: `translateY(${-rebote}px) rotate(${-8 + rebote * 0.5}deg)` }}>
            <Comentario size={84} color={colores.acento} strokeWidth={2.4} />
          </div>
          <span style={{ ...fuente(marca.fuentes.titulo), fontSize: 84, color: colores.tinta, lineHeight: 1 }}>{verbo}</span>
        </div>
        <div style={{ transform: `scale(${Math.max(0, b) * latir})` }}>
          <span style={{ ...fuente(marca.fuentes.titulo), display: 'inline-block', fontSize: 128, lineHeight: 1, padding: '26px 64px', borderRadius: 999, background: colores.acento, color: sobreAcento, letterSpacing: '0.02em', boxShadow: `0 20px 60px ${conAlfa(colores.acento, 0.5)}` }}>{clave}</span>
        </div>
        <div style={{ display: 'flex', gap: 30, opacity: Math.min(1, a) }}>
          {[0, 1, 2].map((k) => {
            const onda = 0.5 + 0.5 * Math.sin((frame - k * 5) / 4);
            return <Flecha key={k} size={54} color={colores.acento} strokeWidth={3} style={{ opacity: 0.35 + 0.65 * onda, transform: `translateY(${onda * 10}px)` }} />;
          })}
        </div>
      </div>
      )}
    </AbsoluteFill>
  );
};

/**
 * Outro con el certificado de Trifuerza Academy (Juan David, 6-oct-2026): el
 * certificado real ocupa la mitad de arriba y el "Comenta CLASE" se monta sobre
 * su borde inferior, como una cinta. Arriba a la derecha, un sello ladeado con
 * "gratis y con certificado". Ambos a la vez, porque uno de los dos cierres
 * grabados dice "comenta clase" al principio y el otro al final.
 */
const OutroCertificado = ({ c, zona, verbo, clave, sobreAcento }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const marca = useMarca();
  const { colores } = marca;
  // La cinta del CTA muerde solo el borde de abajo (~30 px): los datos del panel siguen legibles.
  const ancho = Math.round(Math.min(zona.w * 0.86, (zona.h - 110) * (1154 / 815)));
  const alto = ancho * (815 / 1154);
  const tarjeta = spring({ frame: frame - 2, fps, config: { damping: 15, stiffness: 150, mass: 0.8 } });
  const cinta = spring({ frame: frame - 18, fps, config: { damping: 10, stiffness: 200, mass: 0.7 } });
  const sello = spring({ frame: frame - 30, fps, config: { damping: 9, stiffness: 240, mass: 0.6 } });
  const latir = 1 + 0.035 * Math.sin(Math.max(0, frame - 36) / 5);
  const rebote = Math.abs(Math.sin(Math.max(0, frame - 24) / 7)) * 10;
  const flota = Math.sin(frame / 22) * 4;
  const Comentario = icons.MessageCircle;
  const Insignia = icons.BadgeCheck;
  const izquierda = zona.x + (zona.w - ancho) / 2;
  return (
    <>
      <div style={{ position: 'absolute', left: izquierda, top: zona.y, transform: `translateY(${(1 - tarjeta) * 60 + flota}px) rotate(${(1 - tarjeta) * -6}deg) scale(${0.85 + 0.15 * tarjeta})`, opacity: Math.min(1, tarjeta * 1.5), filter: 'drop-shadow(0 26px 50px rgba(0,0,0,.5))' }}>
        <Certificado c={c} ancho={ancho} desde={4} />
      </div>
      {/* Anclado por la derecha: con el sello largo, anclado por la izquierda se salia del cuadro. */}
      <div style={{ position: 'absolute', right: Math.max(40, width - izquierda - ancho - 10), top: zona.y - 12, transform: `rotate(${-4 + (1 - sello) * 30}deg) scale(${Math.max(0, sello)})`, transformOrigin: 'right center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 24px', borderRadius: 999, background: colores.acento, boxShadow: `0 14px 34px ${conAlfa(colores.acento, 0.45)}`, whiteSpace: 'nowrap' }}>
          <Insignia size={34} color={sobreAcento} strokeWidth={2.4} />
          <span style={{ ...fuente(marca.fuentes.enfasis ?? marca.fuentes.titulo), fontSize: 30, color: sobreAcento, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{c.sello}</span>
        </div>
      </div>
      <div style={{ position: 'absolute', left: zona.x, width: zona.w, top: zona.y + alto - 30, display: 'flex', justifyContent: 'center', transform: `translateY(${(1 - cinta) * 40}px)`, opacity: Math.min(1, cinta * 1.5) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '12px 14px 12px 30px', borderRadius: 999, background: colores.fondo, border: `2px solid ${conAlfa(colores.acento, 0.5)}`, boxShadow: '0 18px 44px rgba(0,0,0,.45)' }}>
          <div style={{ transform: `translateY(${-rebote}px) rotate(${-8 + rebote * 0.5}deg)` }}>
            <Comentario size={60} color={colores.acento} strokeWidth={2.4} />
          </div>
          <span style={{ ...fuente(marca.fuentes.titulo), fontSize: 66, color: colores.tinta, lineHeight: 1 }}>{verbo}</span>
          <span style={{ ...fuente(marca.fuentes.titulo), display: 'inline-block', fontSize: 76, lineHeight: 1, padding: '16px 40px', borderRadius: 999, background: colores.acento, color: sobreAcento, letterSpacing: '0.02em', transform: `scale(${latir})`, boxShadow: `0 12px 34px ${conAlfa(colores.acento, 0.5)}` }}>{clave}</span>
        </div>
      </div>
    </>
  );
};

/**
 * Icono al vuelo: circulo de acento con el icono, un aro que se expande y la
 * palabra en una pastilla. Entra girando con resorte, flota y sale encogiendo.
 * Alterna izquierda y derecha para que la pantalla se sienta viva sin tapar la cara.
 */
const Chispa = ({ c, y }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const marca = useMarca();
  const { colores } = marca;
  const Icono = icons[c.icono] ?? icons.Sparkles;
  const a = spring({ frame, fps, config: { damping: 11, stiffness: 220, mass: 0.7 } });
  const etiqueta = resorte(frame, 5, fps);
  const fuera = avance(frame, durationInFrames - 7, 7);
  const aro = avance(frame, 2, 18);
  const flota = Math.sin(frame / 6) * 5;
  const derecha = c.lado === 'derecha';
  const sobreAcento = marca.claro || marca.id === 'contrappto' ? '#FFFFFF' : colores.fondo;
  return (
    <div style={{ position: 'absolute', top: y, [derecha ? 'right' : 'left']: 70, display: 'flex', flexDirection: derecha ? 'row-reverse' : 'row', alignItems: 'center', gap: 18, opacity: 1 - fuera, transform: `translateY(${flota}px) scale(${1 - fuera * 0.4})`, transformOrigin: derecha ? 'right center' : 'left center' }}>
      <div style={{ position: 'relative', width: 160, height: 160, transform: `scale(${a}) rotate(${(1 - a) * (derecha ? 30 : -30)}deg)` }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `4px solid ${colores.acento}`, transform: `scale(${1 + aro * 0.7})`, opacity: 1 - aro }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: colores.acento, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 14px 40px ${conAlfa(colores.acento, 0.5)}` }}>
          <Icono size={84} color={sobreAcento} strokeWidth={2.3} />
        </div>
      </div>
      <div style={{ ...subir(etiqueta, 14), padding: '14px 26px', borderRadius: 18, background: conAlfa(colores.fondo, marca.claro ? 0.94 : 0.86), boxShadow: '0 12px 34px rgba(0,0,0,.3)' }}>
        <span style={{ ...fuente(marca.fuentes.enfasis), fontSize: 54, color: colores.tinta, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{c.texto}</span>
      </div>
    </div>
  );
};

/** Etiqueta de serie: entra desde la izquierda y se aparta (baja la opacidad) cuando hay un panel. */
const EtiquetaSerie = ({ texto, y, p }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = resorte(frame, 0, fps);
  return (
    <div style={{ position: 'absolute', left: 60, top: y, opacity: Math.min(1, a) * (1 - p * 0.7), transform: `translateX(${(1 - a) * -40}px) scale(0.9)`, transformOrigin: 'left center' }}>
      <Etiqueta texto={texto} />
    </div>
  );
};


/**
 * Logo de marca sobre el video: la version oficial de letras claras, tal cual (sin
 * recolorear ni deformar), sobre una pastilla oscura translucida que le da
 * contraste y respeta su espacio de proteccion aunque el fondo sea cielo o pared.
 * Entra con resorte y se aparta cuando hay un panel.
 */
const LogoMarca = ({ logo, y, p }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = resorte(frame, 0, fps);
  const alto = logo.alto ?? 54;
  return (
    <div style={{ position: 'absolute', left: 50, top: y, padding: `${alto * 0.24}px ${alto * 0.36}px`, borderRadius: alto, background: 'rgba(8,14,28,.52)', boxShadow: '0 8px 24px rgba(0,0,0,.25)', opacity: Math.min(1, a) * (1 - p * 0.75), transform: `translateY(${(1 - a) * -12}px)` }}>
      <Img src={staticFile(logo.src)} style={{ display: 'block', height: alto, width: 'auto' }} />
    </div>
  );
};
