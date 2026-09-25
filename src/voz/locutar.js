import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { RAIZ } from '../config.js';
import { locutar } from './elevenlabs.js';

/**
 * npm run voz -- <slug> [cuenta]
 *
 * Genera un audio por escena con el texto de su campo "voz" (literal o
 * "$campo" de la variante) y un manifiesto con la duracion de cada uno.
 * La plantilla lee el manifiesto y alarga cada escena a lo que dura la
 * frase: el video se ajusta a la voz, no al reves.
 */
const [slug, soloCuenta] = process.argv.slice(2);
const carpeta = path.join(RAIZ, 'piezas');
const mes = slug && readdirSync(carpeta).find((m) => readdirSync(path.join(carpeta, m)).includes(`${slug}.json`));
if (!mes) {
  console.error('Uso: npm run voz -- <slug> [cuenta]');
  process.exit(1);
}
const pieza = JSON.parse(readFileSync(path.join(carpeta, mes, `${slug}.json`), 'utf8'));
const opciones = { apiKey: process.env.ELEVENLABS_API_KEY, vozId: process.env.ELEVENLABS_VOICE_ID, modelo: process.env.ELEVENLABS_MODELO || undefined };

for (const cuenta of soloCuenta ? [soloCuenta] : pieza.cuentas) {
  const variante = pieza.variantes?.[cuenta] ?? {};
  const id = `${pieza.slug}--${cuenta}`;
  const destino = path.join(RAIZ, 'public', 'voz', id);
  mkdirSync(destino, { recursive: true });
  const escenas = [];
  for (const [i, escena] of pieza.escenas.entries()) {
    const texto = typeof escena.voz === 'string' && escena.voz.startsWith('$') ? variante[escena.voz.slice(1)] : escena.voz;
    if (!texto) {
      escenas.push(null);
      continue;
    }
    const { audio, duracion, palabras } = await locutar(texto, opciones);
    writeFileSync(path.join(destino, `escena-${i}.mp3`), audio);
    escenas.push({ archivo: `voz/${id}/escena-${i}.mp3`, duracion, palabras });
    console.log(`  ✓ escena ${i}: ${duracion.toFixed(1)}s · "${texto.slice(0, 50)}"`);
  }
  writeFileSync(path.join(RAIZ, 'public', 'voz', `${id}.json`), JSON.stringify({ escenas }, null, 2));
  console.log(`✓ Voz de ${id}`);
}
