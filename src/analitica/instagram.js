#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { RAIZ } from '../config.js';
import { graph, todas, vigenciaToken, cuentasInstagram, metricas } from './graph.js';

/**
 * Analítica gratis de Instagram con la API de Meta (reemplaza a Metricool).
 *
 *   npm run analitica -- cuentas      verifica token y lista las cuentas que ve
 *   npm run analitica                 baja datos de las cuentas y escribe el reporte
 *   npm run analitica -- --dias 60    ventana de publicaciones (por defecto 90)
 *
 * Deja analitica/AAAA-MM-DD/<usuario>.json (crudo) y reporte.md (para leer).
 * Solo lee: publicar sigue siendo a mano.
 */

const ZONA = 'America/Bogota';
// Meta entrega online_followers en hora del Pacífico (doc de la API). Se contrastó
// con Metricool el 29-sep-2026: pico a las 10:00 Bogotá. Si el pico sale corrido, revisar esto.
const ZONA_META = 'America/Los_Angeles';
const MADURA_H = 72; // antes de 72 h el alcance de un reel todavía crece: no se compara
const DIAS_SEMANA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

// Qué pide cada tipo. impressions, plays y video_views ya no existen: se usa views.
const METRICAS = {
  REELS: ['reach', 'views', 'likes', 'comments', 'shares', 'saved', 'total_interactions', 'ig_reels_avg_watch_time', 'ig_reels_video_view_total_time'],
  FEED: ['reach', 'views', 'likes', 'comments', 'shares', 'saved', 'total_interactions', 'follows', 'profile_visits'],
};

const args = process.argv.slice(2);
const dias = Number(args[args.indexOf('--dias') + 1]) || 90;

// --- utilidades de hora -----------------------------------------------------

function partes(fecha, zona) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: zona, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', weekday: 'short',
  }).formatToParts(fecha).map((x) => [x.type, x.value]));
  return { fecha: `${p.year}-${p.month}-${p.day}`, hora: Number(p.hour), dia: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday) };
}

/** Minutos de desfase de una zona respecto a UTC en un instante dado (maneja horario de verano). */
function desfase(zona, instante) {
  const nombre = new Intl.DateTimeFormat('en-US', { timeZone: zona, timeZoneName: 'shortOffset' }).formatToParts(instante).find((x) => x.type === 'timeZoneName').value;
  const m = nombre.match(/GMT([+-])(\d+)(?::(\d+))?/);
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] || 0)) : 0;
}

const mediana = (xs) => {
  const v = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};
const fmt = (n, d = 0) => (n == null ? '—' : Number(n).toLocaleString('es-CO', { maximumFractionDigits: d }));

// --- descarga -----------------------------------------------------------------

/**
 * Seguidores conectados por día y hora (últimos 30 días, lo máximo que da Meta).
 * Es la misma base que usa Metricool para su "mejor hora". Meta solo la entrega
 * con 100 seguidores o más; si no llega, el reporte usa las piezas propias.
 */
async function audienciaConectada(id) {
  const hasta = Math.floor(Date.now() / 1000) - 86400;
  let datos;
  try {
    datos = await graph(`/${id}/insights`, { metric: 'online_followers', period: 'lifetime', since: hasta - 29 * 86400, until: hasta });
  } catch (e) {
    return { error: e.message };
  }
  // matriz[díaSemana][hora] en hora Bogotá: suma y conteo para promediar.
  const suma = Array.from({ length: 7 }, () => Array(24).fill(0));
  const n = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const v of datos.data?.[0]?.values || []) {
    if (!v.value || !Object.keys(v.value).length) continue;
    // end_time marca el cierre del día medido: el día es el anterior, en hora del Pacífico.
    const diaMeta = partes(new Date(Date.parse(v.end_time) - 3600e3), ZONA_META).fecha;
    for (const [h, valor] of Object.entries(v.value)) {
      const aprox = new Date(`${diaMeta}T${String(h).padStart(2, '0')}:00:00Z`);
      const utc = new Date(aprox.getTime() - desfase(ZONA_META, aprox) * 60e3);
      const b = partes(utc, ZONA);
      suma[b.dia][b.hora] += valor;
      n[b.dia][b.hora] += 1;
    }
  }
  const matriz = suma.map((fila, d) => fila.map((s, h) => (n[d][h] ? Math.round(s / n[d][h]) : null)));
  return matriz.flat().some((x) => x != null) ? { matriz } : { error: 'Meta no devolvió datos (¿menos de 100 seguidores?)' };
}

