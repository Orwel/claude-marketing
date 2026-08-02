import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { config } from '../config.js';
import { log } from '../util/log.js';
import { pedirJson, conReintentos, ErrorHttp } from '../util/reintentos.js';

/**
 * El puente entre producir y publicar.
 *
 * Blotato DESCARGA el video desde una URL publica: no acepta que le subas
 * un fichero. Asi que el mp4 que sale de Remotion tiene que aterrizar en
 * algun sitio accesible desde internet antes de poder publicar nada.
 * Sin esto no hay automatizacion posible, por muy bien que funcione el resto.
 *
 * Dos proveedores, ambos con nivel gratuito suficiente para un video al dia:
 *  - supabase: bucket publico de Supabase Storage
 *  - r2:       Cloudflare R2 (u otro S3 compatible) via URL firmada
 *
 * Y un tercer modo, 'manual', para cuando quieras subirlo tu y pasar la URL
 * a mano. Es el defecto: no se sube nada a ningun sitio sin que lo configures.
 */
export async function subirVideo(rutaLocal) {
  const proveedor = config.almacenamiento.proveedor;

  if (proveedor === 'manual') {
    throw new Error(
      `ALMACENAMIENTO=manual: sube ${rutaLocal} a una URL publica tu mismo y pasala con --video.\n` +
        `Para automatizarlo, configura ALMACENAMIENTO=supabase o =r2 en el .env.`
    );
  }

  const nombre = `${Date.now()}-${basename(rutaLocal)}`;
  const contenido = readFileSync(rutaLocal);

  log.info(`Subiendo ${(contenido.length / 1024 / 1024).toFixed(1)}MB a ${proveedor}...`);

  const url =
    proveedor === 'supabase'
      ? await subirASupabase(nombre, contenido)
      : await subirAS3(nombre, contenido);

  log.ok(`Video accesible en ${url}`);
  return url;
}

/**
 * Supabase Storage. El bucket debe ser PUBLICO: si es privado, la URL
 * publica devuelve 400 y Blotato no puede descargar el video.
 * Se usa la service_role key porque la anon no puede escribir en storage
 * salvo que definas politicas RLS a medida.
 */
async function subirASupabase(nombre, contenido) {
  const { supabaseUrl, supabaseKey, bucket } = config.almacenamiento;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Faltan SUPABASE_URL y SUPABASE_SERVICE_KEY en el .env');
  }

  const destino = `${supabaseUrl}/storage/v1/object/${bucket}/${nombre}`;

  await conReintentos(
    async () => {
      const respuesta = await fetch(destino, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'video/mp4',
          'x-upsert': 'true',
        },
        body: contenido,
      });

      if (!respuesta.ok) {
        const texto = await respuesta.text();
        // El fallo mas comun es que el bucket no exista todavia.
        if (respuesta.status === 404) {
          throw new ErrorHttp(
            `El bucket "${bucket}" no existe. Crealo en Supabase > Storage y marcalo como publico.`,
            404,
            texto
          );
        }
        throw new ErrorHttp(`Supabase rechazo la subida: ${texto.slice(0, 200)}`, respuesta.status, texto);
      }
    },
    { etiqueta: 'subida a supabase' }
  );

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${nombre}`;
}

/**
 * S3 compatible (Cloudflare R2, Backblaze, MinIO...) con firma AWS v4.
 * Se firma a mano para no arrastrar el SDK de AWS, que pesa mas que
 * todo el resto del proyecto junto.
 */
async function subirAS3(nombre, contenido) {
  const { endpoint, bucket, accessKey, secretKey, region, urlPublica } = config.almacenamiento;

  if (!endpoint || !accessKey || !secretKey) {
    throw new Error('Faltan S3_ENDPOINT, S3_ACCESS_KEY y S3_SECRET_KEY en el .env');
  }

  const { createHash, createHmac } = await import('node:crypto');
  const sha256 = (d) => createHash('sha256').update(d).digest('hex');
  const hmac = (clave, dato) => createHmac('sha256', clave).update(dato).digest();

  const ahora = new Date();
  const marca = ahora.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dia = marca.slice(0, 8);

  const host = new URL(endpoint).host;
  const ruta = `/${bucket}/${nombre}`;
  const hashCuerpo = sha256(contenido);

  const cabeceras = {
    host,
    'content-type': 'video/mp4',
    'x-amz-content-sha256': hashCuerpo,
    'x-amz-date': marca,
  };

  const firmadas = Object.keys(cabeceras).sort().join(';');
  const canonica = [
    'PUT',
    ruta,
    '',
    ...Object.keys(cabeceras)
      .sort()
      .map((k) => `${k}:${cabeceras[k]}`),
    '',
    firmadas,
    hashCuerpo,
  ].join('\n');

  const alcance = `${dia}/${region}/s3/aws4_request`;
  const porFirmar = ['AWS4-HMAC-SHA256', marca, alcance, sha256(canonica)].join('\n');

  let clave = hmac(`AWS4${secretKey}`, dia);
  for (const parte of [region, 's3', 'aws4_request']) clave = hmac(clave, parte);
  const firma = createHmac('sha256', clave).update(porFirmar).digest('hex');

  await conReintentos(
    async () => {
      const respuesta = await fetch(`${endpoint}${ruta}`, {
        method: 'PUT',
        headers: {
          ...cabeceras,
          Authorization:
            `AWS4-HMAC-SHA256 Credential=${accessKey}/${alcance}, ` +
            `SignedHeaders=${firmadas}, Signature=${firma}`,
        },
        body: contenido,
      });

      if (!respuesta.ok) {
        const texto = await respuesta.text();
        throw new ErrorHttp(`S3 rechazo la subida: ${texto.slice(0, 200)}`, respuesta.status, texto);
      }
    },
    { etiqueta: 'subida a s3' }
  );

  return `${(urlPublica || endpoint).replace(/\/$/, '')}/${nombre}`;
}
