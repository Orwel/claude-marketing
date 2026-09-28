import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lineaMontaje } from '../../remotion/montaje/linea.js';
import { paginar } from '../../remotion/montaje/subtitulos.js';
import { RAIZ } from '../config.js';

/**
 * npm run revisar -- AAAA-MM [slug...]
 *
 * Revision automatica antes de renderizar, con los errores que ya le costaron
 * una correccion a Juan David (27/28-sep-2026), para que no se repitan:
 *  - Palabra dicha que no sale en pantalla (ni en subtitulo ni en golpe):
 *    "te comes texto que yo digo, no aparece federal, seis sentencias".
 *  - Pagina de subtitulo que no alcanza a leerse (< 200 ms).
 *  - Palabras pegadas por comillas de Whisper ('pensando"eso').
 * render.js la corre por cada video y no renderiza si hay problemas.
 */
const norm = (x) => x.replace(/["“”]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

export function revisarMontaje(pieza, cuenta) {
  const linea = lineaMontaje(pieza, cuenta, 2);
  const paginas = paginar(linea.subtitulos, pieza.resaltar ?? [], linea.golpes, 30);
  const enGolpes = new Set(linea.golpes.flatMap((g) => g.palabras.map((w) => w.startMs)));
  const visibles = paginas.filter((p) => p.finMs - p.startMs >= 200);
  const tokens = visibles.flatMap((p) => p.tokens.map((t) => ({ ...t, n: t.text.toLowerCase() })));
  const problemas = [];
  const perdidas = linea.subtitulos.filter((s) => norm(s.text) && !enGolpes.has(s.startMs) && !tokens.some((t) => t.n === norm(s.text) && Math.abs(t.fromMs - s.startMs) < 3000));
  if (perdidas.length) problemas.push(`palabras que no salen en pantalla: ${perdidas.map((s) => `"${s.text.trim()}" (${(s.startMs / 1000).toFixed(1)} s)`).join(', ')}`);
  const fugaces = paginas.filter((p) => p.finMs - p.startMs < 200);
  if (fugaces.length) problemas.push(`subtitulos que no alcanzan a leerse: ${fugaces.map((p) => p.tokens.map((t) => t.text).join(' ')).join(' | ')}`);
  const pegadas = tokens.filter((t) => /\S["“”]\S/.test(t.text));
  if (pegadas.length) problemas.push(`palabras pegadas: ${pegadas.map((t) => t.text).join(', ')}`);
  return problemas;
}

// Uso directo: revisa todas las piezas Montaje armadas del mes (o las indicadas).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [mes, ...slugs] = process.argv.slice(2);
  const carpeta = path.join(RAIZ, 'piezas', mes);
  let total = 0;
  for (const f of readdirSync(carpeta).filter((x) => x.endsWith('.json') && !x.startsWith('_'))) {
    const pieza = JSON.parse(readFileSync(path.join(carpeta, f), 'utf8'));
    if (pieza.plantilla !== 'Montaje' || !pieza.generado || (slugs.length && !slugs.includes(pieza.slug))) continue;
    for (const cuenta of pieza.cuentas) {
      const problemas = revisarMontaje(pieza, cuenta);
      total += problemas.length;
      console.log(`${problemas.length ? '✗' : '✓'} ${pieza.slug} · ${cuenta}${problemas.map((p) => `\n    ${p}`).join('')}`);
    }
  }
  process.exit(total ? 1 : 0);
}
