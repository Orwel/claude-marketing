// Prueba de la musica por capas: sintetiza la pista de una pieza con cada estilo pedido (node trabajo/2026-10-sofa/prueba-musica.mjs <slug> <estilo...> <carpeta>).
import { readFileSync, writeFileSync } from 'node:fs';
import { sintetizarArcade } from '../../src/audio/arcade.js';
const [slug, ...resto] = process.argv.slice(2);
const carpeta = resto.pop();
const pieza = JSON.parse(readFileSync(`piezas/2026-10/${slug}.json`, 'utf8'));
for (const estilo of resto) {
  const t0 = Date.now();
  writeFileSync(`${carpeta}/${slug}-${estilo}.wav`, sintetizarArcade({ ...pieza, musica: estilo }, { id: 'juanda' }));
  console.log(estilo, ((Date.now() - t0) / 1000).toFixed(1) + ' s');
}
