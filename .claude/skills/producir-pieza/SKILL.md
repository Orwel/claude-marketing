---
name: producir-pieza
description: Produce un video (o carrusel) de marketing con el estudio Remotion de este repo — pieza nueva, versión para otra cuenta, o edición de los videos grabados del mes. Usar cuando se pida "haz un video", "edita los videos de <mes>", "saca la versión de Contrappto", "renderiza", o similar.
---

# Producir una pieza

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
