#!/usr/bin/env node
/**
 * Manda a Telegram el resumen del radar de la semana (lo dispara la tarea programada de los lunes).
 *
 *   node src/radar/telegram.mjs docs/radar/2026-11-09.md
 *   node src/radar/telegram.mjs --texto "Salió N01 en Instagram"   (aviso suelto)
 *
 * Toma del reporte las conclusiones, la propuesta de videos y la pauta propuesta, para leerlo en el celular sin abrir el repo.
 * Necesita TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID en .env; sin ellos avisa y sale sin error (el bot
 * se conectó el 4-nov-2026; si falta, el radar igual queda escrito).
 */
import { readFileSync } from 'node:fs';
import '../config.js';

// --texto "…" manda un mensaje suelto (los avisos de publicación de la tarea «Avisos de publicación»).
// --archivo <ruta> manda el archivo completo tal cual (las noticias del día: textos largos y con comillas).
const iTexto = process.argv.indexOf('--texto');
const iArchivo = process.argv.indexOf('--archivo');
const textoSuelto = iTexto > 0 ? process.argv[iTexto + 1] : iArchivo > 0 ? readFileSync(process.argv[iArchivo + 1], 'utf8') : null;
const archivo = textoSuelto ? null : process.argv[2];
if (!archivo && !textoSuelto) { console.error('uso: node src/radar/telegram.mjs <reporte.md> | --texto "mensaje"'); process.exit(1); }
const prueba = process.argv.includes('--prueba'); // imprime el mensaje en vez de mandarlo
const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: chat } = process.env;

// --chat-id: con el token ya puesto y después de escribirle al bot, muestra el número de chat para el .env.
if (process.argv.includes('--chat-id')) {
  if (!token) { console.error('Primero pon TELEGRAM_BOT_TOKEN en .env.'); process.exit(1); }
  const j = await (await fetch(`https://api.telegram.org/bot${token}/getUpdates`)).json();
  if (!j.ok) { console.error('Telegram rechazó el token:', j.description); process.exit(1); }
  const chats = [...new Map(j.result.map((u) => (u.message ?? u.channel_post)?.chat).filter(Boolean).map((c) => [c.id, c])).values()];
  if (!chats.length) { console.log('No hay mensajes: abre el bot en Telegram, toca «Iniciar» y escríbele «hola». Luego vuelve a correr esto.'); process.exit(0); }
  for (const c of chats) console.log(`TELEGRAM_CHAT_ID=${c.id}   (${c.first_name ?? c.title ?? ''} ${c.username ? '@' + c.username : ''})`);
  process.exit(0);
}
if (!prueba && (!token || !chat)) { console.log('Telegram sin configurar (faltan TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID en .env): no se envió.'); process.exit(0); }

const md = textoSuelto ?? readFileSync(archivo, 'utf8');
// Las secciones que sirven en el celular: conclusiones y videos propuestos (los títulos cambian un poco entre semanas).
const seccion = (re) => { const m = md.match(new RegExp(`^##+ [^\\n]*${re}[^\\n]*\\n([\\s\\S]*?)(?=^##+ |$(?![\\s\\S]))`, 'mi')); return m ? m[1].trim() : ''; };
const partes = textoSuelto ? [] : [
  `Radar ${archivo.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? ''}`,
  seccion('onclusi'),
  seccion('ropuesta de videos'),
  seccion('auta propuesta'),
].filter(Boolean);
// Telegram corta en 4.096 caracteres; texto plano para no pelear con el Markdown de Telegram.
let texto = (textoSuelto ?? partes.join('\n\n')).replace(/\*\*/g, '').replace(/`/g, '');
if (texto.length > 4000) texto = texto.slice(0, 3990) + '\n…';
if (prueba) { console.log(texto); process.exit(0); }

const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ chat_id: chat, text: texto, disable_web_page_preview: true }),
});
const j = await r.json();
if (!j.ok) { console.error('Telegram rechazó el mensaje:', j.description); process.exit(1); }
console.log(`Enviado a Telegram (${texto.length} caracteres).`);
