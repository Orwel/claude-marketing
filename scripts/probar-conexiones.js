#!/usr/bin/env node
import { config } from '../src/config.js';
import { log } from '../src/util/log.js';
import { obtenerCliente } from '../src/ia/cliente.js';
import { listarCuentas } from '../src/blotato/cuentas.js';
import { pedirGraph } from '../src/instagram/cliente.js';
import { leerJson } from '../src/util/almacen.js';

/**
 * Comprueba cada integracion por separado y sigue aunque una falle.
 * Es lo primero que hay que ejecutar tras rellenar el .env.
 */

const resultados = [];

async function probar(nombre, fn) {
  try {
    const detalle = await fn();
    resultados.push({ nombre, ok: true });
    log.ok(`${nombre}${detalle ? ` — ${detalle}` : ''}`);
  } catch (e) {
    resultados.push({ nombre, ok: false, error: e.message });
    log.error(`${nombre} — ${e.message}`);
  }
}

log.paso('Comprobando configuracion y conexiones');

await probar('Ficheros de datos', async () => {
  const marca = leerJson(config.rutas.marca);
  const tipos = leerJson(config.rutas.tiposVideo);
  if (!marca) throw new Error('falta data/marca.json');
  if (!tipos?.length) throw new Error('falta data/tipos-video.json o esta vacio');
  if (marca.nombre?.startsWith('PONME_')) {
    throw new Error('data/marca.json sigue con la plantilla sin rellenar');
  }
  return `marca "${marca.nombre}", ${tipos.filter((t) => t.activo !== false).length} tipos activos`;
});

await probar(`IA (${config.ia.modelo})`, async () => {
  const respuesta = await obtenerCliente().messages.create({
    model: config.ia.modelo,
    max_tokens: 32,
    output_config: { effort: 'low' },
    messages: [{ role: 'user', content: 'Responde solo: ok' }],
  });
  return `respondio (${respuesta.usage.input_tokens} tokens entrada)`;
});

await probar('Blotato', async () => {
  const cuentas = await listarCuentas();
  const instagram = cuentas.filter(
    (c) => String(c.platform ?? c.targetType ?? '').toLowerCase() === 'instagram'
  );

  if (!instagram.length) {
    throw new Error('no hay ninguna cuenta de Instagram conectada en Blotato');
  }

  console.log('    Cuentas de Instagram disponibles:');
  instagram.forEach((c) =>
    console.log(`      id=${c.id}  ${c.username ?? c.name ?? '(sin nombre)'}`)
  );

  if (!config.blotato.cuentaInstagram) {
    log.aviso('    Copia uno de esos id a BLOTATO_ACCOUNT_ID_INSTAGRAM en el .env');
  }

  return `${cuentas.length} cuenta(s) conectada(s)`;
});

await probar(`Instagram Graph ${config.instagram.version}`, async () => {
  const perfil = await pedirGraph(`/${config.instagram.usuarioId}`, {
    fields: 'id,username,media_count',
  });
  return `@${perfil.username} (${perfil.media_count} publicaciones)`;
});

const fallos = resultados.filter((r) => !r.ok);

console.log();
if (fallos.length) {
  log.aviso(`${fallos.length} de ${resultados.length} comprobaciones fallaron.`);
  process.exitCode = 1;
} else {
  log.ok('Todo listo.');
  if (config.operacion.simular) {
    log.info('SIMULAR=true — "npm run publicar" no publicara de verdad todavia.');
  }
}
