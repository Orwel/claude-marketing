#!/usr/bin/env node
/**
 * Revisa los tableros de Pinterest de Juan David y guarda las referencias nuevas: él sube pins y
 * el estudio los recoge, los baja a Drive y deja la lista para analizarlos (skill video-artistico).
 *
 *   node src/archivo/tableros.mjs              revisa todos los tableros de referencias/tableros.json
 *   node src/archivo/tableros.mjs --pin <url>  guarda un pin suelto (los que manda por el chat)
 *   node src/archivo/tableros.mjs --sin-bajar  solo lista los nuevos y los marca como vistos
 *
 * Cómo lee Pinterest sin sesión: el RSS público de cada tablero (`/<usuario>/<tablero>.rss`)
 * trae los 25 pins más recientes, que es justo lo que hace falta para detectar los nuevos; la
 * página de cada pin trae el mp4 (`v1.pinimg.com/.../expMp4/..._720w.mp4` o `720p/...mp4`; las
 * hevc/h265 no se decodifican), el GIF original o la imagen.
 *
 * Guarda en Drive `CARPETA_REDES/Referencias/<tablero>/` el archivo de cada pin y, si es video, la
 * hoja de cuadros y el análisis de ritmo (src/archivo/referencia.mjs). Los pins ya vistos quedan en
 * `referencias/tableros.json`; los nuevos se anotan en `referencias/tableros-nuevos.md` hasta que
 * se analicen y pasen a su ficha de referencias.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { RAIZ, config } from '../config.js';

const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36', 'Accept-Language': 'es' };
const REGISTRO = path.join(RAIZ, 'referencias', 'tableros.json');
const NUEVOS = path.join(RAIZ, 'referencias', 'tableros-nuevos.md');
const DESTINO = path.join(config.carpetaRedes ?? path.join(RAIZ, 'salida'), 'Referencias');
const opcion = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const bajar = !process.argv.includes('--sin-bajar');
const hoy = new Date().toISOString().slice(0, 10);

const registro = JSON.parse(readFileSync(REGISTRO, 'utf8'));
registro.vistos ??= {};

/** Lo que trae la página del pin: video, GIF o imagen, y su título. */
async function medioDelPin(url) {
  const t = (await (await fetch(url, { headers: UA })).text()).replaceAll('\\u002F', '/').replaceAll('\\/', '/');
  const videos = [...new Set(t.match(/https:\/\/v1\.pinimg\.com\/videos\/[^"\s]+?\.mp4/g) ?? [])];
  const mp4 = videos.find((v) => /expMp4\/.*_720w\.mp4$/.test(v)) ?? videos.find((v) => /\/720p\//.test(v));
  // Solo URLs entre comillas: sin sesión, los pins `e1_…` no traen su medio y la única «originals» de la página es
  // el ícono que va dentro del CSS (`url(...png)`), que se bajaba 18 veces como si fuera el pin (4-nov-2026).
  const gif = (t.match(/"(https:\/\/i\.pinimg\.com\/originals\/[^"\s)]+?\.gif)"/) ?? [])[1];
  const img = (t.match(/"(https:\/\/i\.pinimg\.com\/originals\/[^"\s)]+?\.(?:jpg|png|webp))"/) ?? t.match(/"(https:\/\/i\.pinimg\.com\/736x\/[^"\s)]+?\.(?:jpg|png|webp))"/) ?? [])[1];
  const titulo = ((t.match(/<title>([^<]*)/) ?? [])[1] ?? '').replace(/\s+/g, ' ').trim();
  return { mp4, gif, img, titulo };
}

/** Baja el medio del pin a Drive y, si es video, deja la hoja y el análisis de ritmo. */
async function guardar(pin, carpeta) {
  const m = await medioDelPin(pin.url);
  // Sin medio en la página, la imagen del RSS en tamaño original (el RSS trae la de 236 px).
  if (!m.mp4 && !m.gif && !m.img && pin.rssImg) m.img = await mejorTamano(pin.rssImg);
  const fuente = m.mp4 ?? m.gif ?? m.img;
  if (!fuente || !bajar) return { ...m, archivo: null };
  mkdirSync(carpeta, { recursive: true });
  const base = `${hoy}-${pin.id.slice(-10)}`;
  const archivo = path.join(carpeta, `${base}${path.extname(new URL(fuente).pathname)}`);
  writeFileSync(archivo, Buffer.from(await (await fetch(fuente, { headers: UA })).arrayBuffer()));
  if (m.mp4) {
    try {
      execFileSync('node', [path.join(RAIZ, 'src', 'archivo', 'referencia.mjs'), archivo, path.join(carpeta, `${base}-analisis`)], { stdio: 'ignore' });
    } catch {
      // Sin hoja no se pierde el pin: el video ya quedó guardado.
    }
  }
  return { ...m, archivo };
}

/** La versión más grande que Pinterest entregue de una imagen del RSS: originals, luego 736x, si no la de 236. */
async function mejorTamano(url) {
  for (const t of ['originals', '736x']) {
    const u = url.replace('/236x/', `/${t}/`);
    try { if ((await fetch(u, { method: 'HEAD', headers: UA })).ok) return u; } catch {}
  }
  return url;
}

const idDe = (url) => url.replace(/\/$/, '').split('/pin/')[1] ?? url;
const nuevos = [];

const suelto = opcion('--pin');
if (suelto) {
  const pin = { id: idDe(suelto), url: suelto };
  const r = await guardar(pin, path.join(DESTINO, 'Pins sueltos'));
  nuevos.push({ tablero: 'pins sueltos', pin, ...r });
} else {
  for (const tb of registro.tableros) {
    const rss = await (await fetch(`https://co.pinterest.com/${tb.usuario}/${tb.slug}.rss`, { headers: UA })).text();
    const pins = [...rss.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((x) => {
      const url = (x[1].match(/<link>([^<]+)<\/link>/) ?? [])[1];
      const rssImg = (x[1].match(/https:\/\/i\.pinimg\.com\/236x\/[^&"\s]+/) ?? [])[0];
      return { url, id: idDe(url), rssImg };
    }).filter((p) => p.url);
    const vistos = new Set(registro.vistos[tb.slug] ?? []);
    const frescos = pins.filter((p) => !vistos.has(p.id));
    console.log(`${tb.nombre}: ${pins.length} recientes, ${frescos.length} nuevos`);
    for (const pin of frescos) {
      const r = await guardar(pin, path.join(DESTINO, tb.nombre));
      nuevos.push({ tablero: tb.nombre, pin, ...r });
      vistos.add(pin.id);
      console.log(`  ✓ ${r.mp4 ? 'video' : r.gif ? 'gif' : 'imagen'} · ${r.titulo.slice(0, 60)}`);
      await new Promise((ok) => setTimeout(ok, 800)); // sin prisa: Pinterest corta si se le pide demasiado seguido
    }
    registro.vistos[tb.slug] = [...vistos];
  }
  writeFileSync(REGISTRO, JSON.stringify(registro, null, 2) + '\n');
}

if (nuevos.length) {
  if (!existsSync(NUEVOS)) writeFileSync(NUEVOS, '# Pins nuevos por analizar\n\nLos deja `src/archivo/tableros.mjs`. Al analizarlos, pasarlos a su ficha en `referencias/` y borrarlos de aquí.\n');
  appendFileSync(NUEVOS, `\n## ${hoy}\n` + nuevos.map((n) => `- [${n.tablero}] ${n.mp4 ? 'video' : n.gif ? 'gif' : 'imagen'} · ${n.titulo.slice(0, 90)} · ${n.pin.url}${n.archivo ? ` · Drive: ${path.relative(DESTINO, n.archivo)}` : ''}`).join('\n') + '\n');
}
console.log(`${nuevos.length} pins nuevos${nuevos.length ? ` → ${path.relative(RAIZ, NUEVOS)}` : ''}${bajar && nuevos.length ? ` y Drive ${DESTINO}` : ''}`);
