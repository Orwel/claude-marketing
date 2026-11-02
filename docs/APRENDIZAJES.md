# Aprendizajes

Bitácora viva: lo que falló, cómo se resolvió y lo que le gusta o no a Juan David.
Se lee al empezar cada sesión (lo pide `CLAUDE.md`). Lo más nuevo, arriba.

## 2026-10-19 · SOFA10: Bélula ganó, fuera el concurso

- **Cambio de estrategia:** la página web ya tiene ganador (Bélula). SOFA10 dejó de pedir votos: salen el
  "¿quieres que se gane una página web gratis? Vótalo", el cierre de la votación (151344) y Lucía (otra
  concursante). Lo cortado lo cubren la música, los barridos y una cortinilla "misión". SOFA11 todavía cierra
  con la votación (`cierre_web` en `conceptos.py`).
- **Locuciones grabadas aparte** (Drive, nombre con número: "Bodega Arboleda 7" = intro, "10" = outro): llegan
  por el conector de Drive (G: no las tenía sincronizadas). `voz: { archivo, en }` en el `titulo` o en
  `pieza.final` (`src/sofa/armar.js` → `conVoz`): la escena dura lo que la voz, sus palabras salen en el diálogo
  con el nombre de Juan David y la música se recoge igual que bajo la voz del metraje. Palabras en
  `public/sofa/voces/<nombre>.json`; Whisper pone la primera en 0 s, así que se reescalan al tramo con voz
  medido con silencedetect. Volumen: medir en estéreo (en mono ebur128 da 3 dB menos) y llevar a −16 LUFS.
- **Intro `torneo` con `ganador`:** una sola tarjeta dorada unida al trofeo, sin los demás participantes.
- **Música celta en 8 bits: descartada** ("suena muy pixelada"; `musicaCelta` queda en `src/audio/arcade.js`).
  Pidió una canción celta real y libre de derechos: "Celtic Impulse" de Kevin MacLeod (incompetech.com, CC BY 4.0,
  crédito obligatorio en el copy), en `trabajo/musica-libre/`. Con `pieza.cancion` la pista Arcade lleva solo
  efectos; la canción se mezcla con ffmpeg (sidechaincompress con la voz como llave, ratio 2,5): queda ~−20 dB
  sola y ~−26 bajo la voz. Para música "bonita" de otros videos: bibliotecas reales con licencia verificada
  (Incompetech, Pixabay Music), nunca síntesis de instrumentos acústicos ni 8 bits si no es un video arcade.
- **Cambiar solo la música sin re-renderizar:** copiar la pista nueva a `trabajo/paquete-sofa/public/audio/arcade/`,
  `remotion render <paquete> <id> x.wav --codec=wav` con los mismos `--gl=angle --offthreadvideo-cache…` del render
  (sin ellos falla "No frame found") y montar con ffmpeg (`-c:v copy` + loudnorm). ~2 min en vez de ~20.
- **La "Í" mayúscula no existe en la fuente pixel** (salía "ESCR±BENOS"): CTAs en pixel sin esa tilde.
- **Drive para escritorio fallando** ("recursos insuficientes", error 1450): el render queda en
  `trabajo/2026-10-sofa/render/` y se reintenta la copia aparte.

## 2026-10-13 (noche) · SOFA06: Maka con el texto corrido

- **Whisper corrio una escena entera ~1 s** (IMG_4875): puso "Bueno, hay varias que me gustaría" encima de la
  pregunta de Juan David, asi que el texto salia sin que Maka hablara y el corte de silencios se comia la frase
  real (12,8-14,6 s, que para el sin palabras era silencio); y apilo "porque soy muy… me pierdo muy fácil" en
  0,1 s, antes del `hasta`, que cortaba antes de decirlo. El corte de inicio caia encima de su "…de Soul Eater".
- **Arreglo: `anclas`** en la escena (`[frase, desde, hasta]`, segundos del original medidos con astats a 40 ms
  sobre el proxy): `armar.js` reparte las palabras de esa frase por letras en el rango y reordena. Para saber que
  se dice en cada tramo sirve transcribir ventanas cortas con `tr-tmp.mjs` (sus tiempos internos no son fiables:
  la primera palabra siempre sale en 0) y ubicarlas con la energia. Una ventana de 2 s colgo whisper.cpp
  (`taskkill /IM main.exe`): mejor ventanas de 4 s o mas.
- **SOFA06 partido en dos (13-oct, tarde):** con cinco personajes quedaba en 86 s y a Juan David le parecio largo.
  Parte 1 (SOFA06, `sofa-mecanica`) abre con Freezer + Revan + Angemon (poderes); parte 2 (SOFA07,
  `sofa-mecanica-2`) abre con Maka + el duo (moverse por el mundo). Las escenas se movieron tal cual; solo cambian
  las cortinillas. Gusto: ~1 min por video, y con 4-5 personajes mejor partir que alargar.
- **Intros por parte (13-oct, noche):** a Juan David le gustaron las intros contextuales de SOFA06/07 (combate por
  turnos; mapa con niebla y teletransporte) y pidio lo mismo para SOFA02 (espejo de identidad: el reflejo cambia
  de traje por cada rasgo dicho hasta "¡ERES TÚ!"). Toda parte lleva "PARTE N" dentro del recuadro del titulo
  (`titulo(parte=...)`), no en la serie: SOFA02/03, 06/07, 08, 10/11. SOFA01 ya estaba publicado y no se toco.
- **Nombres de franquicia mal oidos (SOFA08, Trunks):** la correccion "maquillero" → "Androide 17" estaba mal: dice
  "Maki Gero" (el Dr. Gero del doblaje latino), y "hacer" era "a Cell". Si una correccion de nombre propio no sale de
  lo que se oye, preguntar a Juan David antes de ponerla; las de una sola escena van en `correcciones` del clip.
- **"Perdieron definicion" (13-oct, noche):** el iPhone graba 4K (45 Mbps) y `armar.js` bajaba todo a proxies
  1080×1920; el zoom al que habla (1,2–1,45×) ampliaba esos 1080 (~750 px reales), con tres codificaciones encima
  (Remotion en JPEG calidad 80 por defecto + CRF 14 ultrafast, final CRF 18). Arreglo: proxies a la resolucion
  nativa (iPhone 2160×3840, DJI 1080×1920; un proxy viejo de otra resolucion se rehace solo), Remotion con
  `--jpeg-quality=100 --crf=10 --x264-preset=veryfast` y final CRF 16 `slow`. La salida sigue en 1080×1920 (el tope de
  Instagram). Un cuadro 4K tarda en extraerse: los `still` de prueba necesitan `--timeout=180000`. El DJI se grabo a
  1080: recomendar grabarlo en 4K. SOFA03–13 se rehicieron; SOFA01/02 ya estaban publicados y pautados.
- **Musica, como quedo (14-oct):** tras la orquesta, se probaron 8 variantes de chiptune con "perrengue" (chip.js) en
  un muestrario de 1:50; Juan David: "lo del principio suena triste… suena punzante… te pones muy creativo, este
  metodo no nos funciono… muestrame solo una cancion corta de 10 s y hazlo mas rapido". Se probo el original a
  152 BPM, y luego (aun "muy rapida y no varia tanto") el original a 140 BPM con capas por secciones de 2
  compases: "uff esa es". Gusto: lo que ya aprobo se acelera o se ajusta, no se reinventa; muestras de 10 s, una a la vez.
- **Plano medio (14-oct):** acercar las tomas abiertas de SOFA03-13 midiendo la cara con caras.py: Maka (iPhone 4K)
  de 1,3/1,38 a 1,6/1,65x; intros y cierres DJI de Juan David de 1,12 a 1,3x. Las tomas del iPhone de Freezer,
  Kaneki y el Rosario ya estaban cerca (cara ~0,12).
- **Orquesta sintetizada: descartada (14-oct).** Para quitar "el mismo tuntun" del chiptune se sintetizaron violin,
  saxo y piano por sintesis aditiva (`src/audio/orquesta.js`, ya borrado; muestrario en `trabajo/2026-10-sofa/muestrario-musica.mp3`).
  Juan David: "suena increiblemente horrible… el sonido de antes estaba mucho mejor". Alcanzaron a salir SOFA03 y
  SOFA04 con ella antes de detener la tanda. Leccion: instrumentos acusticos no se fabrican desde codigo; pedir
  "perrengue" es energia (ritmo sincopado, bajo que salta, capas que entran), no mas instrumentos. Mostrar un
  muestrario ANTES de lanzar renders con un sonido nuevo.
- **Disco lleno con proxies 4K:** el render copiaba TODOS los proxies a `trabajo/publico-sofa` y el bundle los volvia a
  copiar (~5 GB cada uno) y los brutos CRF 10 quedaban en `render/`. Ahora la carpeta publica lleva solo los proxies de
  las piezas que se renderizan y el bruto se borra apenas sale el final.
- **Varias sesiones renderizando a la vez:** otras sesiones encadenaban `npm run sofa` y comparten
  `trabajo/paquete-sofa`; el primer render de SOFA06 fallo ("Failed to fetch ... proxy") con otro corriendo. Antes
  de lanzar, revisar procesos (`Get-CimInstance Win32_Process` con `sofa/render.js`) y esperar a que la cola lleve
  unos minutos quieta.
- **Señal de alarma:** varias palabras con el mismo segundo en el spec (`[20.5] porque [20.5] soy [20.5] muy...`)
  = Whisper perdio el hilo ahi; medir antes de escribir `desde`/`hasta`.

## 2026-10-13 (tarde) · SOFA09: "He desarrollado" y "explicándolo" cortados

- **Arranque:** el spec ponia "costa." en 4,8 y "He" en 4,9; en realidad hay risas de 3,1 a 4,4 y el "He" va de
  4,45 a 4,69. El primer intento (4,74) se equivoco: el hueco de 4,73 en astats era el **cierre de la "d"** de
  "desarrollado", no una pausa, y salio renderizado igual de cortado. Whisper sobre un recorte suelto **se traga
  la primera palabra corta** (da "desarrollado" empiece donde empiece), asi que no sirve para medir un arranque.
  Lo que si sirve: pasarle el audio con contexto (desde 2 s antes) y **silenciar todo lo anterior al corte
  candidato**; si sigue oyendo "He desarrollado", el corte es bueno (4,43 si, 4,74 no). Nuevo `inicioDuro` en
  `armar.js`, espejo de `finDuro`; con el, `desde` va al mismo punto, un `ancla` pone la primera frase en su
  rango real (el texto iba 0,4 s tarde) y `omitir` saca lo que quede antes ("monstruos", "en la costa").
  Ojo: `Arcade.jsx` sube el volumen de cada tramo en 2 cuadros; el corte va un hueco antes de la primera silaba
  (aqui 4,38, no 4,43) para que la rampa no la suavice.
