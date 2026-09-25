import { pedirBlotato } from './cliente.js';

/**
 * POST /v2/media — sube un medio a Blotato a partir de una URL publica
 * y devuelve la URL alojada que hay que pasar luego en /v2/posts.
 *
 * Importante: Blotato descarga el fichero desde la URL que le das, asi que
 * tiene que ser accesible desde internet. Un fichero local no sirve; subelo
 * antes a un bucket, a Drive con enlace directo, o donde tengas.
 */
export async function subirMedio(urlOrigen) {
  if (!/^https?:\/\//.test(urlOrigen)) {
    throw new Error(
      `subirMedio necesita una URL publica (http/https), recibio: ${urlOrigen}\n` +
        `Blotato descarga el video desde esa URL; una ruta local no le sirve.`
    );
  }

  const respuesta = await pedirBlotato('/v2/media', {
    method: 'POST',
    body: JSON.stringify({ url: urlOrigen }),
  });

  const urlAlojada = respuesta?.url ?? respuesta?.data?.url;
  if (!urlAlojada) {
    throw new Error(
      `Blotato no devolvio una URL de medio. Respuesta: ${JSON.stringify(respuesta)}`
    );
  }

  return urlAlojada;
}
