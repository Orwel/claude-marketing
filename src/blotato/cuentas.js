import { pedirBlotato } from './cliente.js';

/**
 * GET /v2/accounts — cuentas sociales conectadas en Blotato.
 * Se usa sobre todo en `npm run probar` para descubrir el accountId
 * que hay que poner en BLOTATO_ACCOUNT_ID_INSTAGRAM.
 */
export async function listarCuentas() {
  const respuesta = await pedirBlotato('/v2/accounts');
  // La API puede devolver el array directamente o envuelto en {items|data}.
  return respuesta?.items ?? respuesta?.data ?? respuesta ?? [];
}

export async function buscarCuentaInstagram() {
  const cuentas = await listarCuentas();
  return cuentas.find(
    (c) => String(c.platform ?? c.targetType ?? '').toLowerCase() === 'instagram'
  );
}
