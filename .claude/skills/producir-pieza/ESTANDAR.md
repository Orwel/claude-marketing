# Estándar de edición · videos grabados de Juan David

El nivel de referencia es `la-ia-que-nadie-entiende-webinar` (plantilla Vertical) y el V04 de
octubre 2026 (plantilla Montaje). Juan David: "lo hiciste inigualablemente bien… identificaste algo
en el texto y le diste dinamismo". Este documento junta lo que se aprendió para llegar ahí. Las
**reglas duras** no se negocian; el resto es criterio, y se espera creatividad.

## 1. Lo que nunca se hace (reglas duras)

- **Nunca cortar lo que dice.** Antes una pausa de medio segundo de más que una sílaba de menos.
  Ojo con el **remate en voz baja** ("…completamente distintas" a -40 dB): el umbral de voz es
  piso + 8 dB o voz fuerte − 28 dB, y ninguna toma termina antes del final de la última palabra
  según Whisper + 0,35 s (red de seguridad en `cortar`). Escuchar/medir siempre los últimos 2 s.
  Solo se recortan silencios claros (≥ 0,5 s), con 0,2 s de aire antes y 0,3 s después.
- **Corregir el desfase de audio antes de cortar.** En los .mov del iPhone el audio arranca ~0,73 s
  después que el video; cualquier tiempo medido sobre un audio extraído (Whisper, detección de voz)
  hay que correrlo con el `start_time` del stream de audio (`desfaseDe` en `src/montaje/armar.js`).
  Sin esto cada corte se come el final de la frase.
- **No confundir ruido con voz.** La voz se detecta en su banda (300–3400 Hz) con umbral relativo al
  clip. Un camión, un carro o viento no abren un tramo.
- **Nada de ruido blanco ni agudos duros en los efectos.** Todo efecto es tonal y con ataque de
  3–5 ms. Clicks de 3 kHz sin ataque y campanas FM sonaban a "estática rarita".
- **Música que se oiga:** ~6 dB bajo la voz, ducking de apenas 3 dB. Con -9 dB "no tiene musiquita".
- **Sin intro grabada** (no le gustó). El video arranca con la primera frase del tema y el gancho.
- **Planos de la cintura para arriba** y **la cara siempre en cuadro**. Si se aleja o se agacha,
  el encuadre lo sigue (`seguirPersona`).
- **Subtítulos cuadrados con la voz:** las palabras se anclan a tramos de voz finos (pausas desde
  0,2 s); con tramos largos se reparten a ojo y el subtítulo se descuadra. El corte es aparte
  (solo pausas ≥ 0,5 s).
