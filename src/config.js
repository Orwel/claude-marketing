import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Carga .env sin dependencias externas.
 * Node 20 no trae --env-file estable en todas las versiones, asi que lo hacemos a mano.
 */
function cargarEnv() {
  const ruta = resolve(RAIZ, '.env');
  if (!existsSync(ruta)) return;

  for (const linea of readFileSync(ruta, 'utf8').split('\n')) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith('#')) continue;

    const separador = limpia.indexOf('=');
    if (separador === -1) continue;

    const clave = limpia.slice(0, separador).trim();
    let valor = limpia.slice(separador + 1).trim();

    // Quita comillas envolventes si las hay
    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }

    // Las variables ya presentes en el entorno mandan sobre el .env
    if (process.env[clave] === undefined) process.env[clave] = valor;
  }
}

cargarEnv();

const bool = (v, porDefecto) =>
  v === undefined ? porDefecto : ['1', 'true', 'si', 'yes'].includes(String(v).toLowerCase());

export const config = {
  ia: {
    apiKey: process.env.GEMINI_API_KEY,
    modelo: process.env.MODELO_IA || 'gemini-2.5-pro',
    esfuerzo: process.env.ESFUERZO_IA || 'high',
  },
  voz: {
    apiKey: process.env.ELEVENLABS_API_KEY,
    voiceId: process.env.ELEVENLABS_VOICE_ID,
    modelo: process.env.ELEVENLABS_MODELO || 'eleven_multilingual_v2',
  },
  video: {
    // 'plantilla' | 'imagen' | 'veo'
    modoFondo: process.env.MODO_FONDO || 'plantilla',
    modeloVeo: process.env.MODELO_VEO || 'veo-3.1-fast-generate-preview',
    modeloImagen: process.env.MODELO_IMAGEN || 'imagen-4.0-generate-001',
    esperaMaxVeoMs: Number(process.env.VEO_ESPERA_MAX_MIN || 15) * 60 * 1000,
    navegador: process.env.CHROME_EJECUTABLE || '',
  },
  blotato: {
    apiKey: process.env.BLOTATO_API_KEY,
    baseUrl: process.env.BLOTATO_BASE_URL || 'https://backend.blotato.com',
    cuentaInstagram: process.env.BLOTATO_ACCOUNT_ID_INSTAGRAM,
  },
  instagram: {
    token: process.env.IG_ACCESS_TOKEN,
    usuarioId: process.env.IG_USER_ID,
    version: process.env.IG_API_VERSION || 'v22.0',
  },
  operacion: {
    publicacionesPorDia: Number(process.env.PUBLICACIONES_POR_DIA || 1),
    simular: bool(process.env.SIMULAR, true),
  },
  rutas: {
    marca: resolve(RAIZ, 'data/marca.json'),
    tiposVideo: resolve(RAIZ, 'data/tipos-video.json'),
    historial: resolve(RAIZ, 'data/historial.json'),
  },
};

/**
 * Verifica que existan las credenciales que necesita una etapa concreta.
 * Falla temprano y con un mensaje que dice exactamente que falta.
 */
export function exigir(...claves) {
  const mapa = {
    ia: ['GEMINI_API_KEY', config.ia.apiKey],
    voz: ['ELEVENLABS_API_KEY', config.voz.apiKey],
    vozId: ['ELEVENLABS_VOICE_ID', config.voz.voiceId],
    blotato: ['BLOTATO_API_KEY', config.blotato.apiKey],
    cuentaInstagram: ['BLOTATO_ACCOUNT_ID_INSTAGRAM', config.blotato.cuentaInstagram],
    igToken: ['IG_ACCESS_TOKEN', config.instagram.token],
    igUsuario: ['IG_USER_ID', config.instagram.usuarioId],
  };

  const faltantes = claves
    .map((c) => mapa[c])
    .filter((par) => par && !par[1])
    .map((par) => par[0]);

  if (faltantes.length) {
    throw new Error(
      `Faltan variables de entorno: ${faltantes.join(', ')}.\n` +
        `Copia .env.example a .env y rellenalas.`
    );
  }
}
