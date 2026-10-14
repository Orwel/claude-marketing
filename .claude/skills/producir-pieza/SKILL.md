---
name: producir-pieza
description: Produce un video, carrusel animado o story de marketing con el estudio Remotion de este repo — pieza nueva, versión para otra cuenta, edición de los videos grabados del mes, o la parrilla de publicación. Usar cuando se pida "haz un video", "edita los videos de <mes>", "haz carruseles", "stories animadas", "saca la versión de Contrappto", "arma la parrilla", "renderiza", o similar.
---

# Producir una pieza

**Siempre que se edite metraje grabado de Juan David, leer primero [ESTANDAR.md](ESTANDAR.md)**: las
reglas duras (nunca cortar lo que dice, desfase de audio, efectos sin agudos, música presente) y cómo
darle dinamismo al texto con criterio propio. Para carruseles y stories, [ESTANDAR.md §8](ESTANDAR.md).

## Metodología del mes (de la estrategia al archivo)

1. **Estrategia** en el FigJam de Trifuerza (`k01OtwxjWRkXi3HF4Yu11X`): parrilla del mes (v2 con el
   evento), guiones, plan de rodaje, copys de LinkedIn/stories, propaganda por cuenta y los canvas de
   Legal, Academy, Technology y Contrappto. **Todo contenido nace de la parrilla**; lo que se inventa
   aquí (carruseles, stories) llena los días sin video y apunta al mismo objetivo del mes.
2. **Rodaje** un día al mes → `Raw/`. Se identifica cada clip (`identificacion.md` del mes, `_rodaje.json`).
3. **Producción** en este repo: montajes (videos grabados), carruseles y stories (generados).
4. **Calendario** `calendario/AAAA-MM.json` + página de revisión (vista de mes). Juan David publica a mano.
5. **Métricas**: Metricool gratis (conector) para juanda.trifuerza; las otras cuentas, exportación de
   Meta Business Suite. Lo aprendido vuelve a la parrilla del mes siguiente.

### Carpetas

| Dónde | Qué |
|---|---|
| Drive `Redes sociales/<Mes>/Raw` | crudos del iPhone (.MOV), nunca se tocan |
| Drive `<Mes>/Edited/Instagram/<Juanda.Trifuerza \| Trifuerza.co \| Contrappto>/` | reels `<COD>-<JD\|TF\|CTP>-ig.mp4` |
| Drive `<Mes>/Edited/Linkedin/<Juanda.Trifuerza \| Trifuerza \| Contrappto>/` | `<COD>-<JD\|TF\|CTP>-li.mp4` |
| Drive `<Mes>/Edited/Carruseles/<Cuenta>/<cNN-slug>/` | `<slug>-NN.mp4` (Instagram) + `<slug>-NN.png` (LinkedIn) |
| Drive `<Mes>/Edited/Stories/<Cuenta>/` | `hNN-<nombre>.mp4` |
| Drive `<Mes>/Edited/_pendiente-overlay/`, `_reemplazados/` | material en espera / versiones viejas: no se publican |
| repo `piezas/AAAA-MM/*.json` | montajes; `carruseles/` y `stories/` para la plantilla Carrusel |
| repo `calendario/AAAA-MM.json` | qué, cuándo, dónde (fuente única de la parrilla) |
| repo `trabajo/` (ignorado) | crudos locales, transcripciones, paquete de render |
| repo `public/crudos`, `public/app`, `public/broll` | proxies, grabaciones de la app, material propio |

Códigos: `V02…V12` sueltos del mes, `X01…` fuera de guion, `CTP_*` promos de Contrappto, `TF_*`/`TFL_*`
Trifuerza, `DEMO_CTP*`/`DEMO_TFL*` demos, `cNN` carruseles (c0x juanda, c2x Trifuerza.co, c3x Contrappto),
`hNN` stories (h0x–h1x juanda, h2x Trifuerza.co, h3x Contrappto). La ruta de Drive va en `.env`.

### Especificaciones técnicas

