import { spawnSync } from 'node:child_process';
import { closeSync, copyFileSync, cpSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, rmSync, unlinkSync, writeFileSync, writeSync } from 'node:fs';
import path from 'node:path';
import { lineaArcade } from '../../remotion/arcade/linea.js';
import { escribirPistaArcade } from '../audio/arcade.js';
import { config, RAIZ } from '../config.js';
import { FFMPEG } from '../montaje/limpiar.js';
import { remotion } from '../remotion-cli.js';
import { inspeccionar, validarMedio } from '../video/validar.js';

/**
 * npm run sofa -- [slug...] [--cuenta=juanda] [--prueba] [--cuadro=N]
 *
 * Renderiza las piezas Arcade ya armadas (npm run sofa-armar). Pasos:
 *  1. pista chiptune + efectos sincronizados (src/audio/arcade.js);
 *  2. carpeta publica liviana en trabajo/publico-sofa (fuentes, marcas, broll
 *     del SOFA, proxies, audio): el bundle copia public/ entero y el del mes
 *     pesa gigas;
 *  3. remotion bundle una vez y render desde el paquete, en x264 ultrafast CRF 14;
 *  4. loudnorm en dos pasadas (-16 LUFS / -1 dBTP) y recodificacion final CRF 18;
 *  5. validacion (H.264, yuv420p, 9:16, 5-90 s) y copia a
 *     <CARPETA_REDES>/Octubre/SOFA/Edited/<CODIGO>-<cuenta>.mp4.
 * Con --cuadro=N saca solo un PNG de ese cuadro (para revisar antes del render).
 */
const args = process.argv.slice(2);
const opcion = (k) => args.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];
const slugs = args.filter((a) => !a.startsWith('--'));
const CARPETA_PIEZAS = path.join(RAIZ, 'piezas', '2026-10');
const editados = path.join(config.carpetaRedes, 'Octubre', 'SOFA', 'Edited');
const locales = path.join(RAIZ, 'trabajo', '2026-10-sofa', 'render');
const publico = path.join(RAIZ, 'trabajo', 'publico-sofa');
const paquete = path.join(RAIZ, 'trabajo', 'paquete-sofa');
mkdirSync(locales, { recursive: true });

// Un render a la vez (13-oct-2026): varias sesiones lanzaban `npm run sofa` al tiempo y como todas comparten
// trabajo/paquete-sofa y trabajo/publico-sofa, el bundle de una borraba el paquete de la otra a mitad de render
// (404 de proxies, EISDIR). Ahora el que llega segundo espera su turno. Un candado de un proceso muerto se limpia.
const candado = path.join(RAIZ, 'trabajo', 'sofa-render.lock');
const vivo = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
const dormir = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
for (let avisado = false; ;) {
  try {
    const fd = openSync(candado, 'wx');
    writeSync(fd, `${process.pid} ${new Date().toISOString()} ${process.argv.slice(2).join(' ')}`);
    closeSync(fd);
    break;
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
    const [pid, , ...que] = readFileSync(candado, 'utf8').split(' ');
    if (!vivo(Number(pid))) { try { unlinkSync(candado); } catch {} continue; }
    if (!avisado) { console.log(`  ⏳ esperando turno: ya hay un render del SOFA en curso (pid ${pid}: ${que.join(' ') || 'todas'})`); avisado = true; }
    dormir(10000);
  }
}
process.on('exit', () => { try { if (readFileSync(candado, 'utf8').startsWith(`${process.pid} `)) unlinkSync(candado); } catch {} });
for (const senal of ['SIGINT', 'SIGTERM']) process.on(senal, () => process.exit(130));
const marcas = Object.fromEntries(['juanda', 'trifuerza', 'contrappto'].map((m) => [m, JSON.parse(readFileSync(path.join(RAIZ, 'marcas', `${m}.json`), 'utf8'))]));
const CODIGOS = { juanda: 'JD', trifuerza: 'TF', contrappto: 'CTP' };

const piezas = readdirSync(CARPETA_PIEZAS)
  .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
  .map((f) => JSON.parse(readFileSync(path.join(CARPETA_PIEZAS, f), 'utf8')))
  .filter((p) => p.plantilla === 'Arcade' && p.generado && (!slugs.length || slugs.includes(p.slug)));

/**
 * Carpeta publica liviana: solo lo que usan las piezas Arcade. De `sofa/` van solo los proxies de las piezas que
 * se renderizan: con los proxies en 4K (13-oct-2026) copiarlos todos ponia ~5 GB en la carpeta publica y otros ~5 en
 * el paquete, y el disco se lleno a mitad de la tanda.
 */
