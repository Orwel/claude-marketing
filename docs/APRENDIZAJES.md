# Aprendizajes

Bitácora viva: lo que falló, cómo se resolvió y lo que le gusta o no a Juan David.
Se lee al empezar cada sesión (lo pide `CLAUDE.md`). Lo más nuevo, arriba.

## 2026-09-28 (noche) · Metricool

- **Metricool no sube archivos locales:** `createScheduledPost` recibe URLs públicas y las
  "normaliza" (las copia a sus servidores). Un enlace de Drive privado falla con
  `Failed to normalize media`. Acepta enlaces de Drive si Drive está vinculado en la cuenta de Metricool.
- **Los MP4 pesan 55–160 MB** (13–16 Mbps): el plan gratis de Supabase (50 MB por archivo) no sirve.
- **Calendario en `calendario/AAAA-MM.json`**, sacado de la parrilla v2 del FigJam y ampliado a las
  tres cuentas. Hoy (28-sep) Metricool solo tiene Instagram de juanda.trifuerza.
- Artículos de LinkedIn: Metricool no los publica, van a mano.

## 2026-09-28 (tarde) · videos fuera del plan, demos completas y el método web

- **Gusto:** animaciones al estilo de contrappto.com y trifuerza.co/legal, pero **el método, no la
  copia**: ajustado a lo que dice cada video. Quedó en `remotion/kit/` y en ESTANDAR §4a.
- **No mezclar productos:** la publicidad de desistimiento tácito es de Trifuerza Legal, no de
  Contrappto (lo corrigió él). Cada producto con su mundo visual y sus textos.
- **Trifuerza en navy** desde ahora (no le gustó el blanco). Trifuerza Legal usa su dorado #C9A227.
- **Nada pendiente de overlay:** las demos se llenan con la grabación de la app (en un celular 3D,
  datos reales tapados con rótulos genéricos) o con escenas animadas. `render.js` solo manda a
  `_pendiente-overlay` una demo con un hueco sin escena.
- **Contrappto sin subtítulos** era un error de marca: toda palabra dicha va en pantalla. Activados.
- **Tarjeta final:** el llamado sale de la pieza (`variantes.<cuenta>.cta`, `null` para quitarlo); no
  se pide "Comenta CLASE" en un video que no lo dice.
- **LinkedIn 16:9 desde el vertical salía con franjas a los lados** (Contrappto, todo octubre): armar
  desde el vertical solo sirve para 4:5. En 16:9 se renderiza el diseño horizontal propio. Los
  LinkedIn de V05, V10 y V11 de Contrappto (del lote anterior) siguen con franjas: rehacerlos si él lo pide.
- **Material propio** (PlatziConf): fotos y clips como polaroids en 3D en el momento exacto en que se
  nombran. Las fotos del iPhone ya vienen giradas bien al pasarlas por ffmpeg.
- Whisper con palabras pegadas a comillas (`de"nunca`) no encuentra el ancla de un gráfico: el aviso
  `⚠ no se dice` lo delata; se ancla a otra palabra de la frase.

## 2026-09-28 · cierre de octubre (54 videos) y robustez del render

- **Subtítulos que se perdían con los golpes:** se ocultaba la página entera y el golpe solo mostraba
  3 palabras ("juez federal seis casos" desapareció). Ahora cada palabra sale una vez, en subtítulo o
  golpe, y `npm run revisar` lo comprueba; `render.js` no renderiza si falla.
- **"ERR_CONNECTION_RESET / Could not extract frame from compositor"** con el equipo cargado (~1 de
  cada 20 renders): no es disco (había 147 GB libres). `render.js` reintenta solo con `--concurrency=3`.
- **LinkedIn armado con un vertical viejo:** si el vertical fallaba en la corrida, el LinkedIn salía
  del archivo anterior en disco. Ahora se niega.
- **Gusto:** la etiqueta de serie no va en todos los videos; logo oficial de Trifuerza (Drive) arriba
  a la izquierda en juanda y trifuerza; todo "nivel cinematográfico".

## 2026-09-27 (noche, 4) · la causa real de "te comes lo que digo"

