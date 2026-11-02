import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { config, RAIZ } from '../config.js';

/**
 * npm run propuesta -- <nombre> [--archivo=Propuesta_Cliente_v1.pdf] [--semestre=2026-2] [--revisar] [--sin-drive]
 *
 * Las propuestas de servicios se entregan solo en PDF (nunca como Artifact: confidencialidad y derechos
 * de autor). De brochures/<nombre>.html sale:
 *  1. El PDF A4 (Chrome headless, sin dependencias), en trabajo/propuestas/.
 *  2. Con --revisar, una captura por página en trabajo/propuestas/<nombre>/revision/ para mirarlas.
 *  3. La copia del PDF en Drive: CARPETA_PROPUESTAS/<semestre>/<archivo>.
 */
const args = process.argv.slice(2);
const opcion = (n) => args.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
const nombre = args.find((a) => !a.startsWith('--'));
if (!nombre) {
  console.error('Uso: npm run propuesta -- <nombre> [--archivo=...] [--semestre=AAAA-1|2] [--revisar] [--sin-drive]');
  process.exit(1);
}
const html = path.join(RAIZ, 'brochures', `${nombre}.html`);
if (!existsSync(html)) {
  console.error(`No existe ${html}`);
  process.exit(1);
}

// Semestre: enero-junio es -1, julio-diciembre es -2 (así organiza Juan David las carpetas de Drive).
const hoy = new Date();
const semestre = opcion('semestre') ?? `${hoy.getFullYear()}-${hoy.getMonth() < 6 ? 1 : 2}`;
const archivo = opcion('archivo') ?? `Propuesta_${nombre}.pdf`;

const navegador = [config.chrome, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
  .filter(Boolean).find((c) => existsSync(c));
if (!navegador) {
  console.error('No encontré Chrome ni Edge. Pon la ruta en CHROME_EJECUTABLE (.env).');
  process.exit(1);
}

const salida = path.join(RAIZ, 'trabajo', 'propuestas');
mkdirSync(salida, { recursive: true });
const url = pathToFileURL(html).href;
// --virtual-time-budget deja cargar fuentes y correr la constelación (se dibuja con JS) antes de imprimir.
const chrome = (extra) => spawnSync(navegador, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--virtual-time-budget=6000', ...extra, url], { encoding: 'utf8', timeout: 180000 });

// 1 · PDF
const pdf = path.join(salida, `${nombre}.pdf`);
chrome(['--no-pdf-header-footer', `--print-to-pdf=${pdf}`]);
if (!existsSync(pdf)) {
  console.error('✗ No salió el PDF.');
  process.exit(1);
}
console.log(`✓ PDF: ${pdf}`);

// 2 · Capturas por página para revisar
if (args.includes('--revisar')) {
  const paginas = (readFileSync(html, 'utf8').match(/<section class="pagina/g) || []).length;
  const revision = path.join(salida, nombre, 'revision');
  mkdirSync(revision, { recursive: true });
  const tira = path.join(revision, 'tira.png');
  chrome(['--hide-scrollbars', `--window-size=794,${paginas * 1123}`, `--screenshot=${tira}`]);
  const ffmpeg = process.env.FFMPEG_COMPLETO || 'ffmpeg';
  for (let i = 0; i < paginas; i++) {
    spawnSync(ffmpeg, ['-loglevel', 'error', '-y', '-i', tira, '-vf', `crop=794:1123:0:${i * 1123}`, path.join(revision, `p${i + 1}.png`)]);
  }
  console.log(`✓ ${paginas} capturas en ${revision}`);
}

// 3 · Drive (se escribe primero en local: escribir directo en G: ya colgó procesos)
if (!args.includes('--sin-drive')) {
  const drive = process.env.CARPETA_PROPUESTAS;
  if (!drive) {
    console.log('  ⚠ Sin CARPETA_PROPUESTAS en .env: el PDF queda solo en trabajo/propuestas.');
  } else {
    const destino = path.join(drive, semestre);
    mkdirSync(destino, { recursive: true });
    copyFileSync(pdf, path.join(destino, archivo));
    console.log(`✓ Drive: ${path.join(destino, archivo)}`);
  }
}
