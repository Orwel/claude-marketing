# Archivo · agente de marketing anterior

Copia del proyecto tal como quedó en el commit `aa3e30f` (rama
`claude/gifted-planck-1ua1bx`), antes de reorientar el repo a estudio de producción.

**Es consulta, no código activo.** No se instala, no se ejecuta y nada del
proyecto actual lo importa. Si algo de aquí vuelve a servir, se porta a la
estructura nueva (`marcas/`, `piezas/`, `remotion/`, `src/`) y se adapta; no se
enlaza desde aquí.

## Qué ya se aprovechó

| De aquí | Ahora vive en |
|---|---|
| `remotion/Reel.jsx` | `remotion/plantillas/Vertical.jsx` (por adaptar en la entrega 2) |
| `src/video/validar.js` | `src/video/validar.js` (reescrito con ffprobe) |
| `remotion.config.mjs` | `remotion.config.mjs` (+ espacio de color bt709) |
| Variables de ElevenLabs y Pexels de `.env.example` | `.env.example` |
| Tono, público y restricciones de `data/marca.json` | `docs/TONO.md` |

## Qué puede volver a servir

- `src/voz/elevenlabs.js`: locución con tiempos por carácter y el agrupado en
  palabras para subtítulos. Es la base de la entrega 3 (voz clonada).
- `src/video/stock.js`: b-roll gratis de Pexels para cubrir cortes en el Vertical.
- `data/tipos-video.json`: seis formatos de video con estructura y por qué funcionan.
- `docs/HANDOFF.md` §4: detalles verificados de las APIs de Instagram (v22) y Blotato,
  por si la analítica termina yendo por las APIs oficiales.

## Qué no vuelve

Publicación automática (Blotato), guiones con Gemini, fondos con Veo, el hub con
botón de publicar y el bucle de aprendizaje: la estrategia actual es grabar,
editar aquí y publicar a mano.