- H.264, yuv420p, bt709, 30 fps; audio -16 LUFS / -1 dBTP (loudnorm dos pasadas, CRF 18). `validar.js` lo comprueba.
- Reel Instagram 1080×1920 (5–90 s). LinkedIn 1080×1350 (4:5); Contrappto en LinkedIn 1920×1080.
- Carrusel 1080×1080, láminas de 6 s, sin audio, hasta 10 por carrusel; LinkedIn en PNG.
- Story 1080×1920, 7 s, zonas seguras 220 px arriba y 380 abajo.
- Fuentes locales en `public/fuentes` (Fraunces, Inter, Sora). Sin desenfoques ni grano (no hay GPU).
- **Disco:** cada render o still sobre `remotion/index.js` deja ~3,5 GB en `%TEMP%\remotion-*` (copia
  public/ con los crudos). Para lotes: empaquetar una vez (`remotion bundle`), renderizar desde el
  paquete y borrarlo al terminar. Si el disco se llena, borrar `%TEMP%\remotion-*` sin renders corriendo.
- Renderizar a disco local (`trabajo/`) y copiar a Drive; escribir directo en G: colgó renders.

### Estilo por cuenta

| Cuenta | Tipografía | Colores | Tono y CTA |
|---|---|---|---|
| juanda.trifuerza | Fraunces 600 + Inter | navy #0B1426, crema #F4EFE6, naranja #F26B1D | colega, primera persona; "Comenta CLASE" / "Link en mi perfil" |
| Trifuerza.co (Academy, Technology) | Inter 700 | navy #0B1426, naranja #F28C28, logo claro oficial | institucional, sin "yo"; "Inscríbete" / "Agenda un diagnóstico" |
| Trifuerza Legal | Inter 700 | dorado #C9A227 sobre #030712 | "No se te pasa un término"; `trifuerza.co/legal` |
| Contrappto | Sora | #07141D, azul #0090DE, ámbar #FFB038 | producto, tercero neutral, sin jerga; "Agenda una demo de 20 minutos" |

**Logo de Trifuerza:** el mismo de las propuestas PDF, `public/marcas/trifuerza/logo-horizontal-claro.png`
(firma tipo `imagen`). Con `marca.firma.linea` en la pieza ("Technology", "Academy", "Legal") la firma sale
como en las propuestas: logo, separador fino y la línea del servicio en versalitas con el color de alerta.

Lenguaje visual común: el método de contrappto.com y trifuerza.co (tarjetas de vidrio, resortes 400/25,
estados pendiente→listo con colores semánticos), animación tipo web, nunca plantillas genéricas.

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

## Videos del SOFA (plantilla Arcade)

Entrevistas de Juan David en el Salón del Ocio y la Fantasía (12-oct-2026, DJI 1080×1920 a 60 fps +
iPhone 4K), editadas como un videojuego: él es el jugador (túnica, varita y micrófono) y cada
entrevistado es un personaje que se une a la partida. Lo pidió el 12-oct-2026: "muy videojueguero,
muy friki", "mucho zoom al que esté hablando", "efectos tipo superpoder según el personaje", "que no
pasen de 1 min". Salen a Drive `Octubre/SOFA/Edited/<CODIGO>-JD.mp4` (no a `Octubre/Edited`).

- **Material:** crudos en `trabajo/2026-10-sofa/00-crudo` (copia local de `Octubre/SOFA`), hojas de
  contacto en `hojas/`, transcripciones en `01-transcripciones/` (`transcribir.mjs small`: el `medium`
  no cabe en la RAM libre del PC y tardaba 15 min por clip). `node trabajo/2026-10-sofa/ver.mjs <base>`
  imprime cada palabra con su segundo real (anclado a la voz) para elegir `desde`/`hasta` y `turnos`.
- **Pieza** `piezas/2026-10/sofa-<slug>.json` (`plantilla: "Arcade"`): `escenas[]` de tipo `titulo`
  (Trifuerza voxel 3D + PRESS START), `clip` (un tramo de un crudo: `archivo`, `desde`, `hasta`,
  `personaje` {nombre, clase, mundo, color, stats}, `ficha`, `retrato` {t, x, y, w, h fracciones del
  proxy} → retrato pixelado como el juego del Claustro, `turnos` [{desde, quien: jd|p2}] en segundos del
  original, `lados`/`foco` por persona para el zoom al que habla, `golpes` [{en, texto, estilo:
  golpe|pastilla|xp|daño}], `fx` [{tipo: aura|rayos|corte|onda|relampago|fuego|estrellas|levitar|vuelo,
  en, dura, quien, color}], `juego` [{archivo, en, dura, modo: lleno|dividido|ventana}]), `nivel` (mapa
  3D de voxeles + "NIVEL N"), `juego` (gameplay a pantalla completa), `cierre` (clip con `cta`) y el
  `final` automático (CONTINUE? + firma + CTA).