async function publicaciones(id) {
  const desde = Date.now() - dias * 864e5;
  const lista = await todas(`/${id}/media`, {
    fields: 'id,caption,media_type,media_product_type,permalink,timestamp', limit: 50,
  }, (m) => Date.parse(m.timestamp) >= desde);
  const salida = [];
  for (const m of lista) {
    const tipo = m.media_product_type === 'REELS' ? 'REELS' : 'FEED';
    const met = await metricas(m.id, METRICAS[tipo]);
    const t = new Date(m.timestamp);
    const b = partes(t, ZONA);
    salida.push({
      id: m.id,
      url: m.permalink,
      formato: tipo === 'REELS' ? 'reel' : m.media_type === 'CAROUSEL_ALBUM' ? 'carrusel' : m.media_type === 'VIDEO' ? 'video' : 'imagen',
      fecha: b.fecha, hora: b.hora, dia: b.dia,
      horasPublicada: Math.round((Date.now() - t) / 3600e3),
      texto: (m.caption || '').split('\n')[0].slice(0, 90),
      ...met,
    });
  }
  return salida;
}

// --- análisis ---------------------------------------------------------------

/** Compartidos y guardados por cada mil alcanzados: la señal que más pesa para decidir pauta. */
const senal = (p) => (p.reach ? (((p.shares || 0) + (p.saved || 0)) / p.reach) * 1000 : null);

function analizar(cuenta) {
  const maduras = cuenta.publicaciones.filter((p) => p.horasPublicada >= MADURA_H && p.reach != null);
  const medAlcance = mediana(maduras.map((p) => p.reach));
  const medSenal = mediana(maduras.map(senal));
  const ranking = [...maduras].sort((a, b) => b.reach - a.reach).map((p) => ({
    ...p,
    senal: senal(p),
    pautar: maduras.length >= 5 && p.reach >= medAlcance && senal(p) >= medSenal && senal(p) > 0,
  }));

  let horas = [];
  if (cuenta.audiencia?.matriz) {
    const m = cuenta.audiencia.matriz;
    // Promedio lunes a viernes por hora: lo que se usa para fijar la hora fija del calendario.
    horas = Array.from({ length: 24 }, (_, h) => ({ hora: h, valor: Math.round(mediana([1, 2, 3, 4, 5].map((d) => m[d][h])) || 0) }))
      .sort((a, b) => b.valor - a.valor);
  }
  // Respaldo con piezas propias: alcance mediano por hora de publicación (solo horas con 2+ piezas).
  const porHora = {};
  for (const p of maduras) (porHora[p.hora] ||= []).push(p.reach);
  const horasPropias = Object.entries(porHora).filter(([, v]) => v.length >= 2)
    .map(([h, v]) => ({ hora: Number(h), alcance: mediana(v), n: v.length })).sort((a, b) => b.alcance - a.alcance);

  return { maduras: maduras.length, medAlcance, medSenal, ranking, horas, horasPropias };
}

