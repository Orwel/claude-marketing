import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { RAIZ } from '../config.js';

/**
 * npm run cola -- 2026-10
 *
 * Todo el mes en orden de importancia: arma lo que falte y renderiza primero
 * Instagram de juanda.trifuerza, luego Instagram de Trifuerza y Contrappto, y
 * al final LinkedIn. Cada video llega a Drive apenas termina, asi que si la
 * cola se corta, lo mas importante ya esta publicado-listo; al retomarla se
 * salta lo que ya esta en Drive.
 *
 * --rehacer: vuelve a armar todas las piezas (despues de cambiar el corte o la
 * plantilla) y reemplaza en Drive lo que ya estaba. Solo en la primera pasada:
 * los reintentos no deben volver a renderizar lo que acaba de salir.
 */
const mes = process.argv[2];
const rehacer = process.argv.includes('--rehacer');
const carpeta = path.join(RAIZ, 'piezas', mes);
const piezas = readdirSync(carpeta)
  .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
  .map((f) => JSON.parse(readFileSync(path.join(carpeta, f), 'utf8')))
  .filter((p) => p.plantilla === 'Montaje');

const correr = (script, extra) => spawnSync(process.execPath, [path.join(RAIZ, 'src', 'montaje', script), mes, ...extra], { cwd: RAIZ, stdio: 'inherit' });

// Cada pieza se arma justo antes de su primer render: asi el primer video llega a Drive en minutos.
const armadas = new Set(rehacer ? [] : piezas.filter((p) => p.generado).map((p) => p.slug));
for (const red of ['instagram', 'linkedin']) {
  for (const cuenta of ['juanda', 'trifuerza', 'contrappto']) {
    // Primero las ya armadas: renderizan de inmediato mientras las demas esperan su limpieza.
    for (const p of piezas.filter((x) => x.cuentas.includes(cuenta)).sort((a, b) => armadas.has(b.slug) - armadas.has(a.slug))) {
      if (!armadas.has(p.slug)) {
        correr('armar.js', [p.slug]);
        armadas.add(p.slug);
      }
      correr('render.js', [p.slug, `--cuenta=${cuenta}`, `--red=${red}`, ...(rehacer ? ['--rehacer'] : [])]);
    }
  }
}
// Segunda pasada: reintenta lo que fallo (un cuadro que no llega, por ejemplo). Lo que ya esta en Drive se salta.
for (const red of ['instagram', 'linkedin']) for (const cuenta of ['juanda', 'trifuerza', 'contrappto']) {
  const slugs = piezas.filter((p) => p.cuentas.includes(cuenta)).map((p) => p.slug);
  if (slugs.length) correr('render.js', [...slugs, `--cuenta=${cuenta}`, `--red=${red}`]);
}
correr('pendientes.js', []);
console.log('cola terminada');
