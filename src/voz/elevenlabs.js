/**
 * Locucion con la voz clonada en ElevenLabs, por HTTP y sin su SDK: es una
 * sola llamada y no vale una dependencia.
 *
 * Se usa el endpoint "with-timestamps" y no el simple: devuelve cuando empieza
 * y termina cada caracter, que es lo que permite subtitulos palabra a palabra
 * y medir la duracion exacta de cada frase. (Portado de
 * archivo/agente-anterior/src/voz/elevenlabs.js.)
 */
const BASE = 'https://api.elevenlabs.io/v1';

export async function locutar(texto, { apiKey, vozId, modelo = 'eleven_multilingual_v2' }) {
  if (!apiKey || !vozId) throw new Error('Faltan ELEVENLABS_API_KEY o ELEVENLABS_VOICE_ID en .env');
  const respuesta = await fetch(`${BASE}/text-to-speech/${vozId}/with-timestamps?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({
      text: texto,
      model_id: modelo,
      // Estabilidad media: una voz muy estable suena leida; muy baja, cambia de tono entre frases.
      voice_settings: { stability: 0.45, similarity_boost: 0.85, style: 0.2, use_speaker_boost: true },
    }),
  });
  if (!respuesta.ok) throw new Error(`ElevenLabs respondio ${respuesta.status}: ${(await respuesta.text()).slice(0, 300)}`);
  const datos = await respuesta.json();
  const alineacion = datos.normalized_alignment ?? datos.alignment;
  if (!alineacion) throw new Error('ElevenLabs no devolvio alineacion: sin ella no hay duracion ni subtitulos.');
  return {
    audio: Buffer.from(datos.audio_base64, 'base64'),
    duracion: alineacion.character_end_times_seconds.at(-1) ?? 0,
    palabras: agruparEnPalabras(alineacion),
  };
}

/** Tiempos por caracter → tiempos por palabra: cada palabra va del inicio de su primera letra al fin de la ultima. */
function agruparEnPalabras({ characters, character_start_times_seconds: inicios, character_end_times_seconds: fines }) {
  const palabras = [];
  let actual = null;
  characters.forEach((c, i) => {
    if (/\s/.test(c)) {
      if (actual) palabras.push(actual);
      actual = null;
      return;
    }
    actual ??= { texto: '', inicio: inicios[i], fin: fines[i] };
    actual.texto += c;
    actual.fin = fines[i];
  });
  if (actual) palabras.push(actual);
  return palabras;
}
