import { config, exigir } from '../config.js';
import { log } from '../util/log.js';
import { leerHistorial, actualizarPublicacion } from '../util/almacen.js';
import { subirMedio } from '../blotato/media.js';
import { publicarEnInstagram, componerTexto } from '../blotato/posts.js';
import { subirVideo } from '../almacenamiento/subir.js';

/**
 * Etapa 2: publicar.
 *
 * Dos pasos contra Blotato, en este orden y no en otro:
 *   1. POST /v2/media  -> Blotato descarga el video y lo aloja
 *   2. POST /v2/posts  -> se publica usando la URL alojada
 *
 * Si SIMULAR=true no se toca la API: se imprime lo que se enviaria.
 * Dejalo en true hasta que hayas visto un par de guiones que te convenzan.
 */
export async function publicar({ id, urlVideo, programarPara = null }) {
  log.paso('Publicando');

  if (!id) throw new Error('Falta --id. Usa el id que devolvio "npm run planificar".');

  const historial = leerHistorial(config.rutas.historial);
  const publicacion = historial.publicaciones.find((p) => p.id === id);

  if (!publicacion) throw new Error(`No existe la publicacion ${id} en el historial`);
  if (publicacion.estado === 'publicada') {
    throw new Error(`La publicacion ${id} ya se publico el ${publicacion.publicadaEn}`);
  }

  // Sin --video se sube el mp4 que produjo "npm run producir". Es lo que
  // permite encadenar el flujo entero sin intervencion.
  if (!urlVideo) {
    if (!publicacion.video?.ruta) {
      throw new Error(
        `La publicacion ${id} no tiene video producido. Ejecuta primero:\n` +
          `  npm run producir -- --id ${id}\n` +
          `O pasa una URL publica con --video.`
      );
    }
    urlVideo = await subirVideo(publicacion.video.ruta);
  }

  const texto = componerTexto(publicacion.guion);

  if (config.operacion.simular) {
    log.aviso('SIMULAR=true — no se publica nada. Esto es lo que se enviaria:');
    console.log(JSON.stringify({ id, urlVideo, texto, programarPara }, null, 2));
    log.info('Pon SIMULAR=false en .env cuando quieras publicar de verdad.');
    return { simulado: true, texto };
  }

  exigir('blotato', 'cuentaInstagram');

  log.info('Subiendo el video a Blotato...');
  const urlAlojada = await subirMedio(urlVideo);
  log.ok(`Medio alojado: ${urlAlojada}`);

  log.info(programarPara ? `Programando para ${programarPara}...` : 'Publicando ahora...');
  const { idPublicacionBlotato, respuesta } = await publicarEnInstagram({
    texto,
    urlMedio: urlAlojada,
    programarPara,
  });

  const actualizada = actualizarPublicacion(config.rutas.historial, id, {
    estado: 'publicada',
    publicadaEn: programarPara ?? new Date().toISOString(),
    textoPublicado: texto,
    urlVideo,
    urlMedioBlotato: urlAlojada,
    idPublicacionBlotato,
    respuestaBlotato: respuesta,
  });

  log.ok(`Publicada. id Blotato: ${idPublicacionBlotato ?? '(no devuelto)'}`);
  log.info('Las metricas tardan al menos 24h en ser representativas. Luego: npm run medir');

  return actualizada;
}
