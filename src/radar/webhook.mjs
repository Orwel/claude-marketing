#!/usr/bin/env node
/**
 * Conecta el bot de Telegram con la función siempre prendida de Supabase (supabase/functions/telegram-bot).
 *
 *   npm run bot-nube              registra el webhook: Telegram avisa cada mensaje a la función, al instante
 *   npm run bot-nube -- --estado  muestra a dónde está conectado y si hay errores
 *   npm run bot-nube -- --quitar  quita el webhook (vuelve el modo PC: npm run bot)
 *
 * El secreto del webhook (TELEGRAM_WEBHOOK_SECRET) se genera aquí una sola vez y se guarda en .env; Juan David lo
 * copia igual en Supabase → Edge Functions → Secrets. Así la función sabe que el aviso viene de Telegram y no de otro.
 */
import { randomBytes } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import path from 'node:path';
import { RAIZ } from '../config.js';
import { api } from './tg.mjs';

const URL_FUNCION = 'https://lhqwzajvwwikafidbmtc.supabase.co/functions/v1/telegram-bot';

if (process.argv.includes('--secreto')) {
  if (process.env.TELEGRAM_WEBHOOK_SECRET) { console.log('Ya existe TELEGRAM_WEBHOOK_SECRET en .env.'); process.exit(0); }
  appendFileSync(path.join(RAIZ, '.env'), `\n# Secreto del webhook del bot en Supabase (cópialo igual en los Secrets de la función)\nTELEGRAM_WEBHOOK_SECRET=${randomBytes(24).toString('hex')}\n`);
  console.log('Secreto creado en .env (TELEGRAM_WEBHOOK_SECRET).');
  process.exit(0);
}
if (process.argv.includes('--estado')) {
  const j = await api('getWebhookInfo');
  const r = j.result ?? {};
  console.log(`Conectado a: ${r.url || '(nada: modo PC)'}\nPendientes: ${r.pending_update_count}\nÚltimo error: ${r.last_error_message ? `${r.last_error_message} (${new Date(r.last_error_date * 1000).toLocaleString('es-CO')})` : 'ninguno'}`);
  process.exit(0);
}
if (process.argv.includes('--quitar')) {
  const j = await api('deleteWebhook', { drop_pending_updates: false });
  console.log(j.ok ? 'Webhook quitado: el bot vuelve a modo PC (npm run bot).' : `Telegram: ${j.description}`);
  process.exit(j.ok ? 0 : 1);
}
if (!process.env.TELEGRAM_WEBHOOK_SECRET) { console.error('Falta el secreto: corre primero npm run bot-nube -- --secreto'); process.exit(1); }
const j = await api('setWebhook', { url: URL_FUNCION, secret_token: process.env.TELEGRAM_WEBHOOK_SECRET, allowed_updates: ['message', 'callback_query'], drop_pending_updates: false });
console.log(j.ok ? `Webhook registrado: ${URL_FUNCION}` : `Telegram: ${j.description}`);
process.exit(j.ok ? 0 : 1);
