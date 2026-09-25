import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { RAIZ } from './config.js';

/**
 * Llama a la CLI de Remotion con el mismo Node que corre este proceso, sin npx.
 * En Windows, lanzar npx desde Node exige una shell, y con una shell las rutas
 * con espacios ("G:\Mi unidad\...") hay que escaparlas a mano. Asi se evita.
 */
const CLI = path.join(RAIZ, 'node_modules', '@remotion', 'cli', 'remotion-cli.js');

export function remotion(argumentos, { silencioso = false } = {}) {
  return execFileSync(process.execPath, [CLI, ...argumentos], {
    cwd: RAIZ,
    encoding: 'utf8',
    stdio: silencioso ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    maxBuffer: 64 * 1024 * 1024,
  });
}

/** Igual, pero devuelve stdout y stderr juntos: ffmpeg escribe sus analisis (silencedetect) en stderr. */
export function remotionSalida(argumentos) {
  const r = spawnSync(process.execPath, [CLI, ...argumentos], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`remotion ${argumentos[0]} fallo:\n${r.stderr}`);
  return `${r.stdout}\n${r.stderr}`;
}
