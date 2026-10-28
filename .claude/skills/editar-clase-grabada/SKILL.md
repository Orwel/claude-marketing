---
name: editar-clase-grabada
description: Edita una clase grabada de Trifuerza Academy (en vivo por LiveKit o pregrabada) para venderla o publicarla en la plataforma — transcribe, elige el punto de inicio, difumina chats y datos personales, sincroniza imagen y sonido, pone el intro del logo de Trifuerza, subtítulos en español, el cartel del profesor y motion graphics del tema, renderiza y sube al VPS. Usar cuando se pida "edita la clase grabada", "edita la grabación de <clase>", "edita el video del curso", "deja lista la repetición", "sube la clase editada", "corrige el desfase de la grabación", "difumina los chats de la clase", "ponle el intro de Trifuerza", "quita la marca de Gemini del video". NO usar para piezas de redes (reels, carruseles, stories): para eso está producir-pieza.
---

# Editar una clase grabada

Una clase de 60–120 minutos no se renderiza entera en Remotion: sin GPU serían horas solo de
captura. El método es híbrido:

- **ffmpeg y Python** procesan la grabación una vez: corte, difuminado, sincronía y audio.
- **Remotion** dibuja solo lo nuevo: el marco con el itinerario, las fichas, los comentarios, la
  intro, el cartel y el cierre. Lo que no se mueve se renderiza como un solo cuadro.
- **ffmpeg** une todo al final y quema los subtítulos.

Primera clase hecha así: «Fundamentos de IA», 27-oct-2026 (`clases/fundamentos-de-ia.json`). Úsala de modelo.

**Todo el taller vive en `C:\Users\User\Documents\Proyectos\claude-mk`.** Este skill está instalado
para todo Claude (`~/.claude/skills/editar-clase-grabada`), así que te pueden llamar desde cualquier
carpeta: entra a claude-mk antes de correr cualquier comando. Las rutas relativas de abajo son de ese repo.
Si cambias este archivo, copia el mismo texto en `~/.claude/skills/editar-clase-grabada/SKILL.md` y en
`claude-mk/.claude/skills/editar-clase-grabada/SKILL.md` para que no se separen.

## Intro estándar: el logo de Trifuerza

Todo video de curso o clase grabada arranca con el logo de Trifuerza animado: el hexágono que gira,
**sin el nombre** (la versión con «TRIFUERZA» quedó descartada y se borró). Después viene la intro con
el título de la clase.

- El archivo está en `public/intros/trifuerza-logo.mp4` (claude-mk). Hay una copia en
  `~/.claude/skills/editar-clase-grabada/assets/intro-trifuerza.mp4` para usarla fuera del taller.
- Original: Gemini (Veo), `Downloads/Anima_este_logo_de_la_forma_ma.mp4`, 1280×720 a 24 fps, ~10 s.
  Tiene copia en `trabajo/intro-trifuerza/original-sin-nombre.mp4`.
- Traía la estrella de 4 puntas de Gemini abajo a la derecha. Se quitó con
  `python -I src/clase/quitar-marca.py entrada.mp4 salida.mp4 --caja x,y,ancho,alto --cuadro-limpio 7.5`,
  que hace inpainting (OpenCV Telea) con una máscara sacada de un cuadro de fondo liso. Sirve para
  cualquier otro video de Veo con la misma marca. Nunca entregues un video con la estrella.
- `armar.js` lo pone solo cuando la salida empieza en `inicio`: lo lleva a 1080p30 y lo funde a negro
  en 0,4 s, porque termina en gris claro y la intro del título es azul oscuro. En `clases/<slug>.json`,
  `"introLogo": false` lo quita, y `"introLogo": {"archivo": "...", "dura": 6}` cambia el archivo o lo corta.

## Dónde vive cada cosa

| Qué | Dónde |
|---|---|
| La pieza (qué se hace y cuándo) | `clases/<slug>.json`. Todo tiempo va en **segundos del crudo** |
| Crudo, audio, transcripción, intermedios, salidas | `trabajo/clases/<slug>/` (ignorado por git) |
| Recortes de referencia de los detectores (traen datos privados) | `trabajo/clases/<slug>/refs/`. **Nunca en el repo** |
| Scripts | `src/clase/`: `transcribir.py`, `desfase.py`, `hojas.py`, `base.py`, `armar.js`, `subtitulos.js`, `subir.js` |
| Plantilla Remotion | `remotion/clase/`: `Marco.jsx`, `Piezas.jsx` (Intro, Cartel, Cierre), `tiempo.js` |
| Intro del logo | `public/intros/trifuerza-logo.mp4` (ver «Intro estándar») |
| Grabaciones en vivo | VPS `live.trifuerza.co`, carpeta **`/srv/grabaciones`** (no `/opt/livekit`). Llave `~/.ssh/trifuerza_vps` |
| Respaldo | Drive `Proyectos/Trifuerza (Triforce Boosters SAS)/09 Contenido y redes/Grabaciones en vivo`. El timer del VPS copia cada 10 min |
| Base de datos | Supabase de Trifuerza, tabla `live_event_recordings`. Este repo **no** tiene ese MCP: el SQL lo corre la sesión de tri-app2 |