function reporte(cuentas, fecha) {
  const l = [`# Analítica de Instagram · ${fecha}`, '', `Ventana: publicaciones de los últimos ${dias} días. Se comparan solo las que llevan ${MADURA_H} h o más. Horas en Bogotá.`, ''];
  for (const c of cuentas) {
    const a = analizar(c);
    l.push(`## @${c.username}`, '', `Seguidores: ${fmt(c.followers_count)} · piezas en la ventana: ${c.publicaciones.length} (${a.maduras} comparables)`, '');

    l.push('### Mejores horas');
    if (a.horas.length) {
      l.push('', 'Seguidores conectados, promedio lunes a viernes (últimos 30 días):', '');
      l.push(a.horas.slice(0, 5).map((x) => `- **${String(x.hora).padStart(2, '0')}:00** · ${fmt(x.valor)}`).join('\n'));
      const m = c.audiencia.matriz;
      const mejorDia = [1, 2, 3, 4, 5, 6, 0].map((d) => ({ d, v: m[d].reduce((s, x) => s + (x || 0), 0) })).sort((x, y) => y.v - x.v);
      l.push('', `Días más fuertes: ${mejorDia.slice(0, 3).map((x) => DIAS_SEMANA[x.d]).join(', ')} · más flojo: ${DIAS_SEMANA[mejorDia.at(-1).d]}`);
    } else {
      l.push('', `Sin datos de audiencia conectada: ${c.audiencia?.error || 'no disponible'}.`);
    }
    if (a.horasPropias.length) {
      l.push('', 'Alcance mediano según la hora en que se publicó (tus piezas):', '');
      l.push(a.horasPropias.map((x) => `- ${String(x.hora).padStart(2, '0')}:00 · ${fmt(x.alcance)} (${x.n} piezas)`).join('\n'));
    }

    l.push('', '### Ranking', '');
    if (!a.ranking.length) l.push('Sin piezas comparables todavía.');
    else {
      l.push('| Pieza | Formato | Fecha | Alcance | Vistas | Compart. | Guard. | Señal /1000 | Vista prom. | Pautar |', '|---|---|---|---|---|---|---|---|---|---|');
      for (const p of a.ranking) {
        const vista = p.ig_reels_avg_watch_time != null ? `${fmt(p.ig_reels_avg_watch_time / 1000, 1)} s` : '—';
        l.push(`| [${(p.texto || 'sin texto').replace(/\|/g, '/')}](${p.url}) | ${p.formato} | ${p.fecha} ${String(p.hora).padStart(2, '0')}h | ${fmt(p.reach)} | ${fmt(p.views)} | ${fmt(p.shares)} | ${fmt(p.saved)} | ${fmt(p.senal, 1)} | ${vista} | ${p.pautar ? '**sí**' : ''} |`);
      }
      l.push('', `Mediana de la cuenta: alcance ${fmt(a.medAlcance)} · señal ${fmt(a.medSenal, 1)}.`);
      l.push(a.maduras < 5
        ? 'Menos de 5 piezas comparables: no se marca pauta, todavía no hay con qué comparar.'
        : 'Regla de pauta: alcance y señal (compartidos + guardados por mil) iguales o mayores que la mediana de la cuenta.');
    }
    l.push('');
  }
  return l.join('\n');
}

// --- orden ------------------------------------------------------------------

async function main() {
  const { dias: vence, permisos } = await vigenciaToken();
  if (vence < 10) console.warn(`⚠ El token vence en ${vence} días: renuévalo (docs/ANALITICA.md, paso 5).`);
  const faltan = ['instagram_basic', 'instagram_manage_insights', 'pages_show_list', 'pages_read_engagement'].filter((p) => !permisos.includes(p));
  if (faltan.length) console.warn(`⚠ Al token le faltan permisos: ${faltan.join(', ')}`);

  const cuentas = await cuentasInstagram();
  if (!cuentas.length) throw new Error('El token no ve ninguna cuenta de Instagram profesional ligada a una página de Facebook.');

  if (args[0] === 'cuentas') {
    console.log(`Token válido (${vence === Infinity ? 'sin vencimiento' : `vence en ${vence} días`}). Cuentas:`);
    for (const c of cuentas) console.log(`  @${c.username} · ${fmt(c.followers_count)} seguidores · página «${c.pagina}»`);
    return;
  }

  const fecha = partes(new Date(), ZONA).fecha;
  const carpeta = path.join(RAIZ, 'analitica', fecha);
  mkdirSync(carpeta, { recursive: true });
  for (const c of cuentas) {
    console.log(`@${c.username}: bajando publicaciones y audiencia…`);
    c.publicaciones = await publicaciones(c.id);
    c.audiencia = await audienciaConectada(c.id);
    writeFileSync(path.join(carpeta, `${c.username}.json`), JSON.stringify(c, null, 2) + '\n');
  }
  const md = reporte(cuentas, fecha);
  writeFileSync(path.join(carpeta, 'reporte.md'), md);
  console.log(`\nListo: ${path.relative(RAIZ, path.join(carpeta, 'reporte.md'))}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
