import { config, exigir } from '../config.js';
import { pedirJson, conReintentos } from '../util/reintentos.js';

/**
 * Instagram Graph API — SOLO LECTURA.
 *
 * Reparto de responsabilidades a proposito:
 *  - publicar  -> Blotato (una sola integracion para todas las plataformas)
 *  - medir     -> Graph API directa (Blotato no expone insights con este detalle)
 *
 * Requiere una cuenta profesional (Business o Creator) vinculada a una pagina
 * de Facebook, y un token de larga duracion con instagram_basic +
 * instagram_manage_insights.
 */

export function pedirGraph(ruta, parametros = {}) {
  exigir('igToken');

  const url = new URL(`https://graph.facebook.com/${config.instagram.version}${ruta}`);
  for (const [clave, valor] of Object.entries(parametros)) {
    if (valor !== undefined && valor !== null) url.searchParams.set(clave, String(valor));
  }
  url.searchParams.set('access_token', config.instagram.token);

  return conReintentos(() => pedirJson(url.toString()), { etiqueta: `graph ${ruta}` });
}
