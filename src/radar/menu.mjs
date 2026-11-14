#!/usr/bin/env node
/**
 * Menú del bot, en dos formas, para no tener que acordarse de los comandos:
 *  1. La lista de comandos de Telegram (aparece al tocar «/» o el botón «Menú» junto al campo de texto).
 *  2. Botones fijos debajo del teclado (teclado persistente): tocar uno manda el comando como si se escribiera.
 * Juan David prefirió pedir la información cuando la quiere, en vez de recibirla todos los días (14-nov-2026).
 * Los comandos los atiende la rutina «Bandeja» (docs/bandeja/RUTINA.md), así que la respuesta tarda hasta 30 minutos.
 *
 *   npm run telegram-menu              pone la lista de comandos y manda la ayuda con los botones
 *   npm run telegram-menu -- --ayuda   solo manda la ayuda con los botones (lo usa la bandeja ante «hola», «menú», /start)
 */
import { api } from './tg.mjs';

export const COMANDOS = [
  { command: 'semana', description: 'Comité de dirección: las cinco áreas en una página' },
  { command: 'marketing', description: 'Cómo van las cuentas, competencia y videos de la semana' },
  { command: 'estrategia', description: 'Metas del trimestre: bien, en riesgo o atrasadas' },
  { command: 'finanzas', description: 'Ingresos, gastos y caja del mes' },
  { command: 'entorno', description: 'Economía global y Colombia, y qué le cambia a Trifuerza' },
  { command: 'tendencias', description: 'Innovación en IA, legaltech, edtech y videojuegos' },
  { command: 'secop', description: 'Licitaciones de tecnología e IA abiertas (o /secop <palabras>)' },
  { command: 'oportunidades', description: 'Convocatorias, fondos y concursos (o /oportunidades videojuegos)' },
  { command: 'mercados', description: 'Foto del día: TRM, dólar, S&P 500, tasas, petróleo' },
  { command: 'analiza', description: 'Ficha fundamental de una empresa: /analiza EC' },
  { command: 'aprende', description: 'Lección de análisis fundamental: /aprende WACC' },
  { command: 'meta', description: 'Guardar una meta: /meta Contrappto: 50 usuarios pagos a 31-mar' },
  { command: 'ayuda', description: 'Qué sé hacer y los botones' },
];

// Botones fijos: el texto de cada uno es el comando que llega a la bandeja. Los que piden algo más (empresa, tema)
// traen un ejemplo; para otro, se escribe a mano («/analiza CIB», «/aprende DCF»).
const BOTONES = [
  ['/semana'],
  ['/marketing', '/estrategia', '/finanzas'],
  ['/entorno', '/tendencias', '/oportunidades'],
  ['/secop', '/mercados', '/aprende'],
  ['/ayuda'],
];

export const AYUDA = `Hola, Juan David. Esto es lo que puedes pedirme (toca un botón de abajo o escribe el comando):

DIRECCIÓN
/semana: las cinco áreas en una página, con las 3 decisiones de la semana
/marketing: cómo van las cuentas, qué funcionó, competencia y videos para esta semana
/estrategia: tus metas del trimestre, si vas bien o atrasado. Guárdalas con /meta Contrappto: 50 usuarios pagos a 31-mar y actualízalas con /avance Contrappto: 12
/finanzas: ingresos, gastos y caja del mes
/entorno: economía global y de Colombia, y qué le cambia a Technology, Legal y Academy
/tendencias: lo que se mueve en IA, legaltech, edtech, govtech y videojuegos, con ideas para aprovecharlo

INNOVACIÓN Y ESTADO
/secop: licitaciones de tecnología e IA abiertas en el SECOP. Con palabras: /secop chatbot, /secop gestión documental --dias 60

/oportunidades: convocatorias, fondos y concursos para Trifuerza o para ti (tecnología, IA, videojuegos, innovación; Colombia, Latam y mundo). Con tema: /oportunidades videojuegos

MBA Y MERCADOS
/mercados: foto del día (TRM, dólar, S&P 500, Nasdaq, bono a 10 años, Brent, ADR colombianos)

/analiza EC: ficha fundamental de una empresa que reporta a la SEC (estados, DuPont, deuda, caja) con 3 preguntas para que des tu lectura primero

/aprende WACC: lección corta de análisis fundamental con ejemplo real y ejercicio. Sin tema, te propongo la siguiente de la ruta

También sigo recibiendo lo de siempre: links de Pinterest o Instagram, competidores, ideas de video, facturas y preguntas.

Respondo en máximo 30 minutos. Si se te olvida algo, escribe «menú» o /ayuda.`;

if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) { console.error('Faltan TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID en .env.'); process.exit(1); }

if (!process.argv.includes('--ayuda')) {
  const j = await api('setMyCommands', { commands: COMANDOS, scope: { type: 'all_private_chats' } });
  if (!j.ok) { console.error('Telegram:', j.description); process.exit(1); }
  // El botón «Menú» junto al campo de texto abre la lista de comandos.
  await api('setChatMenuButton', { menu_button: { type: 'commands' } });
  console.log('Lista de comandos puesta.');
}

const r = await api('sendMessage', {
  chat_id: process.env.TELEGRAM_CHAT_ID,
  text: AYUDA,
  reply_markup: {
    keyboard: BOTONES.map((fila) => fila.map((text) => ({ text }))),
    is_persistent: true, // los botones quedan siempre visibles, no se esconden después de usarlos
    resize_keyboard: true,
    input_field_placeholder: 'Escribe o toca un botón',
  },
});
if (!r.ok) { console.error('Telegram:', r.description); process.exit(1); }
console.log('Ayuda con botones enviada.');
