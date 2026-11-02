---
name: video-artistico
description: Produce un reel narrado y artístico a partir de una referencia (pin de Pinterest, reel de Instagram o estilo del catálogo) — todo dibujado y animado, contado con la voz oficial de Juan David y música de librería, con portada editorial y kit de publicación — y va sumando cada estilo nuevo al catálogo docs/ESTILOS.md. Usar cuando pida "haz un video como este" (con un link de Pinterest o Instagram), "hazlo en el estilo de <referencia>", "un video sin mi cara", "un video como el de Kafka", "más artístico, menos IA", "imita este video con nuestra historia", "captura este estilo" o "haz la portada así". NO usar para editar videos grabados del mes con su cara (producir-pieza, plantilla Montaje), clases grabadas (editar-clase-grabada) ni propuestas (propuesta-servicios).
---

# Video artístico desde una referencia

Juan David quiere videos **hechos con herramientas, pero que no parezcan IA**: artísticos, narrativos, todo dibujado y
en movimiento. El primero fue «Kafkiano» (nov-2026, `piezas/2026-11/jd-kafka.json`, plantilla `Grabado`); marca el
**nivel**, no el estilo: cada video nuevo explora un estilo distinto.

Antes de empezar, leer **`docs/ESTILOS.md`** (catálogo de estilos, las cinco reglas, portadas, voz y lo que NO va) y
las entradas de nov-2026 de **`docs/APRENDIZAJES.md`**.

## Las cinco reglas (no se negocian)
1. **Contextual:** el mundo visual sale del tema (Kafka = grabado y archivo de 1920; IA = partículas; producto = su interfaz).
2. **Se dibuja lo que se narra:** cada frase de la voz tiene su imagen y aparece mientras se dice. Nada de relleno.
3. **Todo se mueve:** se traza, se construye, se sombrea; los personajes **actúan** (respiran, giran la cabeza, miran,
   fuman, envejecen). Solo transiciones no basta: «quiero que los muñecos se muevan».
4. **Ritmo de la referencia:** ráfaga de cortes (0,3–0,8 s), una pausa larga hermosa, destellos en los cortes, cierre en
   bucle; los cambios caen en los golpes de la música.
5. **El texto acompaña sin tapar:** cada palabra dicha en pantalla, moderna, en su zona, nunca sobre la cara o el gesto.

## Proceso

### 1. Analizar la referencia de verdad (no a ojo)
```bash
node src/archivo/referencia.mjs <mp4|url directa> trabajo/<slug>/referencia
```
Da `hoja.png` (un cuadro por segundo), los cortes de escena y el audio (volumen por segundo, golpes, BPM). Cómo sacar
la url directa de Pinterest e Instagram está en la cabecera del script. Mirar también 3–4 cuadros **en grande**: el
trazo, la textura y el detalle de las figuras se pierden en la hoja. Escribir el análisis en
`referencias/<fuente>-<AAAA-MM>.md`: plano por plano qué pasa, técnica, ritmo, color, texto (o su ausencia).

### 2. Escoger o capturar el estilo
- Si el estilo ya está en `docs/ESTILOS.md`, seguir su ficha.
- Si es nuevo, **agregar su ficha** al catálogo (para qué historia sirve, mundo, cómo narra dibujando, movimiento,
  música, herramientas) antes de producir. Así el catálogo crece con cada video.

### 3. Guion de ~40 s
Gancho fuerte en el primer segundo, la historia contada en imágenes, una idea central y un cierre (pregunta o «Comenta
PALABRA»). Escribirlo en `piezas/AAAA-MM/guiones/<slug>.md` con la imagen de cada frase. Tono de `docs/TONO.md`; todo
dato va a `verificar[]`. Juan David lo aprueba antes de locutar.

### 4. Voz oficial
Conector de ElevenLabs, voz **«Juan Da Voice oficial»** (`ZdAh80pu3q47gWzmqvOL`; el clon «Juan David Vanegas» no se usa).
- Primero **una muestra de 10 s** con el gancho; luego el guion completo en **una sola toma** (`generations_count: 1`).
- Narración: `[serious, calm]` y `[pause]` antes de lo importante; `[long pause]` antes del giro.
- **Preguntas al público:** mismo tono de la narración. Generarlas con la frase anterior delante y cortar; nunca
  `[warmly]` (suena risueña y falsa). Comparar tomas con `python -I src/archivo/tono.py <narración> <toma1> <toma2>`.
- Bajar el audio con `creative_get_flow_run_status` (url `content_url`) a `public/<slug>/voz.mp3`.
- Si una frase sale mal, regenerar solo esa y empalmarla con ffmpeg; no relocutar todo.
- La voz es lo único hecho con IA: el kit de publicación lo explica y la etiqueta de Meta queda a decisión de él.
  Alternativa sin IA: él graba la locución con el mismo guion (`docs/LOCUCION.md`).

### 5. Música y mezcla
Canciones reales de librería con licencia verificada (Kevin MacLeod en incompetech.com, CC BY 4.0, crédito en el copy;
Pixabay Music; ya hay 83 pistas listas en `trabajo/assets/audio-*`). Nunca instrumentos sintetizados por código ni temas de franquicias. Guardarlas en `trabajo/musica-libre/`.
```bash
node src/archivo/mezcla.mjs public/<slug>/voz.mp3 trabajo/musica-libre/<cancion>.mp3 public/<slug>/mezcla.wav --velocidad 1.07 --desde 34 --silencio 27.8,29.4
```
`--velocidad` deja la pieza en ~40 s sin cambiar el tono; `--silencio` hace el golpe dramático con descenso suave
(nunca abrupto). Tiempos de cada frase: `silencedetect` sobre la voz, divididos por la velocidad.

