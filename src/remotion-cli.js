import { execFileSync } from 'node:child_process';
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
