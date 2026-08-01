import Anthropic from '@anthropic-ai/sdk';
import { config, exigir } from '../config.js';

let cliente;

export function obtenerCliente() {
  exigir('ia');
  cliente ??= new Anthropic({ apiKey: config.ia.apiKey });
  return cliente;
}

/**
 * Una llamada al modelo que devuelve JSON validado contra un esquema.
 *
 * Detalles de la API que importan y que es facil equivocar:
 *  - `thinking: {type: 'adaptive'}` — el modelo decide cuanto razonar.
 *    `budget_tokens` esta ELIMINADO en Opus 5 y devuelve 400.
 *  - `output_config.format` — el parametro `output_format` de nivel superior
 *    esta obsoleto; el bueno va anidado dentro de output_config.
 *  - NO se envia `temperature` / `top_p` / `top_k`: Opus 5 los rechaza con 400.
 *  - El esquema necesita `additionalProperties: false` y `required` completo.
 */
export async function pedirJsonAlModelo({ sistema, prompt, esquema, maxTokens = 8000 }) {
  const respuesta = await obtenerCliente().messages.create({
    model: config.ia.modelo,
    max_tokens: maxTokens,
    system: sistema,
    thinking: { type: 'adaptive' },
    output_config: {
      effort: config.ia.esfuerzo,
      format: { type: 'json_schema', schema: esquema },
    },
    messages: [{ role: 'user', content: prompt }],
  });

  // Una negativa por seguridad llega como HTTP 200 con stop_reason 'refusal'
  // y content vacio. Hay que comprobarlo ANTES de leer content[0].
  if (respuesta.stop_reason === 'refusal') {
    throw new Error(
      `El modelo rechazo la peticion (${respuesta.stop_details?.category ?? 'sin categoria'}). ` +
        `Revisa el prompt o el contenido de la marca.`
    );
  }

  if (respuesta.stop_reason === 'max_tokens') {
    throw new Error(
      `Respuesta truncada por max_tokens (${maxTokens}). Sube el limite y reintenta.`
    );
  }

  const bloque = respuesta.content.find((b) => b.type === 'text');
  if (!bloque) throw new Error('El modelo no devolvio ningun bloque de texto');

  try {
    return JSON.parse(bloque.text);
  } catch (e) {
    throw new Error(`El modelo devolvio JSON invalido: ${e.message}\n${bloque.text.slice(0, 500)}`);
  }
}
