---
name: producir-pieza
description: Produce un video (o carrusel) de marketing con el estudio Remotion de este repo — pieza nueva, versión para otra cuenta, o edición de los videos grabados del mes. Usar cuando se pida "haz un video", "edita los videos de <mes>", "saca la versión de Contrappto", "renderiza", o similar.
---

# Producir una pieza

**Siempre que se edite metraje grabado de Juan David, leer primero [ESTANDAR.md](ESTANDAR.md)**: las
reglas duras (nunca cortar lo que dice, desfase de audio, efectos sin agudos, música presente) y cómo
darle dinamismo al texto con criterio propio.

## Videos grabados del mes (plantilla Montaje)

1. Copiar los crudos de Drive a `trabajo/<mes>/00-crudo` (robocopy; Drive bajo demanda es lento).
2. Transcribir y armar: `npm run armar -- AAAA-MM [slug]` (limpia audio/imagen, corta, alinea
   subtítulos, resuelve beats y encuadres). Revisar los avisos (`⚠`).
3. **Leer la transcripción real** de cada pieza (`generado.texto`) y escribir en la pieza sus
   `golpes`, ajustar `beats`, `resaltar` y `correcciones` según lo que dijo, no el guion.
4. `npm run revisar -- AAAA-MM`: cada palabra dicha tiene que salir en pantalla (render.js lo exige).
   Luego cuadros clave con `remotion still` (ver ESTANDAR §7).
5. Renderizar: `npm run montaje -- AAAA-MM <slug> --cuenta=juanda --red=instagram [--rehacer]`,
   o todo el mes en orden de prioridad con `npm run cola -- AAAA-MM [--rehacer]` (cada video llega a
   Drive apenas termina). Para retocar a mano: `npm run estudio` (localhost:3000).

## Piezas generadas (Animado, Vertical, DemoApp, Clase, Carrusel)

1. **Entender el pedido.** Cuenta(s), objetivo, duración, guion de 6 líneas (gancho, quién soy, dato,
   ejemplo, qué hacer hoy, CTA), qué se ve, energía, voz, qué evitar. Si falta el guion o la cuenta,
   preguntar; lo demás se decide con `marcas/` y `docs/TONO.md`.
2. **Elegir plantilla.** Animado (100 % generado), Vertical (metraje propio: `npm run vertical -- AAAA-MM`
   crea las piezas en borrador desde "videos grabados"; luego se completan gancho, cierre y CTA), DemoApp,
   Clase, Carrusel. Ver escenas disponibles en `remotion/escenas/` y en `docs/HANDOFF.md`.
3. **Escribir la pieza** en `piezas/AAAA-MM/<slug>.json`: escenas, `variantes` por cuenta
   (etiqueta, gancho, cierre, cta, web, copy), `verificar[]` con cada dato jurídico o de producto.
   Tomar como modelo `la-fecha-que-cuesta-plata.json` (calmado) o `contrappto-en-accion.json` (ritmo).
4. **Revisar fotogramas** antes del render completo: `npx remotion still ... --frame=N --scale=0.4`
   en 4-6 cuadros clave; mirar texto cortado, choques con la firma y zonas que tapa Instagram
   (220 px arriba, 380 abajo).
5. **Renderizar**: `npm run render -- <slug> [cuenta]`. Genera pista si `pista: true`, valida con
   ffprobe (H.264, yuv420p, 9:16, 5-90 s) y deja el MP4 en la carpeta del mes.
6. **Entregar**: mandar el MP4, listar lo que queda en `verificar[]` y el copy de cada cuenta.
7. **Anotar** en `docs/APRENDIZAJES.md` lo que se aprendió (errores, gustos de Juan David).
