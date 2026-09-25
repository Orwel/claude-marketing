import { pedirBlotato } from './cliente.js';
import { config } from '../config.js';

/**
 * POST /v2/posts — publica o programa.
 *
 * Forma del cuerpo:
 *   {
 *     post: {
 *       accountId: "<id de la cuenta conectada>",
 *       target:  { targetType: "instagram" },
 *       content: { platform: "instagram", text: "...", mediaUrls: ["..."] }
 *     },
 *     scheduledTime: "2026-08-02T14:00:00Z"   // opcional; sin esto publica ya
 *   }
 */
export async function publicarEnInstagram({ texto, urlMedio, programarPara = null }) {
  const cuerpo = {
    post: {
      accountId: config.blotato.cuentaInstagram,
      target: { targetType: 'instagram' },
      content: {
        platform: 'instagram',
        text: texto,
        mediaUrls: [urlMedio],
      },
    },
  };

  if (programarPara) cuerpo.scheduledTime = new Date(programarPara).toISOString();

  const respuesta = await pedirBlotato('/v2/posts', {
    method: 'POST',
    body: JSON.stringify(cuerpo),
  });

  return {
    idPublicacionBlotato: respuesta?.id ?? respuesta?.data?.id ?? null,
    respuesta,
  };
}

/**
 * Compone el texto final del post a partir del guion.
 * Los hashtags van al final, separados del cuerpo, que es como mejor se lee.
 */
export function componerTexto(guion) {
  const etiquetas = (guion.hashtags ?? [])
    .map((h) => (h.startsWith('#') ? h : `#${h}`))
    .join(' ');

  return etiquetas ? `${guion.pieDeFoto}\n\n${etiquetas}` : guion.pieDeFoto;
}
