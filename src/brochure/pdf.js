import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { carpetaEditados, config, RAIZ } from '../config.js';

/**
 * npm run brochure -- [nombre] [--mes=AAAA-MM]
 *
 * Imprime brochures/<nombre>.html a PDF con el Chrome (o Edge) que ya hay en el
 * equipo, en modo headless: el HTML se diseña como cualquier página y Chrome lo
 * pagina en A4 con @page. Sin Puppeteer ni otra dependencia.
 *
 * El PDF se escribe primero en trabajo/brochures y luego se copia a Drive
 * (<Mes>/Edited/Brochures): escribir directo en G: ya colgó renders.
 */
const CANDIDATOS = [
  config.chrome,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

const navegador = CANDIDATOS.find((c) => existsSync(c));
if (!navegador) {
  console.error('No encontré Chrome ni Edge. Pon la ruta en CHROME_EJECUTABLE (.env).');
  process.exit(1);
}

const argumentos = process.argv.slice(2);
const mes = argumentos.find((a) => a.startsWith('--mes='))?.slice(6) ?? new Date().toISOString().slice(0, 7);
const pedidos = argumentos.filter((a) => !a.startsWith('--'));
const carpeta = path.join(RAIZ, 'brochures');
const nombres = pedidos.length ? pedidos : readdirSync(carpeta).filter((f) => f.endsWith('.html')).map((f) => f.slice(0, -5));

const local = path.join(RAIZ, 'trabajo', 'brochures');
mkdirSync(local, { recursive: true });
const destino = path.join(carpetaEditados(mes), 'Brochures');

let fallos = 0;
for (const nombre of nombres) {
  const html = path.join(carpeta, `${nombre}.html`);
  const pdf = path.join(local, `${nombre}.pdf`);
  console.log(`▶ ${nombre}.html → PDF`);
  // --virtual-time-budget deja que carguen las fuentes locales antes de imprimir;
  // sin él, la primera página puede salir con la fuente del sistema.
  const r = spawnSync(navegador, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--allow-file-access-from-files', '--virtual-time-budget=4000', `--print-to-pdf=${pdf}`, pathToFileURL(html).href], { encoding: 'utf8', timeout: 120000 });
  if (r.status !== 0 || !existsSync(pdf)) {
    fallos++;
    console.log(`✗ No salió: ${r.stderr?.trim().split('\n').slice(-3).join(' | ') || r.error?.message}`);
    continue;
  }
  console.log(`✓ ${pdf} (${(statSync(pdf).size / 1024 / 1024).toFixed(1)} MB)`);
  if (config.carpetaRedes) {
    mkdirSync(destino, { recursive: true });
    copyFileSync(pdf, path.join(destino, `${nombre}.pdf`));
    console.log(`  → Drive: ${path.join(destino, `${nombre}.pdf`)}`);
  }
}
process.exit(fallos ? 1 : 0);
