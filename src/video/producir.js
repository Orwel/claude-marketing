import { resolve, basename } from 'node:path';
import { mkdirSync, rmSync, copyFileSync, existsSync } from 'node:fs';
import { bundle } from '@remotion/bundler';
import { selectComposition, renderMedia } from '@remotion/renderer';
import { config, RAIZ, exigir } from '../config.js';
import { log } from '../util/log.js';
import { leerHistorial, actualizarPublicacion, leerJson } from '../util/almacen.js';
import { generarLocucion } from '../voz/elevenlabs.js';
import { generarBrollConIA, generarFondosConImagen } from './broll.js';
import { validarMedio } from './validar.js';

const FPS = 30;

/**
 * Etapa 2.5: producir el video.
 *
 * Era el unico paso manual del flujo. La cadena es:
 *
 *   guion  →  locucion (ElevenLabs, con timestamps)
 *          →  fondo por escena (plantilla | Imagen | Veo)
 *          →  montaje (Remotion, 1080x1920)
 *          →  mp4 listo para publicar
 *
 * El orden importa: la locucion va primero porque su duracion real es la que
 * define cuanto dura el video. Al reves habria que estimar la duracion y
 * los subtitulos quedarian desincronizados.
 */
export async function producir({ id, modoFondo = config.video.modoFondo }) {
  log.paso('Produciendo el video');

  if (!id) throw new Error('Falta --id. Usa el que devolvio "npm run planificar".');
  exigir('voz');

  const historial = leerHistorial(config.rutas.historial);
  const publicacion = historial.publicaciones.find((p) => p.id === id);
  if (!publicacion) throw new Error(`No existe la publicacion ${id} en el historial`);

  const { guion } = publicacion;
  const marca = leerJson(config.rutas.marca);

  // Remotion solo sirve ficheros desde su carpeta public/, asi que todo lo
  // que genere el pipeline aterriza ahi con nombres unicos por publicacion.
  const publico = resolve(RAIZ, 'remotion/public');
  const trabajo = resolve(publico, id);
  rmSync(trabajo, { recursive: true, force: true });
  mkdirSync(trabajo, { recursive: true });

  // 1. Locucion -------------------------------------------------------------
  log.info('Generando locucion con ElevenLabs...');
  const textoHablado = [guion.gancho, ...guion.guion.map((e) => e.voz)].join(' ');

  const { rutaAudio, duracionSegundos, palabras } = await generarLocucion({
    texto: textoHablado,
    rutaSalida: resolve(trabajo, 'voz.mp3'),
  });

  // La duracion real manda sobre la estimada por el modelo de texto.
  const problemas = validarMedio({ duracionSegundos });
  if (problemas.length) {
    log.aviso(`La locucion dura ${duracionSegundos.toFixed(1)}s: ${problemas.join('; ')}`);
    log.aviso('Acorta el guion y vuelve a producir, o Instagram rechazara el reel.');
  }

  // 2. Fondos ---------------------------------------------------------------
  let fondos = [];
  if (modoFondo === 'veo') {
    fondos = await generarBrollConIA({ escenas: guion.guion, directorio: trabajo, marca });
  } else if (modoFondo === 'imagen') {
    fondos = await generarFondosConImagen({ escenas: guion.guion, directorio: trabajo, marca });
  } else {
    log.info('Modo plantilla: fondo compuesto por Remotion, sin generacion.');
  }

  // Remotion referencia por ruta relativa a public/, no por ruta absoluta.
  const fondosParaRemotion = fondos.map((f) => ({
    indice: f.indice,
    ruta: f.ruta,
    archivo: `${id}/${basename(f.ruta)}`,
  }));

  // 3. Montaje --------------------------------------------------------------
  log.info('Montando el video con Remotion (esto tarda un poco)...');

  const entrada = resolve(RAIZ, 'remotion/index.js');
  const paquete = await bundle({ entryPoint: entrada, publicDir: publico });

  const props = {
    guion,
    palabras,
    audio: `${id}/voz.mp3`,
    fondos: fondosParaRemotion,
    duracionSegundos,
    marca: { colores: marca.colores ?? {} },
  };

  // browserExecutable va en AMBAS llamadas: selectComposition tambien abre un
  // navegador, y si solo se le pasa a renderMedia intenta descargar Chrome.
  const navegador = config.video.navegador || undefined;

  const composicion = await selectComposition({
    serveUrl: paquete,
    id: 'Reel',
    inputProps: props,
    browserExecutable: navegador,
  });

  const salida = resolve(RAIZ, 'salida', `${id}.mp4`);
  mkdirSync(resolve(RAIZ, 'salida'), { recursive: true });

  await renderMedia({
    composition: composicion,
    serveUrl: paquete,
    codec: 'h264',
    pixelFormat: 'yuv420p',
    outputLocation: salida,
    inputProps: props,
    browserExecutable: navegador,
    onProgress: ({ progress }) => {
      if (Math.round(progress * 100) % 20 === 0) {
        process.stdout.write(`\r    ${Math.round(progress * 100)}%`);
      }
    },
  });

  process.stdout.write('\n');

  actualizarPublicacion(config.rutas.historial, id, {
    estado: 'video_listo',
    video: {
      ruta: salida,
      duracionSegundos,
      modoFondo,
      producidoEn: new Date().toISOString(),
    },
  });

  log.ok(`Video listo: ${salida}`);
  log.info(
    `Siguiente paso: subelo a una URL publica y ejecuta\n` +
      `  npm run publicar -- --id ${id} --video <URL>`
  );

  return { ruta: salida, duracionSegundos };
}
