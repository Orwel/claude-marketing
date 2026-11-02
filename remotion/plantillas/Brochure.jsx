import { icons } from 'lucide-react';
import React from 'react';
import { AbsoluteFill, Audio, Sequence, Series, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Fondo } from '../componentes/Fondo.jsx';
import { Barrido } from '../componentes/Formas.jsx';
import { Firma } from '../componentes/Firma.jsx';
import { TextoCinetico } from '../componentes/TextoCinetico.jsx';
import { Cierre } from '../escenas/Cierre.jsx';
import { fuente, useFuentes } from '../fuentes.js';
import { Escena, Hojas3D } from '../kit/Escenas.jsx';
import { METAFORAS } from '../metaforas/index.js';
import { ANCHO as METAFORA_ANCHO, ALTO as METAFORA_ALTO } from '../metaforas/base.js';
import { aparece, entra, pulso } from '../kit/movimiento.js';
import { useTema } from '../kit/tema.js';
import { ContextoMarca, useMarca } from '../marca.js';
import { aCuadros, conAlfa, resolver, solapeDe, tramosDe } from '../util.js';

/**
 * Plantilla Brochure: el brochure de un producto contado como video, 100 % generado.
 * Cada escena es una "página": un titular que entra palabra a palabra y, debajo (vertical)
 * o al lado (horizontal), una pieza del kit web que lo demuestra en pantalla.
 *
 * No sabe de ninguna cuenta: colores y logo vienen de la marca; si el producto tiene
 * mundo visual propio dentro de una cuenta (Trifuerza Legal en trifuerza), la pieza
 * lo trae en `marca` y se mezcla encima, igual que `colores` en Carrusel.
 */
export const Brochure = ({ pieza, marca: base }) => {
  useFuentes();
  const { fps, width, height } = useVideoConfig();
  const marca = mezclar(base, pieza.marca);
  const variante = pieza.variantes?.[base.id] ?? {};
  const tramos = tramosDe(pieza, fps);
  const horizontal = width > height;

  return (
    <ContextoMarca.Provider value={marca}>
      <AbsoluteFill>
        <Fondo />
        {pieza.pista ? <Audio src={staticFile(`audio/${pieza.slug}--${base.id}.wav`)} volume={pieza.volumenPista ?? 0.8} /> : null}
        <Series>
          {pieza.escenas.map((escena, i) => {
            const E = ESCENAS[escena.tipo];
            if (!E) throw new Error(`Escena de brochure desconocida: "${escena.tipo}" en ${pieza.slug}`);
            const props = Object.fromEntries(Object.entries(escena).map(([k, v]) => [k, resolver(v, variante)]));
            return (
              <Series.Sequence key={i} durationInFrames={aCuadros(escena.segundos, fps)} name={`${i + 1} · ${escena.tipo}`}>
                <E {...props} horizontal={horizontal} />
              </Series.Sequence>
            );
          })}
        </Series>
        {solapeDe(pieza) === 0 ? <Barrido cortes={tramos.slice(1).map((t) => t.inicio)} /> : null}
        <Progreso />
      </AbsoluteFill>
    </ContextoMarca.Provider>
  );
};

function mezclar(marca, extra) {
  if (!extra) return marca;
  return { ...marca, ...extra, colores: { ...marca.colores, ...extra.colores }, web: { ...marca.web, ...extra.web }, firma: { ...marca.firma, ...extra.firma } };
}

const Ico = ({ nombre, tamano, color }) => {
  const C = icons[nombre] ?? icons.Circle;
  return <C size={tamano} strokeWidth={1.9} color={color} absoluteStrokeWidth />;
};

/** Zonas seguras: en vertical, la interfaz de Instagram tapa ~220 px arriba y ~380 abajo. */
const zona = (horizontal) => (horizontal ? { top: 110, bottom: 110, left: 110, right: 110 } : { top: 230, bottom: 400, left: 80, right: 80 });

