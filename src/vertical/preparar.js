import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { carpetaDelMes, config, RAIZ } from '../config.js';
import { remotion, remotionSalida } from '../remotion-cli.js';
import { corregir, planificarCorte, tramosDeVoz, unirCortes } from './corte.js';

/**
 * npm run vertical -- 2026-10 [archivo]
 *
 * Toma los videos de "videos grabados" del mes y, por cada uno:
 *  1. hace un proxy H.264 en public/crudos/ (Remotion lee de public/, y el .MOV del
 *     iPhone suele venir en HEVC y rotado: el proxy lo endereza y lo hace legible);
 *  2. saca el audio a 16 kHz mono, que es lo que pide Whisper;
 *  3. transcribe con whisper.cpp en local, con tiempos por palabra;
 *  4. mide donde hay voz de verdad (silencedetect): los tiempos de Whisper se anclan ahi;
 *  5. planifica el corte (tomas, "otra", silencios).
 *
 * Luego actualiza el corte de cada pieza Vertical del mes que use esos videos
 * (`metraje.fuentes`, en orden: una pieza puede unir varias grabaciones) y, para
 * los videos que ninguna pieza usa, escribe una pieza en borrador. Lo editorial
 * (variantes, verificar) nunca se toca. Con `metraje.manual: true` tampoco el corte.
 * `metraje.correcciones` arregla palabras que Whisper escribe mal (ver corregir en corte.js).
 *
 * Cada paso se salta si su resultado ya existe: si falla a mitad, se vuelve a
 * correr y sigue donde iba.
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
const carpetaPiezas = path.join(RAIZ, 'piezas', mes);
mkdirSync(carpetaCrudos, { recursive: true });
mkdirSync(carpetaTrabajo, { recursive: true });
mkdirSync(carpetaPiezas, { recursive: true });

// whisper.cpp se instala una vez (en Windows baja el binario; en macOS/Linux lo compila).
const whisper = await import('@remotion/install-whisper-cpp');
await whisper.installWhisperCpp({ to: WHISPER_DIR, version: WHISPER_VERSION, printOutput: true });
await whisper.downloadWhisperModel({ model: WHISPER_MODELO, folder: WHISPER_DIR, printOutput: true });

const rutas = (archivo) => {
  const base = path.parse(archivo).name;
  return {
    base,
    proxy: path.join(carpetaCrudos, `${base}.mp4`),
    publico: `crudos/${mes}/${base}.mp4`,
    wav: path.join(carpetaTrabajo, `${base}.wav`),
    transcripcion: path.join(carpetaTrabajo, `${base}.captions.json`),
    voz: path.join(carpetaTrabajo, `${base}.voz.json`),
  };
};

/**
 * Tramos con voz del audio. -35 dB y 0,25 s: por debajo, las pausas entre
 * palabras de una frase normal tambien cuentan como silencio y el anclaje se desordena.
 */
function medirVoz(wav) {
  const salida = remotionSalida(['ffmpeg', '-hide_banner', '-i', wav, '-af', 'silencedetect=noise=-35dB:d=0.25', '-f', 'null', '-']);
  const [, h, m, s] = /Duration: (\d+):(\d+):([\d.]+)/.exec(salida);
  const duracion = +h * 3600 + +m * 60 + +s;
  const silencios = [];
  let inicio = null;
  for (const [, tipo, t] of salida.matchAll(/silence_(start|end): ([\d.]+)/g)) {
    if (tipo === 'start') inicio = +t;
    else {
      silencios.push({ desde: inicio ?? 0, hasta: +t });
      inicio = null;
    }
  }
  // Si el archivo termina en silencio, ffmpeg abre el silencio y no lo cierra.
  if (inicio !== null) silencios.push({ desde: inicio, hasta: duracion });
  return tramosDeVoz(silencios, duracion);
}

