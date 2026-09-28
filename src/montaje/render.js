import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { formatoDe } from '../../remotion/montaje/linea.js';
import { escribirPistaMontaje } from '../audio/montaje.js';
import { carpetaDelMes, config, RAIZ } from '../config.js';
import { remotion } from '../remotion-cli.js';
import { inspeccionar, validarMedio } from '../video/validar.js';
import { FFMPEG } from './limpiar.js';
import { revisarMontaje } from './revisar.js';

/**
 * npm run montaje -- 2026-10 [slug...] [--cuenta=juanda] [--red=instagram]
 *
 * Renderiza las piezas Montaje ya armadas: cada cuenta de la pieza a Instagram
 * (1080×1920) y LinkedIn (1080×1350; Contrappto 1920×1080). Despues del render,
 * loudnorm en dos pasadas lleva la mezcla a -16 LUFS integrado y -1 dBTP, y el
 * archivo se valida y se copia a su carpeta de Drive:
 *   <mes>/Edited/Instagram|Linkedin/<cuenta>/<PIEZA>-<JD|TF|CTP>-<ig|li>.mp4
 * Las demos (huecos de pantalla sin captura) van a Edited/_pendiente-overlay.
 * Si un render falla, sigue con los demas y los lista al final.
 */
const CUENTAS = {
  juanda: { codigo: 'JD', instagram: 'Instagram/Juanda.Trifuerza', linkedin: 'Linkedin/Juanda.Trifuerza' },
  trifuerza: { codigo: 'TF', instagram: 'Instagram/Trifuerza.co', linkedin: 'Linkedin/Trifuerza' },
  contrappto: { codigo: 'CTP', instagram: 'Instagram/Contrappto', linkedin: 'Linkedin/Contrappto' },
};

const args = process.argv.slice(2);
const mes = args[0];
const opcion = (k) => args.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];
const slugs = args.slice(1).filter((a) => !a.startsWith('--'));
if (!/^\d{4}-\d{2}$/.test(mes ?? '')) {
  console.error('Uso: npm run montaje -- AAAA-MM [slug...] [--cuenta=juanda] [--red=instagram]');
  process.exit(1);
}
const editados = path.join(config.carpetaRedes, carpetaDelMes(mes), config.subcarpetaEditados);
const locales = path.join(RAIZ, 'trabajo', mes, 'render');
mkdirSync(locales, { recursive: true });
const marcas = Object.fromEntries(['juanda', 'trifuerza', 'contrappto'].map((m) => [m, JSON.parse(readFileSync(path.join(RAIZ, 'marcas', `${m}.json`), 'utf8'))]));

const carpetaPiezas = path.join(RAIZ, 'piezas', mes);
const piezas = readdirSync(carpetaPiezas)
  .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
  .map((f) => JSON.parse(readFileSync(path.join(carpetaPiezas, f), 'utf8')))
  .filter((p) => p.plantilla === 'Montaje' && p.generado && (!slugs.length || slugs.includes(p.slug)));

/**
 * El render de Remotion sale en x264 ultrafast a CRF 14 (casi sin perdida, ~25 % mas rapido) y la
 * calidad final se codifica aqui, en la misma pasada del loudnorm: CRF 18, preset medium.
 */
