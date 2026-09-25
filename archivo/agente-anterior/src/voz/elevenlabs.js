import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { config, exigir } from '../config.js';
import { log } from '../util/log.js';

let cliente;

function obtenerCliente() {
  exigir('voz');
  cliente ??= new ElevenLabsClient({ apiKey: config.voz.apiKey });
  return cliente;
}

/**
 * Genera la locucion del guion y devuelve el audio + los tiempos exactos
 * de cada caracter.
 *
 * Se usa `convertWithTimestamps` y no `convert` a proposito: los timestamps
 * son lo que permite que los subtitulos caigan sincronizados palabra a palabra.
 * Sin ellos habria que estimar la duracion por numero de caracteres, y en
 * cuanto una frase lleva una pausa o una cifra la sincronia se rompe.
 * Es la diferencia entre un reel que parece hecho y uno que parece plantilla.
 */
export async function generarLocucion({ texto, rutaSalida }) {
  const respuesta = await obtenerCliente().textToSpeech.convertWithTimestamps(config.voz.voiceId, {
    text: texto,
    modelId: config.voz.modelo,
    outputFormat: 'mp3_44100_128',
  });

  const audio = Buffer.from(respuesta.audioBase64, 'base64');
  mkdirSync(dirname(rutaSalida), { recursive: true });
  writeFileSync(rutaSalida, audio);

  const alineacion = respuesta.normalizedAlignment ?? respuesta.alignment;
  if (!alineacion) {
    throw new Error(
      'ElevenLabs no devolvio alineacion temporal. Sin ella no hay subtitulos sincronizados.'
    );
  }

  const palabras = agruparEnPalabras(alineacion);
  const duracion = alineacion.characterEndTimesSeconds.at(-1) ?? 0;

  log.ok(`Locucion generada: ${duracion.toFixed(1)}s, ${palabras.length} palabras`);

  return { rutaAudio: rutaSalida, duracionSegundos: duracion, palabras };
}

/**
 * ElevenLabs devuelve tiempos por CARACTER; los subtitulos se leen por PALABRA.
 * Esto agrupa lo uno en lo otro: cada palabra hereda el inicio de su primer
 * caracter y el fin del ultimo.
 */
function agruparEnPalabras(alineacion) {
  const { characters, characterStartTimesSeconds: inicios, characterEndTimesSeconds: fines } =
    alineacion;

  const palabras = [];
  let actual = null;

  characters.forEach((caracter, i) => {
    if (/\s/.test(caracter)) {
      if (actual) {
        palabras.push(actual);
        actual = null;
      }
      return;
    }

    if (!actual) actual = { texto: '', inicio: inicios[i], fin: fines[i] };
    actual.texto += caracter;
    actual.fin = fines[i];
  });

  if (actual) palabras.push(actual);
  return palabras;
}

/** Lista las voces de la cuenta. Se usa en `npm run probar` para elegir voiceId. */
export async function listarVoces() {
  const { voices } = await obtenerCliente().voices.getAll();
  return voices.map((v) => ({
    id: v.voiceId,
    nombre: v.name,
    categoria: v.category,
    idioma: v.labels?.language ?? v.fineTuning?.language ?? null,
  }));
}
