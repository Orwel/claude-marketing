import '../config.js';

/**
 * Cliente mínimo de la Graph API de Meta, solo lectura.
 * Usa fetch nativo: es gratis y no vale una dependencia (ni Metricool).
 * Un solo token de usuario (inicio de sesión con Facebook) alcanza para las
 * tres cuentas de Instagram, porque cada una cuelga de una página que él administra.
 */

const VERSION = process.env.IG_API_VERSION || 'v22.0';

function token() {
  const t = process.env.IG_ACCESS_TOKEN;
  if (!t) throw new Error('Falta IG_ACCESS_TOKEN en .env (ver docs/ANALITICA.md, paso 4)');
  return t;
}

export async function graph(ruta, parametros = {}) {
  const url = new URL(`https://graph.facebook.com/${VERSION}${ruta}`);
  for (const [k, v] of Object.entries(parametros)) if (v != null) url.searchParams.set(k, String(v));
  url.searchParams.set('access_token', token());
  for (let intento = 1; ; intento++) {
    const r = await fetch(url);
    const cuerpo = await r.json().catch(() => ({}));
    if (r.ok) return cuerpo;
    const e = cuerpo.error || {};
    // 4, 17 y 32 son límites de uso: esperar un poco sale más barato que fallar.
    if ([4, 17, 32].includes(e.code) && intento < 4) {
      await new Promise((ok) => setTimeout(ok, 15000 * intento));
      continue;
    }
    const err = new Error(`Graph ${ruta}: ${e.message || r.status}`);
    err.codigo = e.code;
    throw err;
  }
}

/** Recorre la paginación de Graph hasta que `seguir(item)` diga que no. */
export async function todas(ruta, parametros, seguir = () => true) {
  const items = [];
  let pagina = await graph(ruta, parametros);
  for (;;) {
    for (const it of pagina.data || []) {
      if (!seguir(it)) return items;
      items.push(it);
    }
    const siguiente = pagina.paging?.cursors?.after;
    if (!pagina.paging?.next || !siguiente) return items;
    pagina = await graph(ruta, { ...parametros, after: siguiente });
  }
}

/** Días que le quedan al token. Un token de usuario puede revisarse a sí mismo en debug_token. */
export async function vigenciaToken() {
  const { data } = await graph('/debug_token', { input_token: token() });
  if (!data?.is_valid) throw new Error('El token de Meta ya no es válido: genera otro (docs/ANALITICA.md, paso 4)');
  const dias = data.expires_at ? Math.floor((data.expires_at * 1000 - Date.now()) / 864e5) : Infinity;
  return { dias, permisos: data.scopes || [] };
}

/** Cuentas de Instagram profesionales ligadas a las páginas que administra el dueño del token. */
export async function cuentasInstagram() {
  const paginas = await todas('/me/accounts', { fields: 'name,instagram_business_account{id,username,followers_count,media_count}', limit: 50 });
  return paginas.filter((p) => p.instagram_business_account).map((p) => ({ pagina: p.name, ...p.instagram_business_account }));
}

/**
 * Pide varias métricas de una vez y, si Meta rechaza alguna (cambian cada
 * versión: impressions y plays ya no existen), las pide una por una y omite
 * las que fallen. Así un cambio de Meta no tumba todo el reporte.
 */
export async function metricas(id, lista, extra = {}) {
  const leer = (datos) => Object.fromEntries((datos.data || []).map((m) => [m.name, m.total_value?.value ?? m.values?.[0]?.value ?? null]));
  try {
    return leer(await graph(`/${id}/insights`, { metric: lista.join(','), ...extra }));
  } catch {
    const salida = {};
    for (const m of lista) {
      try { Object.assign(salida, leer(await graph(`/${id}/insights`, { metric: m, ...extra }))); } catch { /* métrica no disponible para esta pieza */ }
    }
    return salida;
  }
}
