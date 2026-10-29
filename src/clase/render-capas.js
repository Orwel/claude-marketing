/**
 * Renderiza de una vez todas las capas del remontaje (Claude dibujado y escenas contextuales) en
 * trabajo/clases/<slug>/40-remontaje/, antes del master: si una falla se ve aquí y no a mitad del
 * armado. Las que ya existen se saltan (--rehacer las vuelve a hacer).
 *   node src/clase/render-capas.js <slug> [--rehacer] [--solo=ctx-12,claude-3]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { RAIZ } from '../config.js';
import { remotion } from '../remotion-cli.js';

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith('--'));
const opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const clase = JSON.parse(readFileSync(path.join(RAIZ, 'clases', `${slug}.json`), 'utf8'));
const DIR = path.join(RAIZ, 'trabajo', 'clases', slug);
const dir = path.join(DIR, '40-remontaje');
const paq = path.join(DIR, 'paquete-remontaje');
const props = path.join(dir, 'props-clase.json');
writeFileSync(props, JSON.stringify({ clase }));
if (!('sinEmpaquetar' in opt)) remotion(['bundle', 'remotion/index.js', `--out-dir=${paq}`, `--public-dir=${path.join(DIR, 'public')}`, '--log=error']);
const R = clase.remontaje;
const lista = [
  ...(R.claude ?? []).map((_, i) => `claude-${i + 1}`),
  ...(R.contexto ?? []).map((_, i) => `ctx-${i + 1}`),
].filter((n) => !opt.solo || opt.solo.split(',').includes(n));
const fallas = [];
const t0 = Date.now();
for (const [k, n] of lista.entries()) {
  const archivo = path.join(dir, `${n}.mp4`);
  if (existsSync(archivo) && !('rehacer' in opt)) continue;
  try {
    remotion(['render', paq, `clase--${slug}--${n}`, archivo, `--props=${props}`, '--codec=h264', '--crf=16', '--concurrency=4', '--timeout=120000', '--log=error']);
  } catch (e) {
    fallas.push(n);
    console.log(`✗ ${n}: ${e.message.slice(0, 200)}`);
  }
  if (k % 10 === 0) console.log(`  ${k + 1}/${lista.length} (${((Date.now() - t0) / 60000).toFixed(1)} min)`);
}
console.log(fallas.length ? `\n✗ fallaron: ${fallas.join(',')}` : `\n✔ ${lista.length} capas listas`);
