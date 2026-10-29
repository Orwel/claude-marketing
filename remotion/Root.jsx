import React from 'react';
import { Composition, Folder, staticFile } from 'remotion';
import { MARCAS, PIEZAS, idComposicion } from './catalogo.js';
import { formatoDe, lineaMontaje } from './montaje/linea.js';
import { Animado } from './plantillas/Animado.jsx';
import { Brochure } from './plantillas/Brochure.jsx';
import { Carrusel } from './plantillas/Carrusel.jsx';
import { Portada, PortadaAnterior } from './plantillas/Portada.jsx';
import { Montaje } from './plantillas/Montaje.jsx';
import { Vertical } from './plantillas/Vertical.jsx';
import { LabArcade } from './arcade/Lab.jsx';
import { Arcade } from './plantillas/Arcade.jsx';
import { lineaArcade } from './arcade/linea.js';
import { Marco } from './clase/Marco.jsx';
import { Cartel, Cierre, Intro } from './clase/Piezas.jsx';
import { ComentarioSuelto, ComentariosCompuesto, Trailer, duracionTrailer } from './clase/Trailer.jsx';
import { Viaje, cuadrosViaje } from './clase/Viaje.jsx';
import { aplicarVoz, duracionDe, duracionPieza, FORMATOS } from './util.js';

/**
 * Si la pieza ya tiene voz (npm run voz), cada escena dura al menos lo que dura
 * su frase mas un respiro. Sin manifiesto, la pieza queda como esta escrita.
 */
async function conVoz({ props }) {
  // La voz solo aplica a Animado; el Vertical dura lo que dura el metraje cortado.
  if (props.pieza.plantilla === 'Vertical') return { durationInFrames: duracionDe(props.pieza, FPS, props.marca.id) };
  const id = `${props.pieza.slug}--${props.marca.id}`;
  const respuesta = await fetch(staticFile(`voz/${id}.json`)).catch(() => null);
  if (!respuesta?.ok) return { durationInFrames: duracionPieza(props.pieza, FPS) };
  const voz = await respuesta.json();
  const pieza = aplicarVoz(props.pieza, voz);
  return { durationInFrames: duracionPieza(pieza, FPS), props: { ...props, pieza, voz } };
}

const FPS = 30;
const PLANTILLAS = { Animado, Vertical, Brochure };

/**
 * Una composicion por cada pieza × cuenta. Se agrupan por mes en el Studio,
 * igual que en la carpeta de Drive, para revisar el mes de un vistazo.
 */
export const Root = () => {
  const meses = [...new Set(PIEZAS.map((p) => p.mes))].sort();
  return (
    <>
      <Folder name="lab">
        {['trifuerza', 'moneda', 'mundo'].map((escena) => (
          <Composition key={escena} id={`lab-arcade-${escena}`} component={LabArcade} fps={FPS} width={1080} height={1920} durationInFrames={90} defaultProps={{ marca: MARCAS.juanda, escena }} />
        ))}
      </Folder>
      <Folder name="clases">{composicionesClase()}</Folder>
      {meses.map((mes) => (
        <Folder key={mes} name={mes}>
          {PIEZAS.filter((p) => p.mes === mes).flatMap((pieza) => {
            if (pieza.plantilla === 'Montaje') return [...composicionesMontaje(pieza), ...composicionesPortada(pieza)];
            if (pieza.plantilla === 'Arcade') return composicionesArcade(pieza);
            if (pieza.plantilla === 'Carrusel') return composicionesCarrusel(pieza);
            if (pieza.plantilla === 'PortadasAnteriores')
              return pieza.reels.map((x) => (
                <Composition key={x.id} id={`anterior--${x.id.replace(/_/g, '-')}`} component={PortadaAnterior} fps={FPS} width={1080} height={1920} durationInFrames={160}
                  defaultProps={{ marca: MARCAS[pieza.cuentas[0]], metafora: x.metafora, datos: x.datos, titulo: x.titulo }} />
              ));
            const Plantilla = PLANTILLAS[pieza.plantilla];
            if (!Plantilla) return [];
            // `formatos` (p. ej. ["vertical", "horizontal"]): el primero es <slug>--<cuenta> y los demas
            // llevan el formato al final, asi las piezas de un solo formato conservan su id de siempre.
            const formatos = pieza.formatos ?? [pieza.formato ?? 'vertical'];
            return pieza.cuentas.flatMap((cuenta) =>
              formatos.map((formato, k) => {
                const { ancho, alto } = FORMATOS[formato];
                const id = k === 0 ? idComposicion(pieza, cuenta) : `${idComposicion(pieza, cuenta)}--${formato}`;
                return (
                  <Composition
                    key={id}
                    id={id}
                    component={Plantilla}
                    fps={FPS}
                    width={ancho}
                    height={alto}
                    durationInFrames={duracionDe(pieza, FPS, cuenta)}
                    defaultProps={{ pieza, marca: MARCAS[cuenta], voz: null }}
                    calculateMetadata={conVoz}
                  />
                );
              })
            );
          })}
        </Folder>
      ))}
    </>
  );
};