- **Subtítulos:** mayúscula al empezar y tras punto, puntuación respetada, sin comillas sueltas,
  nunca karaoke (una palabra resaltada por página). Nombres propios corregidos
  (`correcciones` en la pieza: Cathy O'Neil, COMPAS, Claude, ChatGPT…).
- **No bajar la calidad para ir más rápido** (nada de renders a escala menor para entregar).
- Todo dato jurídico o de producto en `verificar[]`. Ningún cliente identificable.

## 1b. Nivel cinematográfico (la palabra que usa Juan David)

Todo tiene que sentirse de cine: apertura con franjas negras que se abren, viñeta sobre el metraje,
destellos de luz cálidos (mezcla *screen*) al salir de cada barrido y cuando cae la palabra clave de
un golpe (`remotion/montaje/Cine.jsx`). Nada de grano ni ruido (se lee como estática) ni desenfoques
(no hay GPU). Se vale sumar recursos de cine nuevos: cambios de lente, rampas de velocidad, títulos
con tracking, siempre con esa vara.

## 2. Ritmo

- Todo a 1,12× (más de ~1,15× la voz se oye apurada).
- Cortes dentro de una misma grabación: empuje de cámara alterno 1 / 1,12 para que el salto se sienta
  intencional. Entre grabaciones: barrido diagonal de marca con su sonido tonal.
- Acercamientos de golpe (1,15×, entran en 6 cuadros) en palabras con peso, uno cada ~4–6 s.

## 3. Leer lo que dice, no el guion

Juan David se sale del guion. Antes de poner un gráfico, **leer la transcripción real**
(`pieza.generado.texto`, o el `.captions.json` si la pieza no está armada) y entender el argumento:
cuál es la tesis, dónde está el giro, qué palabra carga la frase, dónde hay una cifra, una pregunta,
una contradicción o una lista. Un gráfico atado a una frase que no dijo se salta solo; eso es una
señal para reescribirlo, no para dejar el hueco.

## 4. Dinamismo con intención (el margen creativo)

La idea no es repetir una fórmula, es **identificar algo en el texto y darle un tratamiento que lo
haga sentir**. Herramientas disponibles en la plantilla Montaje (y equivalentes en Vertical):

| Qué hay en el texto | Tratamiento posible |
|---|---|
| La palabra que carga la frase (tesis, giro, remate) | **golpe cinético** (`pieza.golpes` + automáticos): la frase hablada aparece palabra a palabra cuando la dice y la clave explota letra por letra (onda expansiva, estallido de trazos, subrayado que se dibuja, ondulación, salida en cascada). Estilos que se alternan: golpe (sans pesada), serif (itálica de acento), pastilla, contorno que se llena |
| Una pregunta al público | golpe en estilo **pastilla** sobre la palabra de la pregunta |
| Un giro "no es X, es Y" | golpe en **contorno** o **serif** sobre la Y |
| Cifras, listas, comparaciones, citas, libros | `beats` (paneles): cifra, lista, pasos, comparativa, cita, libro, tarjeta… |
| Conceptos concretos (IA, abogado, contrato, error, tiempo, datos) | chispas automáticas: icono + palabra (`ICONOS` en `linea.js`; ampliar el diccionario cuando falte) |
| Una serie o tema recurrente | etiqueta de serie (`variantes.<cuenta>.etiqueta`), **solo en la pieza que la pida**: no es una etiqueta fija para todos los videos |

Criterios:
- **Nada se encima, y lo que choca se reubica, no se quita** (29-sep-2026). En 16:9 (Contrappto en
  LinkedIn) el rótulo de nombre va sobre la tarjeta del video, y el titular espera debajo del gancho y
  sube cuando este sale. Al tocar la geometría (`DISENOS` en `Montaje.jsx`), revisar cuadros de los tres
  formatos en el segundo 2 (gancho) y el 4 (rótulo).
- **Llenar sin tapar:** algo pasa cada 2–4 s, pero la cara nunca queda tapada y nunca hay dos cosas
  compitiendo en el mismo sitio (golpes, chispas, paneles y rótulo de nombre se esquivan solos).
- **Variar:** no dos golpes seguidos del mismo estilo; cambiar tipografía, escala y lado.
- **Cada palabra dicha sale en pantalla exactamente una vez**: en el subtítulo o en el golpe. Nunca
  se oculta una página entera de subtítulos (se perdían "juez federal seis casos"): las páginas se
  parten en los bordes del golpe. `npm run revisar -- AAAA-MM` lo comprueba y `render.js` no
  renderiza si falla (palabras perdidas, subtítulos que no alcanzan a leerse, palabras pegadas).
- **Nada se lee dos veces ni queda quieto.** El golpe usa las palabras que dice (no un texto aparte)
  y la página de subtítulo que se cruza con él no sale. Un texto estático en pantalla, o uno que
  repite el subtítulo, es un error (27-sep-2026: "quieto y repetido").
- **Repartido en todo el video, no al final:** ~1 golpe cada 5 s de tiempo libre (sin panel), más
  acercamientos, chispas y paneles. Si una pieza queda con pocos, escribir más `golpes` a mano.
- Se vale inventar tratamientos nuevos (un componente más en `remotion/montaje/` o `remotion/graficos/`)
  cuando el texto lo pide. Lo que funcione, se documenta aquí.

## 4a. El método web (Contrappto, Trifuerza Legal): `remotion/kit/`

Juan David quiere las animaciones de contrappto.com y trifuerza.co/legal, pero **no copiadas ni
genéricas: el método, ajustado a cada video** (28-sep-2026). El kit tiene el lenguaje, no pantallas:

- **Movimiento** (`kit/movimiento.js`): resorte firme 400/25, desplazamientos cortos (8–14 px),
  escalonado de 2–3 cuadros, loops como funciones del cuadro, azar con semilla. Cada item de una
  escena entra **cuando se dice su palabra** (`items[].en` → `itemsCuadros`).
- **Tema** (`kit/tema.js`): sale de la marca (`marcas/<id>.json` → `web`) más colores semánticos
  (listo esmeralda, crítico rojo, pendiente ámbar, activo sky, persona violeta). `b.tema` cambia el
  acento de una escena (Trifuerza Legal: dorado #C9A227 sobre #030712).
- **Escenas** (`tipo: "escena"`, `escena: …`): `chat`, `terminal` (auditoría línea a línea),
  `versus` (roja vs verde), `pasos` (ciclo de vida con conector que se llena), `tabla` (filas que
  entran, fila crítica en rojo, alerta que se despliega, buscador que se escribe), `metricas`
  (cuentan), `avisos` (Telegram/correo/WhatsApp cayendo), `documentos` (Generando → Listo), `firma`
  (biometría + stepper), `masiva` (una plantilla que se multiplica al ritmo de los números que dice),
  `kanban` (la tarjeta salta de columna), `app` (la grabación real de la app en un celular 3D, con
  datos personales tapados y rótulos a los lados), `medio` (fotos/clips propios como polaroids que
  vuelan en 3D con Ken Burns y barrido de luz). `fondo3d: true` pone detrás las hojas de contrato
  flotando (el hero 3D de Contrappto, en CSS: sin WebGL, no hay GPU).
- **No mezclar productos:** Contrappto (contratos digitales, firma biométrica, cobros, masiva) y
  Trifuerza Legal (procesos, radicados, alertas judiciales, Telegram, desistimiento tácito) nunca
  comparten escenas ni textos. Copys que no están en la landing (cobros, recibos, masiva) van a
  `verificar[]`.
- **Pensar fuera de la caja:** la escena se elige por lo que dice (dice "2, 10, 20, 30, 40" → la
  cuadrícula crece a ese ritmo; dice "Telegram o correo" → caen esas dos notificaciones). Si ninguna
  sirve, se escribe una nueva en el kit y se documenta aquí.
- **Grabaciones de la app:** convertir a H.264 720 px de ancho en `public/app/<mes>/`; tapar datos
  reales (`app.tapar`, fracciones de la grabación; con `texto` genérico para que no se note), recortar
  barra de estado y navegador, y usar `velocidad` baja donde hay scroll que podría mostrar datos.
- Material propio del evento (fotos/clips): `public/broll/<mes>/`, fotos a 1600 px, clips H.264.

## 4b. Marca (hacerlo bien "marcario")

- **Logo de Trifuerza** en los videos de juanda y trifuerza, arriba a la izquierda durante el cuerpo:
  archivos oficiales del Drive (`Redes sociales/Assets/Logos/Trifuerza`), copiados a
  `public/marcas/trifuerza/` y recortados solo en su margen transparente.
  - Sobre video o fondo oscuro: `logo-horizontal-claro.png` (ícono a color, letras blancas puras; desde el 4-oct-2026 es "Mesa de trabajo 6 copia 3" de Drive: la versión anterior tenía las letras azuladas y a Juan David no le gustó), sobre una
    pastilla oscura translúcida que le da contraste y espacio de protección.
  - Sobre fondo blanco: `logo-horizontal-oscuro.png` (letras navy). Desde el 28-sep-2026 Trifuerza va
    en **navy**, no en blanco (no le gustó el blanco); lo entregado antes no se toca.
  - Nunca recolorear, deformar, recortar el ícono ni redibujar el logo. Las versiones con resplandor
    ("desenfoque") no se usan en video: el brillo se ensucia al comprimir.
- Contrappto usa su isotipo como marca de agua (derecha). Una marca nueva: pedir el logo oficial.

## 5. Outro

Cierres grabados de juanda en oct-2026: `clase15` ("…webinar gratuito… comenta clase e inscríbete")
y `webinar` ("si quieres entender mejor… comenta clase"); cada pieza toma uno fijo por su slug para
variar. **El clase08 está descartado** (lo dice agachado y lejos). Un cierre donde se aleja, se
agacha o sale de cuadro no se usa: se busca otro en `piezas/<mes>/_rodaje.json`.


Pantalla dividida: él en la mitad de abajo (encuadrado por seguimiento, subtítulo bajo la barbilla) y arriba el CTA animado
grande ("Comenta CLASE": verbo + palabra clave en pastilla que late, icono que rebota, flechas).
Entra tapada por el barrido. El cierre grabado se corta donde termina de hablar, nunca antes
(verificar que la última palabra, p. ej. "inscríbete", suene completa).

## 6. Sonido

- Música por pieza, "distinta aunque similar": receta del webinar (pad, arpegio con eco, bombo),
  variante elegida por `estiloDe(slug)` (progresión, tonalidad, tempo, patrón).
- Efectos: pop en acercamientos y cortes con zoom, barrido en cambios de grabación, click + tick
  suaves en chispas, impacto grave en golpes, campanita de tonos puros en paneles y outro.
- Fundido de 3 cuadros en cada corte de voz (sin él, cada corte suena a chasquido).
- Mezcla final: -16 LUFS integrado, -1 dBTP (loudnorm en dos pasadas, lo hace `render.js`).

## 7. Antes de entregar

Errores que ya pasaron y se revisan siempre:
- Palabras pegadas por comillas de Whisper (`pensando"eso` → "pensando eso"): las comillas se
  vuelven espacio en subtítulos y chispas.
- Palabras mal oídas que se corrigen **por contexto** (`correcciones`): "estaré editando" →
  "estaré dictando" (el webinar se dicta), "Keith O'Neill" → Cathy O'Neil, "Cloth" → Claude.
  Leer la transcripción completa buscando lo que no tiene sentido.
- La última palabra del cuerpo y del cierre, completa.


1. Cuadros clave con `remotion still` (inicio, un golpe, un panel, el barrido, la outro): texto
   cortado, palabras pegadas, choques, cara fuera de cuadro.
2. Al final del audio, la última palabra completa (`astats` sobre los últimos 3 s).
3. Agudos de la pista (> 5 kHz) por debajo de -35 dB si no hay voz: si hay picos, es un efecto duro.
4. Lo que se aprenda de sus comentarios va a `docs/APRENDIZAJES.md` y, si es general, a este archivo.

## 8. Carruseles y stories animados

Lo pidió el 29-sep-2026 ("pequeños videos con movimiento, pero más tipo post"; "quedó súper bien hecho").

- **Un carrusel es un video cortado en partes, no un video entero.** Cada lámina es su propio MP4, en
  Instagram y en LinkedIn. Nunca unir las láminas en un solo video. LinkedIn admite un video por post:
  allá va el mismo carrusel en imágenes (PNG del último cuadro de cada lámina).
- **El cuadro 0 es la portada:** Instagram toma el primer cuadro del primer video del carrusel como
  portada. En la lámina 1 ese cuadro muestra la lámina ya armada (`<Freeze>` del último cuadro) y desde
  el cuadro 1 corre la animación. Lo mismo vale para cualquier video: nunca arrancar en vacío.
- **Formato cuadrado 1:1 (1080×1080)** para carruseles; stories 9:16 con zonas seguras (220 px arriba,
  380 abajo).
- **Metáfora visual + texto corto por lámina.** La metáfora carga el sentido antes de leer (documentos
  que se desvanecen = alucinación; candado y barras negras = anonimizar; balanza = transforma bien,
  recuerda mal). Una idea por lámina; título de 2 líneas como mucho.
- **La lámina termina quieta pero viva** (latidos, brillos): en Instagram el video de carrusel se repite
  en bucle. Entradas con la curva de los sitios, sin desenfoque ni grano (§1b).
- **Primera lámina con "Desliza →", la última con el CTA** (un solo CTA por cuenta). Las del medio,
  puntos de progreso.
- **Datos de mentira que no parezcan reales:** radicados "Rad. ••• / 20••", procesos "0457" marcados
  como ejemplo en `verificar[]`. Nunca un número de sentencia real presentado como inexistente.
- **Público de la clase del 27: todo público**, no solo abogados. Nada de "para abogados" ni preguntas
  de litigante en las piezas de la clase.
- **Cada producto con su mundo:** Trifuerza Legal en dorado #C9A227 sobre casi negro (`pieza.colores`);
  Contrappto con tono de producto y cierre "demo de 20 minutos", nunca "comenta CLASE"; Technology
  con cierre "agenda un diagnóstico". Afirmaciones de producto del canvas → `verificar[]`.
- **Stories para mantener la comunidad activa:** cuenta regresiva, encuestas, caja de preguntas, "en
  vivo", gracias. Las de encuesta/preguntas son el fondo; el sticker lo pone él.

## 9. Portadas (feed de una sola serie)

Pedido del 29-sep-2026: "que le demos a todo la misma portada". El feed se lee como una serie:
- **Foto limpia** de la grabación (sin subtítulos ni gráficos), cara centrada; degradado de la marca
  abajo; firma de la cuenta arriba (`Firma` sobre pastilla oscura).
- **Título grande** con la tipografía de la cuenta (juanda: Fraunces), 1–3 líneas, palabra clave en
  el acento; barra de acento encima. Nada de textos pequeños, stickers ni colores ajenos a la marca.
- **Reel 9:16:** firma y título dentro de la franja 3:4 (240–1680 px), que es lo que muestra la
  cuadrícula del perfil. LinkedIn 4:5 con la foto completa; Contrappto 16:9 con la foto en tarjeta a
  la izquierda y el título a la derecha.
- **Reels ya publicados** sin video original (`piezas/<mes>/portadas/anteriores-<cuenta>.json`): la
  miniatura vieja trae textos que se enciman, así que va una **ilustración nueva** (metáfora de
  `remotion/metaforas`, como en los carruseles del evento) con el **título centrado** y la misma firma.
  Salen a `Edited/Portadas anteriores/NN-<id>.jpg`, en el orden del perfil. Instagram deja cambiar la
  portada de un reel publicado.