## Flujo

### 0. Traer el crudo
```bash
mkdir -p trabajo/clases/<slug>/00-crudo
scp -i ~/.ssh/trifuerza_vps root@179.197.81.110:/srv/grabaciones/<archivo>.mp4 trabajo/clases/<slug>/00-crudo/
```
- Si la clase tiene varias partes (se pausó la grabación), revisa cada una.
- Las pruebas cortas suelen traer solo cámara y nada de audio: mide el volumen con `volumedetect` y descártalas.
- Pregrabadas: el archivo viene de Drive o del iPhone; el resto del flujo es igual. `marco.camara` y
  `marco.pantalla` dependen de cómo se grabó.

### 1. Transcribir (lo primero, y en segundo plano)
```bash
ffmpeg -i 00-crudo/<archivo>.mp4 -vn -ac 1 -ar 16000 01-audio/clase16k.wav
python -I src/clase/transcribir.py 01-audio/clase16k.wav 01-audio/transcripcion.json
```
- faster-whisper large-v3-turbo en int8, por lotes. En el Ryzen 5 5500U, sola, va a **~1,2× tiempo
  real** (94 min de clase en 75 min de reloj); con otro proceso pesado al lado cae a 0,6–0,8×.
- Vuelca el texto con tiempos (`[mm:ss seg] texto`) a `01-audio/texto.txt` y léelo entero: de ahí
  salen paradas, fichas, comentarios, el fin y las correcciones.
- Whisper alucina en ruidos (en Fundamentos: «MPT, MPT, MPT…»). Esos tramos van en
  `subtitulos.omitir` [{desde, hasta, motivo}]. Las palabras mal oídas («Cloth», «CloudCode»,
  «Goebbels») van en `subtitulos.correcciones`; usa frases con contexto cuando la palabra sola
  también existe («la guía» → «la IA» solo en «gracias a la guía»).
- Mientras transcribe, no corras nada pesado: dos procesos de CPU a la vez lo hunden a 0,4×.
- El modelo está en `.whisper/faster-large-v3-turbo`, bajado con curl desde Hugging Face
  (`deepdml/faster-whisper-large-v3-turbo-ct2`). Python no valida el certificado de HF en este equipo.

### 2. Punto de inicio y fin
- Busca en `transcripcion.json` la frase que pidió el profesor y pon `inicio.seg` en la palabra con la
  que empieza la clase de verdad. En Fundamentos fue 2,9 s: «Entonces bueno, para quienes acaban de llegar…».
- El fin va en el «gracias, buenas noches». Corta los minutos muertos de después: la diapositiva
  quieta y la grabación que siguió corriendo.

### 3. Revisar la pantalla y definir el difuminado
```bash
python -I src/clase/hojas.py 00-crudo/<archivo>.mp4 02-cuadros/blur --desde=S --hasta=S --cada=15 --recorte=320,90,1600,900
```
Mira **todas** las hojas. Se difumina:
- chats de Claude o de GPT: la barra de recientes, las conversaciones ajenas a la clase y los títulos de la galería de artefactos;
- datos personales: contratos reales (partes, cédulas, matrículas), exploradores de archivos y el chat de la sala con nombres de asistentes;
- nombres de clientes.

No se difumina:
- el mouse (`base.py` lo devuelve nítido);
- la barra de tareas ni la barra donde se ve el logo de GPT;
- lo que el profesor está enseñando: artefactos, juegos, diapositivas, configuración.

Hay dos formas de marcar zonas:
- **`detectores`**, para lo que entra y sale muchas veces:
  - `region`: compara con recortes de referencia mediante NCC; es inmune a la atenuación de los diálogos;
  - `plantilla`: busca un ícono y difumina al lado; así se tapan los títulos de la galería.
  Prueba el umbral en cuadros sueltos antes de lanzar todo.
- **`difuminado`**, tramos fijos `{desde, hasta, zonas}` para lo puntual (explorador, contrato, chat de la sala).

Prueba en tramos de 3 s:
```bash
python -I src/clase/base.py clases/<slug>.json <crudo> 04-pruebas/b.mp4 --desde=S --hasta=S+3
```
Revisa el último cuadro. `cursor repuesto en N cuadros` alto en un tramo sin mouse es un falso positivo.