function prepararPublico() {
  const usados = new Set(piezas.flatMap((p) => JSON.stringify(p).match(/sofa\/[\w.-]+\.mp4/g) ?? []).map((r) => path.basename(r)));
  for (const d of ['fuentes', 'marcas', 'sofa', 'audio/arcade', 'broll/2026-10/sofa']) {
    const origen = path.join(RAIZ, 'public', d);
    if (!existsSync(origen)) continue;
    const destino = path.join(publico, d);
    mkdirSync(path.dirname(destino), { recursive: true });
    if (d !== 'sofa') { cpSync(origen, destino, { recursive: true, force: true }); continue; }
    mkdirSync(destino, { recursive: true });
    for (const f of readdirSync(destino)) if (f.endsWith('.mp4') && !usados.has(f)) unlinkSync(path.join(destino, f));
    for (const f of readdirSync(origen)) if (!f.endsWith('.mp4') || usados.has(f)) cpSync(path.join(origen, f), path.join(destino, f), { recursive: true, force: true });
  }
}

function normalizar(entrada, salida) {
  const medir = spawnSync(FFMPEG(), ['-hide_banner', '-i', entrada, '-af', 'loudnorm=I=-16:TP=-1:LRA=11:print_format=json', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const m = JSON.parse(medir.stderr.slice(medir.stderr.lastIndexOf('{'), medir.stderr.lastIndexOf('}') + 1));
  const filtro = `loudnorm=I=-16:TP=-1:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=48000`;
  const r = spawnSync(FFMPEG(), ['-hide_banner', '-y', '-v', 'error', '-i', entrada, '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-af', filtro, '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', salida], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`loudnorm fallo: ${r.stderr}`);
}

function medirAudio(salida) {
  const r = spawnSync(FFMPEG(), ['-hide_banner', '-i', salida, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const resumen = r.stderr.slice(r.stderr.lastIndexOf('Summary'));
  return { lufs: +/I:\s+(-?[\d.]+) LUFS/.exec(resumen)?.[1], pico: +/Peak:\s+(-?[\d.]+) dBFS/.exec(resumen)?.[1] };
}

// 1. Pistas y carpeta publica. 2. Paquete.
const cuenta = opcion('cuenta');
for (const pieza of piezas) for (const c of pieza.cuentas.filter((x) => !cuenta || x === cuenta)) escribirPistaArcade(pieza, marcas[c]);
prepararPublico();
rmSync(paquete, { recursive: true, force: true });
remotion(['bundle', 'remotion/index.js', `--out-dir=${paquete}`, `--public-dir=${publico}`, '--log=error']);

const hechos = [];
const fallidos = [];
// Revision automatica antes de gastar computo: cada palabra sale una vez, sin cajas fugaces ni caja encima de un golpe.
const revision = spawnSync(process.execPath, [path.join(RAIZ, 'trabajo', '2026-10-sofa', 'revisar.mjs'), ...piezas.map((p) => p.slug)], { cwd: RAIZ, encoding: 'utf8' });
console.log(revision.stdout.trim());
const conProblemas = new Set([...revision.stdout.matchAll(/^✗ (\S+)/gm)].map((m) => m[1]));
for (const pieza of piezas) {
  if (conProblemas.has(pieza.slug) && !args.includes('--forzar')) {
    fallidos.push({ id: pieza.slug, error: 'no paso la revision (ver arriba); --forzar para renderizar igual' });
    continue;
  }
  for (const c of pieza.cuentas.filter((x) => !cuenta || x === cuenta)) {
    const id = `${pieza.slug}--${c}`;
    const nombre = `${pieza.codigo ?? pieza.slug}-${CODIGOS[c]}.mp4`;
    let cuadro = opcion('cuadro');
    // --cuadros=slug:esc3+40,slug:120,...: cuadros de revision por pieza (escN+K = K cuadros tras el inicio de la escena N).
    if (opcion('cuadros')) {
      const ln = lineaArcade(pieza);
      const mios = opcion('cuadros').split(',').filter((x) => x.startsWith(`${pieza.slug}:`)).map((x) => x.split(':')[1]);
      if (!mios.length) continue;
      cuadro = mios.map((m) => { const r = /^esc(\d+)\+(\d+)$/.exec(m); return r ? ln.escenas[+r[1]].inicio + +r[2] : +m; }).join(',');
    }
    // --cuadrosAuto: titulo, cada nivel, la primera ficha y un par de efectos por pieza, para revisar antes del render.
    if (args.includes('--cuadrosAuto')) {
      const ln = lineaArcade(pieza);
      const lista = [60, 85];
      for (const e of ln.escenas) {
        if (e.tipo === 'nivel') lista.push(e.inicio + 22, e.inicio + 48);
        if (e.tipo === 'clip' || e.tipo === 'cierre') {
          if (e.ficha) lista.push(e.inicio + e.ficha.inicio + 22);
          for (const g of e.golpes.slice(0, 1)) lista.push(e.inicio + g.inicio + (g.clave ?? 0) + 8);
          // Una pagina de dialogo a mitad de la escena y el final (cola de lectura).
          const pagina = e.paginas.find((pg) => (pg.startMs / 1000) * 30 > e.cuadros * 0.5) ?? e.paginas.at(-1);
          if (pagina) lista.push(e.inicio + Math.round((pagina.startMs / 1000) * 30) + 14);
          lista.push(e.inicio + e.cuadros - 4);
          if (e.juego?.[0]) lista.push(e.inicio + e.juego[0].inicio + 15);
        }
      }
      cuadro = [...new Set(lista)].join(',');
    }
    try {
      if (cuadro != null) {
        // --cuadro=40,150,300: varios PNG de revision desde el mismo paquete.
        for (const q of cuadro.split(',')) {
          const png = path.join(locales, `${id}-${q}.png`);
          remotion(['still', paquete, id, png, `--frame=${q}`, '--scale=0.5', '--gl=angle', '--log=error']);
          console.log(`  ✓ cuadro ${q} → ${png}`);
        }
        continue;
      }
      const bruto = path.join(locales, `${id}.bruto.mp4`);
      const local = path.join(locales, nombre);
      console.log(`\n▶ ${id} → ${nombre} (${(lineaArcade(pieza).total / 30).toFixed(1)} s)`);
      const argumentos = ['render', paquete, id, bruto, '--codec=h264', '--pixel-format=yuv420p', '--color-space=bt709', '--timeout=180000', '--log=error', '--crf=10', '--x264-preset=veryfast', '--jpeg-quality=100', '--gl=angle', '--offthreadvideo-cache-size-in-bytes=1200000000'];
      try {
        remotion([...argumentos, '--concurrency=4']);
      } catch {
        console.log('  ↻ reintento con --concurrency=2');
        remotion([...argumentos, '--concurrency=2']);
      }
      normalizar(bruto, local);
      // El bruto (CRF 10, 1-2 GB) ya no sirve una vez sale el final; dejarlo llenaba el disco en las tandas.
      try { unlinkSync(bruto); } catch {}
      const audio = medirAudio(local);
      const medio = inspeccionar(local);
      const problemas = validarMedio(medio, { vertical: true });
      if (!args.includes('--prueba')) {
        mkdirSync(editados, { recursive: true });
        copyFileSync(local, path.join(editados, nombre));
      }
      hechos.push({ nombre, duracion: +medio.duracionSegundos.toFixed(1), mb: +medio.tamanoMb.toFixed(1), lufs: audio.lufs, pico: audio.pico, problemas });
      console.log(`  ✓ ${medio.anchoPx}×${medio.altoPx} · ${medio.duracionSegundos.toFixed(1)} s · ${medio.tamanoMb.toFixed(1)} MB · ${audio.lufs} LUFS · pico ${audio.pico} dBFS${problemas.length ? ` · ⚠ ${problemas.join('; ')}` : ''}`);
    } catch (e) {
      fallidos.push({ id, error: e.message.split('\n').slice(0, 3).join(' ') });
      console.log(`  ✗ ${e.message.split('\n')[0]}`);
    }
  }
}
const inventario = path.join(RAIZ, 'trabajo', '2026-10-sofa', 'inventario.json');
const previo = existsSync(inventario) ? JSON.parse(readFileSync(inventario, 'utf8')) : [];
writeFileSync(inventario, JSON.stringify([...previo.filter((p) => !hechos.some((h) => h.nombre === p.nombre)), ...hechos], null, 2));
console.log(`\n${hechos.length} listo(s), ${fallidos.length} fallido(s)`);
for (const f of fallidos) console.log(`  ✗ ${f.id}: ${f.error}`);
process.exit(fallidos.length ? 1 : 0);
