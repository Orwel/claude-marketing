import React from 'react';
import { Composition, Folder } from 'remotion';
import { MARCAS, PIEZAS, idComposicion } from './catalogo.js';
import { Animado } from './plantillas/Animado.jsx';
import { duracionPieza, FORMATOS } from './util.js';

const FPS = 30;
const PLANTILLAS = { Animado };

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
                durationInFrames={duracionPieza(pieza, FPS)}
                defaultProps={{ pieza, marca: MARCAS[cuenta] }}
              />
            ));
          })}
        </Folder>
      ))}
    </>
  );
};
