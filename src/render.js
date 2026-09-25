import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
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
const destino = carpetaEditados(mes);
mkdirSync(destino, { recursive: true });

if (pieza.verificar?.some((v) => v.estado !== 'verificado')) {
  console.log('⚠ Esta pieza tiene datos por verificar antes de publicar:');
  for (const v of pieza.verificar.filter((v) => v.estado !== 'verificado')) console.log(`   - ${v.dato}`);
}

let fallos = 0;
for (const cuenta of cuentas) {
  const id = `${pieza.slug}--${cuenta}`;
  const salida = path.join(destino, `${id}.mp4`);
  console.log(`\n▶ ${id} → ${salida}`);
  // La pista se regenera en cada render: si cambiaron los tiempos (o llego la voz), el audio los sigue.
  if (pieza.pista) console.log(`♪ Pista: ${escribirPista(pieza, cuenta)}`);
  const argumentos = ['render', 'remotion/index.js', id, salida, '--codec=h264', '--pixel-format=yuv420p', '--color-space=bt709', '--log=warn'];
  if (config.chrome) argumentos.push(`--browser-executable=${config.chrome}`);
  remotion(argumentos);

  const { medio, problemas } = validarArchivo(salida);
  if (problemas.length) {
    fallos++;
    console.log(`✗ No cumple: ${problemas.join('; ')}`);
  } else {
    console.log(`✓ Valido: ${medio.anchoPx}x${medio.altoPx}, ${medio.duracionSegundos.toFixed(1)}s, ${medio.tamanoMb.toFixed(1)}MB, ${medio.codec}/${medio.formatoPixel}`);
  }
}
process.exit(fallos ? 1 : 0);
