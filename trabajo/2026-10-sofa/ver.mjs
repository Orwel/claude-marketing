// Imprime las palabras de una transcripcion con su segundo real: alineadas a la voz (como hace armar.js)
// y con el desfase de audio del crudo. Uso: node trabajo/2026-10-sofa/ver.mjs <base>...
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { vozDe } from '../../src/sofa/voz.js';
import { alinearAVoz, unirTokens } from '../../src/vertical/corte.js';

const FP = 'C:/Users/User/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffprobe.exe';
const norm = (t) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9ñ ]/g, '').trim();
const esMarca = (t) => /^\s*[[(].*[\])]\s*$/.test(t);

for (const base of process.argv.slice(2)) {
  const ext = base.startsWith('IMG') ? 'MOV' : 'mp4';
  const off = parseFloat(execFileSync(FP, ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=start_time', '-of', 'csv=p=0', `trabajo/2026-10-sofa/00-crudo/${base}.${ext}`], { encoding: 'utf8' })) || 0;
  const c = unirTokens(JSON.parse(readFileSync(`trabajo/2026-10-sofa/01-transcripciones/${base}.captions.json`, 'utf8')));
  const leidas = c.filter((w) => !esMarca(w.text)).map((w) => ({ ...w, desde: w.startMs / 1000, hasta: w.endMs / 1000, limpia: norm(w.text) })).filter((w) => w.limpia);
  const palabras = alinearAVoz(leidas, vozDe(base), true);
  let linea = `## ${base} (desfase ${off.toFixed(2)} s)\n`;
  let ultimo = -1;
  for (const w of palabras) {
    const s = w.desde + off;
    if (Math.floor(s) !== ultimo) {
      linea += `\n[${s.toFixed(1)}]`;
      ultimo = Math.floor(s);
    }
    linea += ' ' + w.text.trim();
  }
  console.log(linea + '\n');
}
