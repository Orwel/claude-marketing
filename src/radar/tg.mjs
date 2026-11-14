/**
 * Envío a Telegram compartido por todos los avisos automáticos (radar, noticias, publicaciones, convocatorias, SECOP).
 *
 * Por qué existe: todo llegaba revuelto al chat privado del bot, el mismo donde Juan David le escribe a la bandeja.
 * Ahora cada tipo de aviso tiene su «tema» (topic) en un grupo de Telegram con temas activados:
 *   TELEGRAM_GRUPO_ID=-100…            el grupo (supergrupo con «Temas» encendido, el bot como administrador)
 *   TELEGRAM_TEMA_NOTICIAS=12          message_thread_id de cada tema (los crea `npm run telegram -- --crear-temas`)
 * Si el grupo o el tema no están configurados, el aviso cae en el chat privado de siempre (TELEGRAM_CHAT_ID)
 * con una etiqueta al inicio, para que igual se distinga. Así nada se pierde mientras se arma el grupo.
 */
import '../config.js';

// Orden y nombre visible de cada tema. La etiqueta se usa cuando no hay grupo, para separar a ojo en el chat.
export const TEMAS = {
  noticias: { nombre: 'Noticias del día', etiqueta: '📰 NOTICIAS' },
  radar: { nombre: 'Radar de redes', etiqueta: '📡 RADAR' },
  avisos: { nombre: 'Publicaciones', etiqueta: '📣 PUBLICACIONES' },
  convocatorias: { nombre: 'Convocatorias y concursos', etiqueta: '💰 CONVOCATORIAS' },
  licitaciones: { nombre: 'Licitaciones SECOP', etiqueta: '🏛️ SECOP' },
  mercados: { nombre: 'Mercados y MBA', etiqueta: '📈 MERCADOS' },
};

const env = process.env;
export const configurado = () => Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID);

export const api = async (metodo, params = {}) => {
  const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${metodo}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return r.json();
};

/** A dónde va un tema: el tema del grupo si existe; si no, el chat privado con etiqueta. */
export function destino(tema) {
  const hilo = tema && env[`TELEGRAM_TEMA_${tema.toUpperCase()}`];
  if (env.TELEGRAM_GRUPO_ID && hilo) return { chat_id: env.TELEGRAM_GRUPO_ID, message_thread_id: Number(hilo), etiqueta: '' };
  return { chat_id: env.TELEGRAM_CHAT_ID, etiqueta: tema && TEMAS[tema] ? TEMAS[tema].etiqueta : '' };
}

/**
 * Telegram corta cada mensaje en 4.096 caracteres. En vez de truncar, se parte por párrafos para que ningún bloque
 * quede cortado a la mitad, y se numera solo si son varios.
 */
export function partir(texto, max = 3900) {
  const trozos = [];
  let actual = '';
  for (const parrafo of texto.split(/\n{2,}/)) {
    const piezas = parrafo.length > max ? parrafo.match(new RegExp(`[\\s\\S]{1,${max}}(?=\\n|$)`, 'g')) ?? [parrafo.slice(0, max)] : [parrafo];
    for (const p of piezas) {
      if (actual && actual.length + p.length + 2 > max) { trozos.push(actual); actual = ''; }
      actual = actual ? `${actual}\n\n${p}` : p;
    }
  }
  if (actual) trozos.push(actual);
  return trozos.length > 1 ? trozos.map((t, i) => `${t}\n\n(${i + 1}/${trozos.length})`) : trozos;
}

/** Manda un texto plano al tema indicado. Devuelve cuántos mensajes salieron. Lanza error si Telegram lo rechaza. */
export async function enviar(texto, { tema } = {}) {
  const { etiqueta, ...a } = destino(tema);
  // Texto plano para no pelear con el Markdown de Telegram.
  const limpio = texto.replace(/\*\*/g, '').replace(/`/g, '');
  const mensajes = partir(etiqueta ? `${etiqueta}\n${limpio}` : limpio);
  for (const m of mensajes) {
    const j = await api('sendMessage', { ...a, text: m, disable_web_page_preview: true });
    // Si el tema se borró en Telegram, no se pierde el aviso: va al chat privado.
    if (!j.ok && a.message_thread_id && /thread|topic/i.test(j.description ?? '')) {
      const r = await api('sendMessage', { chat_id: env.TELEGRAM_CHAT_ID, text: `${TEMAS[tema]?.etiqueta ?? ''}\n${m}`, disable_web_page_preview: true });
      if (!r.ok) throw new Error(r.description);
      continue;
    }
    if (!j.ok) throw new Error(j.description);
  }
  return mensajes.length;
}
