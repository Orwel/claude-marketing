import { useEffect, useState } from 'react';
import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';

/**
 * Fuentes de Google Fonts (licencia OFL) guardadas en public/fuentes como
 * archivos variables. Se sirven locales y no desde fonts.gstatic.com para que
 * un render no dependa de la red: sin conexion, o detras de un proxy, la
 * fuente del sistema se colaria en los cuadros sin avisar.
 *
 * Un archivo variable por familia cubre todos los pesos que usan las marcas.
 */
const ARCHIVOS = {
  Sora: { archivo: 'fuentes/Sora.woff2', pesos: '100 800' },
  Fraunces: { archivo: 'fuentes/Fraunces.woff2', pesos: '100 900' },
  Inter: { archivo: 'fuentes/Inter.woff2', pesos: '100 900' },
};

let carga = null;
function cargarTodas() {
  // Una sola carga por pestaña aunque varias composiciones monten el hook.
  carga ??= Promise.all(
    Object.entries(ARCHIVOS).map(async ([familia, { archivo, pesos }]) => {
      const cara = new FontFace(familia, `url(${staticFile(archivo)}) format('woff2')`, { weight: pesos });
      document.fonts.add(await cara.load());
    })
  );
  return carga;
}

/**
 * Bloquea el cuadro hasta que las fuentes estan listas. Va en un hook y no al
 * importar el modulo: con delayRender a nivel de modulo el renderizador no
 * veia liberada la espera y cortaba el render a los 30 s.
 */
export function useFuentes() {
  const [espera] = useState(() => delayRender('Cargando fuentes de marca'));
  useEffect(() => {
    cargarTodas()
      .then(() => continueRender(espera))
      .catch((error) => cancelRender(error));
  }, [espera]);
}

/** { familia: 'Sora', peso: 800 } → estilo CSS listo para usar. */
export function fuente(definicion) {
  if (!ARCHIVOS[definicion.familia]) throw new Error(`Fuente "${definicion.familia}" no esta en remotion/fuentes.js`);
  return { fontFamily: `'${definicion.familia}'`, fontWeight: definicion.peso };
}