- **Desfase de audio en los .mov del iPhone:** el stream de audio arranca ~0,73 s después del video
  (`start_time` del audio). El `.wav` de análisis (Whisper y detección de voz) empieza en 0, así
  que todo corte caía 0,75 s antes: silencio al inicio y el final de cada frase comido (el
  "inscríbete" perdido). `armar` ahora corre voz y palabras con `desfaseDe` (ffprobe). **Revisar el
  desfase en cualquier pipeline que corte con tiempos medidos sobre un audio extraído**:
  `src/vertical/preparar.js` extrae igual y puede tener el mismo error.
- **Ruido de fondo (camión) tomado como voz:** la detección mide solo la banda de voz
  (300–3400 Hz), y el umbral es el mayor entre piso + 6 dB y voz fuerte (p97) − 22 dB.
- **Tramos con voz sin palabras se botaban** (Whisper comprime tiempos): `alinearAVoz(..., sinVacios)`.
- **"Estática rarita":** eran los efectos, no el corte. El click (ráfaga de 3,2 kHz sin ataque) y
  la campanita FM (armónicos metálicos sobre 5 kHz). Ahora son tonos puros con ataque de 4–5 ms:
  los agudos sobre 5 kHz de la pista bajaron de -21 a -41 dB. **Regla: efectos sin agudos duros.**
- **Se agacha lejos de la cámara en un cierre:** `seguirPersona` ubica a Juan David por el
  movimiento entre cuadros (el trípode no se mueve) y la outro dividida se centra y hace zoom en él.
- Subtítulos con mayúscula al empezar el video y tras punto; sin comillas sueltas de Whisper.

## 2026-09-27 (noche, 3) · "no tiene musiquita" y "te estás comiendo cosas que digo"

- **El corte se comía palabras:** con umbral = piso + 10 dB, las sílabas suaves en plena frase
  (-31 a -35 dB) contaban como silencio. Ahora piso + 6 dB, silencio mínimo 300 ms, aire 100 ms
  antes y 160 ms después; solo se recortan pausas de más de ~0,4 s. Cache `<base>.voz3.json`.
  **Regla: más vale una pausa corta de más que una sílaba de menos.**
- **La música no se oía:** se agachaba 9 dB bajo la voz, que ocupa todo el video. Ahora es la
  receta del webinar (pad, arpegio con eco, bombo, contratiempo tonal), unos 6 dB bajo la voz y
  solo 3 dB de ducking. **Cada pieza con su propia música "distinta aunque similar"**: `estiloDe(slug)`
  elige progresión, tonalidad, tempo y patrón.
- **"Llénalo todo de iconos y motion graphics":** capa de chispas (icono + palabra) que sale sola de
  las palabras con peso (`ICONOS` en `remotion/montaje/linea.js`), una cada 1,8 s como mucho, fuera
  de los paneles, del gancho y de la outro.

## 2026-09-27 (noche, 2) · correcciones a la plantilla Montaje (V02, V06)

**Gusto**
- **Sin intro grabada.** No le gustó: el video arranca con la primera frase del tema y el gancho
  animado encima. `armar` ya no la pone (una pieza la pide con `conIntro: true`).
- **Ritmo:** "corta las partes donde no hablo y auméntale velocidad". Silencios internos a 200 ms
  y todo a 1,12×. Más de ~1,15× la voz se oye apurada.
- **Música y soniditos presentes**, no de fondo casi inaudible: música a -22 dBFS RMS que se agacha
  9 dB con la voz; pop en cada acercamiento y en cortes con cambio de encuadre.
- **Transiciones y zooms como la versión webinar:** acercamientos de golpe (1,15×, entran en 6
  cuadros), empuje de cámara 1,12 alterno en cortes, barrido diagonal de marca con su sonido tonal.
  "No bajes la calidad porque sean muchos": nada de renders a menor escala para ahorrar tiempo.
- **Outro dividida:** él en la mitad de abajo (cerrado a 1,35×: el cierre está en plano abierto) y
  arriba el CTA animado en grande.

