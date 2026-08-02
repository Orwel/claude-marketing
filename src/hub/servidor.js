import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, createReadStream } from 'node:fs';
import { extname } from 'node:path';
import { config } from '../config.js';
import { log } from '../util/log.js';
import { leerHistorial, actualizarPublicacion, leerJson } from '../util/almacen.js';
import { pagina } from './pagina.js';

/**
 * El hub de revision.
 *
 * Existe por una razon concreta: la estrategia es "el agente produce, tu
 * apruebas", y en una terminal no se puede ver un video. Sin un sitio donde
 * MIRAR el reel antes de publicarlo, la revision no ocurre — y una revision
 * que no ocurre es peor que no tenerla, porque da falsa sensacion de control.
 *
 * Deliberadamente sin framework ni build: es un servidor http de Node y una
 * pagina. Arranca en un segundo, no tiene dependencias que actualizar, y se
 * abre desde el movil en la misma red. Cuando haga falta mas (graficas,
 * edicion en vivo con @remotion/player) se migra a Next; hasta entonces
 * esto sobra.
 */

const TIPOS_MIME = {
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.json': 'application/json',
};

export function arrancarHub({ puerto = config.hub.puerto } = {}) {
  const servidor = createServer(async (peticion, respuesta) => {
    const url = new URL(peticion.url, `http://${peticion.headers.host}`);
    const ruta = url.pathname;

    try {
      if (ruta === '/') return enviarHtml(respuesta, pagina());
      if (ruta === '/api/publicaciones') return enviarJson(respuesta, estadoActual());
      if (ruta.startsWith('/video/')) return enviarVideo(peticion, respuesta, ruta.slice(7));

      if (peticion.method === 'POST' && ruta.startsWith('/api/')) {
        const [, , accion, id] = ruta.split('/');
        return enviarJson(respuesta, await ejecutar(accion, id));
      }

      respuesta.writeHead(404).end('No encontrado');
    } catch (e) {
      log.error(`${ruta}: ${e.message}`);
      enviarJson(respuesta, { error: e.message }, 500);
    }
  });

  servidor.listen(puerto, '0.0.0.0', () => {
    log.ok(`Hub de revision en http://localhost:${puerto}`);
    log.info('Desde el movil: usa la IP de esta maquina en la misma red.');
  });

  return servidor;
}

/**
 * El estado que ve la interfaz. Se calcula en cada peticion en vez de
 * cachearse: el historial lo escriben tambien los comandos de la CLI y el
 * cron, asi que cachear serviria datos viejos sin avisar.
 */
function estadoActual() {
  const historial = leerHistorial(config.rutas.historial);
  const marca = leerJson(config.rutas.marca);
  const tipos = leerJson(config.rutas.tiposVideo) ?? [];

  const publicaciones = [...historial.publicaciones].reverse().map((p) => ({
    id: p.id,
    estado: p.estado,
    creadaEn: p.creadaEn,
    publicadaEn: p.publicadaEn ?? null,
    enlaceInstagram: p.enlaceInstagram ?? null,
    tipoVideo: p.guion?.tipoVideo,
    nombreTipo: tipos.find((t) => t.id === p.guion?.tipoVideo)?.nombre ?? p.guion?.tipoVideo,
    gancho: p.guion?.gancho,
    razonDelTipo: p.guion?.razonDelTipo,
    escenas: p.guion?.guion ?? [],
    pieDeFoto: p.guion?.pieDeFoto,
    hashtags: p.guion?.hashtags ?? [],
    duracion: p.video?.duracionSegundos ?? p.guion?.duracionEstimadaSegundos,
    modoFondo: p.video?.modoFondo ?? null,
    tieneVideo: Boolean(p.video?.ruta && existsSync(p.video.ruta)),
    problemas: p.problemasValidacion ?? [],
    metricas: p.metricas ?? null,
  }));

  return {
    marca: marca?.nombre ?? 'sin configurar',
    simulando: config.operacion.simular,
    publicaciones,
    aprendizajes: historial.aprendizajes.slice(-3).reverse(),
    resumen: {
      porRevisar: publicaciones.filter((p) => p.estado === 'video_listo').length,
      sinVideo: publicaciones.filter((p) => p.estado?.startsWith('borrador')).length,
      publicadas: publicaciones.filter((p) => p.estado === 'publicada').length,
    },
  };
}

/**
 * Las acciones reutilizan exactamente las mismas funciones que la CLI.
 * Nada de logica duplicada: si aprobar desde el hub hiciera algo distinto
 * que publicar desde la terminal, tarde o temprano divergirian.
 */
async function ejecutar(accion, id) {
  if (accion === 'publicar') {
    const { publicar } = await import('../flujo/publicar.js');
    return publicar({ id });
  }

  if (accion === 'producir') {
    const { producir } = await import('../video/producir.js');
    return producir({ id });
  }

  if (accion === 'planificar') {
    const { planificar } = await import('../flujo/planificar.js');
    return planificar();
  }

  if (accion === 'descartar') {
    return actualizarPublicacion(config.rutas.historial, id, {
      estado: 'descartada',
      descartadaEn: new Date().toISOString(),
    });
  }

  throw new Error(`Accion desconocida: ${accion}`);
}

/** Sirve el mp4 con soporte de Range, o el navegador no deja saltar dentro del video. */
function enviarVideo(peticion, respuesta, id) {
  const historial = leerHistorial(config.rutas.historial);
  const publicacion = historial.publicaciones.find((p) => p.id === id);
  const ruta = publicacion?.video?.ruta;

  if (!ruta || !existsSync(ruta)) return respuesta.writeHead(404).end('Sin video');

  const { size } = statSync(ruta);
  const tipo = TIPOS_MIME[extname(ruta)] ?? 'application/octet-stream';
  const rango = peticion.headers.range;

  if (!rango) {
    respuesta.writeHead(200, { 'Content-Type': tipo, 'Content-Length': size });
    return createReadStream(ruta).pipe(respuesta);
  }

  const [inicioTexto, finTexto] = rango.replace('bytes=', '').split('-');
  const inicio = Number(inicioTexto);
  const fin = finTexto ? Number(finTexto) : size - 1;

  respuesta.writeHead(206, {
    'Content-Range': `bytes ${inicio}-${fin}/${size}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': fin - inicio + 1,
    'Content-Type': tipo,
  });
  createReadStream(ruta, { start: inicio, end: fin }).pipe(respuesta);
}

const enviarHtml = (r, html) =>
  r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(html);

const enviarJson = (r, datos, codigo = 200) =>
  r.writeHead(codigo, { 'Content-Type': 'application/json; charset=utf-8' }).end(
    JSON.stringify(datos)
  );
