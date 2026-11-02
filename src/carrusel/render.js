import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { carpetaEditados, config, RAIZ } from '../config.js';
import { remotion } from '../remotion-cli.js';
import { inspeccionar, validarMedio } from '../video/validar.js';

/**
 * npm run carrusel -- AAAA-MM [slug ...] [--cuenta=juanda] [--rehacer]
 *
 * Carruseles y stories animados (plantilla Carrusel). Cada lamina sale como su
 * propio MP4, porque Instagram arma el carrusel con archivos sueltos:
 *   Edited/Carruseles/<Cuenta>/<slug>/<slug>-01.mp4 ...
 *   Edited/Carruseles/<Cuenta>/<slug>/<slug>-linkedin.mp4   (las mismas laminas en un video, para LinkedIn)
 *   Edited/Stories/<Cuenta>/<slug>-01.mp4 ...
 *
 * Se empaqueta el proyecto una sola vez (remotion bundle) y cada lamina se
 * renderiza desde ese paquete: sin eso, cada una de las ~100 laminas volveria
 * a compilar todo.
 */
const CARPETA_CUENTA = { juanda: 'Juanda.Trifuerza', trifuerza: 'Trifuerza.co', contrappto: 'Contrappto' };

const args = process.argv.slice(2);
const mes = args.find((a) => /^\d{4}-\d{2}$/.test(a));
const soloCuenta = args.find((a) => a.startsWith('--cuenta='))?.split('=')[1];
const rehacer = args.includes('--rehacer');
const slugs = args.filter((a) => !a.startsWith('--') && a !== mes);
if (!mes) {
  console.error('Uso: npm run carrusel -- AAAA-MM [slug ...] [--cuenta=juanda] [--rehacer]');
  process.exit(1);
}

/** Piezas Carrusel del mes, en cualquier subcarpeta (piezas/AAAA-MM/carruseles, .../stories). */
function piezasDelMes() {
  const raiz = path.join(RAIZ, 'piezas', mes);
  const archivos = [];
  const recorrer = (dir) => {
    for (const nombre of readdirSync(dir)) {
      const ruta = path.join(dir, nombre);
      if (statSync(ruta).isDirectory()) recorrer(ruta);
      else if (nombre.endsWith('.json') && !nombre.startsWith('_')) archivos.push(ruta);
    }
  };
  recorrer(raiz);
  return archivos.map((a) => JSON.parse(readFileSync(a, 'utf8'))).filter((p) => p.plantilla === 'Carrusel');
}

const piezas = piezasDelMes().filter((p) => !slugs.length || slugs.includes(p.slug));
if (!piezas.length) {
  console.error(`No hay piezas Carrusel en piezas/${mes}${slugs.length ? ` con ${slugs.join(', ')}` : ''}`);
  process.exit(1);
}

const paquete = path.join(RAIZ, 'trabajo', 'paquete-carrusel');
console.log('▶ Empaquetando el proyecto una vez…');
rmSync(paquete, { recursive: true, force: true });
remotion(['bundle', 'remotion/index.js', `--out-dir=${paquete}`, '--log=error']);

const editados = carpetaEditados(mes);
let hechos = 0, saltados = 0, fallos = 0;
for (const pieza of piezas) {
  const historia = pieza.tipo === 'historias';
  const aspecto = historia ? [9, 16] : pieza.formato === 'carrusel' ? [1, 1] : [4, 5];
  for (const cuenta of pieza.cuentas.filter((c) => !soloCuenta || c === soloCuenta)) {
    const destino = historia
      ? path.join(editados, 'Stories', CARPETA_CUENTA[cuenta])
      : path.join(editados, 'Carruseles', CARPETA_CUENTA[cuenta], pieza.slug);
    mkdirSync(destino, { recursive: true });
    const laminas = [];
    for (let i = 0; i < pieza.laminas.length; i++) {
      const nn = String(i + 1).padStart(2, '0');
      // En stories cada lamina es una story suelta y se nombra por su id si lo trae.
      const nombre = historia ? `${pieza.laminas[i].id ?? `${pieza.slug}-${nn}`}.mp4` : `${pieza.slug}-${nn}.mp4`;
      const salida = path.join(destino, nombre);
      const id = `${pieza.slug}--${cuenta}--${nn}`;
      laminas.push(salida);
      if (existsSync(salida) && !rehacer) {
        saltados++;
        continue;
      }
      console.log(`▶ ${id} → ${path.relative(editados, salida)}`);
      // Se renderiza en disco local y se copia a Drive: escribir directo en G: dejo un render colgado 29-sep.
      const local = path.join(RAIZ, 'trabajo', 'carrusel-salida', path.basename(salida));
      mkdirSync(path.dirname(local), { recursive: true });
      const argumentos = ['render', paquete, id, local, '--codec=h264', '--pixel-format=yuv420p', '--color-space=bt709', '--log=error'];
      if (config.chrome) argumentos.push(`--browser-executable=${config.chrome}`);
      conReintento(() => remotion(argumentos, { timeout: 180_000 }), id);
      // Carrusel e historias no son Reels: se valida aspecto, codec y pixel; la duracion la fija la pieza.
      const problemas = validarMedio(inspeccionar(local), { vertical: false, aspecto });
      copyFileSync(local, salida);
      rmSync(local);
      if (problemas.length) { fallos++; console.log(`  ✗ ${problemas.join('; ')}`); } else hechos++;
    }
    if (!historia) unirParaLinkedin(pieza, laminas, path.join(destino, `${pieza.slug}-linkedin.mp4`));
  }
}
// El paquete copia todo public/ (crudos: ~3,5 GB): se borra al terminar o se llena el disco (29-sep-2026).
rmSync(paquete, { recursive: true, force: true });
console.log(`\n✓ ${hechos} renderizadas · ${saltados} ya estaban · ${fallos} con problemas · ${editados}`);
process.exit(fallos ? 1 : 0);


/** Un render de Chrome puede colgarse sin error: se corta a los pocos minutos y se intenta otra vez. */
function conReintento(accion, id) {
  try {
    return accion();
  } catch (error) {
    console.log(`  ↻ ${id}: ${error.code === 'ETIMEDOUT' ? 'se colgo' : 'fallo'}, otra vez`);
    return accion();
  }
}

/**
 * LinkedIn admite un solo video por publicacion: alla va el carrusel como un video con las laminas
 * seguidas. Mismo codec y tamano en todas, asi que se pegan sin recodificar (concat -c copy).
 */
function unirParaLinkedin(pieza, laminas, salida) {
  if (existsSync(salida) && !rehacer) return;
  const lista = path.join(RAIZ, 'trabajo', `${pieza.slug}-lista.txt`);
  const local = path.join(RAIZ, 'trabajo', 'carrusel-salida', path.basename(salida));
  mkdirSync(path.dirname(local), { recursive: true });
  writeFileSync(lista, laminas.map((l) => `file '${l.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`).join('\n'));
  remotion(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', '-movflags', '+faststart', local]);
  copyFileSync(local, salida);
  rmSync(local);
  rmSync(lista);
  console.log(`  ⧉ LinkedIn: ${path.basename(salida)}`);
}
