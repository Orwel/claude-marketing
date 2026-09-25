# claude-marketing · estudio de producción con Remotion

Estudio de video para juanda.trifuerza, trifuerza.co y Contrappto. Produce MP4 listos; **no publica**
(Juan David publica a mano). Estrategia: FigJam de Trifuerza (fileKey `k01OtwxjWRkXi3HF4Yu11X`,
zonas 5, 5B, 7, 8 y la parrilla del mes). Plan de trabajo: zona 5B.

## Antes de tocar nada
- Lee `docs/HANDOFF.md` (arquitectura y decisiones) y `docs/APRENDIZAJES.md` (errores ya resueltos).
- Para producir una pieza, sigue la skill `producir-pieza`.
- Tono y restricciones de marca: `docs/TONO.md`.

## Reglas
- Node ESM. Nombres, comentarios y logs en español; los comentarios explican el porqué.
- Tres capas: `marcas/` (cómo se ve) · `piezas/AAAA-MM/<slug>.json` (qué dice) · `remotion/plantillas/` (cómo se arma).
  Una plantilla nunca lleva colores ni textos de una cuenta.
- Cero dependencias innecesarias.
- Todo dato jurídico o de producto va en `verificar[]` de la pieza. Nunca se inventa.
- Ningún cliente identificable ni competidor por nombre. Capturas de la app: recortar datos reales.
- Drive: `CARPETA_REDES/<AAAA-MM mes>/videos grabados` (entra) y `videos editados` (sale). Ruta en `.env`.
- `archivo/agente-anterior/` es solo consulta: no se importa ni se ejecuta.

## Al terminar una sesión
Si algo falló y se resolvió, o se aprendió algo del gusto de Juan David, anótalo en
`docs/APRENDIZAJES.md`. Así la siguiente sesión no repite el error.
