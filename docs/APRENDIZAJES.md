# Aprendizajes

Bitácora viva: lo que falló, cómo se resolvió y lo que le gusta o no a Juan David.
Se lee al empezar cada sesión (lo pide `CLAUDE.md`). Lo más nuevo, arriba.

## 2026-09-25 (noche) · primera prueba real de la plantilla Vertical

Videos: IMG_3770, IMG_3772 e IMG_3776 de octubre (iPhone). Salieron `la-ia-que-nadie-entiende`
(3772 + 3776) y su republicación `-b` (3770 + 3776).

- **No era ningún guion de la parrilla.** Grabó una pieza de IA (Stephen Wolfram): 3770 y 3772 son dos
  tomas de la misma apertura y 3776 es la continuación. Lección: las grabaciones no siempre son
  "un video = una pieza". `metraje.fuentes` une varios videos en orden; la toma alterna sirve de
  republicación (otro primer segundo, otro gancho, otro CTA). Leer la transcripción antes de asumir el guion.
- **HDR: no hizo falta.** Los .MOV llegaron H.264 SDR bt709, 2160×3840 vertical, 30 fps, sin rotación
  (el iPhone está en "Más compatible"). El proxy ahora marca bt709 explícito y `preparar` avisa si un
  archivo llega en HLG/PQ.
- **Whisper 1.5.5 no sirve para cortar por sí solo.** Pega las palabras sin huecos y se come el
  silencio del arranque (decía que hablaba desde el segundo 0 y la voz empezaba en el 4,0). Además
  emite `[AUDIO_EN_BLANCO]` como si fuera una palabra de 10 s (el corte salía de 27 s en un video
  de 18,6). Solución: `silencedetect` de ffmpeg (-35 dB, 0,25 s) da los tramos con voz, y
  `alinearAVoz` (corte.js) reparte las palabras sobre esos tramos por programación dinámica
  (duración esperada según letras + premio por coma o punto al final del tramo). Las marcas entre
  corchetes se descartan.
- **Ruido al arrancar:** el toque en la pantalla deja un sonido de 0,1-0,3 s que se llevaba la
  primera palabra. Los tramos de menos de 0,6 s aislados por 1 s de silencio se tratan como ruido
  (medido después de quitar los chasquidos, si no cuentan como vecinos).
- **Cortes de centésimas:** una pausa de 0,5 s con el aire de los bordes quitaba 0,2 s y se veía
  como un tic. Ahora solo se corta si se ahorran 0,25 s o más (`recorteMin`).
- **Subtítulos:** `createTikTokStyleCaptions` juntaba el final de una frase con el comienzo de la
  otra, y entre dos videos sin espacio ("tan bien.La genialidad"). Paginación propia en Vertical.jsx:
  corta en puntuación, pausas, 1,2 s o 5 palabras. `@remotion/captions` salió de las dependencias.
- **Whisper escribe "chat GPT":** `metraje.correcciones` en la pieza (`[{ de, a }]`) funde las
  palabras en el subtítulo y se reaplica en cada `npm run vertical`.
- **Zona de Instagram:** la etiqueta estaba en y=150, dentro de los 220 px que tapa la interfaz.
  Etiqueta a 232 y gancho a 312.
- **Gancho y CTA:** "¿Sientes que no entiendes la IA?" dejaba "IA?" sola en una línea; un CTA de
  más de ~34 caracteres parte el botón en dos líneas. Mirar el fotograma, no suponer.
- El `.env` del PC era el del agente anterior y no tenía `CARPETA_REDES`: se agregaron las variables
  del estudio al final sin borrar las viejas.
- Pendiente: el cierre (3,5 s) queda en silencio; con metraje propio podría llevar una cola de la pista.

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