**Técnico**
- **El corte no cortaba:** `silencedetect` con umbral fijo de -35 dB mira picos, y el ruido de la
  calle nunca bajaba de ahí: intro y cierre salían enteros (hasta 8 s mudos antes de "Comenta
  clase"), el cuerpo de V02 en 2 tramos. Ahora `vozDe` mide RMS en ventanas de 100 ms y el umbral
  es el piso de ruido del clip (percentil 10) + 10 dB. V02 pasó de 89,8 s a 62 s. Cache nuevo:
  `<base>.voz2.json`. Necesita el ffmpeg completo (el de Remotion no trae astats/ametadata).
- **La aceleración nunca se aplicaba:** pedía tramos de más de 4 s que no fueran el último; con 2
  tramos ninguno calificaba.
- **Palabra resaltada con golpe de escala:** al crecer se come el espacio con las vecinas. Cada
  palabra va en su caja con margen fijo, y la resaltada con margen propio.
- **Velocidad del render:** en el portátil (Ryzen 5 5500U, sin GPU dedicada) un video de ~75 s tarda
  10–12 min; el empaquetado previo solo son ~17 s. Probar el filtro de color o la concurrencia no
  mueve la aguja: el salto real sería Remotion Lambda (estimado US$3–8/mes), pendiente de decisión.

## 2026-09-27 (noche) · correcciones de Juan David a la versión webinar

- **No le gustó nada el whoosh de ruido:** "suena como la estática de una pantalla de TV" (el swish
  del gancho y los barridos). Todos los efectos de `sintetizarVertical` son tonales ahora: swish =
  tres tonos que suben una octava; barrido = acorde que crece al revés hasta el corte + golpe grave;
  subida = tono que sube dos octavas; teclas y contratiempos = tics senoidales. **Regla: nada de
  ruido blanco en los efectos.** Del resto del video dijo "súper bien".
- **No le gusta cómo se le ve el pantalón** en los planos de cuerpo entero (IMG_3772).
  `metraje.encuadres` (`{ "IMG_3772.MOV": { escala: 1.45, origenY: 5 } }`) recorta ese plano de la
  cintura para arriba. Regla: planos abiertos, de la cintura para arriba. El original ya no estaba en
  Drive, así que el recorte sale del proxy de 1080 (algo menos nítido).

## 2026-09-27 (tarde) · render de la versión webinar

- **Render muerto en el cuadro 0:** el `delayRender` de OffthreadVideo pasó los 28 s con el equipo cargado (Whisper y una copia desde Drive a la vez). Timeout a 120 s en `remotion.config.mjs`.
- **El ffmpeg de Remotion es mínimo:** trae loudnorm, atempo, amix y volume, pero no afftdn/arnndn, eq, deesser, acompressor ni vidstab. Limpieza de audio, color o estabilización piden un ffmpeg completo (`winget install --id Gyan.FFmpeg -e --source winget`).
- **whisper.cpp 1.5.5 y `splitOnWord`:** `--split-on-word true` hace que lea `true` como archivo de entrada.
- **Leer de Drive es lento** (archivos bajo demanda): copiar primero a `trabajo/<mes>/00-crudo` con robocopy (sale con código 1 cuando copió bien).
- **Gusto:** cuando pide "dame el video", quiere terminado el que se está trabajando, no abrir el mes completo.

## 2026-09-27 (noche) · el mes completo con la plantilla Montaje

- **whisper.cpp 1.5.5 se salta el arranque** (en un clip empezó en el segundo 17). Se usa 1.7.6 (`.whisper17/`,
  el ejecutable hay que copiarlo de `Release/` a `build/bin/`). Sin `--split-on-word` entrega fragmentos
  ("Se", "is", " sent", "encias"): `unirTokens` en corte.js los funde; ¿ ¡ y comillas abren palabra.
- **Whisper pone la primera palabra en 0 s aunque haya 2 s de ruido de calle** y `silencedetect` a -35 dB
  no separa voz de calle. La voz se mide con RMS y umbral relativo al piso de cada clip (`<base>.voz2.json`).
- **En este portátil (Ryzen 5 5500U, 13,8 GB)**: whisper medium ≈ 4× la duración del audio; render de
  1080×1920 ≈ 0,27 s por cuadro (~8 min por video de 70 s). `--gl=angle` es 2× más rápido que swangle;
  `--concurrency=12` se queda sin RAM y el compositor falla ("Could not extract frame", "Failed to fetch…
  disk space is low" es falso): va en 6. Render intermedio en ultrafast CRF 14 y la calidad final (CRF 18)
  se codifica en la pasada de loudnorm.
- **LinkedIn no se renderiza**: sale del vertical de Instagram centrado sobre el fondo de la marca (ffmpeg,
  ~1 min). Juan David lo pidió: "es el mismo formato con otros colores".
- **No detener renders para medir**: se perdieron ~40 min de render así. Medir con la cola parada o nunca.
- **Dos sesiones editando el repo a la vez** chocan: coordinar por mensaje antes de tocar src/montaje.
- **Gusto (27-sep):** no le gustó la intro grabada ("Hay algo de la IA…"): los montajes salen sin intro.
  Quiere cortes de silencio agresivos, 1,12×, música presente, soniditos, zooms y barridos como en el video
  del webinar, más motion graphics y en la outro él en la mitad de la pantalla con el CTA arriba.
  El "foosh" (barrido de ruido) sigue prohibido.
- **Hardware:** va a comprar un Mac (M1 Pro 16 GB o M3). Al llegar: `brew install node ffmpeg`, whisper con
  Metal (transcripción en minutos), quitar `--gl=angle` y activar codificación por hardware en render.js.
  Estimado del mes completo: ~2–2,5 h en lugar de ~6–7 h.
- **Falta en el rodaje de octubre:** CIERRE_TF. Los montajes de TF salen sin cierre grabado.

## 2026-09-27 · versión webinar con motion graphics

Pidió `la-ia-que-nadie-entiende-webinar`: la misma pieza + "Cierre webinar.MOV", con motion graphics
de lo que va diciendo, música, efectos y transiciones, "muuuy profesional", al estilo de
contrappto.com y trifuerza.co.

**Gusto**
- Quiere animación tipo web (HTML/CSS), no plantillas genéricas. El lenguaje sale de los sitios:
  tarjetas de vidrio (blur 24 px, borde de medio pixel) con la barra degradada de trifuerza.co,
  la constelación de nodos con glifos y pulsos del hero de trifuerza.co, ventanas con puntos mac,
  typewriter, pastillas con aro que late y el botón con brillo (`cta-glow`) de Contrappto, curva
  `[0.22, 1, 0.36, 1]` y resortes 400/25. Referencias exactas: `contrappto/src/components/{landing,marketing}`
  y `tri-app/tri-app2/components/{TrifuerzaConstellation,hero,ecosistema}`.

**Técnico**
- **Drive cambió de estructura** a mitad de sesión: `Redes sociales/Octubre/Raw` y `Octubre/Edited`
  (los 3 videos de la primera prueba y los renders viejos ya no están). `carpetaDelMes` acepta
  `2026-10 octubre` u `Octubre`; `.env` con `SUBCARPETA_GRABADOS=Raw` y `SUBCARPETA_EDITADOS=Edited`.
  Las piezas se rehacen igual: proxies y transcripciones viven en el repo (`public/crudos`, `trabajo/`).
- **npm parte los nombres con espacio** ("Cierre webinar.MOV" llega como dos argumentos): `preparar` los une.
- **La voz de cada grabación sale a otro volumen** (7 dB entre IMG_3772 y el cierre). `preparar` guarda
  `volumen` por segmento para llevar la voz a -24 dBFS RMS sin pasar -1 dBFS de pico. El ffmpeg de
  Remotion no trae `volumedetect`: se mide en Node sobre el WAV.
- **Gráficos anclados a palabras**, no a segundos (`pieza.graficos`, `en`/`hasta`/`marcas`): si cambia
  el corte, siguen cayendo en su palabra. `hasta` y `marcas` se buscan *después* de que entra el gráfico
  (un `hasta: "La"` encontraba el "la" del segundo 2).
- **Modo tarjeta**: con un gráfico "arriba", el video se encoge al 48 % abajo. Los subtítulos se mueven
  a la franja entre gráfico y tarjeta: encima de la tarjeta caían sobre la cara. El video se agranda
  solo cuando el gráfico ya salió; si crecen a la vez, queda un fantasma del gráfico sobre la cara.
- Un sello grande que ya dice la palabra ("IMPOSIBLE") oculta el subtítulo: repetido se ve torpe.
- Sonido: los tiempos de cada gráfico están en `remotion/graficos/tiempos.js`, que leen el componente
  y el sintetizador; así el pop cae en el cuadro en que aparece la ficha. Música 100 BPM ~12 dB bajo la
  voz; sube en la tarjeta final.
- `*tan bien*?` separa el "?" (queda como palabra aparte): el asterisco va después del signo.

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
