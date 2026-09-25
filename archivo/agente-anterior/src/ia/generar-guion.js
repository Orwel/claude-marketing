import { pedirJsonAlModelo } from './cliente.js';
import { ESQUEMA_GUION } from './esquemas.js';
import { LIMITES_REEL } from '../video/validar.js';

const SISTEMA = `Eres el estratega de contenido de una marca. Tu trabajo no es escribir bonito:
es escribir lo que hace que alguien pare el scroll y se quede.

Reglas del formato (Instagram Reels, no negociables):
- Vertical 9:16. El guion debe funcionar en vertical, sin texto que se salga.
- Duracion entre ${LIMITES_REEL.duracionMinSegundos} y ${LIMITES_REEL.duracionMaxSegundos} segundos.
- Los primeros 3 segundos son el gancho. Si el gancho es generico, el video ya fallo.

Como trabajas:
- Eliges UN tipo de video de la lista que te dan. No inventes tipos nuevos.
- Si te dan aprendizajes de publicaciones anteriores, mandan sobre tu intuicion.
  Cita el dato concreto en 'razonDelTipo'.
- Escribes en el idioma y el tono de la marca, no en el tuyo.
- Nada de lenguaje de marketing vacio ("descubre el secreto", "no vas a creer").
  Concreto siempre gana a llamativo.`;

/**
 * Genera el guion del dia. Recibe el contexto completo (marca, tipos disponibles,
 * aprendizajes acumulados) porque el valor del sistema esta justo ahi:
 * cada guion se escribe sabiendo como fueron los anteriores.
 */
export async function generarGuion({ marca, tiposVideo, aprendizajes, publicacionesRecientes }) {
  const prompt = [
    '## La marca',
    JSON.stringify(marca, null, 2),
    '',
    '## Tipos de video disponibles',
    JSON.stringify(tiposVideo, null, 2),
    '',
    '## Lo que hemos aprendido hasta ahora',
    aprendizajes.length
      ? JSON.stringify(aprendizajes.slice(-5), null, 2)
      : 'Todavia nada: esta es una de las primeras publicaciones. Explora tipos distintos ' +
        'en vez de repetir, para tener con que comparar mas adelante.',
    '',
    '## Publicaciones recientes (para no repetirte)',
    publicacionesRecientes.length
      ? JSON.stringify(
          publicacionesRecientes.slice(-10).map((p) => ({
            fecha: p.creadaEn,
            tipoVideo: p.guion?.tipoVideo,
            gancho: p.guion?.gancho,
            metricas: p.metricas ?? null,
          })),
          null,
          2
        )
      : 'Ninguna todavia.',
    '',
    '## Tu tarea',
    'Escribe el guion de la publicacion de hoy. Elige el tipo de video con criterio',
    'y justifica la eleccion con datos si los tienes.',
  ].join('\n');

  return pedirJsonAlModelo({ sistema: SISTEMA, prompt, esquema: ESQUEMA_GUION });
}