- **Gameplay real** de trifuerza.co/juego-urosario: `npm run gameplay -- 45 1080 1920 Caballero` abre
  Chrome en kiosko (con ventana: sin ella el juego corre a 1 cuadro/s), acepta términos, entra sin foto,
  elige el disfraz, camina con las flechas y graba el screencast a mitad de resolución (el pixel art se
  amplía con vecino más cercano sin pérdida). Sale a `public/broll/2026-10/sofa/`.
- **Armar y renderizar:** `npm run sofa-armar -- <slug>` (proxies limpios 1080×1920/30 fps en
  `public/sofa/`, corte solo de silencios ≥ 0,5 s, palabras con quién las dice, retratos) y
  `npm run sofa -- <slug> [--prueba] [--cuadro=40,150,300]` (pista chiptune `src/audio/arcade.js`,
  carpeta pública liviana `trabajo/publico-sofa`, bundle, render, loudnorm, validación, copia a Drive).
  Los cuadros de revisión quedan en `trabajo/2026-10-sofa/render/`.
- **Reglas que no cambian:** logo oficial de Trifuerza en el HUD, navy/crema/naranja de juanda, nada de
  lo dicho se corta, cada palabra sale en pantalla (cuadro de diálogo RPG con el nombre de quien habla;
  las del golpe salen en el golpe), la cara nunca tapada (ficha arriba, diálogo abajo, chispas a los
  lados), sin ruido blanco ni agudos duros (las ondas de 8 bits pasan por pasa-bajos), sin desenfoques.
- **Personas reales en las respuestas** (p. ej. un político): van a `verificar[]` y no se montan hasta
  que Juan David decida. Franquicias que no se identifican con certeza llevan nombre genérico.

### El sistema (12-oct-2026, después de la primera tanda)

Lo que falló en la primera tanda: rangos y turnos escritos con tiempos de Whisper (aproximados),
texto doble (golpe + diálogo), retratos recortados a ojo del crudo, la misma transición siempre y el
intro 3D sin relación con el tema. La raíz: producir antes de verificar. El flujo ahora es:

1. **Spec por clip** `npm run sofa-spec -- <base>` → `trabajo/2026-10-sofa/specs/<base>.txt`: cada
   palabra con su segundo real (alineación por tramos de voz + tiempos finos DTW de Whisper), los
   **huecos de silencio** marcados y `?` en las palabras sin energía de voz. Es el guion verificado.
2. **Pieza conceptual** (`trabajo/2026-10-sofa/conceptos.py` las genera todas; `conceptos.py <slug>` reescribe solo esa y las demás no se rearman): `desde`/`hasta` y
   `turnos` caen en huecos (o `fijo: true` cuando uno contesta encima del otro); cada `personaje.tema`
   elige el **mundo** (`remotion/arcade/Mundos.jsx`: pradera, fuego, hielo, espacio, bosque, ciudad,
   mazmorra, digital, terror, muro, oro, claustro) que usan la escena `nivel` siguiente y el título
   (`motivo: "isla:<mundo>"`, `personaje`, `martillo`, `moneda`, `trifuerza` o `juego` + `juegoFondo`
   para la cinemática real); cada golpe es **palabras dichas** (se quitan del diálogo) o un **texto
   propio** (cifras, etiquetas: no toca el diálogo); cada efecto sale de lo que dice
   (`remotion/arcade/Efectos.jsx`: puño, plataformas, mapa, turnos, nivelUp, escudo, combo, vida,
   dinero, kagune, ambientes; y movimientos del video: salto, dobleSalto, teletransporte, clones,
   respawn, golpeado, temblor, crecer, levitar, vuelo). Las transiciones alternan cuatro barridos.
3. **Armar** `npm run sofa-armar -- <slug>` imprime las orillas de cada escena con quién habla
   (`*` = entrevistado) y **avisa** si un corte cae en medio de voz. Nada se renderiza con avisos sin
   revisar.
4. **Cuadros** `npm run sofa -- <slug> --cuadrosAuto` (título, niveles, ficha, efectos) y la hoja de
   retratos; las coordenadas del retrato se leen de un cuadro del **proxy** con cuadrícula.
