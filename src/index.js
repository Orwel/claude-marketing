#!/usr/bin/env node
import { log } from './util/log.js';
import { diario } from './flujo/diario.js';
import { planificar } from './flujo/planificar.js';
import { publicar } from './flujo/publicar.js';
import { producir } from './video/producir.js';
import { medir } from './flujo/medir.js';
import { aprender } from './flujo/aprender.js';

const AYUDA = `
claude-marketing — agente de marketing que aprende de sus propias metricas

  npm run diario       Ciclo completo: medir -> aprender -> planificar
  npm run planificar   Genera el guion de hoy
  npm run producir     Genera el video: voz + fondos + montaje
                         -- --id <id> [--fondo plantilla|imagen|veo]
  npm run publicar     Publica un video ya producido
                         -- --id <id> --video <URL publica> [--programar <ISO>]
  npm run medir        Recoge metricas de Instagram (publicaciones con +24h)
  npm run aprender     Analiza las metricas y ajusta la estrategia
  npm run probar       Comprueba credenciales y conexiones

El flujo normal:
  1. npm run planificar               -> te da un guion
  2. npm run producir -- --id X       -> genera el video (voz + montaje)
  3. subes el mp4 a una URL publica
  4. npm run publicar -- --id X --video <URL>
  5. al dia siguiente: npm run diario  (mide, aprende y planifica lo siguiente)
`;

function leerArgumentos(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const clave = argv[i].slice(2);
    const siguiente = argv[i + 1];
    if (siguiente && !siguiente.startsWith('--')) {
      args[clave] = siguiente;
      i++;
    } else {
      args[clave] = true;
    }
  }
  return args;
}

async function principal() {
  const [comando, ...resto] = process.argv.slice(2);
  const args = leerArgumentos(resto);

  switch (comando) {
    case 'diario':
      return diario();
    case 'planificar':
      return planificar();
    case 'producir':
      return producir({ id: args.id, modoFondo: args.fondo ?? undefined });
    case 'publicar':
      return publicar({ id: args.id, urlVideo: args.video, programarPara: args.programar ?? null });
    case 'medir':
      return medir({ horasMinimas: Number(args.horas ?? 24) });
    case 'aprender':
      return aprender({ aplicarCambios: args['sin-cambios'] !== true });
    default:
      console.log(AYUDA);
      if (comando) process.exitCode = 1;
  }
}

principal().catch((e) => {
  log.error(e.message);
  if (process.env.DEBUG) console.error(e.stack);
  process.exitCode = 1;
});
