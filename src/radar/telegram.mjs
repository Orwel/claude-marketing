#!/usr/bin/env node
/**
 * Manda a Telegram los avisos automáticos, cada uno a su tema (ver src/radar/tg.mjs).
 *
 *   node src/radar/telegram.mjs docs/radar/2026-11-09.md                       resumen del radar (tema radar)
 *   node src/radar/telegram.mjs --tema avisos --texto "Salió N01 en Instagram"  aviso suelto
 *   node src/radar/telegram.mjs --tema noticias --archivo docs/noticias/….md    archivo completo tal cual
 *   node src/radar/telegram.mjs --texto "…"                                     sin tema: chat privado (respuestas de la bandeja)
 *   --prueba                 imprime en vez de mandar
 *   --chat-id                lista los chats y grupos que le han escrito al bot (para el .env)
 *   --crear-temas            crea en TELEGRAM_GRUPO_ID un tema por tipo de aviso y anota los ids en .env
 *
 * Necesita TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID en .env; sin ellos avisa y sale sin error (el bot
 * se conectó el 4-nov-2026; si falta, el radar igual queda escrito).
 */
import { appendFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { RAIZ } from '../config.js';
import { TEMAS, api, configurado, destino, enviar, partir } from './tg.mjs';

const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_GRUPO_ID: grupo } = process.env;

// --chat-id: muestra los chats privados y los grupos, para TELEGRAM_CHAT_ID y TELEGRAM_GRUPO_ID.
if (process.argv.includes('--chat-id')) {
  if (!token) { console.error('Primero pon TELEGRAM_BOT_TOKEN en .env.'); process.exit(1); }
  const j = await api('getUpdates', { timeout: 0, allowed_updates: ['message', 'my_chat_member'] });
  if (!j.ok) { console.error('Telegram rechazó el token:', j.description); process.exit(1); }
  const chats = [...new Map(j.result.map((u) => (u.message ?? u.my_chat_member ?? u.channel_post)?.chat).filter(Boolean).map((c) => [c.id, c])).values()];
  if (!chats.length) { console.log('No hay mensajes: escríbele «hola» al bot (o en el grupo, mencionándolo) y vuelve a correr esto enseguida.'); process.exit(0); }
  for (const c of chats) {
    const clave = c.type === 'private' ? 'TELEGRAM_CHAT_ID' : 'TELEGRAM_GRUPO_ID';
    console.log(`${clave}=${c.id}   (${c.type}: ${c.first_name ?? c.title ?? ''} ${c.username ? '@' + c.username : ''}${c.is_forum ? ', con temas' : ''})`);
  }
  process.exit(0);
}

// --crear-temas: un tema por tipo de aviso. Solo crea los que faltan y solo agrega líneas al .env (no reescribe nada).
if (process.argv.includes('--crear-temas')) {
  if (!token || !grupo) { console.error('Faltan TELEGRAM_BOT_TOKEN y TELEGRAM_GRUPO_ID en .env (sácalo con --chat-id).'); process.exit(1); }
  const nuevas = [];
  for (const [clave, t] of Object.entries(TEMAS)) {
    const variable = `TELEGRAM_TEMA_${clave.toUpperCase()}`;
    if (process.env[variable]) { console.log(`${variable} ya existe (${process.env[variable]}).`); continue; }
    const j = await api('createForumTopic', { chat_id: grupo, name: t.nombre });
    if (!j.ok) { console.error(`No se pudo crear «${t.nombre}»: ${j.description}. ¿El grupo tiene «Temas» encendido y el bot es administrador con permiso de gestionar temas?`); process.exit(1); }
    nuevas.push(`${variable}=${j.result.message_thread_id}`);
  }
  if (nuevas.length) {
    appendFileSync(path.join(RAIZ, '.env'), `\n# Temas del grupo de avisos (creados con --crear-temas)\n${nuevas.join('\n')}\n`);
    console.log(`Creados y anotados en .env:\n${nuevas.join('\n')}\nCópialos también en las variables del entorno de la nube (rutinas).`);
  }
  process.exit(0);
}

const tema = arg('--tema');
if (tema && !TEMAS[tema]) { console.error(`Tema desconocido «${tema}». Usa uno de: ${Object.keys(TEMAS).join(', ')}`); process.exit(1); }
const textoSuelto = arg('--texto') ?? (arg('--archivo') ? readFileSync(arg('--archivo'), 'utf8') : null);
const archivo = textoSuelto ? null : process.argv.slice(2).find((a) => !a.startsWith('--') && a !== tema);
if (!archivo && !textoSuelto) { console.error('uso: node src/radar/telegram.mjs <reporte.md> | [--tema <tema>] --texto "mensaje" | --archivo <ruta>'); process.exit(1); }
const prueba = process.argv.includes('--prueba');
if (!prueba && !configurado()) { console.log('Telegram sin configurar (faltan TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID en .env): no se envió.'); process.exit(0); }

let texto = textoSuelto;
if (!texto) {
  // Del reporte del radar sirven en el celular las conclusiones, los videos propuestos y la pauta (los títulos cambian un poco entre semanas).
  const md = readFileSync(archivo, 'utf8');
  const seccion = (re) => { const m = md.match(new RegExp(`^##+ [^\n]*${re}[^\n]*\n([\s\S]*?)(?=^##+ |$(?![\s\S]))`, 'mi')); return m ? m[1].trim() : ''; };
  texto = [`Radar ${archivo.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? ''}`, seccion('onclusi'), seccion('ropuesta de videos'), seccion('auta propuesta')].filter(Boolean).join('\n\n');
}
// Un reporte del radar va a su tema aunque no se diga.
const temaFinal = tema ?? (archivo ? 'radar' : undefined);

if (prueba) {
  const d = destino(temaFinal);
  console.log(`→ ${d.message_thread_id ? `grupo, tema ${temaFinal}` : 'chat privado'}\n`);
  console.log(partir(d.etiqueta ? `${d.etiqueta}\n${texto}` : texto).join('\n\n——— corte ———\n\n'));
  process.exit(0);
}
try {
  const n = await enviar(texto, { tema: temaFinal });
  console.log(`Enviado a Telegram${temaFinal ? ` (tema ${temaFinal})` : ''}: ${texto.length} caracteres en ${n} mensaje${n > 1 ? 's' : ''}.`);
} catch (e) {
  console.error('Telegram rechazó el mensaje:', e.message);
  process.exit(1);
}
