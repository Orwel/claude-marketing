#!/usr/bin/env node
/**
 * Flujo «noticia del día → pieza lista para aprobar» (diseño en docs/bandeja/NOTICIA-DEL-DIA.md).
 *
 *   node src/radar/noticia.mjs --candidatas <archivo.json>      manda 1–3 candidatas, cada una con su botón «Hazlo»
 *   node src/radar/noticia.mjs --vista <slug> [--id N]           manda la vista previa del carrusel (láminas + copy + pendientes)
 *   --mes AAAA-MM       mes de la pieza (por defecto, el actual)
 *   --carpeta <ruta>    dónde están las láminas PNG (por defecto trabajo/noticia/<slug>)
 *   --prueba            imprime en vez de mandar
 *
 * Por qué va aparte de telegram.mjs: ese solo manda texto a los temas del grupo; aquí hacen falta imágenes y botones,
 * y todo va al chat privado, que es donde Juan David decide. Los botones llevan `n:<id>:<acción>` y los atiende la
 * función telegram-bot (bot.noticias). Sin --id la vista previa sale sin botones: un botón que nadie atiende confunde.
 *
 * Candidatas (JSON): [{ "id": 12, "titular": "…", "porque": "…", "cuenta": "juanda", "curso": "…", "fuente": "https://…" }]
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { RAIZ } from '../config.js';
import { api, configurado, partir } from './tg.mjs';

const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const prueba = process.argv.includes('--prueba');
const chat = process.env.TELEGRAM_CHAT_ID;
if (!prueba && !configurado()) { console.log('Telegram sin configurar (TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID): no se envió.'); process.exit(0); }

const decir = async (text, extra = {}) => {
  if (prueba) return void console.log(`${text}\n${extra.reply_markup ? JSON.stringify(extra.reply_markup) : ''}\n———`);
  const j = await api('sendMessage', { chat_id: chat, text, disable_web_page_preview: true, ...extra });
  if (!j.ok) throw new Error(j.description);
};

if (arg('--candidatas')) {
  const lista = JSON.parse(readFileSync(arg('--candidatas'), 'utf8'));
  if (!lista.length) { await decir('📰 Hoy no hay noticia que valga una pieza: ninguna se pudo confirmar en su fuente primaria.'); process.exit(0); }
  await decir(`📰 Noticias para pieza de hoy (${lista.length}). Toca «Hazlo» en la que quieras y te mando la vista previa. Nada se publica sin tu visto bueno.`);
  for (const c of lista.slice(0, 3)) {
    await decir(`${c.titular}\n\n${c.porque}\n\nCuenta: ${c.cuenta}${c.curso ? ` · Curso: ${c.curso}` : ''}\nFuente: ${c.fuente}`, {
      reply_markup: { inline_keyboard: [[{ text: '🎬 Hazlo', callback_data: `n:${c.id}:hazlo` }, { text: 'No', callback_data: `n:${c.id}:no` }]] },
    });
  }
  console.log(`Candidatas enviadas: ${Math.min(lista.length, 3)}.`);
  // En Windows, salir en el mismo tic en que termina fetch tumba Node con un «Assertion failed» (ya enviado todo).
  await new Promise((ok) => setTimeout(ok, 200));
  process.exit(0);
}

const slug = arg('--vista');
if (!slug) { console.error('uso: node src/radar/noticia.mjs --candidatas <archivo.json> | --vista <slug> [--id N] [--mes AAAA-MM] [--carpeta ruta]'); process.exit(1); }
const mes = arg('--mes') ?? new Date().toISOString().slice(0, 7);
const rutaPieza = path.join(RAIZ, 'piezas', mes, 'carruseles', `${slug}.json`);
const pieza = JSON.parse(readFileSync(rutaPieza, 'utf8'));
const carpeta = path.resolve(arg('--carpeta') ?? path.join(RAIZ, 'trabajo', 'noticia', slug));
const laminas = existsSync(carpeta) ? readdirSync(carpeta).filter((f) => f.endsWith('.png')).sort().map((f) => path.join(carpeta, f)) : [];
if (!laminas.length) { console.error(`No hay láminas PNG en ${carpeta}`); process.exit(1); }

const cuenta = pieza.cuentas[0];
const copy = pieza.variantes?.[cuenta]?.copy ?? '';
// Lo que no está confirmado va primero y completo: es lo que decide si la pieza puede salir.
const pendientes = (pieza.verificar ?? []).filter((v) => !/^confirmado$|fuera de la pieza/.test(v.estado));
const titulo = `📰 Vista previa · ${pieza.titulo}\nCuenta: ${cuenta} · ${laminas.length} láminas · ${pieza.noticia?.curso ? `Curso: ${pieza.noticia.curso}` : ''}`;

if (prueba) {
  console.log(`${titulo}\n${laminas.map((l) => `  ${path.basename(l)} (${Math.round(statSync(l).size / 1024)} KB)`).join('\n')}\n———`);
} else {
  // sendMediaGroup necesita multipart: cada foto viaja adjunta con su nombre (attach://). Telegram admite de 2 a 10.
  const datos = new FormData();
  datos.append('chat_id', chat);
  datos.append('media', JSON.stringify(laminas.slice(0, 10).map((_, i) => ({ type: 'photo', media: `attach://l${i}`, ...(i === 0 ? { caption: titulo.slice(0, 1000) } : {}) }))));
  laminas.slice(0, 10).forEach((l, i) => datos.append(`l${i}`, new Blob([readFileSync(l)], { type: 'image/png' }), path.basename(l)));
  const r = await (await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMediaGroup`, { method: 'POST', body: datos })).json();
  if (!r.ok) { console.error('Telegram rechazó las láminas:', r.description); process.exit(1); }
}

for (const t of partir(`COPY (${cuenta})\n\n${copy}`)) await decir(t);
const id = arg('--id');
const cierre = [
  pendientes.length ? `⚠️ Por confirmar antes de que salga (${pendientes.length}):\n${pendientes.map((v) => `• ${v.dato}`).join('\n')}` : '✅ Todos los datos están confirmados en la fuente.',
  pieza.noticia?.fuentePrimaria?.length ? `Fuente primaria:\n${pieza.noticia.fuentePrimaria.join('\n')}` : '',
  id ? '' : 'Es una prueba del flujo: no está en Metricool ni en el calendario.',
].filter(Boolean).join('\n\n');
const botones = id ? { reply_markup: { inline_keyboard: [[{ text: '✅ Aprobar (borrador en Metricool)', callback_data: `n:${id}:ok` }], [{ text: '✏️ Corregir', callback_data: `n:${id}:corregir` }, { text: '🗑️ Descartar', callback_data: `n:${id}:descartar` }]] } } : {};
const trozos = partir(cierre);
for (const [i, t] of trozos.entries()) await decir(t, i === trozos.length - 1 ? botones : {});
console.log(`Vista previa enviada: ${laminas.length} láminas, copy y ${pendientes.length} pendientes.`);
