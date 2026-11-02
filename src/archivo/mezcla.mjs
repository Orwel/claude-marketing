#!/usr/bin/env node
/**
 * Mezcla la voz con una cancion de libreria para una pieza narrada: la musica baja sola cuando se
 * habla (sidechain), puede hacer un silencio con descenso suave (para un golpe dramatico) y todo
 * sale a -16 LUFS. La pieza toma el resultado en `pieza.audio`.
 *
 *   node src/archivo/mezcla.mjs <voz> <cancion> <salida.wav> [--velocidad 1.07] [--desde 34]
 *        [--silencio 27.8,29.4] [--duracion 41.68]
 *
 * --velocidad  acelera la voz sin cambiar el tono (atempo) para entrar en la duracion pedida.
 * --desde      segundo de la cancion donde arranca (saltar intros largas).
 * --silencio   tramo sin musica: baja en 1,7 s antes y vuelve en 1,3 s despues (nunca abrupto).
 * --duracion   largo final (por defecto, el de la voz + 1,6 s de cola).
 */
import { execFileSync } from 'node:child_process';

const [voz, cancion, salida] = process.argv.slice(2);
if (!voz || !cancion || !salida) {
  console.error('Uso: node src/archivo/mezcla.mjs <voz> <cancion> <salida.wav> [--velocidad 1.07] [--desde 34] [--silencio a,b] [--duracion s]');
  process.exit(1);
}
const opc = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const velocidad = Number(opc('--velocidad', 1));
const desde = Number(opc('--desde', 0));
const durVoz = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', voz], { encoding: 'utf8' })) / velocidad;
const total = Number(opc('--duracion', (durVoz + 1.6).toFixed(2)));
const [s0, s1] = (opc('--silencio', '') || '').split(',').map(Number);
const curva = s0
  ? `volume='if(lt(t,${s0 - 1.7}),1,if(lt(t,${s0}),1-(t-${s0 - 1.7})/1.7,if(lt(t,${s1}),0,if(lt(t,${s1 + 1.3}),(t-${s1})/1.3,1))))':eval=frame,`
  : '';
const filtro = [
  `[0:a]atrim=0:${total},asetpts=PTS-STARTPTS,afade=t=in:d=1.2,afade=t=out:st=${total - 2}:d=2,${curva}volume=0.55,aformat=channel_layouts=stereo[m]`,
  `[1:a]atempo=${velocidad},aformat=channel_layouts=stereo,apad=whole_dur=${total}[v]`,
  '[v]asplit[v1][v2]',
  '[m][v1]sidechaincompress=threshold=0.03:ratio=4:attack=40:release=400[md]',
  '[md][v2]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=9',
].join(';');
execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(desde), '-i', cancion, '-i', voz, '-filter_complex', filtro, '-ar', '48000', salida]);
console.log(`✓ ${salida}: ${total} s, voz a ${velocidad}x${s0 ? `, silencio ${s0}-${s1} s` : ''}`);
