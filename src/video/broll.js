import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { obtenerCliente } from '../ia/cliente.js';
import { config } from '../config.js';
import { log } from '../util/log.js';

/**
 * Fondo visual de cada escena. Dos modos, y la eleccion importa mas de lo
 * que parece:
 *
 *  - 'plantilla' (por defecto): sin generacion. Remotion compone texto animado
 *    sobre los colores de la marca. Es gratis, instantaneo, consistente entre
 *    videos, y para los tipos cuyo contenido ES texto (una clausula, una
 *    traduccion, tres puntos) es directamente lo correcto: un video generado
 *    detras de un texto legal solo distrae.
 *
 *  - 'ia': Veo genera un clip por escena. Cuesta dinero y minutos por escena,
 *    y para una marca cuya credibilidad es juridica puede restar mas que sumar.
 *    Uselo para escenas ambientales, no para las que llevan el dato.
 *
 * Veo se llama por la misma clave de Gemini que ya usa el guion, asi que no
 * hace falta credencial nueva.
 */

/**
 * Genera un clip de video por escena con Veo.
 * Es una operacion larga: la API acepta el trabajo y hay que sondearla.
 */
export async function generarBrollConIA({ escenas, directorio, marca }) {
  const ia = obtenerCliente();
  const clips = [];

  for (const [i, escena] of escenas.entries()) {
    const prompt = construirPrompt(escena, marca);
    log.info(`Escena ${i + 1}/${escenas.length}: generando b-roll con ${config.video.modeloVeo}...`);

    let operacion = await ia.models.generateVideos({
      model: config.video.modeloVeo,
      prompt,
      config: {
        aspectRatio: '9:16',
        numberOfVideos: 1,
      },
    });

    // La generacion tarda minutos. Se sondea con espera entre intentos;
    // sin el sleep esto seria un bucle ocupado contra la API.
    const limite = Date.now() + config.video.esperaMaxVeoMs;
    while (!operacion.done) {
      if (Date.now() > limite) {
        throw new Error(
          `Veo no termino la escena ${i + 1} en ${config.video.esperaMaxVeoMs / 60000} minutos. ` +
            `Sube VEO_ESPERA_MAX_MIN o usa MODO_FONDO=plantilla.`
        );
      }
      await new Promise((r) => setTimeout(r, 10000));
      operacion = await ia.operations.getVideosOperation({ operation: operacion });
    }

    const generado = operacion.response?.generatedVideos?.[0];
    if (!generado) throw new Error(`Veo no devolvio video para la escena ${i + 1}`);

    const ruta = resolve(directorio, `escena-${String(i + 1).padStart(2, '0')}.mp4`);
    mkdirSync(dirname(ruta), { recursive: true });
    await ia.files.download({ file: generado.video, downloadPath: ruta });

    log.ok(`Escena ${i + 1} lista: ${ruta}`);
    clips.push({ indice: i, ruta });
  }

  return clips;
}

/**
 * El prompt de video no debe repetir lo que dice la voz: el texto ya va en
 * pantalla y en el audio. Lo que se pide aqui es ambiente, no ilustracion
 * literal, y sin texto incrustado (Veo lo escribe mal y ademas chocaria con
 * los subtitulos).
 */
function construirPrompt(escena, marca) {
  return [
    `Plano vertical 9:16, cinematografico, iluminacion natural suave.`,
    `Ambiente para una escena cuyo tema es: "${escena.enPantalla}".`,
    `Contexto de marca: ${marca.queHace}`,
    `Sin texto ni letras en la imagen. Sin personas hablando a camara.`,
    `Movimiento de camara lento. Paleta sobria y profesional.`,
  ].join(' ');
}

/** Escribe una imagen de fondo estatica por escena usando Imagen (mas barato que Veo). */
export async function generarFondosConImagen({ escenas, directorio, marca }) {
  const ia = obtenerCliente();
  const fondos = [];

  for (const [i, escena] of escenas.entries()) {
    log.info(`Escena ${i + 1}/${escenas.length}: generando fondo con ${config.video.modeloImagen}...`);

    const respuesta = await ia.models.generateImages({
      model: config.video.modeloImagen,
      prompt: construirPrompt(escena, marca),
      config: { numberOfImages: 1, aspectRatio: '9:16' },
    });

    const imagen = respuesta.generatedImages?.[0]?.image;
    if (!imagen?.imageBytes) throw new Error(`Imagen no devolvio nada para la escena ${i + 1}`);

    const ruta = resolve(directorio, `fondo-${String(i + 1).padStart(2, '0')}.png`);
    mkdirSync(dirname(ruta), { recursive: true });
    writeFileSync(ruta, Buffer.from(imagen.imageBytes, 'base64'));

    fondos.push({ indice: i, ruta });
  }

  return fondos;
}
