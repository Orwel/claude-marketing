import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { carpetaDelMes, config, RAIZ } from '../config.js';
import { remotion } from '../remotion-cli.js';
import { planificarCorte } from './corte.js';

/**
 * npm run vertical -- 2026-10 [archivo]
 *
 * Toma los videos de "videos grabados" del mes y, por cada uno:
 *  1. hace un proxy H.264 en public/crudos/ (Remotion lee de public/, y el .MOV del
 *     iPhone suele venir en HEVC y rotado: el proxy lo endereza y lo hace legible);
 *  2. saca el audio a 16 kHz mono, que es lo que pide Whisper;
 *  3. transcribe con whisper.cpp en local, con tiempos por palabra;
 *  4. planifica el corte (tomas, "otra", silencios) y escribe la pieza en borrador.
 *
 * Cada paso se salta si su resultado ya existe: si falla a mitad, se vuelve a
 * correr y sigue donde iba. La pieza nunca se sobrescribe, porque es donde
 * Juan David corrige el gancho, el cierre y el CTA.
 */
const EXTENSIONES = ['.mov', '.mp4', '.m4v'];
const WHISPER_DIR = path.join(RAIZ, '.whisper');
const WHISPER_VERSION = process.env.WHISPER_VERSION || '1.5.5';
const WHISPER_MODELO = process.env.WHISPER_MODELO || 'medium';

const [mes, soloArchivo] = process.argv.slice(2);
if (!/^\d{4}-\d{2}$/.test(mes ?? '')) {
  console.error('Uso: npm run vertical -- AAAA-MM [archivo]');
  process.exit(1);
}
if (!config.carpetaRedes) {
  console.error('Falta CARPETA_REDES en .env (p. ej. G:\\Mi unidad\\Redes sociales)');
  process.exit(1);
}
const origen = path.join(config.carpetaRedes, carpetaDelMes(mes), config.subcarpetaGrabados);
if (!existsSync(origen)) {
  console.error(`No existe ${origen}`);
  process.exit(1);
}

const videos = readdirSync(origen).filter((f) => EXTENSIONES.includes(path.extname(f).toLowerCase()) && (!soloArchivo || f === soloArchivo));
console.log(`${videos.length} video(s) en ${origen}`);

const carpetaCrudos = path.join(RAIZ, 'public', 'crudos', mes);
const carpetaTrabajo = path.join(RAIZ, 'trabajo', mes);
mkdirSync(carpetaCrudos, { recursive: true });
mkdirSync(carpetaTrabajo, { recursive: true });

// whisper.cpp se instala una vez (en Windows baja el binario; en macOS/Linux lo compila).
const whisper = await import('@remotion/install-whisper-cpp');
await whisper.installWhisperCpp({ to: WHISPER_DIR, version: WHISPER_VERSION, printOutput: true });
await whisper.downloadWhisperModel({ model: WHISPER_MODELO, folder: WHISPER_DIR, printOutput: true });

for (const archivo of videos) {
  const base = path.parse(archivo).name;
  const slug = `grabado-${base.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const entrada = path.join(origen, archivo);
  const proxy = path.join(carpetaCrudos, `${base}.mp4`);
  const wav = path.join(carpetaTrabajo, `${base}.wav`);
  const transcripcion = path.join(carpetaTrabajo, `${base}.captions.json`);
  console.log(`\n▶ ${archivo}`);

  if (!existsSync(proxy)) {
    console.log('  proxy H.264…');
    remotion(['ffmpeg', '-y', '-v', 'error', '-i', entrada, '-vf', "scale='min(1080,iw)':-2", '-c:v', 'libx264', '-crf', '18', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', proxy]);
  }
  if (!existsSync(wav)) {
    console.log('  audio 16 kHz…');
    remotion(['ffmpeg', '-y', '-v', 'error', '-i', entrada, '-vn', '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', wav]);
  }
  if (!existsSync(transcripcion)) {
    console.log(`  transcribiendo con whisper ${WHISPER_MODELO}…`);
    const salida = await whisper.transcribe({
      inputPath: wav,
      whisperPath: WHISPER_DIR,
      whisperCppVersion: WHISPER_VERSION,
      model: WHISPER_MODELO,
      modelFolder: WHISPER_DIR,
      tokenLevelTimestamps: true,
      language: 'es',
      splitOnWord: true,
    });
    const { captions } = whisper.toCaptions({ whisperCppOutput: salida });
    writeFileSync(transcripcion, JSON.stringify(captions, null, 1));
  }

  const captions = JSON.parse(readFileSync(transcripcion, 'utf8'));
  const corte = planificarCorte(captions);
  console.log(`  ${corte.duracionOriginal.toFixed(1)}s → ${corte.duracionFinal}s · ${corte.segmentos.length} tramos · ${corte.descartadas.length} toma(s) descartada(s)`);
  for (const d of corte.descartadas) console.log(`    ✗ "${d}"`);

  const destino = path.join(RAIZ, 'piezas', mes, `${slug}.json`);
  const pieza = {
    slug,
    titulo: corte.texto[0]?.slice(0, 80) ?? base,
    plantilla: 'Vertical',
    formato: 'vertical',
    estado: 'borrador',
    cuentas: ['juanda'],
    metraje: { archivo: `crudos/${mes}/${base}.mp4`, original: archivo, segmentos: corte.segmentos },
    subtitulos: corte.subtitulos,
    transcripcion: corte.texto,
    descartadas: corte.descartadas,
    variantes: {
      juanda: {
        etiqueta: '',
        // El gancho en pantalla sale de la primera linea dicha; se corrige a mano si hace falta.
        gancho: corte.texto[0] ?? '',
        cierre: '',
        cta: '',
        web: '@juanda.trifuerza',
        copy: '',
      },
    },
    verificar: [
      { dato: 'Revisar la transcripción (nombres propios, normas, cifras) y el corte antes de publicar.', estado: 'pendiente' },
      { dato: 'Toda norma, artículo o plazo dicho en el video: verificar.', estado: 'pendiente' },
    ],
  };
  if (existsSync(destino)) {
    // Se actualiza solo lo que viene del metraje; lo editorial (variantes, verificar) se respeta.
    const previa = JSON.parse(readFileSync(destino, 'utf8'));
    writeFileSync(destino, JSON.stringify({ ...previa, metraje: pieza.metraje, subtitulos: pieza.subtitulos, transcripcion: pieza.transcripcion, descartadas: pieza.descartadas }, null, 2) + '\n');
    console.log(`  ↻ ${path.relative(RAIZ, destino)} (corte actualizado; textos intactos)`);
  } else {
    writeFileSync(destino, JSON.stringify(pieza, null, 2) + '\n');
    console.log(`  ✓ ${path.relative(RAIZ, destino)}`);
  }
}
console.log('\nSiguiente: npm run estudio (revisar) → npm run render -- <slug>');
