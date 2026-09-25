import { log } from './log.js';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Reintenta con backoff exponencial. Solo reintenta lo que tiene sentido
 * reintentar: fallos de red, 429 y 5xx. Un 400 o un 401 no mejora esperando.
 */
export async function conReintentos(fn, { intentos = 4, baseMs = 1000, etiqueta = 'peticion' } = {}) {
  let ultimo;

  for (let i = 0; i < intentos; i++) {
    try {
      return await fn();
    } catch (e) {
      ultimo = e;
      if (!esReintentable(e) || i === intentos - 1) throw e;

      const espera = baseMs * 2 ** i;
      log.aviso(`${etiqueta} fallo (${e.message}). Reintento ${i + 1}/${intentos - 1} en ${espera}ms`);
      await esperar(espera);
    }
  }

  throw ultimo;
}

function esReintentable(e) {
  if (e?.estado === undefined && e?.status === undefined) return true; // fallo de red
  const codigo = e.estado ?? e.status;
  return codigo === 408 || codigo === 429 || codigo >= 500;
}

/** Error HTTP con el cuerpo de la respuesta adjunto, para poder diagnosticar. */
export class ErrorHttp extends Error {
  constructor(mensaje, estado, cuerpo) {
    super(mensaje);
    this.name = 'ErrorHttp';
    this.estado = estado;
    this.cuerpo = cuerpo;
  }
}

/** fetch + comprobacion de estado + parseo JSON, con errores utiles. */
export async function pedirJson(url, opciones = {}) {
  const respuesta = await fetch(url, opciones);
  const texto = await respuesta.text();

  let cuerpo;
  try {
    cuerpo = texto ? JSON.parse(texto) : null;
  } catch {
    cuerpo = texto;
  }

  if (!respuesta.ok) {
    const detalle =
      typeof cuerpo === 'string' ? cuerpo.slice(0, 300) : JSON.stringify(cuerpo)?.slice(0, 300);
    throw new ErrorHttp(`HTTP ${respuesta.status} en ${url} — ${detalle}`, respuesta.status, cuerpo);
  }

  return cuerpo;
}
