#!/usr/bin/env node
/**
 * Mercados a solicitud (comando /mercados y /analiza del bot). Nada llega solo: Juan David lo pide cuando quiere,
 * para no saturarse. Es material de estudio del MBA (análisis fundamental), no recomendación de inversión.
 *
 *   npm run mercados                      foto del día: TRM, dólar, S&P 500, Nasdaq, Brent, bono a 10 años, ADR colombianos
 *   npm run mercados -- --empresa EC      ficha fundamental de una empresa que reporta a la SEC (EE. UU. o ADR como EC, CIB)
 *   --telegram                            además lo manda al tema «Mercados»
 *
 * Fuentes gratis y sin clave: TRM oficial de datos.gov.co (32sa-8pi3), precios de Yahoo Finance (API pública de
 * gráficos, sin garantía de servicio) y estados financieros de SEC EDGAR (companyfacts, XBRL de los 10-K y 20-F).
 * EDGAR exige un User-Agent con contacto: SEC_USER_AGENT en .env (p. ej. «Trifuerza radar correo@dominio»).
 */
import '../config.js';
import { configurado, enviar } from './tg.mjs';

const args = process.argv.slice(2);
const iEmp = args.indexOf('--empresa');
const ticker = iEmp >= 0 ? args[iEmp + 1]?.toUpperCase() : null;
const UA_SEC = process.env.SEC_USER_AGENT || 'radar-estudio contacto@example.com';

const num = (n, d = 2) => (n == null || Number.isNaN(n) ? 's. d.' : n.toLocaleString('es-CO', { maximumFractionDigits: d, minimumFractionDigits: d }));
const pct = (n) => (n == null || !Number.isFinite(n) ? 's. d.' : `${n >= 0 ? '+' : ''}${(n * 100).toFixed(1).replace('.', ',')} %`);

async function yahoo(simbolo, rango = '1mo') {
  const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(simbolo)}?range=${rango}&interval=1d`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const j = await r.json();
  const res = j.chart?.result?.[0];
  if (!res) throw new Error(`${simbolo}: ${j.chart?.error?.description ?? 'sin datos'}`);
  const cierres = (res.indicators.quote[0].close ?? []).filter((x) => x != null);
  const ultimo = res.meta.regularMarketPrice ?? cierres.at(-1);
  return { ultimo, moneda: res.meta.currency, dia: ultimo / cierres.at(-2) - 1, mes: ultimo / cierres[0] - 1 };
}

async function foto() {
  // TRM: la oficial de la Superfinanciera, la que usan contratos e impuestos (distinta del dólar «spot» del día).
  const trm = await fetch('https://www.datos.gov.co/resource/32sa-8pi3.json?$order=vigenciadesde%20DESC&$limit=22')
    .then((r) => r.json()).catch(() => []);
  const lineas = [`Mercados · ${new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Bogota' })}`, ''];
  if (trm.length) lineas.push(`TRM oficial: $${num(Number(trm[0].valor))} (hace un mes: $${num(Number(trm.at(-1).valor))}, ${pct(Number(trm[0].valor) / Number(trm.at(-1).valor) - 1)})`);
  const activos = [
    ['COP=X', 'Dólar spot (COP)'], ['^GSPC', 'S&P 500'], ['^IXIC', 'Nasdaq'], ['^TNX', 'Bono EE. UU. 10 años (%)'],
    ['BZ=F', 'Petróleo Brent (USD)'], ['EC', 'Ecopetrol ADR (USD)'], ['CIB', 'Bancolombia ADR (USD)'],
  ];
  const datos = await Promise.allSettled(activos.map(([s]) => yahoo(s)));
  lineas.push('', 'Último · día · mes');
  // Una tasa no se compara en porcentaje sino en puntos básicos (5,15 % → 5,20 % son +5 pb).
  const signo = (x) => `${x >= 0 ? '+' : ''}${x}`;
  const pb = (d) => `${signo(Math.round((d.ultimo - d.ultimo / (1 + d.dia)) * 100))} pb · ${signo(Math.round((d.ultimo - d.ultimo / (1 + d.mes)) * 100))} pb`;
  datos.forEach((d, i) => lineas.push(d.status !== 'fulfilled' ? `${activos[i][1]}: sin dato`
    : activos[i][0] === '^TNX' ? `${activos[i][1]}: ${num(d.value.ultimo)} · ${pb(d.value)}`
    : `${activos[i][1]}: ${num(d.value.ultimo)} · ${pct(d.value.dia)} · ${pct(d.value.mes)}`));
  lineas.push('', 'Para leerlo: el petróleo y el dólar suelen moverse en sentido contrario en Colombia (más petróleo, más dólares entrando). El bono a 10 años es la tasa «sin riesgo» que va en el CAPM y el WACC: si sube, valen menos los flujos futuros de cualquier empresa.');
  lineas.push('', 'Fuentes: datos.gov.co (TRM) y Yahoo Finance (precios con retraso).');
  return lineas.join('\n');
}

