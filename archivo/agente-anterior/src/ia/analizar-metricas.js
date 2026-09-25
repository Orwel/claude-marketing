import { pedirJsonAlModelo } from './cliente.js';
import { ESQUEMA_ANALISIS } from './esquemas.js';

const SISTEMA = `Eres un analista de rendimiento de contenido. Tu unico compromiso es con los datos.

Como analizas:
- Un patron con menos de 5 publicaciones comparables tiene confianza 'baja'. Dilo.
- No confundas correlacion con causa: si un video funciono, di que variables cambiaron,
  no cual "fue la razon".
- Los numeros absolutos importan menos que las tasas. Compara retencion y guardados
  antes que visualizaciones brutas.
- Si los datos no dan para concluir nada, dilo y propon que probar para tener senal.
  Un "no sabemos todavia" honesto vale mas que un patron inventado.
- No retires un tipo de video con menos de 3 intentos.`;

/**
 * El nucleo del bucle de mejora: convierte metricas crudas en ajustes
 * que la siguiente generacion de guion va a leer.
 */
export async function analizarMetricas({ publicaciones, marca, aprendizajesPrevios }) {
  const conMetricas = publicaciones.filter((p) => p.metricas);

  if (conMetricas.length === 0) {
    throw new Error(
      'No hay publicaciones con metricas todavia. Ejecuta "npm run medir" primero.'
    );
  }

  const prompt = [
    '## La marca y sus objetivos',
    JSON.stringify(marca, null, 2),
    '',
    `## Publicaciones con metricas (${conMetricas.length} en total)`,
    JSON.stringify(
      conMetricas.map((p) => ({
        id: p.id,
        publicadaEn: p.publicadaEn,
        tipoVideo: p.guion?.tipoVideo,
        gancho: p.guion?.gancho,
        duracionEstimadaSegundos: p.guion?.duracionEstimadaSegundos,
        numeroHashtags: p.guion?.hashtags?.length,
        metricas: p.metricas,
      })),
      null,
      2
    ),
    '',
    '## Analisis anteriores',
    aprendizajesPrevios.length
      ? JSON.stringify(aprendizajesPrevios.slice(-3), null, 2)
      : 'Ninguno: este es el primer analisis.',
    '',
    '## Tu tarea',
    'Analiza que esta funcionando y que no. Devuelve ajustes concretos que el',
    'generador de guiones pueda aplicar directamente en la siguiente publicacion.',
    'Si un analisis anterior propuso un ajuste, evalua si funciono.',
  ].join('\n');

  return pedirJsonAlModelo({ sistema: SISTEMA, prompt, esquema: ESQUEMA_ANALISIS });
}