5. **Render** `npm run sofa -- <slug>`; cada video llega a `Octubre/SOFA/Edited/`. Un render a la vez para todas las
   sesiones: `render.js` toma el candado `trabajo/sofa-render.lock` y el que llega segundo espera su turno (`⏳`).

### Segunda vuelta (13-oct-2026): legibilidad, retratos, intros y cortinillas

Reglas que salieron de la revisión de Juan David (detalle en `docs/APRENDIZAJES.md`, 13-oct):
- **Una sola zona de texto** (`ZONA_TEXTO`, 1200–1470): caja de diálogo o golpe, nunca los dos ni en sitios
  distintos. Sin chispas, sin TIP en la intro, sin `rayos` sobre Juan David en los cierres. CTA del cierre arriba (420).
- **Nada fugaz:** páginas de hasta 10 palabras, mínimo 0,9 s, cola de lectura de 0,9 s al final de cada escena
  (`cola` congelada si el crudo no tiene aire). Golpes de 1,5 s mínimo con la frase entera como vecinas (hasta
  10 antes, 6 después). `revisar.mjs` falla con cajas < 500 ms.
- **Retratos:** `python -I trabajo/2026-10-sofa/caras.py` (OpenCV 4) detecta caras por (clip, segundo) →
  `caras.json` + hojas con cuadrícula en `caras/`; `R(base, t, foco, manual=…)` en `conceptos.py` elige la cara
  cercana al foco o una caja manual para máscaras. Revisar `retratos-hoja.png` antes del render.
- **Intros** (`motivo`): martillo, personaje, moneda, juego (cinemática) y las 2D de `Intros.jsx`: protesto,
  tesoro, plataformas, torneo, tienda, cartuchos, arcade, poderes (combate por turnos), mapa (niebla y teletransporte), espejo (identidad) (`intro: {participantes|productos|juegos}` en la pieza). Videos partidos: `titulo(parte="PARTE 1")` pone la parte dentro del recuadro del título.
- **Cortinillas** (`nivel(n, nombre, estilo)`): vs, seleccion, encuentro, mundo2d, jefe, resultado (usa
  `personaje.resumen` del anterior), mision. Variar dentro de cada video; nunca el mapa voxel.
- **Cortes y texto contra el audio:** si un corte se come o cuela una palabra, `finDuro`/`omitir`; si Whisper corrio una
  frase entera (varias palabras con el mismo segundo en el spec), `anclas: [[frase, desde, hasta]]` medidas con astats.
- **Sin identificar = `anonimo: true`** (sin ficha, pestaña PLAYER N). Duración: hasta ~1:20 si hace falta.

### Musica (14-oct-2026)

- **Descartado:** instrumentos "reales" sintetizados desde codigo (violin, saxo, piano por sintesis aditiva,
  borrada). Juan David: "suena increiblemente horrible". El chiptune si funciona porque el 8 bits ya es sintetico.
- **Lo que quedo (14-oct, "uff esa es"):** el chiptune ORIGINAL de `arcade.js` a 140 BPM con capas (`"bpm": 140,
  "capas": true` en la pieza): arranca con bajo y arpegio, entra la bateria, luego la melodia, y cada 2 compases cambia
  de seccion (A pulso · B flauta de triangulo y bombo sincopado · C segunda voz · D respiro con eco). 152 BPM era
  "muy rapida y no varia tanto". Cada pieza ya
  varia progresion, tonalidad y motivo por su slug. Tambien se descartaron las variantes de `src/audio/chip.js`
  (claustro, pueblo, batalla…): "te pones muy creativo… este metodo no nos funciono". Para probar un cambio de
  musica: UNA muestra de 10 s, nunca un muestrario de varias ("no puedo diferenciar 20 canciones en x segundos").
- **Plano medio:** en tomas abiertas, `ACERCAR` en `conceptos.py` sube `foco.escala` centrado en la cara (caras.py):
  hasta ~2x en clips del iPhone (proxy 4K), hasta 1,3x en los DJI (1080). Cara objetivo ~0,10-0,12 del alto. Instrumentos reales = pistas grabadas de una libreria libre de derechos, con su licencia verificada.
- **Referencia de energia ("perrengue"):** la musica del juego del Claustro (`tri-app/tri-app2/app/juego-urosario/musica.ts`):
  118 BPM, re menor armonica con aire de pasacalle, bombo sincopado, bajo con salto de octava, arpegio de clavecin,
  colchon y melodia que se varia en serie cada 8 compases.
