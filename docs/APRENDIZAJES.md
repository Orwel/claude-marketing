# Aprendizajes

Bitácora viva: lo que falló, cómo se resolvió y lo que le gusta o no a Juan David.
Se lee al empezar cada sesión (lo pide `CLAUDE.md`). Lo más nuevo, arriba.

## 2026-09-25 (tarde)

- La sesión en la nube no alcanza el PC aunque Juan David escriba desde el computador: para sus videos
  hace falta una sesión local (Claude Desktop o `claude remote-control` en la carpeta del repo).
- Los videos grabados llegan como `.MOV` del iPhone (60-106 MB). El proxy H.264 los endereza y los
  hace legibles para Remotion. **Por verificar en la primera prueba real:** si vienen en HDR (HLG/Dolby
  Vision), los colores del proxy pueden salir lavados; en ese caso hay que tonemapear o grabar en SDR
  (Ajustes → Cámara → Formatos → Más compatible, y apagar "Video HDR").
- En Windows, lanzar `npx` desde Node falla sin shell: todo pasa por `src/remotion-cli.js`, que llama
  a la CLI de Remotion con el mismo Node.
- whisper.cpp 1.5.5 se baja del espejo de Remotion (en Windows no hay que compilar). Para
  `large-v3-turbo` hace falta 1.7.x.

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
