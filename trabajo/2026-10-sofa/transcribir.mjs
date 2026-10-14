// Transcribe todos los crudos del SOFA con whisper.cpp (misma receta que src/vertical/preparar.js).
// Uso: node trabajo/2026-10-sofa/transcribir.mjs
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..', '..');
const CRUDO = path.join(AQUI, '00-crudo');
const SALIDA = path.join(AQUI, '01-transcripciones');
const FFMPEG = 'C:/Users/User/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe';
const WHISPER_DIR = path.join(RAIZ, '.whisper');
const MODELO = process.argv[2] || 'small';

const whisper = await import('@remotion/install-whisper-cpp');
await whisper.installWhisperCpp({ to: WHISPER_DIR, version: '1.5.5', printOutput: false });
await whisper.downloadWhisperModel({ model: MODELO, folder: WHISPER_DIR, printOutput: false });

const archivos = readdirSync(CRUDO).filter((f) => /\.(mp4|mov)$/i.test(f)).sort();
for (const archivo of archivos) {
  const base = path.parse(archivo).name;
  const wav = path.join(SALIDA, `${base}.wav`);
  const json = path.join(SALIDA, `${base}.captions.json`);
  if (existsSync(json)) continue;
  const t0 = Date.now();
  if (!existsSync(wav)) execFileSync(FFMPEG, ['-y', '-v', 'error', '-i', path.join(CRUDO, archivo), '-vn', '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', wav]);
  const salida = await whisper.transcribe({ inputPath: wav, whisperPath: WHISPER_DIR, whisperCppVersion: '1.5.5', model: MODELO, modelFolder: WHISPER_DIR, tokenLevelTimestamps: true, language: 'es', splitOnWord: true });
  const { captions } = whisper.toCaptions({ whisperCppOutput: salida });
  writeFileSync(json, JSON.stringify(captions, null, 1));
  const texto = captions.map((c) => c.text).join('').replace(/\s+/g, ' ').trim();
  writeFileSync(path.join(SALIDA, `${base}.txt`), texto);
  console.log(`✓ ${base} (${((Date.now() - t0) / 1000).toFixed(0)} s): ${texto.slice(0, 120)}`);
}
console.log('listo');
