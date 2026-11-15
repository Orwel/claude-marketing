#!/usr/bin/env node
/**
 * Baja un archivo que Juan David mandó al bot (foto de factura, PDF) a partir de su file_id de Telegram.
 * Lo usa la rutina «Asistente IA (Telegram)» en la nube para leer facturas y subirlas a Notion.
 *
 *   node src/radar/bajar-archivo.mjs <file_id> [nombre]     imprime la ruta local donde quedó
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { RAIZ } from '../config.js';
import { api } from './tg.mjs';

const [fileId, nombre = `archivo-${Date.now()}`] = process.argv.slice(2);
if (!fileId) { console.error('uso: node src/radar/bajar-archivo.mjs <file_id> [nombre]'); process.exit(1); }
const f = await api('getFile', { file_id: fileId });
if (!f.ok) { console.error(`Telegram: ${f.description} (más de 20 MB no se puede bajar con el bot)`); process.exit(1); }
const ext = path.extname(f.result.file_path) || '';
const bin = Buffer.from(await (await fetch(`https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${f.result.file_path}`)).arrayBuffer());
const carpeta = path.join(RAIZ, 'trabajo', 'bandeja');
mkdirSync(carpeta, { recursive: true });
const ruta = path.join(carpeta, nombre.replace(/[^\w.\-]/g, '_') + (path.extname(nombre) ? '' : ext));
writeFileSync(ruta, bin);
console.log(ruta);
