#!/usr/bin/env node
/**
 * Bandeja de entrada del bot de Telegram: lo que Juan David le manda al bot (links de Pinterest, competidores,
 * facturas, ideas, preguntas) lo recoge la rutina «Bandeja» de la nube cada hora y lo procesa.
 *
 *   node src/radar/bandeja.mjs --leer            mensajes nuevos en JSON y archivos bajados a trabajo/bandeja/
 *   node src/radar/bandeja.mjs --confirmar <id>  marca como leídos hasta ese update_id (Telegram no los repite)
 *
 * Sin base de datos: Telegram guarda los mensajes no confirmados 24 h, y confirmar con offset = id + 1 los borra.
 * Por eso la rutina confirma solo después de procesar, y si falla a mitad, los mensajes vuelven en la siguiente pasada.
 * Solo se aceptan mensajes del chat de Juan David (TELEGRAM_CHAT_ID): cualquier otro se descarta sin leerlo, porque
 * el bot es público y cualquiera podría escribirle.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import '../config.js';

const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: chat } = process.env;
if (!token || !chat) { console.error('Faltan TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID.'); process.exit(1); }
const api = (metodo, params = {}) =>
  fetch(`https://api.telegram.org/bot${token}/${metodo}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params) }).then((r) => r.json());

const iConf = process.argv.indexOf('--confirmar');
if (iConf > 0) {
  const id = Number(process.argv[iConf + 1]);
  if (!id) { console.error('uso: --confirmar <update_id>'); process.exit(1); }
  const j = await api('getUpdates', { offset: id + 1, timeout: 0, limit: 1 });
  console.log(j.ok ? `Confirmados hasta ${id}.` : `Telegram: ${j.description}`);
  process.exit(j.ok ? 0 : 1);
}

if (!process.argv.includes('--leer')) { console.error('uso: --leer | --confirmar <update_id>'); process.exit(1); }
const j = await api('getUpdates', { timeout: 0, allowed_updates: ['message'] });
if (!j.ok) { console.error('Telegram:', j.description); process.exit(1); }

const carpeta = join('trabajo', 'bandeja');
mkdirSync(carpeta, { recursive: true });
const salida = [];
let ultimo = 0;
for (const u of j.result) {
  ultimo = Math.max(ultimo, u.update_id);
  const m = u.message;
  if (!m || String(m.chat?.id) !== String(chat)) continue; // de otra persona: se ignora (y se confirma igual)
  const item = { update_id: u.update_id, fecha: new Date(m.date * 1000).toISOString(), texto: m.text ?? m.caption ?? '', reenviado: Boolean(m.forward_origin), archivos: [] };
  // Enlaces explícitos del mensaje (los de Pinterest o Instagram llegan así).
  for (const e of [...(m.entities ?? []), ...(m.caption_entities ?? [])]) {
    if (e.type === 'text_link') item.texto += `\n${e.url}`;
  }
  // Foto: Telegram manda varios tamaños; el último es el más grande.
  const adjuntos = [];
  if (m.photo?.length) adjuntos.push({ file_id: m.photo.at(-1).file_id, nombre: `foto-${u.update_id}.jpg` });
  if (m.document) adjuntos.push({ file_id: m.document.file_id, nombre: `${u.update_id}-${m.document.file_name ?? 'archivo'}` });
  if (m.voice) adjuntos.push({ file_id: m.voice.file_id, nombre: `nota-voz-${u.update_id}.ogg` });
  for (const a of adjuntos) {
    const f = await api('getFile', { file_id: a.file_id });
    if (!f.ok) { item.archivos.push({ nombre: a.nombre, error: f.description }); continue; } // >20 MB no se puede bajar con el bot
    const bin = Buffer.from(await (await fetch(`https://api.telegram.org/file/bot${token}/${f.result.file_path}`)).arrayBuffer());
    const ruta = join(carpeta, a.nombre.replace(/[^\w.\-áéíóúñÁÉÍÓÚÑ ]/g, '_'));
    writeFileSync(ruta, bin);
    item.archivos.push({ nombre: a.nombre, ruta, bytes: bin.length });
  }
  salida.push(item);
}
if (!salida.length) {
  // Igual se confirman los ajenos para no volver a bajarlos.
  if (ultimo) await api('getUpdates', { offset: ultimo + 1, timeout: 0, limit: 1 });
  console.log('SIN_MENSAJES');
  process.exit(0);
}
console.log(JSON.stringify({ ultimo_update_id: ultimo, mensajes: salida }, null, 2));
