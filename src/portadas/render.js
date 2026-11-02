import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { carpetaEditados, RAIZ } from '../config.js';
import { remotion } from '../remotion-cli.js';

/**
 * npm run portadas -- AAAA-MM [slug ...] [--rehacer]
 *
 * Una portada por video grabado, cuenta y red (plantilla Portada), en
 * Edited/Portadas/<Cuenta>/<COD>-<JD|TF|CTP>-<ig|li>.jpg: el mismo nombre del video, con .jpg.
 * Carruseles no necesitan: su portada es la primera lamina.
 */
const CUENTAS = { juanda: ['Juanda.Trifuerza', 'JD'], trifuerza: ['Trifuerza.co', 'TF'], contrappto: ['Contrappto', 'CTP'] };
const args = process.argv.slice(2);
const mes = args.find((a) => /^\d{4}-\d{2}$/.test(a));
const rehacer = args.includes('--rehacer');
const slugs = args.filter((a) => !a.startsWith('--') && a !== mes);
if (!mes) {
  console.error('Uso: npm run portadas -- AAAA-MM [slug ...] [--rehacer]');
  process.exit(1);
}

const carpeta = path.join(RAIZ, 'piezas', mes);
const piezas = readdirSync(carpeta)
  .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
  .map((f) => JSON.parse(readFileSync(path.join(carpeta, f), 'utf8')))
  .filter((p) => p.plantilla === 'Montaje' && p.generado && (!slugs.length || slugs.includes(p.slug)));

const paquete = path.join(RAIZ, 'trabajo', 'paquete-portadas');
console.log('▶ Empaquetando el proyecto una vez…');
rmSync(paquete, { recursive: true, force: true });
remotion(['bundle', 'remotion/index.js', `--out-dir=${paquete}`, '--log=error']);

const destino = path.join(carpetaEditados(mes), 'Portadas');
const local = path.join(RAIZ, 'trabajo', 'portadas');
mkdirSync(local, { recursive: true });
let hechas = 0;
for (const pieza of piezas) {
  for (const cuenta of pieza.cuentas) {
    const [nombreCarpeta, codigo] = CUENTAS[cuenta];
    mkdirSync(path.join(destino, nombreCarpeta), { recursive: true });
    for (const red of ['ig', 'li']) {
      const nombre = `${pieza.codigo ?? pieza.slug}-${codigo}-${red}.jpg`;
      const salida = path.join(destino, nombreCarpeta, nombre);
      if (existsSync(salida) && !rehacer) continue;
      const id = `${pieza.slug}--${cuenta}--portada-${red}`;
      console.log(`▶ ${id} → Portadas/${nombreCarpeta}/${nombre}`);
      // Se escribe en disco local y se copia: escribir directo en Drive (G:) colgo renders.
      // Tope de espera amplio y un reintento: con el equipo ocupado, cargar el cuadro del video pasaba de 28 s.
      const still = () => remotion(['still', paquete, id, path.join(local, nombre), '--image-format=jpeg', '--jpeg-quality=92', '--timeout=120000', '--log=error'], { timeout: 240_000 });
      try { still(); } catch { console.log('  ↻ otra vez'); still(); }
      copyFileSync(path.join(local, nombre), salida);
      rmSync(path.join(local, nombre));
      hechas++;
    }
  }
}
// El paquete copia todo public/ (crudos: ~3,5 GB): se borra al terminar o se llena el disco (29-sep-2026).
rmSync(paquete, { recursive: true, force: true });
console.log(`\n✓ ${hechas} portadas en ${destino}`);
