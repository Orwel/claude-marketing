#!/usr/bin/env node
/**
 * Licitaciones de tecnología abiertas en el SECOP I y II, a solicitud o como aviso automático.
 *
 *   npm run secop                                 tecnología e IA de los últimos 30 días (lista por defecto)
 *   npm run secop -- inteligencia artificial      solo lo que diga esas palabras
 *   npm run secop -- chatbot --dias 60 --min 50000000
 *   npm run secop -- ia --telegram                además lo manda al tema «Licitaciones SECOP»
 *   npm run secop -- --nuevos --telegram          solo lo que no se ha avisado antes (para la rutina diaria)
 *   --todas      incluye contratación directa y servicios profesionales de persona natural (por defecto se ocultan)
 *   --max 25     cuántos procesos mostrar
 *   --min 0      valor mínimo en pesos (sin palabras, por defecto 20 millones)
 *
 * No es scraping: Colombia Compra Eficiente publica el SECOP como datos abiertos en datos.gov.co (API Socrata, sin
 * clave). SECOP II = p6dx-8zbt (procesos), SECOP I = f789-7hwg. Los datos llegan con 1–2 días de retraso frente a
 * la plataforma; el enlace de cada proceso abre la ficha oficial, que es donde se confirman fechas y pliegos.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { RAIZ } from '../config.js';
import { configurado, enviar } from './tg.mjs';

const args = process.argv.slice(2);
const valor = (n, def) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : def; };
const banderas = new Set(['--telegram', '--todas', '--nuevos', '--json']);
const conValor = new Set(['--dias', '--min', '--max']);
const palabras = args.filter((a, i) => !banderas.has(a) && !conValor.has(a) && !conValor.has(args[i - 1]));
const dias = Number(valor('--dias', 30));
// Sin palabras, la lista por defecto trae cientos de procesos: debajo de 20 millones casi todo es apoyo puntual.
const minimo = Number(valor('--min', args.some((a, i) => !a.startsWith('--') && !conValor.has(args[i - 1])) ? 0 : 20e6));
const max = Number(valor('--max', 25));
const todas = args.includes('--todas');

// Lo que Trifuerza puede ofertar: software, IA, plataformas, datos y formación en IA. Sin tildes ni eñes: en el SECOP
// unas entidades escriben «INFORMACIÓN» y otras «INFORMACION», así que la letra dudosa va como comodín «_».
const POR_DEFECTO = [
  'INTELIGENCIA ARTIFICIAL', 'DESARROLLO DE SOFTWARE', 'SOFTWARE', 'APLICATIVO', 'APLICACI_N M_VIL', 'APLICACI_N WEB',
  'PLATAFORMA TECNOL_GICA', 'PLATAFORMA DIGITAL', 'SISTEMA DE INFORMACI_N', 'TRANSFORMACI_N DIGITAL', 'ANAL_TICA DE DATOS',
  'CHATBOT', 'ASISTENTE VIRTUAL', 'AUTOMATIZACI_N DE PROCESOS', 'PORTAL WEB', 'P_GINA WEB', 'GESTI_N DOCUMENTAL ELECTR_NICA',
  'MACHINE LEARNING', 'CIENCIA DE DATOS', 'GOBIERNO DIGITAL', 'INTEROPERABILIDAD',
];
// Atajos que en el SECOP darían basura: «IA» aparece dentro de cualquier palabra (MEDIA, GUÍA…).
const ATAJOS = { ia: 'INTELIGENCIA ARTIFICIAL', ai: 'INTELIGENCIA ARTIFICIAL', app: 'APLICACI_N M_VIL', web: 'P_GINA WEB', datos: 'ANAL_TICA DE DATOS', bot: 'CHATBOT' };
const aPatron = (t) => (ATAJOS[t.toLowerCase()] ?? t).toUpperCase().replace(/[ÁÉÍÓÚÜÑ]/g, '_').replace(/'/g, "''");
// Varias palabras sueltas se buscan juntas como frase (es lo que suele querer: «seguridad digital»).
const terminos = palabras.length ? [aPatron(palabras.join(' '))] : POR_DEFECTO;

// Los procesos de persona natural (servicios profesionales, apoyo a la gestión) son contratos ya amarrados a alguien.
// Obra civil: no es lo de Trifuerza.
const OBRA = ['OBRA', 'CONSTRUCCI_N', 'ACUEDUCTO', 'ALCANTARILLADO', 'SANEAMIENTO B_SICO', 'AGUA POTABLE', 'PAVIMENT', 'MALLA VIAL', 'V_AS TERCIARIAS', 'PLACA HUELLA', 'PUENTE', 'REDES EL_CTRICAS', 'ALUMBRADO', 'INTERVENTOR_A', 'ADECUACI_N F_SICA', 'MEJORAMIENTO DE VIVIENDA', 'ESCENARIO DEPORTIVO'];
const RUIDO = ['SERVICIOS PROFESIONALES', 'APOYO A LA GESTI_N', 'SERVICIOS DE APOYO', 'PRESTACI_N DE SERVICIOS PERSONALES'];

const desde = new Date(Date.now() - dias * 864e5).toISOString().slice(0, 10);
const like = (campo, t) => `upper(${campo}) like '%${t}%'`;
const cualquiera = (campos) => `(${terminos.flatMap((t) => campos.map((c) => like(c, t))).join(' OR ')})`;
const ninguno = (campo) => RUIDO.map((r) => `NOT ${like(campo, r)}`).join(' AND ');

async function socrata(dataset, params) {
  const url = new URL(`https://www.datos.gov.co/resource/${dataset}.json`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const r = await fetch(url, { headers: process.env.SOCRATA_APP_TOKEN ? { 'X-App-Token': process.env.SOCRATA_APP_TOKEN } : {} });
  if (!r.ok) throw new Error(`datos.gov.co respondió ${r.status} en ${dataset}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

async function secop2() {
  const filtros = [
    `fecha_de_publicacion_del >= '${desde}'`,
    `estado_de_apertura_del_proceso = 'Abierto'`,
    `estado_resumen NOT IN ('Adjudicado', 'No Definido')`,
    // Si ya pasó la fecha de recibir ofertas no sirve, aunque el SECOP lo siga mostrando «abierto».
    `(fecha_de_recepcion_de IS NULL OR fecha_de_recepcion_de >= '${new Date().toISOString().slice(0, 10)}')`,
    cualquiera(['nombre_del_procedimiento', 'descripci_n_del_procedimiento']),
  ];
  if (!todas) filtros.push(`modalidad_de_contratacion NOT IN ('Contratación directa', 'Contratación Directa (con ofertas)', 'Contratación régimen especial', 'Licitación pública Obra Publica')`, ninguno('nombre_del_procedimiento'), ...OBRA.map((o) => `NOT ${like('nombre_del_procedimiento', o)}`));
  if (minimo) filtros.push(`precio_base >= ${minimo}`);
  const filas = await socrata('p6dx-8zbt', {
    $select: 'id_del_proceso,entidad,ciudad_entidad,departamento_entidad,nombre_del_procedimiento,descripci_n_del_procedimiento,precio_base,modalidad_de_contratacion,fase,fecha_de_publicacion_del,fecha_de_recepcion_de,duracion,unidad_de_duracion,urlproceso',
    $where: filtros.join(' AND '),
    $order: 'fecha_de_publicacion_del DESC',
    $limit: 400,
  });
  return filas.map((f) => ({
    id: `II:${f.id_del_proceso}`,
    secop: 'II',
    entidad: f.entidad,
    lugar: [f.ciudad_entidad, f.departamento_entidad].filter((x) => x && x !== 'No Definido').join(', '),
    objeto: f.nombre_del_procedimiento || f.descripci_n_del_procedimiento,
    valor: Number(f.precio_base) || 0,
    modalidad: f.modalidad_de_contratacion,
    fase: f.fase,
    publicado: f.fecha_de_publicacion_del,
    cierre: f.fecha_de_recepcion_de,
    duracion: Number(f.duracion) > 0 && f.unidad_de_duracion ? `${f.duracion} ${f.unidad_de_duracion.toLowerCase()}` : '',
    url: f.urlproceso?.url,
  }));
}

async function secop1() {
  const filtros = [
    `fecha_de_cargue_en_el_secop >= '${desde}'`,
    `estado_del_proceso = 'Convocado'`,
    cualquiera(['detalle_del_objeto_a_contratar']),
  ];
  if (!todas) filtros.push(`NOT upper(modalidad_de_contratacion) like 'CONTRATACI_N DIRECTA%'`, `NOT upper(modalidad_de_contratacion) like '%R_GIMEN ESPECIAL%'`, `NOT upper(modalidad_de_contratacion) like 'CONTRATOS Y CONVENIOS%'`, ninguno('detalle_del_objeto_a_contratar'), ...OBRA.map((o) => `NOT ${like('detalle_del_objeto_a_contratar', o)}`));
  if (minimo) filtros.push(`cuantia_proceso >= ${minimo}`);
  const filas = await socrata('f789-7hwg', {
    $select: 'uid,numero_de_constancia,nombre_entidad,municipio_entidad,departamento_entidad,detalle_del_objeto_a_contratar,cuantia_proceso,modalidad_de_contratacion,fecha_de_cargue_en_el_secop,plazo_de_ejec_del_contrato,rango_de_ejec_del_contrato,ruta_proceso_en_secop_i',
    $where: filtros.join(' AND '),
    $order: 'fecha_de_cargue_en_el_secop DESC',
    $limit: 200,
  });
  // Un mismo proceso del SECOP I sale una vez por cada rubro: se agrupa por número de constancia.
  const unicos = new Map(filas.map((f) => [f.numero_de_constancia ?? f.uid, f]));
  return [...unicos.values()].map((f) => ({
    id: `I:${f.numero_de_constancia ?? f.uid}`,
    secop: 'I',
    entidad: f.nombre_entidad,
    lugar: [f.municipio_entidad, f.departamento_entidad].filter(Boolean).join(', '),
    objeto: f.detalle_del_objeto_a_contratar,
    valor: Number(f.cuantia_proceso) || 0,
    modalidad: f.modalidad_de_contratacion,
    fase: 'Convocado',
    publicado: f.fecha_de_cargue_en_el_secop,
    cierre: null,
    duracion: Number(f.plazo_de_ejec_del_contrato) > 0 && f.rango_de_ejec_del_contrato ? `${f.plazo_de_ejec_del_contrato} ${f.rango_de_ejec_del_contrato === 'M' ? 'meses' : 'días'}` : '',
    url: f.ruta_proceso_en_secop_i?.url,
  }));
}

// Un fallo en el SECOP I (que casi no se usa ya) no debe tumbar el resultado del II.
const [r2, r1] = await Promise.allSettled([secop2(), secop1()]);
const errores = [r2, r1].filter((r) => r.status === 'rejected').map((r) => r.reason.message);
if (r2.status === 'rejected' && r1.status === 'rejected') { console.error(errores.join('\n')); process.exit(1); }
let procesos = [...(r2.value ?? []), ...(r1.value ?? [])];

// El mismo objeto publicado varias veces por la misma entidad (lotes o reintentos) se muestra una sola vez.
const vistosAhora = new Set();
procesos = procesos.filter((p) => { const k = `${p.entidad}|${p.objeto?.slice(0, 80)}`; if (vistosAhora.has(k)) return false; vistosAhora.add(k); return true; });

// --nuevos: memoria de lo ya avisado, en el repo para que también funcione desde la rutina de la nube.
const rutaVistos = path.join(RAIZ, 'docs', 'licitaciones', 'vistos.json');
let vistos = {};
if (args.includes('--nuevos')) {
  vistos = existsSync(rutaVistos) ? JSON.parse(readFileSync(rutaVistos, 'utf8')) : {};
  procesos = procesos.filter((p) => !vistos[p.id]);
}

// Orden: primero lo que Trifuerza de verdad hace (IA, desarrollo, asistentes, datos); dentro de eso, lo de más plata.
// «Software» a secas trae compras de licencias y equipos, que no son para nosotros: bajan, pero no se esconden.
const NUCLEO = /INTELIGENCIA ARTIFICIAL|DESARROLLO DE SOFTWARE|DESARROLLO E IMPLEMENTACI|CHATBOT|ASISTENTE VIRTUAL|MACHINE LEARNING|CIENCIA DE DATOS|ANAL.TICA|APLICATIVO|APLICACI.N (M.VIL|WEB)|PLATAFORMA (DIGITAL|TECNOL.GICA)|TRANSFORMACI.N DIGITAL|AUTOMATIZACI.N/;
const COMPRA = /SUMINISTRO|ADQUISICI.N|LICENCIA|EQUIPOS|HARDWARE|MANTENIMIENTO PREVENTIVO|RENOVACI.N|SUSCRIPCI.N|RESONADOR|IMPRESORA/;
// Lo buscado en el título pesa más que en la descripción larga, donde aparece de pasada (p. ej. «IA» en una compra de equipos).
const EN_TITULO = new RegExp(terminos.map((t) => t.replace(/''/g, "'").replace(/_/g, '.')).join('|'));
const puntaje = (p) => { const t = (p.objeto ?? '').toUpperCase().replace(/[ÁÉÍÓÚÜÑ]/g, '.'); return (EN_TITULO.test(t) ? 3 : 0) + (NUCLEO.test(t) ? 2 : 0) - (COMPRA.test(t) ? 1 : 0); };
procesos.sort((a, b) => puntaje(b) - puntaje(a) || b.valor - a.valor);
const total = procesos.length;
procesos = procesos.slice(0, max);

const pesos = (n) => (n ? `$${Math.round(n).toLocaleString('es-CO')}` : 'sin valor publicado');
const fecha = (s) => (s ? new Date(s).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '');
const recorta = (s, n) => (s && s.length > n ? `${s.slice(0, n - 1).trim()}…` : s ?? '');
const capital = (s) => (s ?? '').toLowerCase().replace(/(^|[\s.(])([a-záéíóúñ])/g, (m, a, b) => a + b.toUpperCase());

if (args.includes('--json')) { console.log(JSON.stringify(procesos, null, 2)); process.exit(0); }

const busqueda = palabras.length ? `«${palabras.join(' ')}»` : 'tecnología e IA';
const encabezado = `Licitaciones abiertas · ${busqueda} · últimos ${dias} días${minimo ? ` · desde ${pesos(minimo)}` : ''}`;
const cuerpo = procesos.map((p) => [
  `• ${capital(p.entidad)}${p.lugar ? ` (${capital(p.lugar)})` : ''}`,
  `  ${recorta(p.objeto, 220)}`,
  `  ${pesos(p.valor)} · ${p.modalidad}${p.duracion ? ` · ${p.duracion}` : ''} · publicado ${fecha(p.publicado)}${p.cierre ? ` · ofertas hasta ${fecha(p.cierre)}` : ''} · SECOP ${p.secop}`,
  `  ${p.url ?? ''}`,
].join('\n'));
const pie = [
  total > procesos.length ? `Mostrando ${procesos.length} de ${total}. Afina con más palabras, --min o --max.` : '',
  todas ? '' : 'Oculta contratación directa y servicios de persona natural (--todas para verlos).',
  'Fechas y pliegos: confírmalos en la ficha del SECOP; los datos abiertos llegan con 1–2 días de retraso.',
  errores.length ? `Aviso: ${errores.join(' | ')}` : '',
].filter(Boolean).join('\n');
const texto = procesos.length
  ? `${encabezado}\n\n${cuerpo.join('\n\n')}\n\n${pie}`
  : `${encabezado}\n\nNo hay procesos ${args.includes('--nuevos') ? 'nuevos ' : ''}con esos filtros.${errores.length ? `\n${errores.join('\n')}` : ''}`;

console.log(texto);

if (args.includes('--telegram')) {
  // En la rutina diaria, si no hay nada nuevo no se manda nada: un «no hay» cada día es ruido.
  if (!procesos.length && args.includes('--nuevos')) process.exit(0);
  if (!configurado()) { console.log('\nTelegram sin configurar: no se envió.'); }
  else {
    const n = await enviar(texto, { tema: 'licitaciones' });
    console.log(`\nEnviado a Telegram (${n} mensaje${n > 1 ? 's' : ''}).`);
  }
}

if (args.includes('--nuevos') && procesos.length) {
  // Se guardan los avisados y se olvidan los de hace más de 90 días, para que el archivo no crezca sin fin.
  const hoy = new Date().toISOString().slice(0, 10);
  const limite = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
  for (const p of procesos) vistos[p.id] = hoy;
  for (const [k, d] of Object.entries(vistos)) if (d < limite) delete vistos[k];
  mkdirSync(path.dirname(rutaVistos), { recursive: true });
  writeFileSync(rutaVistos, JSON.stringify(vistos, null, 1));
}
