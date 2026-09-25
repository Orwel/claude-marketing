import { config, exigir } from '../config.js';
import { pedirJson, conReintentos } from '../util/reintentos.js';

/**
 * Blotato es el tercero que publica por nosotros. Se eligio porque expone
 * una unica API para varias plataformas y usa SOLO vias oficiales: cada
 * cuenta se conecta por OAuth en su panel, no hay automatizacion del navegador
 * ni credenciales de usuario circulando por aqui.
 *
 * Nosotros nunca vemos las credenciales de Instagram: Blotato guarda el token
 * de la cuenta conectada y nosotros solo referenciamos su accountId.
 */

function cabeceras() {
  exigir('blotato');
  return {
    'blotato-api-key': config.blotato.apiKey,
    'Content-Type': 'application/json',
  };
}

export function pedirBlotato(ruta, opciones = {}) {
  const url = `${config.blotato.baseUrl}${ruta}`;

  // exigir() va FUERA de conReintentos: un fallo de configuracion no mejora
  // esperando, y reintentarlo solo entierra el mensaje util bajo el backoff.
  const headers = { ...cabeceras(), ...(opciones.headers ?? {}) };

  return conReintentos(() => pedirJson(url, { ...opciones, headers }), {
    etiqueta: `blotato ${opciones.method ?? 'GET'} ${ruta}`,
  });
}
