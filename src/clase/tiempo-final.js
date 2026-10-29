/**
 * Segundo del crudo → segundo del video remontado (para sacar fragmentos de la clase final):
 *   node src/clase/tiempo-final.js <slug> 466 471 508-514.5 ...
 *
 * Lee la línea que deja src/clase/remontaje.js (40-remontaje/linea-completa.json: intro, cortes de
 * silencio y vuelos insertados). Un tramo «a-b» sale con su duración final, que puede ser menor si
 * adentro hubo cortes de silencio.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { RAIZ } from '../config.js';

const [slug, ...pedidos] = process.argv.slice(2);
const clase = JSON.parse(readFileSync(path.join(RAIZ, 'clases', `${slug}.json`), 'utf8'));
const L = JSON.parse(readFileSync(path.join(RAIZ, 'trabajo', 'clases', slug, '40-remontaje', 'linea-completa.json'), 'utf8'));
const DS = 4.4;
const A = clase.inicio.seg;
const aMaster = (t) => t - A + L.I;
const aFinal = (m) => m - L.cortes.reduce((s, [a, b]) => s + (m >= b ? b - a : m > a ? m - a : 0), 0) + L.saltos.filter((s) => s.punto <= m).length * DS;
const f = (t) => aFinal(aMaster(t));
console.log(`video: ${L.final}`);
for (const p of pedidos) {
  const [a, b] = p.split('-').map(Number);
  if (b === undefined) console.log(`${a} → ${f(a).toFixed(2)}`);
  else console.log(`${a}-${b} → ${f(a).toFixed(2)}-${f(b).toFixed(2)} (${(f(b) - f(a)).toFixed(2)} s de ${(b - a).toFixed(2)})`);
}
