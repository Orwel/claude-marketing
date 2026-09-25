import { config } from '../config.js';
import { log } from '../util/log.js';
import {
  leerJson,
  escribirJson,
  leerHistorial,
  registrarAprendizaje,
} from '../util/almacen.js';
import { analizarMetricas } from '../ia/analizar-metricas.js';

/**
 * Etapa 4: aprender. Aqui esta el valor real del sistema.
 *
 * Publicar automatizado lo hace cualquiera. Lo que distingue a esto es que
 * el analisis de hoy se escribe en el historial y se convierte en contexto
 * de entrada del guion de manana. El bucle se cierra asi:
 *
 *   planificar -> publicar -> medir -> APRENDER -> planificar (mejor)
 *
 * Dos efectos concretos:
 *   1. Los aprendizajes se guardan en historial.aprendizajes, que
 *      generar-guion.js lee en cada ejecucion.
 *   2. Los tipos de video se repriorizan en data/tipos-video.json: lo que
 *      funciona sube de peso, lo que no funciona tras >=3 intentos se
 *      desactiva. El sistema estrecha su repertorio con la evidencia.
 */
export async function aprender({ aplicarCambios = true } = {}) {
  log.paso('Analizando resultados');

  const marca = leerJson(config.rutas.marca);
  const historial = leerHistorial(config.rutas.historial);
  const conMetricas = historial.publicaciones.filter((p) => p.metricas);

  if (!conMetricas.length) {
    log.aviso('Todavia no hay publicaciones con metricas. Ejecuta "npm run medir" primero.');
    return null;
  }

  if (conMetricas.length < 3) {
    log.aviso(
      `Solo ${conMetricas.length} publicacion(es) con metricas. El analisis se hara, ` +
        `pero cualquier patron tendra confianza baja. Con 5+ empieza a ser util.`
    );
  }

  const analisis = await analizarMetricas({
    publicaciones: historial.publicaciones,
    marca,
    aprendizajesPrevios: historial.aprendizajes,
  });

  registrarAprendizaje(config.rutas.historial, {
    basadoEnPublicaciones: conMetricas.length,
    ...analisis,
  });

  console.log(`\n  ${analisis.resumen}\n`);

  if (analisis.hallazgos.length) {
    console.log('  Hallazgos:');
    analisis.hallazgos.forEach((h) => {
      console.log(`   • [${h.confianza}] ${h.patron}`);
      console.log(`     ${h.evidencia}`);
    });
  }

  if (analisis.ajustes.length) {
    console.log('\n  Ajustes para las proximas publicaciones:');
    analisis.ajustes.forEach((a) => console.log(`   • ${a.campo}: ${a.cambio} (${a.motivo})`));
  }

  if (aplicarCambios) {
    repriorizarTipos(analisis, historial);
  }

  console.log();
  log.ok('Aprendizaje guardado. La proxima planificacion ya lo tendra en cuenta.');

  return analisis;
}

/**
 * Traduce el analisis a cambios en tipos-video.json.
 * Aqui esta la parte que hace que el sistema mejore en vez de solo opinar.
 */
function repriorizarTipos(analisis, historial) {
  const tipos = leerJson(config.rutas.tiposVideo);
  if (!tipos?.length) return;

  const intentosPorTipo = {};
  for (const p of historial.publicaciones) {
    const t = p.guion?.tipoVideo;
    if (t) intentosPorTipo[t] = (intentosPorTipo[t] ?? 0) + 1;
  }

  let cambios = 0;

  for (const tipo of tipos) {
    const posicion = analisis.tiposVideoAPriorizar.indexOf(tipo.id);

    if (posicion !== -1) {
      const nuevoPeso = Math.min(10, (tipo.peso ?? 5) + (posicion === 0 ? 2 : 1));
      if (nuevoPeso !== tipo.peso) {
        tipo.peso = nuevoPeso;
        cambios++;
      }
      // Un tipo que vuelve a funcionar se reactiva
      if (tipo.activo === false) {
        tipo.activo = true;
        cambios++;
      }
    }

    // Nunca se retira un tipo con menos de 3 intentos: no hay senal suficiente
    if (analisis.tiposVideoARetirar.includes(tipo.id)) {
      const intentos = intentosPorTipo[tipo.id] ?? 0;
      if (intentos >= 3) {
        if (tipo.activo !== false) {
          tipo.activo = false;
          cambios++;
          log.info(`Tipo "${tipo.id}" desactivado tras ${intentos} intentos sin resultado`);
        }
      } else {
        log.info(
          `Tipo "${tipo.id}" marcado para retirar pero solo lleva ${intentos} intento(s). ` +
            `Se mantiene activo hasta tener 3.`
        );
      }
    }
  }

  if (cambios) {
    escribirJson(config.rutas.tiposVideo, tipos);
    log.ok(`${cambios} ajuste(s) aplicados a data/tipos-video.json`);
  }
}
