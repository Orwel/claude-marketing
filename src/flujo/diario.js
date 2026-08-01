import { log } from '../util/log.js';
import { medir } from './medir.js';
import { aprender } from './aprender.js';
import { planificar } from './planificar.js';

/**
 * El ciclo diario completo, en el orden que hace que el bucle funcione:
 *
 *   1. MEDIR    las publicaciones de dias anteriores
 *   2. APRENDER de esas metricas
 *   3. PLANIFICAR la de hoy, ya con el aprendizaje incorporado
 *
 * El orden importa. Si planificaras antes de aprender, el guion de hoy
 * se escribiria sin los datos de ayer y el bucle no cerraria.
 *
 * La publicacion NO va aqui a proposito: requiere que el video exista,
 * y la produccion del video todavia es manual.
 */
export async function diario() {
  log.paso('Ciclo diario');

  try {
    await medir();
  } catch (e) {
    log.error(`Fallo al medir (se continua): ${e.message}`);
  }

  try {
    await aprender();
  } catch (e) {
    log.error(`Fallo al aprender (se continua): ${e.message}`);
  }

  // Planificar si falla, si falla de verdad: sin guion no hay dia.
  await planificar();

  log.paso('Ciclo diario completado');
}
