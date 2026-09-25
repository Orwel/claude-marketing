# Aprendizajes

Bitácora viva: lo que falló, cómo se resolvió y lo que le gusta o no a Juan David.
Se lee al empezar cada sesión (lo pide `CLAUDE.md`). Lo más nuevo, arriba.

## 2026-09-25

**Gusto**
- Le gustó mucho el Animado con capa de marca. Pidió más "perrengue": formas, personas, pantallas
  de la app, ritmo. Resultado: `contrappto-en-accion` (golpes, barridos, formas, pista a 120 BPM).
- Las capturas de `contrappto/public/images/home` son **viejas**. No usarlas para publicar; pedir
  capturas actuales o recrear pantallas desde el código de Contrappto.
- Quiere su voz clonada de ElevenLabs para narrar animados y demos.

**Técnico**
- Fuentes: `delayRender` a nivel de módulo cortaba el render a los 30 s. Va en un hook (`useFuentes`).
- Fuentes locales en `public/fuentes` (Google Fonts, OFL): el Chromium de la sesión en la nube no
  confía en el certificado del proxy para fonts.gstatic.com.
- Sin `--color-space=bt709` los MP4 salen `yuvj420p`. Ya está en `remotion.config.mjs` y en `render.js`.
- `hstack` y otros filtros no existen en el ffmpeg de Remotion: para tiras de fotogramas, mirar uno a uno.
- Chrome en la nube: usar `CHROME_EJECUTABLE=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell`.

**Límites de la sesión en la nube**
- Red bloqueada: api.elevenlabs.io, api.pexels.com, huggingface.co, releases de GitHub, contrappto.com.
- El conector de Drive solo baja archivos de hasta 10 MB: los videos grabados (60-106 MB, .MOV del
  iPhone) se editan en el PC de Juan David, con Claude Code local.
