import { statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { remotion } from '../remotion-cli.js';

/**
 * Requisitos de Reels, TikTok y Shorts verticales. Se comprueban sobre el
 * archivo real (con el ffprobe que trae Remotion) antes de que llegue a
 * Drive: descubrir el rechazo al publicar a mano cuesta mas.
 */
export const LIMITES_REEL = {
  anchoRecomendado: 1080,
  altoRecomendado: 1920,
  duracionMinSegundos: 5,
  duracionMaxSegundos: 90,
  formatos: ['mp4', 'mov'],
  tamanoMaxMb: 300,
  codec: 'h264',
  formatoPixel: 'yuv420p',
};

/** Valida los datos del medio. Devuelve una lista de problemas; vacia = listo. */
export function validarMedio({ anchoPx, altoPx, duracionSegundos, tamanoMb, formato, codec, formatoPixel }, { vertical = true } = {}) {
  const problemas = [];

  if (anchoPx && altoPx) {
    const esperada = vertical ? 9 / 16 : 16 / 9;
    if (Math.abs(anchoPx / altoPx - esperada) > 0.02) problemas.push(`Relacion de aspecto ${anchoPx}x${altoPx} no es ${vertical ? '9:16' : '16:9'}`);
  }
  if (vertical && duracionSegundos && (duracionSegundos < LIMITES_REEL.duracionMinSegundos || duracionSegundos > LIMITES_REEL.duracionMaxSegundos)) {
    problemas.push(`Duracion ${duracionSegundos.toFixed(1)}s fuera de rango para Reels (${LIMITES_REEL.duracionMinSegundos}-${LIMITES_REEL.duracionMaxSegundos}s)`);
  }
  if (tamanoMb && tamanoMb > LIMITES_REEL.tamanoMaxMb) problemas.push(`${tamanoMb.toFixed(1)}MB supera ${LIMITES_REEL.tamanoMaxMb}MB`);
  if (formato && !LIMITES_REEL.formatos.includes(formato.toLowerCase())) problemas.push(`Formato ${formato} no admitido`);
  // H.264 + yuv420p: cualquier otra combinacion la red la recodifica y pierde calidad, o la rechaza.
  if (codec && codec !== LIMITES_REEL.codec) problemas.push(`Codec ${codec}; se espera ${LIMITES_REEL.codec}`);
  if (formatoPixel && formatoPixel !== LIMITES_REEL.formatoPixel) problemas.push(`Formato de pixel ${formatoPixel}; se espera ${LIMITES_REEL.formatoPixel}`);

  return problemas;
}

/** Lee el archivo con ffprobe (el que trae Remotion, para no pedir instalar ffmpeg aparte). */
export function inspeccionar(archivo) {
  const salida = remotion(['ffprobe', '-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', archivo], { silencioso: true });
  const datos = JSON.parse(salida);
  const video = datos.streams.find((s) => s.codec_type === 'video');
  return {
    anchoPx: video.width,
    altoPx: video.height,
    duracionSegundos: Number(datos.format.duration),
    tamanoMb: statSync(archivo).size / 1024 / 1024,
    formato: path.extname(archivo).slice(1),
    codec: video.codec_name,
    formatoPixel: video.pix_fmt,
  };
}

export function validarArchivo(archivo) {
  const medio = inspeccionar(archivo);
  const problemas = validarMedio(medio, { vertical: medio.altoPx > medio.anchoPx });
  return { medio, problemas };
}

// Uso directo: npm run validar -- salida/2026-10/archivo.mp4
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const archivos = process.argv.slice(2);
  if (!archivos.length) {
    console.error('Uso: npm run validar -- <video.mp4> [otro.mp4 ...]');
    process.exit(1);
  }
  let fallos = 0;
  for (const archivo of archivos) {
    const { medio, problemas } = validarArchivo(archivo);
    const resumen = `${medio.anchoPx}x${medio.altoPx} · ${medio.duracionSegundos.toFixed(1)}s · ${medio.tamanoMb.toFixed(1)}MB · ${medio.codec}/${medio.formatoPixel}`;
    if (problemas.length) {
      fallos++;
      console.log(`✗ ${path.basename(archivo)} (${resumen})`);
      for (const p of problemas) console.log(`   - ${p}`);
    } else {
      console.log(`✓ ${path.basename(archivo)} (${resumen})`);
    }
  }
  process.exit(fallos ? 1 : 0);
}
