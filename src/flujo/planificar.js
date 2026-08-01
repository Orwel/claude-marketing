import { config } from '../config.js';
import { log } from '../util/log.js';
import { leerJson, leerHistorial, registrarPublicacion } from '../util/almacen.js';
import { generarGuion } from '../ia/generar-guion.js';
import { validarGuion } from '../video/validar.js';

/**
 * Etapa 1: decidir que se publica hoy.
 *
 * Lee la marca, los tipos de video y — esto es lo importante — los
 * aprendizajes acumulados, y produce un guion listo para grabar.
 */
export async function planificar() {
  log.paso('Planificando la publicacion de hoy');

  const marca = leerJson(config.rutas.marca);
  const tiposVideo = leerJson(config.rutas.tiposVideo);

  if (!marca) throw new Error(`Falta data/marca.json. Copia la plantilla y rellenala.`);
  if (!tiposVideo?.length) throw new Error(`Falta data/tipos-video.json o esta vacio.`);

  const historial = leerHistorial(config.rutas.historial);
  const activos = tiposVideo.filter((t) => t.activo !== false);

  log.info(
    `${activos.length} tipos de video activos, ` +
      `${historial.aprendizajes.length} analisis previos, ` +
      `${historial.publicaciones.length} publicaciones en historial`
  );

  const guion = await generarGuion({
    marca,
    tiposVideo: activos,
    aprendizajes: historial.aprendizajes,
    publicacionesRecientes: historial.publicaciones,
  });

  const problemas = validarGuion(guion, activos);
  if (problemas.length) {
    log.aviso('El guion tiene problemas que hay que corregir antes de grabar:');
    problemas.forEach((p) => console.log(`  - ${p}`));
  }

  const id = registrarPublicacion(config.rutas.historial, {
    creadaEn: new Date().toISOString(),
    estado: problemas.length ? 'borrador_con_avisos' : 'borrador',
    guion,
    problemasValidacion: problemas,
  });

  log.ok(`Guion generado: ${id}`);
  console.log(`\n  Tipo:    ${guion.tipoVideo}`);
  console.log(`  Motivo:  ${guion.razonDelTipo}`);
  console.log(`  Gancho:  "${guion.gancho}"`);
  console.log(`  Duracion: ${guion.duracionEstimadaSegundos}s\n`);

  guion.guion.forEach((e) => {
    console.log(`  [${e.segundoInicio}-${e.segundoFin}s] ${e.voz}`);
    console.log(`              ↳ en pantalla: ${e.enPantalla}`);
  });

  console.log(`\n  Pie de foto:\n  ${guion.pieDeFoto}`);
  console.log(`  Hashtags: ${guion.hashtags.join(' ')}\n`);

  log.info(
    `Siguiente paso: graba el video segun este guion, subelo a una URL publica y ejecuta:\n` +
      `  npm run publicar -- --id ${id} --video <URL>`
  );

  return { id, guion, problemas };
}
