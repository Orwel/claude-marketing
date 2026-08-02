import { GoogleGenAI } from '@google/genai';
import { config, exigir } from '../config.js';

let cliente;

export function obtenerCliente() {
  exigir('ia');
  cliente ??= new GoogleGenAI({ apiKey: config.ia.apiKey });
  return cliente;
}

/**
 * El control de profundidad de razonamiento cambio de nombre entre familias:
 *  - Gemini 2.5 -> thinkingConfig.thinkingBudget (-1 = dinamico, el modelo decide)
 *  - Gemini 3   -> thinkingConfig.thinkingLevel  ('low' | 'medium' | 'high')
 *
 * Mandar el parametro de la otra familia da error, asi que se elige por el
 * id del modelo. Cuando salga una familia nueva, este es el unico sitio a tocar.
 */
function configuracionDeRazonamiento() {
  const nivel = config.ia.esfuerzo;

  if (config.ia.modelo.startsWith('gemini-3')) {
    // 'xhigh' y 'max' no existen en Gemini; se mapean al techo real.
    const equivalencias = { low: 'low', medium: 'medium', high: 'high', xhigh: 'high', max: 'high' };
    return { thinkingLevel: equivalencias[nivel] ?? 'high' };
  }

  // -1 deja que el modelo decida cuanto pensar, que es lo que queremos
  // salvo que se pida explicitamente el nivel mas bajo.
  return { thinkingBudget: nivel === 'low' ? 0 : -1 };
}

/**
 * Una llamada al modelo que devuelve JSON validado contra un esquema.
 *
 * Detalles de la API de Gemini que importan y que es facil equivocar:
 *  - `responseMimeType: 'application/json'` es OBLIGATORIO junto a responseSchema.
 *    Sin el, el modelo devuelve el JSON envuelto en markdown y JSON.parse revienta.
 *  - El esquema NO es JSON Schema completo, es un subconjunto de OpenAPI 3.0.
 *    Ver src/ia/esquemas.js para lo que se puede y no se puede usar.
 *  - El system prompt va en `config.systemInstruction`, no como un mensaje mas.
 *  - El texto se lee de `respuesta.text` (propiedad, no funcion).
 */
export async function pedirJsonAlModelo({ sistema, prompt, esquema, maxTokens = 8000 }) {
  const respuesta = await obtenerCliente().models.generateContent({
    model: config.ia.modelo,
    contents: prompt,
    config: {
      systemInstruction: sistema,
      responseMimeType: 'application/json',
      responseSchema: esquema,
      maxOutputTokens: maxTokens,
      thinkingConfig: configuracionDeRazonamiento(),
    },
  });

  const candidato = respuesta.candidates?.[0];
  const motivo = candidato?.finishReason;

  // Un bloqueo por filtros de seguridad no lanza excepcion: llega una respuesta
  // valida con finishReason distinto de STOP y sin texto. Hay que mirarlo
  // ANTES de intentar parsear, o el error que sale no dice nada util.
  if (motivo && motivo !== 'STOP') {
    if (motivo === 'MAX_TOKENS') {
      throw new Error(
        `Respuesta truncada por maxOutputTokens (${maxTokens}). Sube el limite y reintenta.`
      );
    }
    throw new Error(
      `El modelo no completo la respuesta (finishReason: ${motivo}). ` +
        `Si es SAFETY o PROHIBITED_CONTENT, revisa el prompt o el contenido de la marca.`
    );
  }

  const texto = respuesta.text;
  if (!texto) throw new Error('El modelo devolvio una respuesta vacia');

  try {
    return JSON.parse(texto);
  } catch (e) {
    throw new Error(`El modelo devolvio JSON invalido: ${e.message}\n${texto.slice(0, 500)}`);
  }
}