### 4. Medir el desfase
```bash
python -I src/clase/desfase.py <crudo> 01-audio/clase16k.wav 03-sync/desfase.json --ventana=90 --paso=300
```
- Usa flujo óptico de la boca contra la energía de la voz.
- Signo: **negativo = el sonido llega tarde**.
- Mira si las ventanas fiables coinciden. Si son constantes, deja un solo tramo; si derivan, pon `sincronia.tramos` por tramos.
- Es caro (~1 min de CPU por minuto de video): muestrea, no midas la clase entera, y nunca mientras transcribe.
- La primera versión, por diferencia de píxeles, no sirvió (correlación de 0,05) con una cámara de 320×200 a 15 fps.
- El desfase de LiveKit **no es constante**: en Fundamentos fue de −0,35 s al inicio, −0,84 s hacia el
  minuto 20–30, casi 0 hacia el 55 y −0,28 s al final. Muestrea cada 5 min (`--paso=300`), confirma las
  zonas grandes con ventanas de 150 s y corta los tramos en pausas del habla (busca huecos entre
  palabras de la transcripción) para que el salto no se oiga.
- Descarta lecturas donde no habla el profesor a cámara: vuelos de la presentación o un asistente con
  el micrófono abierto dan valores absurdos (+1 s).
- Dile al profesor con honestidad qué se corrigió y qué no. Los cortes de audio (paquetes perdidos en
  el vivo, silencio digital) **no se recuperan**. El 1080p a 15 fps tampoco se vuelve 4K ni 30 fps reales.

### 5. Motion graphics que salen de lo que dice
- **Paradas** (`paradas[]`): los temas de la presentación. Van en la banda superior y en el itinerario
  del riel izquierdo; el avión avanza en cada cambio. Ubícalas por la transcripción y por los cambios
  grandes de imagen (los vuelos del globo entre ciudades).
- **Fichas** (`fichas[]`): concepto, ícono de lucide, antetítulo, título y texto o puntos. Entran cuando
  lo nombra (`en`) y duran 8–12 s. Una ficha a la vez: comparten lugar con los comentarios. Nada inventado:
  sale de lo que dijo o de la presentación.
- **Comentarios** (`comentarios[]`): los buenos del chat, solo con nombre e inicial del apellido.
- Densidad que funcionó: ~35 fichas en 94 min, de 10–15 s. El riel tiene ~430 px bajo el
  itinerario: una ficha cabe con título de una línea y hasta 4–5 puntos **cortos** (≤ 30 caracteres);
  renderiza un cuadro de las más largas antes de lanzar todo.
- Íconos: nombres de `icons` de lucide-react de la versión instalada (`FileX`, `CircleQuestionMark`;
  `FileWarning` y `CircleHelp` ya no existen y caen en Sparkles).
- Todo vive en las franjas vacías del layout de LiveKit (banda superior y riel izquierdo). Nunca tapan la pantalla compartida.
- Colores: los de la presentación de esa clase, en `tema`, sacados de sus variables CSS.

### 6. Muestra y render
```bash
npm run clase -- <slug> --muestra=DESDE,HASTA   # 1-2 min con todo aplicado, para el visto bueno
npm run clase -- <slug>                          # la clase completa
```
- Muestra primero y espera el visto bueno, salvo que el profesor diga que no hace falta.
- Nada se borra: cada salida lleva `version` y queda en `trabajo/clases/<slug>/salida/`.
- Para rehacer una etapa: `--rehacer=base,audio,marco,capas`.
- Tiempos en este equipo: `base.py` corre a ~1× tiempo real, y la codificación final a 30 fps
  (x264 medium) a ~0,5–1×. Usa `--preset=faster` si urge.

### 7. Subir
```bash
npm run clase-subir -- <slug>
```
- Sube por scp a `/srv/grabaciones/<slug>-<fecha>-editada-vN.mp4`.
- Verifica sha256, renombra al final y deja `salida/registrar-vN.sql`.
- Ese SQL inserta la fila `ready` y pone `status='deleted'` en las crudas. En tri-app2, 'deleted' solo filtra la fila; no borra el archivo.
- **No** actives `replay_available` ni cambies `access_mode` ni `price_cop`: eso es de la sesión de la plataforma y del visto bueno del profesor.

## Errores ya vistos
- La tabla y los MP4 están en `/srv/grabaciones`, no en `/opt/livekit`.
- `Stop-Process` por PID: confirma con `StartTime` cuál es cuál. Una vez se mató la transcripción en vez de la medición.
- `drawtext` de ffmpeg en Windows se rompe con las rutas de fuente: para rotular cuadros usa `hojas.py`.
- Cursor: con umbral 0,72 confundía letras sueltas («7 h») con el cursor y las devolvía nítidas. Va en 0,85.
- El paquete de Remotion copia todo `public/` (8 GB). `armar.js` empaqueta con un `public` mínimo en la carpeta de trabajo.
