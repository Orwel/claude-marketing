import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Lee .env sin dotenv: son tres variables y no vale una dependencia.
 * Lo que ya viene del entorno gana, para poder sobreescribir en una sola orden.
 */
function cargarEnv() {
  const archivo = path.join(RAIZ, '.env');
  if (!existsSync(archivo)) return;
  for (const linea of readFileSync(archivo, 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
cargarEnv();

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** '2026-10' → '2026-10 octubre', el nombre de la carpeta del mes en Drive. */
export function carpetaDelMes(mes) {
  const [, m] = mes.split('-').map(Number);
  return `${mes} ${MESES[m - 1]}`;
}

export const config = {
  /** Carpeta sincronizada por Google Drive para escritorio, p. ej. G:\Mi unidad\Redes sociales */
  carpetaRedes: process.env.CARPETA_REDES || '',
  subcarpetaGrabados: process.env.SUBCARPETA_GRABADOS || 'videos grabados',
  subcarpetaEditados: process.env.SUBCARPETA_EDITADOS || 'videos editados',
  chrome: process.env.CHROME_EJECUTABLE || '',
};

/** Donde deja el render los terminados: la carpeta del mes en Drive si esta configurada; si no, salida/. */
export function carpetaEditados(mes) {
  if (!config.carpetaRedes) return path.join(RAIZ, 'salida', mes);
  return path.join(config.carpetaRedes, carpetaDelMes(mes), config.subcarpetaEditados);
}
