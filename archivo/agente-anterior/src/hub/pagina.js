/**
 * La interfaz de revision, en una sola pagina sin build.
 *
 * Pensada para el movil primero: la revision ocurre a las 7 de la manana
 * con el telefono en la mano, no sentado en el escritorio. Si solo se
 * pudiera aprobar desde el portatil, la mitad de los dias no se aprobaria.
 */
export const pagina = () => `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hub de marketing</title>
<style>
  :root {
    --fondo: #0F1620; --panel: #18222F; --borde: #263242;
    --texto: #E9EEF4; --tenue: #8A9BAE; --acento: #E8B04B;
    --ok: #4ADE80; --mal: #F87171;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--fondo); color: var(--texto);
    font: 16px/1.5 -apple-system, system-ui, sans-serif;
    padding: 16px; max-width: 720px; margin-inline: auto;
  }
  header { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 4px; }
  h1 { font-size: 20px; margin: 0; }
  .aviso { background: #3A2E12; border: 1px solid #6B5420; color: #F2D389;
           padding: 10px 14px; border-radius: 10px; font-size: 14px; margin: 12px 0; }
  .resumen { display: flex; gap: 8px; margin: 14px 0 20px; flex-wrap: wrap; }
  .chip { background: var(--panel); border: 1px solid var(--borde); border-radius: 999px;
          padding: 6px 14px; font-size: 13px; color: var(--tenue); }
  .chip b { color: var(--texto); }
  .tarjeta { background: var(--panel); border: 1px solid var(--borde);
             border-radius: 14px; padding: 16px; margin-bottom: 16px; }
  .fila { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
  .tipo { color: var(--acento); font-size: 13px; font-weight: 600; letter-spacing: .02em; }
  .estado { font-size: 12px; color: var(--tenue); }
  .gancho { font-size: 19px; font-weight: 700; margin: 10px 0 6px; line-height: 1.25; }
  .razon { font-size: 13px; color: var(--tenue); font-style: italic; margin-bottom: 12px; }
  video { width: 100%; border-radius: 10px; background: #000; display: block; margin: 12px 0; }
  .pie { font-size: 14px; white-space: pre-wrap; color: #C7D3E0;
         background: #121A24; padding: 12px; border-radius: 8px; margin: 10px 0; }
  .tags { font-size: 13px; color: var(--acento); margin-bottom: 12px; }
  .acciones { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
  button { flex: 1; min-width: 120px; padding: 12px; border-radius: 10px; border: 1px solid var(--borde);
           background: var(--panel); color: var(--texto); font-size: 15px; font-weight: 600; cursor: pointer; }
  button.principal { background: var(--acento); color: #16202B; border-color: var(--acento); }
  button.peligro { color: var(--mal); }
  button:disabled { opacity: .45; cursor: default; }
  details { margin-top: 10px; }
  summary { cursor: pointer; font-size: 13px; color: var(--tenue); }
  .escena { font-size: 13px; padding: 8px 0; border-bottom: 1px solid var(--borde); }
  .escena span { color: var(--acento); font-variant-numeric: tabular-nums; }
  .metricas { display: flex; gap: 14px; flex-wrap: wrap; font-size: 13px; margin-top: 10px; }
  .metricas div b { color: var(--acento); font-size: 17px; display: block; }
  .problema { color: var(--mal); font-size: 13px; }
  .vacio { text-align: center; color: var(--tenue); padding: 40px 20px; }
  a { color: var(--acento); }
</style>
</head>
<body>
<header>
  <h1>Hub de marketing</h1>
  <button id="nuevo" style="flex:0; min-width:auto; padding:8px 14px; font-size:13px">+ Planificar</button>
</header>
<div id="raiz"><p class="vacio">Cargando…</p></div>

<script>
const $ = (s) => document.querySelector(s);
let cargando = false;

async function accion(nombre, id, boton) {
  if (cargando) return;
  cargando = true;
  const original = boton.textContent;
  boton.textContent = 'Trabajando…';
  boton.disabled = true;
  try {
    const r = await fetch('/api/' + nombre + '/' + (id ?? ''), { method: 'POST' });
    const datos = await r.json();
    if (datos.error) alert('Error: ' + datos.error);
  } catch (e) {
    alert('Error: ' + e.message);
  } finally {
    cargando = false;
    boton.textContent = original;
    boton.disabled = false;
    pintar();
  }
}

function tarjeta(p) {
  const revisable = p.estado === 'video_listo';
  const sinVideo = p.estado && p.estado.startsWith('borrador');

  return \`
  <div class="tarjeta">
    <div class="fila">
      <span class="tipo">\${p.nombreTipo ?? '—'}</span>
      <span class="estado">\${p.estado}\${p.duracion ? ' · ' + Number(p.duracion).toFixed(0) + 's' : ''}</span>
    </div>
    <div class="gancho">\${p.gancho ?? ''}</div>
    \${p.razonDelTipo ? '<div class="razon">' + p.razonDelTipo + '</div>' : ''}
    \${p.problemas.map((x) => '<div class="problema">⚠ ' + x + '</div>').join('')}
    \${p.tieneVideo ? '<video controls preload="metadata" src="/video/' + p.id + '"></video>' : ''}
    \${p.pieDeFoto ? '<div class="pie">' + p.pieDeFoto + '</div>' : ''}
    \${p.hashtags.length ? '<div class="tags">' + p.hashtags.map((h) => '#' + h.replace(/^#/, '')).join(' ') + '</div>' : ''}
    \${p.escenas.length ? \`<details><summary>Ver guion (\${p.escenas.length} escenas)</summary>
      \${p.escenas.map((e) => '<div class="escena"><span>' + e.segundoInicio + '–' + e.segundoFin + 's</span> ' + e.voz + '</div>').join('')}
    </details>\` : ''}
    \${p.metricas ? \`<div class="metricas">
      <div><b>\${p.metricas.views ?? 0}</b>vistas</div>
      <div><b>\${p.metricas.tasaGuardado ?? '—'}%</b>guardado</div>
      <div><b>\${p.metricas.tasaInteraccion ?? '—'}%</b>interacción</div>
    </div>\` : ''}
    \${p.enlaceInstagram ? '<p><a href="' + p.enlaceInstagram + '" target="_blank">Ver en Instagram →</a></p>' : ''}
    <div class="acciones">
      \${sinVideo ? '<button data-accion="producir" data-id="' + p.id + '">Producir video</button>' : ''}
      \${revisable ? '<button class="principal" data-accion="publicar" data-id="' + p.id + '">Aprobar y publicar</button>' : ''}
      \${(revisable || sinVideo) ? '<button class="peligro" data-accion="descartar" data-id="' + p.id + '">Descartar</button>' : ''}
    </div>
  </div>\`;
}

async function pintar() {
  const d = await (await fetch('/api/publicaciones')).json();
  const pendientes = d.publicaciones.filter((p) => p.estado !== 'descartada');

  $('#raiz').innerHTML =
    (d.simulando ? '<div class="aviso">SIMULAR=true — aprobar no publica de verdad todavía. Cámbialo en el .env cuando estés listo.</div>' : '') +
    '<div class="resumen">' +
      '<span class="chip">Por revisar <b>' + d.resumen.porRevisar + '</b></span>' +
      '<span class="chip">Sin video <b>' + d.resumen.sinVideo + '</b></span>' +
      '<span class="chip">Publicadas <b>' + d.resumen.publicadas + '</b></span>' +
      '<span class="chip">' + d.marca + '</span>' +
    '</div>' +
    (pendientes.length
      ? pendientes.map(tarjeta).join('')
      : '<p class="vacio">Nada todavía.<br>Dale a «Planificar» para generar el primer guion.</p>');

  document.querySelectorAll('[data-accion]').forEach((b) =>
    b.onclick = () => accion(b.dataset.accion, b.dataset.id, b)
  );
}

$('#nuevo').onclick = (e) => accion('planificar', '', e.target);
pintar();
setInterval(() => { if (!cargando) pintar(); }, 15000);
</script>
</body>
</html>`;
