import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { RAIZ } from '../config.js';

/**
 * npm run gameplay -- [segundos=40] [ancho=1920] [alto=1080] [disfraz=Caballero]
 *
 * Graba una partida real de trifuerza.co/juego-urosario ("El Claustro en vivo")
 * para meterla a pantalla completa en los videos del SOFA. Abre Chrome sin
 * ventana con el protocolo de DevTools, acepta los terminos, entra sin foto,
 * elige el disfraz, camina por el patio con las flechas y guarda cada cuadro
 * del screencast con su tiempo real. Al final ffmpeg arma un MP4 a 30 fps en
 * public/broll/2026-10/sofa/claustro-<disfraz>-<ancho>x<alto>.mp4.
 *
 * Se graba con DevTools y no con una grabadora de pantalla porque asi el
 * cuadro sale limpio (sin cursor ni ventanas encima) y a la resolucion exacta.
 */
const [segundos = 40, ancho = 1920, alto = 1080, disfraz = 'Caballero'] = process.argv.slice(2);
const CHROME = process.env.CHROME_EJECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const FFMPEG = process.env.FFMPEG_COMPLETO;
const PUERTO = 9333;
const carpeta = path.join(RAIZ, 'trabajo', 'gameplay', `${disfraz}-${ancho}x${alto}`);
rmSync(carpeta, { recursive: true, force: true });
mkdirSync(carpeta, { recursive: true });
const perfil = path.join(RAIZ, 'trabajo', 'gameplay', 'perfil-chrome');

const chrome = spawn(CHROME, [`--remote-debugging-port=${PUERTO}`, `--user-data-dir=${perfil}`, `--window-size=${ancho},${alto}`, '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--autoplay-policy=no-user-gesture-required', '--window-position=0,0', '--kiosk', 'about:blank'], { stdio: 'ignore' });
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function objetivo() {
  for (let i = 0; i < 40; i++) {
    try {
      const lista = await (await fetch(`http://127.0.0.1:${PUERTO}/json`)).json();
      const p = lista.find((t) => t.type === 'page');
      if (p) return p;
    } catch {}
    await esperar(250);
  }
  throw new Error('Chrome no abrio el puerto de DevTools');
}

const pagina = await objetivo();
const ws = new WebSocket(pagina.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pendientes = new Map();
const cuadros = [];
let t0 = null;
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pendientes.has(m.id)) {
    pendientes.get(m.id)(m);
    pendientes.delete(m.id);
  }
  if (m.method === 'Page.screencastFrame') {
    const { data, metadata, sessionId } = m.params;
    t0 ??= metadata.timestamp;
    cuadros.push({ t: metadata.timestamp - t0, n: cuadros.length });
    writeFileSync(path.join(carpeta, `${String(cuadros.length - 1).padStart(5, '0')}.jpg`), Buffer.from(data, 'base64'));
    enviar('Page.screencastFrameAck', { sessionId });
  }
};
const enviar = (method, params = {}) => new Promise((r) => {
  const n = ++id;
  pendientes.set(n, r);
  ws.send(JSON.stringify({ id: n, method, params }));
});
const js = async (expression) => (await enviar('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
const clic = async (texto) => js(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes(${JSON.stringify(texto)})); if (!b) return 'no:' + ${JSON.stringify(texto)}; b.click(); return 'ok'; })()`);
const tecla = async (key, code, ms) => {
  const base = { key, code, windowsVirtualKeyCode: { ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39, KeyE: 69 }[code] };
  await enviar('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base });
  await esperar(ms);
  await enviar('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
};

await enviar('Page.enable');
await enviar('Runtime.enable');
await enviar('Emulation.setDeviceMetricsOverride', { width: +ancho, height: +alto, deviceScaleFactor: 1, mobile: +alto > +ancho });
await enviar('Page.navigate', { url: 'https://www.trifuerza.co/juego-urosario' });
await esperar(4000);
console.log('casillas:', await js(`(() => { const c = [...document.querySelectorAll('input[type=checkbox]')]; c.forEach((x) => { if (!x.checked) x.click(); }); return c.length; })()`));
await esperar(300);
console.log('sin foto:', await clic('Jugar sin foto'));
await esperar(1500);
console.log('disfraz:', await js(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === ${JSON.stringify(disfraz)}); if (!b) return 'no'; b.click(); return 'ok'; })()`));
// La vista previa del personaje tarda en armarse: se espera el boton de entrar hasta 20 s.
let entrar = 'no';
for (let i = 0; i < 40 && entrar !== 'ok'; i++) {
  await esperar(500);
  entrar = await clic('Entrar al Claustro');
}
console.log('entrar:', entrar);
await esperar(7000);
console.log('juego:', await js(`document.querySelector('canvas') ? 'canvas ' + document.querySelector('canvas').width + 'x' + document.querySelector('canvas').height : document.body.innerText.slice(0, 120)`));

// Grabar: screencast a calidad alta y un paseo con las flechas (recorrido en zigzag por el patio).
// Sin la barra roja ni la de chat: queda solo el lienzo del juego, que es lo que va a pantalla completa.
await js(`(() => { for (const el of document.querySelectorAll('header, [class*="barra"], [class*="hud"]')) el.style.display = 'none'; return 1; })()`);
await esperar(800);
// A mitad de resolucion y se amplia con vecino mas cercano: el juego es pixel art a escala entera, asi que
// no se pierde nada, y el screencast a tamaño completo solo daba ~7 cuadros por segundo.
await enviar('Page.startScreencast', { format: 'jpeg', quality: 88, everyNthFrame: 1, maxWidth: Math.round(ancho / 2), maxHeight: Math.round(alto / 2) });
const paseo = [['ArrowRight', 1400], ['ArrowUp', 900], ['ArrowLeft', 1800], ['ArrowDown', 700], ['ArrowRight', 1200], ['ArrowUp', 1500], ['ArrowRight', 1000], ['ArrowDown', 1600], ['ArrowLeft', 900]];
const fin = Date.now() + segundos * 1000;
let k = 0;
while (Date.now() < fin) {
  const [key, ms] = paseo[k++ % paseo.length];
  await tecla(key, key, ms);
  await esperar(250);
  if (k % 4 === 0) await tecla('e', 'KeyE', 80);
}
await enviar('Page.stopScreencast');
await esperar(500);
ws.close();
chrome.kill();

// Cuadros a 30 fps con sus tiempos reales (concat demuxer con duraciones).
const nombre = `claustro-${disfraz.toLowerCase()}-${ancho}x${alto}.mp4`;
const destino = path.join(RAIZ, 'public', 'broll', '2026-10', 'sofa');
mkdirSync(destino, { recursive: true });
const lista = cuadros.map((c, i) => `file '${String(i).padStart(5, '0')}.jpg'\nduration ${Math.max(0.01, (cuadros[i + 1]?.t ?? c.t + 0.033) - c.t).toFixed(4)}`).join('\n');
writeFileSync(path.join(carpeta, 'lista.txt'), lista + `\nfile '${String(cuadros.length - 1).padStart(5, '0')}.jpg'\n`);
execFileSync(FFMPEG, ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(carpeta, 'lista.txt'), '-vf', `fps=30,scale=${ancho}:${alto}:flags=neighbor,format=yuv420p`, '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', path.join(destino, nombre)]);
console.log(`✓ ${cuadros.length} cuadros en ${(cuadros.at(-1)?.t ?? 0).toFixed(1)} s → public/broll/2026-10/sofa/${nombre}`);
if (!existsSync(path.join(destino, nombre))) process.exit(1);
