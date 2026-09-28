import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ADELANTO_MS } from '../../remotion/montaje/linea.js';
import { carpetaDelMes, config, RAIZ } from '../config.js';

/**
 * npm run pendientes -- 2026-10
 *
 * Las demos se graban sin pantalla: el guion marca [Pantalla: ...] y la
 * captura la graba Juan David desde la app. Este script escribe
 * pendiente-overlay.md con cada hueco: que pantalla grabar, en que segundo
 * del video va y cuanto dura (lo mismo que se ve en el render de trabajo).
 * Se deja en trabajo/<mes>/ y en la carpeta _pendiente-overlay de Drive.
 */
const mes = process.argv[2];
const carpeta = path.join(RAIZ, 'piezas', mes);
const demos = readdirSync(carpeta)
  .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
  .map((f) => JSON.parse(readFileSync(path.join(carpeta, f), 'utf8')))
  .filter((p) => p.plantilla === 'Montaje' && p.tipo === 'demo' && p.generado);

const seg = (ms) => `${Math.floor(ms / 60000)}:${((ms % 60000) / 1000).toFixed(1).padStart(4, '0')}`;
let md = `# Pantallas pendientes · ${mes}\n\nCada demo salió con huecos en color plano donde va la captura de la app. Graba cada pantalla con al menos la duración indicada (mejor 1 s de más a cada lado) y recorta datos reales de clientes. Los segundos son del video final de cada cuenta.\n`;
for (const p of demos) {
  md += `\n## ${p.codigo} · ${p.titulo}\n`;
  for (const cuenta of p.cuentas) {
    const m = p.generado.montajes[cuenta];
    md += `\nCuenta: ${cuenta} · video de ${(m.duracionMs / 1000 + 2).toFixed(1)} s\n\n| # | Pantalla a grabar | Entra en | Dura |\n|---|---|---|---|\n`;
    p.generado.beats
      .filter((b) => b.tipo === 'pantalla')
      .forEach((b, i) => {
        const desde = m.cuerpoInicioMs + b.inicioMs - ADELANTO_MS;
        md += `| ${i + 1} | ${b.texto} | ${seg(desde)} | ${((b.finMs - b.inicioMs + ADELANTO_MS) / 1000).toFixed(1)} s |\n`;
      });
  }
}
const local = path.join(RAIZ, 'trabajo', mes, 'pendiente-overlay.md');
writeFileSync(local, md);
const drive = path.join(config.carpetaRedes, carpetaDelMes(mes), config.subcarpetaEditados, '_pendiente-overlay');
mkdirSync(drive, { recursive: true });
writeFileSync(path.join(drive, 'pendiente-overlay.md'), md);
console.log(md);