- **Nunca** temas de Nintendo u otras franquicias (Zelda, Mario…), ni versionados en 8 bits: la composicion tiene
  derechos y la cuenta es de un abogado de propiedad intelectual.

## Carruseles y stories animados (plantilla Carrusel)

Mini-videos "pensados tipo carrusel": cada lámina es una metáfora visual animada + texto. Reglas en
[ESTANDAR.md §8](ESTANDAR.md). Modelo: `piezas/2026-10/carruseles/c01-anuncio-clase.json`.

1. **Escribir la pieza** en `piezas/AAAA-MM/carruseles/<cNN-slug>.json` (`tipo: "carrusel"`,
   `formato: "carrusel"`, 1:1) o en `piezas/AAAA-MM/stories/stories-<cuenta>.json` (`tipo: "historias"`,
   `formato: "vertical"`, cada lámina con `id` = una story). Lámina: `metafora` + `datos`, `antetitulo`,
   `titulo` con `*énfasis*`, `texto` corto, `pie` (CTA de la última). Copy de Instagram y de LinkedIn en
   `variantes.<cuenta>`; todo dato de la clase o de producto en `verificar[]`.
2. **Elegir la metáfora por lo que dice la lámina**, no por variedad: `remotion/metaforas/index.js`
   (espejismo, lupa, candado, certificado, firmas, tablero, rompecabezas, boleto, reloj, calendario,
   semaforo, autocompletar, burbujas, balanza, brujula, caja, alarma, vivo, pasos, chat). Si ninguna
   sirve, se escribe una nueva en `remotion/metaforas/` (lienzo SVG 900×560) y se registra.
3. **Revisar cuadros** antes del render: `npx remotion bundle remotion/index.js --out-dir=trabajo/paquete-carrusel`
   y luego `npx remotion still trabajo/paquete-carrusel <slug>--<cuenta>--NN out.png --frame=150 --scale=0.45`
   en las láminas con más texto. Mirar texto cortado, etiquetas encima de números y espacio vacío.
4. **Renderizar**: `npm run carrusel -- AAAA-MM [slug] [--cuenta=x] [--rehacer]` (~25 s por lámina; correrlo
   en segundo plano). Sale a `Edited/Carruseles/<Cuenta>/<slug>/<slug>-NN.mp4` + `.png` (LinkedIn) y
   `Edited/Stories/<Cuenta>/<id>.mp4`. Lo que ya existe no se repite (sin `--rehacer`). Cada lámina se
   renderiza en `trabajo/carrusel-salida` y se copia a Drive (escribir directo en G: colgó un render), con
   tope de 3 min y un reintento.

## Todo video sale completo: video + portada + copy

Una pieza no está terminada hasta que tiene las tres cosas y están en el calendario:
1. **Video** en `Edited/<Red>/<Cuenta>/` (carruseles: láminas + `<slug>-linkedin.mp4`, porque LinkedIn
   admite un solo video por publicación).
2. **Portada**: `npm run portadas -- AAAA-MM [slug]` → `Edited/Portadas/<Cuenta>/<COD>-<JD|TF|CTP>-<ig|li>.jpg`
   (mismo nombre del video). Cuadro limpio de la grabación (tramo de cuerpo más largo, a un tercio, o
   `variantes.<cuenta>.portadaSegundo`) + título: `portada` > `gancho` > título de la pieza, con
   `*énfasis*`. Carruseles no llevan: su portada es la primera lámina. Reglas en ESTANDAR §9.
3. **Copy** por cuenta y red: Instagram y LinkedIn distintos, un solo CTA por cuenta. Fuentes que lee
   el calendario: `Octubre/copys.md` en Drive (videos del mes), `variantes.<cuenta>.copy/copyLinkedin`
   de cada pieza y `calendario/AAAA-MM-copys.json` (lo demás: posts de texto, videos sin copy).
   **Siempre 5 hashtags** al final de cada copy, por tema y cuenta (`hashtags` y `hashtagsPorPieza` en
   `calendario/AAAA-MM-copys.json`; la página los agrega y reemplaza los que traiga el copy).
   **Juan David lee los copys en el celular**: la página del calendario muestra cada copy con botón
   "Copiar", el archivo y la portada. Un .md en Drive no le sirve desde el teléfono.

