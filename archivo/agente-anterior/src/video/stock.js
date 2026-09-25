import { createWriteStream, mkdirSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { resolve } from 'node:path';
import { config, exigir } from '../config.js';
import { log } from '../util/log.js';
import { pedirJson, conReintentos } from '../util/reintentos.js';

/**
 * B-roll de archivo desde Pexels.
 *
 * Es la alternativa barata a Veo: gratis, licencia de uso comercial sin
 * atribucion obligatoria, y devuelve video real en vez de generado. Para
 * planos ambientales (una oficina, unas manos escribiendo, una ciudad) es
 * indistinguible de lo generado y cuesta cero.
 *
 * Limite: 200 peticiones/hora, de sobra para un video al dia.
 *
 * Donde NO sirve: cuando necesitas un plano especifico que no existe en
 * un banco. Ahi es donde Veo tiene sentido, no antes.
 */

const BASE = 'https://api.pexels.com/videos';

/**
 * El guion esta en espanol pero los bancos de video indexan en ingles.
 * Se le pide al modelo la consulta en ingles al generar el guion seria lo
 * ideal; mientras tanto, un mapa de terminos frecuentes del nicho cubre
 * la mayoria y el resto cae en una consulta generica de la marca.
 */
const TERMINOS = {
  contrato: 'signing contract document desk',
  clausula: 'legal document close up',
  firma: 'signing document pen hand',
  demanda: 'courthouse justice building',
  juez: 'courtroom gavel',
  abogado: 'lawyer office professional',
  proceso: 'office paperwork stack',
  plantilla: 'typing laptop keyboard',
  error: 'crossed out paper mistake',
  tiempo: 'clock office wall',
  dinero: 'calculator money desk',
  software: 'code screen developer',
  automatizar: 'server data center lights',
};

function consultaPara(escena, marca) {
  const texto = `${escena.enPantalla} ${escena.voz}`.toLowerCase();
  const encontrado = Object.keys(TERMINOS).find((clave) => texto.includes(clave));
  return encontrado ? TERMINOS[encontrado] : marca?.stock?.consultaPorDefecto ?? 'modern office minimal';
}

async function buscarVideo(consulta) {
  exigir('pexels');

  const url = `${BASE}/search?query=${encodeURIComponent(consulta)}&orientation=portrait&per_page=15`;

  const respuesta = await conReintentos(
    () => pedirJson(url, { headers: { Authorization: config.stock.apiKey } }),
    { etiqueta: `pexels "${consulta}"` }
  );

  const videos = respuesta?.videos ?? [];
  if (!videos.length) return null;

  // Se elige entre los primeros al azar para que dos videos sobre el mismo
  // tema no acaben con exactamente el mismo plano.
  const candidato = videos[Math.floor(Math.random() * Math.min(videos.length, 8))];

  // Se prefiere el archivo vertical de mayor calidad que no sea enorme:
  // Remotion lo va a reescalar a 1080x1920 igualmente.
  const archivos = (candidato.video_files ?? [])
    .filter((f) => f.height >= f.width)
    .sort((a, b) => b.height - a.height);

  const elegido = archivos.find((f) => f.height <= 1920) ?? archivos[0] ?? candidato.video_files?.[0];
  if (!elegido) return null;

  return { url: elegido.link, autor: candidato.user?.name, origen: candidato.url };
}

export async function generarBrollDeArchivo({ escenas, directorio, marca }) {
  const clips = [];

  for (const [i, escena] of escenas.entries()) {
    const consulta = consultaPara(escena, marca);
    log.info(`Escena ${i + 1}/${escenas.length}: buscando "${consulta}" en Pexels...`);

    const encontrado = await buscarVideo(consulta);
    if (!encontrado) {
      log.aviso(`Sin resultados para "${consulta}". Esa escena usara el fondo de plantilla.`);
      continue;
    }

    const ruta = resolve(directorio, `stock-${String(i + 1).padStart(2, '0')}.mp4`);
    mkdirSync(directorio, { recursive: true });

    const descarga = await fetch(encontrado.url);
    if (!descarga.ok) throw new Error(`No se pudo descargar el clip: HTTP ${descarga.status}`);
    await pipeline(Readable.fromWeb(descarga.body), createWriteStream(ruta));

    log.ok(`Escena ${i + 1}: clip de ${encontrado.autor ?? 'Pexels'}`);
    clips.push({ indice: i, ruta, credito: encontrado.autor, origen: encontrado.origen });
  }

  return clips;
}