// --- Ficha fundamental desde EDGAR ---
const CONCEPTOS = {
  ingresos: ['us-gaap:Revenues', 'us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax', 'us-gaap:SalesRevenueNet', 'ifrs-full:Revenue'],
  operativa: ['us-gaap:OperatingIncomeLoss', 'ifrs-full:ProfitLossFromOperatingActivities'],
  utilidad: ['us-gaap:NetIncomeLoss', 'ifrs-full:ProfitLossAttributableToOwnersOfParent', 'ifrs-full:ProfitLoss'],
  activos: ['us-gaap:Assets', 'ifrs-full:Assets'],
  activoCorriente: ['us-gaap:AssetsCurrent', 'ifrs-full:CurrentAssets'],
  pasivoCorriente: ['us-gaap:LiabilitiesCurrent', 'ifrs-full:CurrentLiabilities'],
  pasivos: ['us-gaap:Liabilities', 'ifrs-full:Liabilities'],
  patrimonio: ['us-gaap:StockholdersEquity', 'ifrs-full:EquityAttributableToOwnersOfParent', 'ifrs-full:Equity'],
  flujoOperativo: ['us-gaap:NetCashProvidedByUsedInOperatingActivities', 'ifrs-full:CashFlowsFromUsedInOperatingActivities'],
  capex: ['us-gaap:PaymentsToAcquirePropertyPlantAndEquipment', 'ifrs-full:PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities'],
};
const FLUJO = new Set(['ingresos', 'operativa', 'utilidad', 'flujoOperativo', 'capex']);