## Parrilla de publicación

Juan David publica a mano (Instagram en Meta Business Suite, LinkedIn con su programador); **todo sale
del calendario** `calendario/AAAA-MM.json` (d, h, c, r, f, p, t, n). La página para revisarlo se genera
desde ese JSON (vista de mes y de lista, detalle al tocar un día, archivo exacto a subir, copy y portada).
Cada publicación tiene su estado (pendiente, programada, publicada, omitida): lo marca Juan David en la
página y se guarda en la base del artefacto, colección `publicaciones` (id `AAAA-MM-DD_HHMM_cuenta_red_codigo`),
que sobrevive a las republicaciones. Leerla con ArtifactData antes de rehacer la parrilla o medir.

- **Balance:** ningún día cargado y otro vacío. Octubre 2026: juanda IG a diario (reel o carrusel) y
  LinkedIn lun–vie; Trifuerza.co IG mar/jue/sáb y LinkedIn lun/mié/vie; Contrappto IG lun/mié/vie y
  LinkedIn mar/jue (demos los miércoles en ambas). Sáb 2–3, dom 1–2. Stories animadas casi a diario.
- Los días sin video llevan carrusel. La versión de otra cuenta sale 3–7 días después que la de juanda.
- Encuestas y caja de preguntas: la story sale con el fondo animado y él pone el sticker al publicar.
- Artículos de LinkedIn: se escriben aquí, se publican a mano.
- Descartado: Metricool pago, Claude haciendo clics en el navegador (él usa Opera), ManyChat gratis
  (25 contactos). "Comenta CLASE" → Automatizaciones de Meta Business Suite (gratis). Metricool gratis
  sirve para leer métricas de juanda.trifuerza con su conector.

## Brochures y propuestas en video (plantilla Brochure)

Un brochure o una propuesta de servicios contados como video, 100 % generado, sin voz. Modelos:
`piezas/2026-10/brochure-trifuerza-legal.json` y `propuesta-video-libertadores.json` (también
`-academy` y `-dostierras`). Escenas: `portada`, `capitulo` (titular + kit: tabla, avisos, versus,
pasos, chat, firma, kanban, masiva), `tarjetas`, `planes`, `cierre`. Iconos: nombres de lucide-react
(`CirclePlay`, `Building`; `PlayCircle` y `Building2` no existen en esta versión).

- **Storytelling y metáforas:** una propuesta en video se cuenta como historia (problema → orden → un capítulo
  por servicio → cierre), explicando en vez de mostrar cifras. La escena `metafora` dibuja la idea con las
  metáforas animadas de `remotion/metaforas` (`"metafora": "lupa", "datos": {…}`): rompecabezas (algo
  incompleto), pasos (un orden), certificado (existir legalmente), lupa (analizar), semaforo (probabilidad:
  alta/media/baja), candado (proteger), reloj (plazos), firmas (cuántos casos), tablero (panel al día),
  balanza (comparar o "todo junto"). Un servicio distinto = capítulo distinto (en Dos Tierras la marca y la web
  van separadas). Los precios y descuentos se dicen en una frase o se dejan al PDF; sin tabla de planes.
- **Música por negocio** con `"musica"` en la pieza (sintetizada en `src/audio/pista.js`, sin licencias):
  `institucional` (campanas, Do mayor, ~96 BPM: software y universidades), `optimista` (marimba, Sol mayor,
  ~112 BPM: educación), `calido` (guitarra pulsada, La menor, ~92 BPM: emprendimiento y negocios de producto),
  `webinar` (por defecto). Para un negocio nuevo, agregar un estilo en `ESTILOS_BROCHURE`.
- **Propuestas de servicios:** mismos datos y precios que el PDF (skill `propuesta-servicios`); nunca a redes.
  Con `"drive": { "carpeta": "propuestas", "nombre": "Propuesta_<Cliente>_v1 - Video" }` el render las copia
  a `CARPETA_PROPUESTAS/<semestre>/<nombre> (horizontal|vertical).mp4`, junto al PDF.
- Formatos `["horizontal", "vertical"]`: horizontal para computador y presentación, vertical para el celular.
- Revisar cuadros con `remotion bundle` + `remotion still` antes del render; `npm run render -- <slug>`.

## Piezas generadas (Animado, Vertical, DemoApp, Clase)

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
