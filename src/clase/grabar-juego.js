/**
 * Graba un gameplay del Archipiélago jurídico con un documento de EJEMPLO (nunca uno real):
 *   node src/clase/grabar-juego.js <public-de-tri-app2> <salida.mp4> [--ruta=/juegos/legal/archipielago/] [--segundos=100] [--ejemplo=0]
 *
 * El juego (three.js) corre con requestAnimationFrame en tiempo real; un navegador sin ventana con
 * WebGL por software no alcanza 30 fps. Por eso se reemplaza el reloj de la página: cada cuadro se
 * avanza 1/30 s a mano, se pinta y se captura. El video sale fluido aunque la captura tarde.
 *
 * El barco va en piloto automático (window.__a expone barco, teclas, islas y toggle): navega a cada
 * isla, la abre unos segundos para que se lea la tarjeta y sigue a la siguiente; el faro va al final.
 */
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { RAIZ } from '../config.js';

const args = process.argv.slice(2);
const [carpeta, salida] = args.filter((a) => !a.startsWith('--'));
const opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const SEG = Number(opt.segundos ?? 100);
const FPS = 30;
const W = 1600;
const H = 900;
const tmp = path.join(path.dirname(salida), 'cuadros-juego');
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

// Servidor estático mínimo: el juego pide paquetes.json con fetch, que no funciona con file://.
const TIPOS = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.js': 'text/javascript' };
const servidor = createServer((req, res) => {
  // Se sirve todo el public de tri-app2: el juego carga ../joystick.js y /juegos/analitica.js.
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u.endsWith('/')) u += 'index.html';
  const ruta = path.join(carpeta, u);
  if (!existsSync(ruta)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(ruta)] ?? 'application/octet-stream' });
  res.end(readFileSync(ruta));
}).listen(5279);

const chrome = path.join(RAIZ, 'node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe');
const perfil = path.join(tmp, '..', 'perfil-juego');
const nav = spawn(chrome, ['--remote-debugging-port=9433', `--window-size=${W},${H}`, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
  '--hide-scrollbars', '--mute-audio', `--user-data-dir=${perfil}`, 'about:blank'], { stdio: 'ignore' });

// Si algo falla, el navegador no queda vivo ocupando el puerto.
process.on('exit', () => nav.kill());
process.on('uncaughtException', (e) => { console.error(e); process.exit(1); });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
for (let i = 0; i < 50 && !ws; i++) {
  await espera(300);
  try {
    const lista = await (await fetch('http://127.0.0.1:9433/json')).json();
    const pag = lista.find((p) => p.type === 'page');
    if (pag) ws = new WebSocket(pag.webSocketDebuggerUrl);
  } catch {}
}
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pend = new Map();
ws.addEventListener('message', (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); }
});
const cdp = (method, params = {}) => new Promise((r) => { const k = ++id; pend.set(k, r); ws.send(JSON.stringify({ id: k, method, params })); });
const evalua = async (expr) => {
  const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400));
  return r.result?.result?.value;
};

await cdp('Page.enable');
await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await cdp('Emulation.setFocusEmulationEnabled', { enabled: true });
// Reloj virtual: requestAnimationFrame, performance.now y Date.now avanzan solo cuando se pide un cuadro.
await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `
  (() => {
    let vt = 1000; const cola = [];
    const p0 = performance.now.bind(performance);
    window.__real = p0;
    window.requestAnimationFrame = (f) => { cola.push(f); return cola.length; };
    performance.now = () => vt;
    const d0 = Date.now(); Date.now = () => d0 + vt;
    window.__paso = (ms) => { vt += ms; const fs = cola.splice(0); for (const f of fs) f(vt); };
  })();` });
await cdp('Page.navigate', { url: `http://127.0.0.1:5279${opt.ruta ?? '/juegos/legal/archipielago/'}` });
await espera(4000);
// Mientras carga (fuentes, three.js, paquetes) se hace correr el reloj para que el juego arranque.
for (let i = 0; i < 400; i++) {
  await evalua('window.__paso && window.__paso(33.333)');
  await espera(150);
  if (i > 20 && (await evalua(`document.readyState === 'complete' && !!document.querySelector('[data-t="ex"]')`))) break;
}
console.log("  página:", await evalua(`document.title + " · " + document.readyState + " · " + document.querySelectorAll("button").length + " botones"`));
await evalua(`document.querySelector('[data-t="ex"]').click()`);
for (let i = 0; i < 20 && !(await evalua(`!!document.querySelector('.pk')`)); i++) await espera(300);
await evalua(`document.querySelector('.pk[data-i="${opt.ejemplo ?? 0}"]').click()`);
await espera(1500);
await evalua(`(() => {
  const b = document.createElement('div');
  b.textContent = 'Documento de ejemplo';
  b.style.cssText = 'position:fixed;right:24px;bottom:24px;z-index:99;background:#163238;color:#FFFDF7;font:600 18px Bricolage Grotesque,system-ui;padding:10px 18px;border-radius:999px;letter-spacing:.02em';
  document.body.appendChild(b);
})()`);

// Piloto automático: un paso por cuadro.
await evalua(`(() => {
  const { B, K, ISL, toggle } = window.__a;
  const orden = [...ISL.filter((s) => s.d.estado !== 'faro'), ...ISL.filter((s) => s.d.estado === 'faro')];
  let i = 0, abierta = 0, quieto = 45;
  window.__piloto = () => {
    for (const k in K) K[k] = 0;
    if (quieto > 0) { quieto--; return; }
    const s = orden[i % orden.length];
    if (abierta > 0) { abierta--; if (abierta === 0) { toggle(); i++; quieto = 10; } return; }
    const dx = s.x - B.x, dz = s.z - B.z, d = Math.hypot(dx, dz);
    let dif = Math.atan2(dx, dz) - B.yaw;
    dif = Math.atan2(Math.sin(dif), Math.cos(dif));
    if (d < s.r * 1.2 + 4) { B.spd *= 0.5; toggle(); abierta = 120; return; }
    if (dif > 0.06) K.left = 1; else if (dif < -0.06) K.right = 1;
    K.up = Math.abs(dif) < 0.9 ? 1 : 0.25;
    if (d > 30 && Math.abs(dif) < 0.3) K.boost = 1;
  };
})()`);

const N = Math.round(SEG * FPS);
const t0 = Date.now();
for (let f = 0; f < N; f++) {
  await evalua('window.__piloto(); window.__paso(33.333)');
  const r = await cdp('Page.captureScreenshot', { format: 'jpeg', quality: 93 });
  writeFileSync(path.join(tmp, `c${String(f).padStart(5, '0')}.jpg`), Buffer.from(r.result.data, 'base64'));
  if (f % 150 === 0) console.log(`  cuadro ${f}/${N} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
ws.close();
nav.kill();
servidor.close();
// Base de tiempo 1/90000, la de los MP4 de Remotion: con otra (ffmpeg pone 1/15360) el concat de la
// pista de capas (armar.js) reescala mal los tiempos y el juego sale congelado.
execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', path.join(tmp, 'c%05d.jpg'), '-c:v', 'libx264', '-crf', '16', '-pix_fmt', 'yuv420p', '-video_track_timescale', '90000', salida]);
console.log(`✔ ${salida}`);