async function ficha(tk) {
  const mapa = await fetch('https://www.sec.gov/files/company_tickers.json', { headers: { 'User-Agent': UA_SEC } }).then((r) => r.json());
  const emp = Object.values(mapa).find((e) => e.ticker === tk);
  if (!emp) return `No encontré «${tk}» en la SEC. Solo hay fichas de empresas que reportan allá (EE. UU. y ADR como EC, CIB, AVAL). Para una colombiana que no cotiza en Nueva York: Superfinanciera (emisores) o Supersociedades.`;
  const cik = String(emp.cik_str).padStart(10, '0');
  const j = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, { headers: { 'User-Agent': UA_SEC } }).then((r) => r.json());

  // Solo cifras anuales de 10-K o 20-F; de las de flujo, solo periodos de un año (no trimestres acumulados).
  let moneda = 'USD';
  // Las empresas cambian de concepto con los años (Apple pasó de «Revenues» a «RevenueFromContract…» en 2019):
  // se prueban todos y gana el que tenga el cierre más reciente, no el primero de la lista.
  const anual = (clave) => {
    let mejor = new Map(), monMejor = 'USD';
    for (const c of CONCEPTOS[clave]) {
      const [tax, nombre] = c.split(':');
      const unidades = j.facts?.[tax]?.[nombre]?.units;
      if (!unidades) continue;
      const [mon, filas] = Object.entries(unidades).find(([u]) => /^[A-Z]{3}$/.test(u)) ?? [];
      if (!filas) continue;
      const porAnio = new Map();
      for (const f of filas) {
        if (!/^(10-K|20-F|40-F)/.test(f.form)) continue;
        if (FLUJO.has(clave) && (!f.start || (new Date(f.end) - new Date(f.start)) / 864e5 < 330)) continue;
        const prev = porAnio.get(f.end);
        if (!prev || f.filed > prev.filed) porAnio.set(f.end, f); // la cifra más reciente (corrige reexpresiones)
      }
      const ultimo = (m) => [...m.keys()].sort().at(-1) ?? '';
      if (porAnio.size && ultimo(porAnio) > ultimo(mejor)) { mejor = new Map([...porAnio].map(([k, f]) => [k, f.val])); monMejor = mon; }
    }
    if (mejor.size) moneda = monMejor;
    return mejor;
  };
  const serie = Object.fromEntries(Object.keys(CONCEPTOS).map((k) => [k, anual(k)]));
  const cierres = [...serie.ingresos.keys(), ...serie.activos.keys()].sort();
  const anios = [...new Set(cierres)].filter((e) => serie.activos.has(e) && serie.ingresos.has(e)).slice(-2);
  if (!anios.length) return `La SEC no trae estados anuales estructurados de ${emp.title}.`;
  const [ant, act] = anios.length === 2 ? anios : [null, anios[0]];
  const v = (k, e = act) => serie[k].get(e);
  const escala = Math.abs(v('activos')) > 5e12 ? [1e12, 'billones'] : Math.abs(v('activos')) > 5e9 ? [1e9, 'miles de millones'] : [1e6, 'millones'];
  const m = (x) => (x == null ? 's. d.' : num(x / escala[0], 1));

  const fcf = v('flujoOperativo') != null && v('capex') != null ? v('flujoOperativo') - Math.abs(v('capex')) : null;
  const r = {
    margenOp: v('operativa') / v('ingresos'),
    margenNeto: v('utilidad') / v('ingresos'),
    roe: v('utilidad') / v('patrimonio'),
    roa: v('utilidad') / v('activos'),
    rotacion: v('ingresos') / v('activos'),
    apalancamiento: v('activos') / v('patrimonio'),
    deudaPatrimonio: v('pasivos') / v('patrimonio'),
    liquidez: v('activoCorriente') / v('pasivoCorriente'),
    crecimiento: ant ? v('ingresos') / v('ingresos', ant) - 1 : null,
    roeAnt: ant ? v('utilidad', ant) / v('patrimonio', ant) : null,
  };
  const veces = (x) => (Number.isFinite(x) ? `${num(x)}×` : 's. d.');
  const anio = (e) => e?.slice(0, 4);

  const l = [
    `Ficha fundamental · ${emp.title} (${tk})`,
    `Cierre fiscal ${anio(act)}${ant ? ` vs. ${anio(ant)}` : ''} · cifras en ${escala[1]} de ${moneda} · fuente: SEC EDGAR (10-K/20-F)`,
    '',
    'ESTADOS',
    `Ingresos: ${m(v('ingresos'))}${ant ? ` (antes ${m(v('ingresos', ant))}, ${pct(r.crecimiento)})` : ''}`,
    `Utilidad operativa: ${m(v('operativa'))} · Utilidad neta: ${m(v('utilidad'))}`,
    `Activos: ${m(v('activos'))} · Pasivos: ${m(v('pasivos'))} · Patrimonio de los accionistas: ${m(v('patrimonio'))}${v('activos') - v('pasivos') - v('patrimonio') > 0.02 * v('activos') ? ` (la diferencia, ${m(v('activos') - v('pasivos') - v('patrimonio'))}, es de minoritarios)` : ''}`,
    `Flujo operativo: ${m(v('flujoOperativo'))} · Capex: ${m(v('capex'))} · Flujo de caja libre: ${m(fcf)}`,
    '',
    'RAZONES',
    `Rentabilidad: margen operativo ${pct(r.margenOp)} · margen neto ${pct(r.margenNeto)} · ROA ${pct(r.roa)} · ROE ${pct(r.roe)}${r.roeAnt != null ? ` (antes ${pct(r.roeAnt)})` : ''}`,
    `DuPont: ROE = margen neto ${pct(r.margenNeto)} × rotación ${veces(r.rotacion)} × apalancamiento ${veces(r.apalancamiento)}`,
    `Endeudamiento: pasivo/patrimonio ${veces(r.deudaPatrimonio)} · Liquidez corriente ${veces(r.liquidez)}`,
    '',
    'TU LECTURA PRIMERO (respóndelas antes de mirar la del tutor)',
    '1. Por el DuPont, ¿qué palanca explica el ROE: margen, rotación o deuda? ¿Es sostenible?',
    `2. ${fcf != null && fcf < v('utilidad') ? 'El flujo de caja libre es menor que la utilidad: ¿en qué se va la caja?' : '¿La utilidad se convierte en caja? Compara la utilidad neta con el flujo operativo.'}`,
    `3. Para pasar a valoración: ¿qué crecimiento y qué WACC tendrías que suponer para justificar el precio de hoy?${moneda !== 'USD' ? ` (Ojo: reporta en ${moneda} y el ADR cotiza en USD; convierte y mira cuántas acciones representa cada ADR antes de calcular múltiplos).` : ''}`,
    '',
    'Para seguir en Excel con fórmulas vivas, en el chat de Claude: «analicemos ' + tk + '» (skill analisis-financiero). Material de estudio, no recomendación.',
  ];
  return l.join('\n');
}

let texto;
try {
  texto = ticker ? await ficha(ticker) : await foto();
} catch (e) {
  console.error('No pude armar el reporte:', e.message);
  process.exit(1);
}
console.log(texto);
if (args.includes('--telegram')) {
  if (!configurado()) console.log('\nTelegram sin configurar: no se envió.');
  else console.log(`\nEnviado a Telegram (${await enviar(texto, { tema: 'mercados' })} mensaje).`);
}
