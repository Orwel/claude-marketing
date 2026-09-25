import React from 'react';
import { Composition, Folder, staticFile } from 'remotion';
import { MARCAS, PIEZAS, idComposicion } from './catalogo.js';
import { Animado } from './plantillas/Animado.jsx';
import { Vertical } from './plantillas/Vertical.jsx';
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
const PLANTILLAS = { Animado, Vertical };

/**
 * Una composicion por cada pieza × cuenta. Se agrupan por mes en el Studio,
 * igual que en la carpeta de Drive, para revisar el mes de un vistazo.
 */
export const Root = () => {
  const meses = [...new Set(PIEZAS.map((p) => p.mes))].sort();
  return (
    <>
      {meses.map((mes) => (
        <Folder key={mes} name={mes}>
          {PIEZAS.filter((p) => p.mes === mes).flatMap((pieza) => {
            const Plantilla = PLANTILLAS[pieza.plantilla];
            if (!Plantilla) return [];
            const { ancho, alto } = FORMATOS[pieza.formato ?? 'vertical'];
            return pieza.cuentas.map((cuenta) => (
              <Composition
                key={idComposicion(pieza, cuenta)}
                id={idComposicion(pieza, cuenta)}
                component={Plantilla}
                fps={FPS}
                width={ancho}
                height={alto}
                durationInFrames={duracionDe(pieza, FPS, cuenta)}
                defaultProps={{ pieza, marca: MARCAS[cuenta], voz: null }}
                calculateMetadata={conVoz}
              />
            ));
          })}
        </Folder>
      ))}
    </>
  );
};