for (const archivo of videos) {
  const r = rutas(archivo);
  const entrada = path.join(origen, archivo);
  console.log(`\n▶ ${archivo}`);

  if (!existsSync(r.proxy)) {
    console.log('  proxy H.264…');
    // bt709 explicito: es lo que graba el iPhone en "Mas compatible" y lo que espera el render.
    // Un .MOV en HDR (HLG) saldria lavado; preparar lo avisa abajo.
    remotion(['ffmpeg', '-y', '-v', 'error', '-i', entrada, '-vf', "scale='min(1080,iw)':-2", '-c:v', 'libx264', '-crf', '18', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-c:a', 'aac', '-b:a', '192k', r.proxy]);
    const color = remotionSalida(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=color_transfer', '-of', 'csv=p=0', entrada]).trim();
    if (/arib-std-b67|smpte2084/.test(color)) console.log(`  ⚠ ${archivo} viene en HDR (${color}): los colores del proxy saldran lavados. Grabar en SDR o tonemapear.`);
  }
  if (!existsSync(r.wav)) {
    console.log('  audio 16 kHz…');
    remotion(['ffmpeg', '-y', '-v', 'error', '-i', entrada, '-vn', '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', r.wav]);
  }
  if (!existsSync(r.transcripcion)) {
    console.log(`  transcribiendo con whisper ${WHISPER_MODELO}…`);
    const salida = await whisper.transcribe({
      inputPath: r.wav,
      whisperPath: WHISPER_DIR,
      whisperCppVersion: WHISPER_VERSION,
      model: WHISPER_MODELO,
      modelFolder: WHISPER_DIR,
      tokenLevelTimestamps: true,
      language: 'es',
      splitOnWord: true,
    });
    const { captions } = whisper.toCaptions({ whisperCppOutput: salida });
    writeFileSync(r.transcripcion, JSON.stringify(captions, null, 1));
  }
  if (!existsSync(r.voz)) writeFileSync(r.voz, JSON.stringify(medirVoz(r.wav)));
}

/** Corte de un video ya procesado (lee lo que dejo el paso anterior en trabajo/). */
function corteDe(archivo) {
  const r = rutas(archivo);
  if (!existsSync(r.transcripcion) || !existsSync(r.voz)) return null;
  const corte = planificarCorte(JSON.parse(readFileSync(r.transcripcion, 'utf8')), { voz: JSON.parse(readFileSync(r.voz, 'utf8')) });
  return { archivo: r.publico, corte };
}

const informar = (nombre, corte) => {
  console.log(`  ${nombre}: ${corte.duracionFinal}s · ${corte.segmentos.length} tramos · ${corte.descartadas.length} toma(s) descartada(s)`);
  for (const d of corte.descartadas) console.log(`    ✗ "${d}"`);
};

// Piezas que ya existen: se les rehace el corte con sus fuentes, en su orden.
const usados = new Set();
console.log('');
for (const nombre of readdirSync(carpetaPiezas).filter((f) => f.endsWith('.json'))) {
  const destino = path.join(carpetaPiezas, nombre);
  const pieza = JSON.parse(readFileSync(destino, 'utf8'));
  if (pieza.plantilla !== 'Vertical') continue;
  const fuentes = pieza.metraje?.fuentes ?? [pieza.metraje?.original].filter(Boolean);
  fuentes.forEach((f) => usados.add(f));
  if (pieza.metraje?.manual || !fuentes.some((f) => videos.includes(f))) continue;
  const cortes = fuentes.map(corteDe);
  if (cortes.includes(null)) {
    console.log(`  ⚠ ${nombre}: falta procesar alguna de sus fuentes (${fuentes.join(', ')})`);
    continue;
  }
  const corte = unirCortes(cortes);
  informar(nombre, corte);
  const subtitulos = corregir(corte.subtitulos, pieza.metraje.correcciones);
  const texto = corte.texto.map((t) => corregir(t.split(' ').map((text) => ({ text: ` ${text}` })), pieza.metraje.correcciones).map((s) => s.text.trim()).join(' '));
  writeFileSync(destino, JSON.stringify({ ...pieza, metraje: { ...pieza.metraje, fuentes, segmentos: corte.segmentos }, subtitulos, transcripcion: texto, descartadas: corte.descartadas }, null, 2) + '\n');
  console.log(`  ↻ corte actualizado; textos intactos`);
}

// Videos que ninguna pieza usa: borrador nuevo, uno por video.
for (const archivo of videos.filter((f) => !usados.has(f))) {
  const { base } = rutas(archivo);
  const slug = `grabado-${base.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const unido = unirCortes([corteDe(archivo)]);
  informar(`${slug}.json`, unido);
  const pieza = {
    slug,
    titulo: unido.texto[0]?.slice(0, 80) ?? base,
    plantilla: 'Vertical',
    formato: 'vertical',
    estado: 'borrador',
    cuentas: ['juanda'],
    metraje: { fuentes: [archivo], segmentos: unido.segmentos },
    subtitulos: unido.subtitulos,
    transcripcion: unido.texto,
    descartadas: unido.descartadas,
    variantes: {
      juanda: {
        etiqueta: '',
        // El gancho en pantalla sale de la primera linea dicha; se corrige a mano si hace falta.
        gancho: unido.texto[0] ?? '',
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
  writeFileSync(path.join(carpetaPiezas, `${slug}.json`), JSON.stringify(pieza, null, 2) + '\n');
  console.log(`  ✓ piezas/${mes}/${slug}.json`);
}
console.log('\nSiguiente: npm run estudio (revisar) → npm run render -- <slug>');
