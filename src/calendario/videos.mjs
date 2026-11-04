// Rehace el mes de noviembre del artefacto «Videos» desde la parrilla (calendario/2026-11.json) y los guiones de
// piezas/2026-11/guiones/. Octubre, diciembre, enero, los copys y el código de la página quedan como estaban.
// Cada video lleva su llamado a la acción según el objetivo de su cuenta y el ajuste que sacó el radar del 2-nov.
// Uso: node src/calendario/videos.mjs <artefacto-guardado.html> <salida.html>
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const [entrada, salida] = process.argv.slice(2);
const cal = JSON.parse(readFileSync('calendario/2026-11.json', 'utf8'));
const G = 'piezas/2026-11/guiones/';

// ---------- lectura de guiones en markdown ----------
const leer = (f) => (existsSync(G + f) ? readFileSync(G + f, 'utf8').replace(/\r/g, '') : '');
// Devuelve el texto desde el encabezado que coincide hasta el siguiente encabezado del mismo nivel o superior.
function seccion(md, re) {
  const ls = md.split('\n');
  const i = ls.findIndex((l) => /^#{1,4} /.test(l) && re.test(l));
  if (i < 0) return '';
  const nivel = ls[i].match(/^#+/)[0].length;
  let j = i + 1;
  while (j < ls.length && !(/^#{1,4} /.test(ls[j]) && ls[j].match(/^#+/)[0].length <= nivel)) j++;
  return ls.slice(i + 1, j).join('\n');
}
const sinMd = (s) => s.replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim();
const celdas = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

// Separa una celda en lo que se dice (entre comillas latinas) y la indicación que la rodea.
function partir(celda) {
  const t = sinMd(celda);
  const citas = [...t.matchAll(/«([^»]+)»/g)].map((m) => m[1]);
  if (!citas.length) return { dice: t, ind: '' };
  const ind = t.replace(/«[^»]+»/g, '').replace(/[:·,\s]+$/g, '').trim();
  return { dice: citas.join(' '), ind };
}

// Convierte la primera tabla de un texto en guion de teleprompter (lo dicho) y en pantalla (lo que se ve).
function tablaAGuion(texto, ganchos = {}) {
  const ls = texto.split('\n').filter((l) => /^\s*\|/.test(l));
  if (ls.length < 3) return null;
  const cab = celdas(ls[0]).map((c) => c.toLowerCase());
  const iQuien = cab.findIndex((c) => /qui[eé]n/.test(c));
  // La columna de lo dicho: frase o línea primero; «Voz (s)» es el tiempo, no el texto.
  let iDice = [/frase/, /l[ií]nea/, /voz \/ texto/, /^voz(?! \(s\))/].map((re) => cab.findIndex((c) => re.test(c))).find((k) => k >= 0) ?? -1;
  const iTitulo = cab.findIndex((c) => /t[ií]tulo/.test(c));
  const iTexto = cab.findIndex((c) => c === 'texto');
  const guion = [], pantalla = [];
  for (const l of ls.slice(2)) {
    const c = celdas(l);
    if (iTitulo >= 0) { // carrusel: una lámina por fila
      guion.push(`Lámina ${c[0]}: ${sinMd(c[iTitulo])}${iTexto >= 0 && c[iTexto] ? ' — ' + sinMd(c[iTexto]) : ''}`);
      continue;
    }
    if (iDice < 0) iDice = cab.length > 2 ? cab.length - 2 : 1;
    let { dice, ind } = partir(c[iDice] ?? '');
    // «Gancho A» remite a las opciones de gancho del mismo guion: se pone el texto.
    const mg = dice.match(/^Gancho \(?([A-C])\)?/);
    if (mg && ganchos[mg[1]]) { ind = [ind, dice].filter(Boolean).join(' · '); dice = ganchos[mg[1]]; }
    const quien = iQuien >= 0 ? sinMd(c[iQuien]).replace(/\[([^\]]+)\]/g, '($1)') : '';
    if (quien || ind) guion.push(`[${[quien, ind].filter(Boolean).join(' · ')}]`);
    if (dice && dice !== '(silencio)') guion.push(dice);
    const resto = c.filter((_, k) => k !== iDice && k !== iQuien && k > 0 && !/^\d+[–-]\d+ s$|^\d+,\d+$/.test(c[k]));
    if (resto.length) pantalla.push(resto.map(sinMd).filter(Boolean).join(' · '));
  }
  return { guion: guion.join('\n'), pantalla: pantalla.join('\n') };
}

// Las viñetas de «Hazlo mejor» (gancho, pantalla, tres verbos, cierre, puente).
function vinetasAGuion(texto) {
  const g = [], p = [];
  for (const l of texto.split('\n').filter((x) => /^- \*\*/.test(x))) {
    const m = l.match(/^- \*\*([^*]+)\*\*\s*(.*)$/);
    if (!m) continue;
    const clave = m[1].replace(/:$/, ''), valor = m[2];
    const { dice } = partir(valor);
    if (/Pantalla/i.test(clave)) { g.push(`[Pantalla: ${sinMd(valor)}]`); p.push(sinMd(valor)); }
    else if (/verbos/i.test(clave)) { g.push(sinMd(valor).replace(/\s*\(.*\)\s*$/, '')); p.push('Tarjeta: ' + sinMd(valor)); }
    else g.push(`[${clave}]`, dice);
  }
  return { guion: g.join('\n'), pantalla: p.join('\n') };
}

const verificarDe = (texto) =>
  (seccion(texto, /Verificar/i) || '').split('\n').filter((l) => /^- /.test(l)).map((l) => sinMd(l.slice(2))).slice(0, 6);
const verificarLinea = (texto) => {
  const m = texto.match(/\*\*Verificar:\*\*\s*([\s\S]*?)(\n\n|\n---|$)/);
  return m ? [sinMd(m[1])] : [];
};

// Dónde está el guion de cada pieza: archivo y sección.
const FUENTES = {
  N01: ['n01-pantalla-carga.md', null], N02: ['n02-nemesis.md', null], N03: ['n03-palworld.md', null],
  'jd-kafka': ['jd-kafka.md', /^## Guion/], 'jd-ia-artefactos': ['jd-ia-artefactos.md', /^## Guion/],
  N04: ['n04-n06.md', /^## N04/], N05: ['n04-n06.md', /^## N05/], N06: ['n04-n06.md', /^## N06/],
  'jd-clase-videojuego': ['noviembre-nuevos.md', /jd-clase-videojuego/], 'jd-homo-ludens': ['jd-homo-ludens.md', /^## Guion/],
  'jd-website': ['jd-website.md', /^## Guion/],
  'jd-legal-design-1': ['jd-legal-design.md', /jd-legal-design-1/], 'jd-legal-design-2': ['jd-legal-design.md', /jd-legal-design-2/],
  'jd-legal-design-3': ['jd-legal-design.md', /jd-legal-design-3/],
  HM1: ['hazlo-mejor.md', /HM1/], HM2: ['hazlo-mejor.md', /HM2/], HM3: ['hazlo-mejor.md', /HM3/],
  HM4: ['hazlo-mejor.md', /HM4/], HM5: ['hazlo-mejor.md', /HM5/],
  'jd-alertas': ['noviembre-nuevos.md', /jd-alertas/], 'jd-me-equivoque': ['noviembre-nuevos.md', /jd-me-equivoque/],
  'jd-mercader': ['noviembre-nuevos.md', /jd-mercader/], 'jd-contrappto-dentro': ['noviembre-nuevos.md', /jd-contrappto-dentro/],
  N09: ['tf-refresca.md', /^## Guion/], N10: ['tf-pov-auto.md', /^## Guion/], N11: ['tf-practicante.md', /^## Guion/],
  N12: ['tf-radicado.md', /^## Guion/], N13: ['tf-horas-procesos.md', /Láminas/], N16: ['tf-nemesis-costo.md', /^## Guion/],
  N18: ['tf-cotizar-puntos.md', /Láminas/],
  'tf-panaderia': ['tf-producto.md', /tf-panaderia/], 'tf-archipielago': ['tf-producto.md', /tf-archipielago/],
  'tf-ruta': ['tf-producto.md', /tf-ruta/], 'tf-civitapp': ['tf-producto.md', /tf-civitapp/], 'tf-academia': ['tf-producto.md', /tf-academia/],
  'tf-videojuegos': ['tf-videojuegos.md', /^## Guion/], 'tf-senales-app': ['tf-senales-app.md', /^## Guion/],
  'ACE-P1': ['academy-previas.md', /^## ACE-P1/], 'ACE-P2': ['academy-previas.md', /^## ACE-P2/], 'ACE-P3': ['academy-previas.md', /^## ACE-P3/],
  'ACL-P1': ['academy-previas.md', /^## ACL-P1/], 'ACL-P2': ['academy-previas.md', /^## ACL-P2/], 'ACL-P3': ['academy-previas.md', /^## ACL-P3/], 'tf-apps-ia': ['tf-apps-ia.md', /^## Guion/],
  ACF1: ['academy-huecos-nov.md', /^# ACF1 ·/], ACF2: ['academy-huecos-nov.md', /^# ACF2 ·/],
  'ACA-L': ['academy-huecos-nov.md', /^# ACA-L ·/], ACL0: ['academy-huecos-nov.md', /^# ACL0 ·/], 'tf-website': ['tf-website.md', /^## Guion/],
  'ctp-firma': ['ctp-firma.md', /^## Guion/], N33: ['ctp-sketches.md', /^## S3/], N34: ['ctp-sketches.md', /^## S4/],
  N36: ['ctp-sketches.md', /^## S5/], N28: ['ctp-sketches.md', /^## S6/],
  N19: ['ctp-noviembre.md', /^## N19 /, /^## N\d\d /],
  N20: ['ctp-noviembre.md', /^## N20 /, /^## N\d\d /],
  N21: ['ctp-noviembre.md', /^## N21 /, /^## N\d\d /],
  N22: ['ctp-noviembre.md', /^## N22 /, /^## N\d\d /],
  N23: ['ctp-noviembre.md', /^## N23 /, /^## N\d\d /],
  N24: ['ctp-noviembre.md', /^## N24 /, /^## N\d\d /],
  N26: ['ctp-noviembre.md', /^## N26 /, /^## N\d\d /],
  N29: ['ctp-noviembre.md', /^## N29 /, /^## N\d\d /],
  N31: ['ctp-noviembre.md', /^## N31 /, /^## N\d\d /],
  N32: ['ctp-noviembre.md', /^## N32 /, /^## N\d\d /],
  N38: ['ctp-noviembre.md', /^## N38 /, /^## N\d\d /],
  N14: ['academy-n14-n15.md', /^# N14 ·/], N15: ['academy-n14-n15.md', /^# N15 ·/],
  ACE1: ['academy-estudio.md', /^## ACE1 /], ACE2: ['academy-estudio.md', /ACE2/], ACE3: ['academy-estudio.md', /ACE3/],
  ACE4: ['academy-estudio.md', /ACE4/], ACL1: ['academy-lectura.md', /^## ACL1 /], ACL2: ['academy-lectura.md', /ACL2/],
  ACL3: ['academy-lectura.md', /ACL3/], ACL4: ['academy-lectura.md', /ACL4/],
  // La app pasó a enero (2-nov): en noviembre, Black Friday de cursos gratis.
  ACB0: ['academy-black-friday.md', /^## ACB0/], ACB1: ['academy-black-friday.md', /^# ACB1 ·/, /^#{1,2} ACB\d/],
  ACB2: ['academy-black-friday.md', /^## ACB2/], ACB3: ['academy-black-friday.md', /^# ACB3 ·/],
  'ACA-JD': ['academy-app.md', /ACA-JD/],
};

// Guiones de juanda con marcas de locución (2-nov-2026): reemplazan a los anteriores.
Object.assign(FUENTES, {
  'HM1': ['juanda-locucion.md', /^## HM1/],
  'HM2': ['juanda-locucion.md', /^## HM2/],
  'HM3': ['juanda-locucion.md', /^## HM3/],
  'HM4': ['juanda-locucion.md', /^## HM4/],
  'HM5': ['juanda-locucion.md', /^## HM5/],
  'jd-ia-artefactos': ['juanda-locucion.md', /^## jd-ia-artefactos/],
  'jd-ux-ui': ['juanda-locucion.md', /^## jd-ux-ui/],
  'jd-clase-videojuego': ['juanda-locucion.md', /^## jd-clase-videojuego/],
  'jd-bases-de-datos': ['juanda-locucion.md', /^## jd-bases-de-datos/],
  'jd-homo-ludens': ['juanda-locucion.md', /^## jd-homo-ludens/],
  'jd-contrappto-dentro': ['juanda-locucion.md', /^## jd-contrappto-dentro/],
});

function guionDe(p) {
  const f = FUENTES[p];
  if (!f) return null;
  const md = leer(f[0]);
  if (!md) return null;
  // Con un tercer elemento, la pieza va desde su encabezado hasta el de la siguiente pieza (sus «## Gancho» y
  // «## Guion» quedan adentro), como en ctp-noviembre.md.
  let sec;
  if (f[2]) {
    const ls = md.split('\n'), i = ls.findIndex((l) => f[1].test(l));
    let j = i + 1; while (j < ls.length && !f[2].test(ls[j])) j++;
    sec = i < 0 ? '' : ls.slice(i + 1, j).join('\n');
  } else sec = f[1] ? seccion(md, f[1]) : md;
  if (!sec) return null;
  // Opciones de gancho (A, B, C) para reemplazar «Gancho A» en la tabla: primero las de la pieza, si no las del archivo.
  const ganchos = {};
  for (const m of ((/«/.test(seccion(sec, /Gancho/)) ? seccion(sec, /Gancho/) : seccion(md, /^## Gancho/)) || '').matchAll(/\*\*([A-C])[^*]*\*\*\s*«([^»]+)»/g)) ganchos[m[1]] = m[2];
  // En las piezas con «## Guion» o «## Láminas» adentro, la tabla está ahí.
  const cuerpo = seccion(sec, /^#{2,3} (Guion|Láminas)/);
  if (cuerpo && /^\|/m.test(cuerpo)) { const r0 = tablaAGuion(cuerpo, ganchos); if (r0) return { guion: r0.guion, pantalla: r0.pantalla, ver: verificarDe(sec), fuente: G + f[0] }; }
  const r = /^- \*\*Gancho/m.test(sec) ? vinetasAGuion(sec) : tablaAGuion(sec, ganchos);
  // Sin tabla (stories, notas de serie): el texto va completo como indicaciones.
  const plano = sec.split('\n').map((l) => l.trim()).filter((l) => l && !/^\|/.test(l)).map((l) => `[${sinMd(l.replace(/^[-*] /, ''))}]`).join('\n');
  const ver = [...verificarDe(f[1] ? sec : md), ...verificarLinea(sec)];
  return { guion: r?.guion || plano, pantalla: r?.pantalla || '', ver, fuente: G + f[0] };
}

// ---------- el mes viejo del artefacto, para no perder lo que sigue sirviendo ----------
const html = readFileSync(entrada, 'utf8');
const ini = html.indexOf("{id:'nov'"), fin = html.indexOf("{id:'dic'");
const viejoNov = eval('(' + html.slice(ini, fin).trim().replace(/,$/, '') + ')');
const viejo = Object.fromEntries(viejoNov.videos.map((v) => [v.id, v]));

// ---------- reglas de marketing ----------
const CUENTA = { jd: 'juanda', tf: 'trifuerza', ctp: 'contrappto' };
const SERIES = { 'copia-u-homenaje': '¿Copia u homenaje?', 'derecho-que-nadie-te-explica': 'Derecho que nadie te explica',
  'lo-que-estoy-construyendo': 'Lo que estoy construyendo', 'hazlo-mejor': 'Hazlo mejor',
  'la-clausula-que-nadie-leyo': 'La cláusula que nadie leyó', 'casos-de-la-vida-real': 'Casos de la vida real' };
const OBJ = { seguidores: 'Seguidores', 'venta-academy': 'Venta Academy', 'venta-technology': 'Venta Technology', 'lista-espera': 'Uso de la app', 'uso-app': 'Uso de la app' };
const CARA = { habla: 'Hablas a cámara (tu voz real)', cameo: 'Cameo mudo 2–3 s (voz clonada)', no: 'Sin cara (voz clonada)' };
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const dia = (d) => { const f = new Date(d + 'T12:00:00'); return `${DIAS[f.getDay()]} ${f.getDate()}`; };
const RED = (e) => {
  const cuenta = { jd: 'juanda', tf: 'trifuerza.co', ctp: 'Contrappto' }[e.c];
  const r = e.r === 'li' ? `LinkedIn ${e.c === 'jd' ? '(trifuerza.co o perfil)' : cuenta}` : `${e.f === 'story' ? 'Stories' : 'IG'} ${cuenta}`;
  const tt = (e.x ?? []).includes('tt') ? ` + TikTok ${e.c === 'ctp' ? 'Contrappto' : 'trifuerza.co'}` : '';
  return r + tt;
};

function cta(e) {
  if (e.r === 'li') {
    if (e.o === 'venta-academy') return 'LinkedIn, tono profesional: «El curso es gratis; el enlace está en el primer comentario».';
    if (e.o === 'venta-technology') return 'LinkedIn: «¿Tu equipo pierde horas en esto? Escríbeme y lo vemos en un diagnóstico».';
    if (e.o === 'lista-espera' || e.o === 'uso-app') return 'LinkedIn: «Síguenos», «Escríbenos» o «Haz tu contrato en contrappto.com; el enlace está en el primer comentario».';
    return 'LinkedIn: «Si te sirve, sígueme: cada semana comparto una de estas». Invitar a comentar su caso.';
  }
  if (e.o === 'venta-academy') return 'Dicho y escrito: «Inscríbete gratis, link en la bio».';
  if (e.o === 'venta-technology') return 'Dicho y escrito: «Agenda un diagnóstico, link en la bio» (Legal: «escríbeme»).';
  if (e.o === 'lista-espera' || e.o === 'uso-app') return 'Dicho y escrito, uno de tres (variar entre piezas): «Síguenos para más casos como este» · «Escríbenos» · «Entra a contrappto.com y haz tu contrato gratis, link en la bio». Nunca «lista de espera» ni «llega en febrero».';
  return 'Dicho y escrito, con motivo de experto: «Si te interesa [el tema], sígueme». Nunca «sígueme para la parte 2». Más una pregunta que invite a comentar o a mandárselo a alguien.';
}

function ajuste(p, es) {
  const e = es[0], a = [];
  const formato = e.f, serie = e.s;
  if (serie === 'lo-que-estoy-construyendo') a.push('Es lo que más alcance trae (mediana 1.331 contra 366): lo que construiste en pantalla desde el primer cuadro y etiqueta a la institución o persona que aparezca (con permiso).');
  if (['copia-u-homenaje', 'derecho-que-nadie-te-explica'].includes(serie)) a.push('Gancho de historia con algo en juego en los primeros 3 s (los que lo hicieron retuvieron 38–40 %; la media es 24 %). Meta: más de 35 % a los 3 s.');
  if (serie === 'hazlo-mejor') a.push('El gancho va escrito en la primera línea del texto de LinkedIn. Si rinde, sale también en IG y en el TikTok de trifuerza.co, donde la opinión rinde 4–5 veces más.');
  if (e.o === 'venta-academy' && formato === 'reel') a.push('No como anuncio: arranca con un caso o una pregunta (las promos de curso del 30-oct retuvieron 5 % a los 3 s). La versión con cara de anuncio, solo en pauta.');
  if (formato === 'carrusel' && e.c !== 'ctp') a.push('Los carruseles de juanda llegaron a 19–220 de alcance: este rinde más en LinkedIn o como stories.');
  if (e.c === 'ctp') a.push('Caso de la vida real, no producto: los de «Agenda una demo» nadie los guardó. El mejor de Contrappto fue la lista clara de lo que hace (438).');
  if (p === 'jd-ia-artefactos' || p === 'jd-me-equivoque') a.push('Opinión de IA: en IG cansa si se repite; súbelo también al TikTok de trifuerza.co.');
  if (es.some((x) => (x.x ?? []).includes('tt'))) a.push('TikTok: el mismo MP4 con copy y hashtags propios de TikTok.');
  return a;
}

// ---------- armar los videos de noviembre ----------
const porPieza = new Map();
for (const e of [...cal.publicaciones].sort((a, b) => (a.d + a.h).localeCompare(b.d + b.h))) {
  if (!porPieza.has(e.p)) porPieza.set(e.p, []);
  porPieza.get(e.p).push(e);
}

// Puesta en escena de cada video en el estudio (sets y acción de los primeros 2 s).
const PUESTA = JSON.parse(readFileSync('piezas/2026-11/puesta-en-escena.json', 'utf8'));

const videos = [];
for (const [p, es] of porPieza) {
  const e = es[0], v0 = viejo[p] ?? (p === 'jd-legal-design-1' ? viejo.N07 : null);
  const g = guionDe(p);
  const cuentas = [...new Set(es.map((x) => CUENTA[x.c]))];
  const notas = [];
  if (/PROPUESTA/i.test(es.map((x) => x.n ?? '').join(' '))) notas.push('PROPUESTA: fecha y precio por aprobar (academy-plan.md).');
  if (g) notas.push('Guion completo: ' + g.fuente + '.');
  else if (v0) notas.push('Borrador de octubre: falta reescribirlo con el formato y el CTA nuevos.');
  else notas.push(e.e === 'listo' ? 'Ya producido.' : 'Falta el guion.');
  let guion = g?.guion || v0?.guion || `[${e.t}]`;
  // Cómo aparece Juan David: el calendario manda; si no lo dice, el encabezado del guion («cara: …»).
  let cara = e.cara;
  if (!cara && FUENTES[p]) {
    const ls = leer(FUENTES[p][0]).split('\n');
    const i = Math.max(0, ls.findIndex((l) => FUENTES[p][1]?.test(l)));
    cara = ([ls[0], ...ls.slice(i, i + 4)].join(' ').match(/cara:\s*(habla|cameo|no)/i) || [])[1];
  }
  if (!cara && /\[Tu cara/i.test(guion)) cara = 'habla';
  if (!cara && e.e === 'evento') cara = 'habla'; // se graba en la calle o en el evento
  if (!cara && (e.c === 'ctp' || e.f === 'carrusel')) cara = 'no';
  // Estado de arranque según lo que de verdad falta (Juan David, 2-nov): lo producido sin CTA queda «Editado».
  // Producidos a los que solo les falta algo de Juan David (sus tomas con cara y voz).
  const PRODUCIDOS = ['jd-legal-design-1', 'jd-legal-design-2', 'jd-kafka'];
  let estado0 = e.e === 'listo' ? 'Listo' : (cara === 'habla' || cara === 'cameo') ? 'Por grabar' : 'Por producir';
  if (PRODUCIDOS.includes(p)) estado0 = 'Editado';
  // El visto bueno lo da Juan David en el artefacto (estado «Aprobado»); solo eso se sube a Metricool.
  if (['jd-legal-design-1', 'jd-legal-design-2'].includes(p)) notas.push('Editado: faltan tus tomas con cara y voz real (inicio y final).');
  if (p === 'jd-kafka') notas.push('Editado: falta tu toma del cierre en ambiente kafkiano, con tu voz real. Instrucciones en jd-kafka.md, «Tu toma».');
  if (e.c === 'ctp' && /lista de espera|llega en febrero|Desc[aá]rg/i.test(guion)) notas.push('Cambiar el cierre por «Pruébalo gratis en contrappto.com»: ya está en la web; las tiendas, sin fecha.');

  videos.push({
    id: p, cuentas,
    linea: SERIES[e.s] || (e.o === 'venta-academy' ? 'Academy' : e.o === 'venta-technology' ? 'Technology' : 'Contrappto'),
    formato: [{ reel: 'Reel', video: 'Video', carrusel: 'Carrusel', story: 'Stories' }[e.f] || e.f, CARA[cara]].filter(Boolean).join(' · '),
    t: e.t, s: `${OBJ[e.o] || e.o}${e.prop ? ' · propuesta' : ''}`,
    graba: CARA[cara] || '', cara: cara || '', estado0, pub: es.map((x) => `${dia(x.d)} ${x.h}`).join(' · '),
    canales: es.map((x) => `${dia(x.d)} ${x.h} · ${RED(x)}`).join('\n'),
    fechas: es.map((x) => ({ d: x.d, h: x.h, red: RED(x) })),
    puesta: PUESTA.videos[p] || '',
    // Dónde se graba: clases del Rosario (11 y 18), la calle o el estudio.
    lugar: ({ 'jd-homo-ludens': 'clase-11', 'jd-legal-design-1': 'clase-11', 'jd-legal-design-3': 'clase-18', N29: 'calle' })[p] || 'estudio',
    guion, pantalla: g?.pantalla || v0?.pantalla || '',
    ver: (g?.ver?.length ? g.ver : v0?.ver) ?? [],
    // Instagram y LinkedIn piden llamados distintos: van los dos cuando la pieza sale en ambos.
    cta: [...new Set(es.map(cta))].join(' · '), ajuste: ajuste(p, es),
    nota: notas.join(' '),
    esqueleto: !g && !v0 && e.e !== 'listo',
  });
}

const est = cal.estrategia;
const nov = {
  id: 'nov', t: 'Noviembre', tema: cal.tema,
  p: est.eje + ' Fechas: ' + est.fechas.map((f) => `${dia(f.d)} ${f.t}`).join(' · ') + '.',
  videos,
};

// ---------- reemplazar el mes y ajustar la página ----------
let out = html.slice(0, ini) + JSON.stringify(nov, null, 0) + ',\n' + html.slice(fin);
// El esqueleto del documento lo pone el publicador.
out = out.replace(/^<!doctype html>[\s\S]*?<body>\n?/i, '').replace(/<\/body><\/html>\s*$/i, '');
// Canales por video cuando la parrilla los trae.
out = out.replace('function canales(v) {\n  const c = [];', 'function canales(v) {\n  if (v.canales) return v.canales;\n  const c = [];');
// CTA y ajustes del radar dentro de cada video.
out = out.replace(
  '          <div class="nota" data-nota hidden></div>',
  '          <div class="nota" data-nota hidden></div>\n          <div class="nota" data-cta hidden></div>\n          <div data-ajuste hidden></div>');
out = out.replace(
  "      if (v.nota) { const n = d.querySelector('[data-nota]'); n.hidden = false; n.textContent = v.nota; }",
  "      if (v.nota) { const n = d.querySelector('[data-nota]'); n.hidden = false; n.textContent = v.nota; }\n" +
  "      if (v.cta) { const n = d.querySelector('[data-cta]'); n.hidden = false; n.textContent = 'Llamado a la acción: ' + v.cta; }\n" +
  "      if (v.ajuste && v.ajuste.length) { const w = d.querySelector('[data-ajuste]'); w.hidden = false; w.innerHTML = '<p class=\"ayuda\" style=\"margin-bottom:4px\"><b>Ajustes por lo que funcionó y lo que no</b></p><ul class=\"checks\"></ul>'; for (const x of v.ajuste) { const li = document.createElement('li'); li.textContent = x; w.querySelector('ul').appendChild(li); } }");
out = out.replace('.meta dd{margin:0}', '.meta dd{margin:0;white-space:pre-line}');
// Foco en noviembre (pedido del 2-nov): lo del SOFA sale de la página y solo se muestra este mes.
// Diciembre y enero siguen en el código para retomarlos, pero no se pintan.
out = out.replace('const VIDEOS = MESES.flatMap(', "const VIDEOS = MESES.filter(m => m.id === 'nov').flatMap(");
out = out.replace('<button role="tab" id="t-copys" aria-selected="false">Copys SOFA</button>', '');
out = out.replace(/\n  <section id="s-copys"[\s\S]*?<\/section>\n/, '\n');
out = out.replace(/<div class="bloq">\s*<h2>SOFA: rodaje y captación<\/h2>[\s\S]*?<\/div>\n  <\/section>/, '</section>');
out = out.replace("const TABS = ['videos', 'eventos', 'voz', 'verificar', 'copys'];", "const TABS = ['videos', 'eventos', 'voz', 'verificar'];");
out = out.replace("  if (tab === 'copys') for (const ta of document.querySelectorAll('#listaCopys textarea')) ajustar(ta);\n", '');
out = out.replace('pintarCopys();\n', '');
// Estados que encajan con la producción real: «Por producir» para lo que no necesita cámara, y cada video arranca
// en el estado que le toca (estado0) hasta que se cambie a mano.
out = out.replace("const ESTADOS = ['Por grabar', 'Grabado', 'Editado', 'Listo', 'Publicado', 'Omitido'];", "const ESTADOS = ['Por producir', 'Por grabar', 'Grabado', 'Editado', 'Listo', 'Aprobado', 'Programado', 'Publicado', 'Omitido'];");
out = out.replace("function estadoDe(id) { return remoto[id]?.estado || 'Por grabar'; }", "function estadoDe(id) { return remoto[id]?.estado || base(id)?.estado0 || 'Por grabar'; }");
out = out.replace("const COLOR_ESTADO = {'Por grabar':'var(--neutral)',", "const COLOR_ESTADO = {'Por producir':'var(--todo)', 'Por grabar':'var(--warn)', 'Aprobado':'var(--ok)', 'Programado':'var(--contrappto)',");
const extra = readFileSync(new URL('./videos-extra.html', import.meta.url), 'utf8');
const [extraCss, resto] = [extra.slice(0, extra.indexOf('</style>') + 8), extra.slice(extra.indexOf('</style>') + 8)];
const extraSecciones = resto.slice(0, resto.indexOf('<script>')), extraScript = resto.slice(resto.indexOf('<script>'));
out = out.replace('<button role="tab" id="t-videos" aria-selected="true">Videos y guiones</button>', '<button role="tab" id="t-videos" aria-selected="true">Videos y guiones</button><button role="tab" id="t-calendario" aria-selected="false">Calendario</button><button role="tab" id="t-grabacion" aria-selected="false">Estudio de grabación</button>');
out = out.replace('</style>', extraCss.replace('<style>', '') );
out = out.replace('\n<div class="tp" id="tp"', extraSecciones.replace(/\n$/, '') + '\n<div class="tp" id="tp"');
out = out.replace("const TABS = ['videos', 'eventos', 'voz', 'verificar'];", "const TABS = ['videos', 'calendario', 'grabacion', 'eventos', 'voz', 'verificar'];");
out = out.replace("  try { localStorage.setItem('pestana', tab); } catch {}", "  if (tab === 'calendario' || tab === 'grabacion') { pintarCalendario(); pintarGrabacion(); }\n  try { localStorage.setItem('pestana', tab); } catch {}");
out = out.replace('function pintarCifras() {', "function pintarCifras() {\n  if (typeof pintarCalendario === 'function') { pintarCalendario(); pintarGrabacion(); }");
out = out.replace(/<\/script>\s*$/, '</script>\n' + extraScript);
out = out.replace("activos.filter(v => estadoDe(v.id) !== 'Por grabar').length", "activos.filter(v => !['Por grabar', 'Por producir'].includes(estadoDe(v.id))).length");
// La fecha de salida, visible sin abrir el video (la lista va ordenada por fecha).
out = out.replace('<span class="cuando"><small data-real></small>', '<span class="cuando"><b>${(v.pub || "").split(" · ")[0]}</b><small data-real></small>');
// Documento completo con el reset de claude.ai: sin la regla de [hidden] el teleprompter (.tp tiene display:grid)
// queda abierto encima de todo y no se puede cerrar (pasó el 3-nov-2026 al publicar desde archivo).
const ESQUELETO = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}html{scroll-padding-top:env(safe-area-inset-top,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#fff;color:#000}img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style></head><body>';
if (!/^<!doctype/i.test(out)) out = ESQUELETO + '\n' + out.replace(/^\s+/, '') + '\n</body></html>\n';
writeFileSync(salida, out);
console.log(`Noviembre: ${videos.length} videos (${videos.filter((v) => v.nota.startsWith('Guion completo') || v.nota.includes('Guion completo')).length} con guion nuevo). Escrito en ${salida}`);
