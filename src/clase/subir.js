/**
 * Sube una clase editada al VPS de grabaciones: npm run clase-subir -- <slug> [--archivo=ruta.mp4]
 *
 * Copia el MP4 a /srv/grabaciones (lo que sirve la app con enlaces firmados; el timer del VPS lo
 * respalda en Drive cada 10 min), comprueba tamaño y huella, y deja el SQL para registrarlo en
 * live_event_recordings. El SQL NO se ejecuta aquí: lo corre quien tenga el Supabase de Trifuerza
 * (la sesión de tri-app2), y publicar la repetición (replay_available, precio) es otra decisión.
 *
 * Por qué status 'deleted' para ocultar las filas crudas: en tri-app2 (lib/eventos/recordings.ts y
 * recordingActions.ts) 'deleted' solo filtra la fila; el archivo crudo se queda en el VPS y en Drive.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { RAIZ } from '../config.js';

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith('--'));
const opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const clase = JSON.parse(readFileSync(path.join(RAIZ, 'clases', `${slug}.json`), 'utf8'));
// --version=N sube una versión anterior a la que está en curso (p. ej. una corrección rápida).
const V = `v${opt.version ?? clase.version ?? 1}`;
const local = opt.archivo ?? path.join(RAIZ, 'trabajo', 'clases', slug, 'salida', `${slug}-completa-${V}.mp4`);
const vps = clase.entrega?.vps ?? { host: 'root@179.197.81.110', llave: '~/.ssh/trifuerza_vps', carpeta: '/srv/grabaciones' };
const fecha = clase.fuente.archivo.match(/\d{4}-\d{2}-\d{2}/)[0];
const nombre = `${slug}-${fecha}-editada-${V}.mp4`;
const llave = vps.llave.replace(/^~/, process.env.USERPROFILE ?? process.env.HOME);
const ssh = (cmd) => execFileSync('ssh', ['-i', llave, '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', vps.host, cmd], { encoding: 'utf8' }).trim();

const tam = statSync(local).size;
const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', local], { encoding: 'utf8' }));
const huella = await new Promise((ok) => {
  const h = createHash('sha256');
  createReadStream(local).on('data', (d) => h.update(d)).on('end', () => ok(h.digest('hex')));
});
console.log(`▶ ${path.basename(local)} → ${vps.host}:${vps.carpeta}/${nombre}\n  ${(tam / 1e6).toFixed(0)} MB · ${(dur / 60).toFixed(1)} min`);

// Se sube con nombre temporal y se renombra al final: el timer de Drive (min-age 3m) y la app
// nunca ven un archivo a medio copiar.
const tmp = `${vps.carpeta}/.${nombre}.parcial`;
// Con el equipo cargado la copia se cortaba a mitad (scp 255) y los reintentos seguidos hicieron que
// fail2ban bloqueara la IP en el puerto 22: se mantiene viva la conexión y, si se cae, se espera 5 min.
const opcionesSsh = ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', '-o', 'ServerAliveInterval=15', '-o', 'ServerAliveCountMax=8'];
for (let intento = 1; ; intento++) {
  try {
    execFileSync('scp', ['-i', llave, ...opcionesSsh, local, `${vps.host}:${tmp}`], { stdio: 'inherit' });
    break;
  } catch (e) {
    if (intento >= 3) throw e;
    console.log(`  la copia se cortó (intento ${intento}); reintento en 5 min…`);
    execFileSync(process.execPath, ['-e', 'setTimeout(()=>{}, 300000)']);
  }
}
const remota = ssh(`sha256sum '${tmp}' | cut -d' ' -f1`);
if (remota !== huella) throw new Error(`La huella no coincide (local ${huella}, VPS ${remota}). No se renombra.`);
// 1001 es el usuario de Egress: los demás MP4 de la carpeta son suyos.
ssh(`mv '${tmp}' '${vps.carpeta}/${nombre}' && chown 1001:root '${vps.carpeta}/${nombre}' && ls -la '${vps.carpeta}/${nombre}'`);
console.log('  ✔ subido y verificado (sha256)');

const ev = clase.evento ?? {};
// Los capítulos van en la fila de la grabación (sus tiempos son los de este archivo); los deja armar.js
// o remontaje.js junto al MP4. El .vtt no va aquí: se sube aparte a academy-resources.
const rutaCap = local.replace(/\.mp4$/, '.capitulos.json');
const capitulos = existsSync(rutaCap) ? JSON.stringify(JSON.parse(readFileSync(rutaCap, 'utf8'))).replace(/'/g, "''") : null;
const sql = `-- Clase editada: ${clase.titulo} (${V}). Generado por src/clase/subir.js.
insert into live_event_recordings (event_id, event_title, egress_id, status, file_name, duration_seconds, size_bytes, started_at, ended_at)
values ('${ev.id}', '${(ev.titulo ?? clase.titulo).replace(/'/g, "''")}', 'EDITADA_${slug}_${V}', 'ready', '${nombre}', ${Math.round(dur)}, ${tam}, now(), now());

-- Ocultar las grabaciones crudas y las editadas anteriores (el archivo NO se borra: 'deleted' solo filtra la fila).
update live_event_recordings set status = 'deleted'
where event_id = '${ev.id}' and file_name in (${(ev.crudas ?? []).map((f) => `'${f}'`).join(', ')});
update live_event_recordings set status = 'deleted'
where event_id = '${ev.id}' and file_name like '${slug}-${fecha}-editada-v%' and file_name <> '${nombre}';
${capitulos ? `
-- Capítulos del timeline (aparte: si la columna chapters no existiera, lo de arriba ya quedó).
update live_event_recordings set chapters = '${capitulos}'::jsonb
where event_id = '${ev.id}' and file_name = '${nombre}';
` : ''}`;
const rutaSql = path.join(RAIZ, 'trabajo', 'clases', slug, 'salida', `registrar-${V}.sql`);
writeFileSync(rutaSql, sql);
console.log(`\nSQL para registrarla (sin ejecutar): ${path.relative(RAIZ, rutaSql)}\n\n${sql}`);
