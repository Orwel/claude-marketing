/**
 * Capítulos y closed captions de una clase editada, para el reproductor de la app (Mis clases):
 *   npm run clase-capitulos -- <slug> [--version=1] [--intro=4.5]
 *
 * Lee `capitulos` ([{en, seccion, titulo}], en = segundo del crudo) y la transcripción, los pasa al
 * tiempo del MP4 final y deja junto al video:
 *   salida/<slug>-completa-vN.capitulos.json  → [{at, section, title}] (va a live_event_recordings.chapters)
 *   salida/<slug>-completa-vN.es.vtt          → subtítulos (los sube tri-app2; ver documentación ahí)
 *
 * `--intro` es lo que dura todo lo que va antes del cuerpo (logo + intro con el título). Por omisión
 * se calcula igual que en armar.js; la v1 de Fundamentos de IA se armó sin logo: --intro=4.5.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { RAIZ } from '../config.js';
import { generarVtt } from './subtitulos.js';

/** Capítulos en segundos del MP4 final. El primero arranca en 0 para cubrir la intro. */
export function capitulosDe({ clase, aSalida, desde, hasta }) {
  const lista = (clase.capitulos ?? []).filter((c) => c.en >= desde - 0.01 && c.en < hasta);
  return lista.map((c, i) => ({
    at: i === 0 ? 0 : Math.round(aSalida(c.en) * 10) / 10,
    section: c.seccion ?? null,
    title: c.titulo,
  }));
}

/** Escribe los capítulos y el .vtt junto al MP4 `final`. */
export function escribirCapitulos({ clase, transcripcion, desfaseEn = () => 0, desde, hasta, aSalida, final }) {
  const base = final.replace(/\.mp4$/, '');
  const caps = capitulosDe({ clase, aSalida, desde, hasta });
  writeFileSync(`${base}.capitulos.json`, JSON.stringify(caps, null, 2) + '\n', 'utf8');
  const n = generarVtt({ clase, transcripcion, desde, hasta, aSalida: (ta) => aSalida(ta + desfaseEn(ta)), salida: `${base}.es.vtt` });
  return { capitulos: caps.length, subtitulos: n };
}

const esCli = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
if (esCli) {
  const args = process.argv.slice(2);
  const slug = args.find((a) => !a.startsWith('--'));
  const opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
  const clase = JSON.parse(readFileSync(path.join(RAIZ, 'clases', `${slug}.json`), 'utf8'));
  const DIR = path.join(RAIZ, 'trabajo', 'clases', slug);
  const final = path.join(DIR, 'salida', `${slug}-completa-v${opt.version ?? clase.version ?? 1}.mp4`);
  const duracion = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).trim());
  let I = opt.intro !== undefined ? Number(opt.intro) : null;
  if (I === null) {
    const logo = clase.introLogo !== false ? path.join(RAIZ, clase.introLogo?.archivo ?? 'public/intros/trifuerza-logo.mp4') : null;
    const L = logo && existsSync(logo) ? Math.round((clase.introLogo?.dura ?? duracion(logo)) * 30) / 30 : 0;
    I = clase.intro.dura + L;
  }
  const A = clase.inicio.seg;
  const B = clase.fin?.seg ?? Infinity;
  const tramos = clase.sincronia?.tramos ?? [];
  const desfaseEn = (t) => (tramos.find((x) => t >= x.desde && t < x.hasta) ?? tramos[tramos.length - 1])?.desfase ?? 0;
  const transcripcion = JSON.parse(readFileSync(path.join(DIR, '01-audio', 'transcripcion.json'), 'utf8'));
  const r = escribirCapitulos({ clase, transcripcion, desfaseEn, desde: A, hasta: B, aSalida: (t) => t - A + I, final });
  console.log(`✔ ${r.capitulos} capítulos y ${r.subtitulos} subtítulos (intro ${I} s) junto a ${path.relative(RAIZ, final)}`);
}
