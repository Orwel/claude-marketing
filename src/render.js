import { copyFileSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { carpetaEditados, config, RAIZ } from './config.js';
import { escribirPista } from './audio/pista.js';
import { remotion } from './remotion-cli.js';
import { validarArchivo } from './video/validar.js';

/**
 * npm run render -- <slug> [cuenta]
 *
 * Renderiza una pieza en todas sus cuentas (o solo en una), la deja en la
 * carpeta "videos editados" del mes y la valida. Usa la CLI de Remotion y no
 * su API de Node para no sumar @remotion/renderer y @remotion/bundler: la CLI
 * ya viene con @remotion/cli, que hace falta igual para el Studio.
 */
function buscarPieza(slug) {
  const carpeta = path.join(RAIZ, 'piezas');
  for (const mes of readdirSync(carpeta)) {
    const archivo = path.join(carpeta, mes, `${slug}.json`);
    try {
      return { pieza: JSON.parse(readFileSync(archivo, 'utf8')), mes };
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  throw new Error(`No existe piezas/*/${slug}.json`);
}

const [slug, soloCuenta] = process.argv.slice(2);
if (!slug) {
  console.error('Uso: npm run render -- <slug> [cuenta]');
  process.exit(1);
}

const { pieza, mes } = buscarPieza(slug);
const cuentas = soloCuenta ? [soloCuenta] : pieza.cuentas;
// Los brochures van aparte de los videos del mes: no entran a la parrilla, se mandan a clientes.
// Videos de propuestas de servicios: van con su PDF a CARPETA_PROPUESTAS/<semestre> (pieza.drive), nunca a redes.
const hoy = new Date();
const semestre = pieza.drive?.semestre ?? `${hoy.getFullYear()}-${hoy.getMonth() < 6 ? 1 : 2}`;
const destino = pieza.drive?.carpeta === 'propuestas' && process.env.CARPETA_PROPUESTAS
  ? path.join(process.env.CARPETA_PROPUESTAS, semestre)
  : pieza.plantilla === 'Brochure' ? path.join(carpetaEditados(mes), 'Brochures') : carpetaEditados(mes);
const nombreFinal = (id, formato) => (pieza.drive?.nombre ? `${pieza.drive.nombre} (${formato}).mp4` : `${id}.mp4`);
mkdirSync(destino, { recursive: true });
// Se renderiza en disco local y luego se copia: escribir directo en Drive (G:) colgó renders.
const local = path.join(RAIZ, 'trabajo', 'render');
mkdirSync(local, { recursive: true });
// Mismo orden de ids que Root.jsx: el primer formato es <slug>--<cuenta>; los demás llevan el formato.
const formatos = pieza.formatos ?? [pieza.formato ?? 'vertical'];

if (pieza.verificar?.some((v) => v.estado !== 'verificado')) {
  console.log('⚠ Esta pieza tiene datos por verificar antes de publicar:');
  for (const v of pieza.verificar.filter((v) => v.estado !== 'verificado')) console.log(`   - ${v.dato}`);
}

let fallos = 0;
for (const [cuenta, formato, k] of cuentas.flatMap((c) => formatos.map((f, k) => [c, f, k]))) {
  const id = k === 0 ? `${pieza.slug}--${cuenta}` : `${pieza.slug}--${cuenta}--${formato}`;
  const salida = path.join(local, `${id}.mp4`);
  console.log(`\n▶ ${id} → ${path.join(destino, nombreFinal(id, formato))}`);
  // La pista se regenera en cada render: si cambiaron los tiempos (o llego la voz), el audio los sigue.
  // Todos los formatos duran lo mismo, así que una pista por cuenta basta.
  if (pieza.pista && k === 0) console.log(`♪ Pista: ${escribirPista(pieza, cuenta)}`);
  const argumentos = ['render', 'remotion/index.js', id, salida, '--codec=h264', '--pixel-format=yuv420p', '--color-space=bt709', '--log=warn', '--timeout=120000', '--gl=angle'];
  if (config.chrome) argumentos.push(`--browser-executable=${config.chrome}`);
  // Igual que montaje/render.js: la config no alcanza el delayRender de las fuentes (murió a los 28 s
  // con el equipo cargado, 3-oct-2026), y con el compositor saturado se reintenta con menos hilos.
  try {
    remotion([...argumentos, '--concurrency=6']);
  } catch {
    console.log('  ↻ reintento con --concurrency=3');
    remotion([...argumentos, '--concurrency=3']);
  }

  const { medio, problemas } = validarArchivo(salida);
  if (problemas.length) {
    fallos++;
    console.log(`✗ No cumple: ${problemas.join('; ')}`);
  } else {
    console.log(`✓ Valido: ${medio.anchoPx}x${medio.altoPx}, ${medio.duracionSegundos.toFixed(1)}s, ${medio.tamanoMb.toFixed(1)}MB, ${medio.codec}/${medio.formatoPixel}`);
    copyFileSync(salida, path.join(destino, nombreFinal(id, formato)));
  }
}
process.exit(fallos ? 1 : 0);