/** Antetítulo con el número de "página", como en el PDF. */
const Antetitulo = ({ texto, desde = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const t = useTema();
  if (!texto) return null;
  const a = entra(frame, desde, fps);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, ...aparece(a, { x: -16, y: 0 }) }}>
      <span style={{ width: 54 * Math.min(1, a), height: 3, background: marca.colores.alerta }} />
      <span style={{ ...fuente(marca.fuentes.enfasis), fontSize: 30, letterSpacing: '0.18em', textTransform: 'uppercase', color: marca.colores.alerta }}>{texto}</span>
    </div>
  );
};

const Parrafo = ({ texto, desde, tamano = 36 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  if (!texto) return null;
  return <p style={{ ...fuente(marca.fuentes.texto), fontSize: tamano, lineHeight: 1.45, color: marca.colores.tenue, margin: 0, maxWidth: 900, ...aparece(entra(frame, desde, fps), { y: 14 }) }}>{texto}</p>;
};

/* ------------------------------------------------------------------ portada */
const Portada = ({ antetitulo, titulo, texto, fondo3d, horizontal }) => {
  const { width, height } = useVideoConfig();
  const z = zona(horizontal);
  return (
    <AbsoluteFill>
      {fondo3d ? <div style={{ position: 'absolute', inset: 0, opacity: 0.8 }}><Hojas3D ancho={width} alto={height} cantidad={4} opacidad={0.4} /></div> : null}
      <AbsoluteFill style={{ padding: `${z.top}px ${z.right}px ${z.bottom}px ${z.left}px`, justifyContent: 'center', gap: 44 }}>
        <div style={aparece(1)}><Firma tamano={horizontal ? 0.9 : 1.05} /></div>
        <Antetitulo texto={antetitulo} desde={8} />
        <TextoCinetico texto={titulo} tamano={horizontal ? 118 : 122} desde={12} anchoMax={horizontal ? 1300 : 920} />
        <Parrafo texto={texto} desde={40} tamano={horizontal ? 36 : 40} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- capitulo */
/** Titular + una escena del kit web (tabla, avisos, firma, masiva, kanban, chat, versus...). */
const Capitulo = ({ antetitulo, titulo, texto, kit, horizontal }) => {
  const { width, height } = useVideoConfig();
  const z = zona(horizontal);
  const ancho = horizontal ? 880 : width - z.left - z.right;
  const alto = horizontal ? 680 : kit?.alto ?? 720;
  // El kit se diseñó para paneles de la plantilla Montaje: aquí la escena ocupa media pantalla y,
  // a tamaño 1:1, sus textos (17-25 px) no se leen en un celular. Se dibuja más chica y se escala.
  const escala = kit?.escala ?? (horizontal ? 1.15 : 1.4);
  return (
    <AbsoluteFill style={{ padding: `${z.top}px ${z.right}px ${z.bottom}px ${z.left}px`, flexDirection: horizontal ? 'row' : 'column', justifyContent: horizontal ? 'space-between' : 'center', alignItems: horizontal ? 'center' : 'stretch', gap: horizontal ? 70 : 64 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 30, width: horizontal ? width - z.left - z.right - ancho - 70 : 'auto' }}>
        <Antetitulo texto={antetitulo} />
        <TextoCinetico texto={titulo} tamano={horizontal ? 84 : 92} desde={4} anchoMax={horizontal ? 780 : 920} />
        <Parrafo texto={texto} desde={22} tamano={horizontal ? 30 : 34} />
      </div>
      {kit ? (
        // La escena del kit entra un poco despues del titular: primero se lee la idea, luego la prueba.
        // La caja fija evita que el titular salte cuando la escena aparece.
        <div style={{ width: ancho, height: alto, flex: 'none' }}>
          <div style={{ width: ancho / escala, height: alto / escala, transform: `scale(${escala})`, transformOrigin: '0 0' }}>
            <Sequence from={kit.retraso ?? 14} layout="none">
              <Escena b={kit} ancho={ancho / escala} alto={alto / escala} />
            </Sequence>
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- metafora */
/**
 * Titular + una metáfora animada (remotion/metaforas): la idea se cuenta dibujada, sin tablas ni cifras.
 * La metáfora entra un poco después del titular, igual que el kit en `capitulo`, y se dibuja en su lienzo
 * de 900 × 560 escalado al ancho disponible. `metafora` es el nombre del registro y `datos` lo que lee.
 */
const Metafora = ({ antetitulo, titulo, texto, metafora, datos, horizontal }) => {
  const { width } = useVideoConfig();
  const z = zona(horizontal);
  const M = METAFORAS[metafora];
  if (!M) throw new Error(`Metáfora desconocida: "${metafora}" (ver remotion/metaforas/index.js)`);
  // En vertical la metáfora sale casi a sangre (40 px de margen): en 9:16 sus rótulos de 20-24 px se leían chicos.
  const ancho = horizontal ? 900 : width - 80;
  const alto = (METAFORA_ALTO * ancho) / METAFORA_ANCHO;
  return (
    <AbsoluteFill style={{ padding: `${z.top}px ${z.right}px ${z.bottom}px ${z.left}px`, flexDirection: horizontal ? 'row' : 'column', justifyContent: horizontal ? 'space-between' : 'center', alignItems: horizontal ? 'center' : 'stretch', gap: horizontal ? 70 : 56 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 30, width: horizontal ? width - z.left - z.right - ancho - 70 : 'auto' }}>
        <Antetitulo texto={antetitulo} />
        <TextoCinetico texto={titulo} tamano={horizontal ? 84 : 96} desde={4} anchoMax={horizontal ? 780 : 920} />
        <Parrafo texto={texto} desde={22} tamano={horizontal ? 30 : 36} />
      </div>
      <div style={{ width: ancho, height: alto, flex: 'none', marginLeft: horizontal ? 0 : -(ancho - (width - z.left - z.right)) / 2 }}>
        <Sequence from={10} layout="none">
          <M d={datos ?? {}} />
        </Sequence>
      </div>
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- tarjetas */
/** Rejilla de tarjetas con icono que entran en cascada: modulos, segmentos, diferenciales. */
const Tarjetas = ({ antetitulo, titulo, items = [], columnas, horizontal }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const marca = useMarca();
  const t = useTema();
  const z = zona(horizontal);
  const cols = columnas ?? (horizontal ? (items.length === 4 ? 4 : 3) : 2);
  const compacto = items.length > 4 && !horizontal;
  return (
    <AbsoluteFill style={{ padding: `${z.top}px ${z.right}px ${z.bottom}px ${z.left}px`, justifyContent: 'center', gap: horizontal ? 50 : 64 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
        <Antetitulo texto={antetitulo} />
        <TextoCinetico texto={titulo} tamano={horizontal ? 80 : 88} desde={4} anchoMax={horizontal ? 1500 : 920} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 22, width: width - z.left - z.right }}>
        {items.map((it, i) => {
          const a = entra(frame, 18 + i * 5, fps);
          const color = it.color ? t[it.color] ?? it.color : t.acentoTexto;
          return (
            <div key={i} style={{ borderRadius: 26, padding: compacto ? '26px 26px' : '32px 30px', background: `linear-gradient(160deg, ${conAlfa(t.panel, 0.95)}, ${conAlfa(t.fondo, 0.92)})`, border: `1.5px solid ${conAlfa(color, 0.28)}`, boxShadow: `0 20px 50px rgba(0,0,0,.35)`, display: 'flex', flexDirection: 'column', gap: 14, ...aparece(a, { y: 26, escala: 0.04 }) }}>
              <div style={{ width: 70, height: 70, borderRadius: 18, display: 'grid', placeItems: 'center', background: conAlfa(color, 0.14), border: `1.5px solid ${conAlfa(color, 0.4)}` }}>
                <Ico nombre={it.icono ?? 'Circle'} tamano={36} color={color} />
              </div>
              <div style={{ ...fuente(marca.fuentes.enfasis), fontSize: compacto ? 34 : 38, lineHeight: 1.15, color: t.tinta }}>{it.titulo}</div>
              {it.texto ? <div style={{ ...fuente(marca.fuentes.texto), fontSize: compacto ? 25 : 28, lineHeight: 1.4, color: t.tenue }}>{it.texto}</div> : null}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------- planes */
/** Tarjetas de precio: entran una a una y la destacada late con el brillo del boton de la web. */
const Planes = ({ antetitulo, titulo, planes = [], nota, horizontal }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const marca = useMarca();
  const t = useTema();
  const z = zona(horizontal);
  return (
    <AbsoluteFill style={{ padding: `${z.top}px ${z.right}px ${z.bottom}px ${z.left}px`, justifyContent: 'center', gap: horizontal ? 46 : 56 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
        <Antetitulo texto={antetitulo} />
        <TextoCinetico texto={titulo} tamano={horizontal ? 80 : 84} desde={4} anchoMax={horizontal ? 1500 : 920} />
      </div>
      <div style={{ display: 'flex', flexDirection: horizontal ? 'row' : 'column', gap: horizontal ? 24 : 20, width: width - z.left - z.right }}>
        {planes.map((p, i) => {
          const a = entra(frame, 16 + i * 10, fps);
          const brillo = p.destacado ? 30 + 24 * pulso(frame, 45, 0, 1) : 0;
          return (
            <div key={i} style={{ flex: 1, borderRadius: 28, padding: horizontal ? '34px 32px' : '28px 34px', background: p.destacado ? `linear-gradient(165deg, ${conAlfa(t.acento, 0.3)}, ${conAlfa(t.panel, 0.96)} 60%)` : `linear-gradient(165deg, ${conAlfa(t.panel, 0.96)}, ${conAlfa(t.fondo, 0.94)})`, border: `2px solid ${p.destacado ? conAlfa(t.acento, 0.8) : conAlfa(t.tinta, 0.1)}`, boxShadow: `0 24px 60px rgba(0,0,0,.4), 0 0 ${brillo}px ${conAlfa(t.acento, 0.35)}`, display: 'flex', flexDirection: horizontal ? 'column' : 'row', alignItems: horizontal ? 'stretch' : 'center', gap: horizontal ? 18 : 30, ...aparece(a, { y: 30, escala: 0.05 }) }}>
              <div style={{ minWidth: horizontal ? 0 : 330 }}>
                <div style={{ ...fuente(marca.fuentes.enfasis), fontSize: 28, letterSpacing: '0.18em', textTransform: 'uppercase', color: p.destacado ? t.tinta : t.acentoTexto }}>{p.nombre}</div>
                {p.desde ? <div style={{ ...fuente(marca.fuentes.texto), fontSize: 24, color: t.tenue, marginTop: 8 }}>desde</div> : null}
                <div style={{ ...fuente(marca.fuentes.titulo), fontSize: horizontal ? 64 : 62, lineHeight: 1, letterSpacing: '-0.03em', color: t.tinta, marginTop: p.desde ? 2 : 12, whiteSpace: 'nowrap' }}>{p.precio}</div>
                <div style={{ ...fuente(marca.fuentes.texto), fontSize: 24, color: t.tenue, marginTop: 8 }}>{p.periodo}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                {(p.items ?? []).map((x, k) => (
                  <div key={k} style={{ display: 'flex', gap: 12, alignItems: 'center', ...fuente(marca.fuentes.texto), fontSize: 26, color: t.tinta, ...aparece(entra(frame, 24 + i * 10 + k * 3, fps), { x: 10, y: 0 }) }}>
                    <Ico nombre="Check" tamano={26} color={t.okTexto} />
                    {x}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {nota ? <Parrafo texto={nota} desde={16 + planes.length * 10 + 10} tamano={28} /> : null}
    </AbsoluteFill>
  );
};

/* ----------------------------------------------------------------- progreso */
const Progreso = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const marca = useMarca();
  return <div style={{ position: 'absolute', left: 0, bottom: 0, height: 8, width: `${(frame / (durationInFrames - 1)) * 100}%`, background: marca.colores.acento }} />;
};

const ESCENAS = { portada: Portada, capitulo: Capitulo, metafora: Metafora, tarjetas: Tarjetas, planes: Planes, cierre: Cierre };
