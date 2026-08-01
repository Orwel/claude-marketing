/**
 * Esquemas JSON para structured outputs.
 *
 * Reglas de la API que hay que respetar o la peticion falla:
 *  - todo objeto lleva `additionalProperties: false`
 *  - `required` debe listar TODAS las propiedades (no hay opcionales)
 *  - no se admiten restricciones numericas (minimum/maximum) ni de longitud
 *    (minLength/maxLength): esas se validan en codigo, no en el esquema
 *  - no se admiten esquemas recursivos
 */

export const ESQUEMA_GUION = {
  type: 'object',
  properties: {
    tipoVideo: {
      type: 'string',
      description: 'El id del tipo de video elegido, tal cual aparece en tipos-video.json',
    },
    razonDelTipo: {
      type: 'string',
      description: 'Por que este tipo hoy, citando datos del historial si los hay',
    },
    gancho: {
      type: 'string',
      description: 'Los primeros 3 segundos hablados. Lo que decide si se quedan o pasan',
    },
    guion: {
      type: 'array',
      description: 'El guion dividido en escenas, en orden',
      items: {
        type: 'object',
        properties: {
          segundoInicio: { type: 'integer' },
          segundoFin: { type: 'integer' },
          voz: { type: 'string', description: 'Lo que se dice en voz alta' },
          enPantalla: { type: 'string', description: 'Texto sobreimpreso o accion visual' },
        },
        required: ['segundoInicio', 'segundoFin', 'voz', 'enPantalla'],
        additionalProperties: false,
      },
    },
    pieDeFoto: {
      type: 'string',
      description: 'El caption de Instagram, con su llamada a la accion',
    },
    hashtags: {
      type: 'array',
      description: 'Entre 3 y 8 hashtags, sin la almohadilla',
      items: { type: 'string' },
    },
    duracionEstimadaSegundos: { type: 'integer' },
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
  additionalProperties: false,
};

export const ESQUEMA_ANALISIS = {
  type: 'object',
  properties: {
    resumen: {
      type: 'string',
      description: 'Que paso, en dos frases, sin adornos',
    },
    hallazgos: {
      type: 'array',
      description: 'Patrones concretos respaldados por los numeros del historial',
      items: {
        type: 'object',
        properties: {
          patron: { type: 'string' },
          evidencia: {
            type: 'string',
            description: 'Las metricas concretas que lo sostienen',
          },
          confianza: {
            type: 'string',
            enum: ['alta', 'media', 'baja'],
            description: 'baja si hay menos de 5 publicaciones comparables',
          },
        },
        required: ['patron', 'evidencia', 'confianza'],
        additionalProperties: false,
      },
    },
    ajustes: {
      type: 'array',
      description: 'Cambios accionables para las proximas publicaciones',
      items: {
        type: 'object',
        properties: {
          campo: {
            type: 'string',
            enum: ['tipoVideo', 'gancho', 'duracion', 'pieDeFoto', 'hashtags', 'horaPublicacion'],
          },
          cambio: { type: 'string', description: 'Que hacer distinto, en imperativo' },
          motivo: { type: 'string' },
        },
        required: ['campo', 'cambio', 'motivo'],
        additionalProperties: false,
      },
    },
    tiposVideoAPriorizar: {
      type: 'array',
      description: 'Ids de tipos de video que estan funcionando, de mejor a peor',
      items: { type: 'string' },
    },
    tiposVideoARetirar: {
      type: 'array',
      description: 'Ids de tipos que no funcionan tras suficientes intentos',
      items: { type: 'string' },
    },
  },
  required: ['resumen', 'hallazgos', 'ajustes', 'tiposVideoAPriorizar', 'tiposVideoARetirar'],
  additionalProperties: false,
};
