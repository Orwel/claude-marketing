import { config } from '../config.js';
import { log } from '../util/log.js';
import { pendientesDeMedir, actualizarPublicacion } from '../util/almacen.js';
import { buscarMedioPorTexto, obtenerInsights } from '../instagram/insights.js';

/**
 * Etapa 3: recoger metricas.
 *
 * Solo mide publicaciones con al menos 24h de vida: antes de eso los
 * numeros aun se estan moviendo y comparar es enganarse.
 */
export async function medir({ horasMinimas = 24 } = {}) {
  log.paso('Recogiendo metricas de Instagram');

  const pendientes = pendientesDeMedir(config.rutas.historial, horasMinimas);

  if (!pendientes.length) {
    log.info(`No hay publicaciones con mas de ${horasMinimas}h pendientes de medir.`);
    return [];
  }

  log.info(`${pendientes.length} publicacion(es) por medir`);
  const medidas = [];

  for (const publicacion of pendientes) {
    try {
      const medio = await buscarMedioPorTexto(publicacion.textoPublicado);

      if (!medio) {
        log.aviso(
          `${publicacion.id}: no se encontro el post en Instagram. ` +
            `Puede que aun no se haya publicado o que el caption cambiara.`
        );
        continue;
      }

      const metricas = await obtenerInsights(medio.id);

      actualizarPublicacion(config.rutas.historial, publicacion.id, {
        idMedioInstagram: medio.id,
        enlaceInstagram: medio.permalink,
        metricas,
        medidaEn: new Date().toISOString(),
      });

      log.ok(
        `${publicacion.id} (${publicacion.guion?.tipoVideo}): ` +
          `${metricas.views ?? 0} vistas, ` +
          `${metricas.tasaInteraccion ?? '?'}% interaccion, ` +
          `${metricas.tasaGuardado ?? '?'}% guardado`
      );

      medidas.push({ id: publicacion.id, metricas });
    } catch (e) {
      log.error(`${publicacion.id}: ${e.message}`);
    }
  }

  if (medidas.length) {
    log.info('Siguiente paso: npm run aprender');
  }

  return medidas;
}
