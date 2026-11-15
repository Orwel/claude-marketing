#!/usr/bin/env node
/**
 * Menú del bot. Botones dentro del mensaje (inline), no un teclado fijo: el teclado fijo tapaba media pantalla y no se
 * ocultaba (Juan David, 15-nov-2026). Cada botón dice en palabras qué hace, porque los comandos sueltos se olvidan.
 * Los botones los contesta el escucha del PC (src/radar/escucha.mjs); sin él, Telegram muestra el reloj y no pasa nada.
 *
 *   npm run telegram-menu              pone la lista de comandos, quita el teclado viejo y manda el menú
 *   npm run telegram-menu -- --ayuda   solo manda el menú
 */
import { fileURLToPath } from 'node:url';
import { api } from './tg.mjs';

export const COMANDOS = [
  { command: 'menu', description: 'Abrir el menú con botones' },
  { command: 'semana', description: 'Resumen de la semana: las cinco áreas' },
  { command: 'marketing', description: 'Cuentas, competencia y videos de la semana' },
  { command: 'estrategia', description: 'Metas: ¿voy bien o atrasado?' },
  { command: 'finanzas', description: 'Ingresos, gastos y caja del mes' },
  { command: 'entorno', description: 'Economía global y de Colombia, y qué me cambia' },
  { command: 'tendencias', description: 'Tendencias e ideas en IA, legaltech, edtech, videojuegos' },
  { command: 'secop', description: 'Licitaciones de tecnología (o /secop <palabras>)' },
  { command: 'oportunidades', description: 'Convocatorias y fondos (o /oportunidades <tema>)' },
  { command: 'mercados', description: 'Mercados hoy: TRM, dólar, bolsas, tasas' },
  { command: 'analiza', description: 'Ficha fundamental: /analiza EC' },
  { command: 'aprende', description: 'Lección de análisis fundamental: /aprende WACC' },
  { command: 'meta', description: 'Guardar meta: /meta Contrappto: 50 usuarios pagos a 31-mar' },
];

// Cada sección: texto que explica qué hay dentro y botones de una fila con nombre claro.
// callback_data: «m:<sección>» abre una sección; «c:<comando>» lo ejecuta (máx. 64 bytes, lo pone Telegram).
const SECCIONES = {
  inicio: {
    texto: `¿Qué necesitas?

🧭 Dirección: cómo va el negocio (resumen de la semana, marketing, metas, finanzas, economía, tendencias)
🏛️ Plata y Estado: licitaciones del SECOP, convocatorias y fondos
📈 MBA y mercados: mercados del día, analizar empresas, lecciones

También puedes escribirme normal: preguntas, links de Pinterest o Instagram, ideas, facturas.`,
    botones: [['🧭 Dirección', 'm:direccion'], ['🏛️ Plata y Estado', 'm:plata'], ['📈 MBA y mercados', 'm:mba']],
  },
  direccion: {
    texto: '🧭 Dirección: ¿qué quieres ver?',
    botones: [
      ['🗓️ Resumen de la semana (las 5 áreas)', 'c:/semana'],
      ['📣 Marketing: cómo van las cuentas', 'c:/marketing'],
      ['🎯 Metas: ¿voy bien o atrasado?', 'c:/estrategia'],
      ['💵 Finanzas del mes', 'c:/finanzas'],
      ['🌎 Economía y qué le cambia a Trifuerza', 'c:/entorno'],
      ['💡 Tendencias e ideas', 'c:/tendencias'],
    ],
  },
  plata: {
    texto: '🏛️ Plata y Estado. Para buscar algo puntual en el SECOP escribe, por ejemplo: /secop chatbot',
    botones: [
      ['🏛️ Licitaciones de tecnología e IA', 'c:/secop'],
      ['📘 Cómo participar en el SECOP (paso a paso)', 'c:/guiasecop'],
      ['💰 Convocatorias y fondos (última edición)', 'c:/oportunidades'],
      ['🎮 Convocatorias de videojuegos', 'c:/oportunidades videojuegos'],
      ['🔎 Buscar convocatorias de legaltech', 'c:/oportunidades legaltech'],
    ],
  },
  mba: {
    texto: '📈 MBA y mercados. Para otra empresa escribe /analiza y su ticker (AAPL, CIB, AVAL…).',
    botones: [
      ['📊 Mercados hoy', 'c:/mercados'],
      ['🛢️ Analizar Ecopetrol (EC)', 'c:/analiza EC'],
      ['🏦 Analizar Bancolombia (CIB)', 'c:/analiza CIB'],
      ['📚 Siguiente lección de la ruta', 'c:/aprende'],
    ],
  },
};

export function seccion(nombre = 'inicio') {
  const s = SECCIONES[nombre] ?? SECCIONES.inicio;
  const filas = nombre === 'inicio'
    ? [s.botones.map(([text, callback_data]) => ({ text, callback_data }))]
    : [...s.botones.map(([text, callback_data]) => [{ text, callback_data }]), [{ text: '⬅️ Volver al menú', callback_data: 'm:inicio' }]];
  return { text: s.texto, reply_markup: { inline_keyboard: filas } };
}

export async function mandarMenu(chatId = process.env.TELEGRAM_CHAT_ID) {
  return api('sendMessage', { chat_id: chatId, ...seccion('inicio') });
}

// Solo si se corre directo (el escucha importa este archivo sin disparar nada).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) { console.error('Faltan TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID en .env.'); process.exit(1); }
  if (!process.argv.includes('--ayuda')) {
    const j = await api('setMyCommands', { commands: COMANDOS, scope: { type: 'all_private_chats' } });
    if (!j.ok) { console.error('Telegram:', j.description); process.exit(1); }
    await api('setChatMenuButton', { menu_button: { type: 'commands' } });
    // Quita el teclado fijo de antes: Telegram solo lo retira con un mensaje que lleve remove_keyboard.
    await api('sendMessage', { chat_id: process.env.TELEGRAM_CHAT_ID, text: 'Quité los botones fijos de abajo. Ahora el menú va dentro del mensaje 👇', reply_markup: { remove_keyboard: true } });
    console.log('Lista de comandos puesta y teclado fijo retirado.');
  }
  const r = await mandarMenu();
  if (!r.ok) { console.error('Telegram:', r.description); process.exit(1); }
  console.log('Menú enviado.');
}