### 6. Material: nada de imágenes de IA
- **Fotos de época y obras de dominio público** (Wikimedia Commons; verificar `LicenseShortName`; el API da 429 si se
  piden muchas seguidas) → `python -I src/archivo/trazos.py <foto> public/<slug>/trazos-x.json --recorte x,y,w,h
  --elipse cx,cy,rx,ry` convierte una persona en dibujo a lápiz vectorial (contornos, sombreado, negros) que se dibuja
  solo. Ubicar cabezas con una rejilla para animarlas.
- Manuscritos: tinta con alfa (dividir por el fondo desenfocado) y escribirlos renglón por renglón.
- 3D cuando suma (escaleras, arquitectura): three.js como `remotion/tinta/Escalera3D.jsx` (rayado de canvas,
  contornos `LineSegments2`, niebla del papel, la escena se construye delante de la cámara).
- **Banco de assets gratis** en `trabajo/assets/` (no está en git; ≈ 6,6 GB, armado el 2026-11-02). Mirar ahí
  **antes** de dibujar o buscar algo:
  - Índice y licencias: `trabajo/assets/LEEME.md`. Cada pack trae `LICENCIA.md` con el texto exacto y el crédito.
    Si pide crédito, va en el copy y en `verificar[]`.
  - Para elegir: las hojas `trabajo/assets/hoja-<categoria>-N.jpg` (miniaturas numeradas) y
    `hoja-<categoria>.txt` (número → archivo). Se rehacen con `python -I trabajo/hojas-assets.py trabajo/assets`.
  - `pixel-*` y `warped-*`: ciudades de noche, vallas y neón, lluvia, lunas, cielos, efectos. Para escalar sin
    suavizar, usar `imageRendering: 'pixelated'`.
  - `3d-*`: objetos antiguos y HDRI de Poly Haven, animales animados, KayKit con animaciones.
  - `fx-*`: grano, quemaduras, humo, tinta, lluvia y partículas. No traen alfa: van en modo Pantalla o Multiplicar.
  - `archivo-*`: grabados de dominio público, la patente de Namco y texturas de papel.
  - `audio-*`: música (cada carpeta trae `pistas.csv` con el crédito) y efectos de sonido.
  - Copiar a `public/<slug>/` solo lo que la pieza usa; nunca el pack entero.
  - Avisos: Kevin MacLeod está en Content ID (crédito siempre). De Mixkit solo sirven los clips con «Free License»;
    los *Restricted* no. Los packs «sin redistribuir» sí se usan dentro del video.

### 7. Construir las escenas
Partir de `remotion/plantillas/Grabado.jsx` (escenas por `tipo`, frases, destellos, line boil, figuras animadas como
recortes con `partes`/`respira`/`humo`) o crear una plantilla nueva para el estilo, con la misma idea: una escena por
bloque del guion, cada cosa aparece cuando se dice. La pieza va en `piezas/AAAA-MM/<slug>.json` con `plantilla`,
`audio`, `escenas`, `frases`, `destellos`, `trazos`, `variantes.<cuenta>.copy` y `verificar[]`.

### 8. Probar antes del video entero
**Una escena de prueba** (render corto) cuando el estilo es nuevo y que él la apruebe; luego cuadros fijos de todo el
video (`npx remotion still … --scale=0.3`, en hoja) para revisar texto, cortes y figuras. El primer intento de Kafka
falló por saltarse esto.

### 9. Render
`npm run render -- <slug>` (deja el MP4 en `Redes sociales/<Mes>/Edited/` y lo valida). Con three.js va con `--gl=angle`.
**Disco:** cada `remotion bundle` copia `public/` entera (~9 GB); para portadas y pruebas usar `--public-dir` con una
carpeta liviana, y borrar paquetes propios y `%TEMP%\remotion-*-assets*` sin renders corriendo. Para cambiar solo el
audio: montar la mezcla nueva sobre el MP4 con `-c:v copy`.

### 10. Portada editorial y kit de publicación
- Portada: `remotion/tinta/PortadaEditorial.jsx` (composición por pieza en `Root.jsx`): grotesca condensada gigante, la
  palabra clave en Fraunces itálica con el acento, el objeto dibujado entrando por un borde, número de serie, logo de
  Trifuerza en negro y visible. Diseñada para el **recorte 3:4 del perfil** (y 240–1680, márgenes ~95 px), repartida en
  todo ese recuadro. Va a `Edited/Portadas/<Cuenta>/<slug>-<JD|TF|CTP>-ig.jpg`.
- Kit `piezas/AAAA-MM/<slug>-publicar.md`: archivos, **mejor hora según Metricool** (`getBestTimeToPostByNetwork`, marca
  juanda.trifuerza `7140789`, zona `America/Bogota`), copy con créditos y 5 hashtags, checklist y plan de la primera hora.
  No se publica de domingo en la noche.

### 11. Cerrar
- Anotar en `docs/APRENDIZAJES.md` lo que falló y lo que le gustó (con sus palabras).
- Actualizar la ficha del estilo en `docs/ESTILOS.md` con lo aprendido.
- Entregar con `SendUserFile` el video y la portada, y pedir su visto bueno. Él publica a mano.

## Lo que ya sabemos que NO
Pictogramas o muñecos genéricos; fotos quietas con solo zoom; filtros que convierten fotos en rayado (parece billete);
neón o cajas detrás del logo (va en negro sobre claro); texto sobre la cara; separar el texto tan estrictamente que se
vea viejo; pausas abruptas; voz «cálida» en preguntas; portadas encerradas en un marco pequeño; copiar tal cual el
diseño de otra cuenta (inspirarse, con identidad propia).