/** loudnorm en dos pasadas (lineal): la primera mide, la segunda aplica sin comprimir la dinamica. */
function normalizar(entrada, salida, videoFinal) {
  const medir = spawnSync(FFMPEG(), ['-hide_banner', '-i', entrada, '-af', 'loudnorm=I=-16:TP=-1:LRA=11:print_format=json', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const m = JSON.parse(medir.stderr.slice(medir.stderr.lastIndexOf('{'), medir.stderr.lastIndexOf('}') + 1));
  const filtro = `loudnorm=I=-16:TP=-1:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=48000`;
  const r = spawnSync(FFMPEG(), ['-hide_banner', '-y', '-v', 'error', '-i', entrada, ...(videoFinal ?? ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709']), '-af', filtro, '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', salida], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`loudnorm fallo: ${r.stderr}`);
}

function medirAudio(salida) {
  const final = spawnSync(FFMPEG(), ['-hide_banner', '-i', salida, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const lufs = +/I:\s+(-?[\d.]+) LUFS/.exec(final.stderr.slice(final.stderr.lastIndexOf('Summary')))?.[1];
  const pico = +/Peak:\s+(-?[\d.]+) dBFS/.exec(final.stderr.slice(final.stderr.lastIndexOf('Summary')))?.[1];
  return { lufs, pico };
}

const hechos = [];
const fallidos = [];
for (const pieza of piezas) {
  // Solo va a _pendiente-overlay la demo que aun tiene un hueco de pantalla sin llenar (sin escena ni app).
  const esDemo = pieza.tipo === 'demo' && (pieza.beats ?? []).some((b) => b.tipo === 'pantalla' && !b.escena);
  for (const cuenta of pieza.cuentas.filter((c) => !opcion('cuenta') || c === opcion('cuenta'))) {
    const marca = marcas[cuenta];
    try {
      escribirPistaMontaje(pieza, marca);
    } catch (e) {
      fallidos.push({ id: `${pieza.slug}--${cuenta}`, error: `pista: ${e.message}` });
      continue;
    }
    for (const red of ['instagram', 'linkedin'].filter((r) => !opcion('red') || r === opcion('red'))) {
      const f = formatoDe(cuenta, red);
      const id = `${pieza.slug}--${cuenta}--${f.sufijo}`;
      const nombre = `${pieza.codigo ?? pieza.slug}-${CUENTAS[cuenta].codigo}-${f.sufijo}.mp4`;
      const carpetaFinal = esDemo ? path.join(editados, '_pendiente-overlay') : path.join(editados, CUENTAS[cuenta][red]);
      // Lo que ya esta en Drive no se vuelve a renderizar (salvo --rehacer): la cola se puede cortar y retomar.
      if (!args.includes('--rehacer') && !args.includes('--prueba') && existsSync(path.join(carpetaFinal, nombre))) {
        console.log(`  = ${nombre} ya esta en Drive`);
        continue;
      }
      const bruto = path.join(locales, `${id}.bruto.mp4`);
      const local = path.join(locales, nombre);
      console.log(`\n▶ ${id} → ${nombre}`);
      try {
        const vertical = path.join(locales, `${pieza.codigo ?? pieza.slug}-${CUENTAS[cuenta].codigo}-ig.mp4`);
        // Si el vertical fallo en esta corrida, el que hay en disco es viejo: no se arma LinkedIn con el.
        if (red === 'linkedin' && fallidos.some((x) => x.id === `${pieza.slug}--${cuenta}--ig`)) throw new Error('el vertical fallo en esta corrida: no se arma LinkedIn con uno viejo');
        // Armar LinkedIn desde el vertical solo sirve para 4:5 (el vertical cabe a lo alto). En 16:9 (Contrappto)
        // quedaba el vertical con franjas a los lados: ahi se renderiza el diseño horizontal propio.
        if (red === 'linkedin' && existsSync(vertical) && f.alto >= f.ancho) {
          // LinkedIn (4:5, o 16:9 en Contrappto) sin volver a renderizar: el vertical completo (graficos y subtitulos intactos) a 1350 de alto,
          // centrado sobre el fondo de la marca. Segundos en vez de minutos, misma calidad.
          const fondo = marca.colores.fondo.replace('#', '0x');
          const r = spawnSync(FFMPEG(), ['-hide_banner', '-y', '-v', 'error', '-i', vertical, '-filter_complex', `color=c=${fondo}:s=${f.ancho}x${f.alto}:r=30[f];[0:v]scale=-2:${f.alto}:flags=lanczos[v];[f][v]overlay=(W-w)/2:0:shortest=1,format=yuv420p`, '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-c:a', 'copy', '-movflags', '+faststart', local], { encoding: 'utf8' });
          if (r.status !== 0) throw new Error(`4:5 desde el vertical fallo: ${r.stderr}`);
        } else {
        // Revision automatica (palabras que no salen, subtitulos fugaces, palabras pegadas): si falla, no se renderiza.
        const problemas = revisarMontaje(pieza, cuenta);
        if (problemas.length) throw new Error(`revision: ${problemas.join('; ')}`);
        const argumentos = ['render', 'remotion/index.js', id, bruto, '--codec=h264', '--pixel-format=yuv420p', '--color-space=bt709', '--timeout=120000', '--log=error', '--crf=14', '--x264-preset=ultrafast', '--gl=angle', '--offthreadvideo-cache-size-in-bytes=1500000000'];
        // El servidor de cuadros de Remotion a veces corta la conexion con el equipo cargado
        // (ERR_CONNECTION_RESET / "Could not extract frame from compositor", ~1 de cada 20 renders,
        // sep-2026). Se reintenta solo con menos procesos en paralelo antes de darlo por fallido.
        try {
          remotion([...argumentos, '--concurrency=6']);
        } catch (e) {
          console.log('  ↻ reintento con --concurrency=3');
          remotion([...argumentos, '--concurrency=3']);
        }
        normalizar(bruto, local);
        }
        const audio = medirAudio(local);
        const medio = inspeccionar(local);
        const problemas = validarMedio(medio, { vertical: red === 'instagram', aspecto: [f.ancho, f.alto] });
        const carpeta = esDemo ? path.join(editados, '_pendiente-overlay') : path.join(editados, CUENTAS[cuenta][red]);
        // --prueba: se queda en trabajo/<mes>/render, no llega a Drive.
        if (!args.includes('--prueba')) {
          mkdirSync(carpeta, { recursive: true });
          copyFileSync(local, path.join(carpeta, nombre));
        }
        hechos.push({ pieza: pieza.codigo ?? pieza.slug, cuenta: CUENTAS[cuenta].codigo, red: f.sufijo, nombre, carpeta: path.relative(editados, carpeta), duracion: +medio.duracionSegundos.toFixed(1), mb: +medio.tamanoMb.toFixed(1), lufs: audio.lufs, pico: audio.pico, lowerThird: pieza.lowerThird ?? '', problemas });
        console.log(`  ✓ ${medio.anchoPx}×${medio.altoPx} · ${medio.duracionSegundos.toFixed(1)} s · ${medio.tamanoMb.toFixed(1)} MB · ${audio.lufs} LUFS · pico ${audio.pico} dBFS${problemas.length ? ` · ⚠ ${problemas.join('; ')}` : ''}`);
      } catch (e) {
        fallidos.push({ id, error: e.message.split('\n').slice(0, 3).join(' ') });
        console.log(`  ✗ ${e.message.split('\n')[0]}`);
      }
    }
  }
}

// Inventario acumulado del mes (se mezcla con el de corridas anteriores).
const inventario = path.join(RAIZ, 'trabajo', mes, 'inventario.json');
const previo = existsSync(inventario) ? JSON.parse(readFileSync(inventario, 'utf8')) : [];
const todos = [...previo.filter((p) => !hechos.some((h) => h.nombre === p.nombre)), ...hechos];
writeFileSync(inventario, JSON.stringify(todos, null, 2));
console.log(`\n${hechos.length} listo(s), ${fallidos.length} fallido(s)`);
for (const f of fallidos) console.log(`  ✗ ${f.id}: ${f.error}`);
process.exit(fallidos.length ? 1 : 0);