/**
 * Montaje: una composicion por cuenta y red (<slug>--<cuenta>--ig|li). Contrappto
 * sale 16:9 en LinkedIn; las demas cuentas en 4:5. Sin armar (npm run armar) no aparece.
 */
function composicionesMontaje(pieza) {
  if (!pieza.generado) return [];
  return pieza.cuentas.flatMap((cuenta) =>
    ['instagram', 'linkedin'].map((red) => {
      const f = formatoDe(cuenta, red);
      const marca = MARCAS[cuenta];
      const id = `${pieza.slug}--${cuenta}--${f.sufijo}`;
      return (
        <Composition
          key={id}
          id={id}
          component={Montaje}
          fps={FPS}
          width={f.ancho}
          height={f.alto}
          durationInFrames={lineaMontaje(pieza, cuenta, marca.montaje?.densidad ?? 2).total}
          defaultProps={{ pieza, marca, red }}
        />
      );
    })
  );
}

/**
 * Carrusel y stories: una composicion por lamina y cuenta (<slug>--<cuenta>--01),
 * porque Instagram arma el carrusel con un archivo por lamina.
 */
function composicionesCarrusel(pieza) {
  const { ancho, alto } = FORMATOS[pieza.formato ?? 'cuadrado'];
  const cuadros = Math.round((pieza.segundos ?? 6) * FPS);
  return pieza.cuentas.flatMap((cuenta) =>
    pieza.laminas.map((_, i) => {
      const id = `${pieza.slug}--${cuenta}--${String(i + 1).padStart(2, '0')}`;
      return (
        <Composition key={id} id={id} component={Carrusel} fps={FPS} width={ancho} height={alto} durationInFrames={cuadros}
          defaultProps={{ pieza, marca: MARCAS[cuenta], indice: i }} />
      );
    })
  );
}

/**
 * Portadas: una imagen por cuenta y red (<slug>--<cuenta>--portada-ig|li). El cuadro sale del tramo
 * de cuerpo mas largo (a un tercio, o en `variantes.<cuenta>.portadaSegundo`), del video limpio: sin
 * subtitulos ni graficos encima. Titulo: portada > gancho > titulo de la pieza.
 */
function composicionesPortada(pieza) {
  if (!pieza.generado) return [];
  return pieza.cuentas.flatMap((cuenta) => {
    const v = pieza.variantes?.[cuenta] ?? {};
    const tramos = (pieza.generado.montajes?.[cuenta]?.segmentos ?? []).filter((t) => t.parte === 'cuerpo');
    if (!tramos.length) return [];
    const tramo = tramos.reduce((a, b) => (b.hasta - b.desde > a.hasta - a.desde ? b : a));
    const segundo = v.portadaSegundo ?? tramo.desde + (tramo.hasta - tramo.desde) / 3;
    return ['instagram', 'linkedin'].map((red) => {
      const f = formatoDe(cuenta, red);
      const id = `${pieza.slug}--${cuenta}--portada-${f.sufijo}`;
      return (
        <Composition key={id} id={id} component={Portada} fps={FPS} width={f.ancho} height={f.alto} durationInFrames={1}
          defaultProps={{ pieza, marca: MARCAS[cuenta], titulo: v.portada ?? v.gancho ?? pieza.titulo, cuadro: { archivo: tramo.archivo, cuadro: Math.round((v.portadaSegundo ?? segundo) * FPS), ancho: f.ancho, alto: f.alto } }} />
      );
    });
  });
}

/** Arcade (SOFA): una composicion vertical por cuenta (<slug>--<cuenta>). Sin armar (npm run sofa-armar) no aparece. */
function composicionesArcade(pieza) {
  if (!pieza.generado) return [];
  return pieza.cuentas.map((cuenta) => {
    const id = `${pieza.slug}--${cuenta}`;
    return <Composition key={id} id={id} component={Arcade} fps={FPS} width={1080} height={1920} durationInFrames={lineaArcade(pieza).total} defaultProps={{ pieza, marca: MARCAS[cuenta] }} />;
  });
}

/**
 * Clases grabadas (clases/<slug>.json, skill editar-clase-grabada). El video de la clase no pasa
 * por Remotion: son 90 minutos y renderizarlos cuadro a cuadro tomaría horas sin GPU. Remotion
 * hace solo las capas (marco, cartel, intro, cierre) y src/clase/armar.js las une con ffmpeg.
 * El marco recibe en --props `tiempos` (un segundo del crudo por cuadro) o `desde` + `dura`.
 */
const CLASES = (() => {
  const ctx = import.meta.webpackContext('../clases', { recursive: false, regExp: /\.json$/ });
  return ctx.keys().map((k) => ctx(k));
})();

