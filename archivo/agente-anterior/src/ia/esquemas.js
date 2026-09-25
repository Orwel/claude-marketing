import { Type } from '@google/genai';

/**
 * Esquemas para structured outputs de Gemini.
 *
 * OJO: esto NO es JSON Schema completo, es un subconjunto de OpenAPI 3.0.
 * Diferencias que rompen si se ignoran:
 *  - NO admite `additionalProperties`: el SDK lo rechaza en validacion local,
 *    antes siquiera de llamar a la API. (En la de Anthropic es obligatorio,
 *    asi que al portar codigo entre las dos hay que quitarlo o ponerlo.)
 *  - `propertyOrdering` define el orden en que el modelo genera los campos.
 *    No es cosmetico: el orden afecta a la calidad, porque lo que se genera
 *    primero condiciona lo que viene despues. Por eso el razonamiento
 *    (razonDelTipo) va antes que el contenido que justifica.
 *  - Los tipos se declaran con el enum `Type` del SDK, no con strings sueltos.
 *  - No admite esquemas recursivos.
 */

export const ESQUEMA_GUION = {
  type: Type.OBJECT,
  properties: {
    tipoVideo: {
      type: Type.STRING,
      description: 'El id del tipo de video elegido, tal cual aparece en tipos-video.json',
    },
    razonDelTipo: {
      type: Type.STRING,
      description: 'Por que este tipo hoy, citando datos del historial si los hay',
    },
    gancho: {
      type: Type.STRING,
      description: 'Los primeros 3 segundos hablados. Lo que decide si se quedan o pasan',
    },
    guion: {
      type: Type.ARRAY,
      description: 'El guion dividido en escenas, en orden',
      items: {
        type: Type.OBJECT,
        properties: {
          segundoInicio: { type: Type.INTEGER },
          segundoFin: { type: Type.INTEGER },
          voz: { type: Type.STRING, description: 'Lo que se dice en voz alta' },
          enPantalla: {
            type: Type.STRING,
            description: 'Texto sobreimpreso o accion visual',
          },
        },
        required: ['segundoInicio', 'segundoFin', 'voz', 'enPantalla'],
        propertyOrdering: ['segundoInicio', 'segundoFin', 'voz', 'enPantalla'],
      },
    },
    pieDeFoto: {
      type: Type.STRING,
      description: 'El caption de Instagram, con su llamada a la accion',
    },
    hashtags: {
      type: Type.ARRAY,
      description: 'Entre 3 y 8 hashtags, sin la almohadilla',
      items: { type: Type.STRING },
    },
    duracionEstimadaSegundos: { type: Type.INTEGER },
  },
  required: [
    'tipoVideo',
    'razonDelTipo',
    'gancho',
    'guion',
    'pieDeFoto',
    'hashtags',
    'duracionEstimadaSegundos',
  ],
  // El razonamiento primero: elegir el tipo y justificarlo condiciona
  // el gancho, y el gancho condiciona el resto del guion.
  propertyOrdering: [
    'tipoVideo',
    'razonDelTipo',
    'gancho',
    'guion',
    'duracionEstimadaSegundos',
    'pieDeFoto',
    'hashtags',
  ],
};

export const ESQUEMA_ANALISIS = {
  type: Type.OBJECT,
  properties: {
    resumen: { type: Type.STRING, description: 'Que paso, en dos frases, sin adornos' },
    hallazgos: {
      type: Type.ARRAY,
      description: 'Patrones concretos respaldados por los numeros del historial',
      items: {
        type: Type.OBJECT,
        properties: {
          patron: { type: Type.STRING },
          evidencia: {
            type: Type.STRING,
            description: 'Las metricas concretas que lo sostienen',
          },
          confianza: {
            type: Type.STRING,
            enum: ['alta', 'media', 'baja'],
            description: 'baja si hay menos de 5 publicaciones comparables',
          },
        },
        required: ['patron', 'evidencia', 'confianza'],
        // La evidencia antes que la confianza: asi el modelo califica
        // lo que ya escribio en vez de justificar una nota puesta a priori.
        propertyOrdering: ['patron', 'evidencia', 'confianza'],
      },
    },
    ajustes: {
      type: Type.ARRAY,
      description: 'Cambios accionables para las proximas publicaciones',
      items: {
        type: Type.OBJECT,
        properties: {
          campo: {
            type: Type.STRING,
            enum: ['tipoVideo', 'gancho', 'duracion', 'pieDeFoto', 'hashtags', 'horaPublicacion'],
          },
          cambio: { type: Type.STRING, description: 'Que hacer distinto, en imperativo' },
          motivo: { type: Type.STRING },
        },
        required: ['campo', 'cambio', 'motivo'],
        propertyOrdering: ['campo', 'cambio', 'motivo'],
      },
    },
    tiposVideoAPriorizar: {
      type: Type.ARRAY,
      description: 'Ids de tipos de video que estan funcionando, de mejor a peor',
      items: { type: Type.STRING },
    },
    tiposVideoARetirar: {
      type: Type.ARRAY,
      description: 'Ids de tipos que no funcionan tras suficientes intentos',
      items: { type: Type.STRING },
    },
  },
  required: ['resumen', 'hallazgos', 'ajustes', 'tiposVideoAPriorizar', 'tiposVideoARetirar'],
  propertyOrdering: [
    'hallazgos',
    'resumen',
    'ajustes',
    'tiposVideoAPriorizar',
    'tiposVideoARetirar',
  ],
};