- **Final:** Whisper comprimio "comenta video y haremos un video explicándolo" en 26,8–28,6; la voz real va hasta
  29,93 (Whisper con `-ml 1` sobre el recorte + astats). El corte en 28,86 dejaba el texto en pantalla sin el audio.
  Arreglo: `anclas` con el rango medido, `finDuro=30.4` (feria sin voz hasta 30,5) y `omitir` para "¿Casi?" y
  "Tenemos que irse ya" (otra persona). Con el ancla, "¿Casi?" queda intercalado: cada frase de `omitir` va aparte.
- **Una palabra mal oida cambia el `vez` de un golpe:** dice "este videojuego" (no "este video"); al corregirlo,
  COMENTA VIDEO paso de `vez=2` a la primera aparicion.
- **Sesiones en paralelo:** otra sesion edito `conceptos.py`/`armar.js` mientras tanto (cambio `tiempos` por
  `anclas` y se llevo el `omitir`). Releer la pieza justo antes de armar, y no correr `conceptos.py`/`sofa-armar`
  completos mientras otras piezas se renderizan: se usa la via de una sola pieza.

## 2026-10-13 (noche) · SOFA13: retrato de Bogo Fighters y metaforas de juego de peleas

- **Retrato que parte la cara:** el recorte automatico de Bogo Fighters (`R(...)` a 10 s) dejaba media cara en la
  ficha y en la cortinilla vs. Juan David mando la imagen: va como `RETRATO_BOGO = {"fijo": ".../bogo-fighters.png"}`
  (mismo mecanismo que su retrato). Cuando el no queda conforme con un recorte, imagen fija y listo.
- **"El puño parece una arepa":** un objeto suelto no lee como metafora. En un video de un juego de peleas, la
  metafora es la **interfaz del genero**: efectos nuevos en `Efectos.jsx` (sin tocar `puño`, que usan otros videos):
  `pelea` (barras de vida, reloj, ROUND 1 → FIGHT!, `escenario`), `seleccion` (SELECT YOUR FIGHTER con siluetas "?":
  los personajes del juego no se inventan), `invocacion` (circulo de runas y tres ASSIST! a los lados) y `perfecto`.
  Todos arriba (330–660) o en las orillas: la cara y la zona de texto quedan libres.
- **Pastilla larga se sale del marco:** "LA CIUDAD DE BOGOTÁ" en estilo `pastilla` desbordaba (el tamaño de letra no
  descuenta el relleno de la pastilla). Con mas de ~14 caracteres, usar `golpe`/`xp` o acortar a la palabra clave.
- **Tres `npm run sofa` a la vez:** `tasklist` no muestra la linea de comando y no vi que otras sesiones estaban
  renderizando (sofa-pareces-2, sofa-mecanica); mi `--cuadrosAuto` borro y rehizo `trabajo/paquete-sofa` en medio.
  Antes de lanzar, mirar `Get-CimInstance Win32_Process` filtrando `render.js`. Para revisar cuadros mientras otro
  renderiza: bundle aparte (`remotion bundle ... --out-dir=trabajo/paquete-sofaNN --public-dir=trabajo/publico-sofa`)
  y `remotion still` desde ahi; el render final espera a que no quede ningun `render.js`.

## 2026-10-13 (noche) · SOFA03: "en la firmeza" no salia

- **Dos golpes a menos de 0,8 s se pisan:** DUREZA (47,8 s) y FIRMEZA (48,5 s) en la respuesta de Mavuika. `golpesDe`
  descarta el segundo si entra antes de que el primero cumpla 0,8 s tras su clave y su clave ya paso; como la escena
  termina 0,7 s despues, "en la firmeza" no salia ni en golpe ni en caja. Arreglo: un solo golpe con la frase entera
  ("EN LA DUREZA, EN LA FIRMEZA"). Si dos golpes caen tan cerca, juntarlos en uno.
- **Correccion puntual = solo esa pieza** (Juan David: "lo mas rapido y que no dañemos las otras"):
  `python -I trabajo/2026-10-sofa/conceptos.py <slug>` reescribe solo esa pieza; luego `npm run sofa-armar -- <slug>`,
  `revisar.mjs <slug>` y `npm run sofa -- <slug>`. Sin argumento sigue reescribiendo todas (y entonces si va el
  `sofa-armar` completo). Nunca correrlo con el slug de una pieza que se esta renderizando: le borra el `generado`.
- **Renders cruzados entre sesiones:** varias sesiones lanzaban `npm run sofa` a la vez; comparten `trabajo/paquete-sofa`
  y `publico-sofa`, y el bundle de una borraba el paquete de otra a mitad de render (404 del proxy de Eren, luego EISDIR
  en el reintento). `render.js` ahora toma un candado (`trabajo/sofa-render.lock`, con pid; uno muerto se limpia solo) y
  el segundo espera su turno. Juan David: "todos los re renders se estan cruzando".
- **Golpe largo pegado arriba del marco:** el flex de `MarcoPixel` va en el div externo y los hijos viven en uno
  interno, asi que el golpe no se centra; con una frase de 27 letras el texto salia chico y arriba, con el marco vacio.
  Arreglo sin mover los golpes aprobados: `lineas` opcional en el golpe (`G(..., lineas=["EN LA DUREZA,", "EN LA FIRMEZA"])`)
  pinta la frase en renglones, mas grande y centrada; los golpes sin `lineas` quedan igual.

## 2026-10-13 · SOFA: segunda vuelta (revision de Juan David de los 13 videos)

- **Lo que no gusto de la primera tanda**, en sus palabras: textos "muy fugaces", caja y texto de enfasis "al
  tiempo" o en sitios distintos ("el ojo queda perdido"), fotos de ficha "descuadradas y pixeladas", intros y
  transiciones "genericas, el mismo concepto estilo minecraft medio feo con cero creatividad", el "halo de luz"
  (rayos) sobre el en los cierres, el TIP en minusculas que nadie lee, nombres inventados para cosplays sin
  identificar, y clips que arrancan o terminan cortados. Lo que si gusto: la intro del caballero voxel (SOFA02/03)
  y el "cuadro de dialogo o golpe, nunca los dos".
- **Zona de texto unica** (`ZONA_TEXTO` en `Capas.jsx`): el cuadro de dialogo y los golpes ocupan el mismo
  rectangulo (1200–1470). El CTA del cierre subio a 420. Las chispas (icono + palabra al lado) se apagaron:
  repetian una palabra del dialogo y saturaban.
- **Legibilidad por regla, no a ojo** (`linea.js`): paginas de hasta 10 palabras / 2,4 s, ninguna dura menos de
  0,9 s (se funden con la vecina de la misma persona), la ultima de cada escena se queda 0,9 s mas; si el crudo
  no tiene ese aire, `armar.js` deja una **cola congelada** (`cola`, ultimo cuadro quieto con empuje lento, sin
  audio). Los golpes duran al menos 1,5 s, llevan hasta 10 vecinas antes y 6 despues (pausas de hasta 0,9 s no
  cortan la frase), cada palabra pertenece a un solo golpe (la clave de uno nunca es vecina de otro) y si dos
  se encimán el segundo espera a que salga el primero. `revisar.mjs` ahora marca fugaz todo lo que dure < 500 ms.
- **El corte de inicio** pisaba la primera silaba ("He desarrollado" del Rosario): el limite de inicio puede
  entrar 50 ms en la cola de la palabra anterior y el tramo arranca 0,15 s antes de la primera palabra.
- **Retratos por deteccion de caras** (`trabajo/2026-10-sofa/caras.py` con OpenCV 4, `pip install
  "opencv-python-headless<5"`; la 5.0 ya no trae `CascadeClassifier`): por cada (clip, segundo) guarda las caras
  en `caras.json` y una hoja con cuadricula en `caras/`; `conceptos.py` elige la cara mas cercana al `foco` de
  esa persona y, para mascaras y cascos (Freezer, Hollow Knight, Von Lycaon, Capitano, Revan, Angemon,
  Operador), una caja manual leida de la hoja. Retrato a 64 px y 20 colores (44/14 era una mancha). Revisar
  siempre `retratos-hoja.png` antes de renderizar.
- **Intros por tema** (`remotion/arcade/Intros.jsx`, pixel art 2D con divs): protesto (juicio), tesoro (lluvia
  de monedas y cofre: "monedas regadas que representen riqueza"), plataformas (el caballero del Claustro
  saltando), torneo (llaves y trofeo), tienda de RPG, cartuchos a la consola y maquina arcade. Se conservan
  martillo (SOFA01), personaje (SOFA02/03), moneda (SOFA04) y la cinematica del juego (SOFA09). Sin TIP.
- **Cortinillas de nivel** (`remotion/arcade/Cortinillas.jsx`), una distinta por escena y contextual al que
  viene: vs (pelea), seleccion de personaje (con los retratos de la pieza), encuentro ("¡X salvaje apareció!"),
  mundo2d ("NIVEL N" + paisaje pixel del mundo), jefe (franjas rojas y barra de vida, para villanos), resultado
  (STAGE CLEAR con el `resumen` de la respuesta anterior) y mision (registro de misiones). El mapa voxel queda
  solo como respaldo sin `estilo`.
- **Personajes sin identificar** van con `anonimo: true`: sin ficha y la pestaña del dialogo dice PLAYER N
  (el duo del plataformeo). Un nombre mal puesto es peor que ninguno.
- **Cambios de contenido:** Leo → Cha Hae-in (Solo Leveling), "a todos los cazadores excepto Sung Jinwoo";
  el Operador va como "Fuerzas especiales · Call of Duty" por las gafas de vision nocturna de cuatro tubos
  (pendiente de confirmar); Von Lycaon y Zenless los dice Juan David (turno corregido) y se corta antes del
  "mil gracias"; en mecanicas queda **un solo video** (SOFA06: Revan, duo, Angemon, Maka, Freezer; SOFA07 se
  retira a `_reemplazados`) sin el Jefe Maestro (toma mala) ni el Sombrero de paja; SOFA05 en orden Freezer,
  Kaneki y Rize, Trunks; SOFA12 sin el b-roll que partia a Nicolas; el kagune (calamar) se quito.
- **Duracion:** el minuto es orientativo; "maximo por ahi 1:20, no sacrificar calidad por tiempo". SOFA06 queda
  en ~82 s a 1,1×.