function composicionesClase() {
  return CLASES.flatMap((clase) => {
    const base = { fps: FPS, width: 1920, height: 1080 };
    const id = `clase--${clase.slug}`;
    return [
      <Composition key={`${id}--marco`} id={`${id}--marco`} component={Marco} {...base} durationInFrames={FPS * 10} defaultProps={{ clase, desde: clase.inicio.seg }}
        calculateMetadata={({ props }) => ({ durationInFrames: props.tiempos?.length ?? Math.max(1, Math.round((props.dura ?? 10) * FPS)) })} />,
      <Composition key={`${id}--cartel`} id={`${id}--cartel`} component={Cartel} {...base} durationInFrames={Math.round(clase.cartel.dura * FPS)} defaultProps={{ clase }} />,
      <Composition key={`${id}--intro`} id={`${id}--intro`} component={Intro} {...base} durationInFrames={Math.round(clase.intro.dura * FPS)} defaultProps={{ clase }} />,
      <Composition key={`${id}--cierre`} id={`${id}--cierre`} component={Cierre} {...base} durationInFrames={Math.round(clase.cierre.dura * FPS)} defaultProps={{ clase }} />,
      // Venta (clase.venta): tráiler en los dos formatos, cada comentario suelto y los mejores juntos.
      ...(clase.venta ? [
        <Composition key={`${id}--trailer-16x9`} id={`${id}--trailer-16x9`} component={Trailer} {...base} durationInFrames={duracionTrailer(clase, 'escenas')} defaultProps={{ clase }} />,
        <Composition key={`${id}--trailer-9x16`} id={`${id}--trailer-9x16`} component={Trailer} fps={FPS} width={1080} height={1920} durationInFrames={duracionTrailer(clase, 'escenas')} defaultProps={{ clase }} />,
        // Tráiler en forma de viaje (venta.viaje): el avión recorre el planeta y en cada parada habla el profesor.
        ...(clase.venta.viaje ? [
          <Composition key={`${id}--viaje-16x9`} id={`${id}--viaje-16x9`} component={Viaje} {...base} durationInFrames={cuadrosViaje(clase)} defaultProps={{ clase }} />,
          <Composition key={`${id}--viaje-9x16`} id={`${id}--viaje-9x16`} component={Viaje} fps={FPS} width={1080} height={1920} durationInFrames={cuadrosViaje(clase)} defaultProps={{ clase }} />,
        ] : []),
        // La misma idea abriendo con el precio (venta.viajePrecio) y el sello del precio durante el viaje.
        ...(clase.venta.viajePrecio ? [
          <Composition key={`${id}--viaje-precio-16x9`} id={`${id}--viaje-precio-16x9`} component={Viaje} {...base} durationInFrames={cuadrosViaje(clase, 'viajePrecio')} defaultProps={{ clase, lista: 'viajePrecio', musica: 'trailer/musica-viaje-precio.wav' }} />,
          <Composition key={`${id}--viaje-precio-9x16`} id={`${id}--viaje-precio-9x16`} component={Viaje} fps={FPS} width={1080} height={1920} durationInFrames={cuadrosViaje(clase, 'viajePrecio')} defaultProps={{ clase, lista: 'viajePrecio', musica: 'trailer/musica-viaje-precio.wav' }} />,
        ] : []),
        <Composition key={`${id}--venta-9x16`} id={`${id}--venta-9x16`} component={Trailer} fps={FPS} width={1080} height={1920} durationInFrames={duracionTrailer(clase, 'historia')} defaultProps={{ clase, lista: 'historia', musica: 'trailer/musica-historia.wav' }} />,
        <Composition key={`${id}--venta-16x9`} id={`${id}--venta-16x9`} component={Trailer} {...base} durationInFrames={duracionTrailer(clase, 'historia')} defaultProps={{ clase, lista: 'historia', musica: 'trailer/musica-historia.wav' }} />,
        // Carrusel de posts animados (4:5): una composición por lámina, todas con la misma pista corta.
        ...(clase.venta.carrusel ?? []).map((_, i) => (
          <Composition key={`${id}--carrusel-${i + 1}`} id={`${id}--carrusel-${i + 1}`} component={Trailer} fps={FPS} width={1080} height={1350} durationInFrames={duracionTrailer(clase, `carrusel.${i}`)}
            defaultProps={{ clase, lista: `carrusel.${i}`, musica: 'trailer/musica-carrusel.wav' }} />
        )),
        <Composition key={`${id}--comentario`} id={`${id}--comentario`} component={ComentarioSuelto} fps={FPS} width={800} height={400} durationInFrames={1} defaultProps={{ clase, id: clase.venta.comentarios[0].id }} />,
        <Composition key={`${id}--comentarios`} id={`${id}--comentarios`} component={ComentariosCompuesto} fps={FPS} width={1600} height={900} durationInFrames={1} defaultProps={{ clase }} />,
      ] : []),
    ];
  });
}
