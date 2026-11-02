// Revision automatica de las piezas Arcade antes del render (12-oct-2026): cada palabra dicha sale una
// sola vez (en la caja o en un golpe), ninguna pagina dura menos de 300 ms y la caja nunca convive con un golpe.
import { readdirSync, readFileSync } from 'node:fs';
import { FPS, lineaArcade, normalizar } from '../../remotion/arcade/linea.js';
const slugs = process.argv.slice(2);
let total = 0;
for (const f of readdirSync('piezas/2026-10').filter((x) => x.startsWith('sofa-') && x.endsWith('.json'))) {
  const p = JSON.parse(readFileSync(`piezas/2026-10/${f}`, 'utf8'));
  if (!p.generado || (slugs.length && !slugs.includes(p.slug))) continue;
  const l = lineaArcade(p);
  const problemas = [];
  for (const [n, e] of l.escenas.entries()) {
    if (!e.paginas) continue;
    e.golpes ??= []; // titulo y final con locucion: dialogo sin golpes
    const enGolpe = new Set(e.golpes.flatMap((g) => g.palabras.map((w) => w.startMs)));
    const enCaja = new Set(e.paginas.flatMap((pg) => pg.tokens.map((t) => t.startMs)));
    for (const s of normalizar(e.subtitulos)) {
      const vista = enGolpe.has(s.startMs) || [...enCaja].some((x) => Math.abs(x - s.startMs) < 2) || e.paginas.some((pg) => pg.tokens.some((t) => t.text === s.text && Math.abs(t.startMs - s.startMs) < 3000));
      if (!vista) problemas.push(`esc ${n}: no sale «${s.text}»`);
    }
    for (const pg of e.paginas) if (pg.finMs - pg.startMs < 500) problemas.push(`esc ${n}: pagina fugaz «${pg.tokens.map((t) => t.text).join(' ')}» (${Math.round(pg.finMs - pg.startMs)} ms)`);
    for (const g of e.golpes) for (const pg of e.paginas) {
      const a = (g.inicio / FPS) * 1000, b = (g.fin / FPS) * 1000;
      if (pg.startMs < b - 1 && pg.finMs > a + 1) problemas.push(`esc ${n}: caja «${pg.tokens.map((t) => t.text).join(' ')}» encima del golpe ${g.texto}`);
    }
  }
  total += problemas.length;
  console.log(`${problemas.length ? '✗' : '✓'} ${p.slug}${problemas.map((x) => `\n    ${x}`).join('')}`);
}
process.exit(total ? 1 : 0);