- **Segunda pasada (misma tarde):** golpe y dialogo en un marco oscuro que crece con el texto (el texto blanco suelto
  sobre la feria no se leia y se salia del campo); `finDuro` (corte medido con astats cuando Whisper ubica mal la
  palabra siguiente: "el descanso eterno") y `omitir` (frases que Whisper pego al tramo pero no se dicen: "puede
  usar su don", "La Vasija Pura"); retrato fijo de Juan David (`fijo` en `retrato`) con la imagen que el mismo
  eligio, solo donde el recorte automatico no gusto. SOFA01 abre con la Trifuerza (el martillo "parece un pollo"); por lo mismo el intro `protesto` (SOFA08)
  quedo sin el `MARTILLO2D`: sala de juicio y globo "¡PROTESTO!" solos. Ningun martillo en pixel art;
  la estatua gris de SOFA02 es la Estatua de Dios (Solo Leveling), cortinilla de jefe. Un cambio en `conceptos.py`
  reescribe TODAS las piezas sin `generado`: siempre `npm run sofa-armar` completo despues, o el render de las otras
  falla con "sin armar". Y nunca dos `npm run sofa` a la vez: comparten `trabajo/paquete-sofa`.
- **SOFA04, Capitano (tercera pasada):** el `finDuro` de 39,75 seguia comiendose "eterno". La medicion anterior
  confio en que el "¿Cuál es" de Whisper (39,7) era la pregunta siguiente; el astats con ventanas de 30 ms muestra
  voz continua hasta 40,07 y luego 2 s de feria (-34 dB): ese "¿Cuál es" es la cola de "eterno" y la pregunta real
  de Juan David arranca a 42,11 (-7 dB, voz de micro). Al medir un corte, buscar **donde vuelve a hablar alguien
  de verdad** (el siguiente pico fuerte), no donde Whisper dice que empieza la palabra siguiente. Ahora `finDuro=40.2`.

## 2026-10-13 (tarde) · SOFA02: el spec "verificado" iba 2 s por delante del audio

- **Sintoma** (Juan David): en Hollow Knight el texto decia "soledad" mientras el audio decia "perseverancia"; en
  Aurora/Von Lycaon el texto se adelantaba a la voz, la presentacion de Von Lycaon salia con la voz de Aurora y el
  corte se comia la respuesta "en el respeto hacia los demás".
- **Causa:** no era el render (correlacion audio del MP4 vs proxy: 0,04 s). Era la alineacion de `voz.js`: con el
  ruido de la feria los "tramos de voz" por energia no separan las voces suaves (mascara, entrevistada lejos del
  microfono) y `alinearAVoz` comprimio las frases 1,5–3 s antes. El spec heredo el error, y con el los `desde`/`hasta`.
  La transcripcion cruda de Whisper estaba mas cerca de la verdad que el spec.
- **Como se mide de verdad:** transcribir ventanas cortas del proxy (1,5–2,5 s, con `apad`) y ver con que palabra
  empieza o termina cada una; astats solo sirve para la voz fuerte de Juan David. Cada ventana tarda ~2 min en CPU:
  pocas y bien elegidas. Para revisar un render, transcribir el MP4 final y comparar con lo que dice la pieza.
- **Arreglo:** `anclas` [frase, desde, hasta] en la escena (armar.js) ahora elige la aparicion mas cercana al rango
  (la pregunta "¿Y en qué te pareces…?" se repite en el mismo crudo). Hay que **anclar el clip entero**, no solo el
  tramo: una frase sin anclar se queda en su tiempo comprimido y se cuela en el tramo vecino ("Hoy estamos con Von" al
  final de Aurora, "mil gracias" en medio de Von Lycaon). Las dos escenas de un mismo crudo comparten la lista.

## 2026-10-12 · SOFA: plantilla Arcade (videojuego)

- **Pedido:** editar las entrevistas del SOFA "muy videojuego, pixel art, con three.js, zoom al que habla,
  superpoderes según el personaje, metáfora visual, sin pasar de 1 min, conservando marca y logo".
  Primer video de prueba: `sofa-demanda` (¿A quién demandaría tu personaje?) en `Octubre/SOFA/Edited`.
- **Whisper medium no cabe:** con 1,2 GB de RAM libre (Opera, ChatGPT, Drive) tardaba 15 min por clip de
  45 s. El modelo `small` transcribe 54 clips en ~1 h y para elegir tramos alcanza; nombres propios y
  franquicias se corrigen a mano (`correcciones`). Si una pieza final necesita más precisión, se
  retranscribe solo ese clip con `medium` de noche.
- **El DJI no desfasa el audio** (start_time 0); los .MOV del iPhone sí (~0,7 s). `armar.js` lo mide por clip.
- **Dos corridas de whisper a la vez** (una vieja que no murió al matar `main.exe`) se pisan y duplican
  el trabajo: matar el `node` padre, no el `main.exe`.
- **Rangos de un clip se eligen con tiempos anclados a la voz** (`ver.mjs`), no con los crudos de Whisper:
  filtrar por tiempos crudos perdía la primera palabra ("Le pregunté").
- **`remotion bundle` copia `public/` entero** (3 GB con los limpios del mes) y no sigue junctions
  (EPERM al crear symlinks). Solución: carpeta pública liviana `trabajo/publico-sofa` con copias
  (`--public-dir`), 110 MB.
- **Gameplay por DevTools:** con `--headless=new` el canvas del Claustro rinde ~1 cuadro/s y el
  screencast a 1920×1080 ~7 fps. Con ventana en kiosko y screencast a mitad de resolución: ~54 fps; el
  pixel art se amplía ×2 con vecino más cercano sin pérdida. Las flechas no mueven al personaje desde el
  panel del navegador de Claude (keydown sin hold), sí con `Input.dispatchKeyEvent` rawKeyDown/keyUp.
- **three.js en el render sin GPU** funciona (`--gl=angle`): ~11 s por still de 1080×1920 incluyendo
  arranque; escenas de cubos sin sombras ni posprocesado.
- **Fuentes pixel** (Press Start 2P, Silkscreen, VT323; OFL) en `public/fuentes` como .ttf; `fuentes.js`
  acepta `formato: 'truetype'`.
- **Cambio de estrategia (12-oct, noche):** "identifica el problema de raíz". La raíz era producir antes de
  verificar. Ahora: spec por clip (`npm run sofa-spec`, palabras con segundo real y huecos de silencio) →
  pieza conceptual escrita contra ese spec (`trabajo/2026-10-sofa/conceptos.py`) → armar con avisos de
  cortes en medio de voz → cuadros automáticos (`--cuadrosAuto`) y hoja de retratos → render. Detalle en
  la skill `producir-pieza` ("El sistema").
- **Revisión obligatoria:** `trabajo/2026-10-sofa/revisar.mjs` (la corre `npm run sofa` antes de renderizar):
  cada palabra sale una vez, ninguna caja dura menos de 250 ms y la caja nunca convive con un golpe.
- **Doble alineación:** `planificarCorte` volvía a repartir por letras las palabras ya alineadas; ahora recibe
  `voz: []`. Y al mover el inicio del primer tramo, el texto se corre lo mismo (si no, iba detrás de la boca).
- **Golpe sin caja:** "no es caja vacía, es que no aparece la caja". Cuando hay golpe, la frase completa
  vive en el golpe (clave grande, vecinas pequeñas que entran cuando se dicen) y la caja de diálogo no
  sale; lo dicho durante el golpe que no es del golpe aparece en la caja apenas termina.
- **Variedad contextual:** mundos voxel por tema del personaje (`Mundos.jsx`) para niveles e intros,
  cuatro barridos que se alternan, cinemática del juego real en la carga del Rosario, y efectos por lo que
  se dice (`Efectos.jsx`). Juanda.trifuerza y Trifuerza.co se editan igual (solo cambia el contenido);
  Contrappto lleva su marca pero el mismo nivel de edición.
- **Un anchor numérico rompe todo:** `cuadroDe` recibía `hasta: 5` (número) de un efecto y, como la raíz
  carga todas las piezas, ningún still de ninguna pieza salía. `limpia` ahora castea a string y los
  parámetros numéricos de un efecto no se llaman `en`/`hasta`.
- **Lip sync en clips de feria (12-oct, 2.ª vuelta):** el umbral de voz con tope en -30 dB tomaba el ruido
  de la feria como voz (un solo tramo de 36 s) y las palabras se repartían a ojo: el texto del diálogo iba
  hasta 1 s corrido de la boca. Arreglo en `src/sofa/voz.js` (sin tope, piso + 8 dB) y `afinarConDtw` en
  `armar.js`: dentro de un tramo largo mandan los tiempos finos de whisper.cpp (`timestampMs`, DTW) como
  anclas. Juan David lo nota de inmediato: revisar siempre con `ver.mjs` que cada palabra caiga en su segundo.
- **Cortes entre frases:** el tramo arranca después de que termina la última palabra excluida y termina antes
  de la primera que no entra (`limiteInicio`/`limiteFin`). Antes se colaba la cola de la frase anterior
  ("…Uribe") o el arranque de la siguiente.
- **"Aparece doble":** el texto de un golpe que son palabras dichas ("EN LO LOCA") las quita del diálogo; un
  texto propio ("$3.000.000 AL MES") no toca el diálogo. Antes el golpe con texto propio quitaba palabras y el
  diálogo salía cortado.
- **Retratos de ficha:** el nombre lleva una huella del clip y del recorte (al mover una escena no se reutiliza
  el retrato de otra persona). Las coordenadas se sacan de un cuadro del **proxy** con cuadrícula
  (`scale=360:640,drawgrid=w=36:h=64`), nunca a ojo del crudo: la cámara se mueve y a otro segundo la cara
  está en otro sitio. Revisar la hoja de retratos antes de renderizar.
- **Jugadores en orden:** PLAYER 1 (Juan David, con ficha en la intro), 2, 3… en orden de aparición.
- **Pantalla de carga contextual:** motivo 3D por tema (`motivo`: trifuerza, moneda, mundo, personaje
  voxel del Claustro, martillo) o la cinemática del juego real (`motivo: "juego"` + `juegoFondo`), barra
  CARGANDO y un `tip` por pieza. Juan David: "en vez de un three.js que nada que ver, una cinemática del
  videojuego". Su ficha: "legal engineer, profesor universitario, desarrollador de videojuegos", nunca
  "hizo el videojuego del Rosario".
- **Cuentas:** ¿Cuánto cobraría? pasó de Contrappto a Trifuerza.co (SOFA04/05-TF; los -CTP viejos están en
  `Edited/_reemplazados`); el concurso de la página web es de Trifuerza.co (SOFA10/11); el resto, juanda.trifuerza. Eren (Attack on Titan) sí va,
  menos su respuesta de a quién demandaría (persona real).
- **Gusto por confirmar con Juan David:** estilo RPG del diálogo (VT323 vs. Inter: se dejó Inter 700 por
  legibilidad), densidad de efectos, si quiere el CRT, y qué hacer con la respuesta "Álvaro Uribe"
  (persona real: quedó fuera y en `verificar[]`).

## 2026-10-03 · brochures de Contrappto y Trifuerza Legal (PDF + video)

- **PDF desde HTML sin dependencias:** `brochures/<nombre>.html` (A4 con `@page`, una `<section>` por página)
  y `npm run brochure` lo imprime con el Chrome/Edge del equipo en headless; sale a `trabajo/brochures` y se
  copia a `<Mes>/Edited/Brochures`. Para revisar, captura alta con Chrome + `crop` de ffmpeg por página
  (el visor de PDF del host no renderiza y la vista previa del navegador no carga fuentes ni logos locales).
- **Contenido de cada brochure:** Contrappto sale de `contrappto/docs/BUSINESS/modelo-de-planes.md` (no tiene
  canvas en el FigJam de Trifuerza: "tiene su propio tablero"); Trifuerza Legal, del BMC del FigJam. Los
  precios de Legal son **propuestos** en el canvas: todo en `brochures/verificar.json`.
- **Bug del kit corregido:** `fontFamily: x.mono ? t.mono : undefined` después de `...fuente()` borraba la
  fuente y los detalles de Tabla/Avisos salían en serif. Ahora solo se pone la mono cuando aplica.
- **El kit web se ve chico a pantalla completa:** está hecho para paneles de Montaje (textos de 17-25 px).
  La plantilla Brochure lo dibuja más pequeño y lo escala (1,4 vertical, 1,15 horizontal; `kit.escala`).
- Una pieza puede pedir varios `formatos`; el primero conserva el id `<slug>--<cuenta>`.
- **Modelo de Legal (decisión de Juan David):** un solo plan base, Firma, $249.000 al mes **por firma de
  abogados**, hasta 200 procesos; se crece con add-ons de usuarios y procesos. Solo y Firma+ del BMC quedan
  fuera (el FigJam ya está actualizado). "Firmas" a secas confundía firma electrónica con firma de abogados:
  escribir siempre "firmas electrónicas".
- **`npm run render` murió a los 28 s esperando las fuentes:** la config no alcanza ese delayRender. Ahora
  render.js pasa `--timeout=120000 --gl=angle --concurrency=6` y reintenta con 3, igual que montaje.

## 2026-09-30 · portada del carrusel en el cuadro 0

- **Instagram toma el primer cuadro como portada** y el carrusel arrancaba vacío (todo entra con
  animación). Ahora la lámina 1 muestra en el cuadro 0 la lámina ya armada (`Freeze` del último cuadro).

## 2026-09-29 (noche) · portadas y disco lleno

- **Disco lleno (ENOSPC):** cada `remotion render/still remotion/index.js` deja en %TEMP% un paquete de
  ~3,5 GB (copia public/ con los crudos) y nunca lo borra: había 153 GB en ~400 carpetas `remotion-*`.
  Se borraron. Los scripts nuevos empaquetan una vez en `trabajo/paquete-*` y lo borran al terminar.
  **Si el disco se llena: borrar %TEMP%
emotion-* cuando no haya renders corriendo.**
- **Portadas de reels ya publicados:** no hay videos viejos; las miniaturas públicas (360×640) traen
  textos que se enciman. Pidió ilustración nueva "como la del evento" y **título centrado**: metáfora
  animada + título al centro (`piezas/2026-10/portadas/anteriores-juanda.json`).
- **Los copys se leen en el celular**, no en un .md de Drive: van en la página del calendario con botón "Copiar".

## 2026-09-29 (tarde) · demos de Contrappto en LinkedIn

- **Textos encimados en 16:9:** el rótulo de nombre estaba en el mismo sitio que los subtítulos
  (720, 880) y el titular se dibujaba debajo del gancho mientras este seguía en pantalla. Arreglo: el
  rótulo va sobre el video (110, 868) y el titular baja mientras está el gancho y sube después.
  **Gusto: "no se trata de que elimines las cosas sino que las reubiques".**
- **No generar PNG de más:** no los pidió. LinkedIn admite un solo video por publicación; eso se le
  dice, no se resuelve inventando entregables.

## 2026-09-29 · carruseles y stories animados

- **Pidió "mini-videos pensados tipo carrusel"** con metáforas visuales y texto, para los días sin
  video y para las tres cuentas (juanda, Trifuerza.co: Academy, Legal y Technology; Contrappto), más
  stories para mantener activa la comunidad. "La idea es estar publicando hartísimo."
- **Publica él a mano** (Meta Business Suite y LinkedIn); todo sale del calendario. No quiere pagar Metricool.
- **Radicados de mentira que no parezcan reales:** en las metáforas se usa "Rad. ••• / 20••", nunca
  un número tipo T-214/2011 que podría ser una sentencia real señalada como inexistente.
- Sin desenfoques ni grano en las láminas (ESTANDAR 1b): el rompecabezas "borroso" se hace con opacidad.
- **La clase del 27 es para todo público, no solo para abogados** (lo aclaró él). Los copys del FigJam
  todavía dicen "para abogados".
- **Carrusel cuadrado (1:1)**, no 4:5. **En LinkedIn, el mismo formato que en Instagram**: lámina por
  lámina, nunca un video con todas unidas. Como LinkedIn admite un solo video por post, allá va en PNG.
- Le gustó el primer lote: "quedó súper bien hecho".
- **Render colgado escribiendo directo en Drive (G:)**: una lámina se quedó 7 min sin avanzar. Ahora se
  renderiza en `trabajo/carrusel-salida`, se copia a Drive, y cada render tiene tope de 3 min y un reintento.

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

**Analítica (29-sep-2026)**
- Metricool es muy caro para Juan David: la analítica va gratis con la API de Meta (`npm run analitica`, guía en `docs/ANALITICA.md`).
- Audiencia de juanda.trifuerza (Metricool, 29-sep): pico lun-vie a las 10:00 y segundo pico a las 18:00 (Bogotá); de 20:00 en adelante cae; fines de semana, la mitad. La parrilla de octubre pasó primero los reels y carruseles de 12:30 a 10:00, pero Juan David prefirió las 12:00 (30-sep): la ventaja de las 10:00 era ~10 % y no estaba probada con sus piezas. Su razón: en la mañana la gente está trabajando y se activa al almuerzo. Quedaron a las 12:00, y las stories de 19:00-20:00 a 18:00 (menos el 27-oct).
- `online_followers` de Meta viene en hora del Pacífico: el script lo pasa a Bogotá. Si el pico no sale a las 10:00, revisar esa conversión antes que nada.
- Señal temprana (5 reels): los de videojuegos llegan a más gente; los de opinión sobre IA llegan a menos, pero esa gente interactúa más. Pautar solo lo que supera la mediana en alcance y en compartidos + guardados, a las 72 h.

**Parrilla solo con lo hecho (1-oct-2026)**
- Juan David programa el mes entero de una vez: en la parrilla no entra nada que no exista ya en `Edited/`. El reel R1 («tres cosas falsas», montaje por hacer) se cambió por el carrusel c11 de juanda, que ya estaba renderizado. Antes de publicar la página, cruzar cada fila del calendario con su archivo en Drive; una pieza nueva entra al calendario solo cuando su MP4 ya está en Drive.
- La página del calendario puede tener cambios que el JSON no tiene (ej. CTP_FUN/CTP_FAC cambiados de día en LinkedIn): comparar las dos antes de regenerar, para no deshacer lo que él movió.

## 2026-10-04 · propuesta Los Libertadores en estilo brochure

- **Propuestas comerciales también salen como brochure HTML** (`brochures/propuesta-libertadores.html`, estilo
  Trifuerza Legal). Fuente de cifras: la última versión en Drive `07 Comercial/Propuestas Trifuerza 2023-/Propuestas enviadas`;
  el PDF nuevo va a la raíz de `Propuestas Trifuerza 2023-` (no a Redes sociales). Pendientes en `verificar.json`.
- **La app del consultorio (cj-full-app) pide login** y muestra nombres reales de partes: no se capturan pantallas,
  se recrean en HTML con los tokens reales (verde #004F4A, lateral #18181B) y datos de mentira.
- **cj-full-app no calcula desistimiento por inactividad**: solo detecta el texto "desistimiento tácito". Lo que se
  muestre como semáforo de inactividad es alcance por construir, y así se rotula.
- A Juan David le importa recalcar en las propuestas: uso desde el celular, pago único vs licencia genérica, y que
  la herramienta es apoyo (no reemplaza la vigilancia del estudiante).
- **Logo de Trifuerza sobre fondo oscuro (4-oct-2026)**: Juan David quiere las letras blancas puras. El
  `logo-horizontal-claro.png` anterior (Mesa de trabajo 6) tenía las letras azuladas; ahora es "Mesa de trabajo 6
  copia 3" recortada con `ffmpeg -vf alphaextract,bbox`. Vale para brochures y para videos.
- **Propuestas de Trifuerza en PDF**: el motivo visual de la portada es la constelación de nodos de trifuerza.co
  (no triángulos). Está en SVG con semilla fija dentro del HTML para que salga vectorial. Siempre van el nombre
  del cliente; la lista de obligaciones anuales NO va en la propuesta (es un entregable aparte de la SAS y vive en
  el panel de la web), la advertencia de que no se asegura el registro de la marca y los costos de terceros como
  referencia. El dominio es lo único que se necesita al inicio; Supabase solo cuando la web pase a e-commerce.
- **Sacar imágenes de un PDF sin poppler**: Chrome headless no renderiza PDFs. Las imágenes se sacan del flujo
  (FlateDecode CMYK → RGB con node → PNG con ffmpeg). Algunas vienen volteadas: revisarlas antes de usarlas.
- **4-oct:** LegisOffice al final **no se nombra** (lo pidió y luego lo quitó); Blackboard sí, como comparación sana.
  En Academy la plataforma solo transmite: las clases se graban con **OBS**. App en tiendas: **$6.000.000**; sin PWA.
- **Links para revisar:** las propuestas se publican como Artifact desde una copia (scratchpad/publicar) con rutas
  a `assets/`, sin comentario interno y con un visor que escala las hojas A4 al ancho de la pantalla.
  Consultorio: https://claude.ai/artifact/BjxWctqrL1oHG7r1CfVFxw · Academy: https://claude.ai/artifact/4A3a8brQehrK3J4JUKFqpK
- **Constelación de nodos = la de trifuerza.co** (script de `brochures/propuesta-sas-marca-web.html`, Dos Tierras):
  conceptos de la propuesta escritos junto a los nodos y el cliente como nodo central, arriba a la derecha de la
  portada; en el cierre, una franja tenue sin cliente. Cierre preferido: "¿Quieres saber más de nosotros?" +
  botón "Conócenos en www.trifuerza.co ↗".
- Quiere que las propuestas hablen también de **docentes y directores**, no solo de estudiantes; que digan que lo
  hace **un equipo** (no "un abogado"); **firma electrónica**, nunca "digital"; y que la app en tiendas y una app de
  toda la universidad aparezcan como **costo adicional / se cotiza**.
- Propuesta Academy para universidades: sin precio, arranca con **diagnóstico inicial**; dos caminos (complemento o
  LMS propio); monetizar vendiendo los cursos hacia afuera. Fuente: `brochures/propuesta-libertadores-academy.html`,
  armada desde el CSS del brochure del consultorio con el acento de Academy #00C4CC.
- **Formas de pago en propuestas de Trifuerza (4-oct-2026)**: Juan David no acepta mitad y mitad. Solo pago único:
  todo junto con 10 % de descuento, o cada servicio por separado y pagado completo al iniciarlo. En la marca, el
  análisis de expectativas se contrata y paga antes que el registro, y el registro solo si el cliente decide seguir.
- **Skill `propuesta-servicios` + `npm run propuesta`** (4-oct): PDF, copia para publicar con `archivos.json`,
  capturas con `--revisar` y copia a Drive. Drive reorganizado: `07 Comercial/Propuestas de servicios/`
  (antes "Propuestas Trifuerza 2023-") con `Anteriores a 2026-1/`, `2026-2/` y `Guias/`. Registro en `docs/PROPUESTAS.md`.
  La constelación vive en `brochures/kit/constelacion.js` (paletas trifuerza, legal, academy).
- **Propuestas solo en PDF, nunca Artifact ni web** (4-oct, confidencialidad y derechos de autor). Los links
  publicados ese día quedaron obsoletos.
- **PDF en el celular:** `filter: blur()` sale rasterizado y tosco, y el texto con `background-clip: text` deja
  rayas con la forma de su caja (pasó en la portada de Dos Tierras). Brillos con `radial-gradient` y título
  sólido al imprimir. Se revisa con pypdfium2 (el motor de Android y Drive). Chrome sin ventana no baja de
  504 px de ancho: no sirve para simular un celular de 390.
- **PDF limpio (4-oct, 2.ª vuelta):** los "cubos" que veía en el celular eran sombras con desenfoque,
  degradados con transparencia y la rejilla que Chrome vuelve imágenes rectangulares; la constelación salía
  borrosa por sus opacidades. `brochures/kit/pdf-limpio.js` aplana todo antes de imprimir (fondo en canvas
  2x, colores opacos mezclados, SVG sin opacidad). Dos Tierras pasó de 129 máscaras de transparencia a 1.
  Logos de marcas: cuadros blancos iguales, logo contenido; nunca un fondo por logo.
- **Nitidez del texto en el PDF:** Inter y Fraunces variables salían como Type3 (glifos dibujados). Se instanciaron
  pesos fijos con fontTools en `public/fuentes/estaticas/` y se cargan con `brochures/kit/fuentes.css`: ahora
  entran como fuente real (Type0). Los emojis de los mockups eran las últimas máscaras de transparencia
  (fuente de color con degradados): se cambiaron por puntos de color. Resultado: 0 máscaras en las tres propuestas.
- **Rótulo por línea de servicio:** la del consultorio es software → TECHNOLOGY, no LEGAL. Enlace a
  www.trifuerza.co en el pie de todas las páginas. Constelación minimalista (18 nodos en portada, 9 en el
  cierre, sin nodos encimados ni palabras que choquen) y las tres propuestas cargan `kit/constelacion.js`.
- **Sin detalles de implementación en propuestas** (Next.js, Supabase, Vercel, React...): a lo sumo PostgreSQL y
  JavaScript. Cajas de color con letra negra. Error corregido en `pdf-limpio.js`: al aplanar SVG ignoraba la
  transparencia propia de los colores rgba (las cajas del flujo quedaban con color pleno y texto ilegible) y
  convertía en sólido el degradado del semáforo; ahora respeta el alfa y conserva los degradados fuera de la constelación.
- **Propuestas en video (5-oct):** plantilla Brochure con música por negocio (`musica`: institucional,
  optimista, calido) y copia a `Propuestas de servicios/<semestre>` vía `pieza.drive`. Formatos según
  cliente: Libertadores solo horizontal, Dos Tierras solo vertical. La escena `pasos` en vertical necesita
  `alto` ≥ 460 (con 300 se cortan los círculos; en horizontal el alto es fijo). La firma de video lleva la
  línea del servicio (`marca.firma.linea`), igual que el logo de los PDF.
- **Dos Tierras en video, 2.ª versión (5-oct):** Juan David pidió marca y web en capítulos separados, más
  explicativo que de precios, storytelling y metáforas. Nueva escena `metafora` en Brochure.jsx (usa las
  metáforas de Carrusel); 14 escenas, 81 s, sin tabla de planes. En vertical la metáfora va casi a sangre
  (ancho de pantalla - 80 px). Lo mismo se puede aplicar a los videos de Libertadores si lo pide.
- **Videos de Libertadores con historia y metáforas (5-oct):** consultorio 84,5 s y Academy 67,6 s, ambos horizontales.
  Metáforas útiles para este tipo de propuesta: reloj (plazos, "una sola vez"), balanza (arrendar vs. ser dueño),
  tablero (monitoreo), alarma (avisos), semáforo (urgencia), candado (seguridad), rompecabezas completo (el criterio
  humano completa la plataforma), vivo y burbujas (clases en vivo), boleto (venta de cursos), pasos (metodología).
  Evitar `chat` cuando la respuesta es afirmativa: la metáfora marca la respuesta con una X roja (está hecha para
  desmentir). `espejismo` trae textos de radicados: no sirve fuera de lo jurídico. En `boleto`, textos cortos de
  talón y sello (COMPRAR/OFICIAL) para que no se encimen.
- **Acuerdo de socios incluido en la SAS (5-oct):** Dos Tierras tiene 3 socios que quieren variar utilidades según el
  aporte. Se vende como "claridad del negocio" y va dentro de los $3.500.000: clases de acciones en los estatutos
  (derechos permanentes) + acuerdo de socios (lo que cambia: medición del aporte, salida de un socio). El alcance se
  cuida con "una sesión de análisis con los tres socios"; los contratos socio-sociedad y el modelo tributario
  (dividendos vs. honorarios) quedarían como adicional si los piden. El trabajo variable se paga mejor como
  honorarios o bono que como dividendo (más flexible, otra tributación: confirmar con contador).
- **Gusto en guiones de reels (5-oct):** a Juan David le gustan cortos, con gancho en la primera línea y sin
  relleno (modelo: N01 «La pantalla de carga prohibida»). Un gancho cotidiano que todos recuerdan (el dinosaurio
  de Chrome sin internet) antes del dato legal funciona mejor que abrir con el dato. En calle, nada de preguntas
  que confronten a la persona («¿tu cosplay es tuyo?»): preguntas de juego con el fandom («¿a quién demandaría tu
  personaje?») y lo legal solo en el remate del estudio, sobre el personaje. Autorización de imagen: basta el «sí»
  en cámara al final de la entrevista; nada de formularios firmados.
- **Certificado real de Trifuerza Academy en los videos (6-oct):** Juan David pasó su certificado de ponente
  (panel noche a la izquierda con logo, duración/fecha/modalidad; hoja clara con «TRIFUERZA ACADEMY», título en
  Sora, nombre en Fraunces, curso con barra naranja, firma, QR y «Verificable en www.trifuerza.co/academy/verificar»)
  y pidió meterlo en los videos. Se copió tal cual en `remotion/componentes/Certificado.jsx` (a 1154×815, escalado),
  con textos y colores en `marcas/juanda.json` → `montaje.certificado` (versión de asistente para la clase del 27,
  nombre «Tu nombre aquí» que se escribe letra a letra). Lo usan la outro «Comenta CLASE» (certificado arriba, CTA
  como cinta sobre su borde, sello «Gratis y con certificado») y el beat `certificado` (X02, en «únete a mi clase»).
  No reemplaza la metáfora `certificado`: esa la usa la propuesta de una universidad con sus propios sellos.
  El brillo animado va solo sobre la hoja clara: encima del panel oscuro quedaba como una mancha.

## 2026-10-15 · resúmenes de clase en PDF (propiedad intelectual)

- **Resúmenes de clase = estilo propuesta Academy** (fondo `#050B16`, turquesa/naranja), pero con hoja de estilos
  compartida `brochures/kit/resumen.css` (cajas "clave" turquesa, "ojo" naranja, "ejemplo" punteada; tablas; frases).
  Fuentes: `brochures/resumen-pi-derecho-autor.html` y `brochures/resumen-pi-propiedad-industrial.html`.
  Se imprimen con `npm run propuesta -- <nombre> --sin-drive` (sin `--sin-drive` irían a la carpeta de propuestas, que no es su lugar).
- Densidad que funciona en A4: texto 11,3–11,9 px. Páginas con aire abajo se llenan con bloques útiles
  (preguntas de examen, "practica: ¿se puede registrar?", recomendaciones), no con letra más grande.
- Contenido jurídico: marco Colombia + Comunidad Andina (Decisiones 351 y 486) con tratados; datos dudosos
  y casos reales en `brochures/verificar.json`. En bash, un heredoc con Python que lleva comillas simples
  triples falló; mejor escribir el script en el scratchpad y ejecutarlo.
- **Dónde van los resúmenes (15-oct):** los de Trifuerza Academy (PI, corporativo) a `G:/Mi unidad/Docencia/Trifuerza Academy/Resúmenes de clase/`;
  los de la U. del Rosario a `Docencia/U Rosario/Derecho y Tecnología/Periodos/<periodo>/Presentaciones y contenido/<n> corte/Contenidos/`.
  Siempre con autor "Juan David Vanegas Roldán". En PI pidió también copyright de EE. UU., tratados y CAN, originalidad vs. nivel
  inventivo, contenido en redes (remitir a T&C de la plataforma), contratos derivados e IA.
- **Resúmenes de Los Libertadores (15-oct):** van a la carpeta de contenidos del corte de cada materia, p. ej.
  `U Libertadores/Contratos civiles y mercantiles/2 corte/contenidos/` y `Humanidades Digitales/2026-2/Contenidos/2 corte/`.
  Fuente: los HTML de contenido de cada sesión (mejor que las presentaciones). Todos con logo Trifuerza Academy, autor y pie de trifuerza.co.
  La flecha ↗ en negrita sale como fuente Type3: dejarla fuera del <b>.

## 20-oct-2026 · Post de arriendo del local de Cielocanto (fotos fijas)
- Para posts de fotos reales, Juan David no quiere fotos cortadas a media lámina con un degradado que las corta ni encuadres
  que partan puertas o marcos. Si la foto no va a pantalla completa, va **enmarcada** (borde redondeado, como el mosaico) para
  que todo el carrusel sea coherente. Se armó en HTML con Chrome headless (`trabajo/cielocanto-local/`), no en Remotion.
- Usar siempre las fotos más recientes que él mande: la web puede tener fotos viejas (la cocina tenía otro piso).

## 27/28-oct-2026 · Clase grabada «Fundamentos de IA» (skill editar-clase-grabada)
- Una clase de 94 min no se renderiza entera en Remotion: método híbrido (ffmpeg/Python para la grabación, Remotion
  solo para el marco y las capas, tramos quietos como un solo cuadro). Ver `.claude/skills/editar-clase-grabada/`.
- Hugging Face falla por certificado desde Python en este equipo: bajar el modelo con curl y usar ruta local.
- El desfase audio/imagen de LiveKit **deriva** (−0,35 → −0,84 → ~0 → −0,28 s): se corrige por tramos cortados en pausas.
  La medición por diferencia de píxeles no sirve; la de flujo óptico de la boca sí (correlación baja pero consistente).
- Los cortes de audio del vivo (silencio digital de paquetes perdidos) no se recuperan; decírselo a Juan David.
- Difuminado: barra de chats de Claude con NCC contra recortes (inmune a diálogos atenuados), títulos de la galería con
  plantilla del ícono; cursor devuelto nítido con umbral 0,85 (0,72 confundía letras).
- Juan David pidió renderizar todo de una sin muestra cuando se fue a dormir: la muestra previa es opcional si él lo dice.
- Le gustó mucho la v1 (28-oct) y la dejó así: marco con banda de paradas + itinerario con avión, fichas cuando nombra
  cada concepto, comentarios del chat al agradecerlos, subtítulos de una línea abajo. Es la referencia para las próximas
  clases grabadas. Se publicó a la venta (89.000 COP) desde la sesión de tri-app; esta sesión no ve esa base.

## 28-oct-2026 · Tráiler y piezas de venta de una clase grabada (Trailer.jsx)
- Clips cortados con `-ss` de la v1 rompían OffthreadVideo («No frame found at position…»): recortar con
  `-vf fps=30,setpts=PTS-STARTPTS -bf 0 -g 15` y `asetpts=PTS-STARTPTS`. Render con `--concurrency=3 --timeout=120000`
  (con la concurrencia por defecto el proxy de video se cae: «Request closed», timeouts de delayRender).
- No re-empaquetar (bundle) en la carpeta que un render en curso está usando: otro --out-dir.
- Para Instagram el CTA que pide Juan David es «Comenta CURSO y te envío el link» (comentario → DM), no solo la web.
- Venta: precio anticipado en los primeros ~15 s, «quédate hasta el final» con 3 ideas numeradas, prueba social y cierre con precio.
- **Cambio de precio (28-oct, $89.000 → $49.000):** basta cambiar `precio` en `venta` de la ficha, re-empaquetar en otro
  --out-dir (`paquete-49000`) y volver a renderizar solo lo que lo muestra: tráiler (escena precio), venta v2 (presenta y
  precio) y láminas 2 y 6 del carrusel. Duraciones iguales: la música no se regenera. Entregas viejas en `anterior-89000/`.

## 28-oct-2026 · Tráiler en forma de viaje (Viaje.jsx + Globo.jsx)
- **Gusto de Juan David:** no quiere el caso de los abogados de Nueva York en el tráiler; quiere el estilo de sus clases con
  mundo animado (el avión que recorre el planeta y en cada parada el tema en grande, como la presentación y Vuelo de
  Divisas), fragmentos reales de la clase y **el precio al final**, no al principio: primero convencer, después $89.000
  tachado y «Precio de lanzamiento $49.000» con la ruta de compra. Esto reemplaza el «precio anticipado» de arriba.
- El planeta es el de la presentación (`vuelo.html`) portado a react-three-fiber. Todo sale del número de cuadro: el avión
  orbita con theta = t·0,5, los vuelos van de órbita a órbita con el rumbo fundido al despegar y al llegar, y la cámara
  mezcla vista y encuadre de la escena anterior en 0,8 s. Nada de lerp acumulado ni requestAnimationFrame.
- Los letreros del planeta se pintan en un canvas: esperar `cargarFuentes()` (fuentes.js) con delayRender antes de armar la
  escena, o salen con la fuente del sistema.
- Crudo → v1: `v1 = crudo + 1,6 + desfase del tramo` (`sincronia.tramos`). Comprobado con faster-whisper sobre cada corte.
- El logo de la intro rompía OffthreadVideo («No frame found at position»), primero con `playbackRate` sobre el original de
  24 fps y después incluso acelerado con ffmpeg a 30 fps sin B-frames. Solución: acelerarlo con ffmpeg, pasarlo a JPG
  cuadro a cuadro (`trailer/logo/0001.jpg…`) con su sonido en WAV aparte, y mostrarlo con `<Img>` según el cuadro.
  Lo mismo pasó con los clips de la clase (que en el tráiler anterior sí funcionaban): con ~600 MB de RAM libre el
  compositor pierde cuadros. Momento (Trailer.jsx) acepta `cuadros` + `n` + `sonido` para ir con JPG en vez de video.
- Un «Target closed» del 28-oct (~16:20) no fue la RAM: otra sesión corrió `taskkill /IM chrome-headless-shell.exe` y
  cerró los navegadores de Remotion de todas las sesiones. Nunca matar procesos por nombre; solo por PID propio.
  Aun así, con poca RAM libre, para el planeta 3D usar --concurrency=2 (o 1 si sale ERR_INSUFFICIENT_RESOURCES).
- `remotion still` con three.js tarda 2–4 min por cuadro (arranca el navegador y arma el planeta cada vez): pocas tomas.
- `python -I` ignora PYTHONIOENCODING: en Windows la entrada y la salida estándar quedan en cp1252 y los saltos de línea
  salen como CRLF. Nunca reescribir un JSON por la salida estándar; abrir el archivo con `encoding='utf8'` y `newline='\n'`.

## 28-oct-2026 · Remontaje de la clase (v3 y v4 de Fundamentos de IA)
- **El cuadro 0 de un clip de Veo es la imagen de referencia** (el logo plano sobre negro con el nombre), no la animación.
  El reproductor de Mis clases muestra el cuadro 0 antes del play (sin poster): por eso «el inicio horrible». armar.js
  salta ese cuadro (`trim=start_frame=1` + `tpad` para que el logo siga durando 10 s) y usa el audio del clip (antes ponía
  silencio). Revisar SIEMPRE el cuadro 0 con `select=lt(n\,2)`: una hoja de contacto a 8 fps se lo salta.
- **Gusto de Juan David:** la clase editada tiene que ser «súper contextual» y generosa: motion graphics de lo que dice en
  cada momento, vuelos entre paradas, Claude dibujado cuando explica una función, gameplay limpio del juego, tapas
  animadas (no blur) con margen, menos cara donde el lipsync falla, subtítulos con golpe y cortes de silencio.
- **Remontaje en dos pasos:** `npm run clase -- <slug> --master` (lineal, sin subtítulos, con las capas encima) y
  `npm run clase-remontaje -- <slug>` (una sola pasada: `select`/`aselect` quitan los cortes, se intercalan los vuelos,
  se queman los subtítulos sobre la versión ya recortada y se mezcla la pista de efectos). Capítulos y .vtt salen con el
  mapa crudo → master → final.
- **Cortes de silencio sin comerse palabras:** solo donde no hay palabras en la transcripción Y silencedetect dice que
  el audio está callado (Whisper a veces no oye 20 s de habla). Aire de 0,3 s tras la última palabra y 0,25 s antes de
  la siguiente. Nunca dentro de una escena animada (se vería saltar).
- **Más de 100 capas en un ffmpeg:** se unen antes en una sola pista (concat con `outpoint`) y se corren a su segundo con
  un solo `setpts=PTS+(Σ between(T,p0,p1)·desfase)/TB` y `enable` por tramos. Una entrada por escena revienta memoria.
- **freezedetect** escribe tres líneas por evento (start, duration, end): leer por clave, no por pares.
- **Grabar un juego three.js sin GPU:** chrome-headless-shell de Remotion por CDP con el reloj de la página reemplazado
  (requestAnimationFrame, performance.now y Date.now avanzan 1/30 s por cuadro) y piloto automático vía `window.__a`.
  Servir todo el `public` de tri-app2 (el juego carga `../joystick.js`). ~0,4 s por cuadro con SwiftShader.
- **No matar `chrome-headless-shell.exe` por nombre:** otras sesiones renderizan con Remotion; matar por PID o por perfil.
- En ASS los override dentro del texto son sensibles a mayúsculas: `\1c&HBBGGRR&` (minúscula); `\1C` no hace nada.
- **Sonido de las transiciones:** a Juan David el golpe con ruido blanco le sonaba «rastrero, a interferencia». musica-trailer.py
  ahora hace un boom limpio (seno que cae, sin ruido), una subida tonal antes del precio y, en el viaje, una campanita de
  aeropuerto (ding-dong Mi5→Do5) al llegar a cada parada. Para cambiar solo el audio de un video ya hecho: render con
  `--codec=wav` (~5 min) y montarlo con ffmpeg sobre el MP4, sin volver a renderizar la imagen.
- Le gustó mucho el viaje (publicado como trailer-16x9-v3). Pidió además una variante que abra con el precio
  (`venta.viajePrecio` + `venta.insignia`, el sello del precio durante todo el vuelo).
- **El primer master completo falló con `FILTER_NOT_FOUND`** (ffmpeg sale con 3015096584 = −0x4C4946F8 = «\xF8FIL»): el
  `setpts=PTS+(between(T,a,b)…)` de la pista de capas iba sin comillas y cada coma cortaba el filtro. Va entre comillas
  simples. La muestra no lo vio porque no pasaba por la pista única. Decodificar el código: `-(n − 2³²)` en hex = FFERRTAG.
- **El concat demuxer exige la misma base de tiempo en todos los archivos.** El gameplay salió de ffmpeg con 1/15360 y las
  escenas de Remotion con 1/90000: el concat reescaló mal y el tiempo saltó de 1126,5 a 192,256 (= 1126,5·15360/90000),
  así que el juego habría salido congelado. grabar-juego.js ahora usa `-video_track_timescale 90000`; para un clip ya
  hecho basta remuxear con `-c copy -video_track_timescale 90000`. Revisar con
  `ffprobe -f concat -i pista.txt -show_entries packet=pts_time` que no haya saltos hacia atrás.
- **Un clip corrupto corta la pista en silencio:** ctx-109 (escrito a la vez por dos workers) solo tenía 140 de 390
  cuadros legibles y el concat terminó ahí, sin error. Antes del master: decodificar completos todos los clips
  (`ffmpeg -v error -i x.mp4 -map 0:v -f null -`, en paralelo con `xargs -P 4`); `ffprobe` de cabecera no lo detecta.
- **Dos workers de render-capas no deben cubrir los mismos clips:** el que corre sin `--solo` recorre toda la lista y,
  al alcanzar al otro, renderizan la misma escena a la vez sobre el mismo archivo. Repartir con `--solo` disjuntos.
- **Portátil con batería:** con el render al 100 % la batería llegó a crítico y Windows suspendió 40 min (y el cambio de
  red al despertar hizo fallar un render con `ERR_NETWORK_CHANGED`). Render largo: cargador conectado y una petición de
  «no suspender» (SetThreadExecutionState) mientras dure.
- **ffmpeg no parsea expresiones muy largas:** un `setpts` con ~90 `between()` o más (y un `enable` con 131) falla al
  iniciar los filtros con «Cannot allocate memory» (−12), aunque sobre RAM. Con 80 pasa. Las escenas van en pistas de
  a 40 (`pista-N.mp4`), cada una con su setpts y su enable, y cada pista verifica que dura lo que debe.
- **El mismo límite en el remontaje:** con la clase completa salen 164 cortes de silencio y el `select='not(…)'` del
  remontaje falló igual (−12), después de 70 min de master. Los cortes van en varios `select` encadenados de a 40 (sin
  `setpts` entre ellos, `t` sigue siendo el tiempo del master). Regla: toda expresión de ffmpeg armada desde una lista
  se parte en grupos de 40, aunque con la muestra corta pase.
- **Un salto viejo se cuela:** remontaje.js reusa `salto-N.mp4` si existe. El salto 7 venía de la muestra de las 17:53,
  antes de cambiar Globo.jsx. Al cambiar el componente del vuelo, apartar los saltos viejos (`40-remontaje/anteriores/`).
- **Revisar datos personales con OCR, sin instalar nada:** Windows trae OCR (`Windows.Media.Ocr`, desde PowerShell 5.1
  con WinRT). Un cuadro por segundo de la zona de pantalla, escalado a 2400 px, lee hasta la barra lateral de Claude.
  Sirve para confirmar que no aparece un correo antes de subir.
- **Los modelos 3D de las escenas «ciudad» no están en git:** Contexto.jsx carga `juegos/barrio/*.glb` y
  `juegos/carros/*.glb` del public de la clase (`trabajo/clases/<slug>/public/juegos/`, ignorado). Se copiaron de
  tri-app2: `public/juegos/panaderia-tycoon/3d/{barrio,carros}`. En una máquina nueva, copiarlos antes de render-capas.

- **Tráileres del video remontado (v4, 29 oct):** cortes-trailer.py corta del final con tiempo-final.js y whisper sobre el
  clip ya cortado se come la última palabra si el corte cae justo encima («impensable», «matemáticas», «pare un momentico»).
  Antes de fijar un `crudo`, transcribir con whisper una ventana más amplia del video final (word_timestamps) y poner el
  fin 0,1 s después de la última palabra. El .vtt de la clase sirve para ubicar, no para cortar.
- **Duración de la clase en piezas de venta:** cada remontaje cambia la duración (v2 94 min, v4 87 min) y lo publicado
  lo cambia Juan David a mano. En tráileres y carruseles poner «hora y media de clase», no los minutos exactos.
- **Storage class-media tiene tope de 50 MB:** el tráiler de 96 s a crf 20 pesa 51 MB; para la web, crf 23 preset slow
  (34 MB). La copia para Drive/Instagram queda a crf 20.

## 29-oct-2026 · Fundamentos de IA pasa a ser gratis
- Decisión de Juan David: **gratis para siempre, con registro en la plataforma y certificado gratuito**; incluye todo (video con
  subtítulos, guía, presentación, quiz, certificado) y habrá más cursos gratuitos, de mejor calidad. Se dejó la ficha
  `clases/fundamentos-de-ia.json` → `venta` así: las escenas `precio` de las listas vigentes (viaje2, viajePrecio2, promoGancho,
  promoPrecio, carruselViaje) dicen «Curso gratuito · Gratis»; `venta.insignia` también; se borraron las versiones en dólares
  (`*USD`) y sus composiciones de `Root.jsx`. Las listas viejas con precio (escenas, historia, carrusel, viaje, viajePrecio) siguen
  con $49.000 y están obsoletas. `PrecioLanzamiento` e `Insignia` (Viaje.jsx) ya no dibujan tachado ni moneda cuando faltan `antes`/`moneda` (cuadro de prueba: trabajo/prueba-gratis/lamina8.png).
- Juan David quiere abrir Remotion y editar él mismo: todo el texto de las promos vive en esa ficha y se ve en `npm run estudio`.

## 2026-11-01 · referencias de Pinterest y plantilla Capas
- **Dirección:** Juan David quiere videos hechos con IA que se vean «más artísticos, menos IA». Mandó 19 pins de
  referencia; el análisis cuadro por cuadro y del audio está en `referencias/pinterest-2026-11.md`.
- **Ver videos de Pinterest:** la página pide login y con el panel del navegador oculto el `<video>` no carga.
  Lo que funciona: `fetch('/pin/<id>/')` desde co.pinterest.com, sacar del HTML la URL `v1.pinimg.com/videos/.../expMp4/..._720w.mp4`
  (las `hevc`/`h265` no se decodifican), abrirla directo y armar una hoja de cuadros con canvas. El audio se mide
  con `decodeAudioData` (volumen, golpes, BPM aprox.).
- **Plantilla `Capas`** (`remotion/plantillas/Capas.jsx`, pieza `piezas/2026-11/ctp-capas.json`): telefono en 3D
  con la app y sus partes que salen hacia la camara (vista explotada), recorrido por cada capa y CTA. Las capas son
  recortes de `public/app/2026-10/contrappto.mp4` en `public/capas/contrappto/`, elegidos sin datos de clientes;
  el titulo del contrato real («Quentin», «Airbnb 302») se tapa con `base.tapar`. Musica: receta de Brochure.
- **Ojo en la grabacion de la app:** salen nombres reales (el titulo del contrato, «Firma de Quentin Dixneuf» en la
  linea de tiempo, «Hola, Juan David Vanegas Roldán» en el panel). Revisar cada recorte antes de usarlo.
- **Ver reels de Instagram sin iniciar sesion:** `instagram.com/p/<codigo>/embed/captioned/` trae el copy, los me
  gusta, los seguidores de la cuenta y el `<video>` con su mp4 directo (fbcdn, firmado y con vencimiento). Se abre
  el mp4 y se arma la hoja de cuadros y la medida del audio igual que con Pinterest. Sirve para posts sueltos; para
  listar todo un perfil hace falta la API (Business Discovery). Analisis en `referencias/instagram-2026-11.md`.
- **Voz clonada (01-nov-2026):** su voz oficial en ElevenLabs es «Juan Da Voice oficial» (`ZdAh80pu3q47gWzmqvOL`); hay un
  clon viejo «Juan David Vanegas» que no se usa. Se genera con el conector de ElevenLabs (modelo eleven_v4, etiquetas
  `[serious, calm]`, `[pause]`). El gancho de Kafka con esa voz: «del putas». Una muestra de 10 s cuesta ~93 créditos;
  el guion de ~65 s, ~1.100. Locutar en una sola toma (`generations_count: 1`) una vez aprobada la muestra.
- **Plantilla `Tinta` (01-nov-2026)** (`remotion/plantillas/Tinta.jsx`, pieza `piezas/2026-11/jd-kafka.json`): historia
  narrada sin cara con ilustraciones a tinta dibujadas en SVG (pluma, arresto, escalera, puerta, revelacion, pregunta),
  papel con fibras deterministas, rayado de grabado por `pattern` y una sola zona de texto con cada palabra dicha. El
  audio entra ya mezclado (`pieza.audio`): voz de ElevenLabs a 1,07x (atempo) para dejarlo en ~40 s, «Dark Times» de
  Kevin MacLeod desde 0:34 con sidechaincompress bajo la voz, silencio de 1,6 s cuando se cierra la puerta, loudnorm −16.
  Los tiempos de cada frase salen de `silencedetect` sobre la voz (divididos por 1,07). `partirPalabras` separa la
  puntuacion que sigue a un `*enfasis*`: la plantilla la pega a la palabra anterior.
- **«Más artístico, menos IA» (01-nov-2026, Kafka):** la v1 con pictogramas SVG planos no le gustó: «míralo bien», el pin
  era grabado de verdad. La v2 (plantilla `Archivo`, `remotion/plantillas/Archivo.jsx`) copia la **estructura** del pin
  analizado cuadro por cuadro: material de archivo **real de dominio público** (Piranesi, manuscritos y foto de Kafka,
  de Wikimedia Commons con `iiurlwidth=2400`; el API da 429 si se piden muchos seguidos) en sepia, acercamientos lentos a
  detalles, ráfaga de cortes de ~0,57 s, destellos de luz blanca entre planos, una pausa larga con un árbol de luz que
  crece de la cabeza y cierre en bucle. **El texto nunca pisa la imagen:** franja de papel arriba para el texto,
  ventana de imagen en el medio, crédito del material abajo. Antes de rehacer algo «como la referencia», bajar el video
  y sacar la hoja a 1 cuadro/s + `select='gt(scene,0.25)'` para los cortes: con 12 cuadros sueltos no se ve el ritmo.
  (La v2 se aprobó primero, pero luego la cambió: la referencia vigente es la v4, plantilla Grabado.)
- **Kafka v3 (01-nov-2026), plantilla `Grabado`** (`remotion/plantillas/Grabado.jsx`): la v2 de fotos de archivo quedó
  «horrible» y «estática». Lo que pidió: **imitar el pin plano por plano** con nuestra historia, todo **dibujado y
  animado**, y exprimir Remotion. Piezas: manuscrito real de Kafka convertido en tinta con alfa y escrito renglón por
  renglón con una plumilla (clipPath que avanza); retratos vectorizados con `src/archivo/trazos.py` (Canny → polilíneas
  + manchas oscuras) que se dibujan solos; **line boil** (temblor de 3 en 3 cuadros) en todo trazo; escalera infinita en
  3D con three.js (`remotion/tinta/Escalera3D.jsx`: cajas con rayado de canvas y contornos `LineSegments2` de 4,5 px,
  niebla del papel); árbol de luz desde la cabeza; destellos blancos en los cortes; texto arriba con velo de papel
  cuando el dibujo sube. **Descartados:** pictogramas planos (v1), fotos quietas (v2) y el convertidor de foto a grabado
  por rayado (`src/archivo/grabado.py`: parecía billete o fotocopia).
- Render con three.js: `--gl=angle`; render.js reintenta con `--concurrency=3` si falla. Unos 8 min para 42 s.
- **Kafka v3, ajustes (01-nov-2026):** «los muñecos» (siluetas genéricas) no van: las figuras se dibujan desde **fotos de
  época de dominio público** con `src/archivo/trazos.py` (ahora con sombreado a lápiz: miles de trazos cortos por tono,
  en franjas que se van sombreando; `--elipse` para aislar figuras cuando GrabCut se come la ropa oscura). Cierre con el
  **logo de Trifuerza en negro** (`logo-horizontal-oscuro.png`) directo sobre el papel, no la firma de juanda. Se probó
  en blanco sobre un resplandor neón y lo rechazó («el fondo no no no»): nada de cajas ni brillos detrás del logo. La pausa del silencio no puede ser abrupta: la música baja en ~1,7 s
  y el negro entra en ~1,3 s. Su veredicto del resto: «quedó del putas».
- **«Que los muñecos se muevan, no solo transiciones» (01-nov-2026):** las figuras dibujadas se animan como recortes
  (cut-out) en `Retrato` de `Grabado.jsx`: respiración (scaleY desde los pies), cabezas recortadas con clipPath que giran
  sobre el cuello (`partes`: caja y pivote en fracciones; la rejilla de `trabajo/kafka/rejilla-*.png` sirve para
  medirlas), humo de cigarro en bucle y paneo de cámara. La puerta y la escalera se **construyen** en pantalla (arco
  dovela por dovela, piso desde la puerta, rayado de arriba abajo; la torre 3D aparece pieza por pieza unos 17 m por
  delante de la cámara: con 9 la cámara miraba al vacío). Logo de Trifuerza en negro puro: `filter: brightness(0)`
  sobre `logo-horizontal-oscuro.png` (el «oscuro» trae letras azules).
  La v4 (plantilla Grabado) quedó aprobada («Sí, queda así»): es la referencia para piezas narradas sin cara.

## 01-nov-2026 · Método de movimiento y parrilla de noviembre
- **Lo que falló al ver referencias:** se copiaba *qué* salía en cada cuadro y no *cómo se movía*. Desde ahora, antes de
  animar: ficha de movimiento por plano (duración, cámara, curva, entradas, corte en el golpe) sacada a 24 fps y una
  **prueba de plano de 5 s en pantalla dividida** con el original, para que Juan David la apruebe antes de la pieza completa.
- **El estilo sale del tema:** cada pieza responde «¿de qué material está hecha esta historia?» (Kafka = papel y tinta;
  firma = barro, cera, tinta y pantalla; IA = luz).
- **Música de ctp-capas:** la receta «institucional» no le convence. Se prueban tres alternativas sobre el mismo corte,
  montando solo el audio.
- **Mata contra Avianca:** descartado para siempre.
- `calendario/2026-11.json` agrega `r: tt` (TikTok) y `e` (listo · producir · grabar). Metricool gratis: una marca,
  sin LinkedIn, 20 publicaciones al mes.
- **Portadas (01-nov-2026):** un cuadro del video con el texto no basta; quiere portadas **trending y artísticas** como la
  cuadrícula de feuxui (`referencias/instagram-2026-11.md`). Componente `remotion/tinta/PortadaEditorial.jsx`
  (composición `portada-jd-kafka`): grotesca condensada gigante (Inter 800 con `scaleX(0.82)`), una línea en el acento,
  retícula con cruces, grano, el objeto dibujado a lápiz cortado por abajo, etiqueta `[ENTRE CORCHETES]` con flecha y
  serie «Pt. 01». Lo importante dentro de y 285–1635 (recorte 4:5 del perfil).
- **Voz clonada que suena falsa en preguntas:** con `[warmly]` la pregunta final salió «risueña» (arrancaba en 193 Hz).
  Para preguntas al público: `[serious, low voice, calm, matter-of-fact]`. Se miden las tomas con F0 por autocorrelación
  (mediana, rango y subida inicial) y se escoge la más grave y estable; se reemplaza solo ese tramo con ffmpeg y se
  remonta el audio sobre el MP4 (`-c:v copy`), sin re-renderizar la imagen.
- **Cuadrícula del perfil de Instagram:** muestra un recorte **3:4 centrado** de la portada 1080×1920 (franja y 240–1680, a
  todo el ancho). Se diseña para ese recuadro con márgenes de ~95 px, repartiendo los elementos como las cuentas de
  referencia (tema arriba a la izquierda, número arriba a la derecha, titular, objeto que entra por un borde, logo y
  flecha en círculo abajo). Encerrar todo en un marco pequeño «se ve forzadamente empaquetado» (lo dijo él). El logo,
  visible: ~56 px de alto en negro.
- **Disco lleno (ENOSPC) en `remotion bundle`:** cada paquete copia `public/` entero (~9 GB) y cada render deja
  `%TEMP%\remotion-*-assets*`. Para portadas y piezas livianas, empaquetar con `--public-dir` apuntando a una carpeta
  con solo lo necesario (`trabajo/publico-portada`: fuentes, trazos, logo; ~100 MB). Borrar los paquetes propios al
  terminar y los temporales de Remotion cuando no haya renders corriendo.

## 2026-11-01 · prueba Matrix con su cara (pins 20 y 21)
- **Recorte de persona sin instalar rembg:** el modelo `u2net_human_seg.onnx` (176 MB, releases de rembg en GitHub) corre
  directo con `onnxruntime`, que ya está instalado. `trabajo/2026-11-matrix/mascaras.py` saca máscara por cuadro
  (~0,3 s/cuadro en CPU) con suavizado temporal para que el borde no tiemble. GrabCut de OpenCV sirve solo para un still.
- **ASCII rápido:** atlas de glifos (VT323, celdas de 12x20) indexado con numpy en vez de dibujar carácter por carácter
  con PIL: 300 cuadros 1080x1920 en pocos minutos (`render.py`).
- **Peso:** el grano encarece el h264: 10 s a crf 16 = 102 MB; a crf 23, 16 MB sin diferencia visible en el celular.
- **Gusto:** IMG_3776 (gabardina beige, casa de balcones verdes) es el clip que menos le gusta: no usarlo.
  «Estilo Matrix» = fondo negro de verdad con lluvia de código, no un retoque de color sobre el plano.

## 02-nov-2026 · N01 rechazado: «no quiero que sea como nada de lo que hemos hecho»
- N01 (pantalla de carga de Namco) salió con el lenguaje de siempre: monitor con marco pixel, subtítulos arriba, barra abajo,
  sprites de divs, cortes de mosaico. Veredicto: «horrible». Era la plantilla Arcade del SOFA con otro guion.
- **El error de proceso:** se prometió una ficha de movimiento y una prueba de plano de 5 s contra una referencia, y se saltó:
  se animó todo de una sin referencia ni aprobación. No volver a renderizar una pieza completa sin que apruebe un plano.
- **Qué evitar en lo nuevo:** la caja/monitor centrado con texto encima y debajo, los subtítulos karaoke como protagonista,
  sprites dibujados con divs, la barra de progreso y la cuadrícula de fondo. Cada pieza parte de un pin suyo concreto
  (tableros `motion-graphics`, `arte-para-lo-digital`, `pixel-art` de jdvanegas52) y lo imita plano por plano.
- **Sonido de N01: «insoportable».** El chiptune sintetizado por código (cuadradas, bombo de seno) no sirve fuera del
  contexto SOFA. La música sale de la referencia: se mide el audio del pin (BPM, textura, dónde golpea) y se busca una
  pista de librería con licencia verificada que se parezca; nada sintetizado por código para piezas nuevas.
- **Reutilizar no es producir:** todo salió de componentes viejos (Pixel.jsx, Sprites.jsx, el caballero del Claustro,
  MarcoPixel, CRT). Para piezas nuevas se parte de cero desde la referencia, no del catálogo del repo.

## 02-nov-2026 · N01 v2 aprobado: «DEEEEL PUTAAAAS»
- **Qué funcionó:** imitar un pin suyo concreto (px344 de Kirokaze) en vez de partir del catálogo del repo; prueba de 5 s
  al lado del pin antes del video entero; escena a pantalla completa (ciudad, luna, torre con detalle, terraza, figura de
  espaldas), la historia contada **dentro de la valla** con barrido de scanlines, movimiento a pasos de pixel.
- **Técnica:** canvas de 270×480 pintado cuadro a cuadro en `useLayoutEffect` y ampliado ×4 con `imageRendering:
  pixelated` (`remotion/n01/CiudadValla.jsx`). El canvas no espera a `useFuentes`: hay que `await cargarFuentes()` y
  `document.fonts.load()` antes de `continueRender`, o salen cuadros con letra serif.
- **Material gratis:** Warped City 2 de ansimuz (CC0, OpenGameArt) para cielo, ciudad, neones, dron y terraza; la
  torre, la valla, la figura y el dinosaurio se dibujan encima. Música «Floating Cities» de Kevin MacLeod (CC BY 4.0,
  crédito en el copy), mezclada con `src/archivo/mezcla.mjs --velocidad 1.07 --silencio 15.6,16.9`.
- **Gusto confirmado:** compra assets solo si son muy buenos y baratos (5–10 USD); prefiere gratis y que se haga todo
  sin pedirle pasos.
- **Versión aprobada de N01 (02-nov-2026, «quedó bien»):** composición calcada del pin con dibujo propio (pantalla gigante
  sin marco, edificios con toldo y letrero, piso en perspectiva con charcos y objetos), figura a **contraluz en pixel duro**
  (silueta umbralizada, borde de luz menta de 1 px, sentada en un banquito: así no flota) y escenario con degradados
  tramados (Bayer 4×4), cables, plantas y salpicaduras. Copia en `trabajo/n01/aprobado/`.
- **Lo que no:** figuras de formas suavizadas en canvas («deforme», «no es pixel art»), trapecios duros («muy cuadrado»),
  y la pregunta final con `[low voice]`: «muy sexual». Las preguntas van con el mismo `[serious, calm]` de la narración.

## Banco de assets gratis (2026-11-02)
- Está en `trabajo/assets/` (≈ 7 GB, ignorado por git): pixel, 3D, overlays, archivo y audio, con licencia exacta por
  pack en `LICENCIA.md` y el índice en `LEEME.md`. Para elegir: `hoja-<categoria>-N.jpg` + `hoja-<categoria>.txt`.
  Las hojas se rehacen con `python -I trabajo/hojas-assets.py trabajo/assets`.
- **Mixkit no es todo libre:** cada clip trae su licencia y muchos son *Restricted* (solo uso personal). Mirarla siempre.
- Pexels, Pixabay, Sonniss, loc.gov y Rawpixel bloquean la descarga automática (Cloudflare): no se esquiva; se baja a mano.
  Videezy pide captcha tras unas 15 descargas y pide crédito «Videezy.com».
- Kevin MacLeod está en Content ID de YouTube: crédito siempre en el copy.
