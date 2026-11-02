# Referencias de movimiento · Pinterest · tableros de Juan David · noviembre 2026

Tres tableros: **Pixel art** (va primero porque es el que se está animando: N01), **Motion graphics** y
**Arte para lo digital**. Esta vez el foco es **cómo se mueve** cada pin, no solo qué sale en el cuadro.
Son referencia de técnica: no se copian, no se publican, y los personajes de franquicias no se usan.

Método: la lista de pins salió de la API del tablero (`BoardFeedResource`) desde una pestaña de
co.pinterest.com, sin iniciar sesión. Los GIF se bajaron de `i.pinimg.com/originals/...gif` y se midieron
cuadro por cuadro con Pillow (cuadros, milisegundos por cuadro, colores, cuánto cambia la imagen por cuadro,
si cierra en bucle). Los videos se bajaron en su mp4 de 720 (`expMp4/..._720w.mp4`, o `720p/...mp4` en los
`mc/`), con hoja a 4 cps de los primeros 6 s, cortes con `select='gt(scene,0.25)'` y audio medido
(volumen cada 50 ms, golpes, BPM aproximado). Material de trabajo en el scratchpad de la sesión (no en el repo).

> Pinterest ya no entrega el id numérico del pin a un visitante sin sesión: entrega un id cifrado
> (`e1_...`). Las URL de abajo usan ese id y abren el pin igual.

---

## 1 · Pixel art (tablero `jdvanegas52/pixel-art`)

590 pins; la API sin sesión entregó 501. **154 son GIF animados y 3 son video**; el resto, imágenes quietas.
Se midieron los 153 GIF que bajaron bien.

### Lo que más se repite (medido en los 148 GIF animados)

| Rasgo | Medida | Qué quiere decir para N01 |
|---|---|---|
| Velocidad de la animación | mediana **80 ms por cuadro = 12,5 cps**; lo más común es 100 ms (10 cps), luego 80, 30-40 y 70 | En Remotion a 30 fps: personajes **en tres** (`Math.floor(frame/3)`, 10 cps) y efectos (agua, chispa, lluvia) **en dos** (15 cps). Nunca suave a 30. |
| Cuadros por ciclo | 36 GIF ≤ 12 cuadros, 56 entre 13 y 48, 56 más de 48 | Los ciclos cortos son de 4, 6, 8, 12 cuadros (los números más repetidos: 12, 8, 24, 20, 6). |
| Cuánto se mueve | en **81 de 148 cambia menos del 2 % de la imagen por cuadro**; solo 28 cambian más del 10 % | **Cuadro casi quieto**: la escena es fija y se mueven 3 o 4 cosas pequeñas (humo, una luz, el agua, un parpadeo). Es la regla número uno del tablero. |
| Bucle | 73 cierran perfecto (el último cuadro es casi igual al primero) | Se piensan como bucle: la pieza puede abrir y cerrar con el mismo cuadro. |
| Paleta | en los pins de pixel limpio (69), mediana **66 colores**, un cuarto con **31 o menos**; los más radicales: 4 (Game Boy), 7, 13 (NES), 16 | Paleta corta y con nombre: un color dominante por escena (verde menta, morado, ámbar) + uno de acento que brilla. |
| Formato | 80 verticales, 39 cuadrados, 30 horizontales | El tablero ya piensa en vertical: escenas altas con el personaje pequeño abajo. |
| Tamaño de pixel | entre 2 y 6 px de pantalla por pixel de arte en los que no fueron reescalados | Para 1080×1920: arte a **270×480 (×4)** o **216×384 (×5)**. Todo, texto incluido, en esa misma rejilla. |
| Autor que más se repite | **Kirokaze** (9 pins + 1 en Motion graphics) | Escenas a pantalla completa, figura pequeña de espaldas o de lado, mucha luz de neón o de luna, texto **dentro del mundo** (pantallas, carteles). |

### Qué separa estos pins de «una caja con texto» (lo que no le gustó del N01)

1. **El cuadro es un lugar, no una interfaz.** Casi ningún pin tiene marco, monitor ni barra. La pantalla entera es
   un sitio (calle, puente, cuarto, isla) y la cámara está **dentro**.
2. **El personaje es pequeño.** En los Kirokaze ocupa del 5 al 10 % del alto del cuadro; el protagonista es el lugar.
3. **La luz cuenta la historia.** Conos de linterna, ventanas encendidas, rayos de sol, el resplandor de un monitor
   sobre la cara. La luz es lo que más se mueve (parpadea, respira, barre).
4. **El texto vive en el mundo o no existe.** Cuando hay texto está en un cartel, una valla, una pantalla de la escena
   o en letras de póster gigantes; muy pocos pins usan un cuadro de diálogo, y cuando lo usan (px490, px407) el diálogo
   es parte del juego.
5. **Profundidad por capas.** Primer plano oscuro que pasa rápido, fondo que casi no se mueve, lluvia en una capa
   aparte, reflejos en el piso mojado.
6. **Cámara quieta o en un solo movimiento lineal.** O no se mueve, o hace un travelling lateral constante. No hay
   zooms suaves ni rebotes: el pixel art se mueve **a velocidad fija y en pasos de pixel**.

### Fichas por pin (16 pins del tablero)

Clave: «px» + posición en el tablero. Duración = un ciclo del GIF.

---

**px344 · Kirokaze, «Explore the System» · GIF 400×640, 160 cuadros a 30 ms (5,5 s), 44 colores, bucle**
https://co.pinterest.com/pin/e1_AfqPShxpQJ9Wm5vXwf9gEYhbBxi_ZViQs1Li5q7_cV7tNjGmUVic/
- **Composición:** vertical a pantalla completa. Una figura pequeña sentada **de espaldas** en una terraza, mirando una
  valla gigante en un edificio. Ciudad a los lados, luna arriba. El ojo va de la figura a la pantalla.
- **Movimiento:** la cámara no se mueve. Se mueven tres cosas: (1) carros voladores que cruzan de lado a lado a
  velocidad constante, en pasos de pixel, entrando y saliendo por el borde; (2) la valla cambia de contenido
  (astronauta → «EXPLORE THE SYSTEM» → texto en japonés y árabe) con un **barrido de líneas de escaneo** de arriba
  abajo (cuadro 159); (3) un ícono pequeño parpadea junto a la figura.
- **Luz y paleta:** verde menta del cartel como única fuente fuerte, todo lo demás azul petróleo oscuro; rosa neón
  como acento a los lados.
- **Texto:** **diegético**, dentro de la valla, en tipografía pixel gruesa, con scanlines encima. Nunca encima de la escena.
- **Técnicas:** escena fija con loops secundarios, *scanline wipe*, texto diegético, figura de espaldas (*Rückenfigur*).
- **En Remotion:** fondo PNG pintado a 270×480 escalado ×4 con `imageRendering: 'pixelated'`; los carros son `<Img>`
  con `left = Math.round((frame*vel)/4)*4` (lineal, sin easing); la valla es un `<div>` con `overflow:hidden` y el
  cambio de contenido con un `clipPath: inset(0 0 ${100-p}% 0)` donde `p` avanza en saltos de 8 % por cuadro, más
  un `repeating-linear-gradient` de 2 px como scanlines.
- **Para:** **N01** (la pantalla de carga es la valla del mundo), «Hice mi primera web a los 15».

**px071 · Kirokaze, personaje en una baldosa isométrica · 232 cuadros a 70 ms (17,7 s), bucle**
https://co.pinterest.com/pin/e1_AfqPShyY8qvMBJ6_aiMpT_fIk8XLeSFrWo7_6fCfSA20I5xHZotE/
- **Composición:** el mismo personaje (mirando un aparato en la mano) en una baldosa isométrica en el centro, y el
  mundo alrededor **cambia cada ~4,5 s**: día verde → sol rojo → noche azul con luna → ciudad roja de neón.
- **Movimiento:** el personaje casi no se mueve (respira, gira la cabeza); lo que cambia es **la paleta del mundo**
  y algunos objetos que aparecen en la rejilla. El cambio entra con un glitch de líneas horizontales de 2-3 cuadros
  (cuadro 231) y una pausa de color.
- **Luz:** un charco de luz bajo el personaje que toma el color de cada época.
- **Texto:** ninguno, solo la firma.
- **Técnicas:** *palette swap* como paso del tiempo, isométrico, *glitch transition* por bandas.
- **En Remotion:** el personaje es un sprite fijo; el mundo son 4 capas PNG (o el mismo PNG con 4 paletas) que se
  cambian por `Sequence`; el glitch es desplazar 6-10 franjas `translateX` aleatorias (semilla fija con `random()` de
  Remotion) durante 3 cuadros.
- **Para:** **N01** (mientras «carga», el mundo cambia de época alrededor del jugador), «Hice mi primera web a los 15» (épocas de la web).

**px368 · Jinete con linterna de noche (un juego indie) · 87 cuadros a 40 ms (3,5 s), cambia 17 % por cuadro**
https://co.pinterest.com/pin/e1_AfqPShznpdhcntQzbkQVffDS7tFZihrCtTx3U8_IqfdQw13AmGdC/
- **Composición:** horizontal; un jinete pequeño abajo a la izquierda, un **gigante en silueta** al fondo con ojos
  blancos, cielo morado con estrellas.
- **Movimiento:** travelling lateral: el suelo y los arbustos pasan, el gigante casi quieto (parallax lento), y
  **columnas negras de primer plano** cruzan rápido y desenfocadas (cuadros 39-78). El **cono de la linterna** barre y
  cambia de largo con el galope.
- **Luz:** la linterna (amarillo pálido, semitransparente) es la única luz cálida; el resto frío.
- **Texto:** ninguno.
- **Técnicas:** parallax de 4 capas, *foreground occluders* (elementos de primer plano que tapan), cono de luz,
  silueta de escala.
- **En Remotion:** capas a velocidades 0,1 / 0,4 / 1 / 2,5 (fondo, gigante, suelo, primer plano), cada una con
  `translateX = -Math.round((frame*v) % ancho)` y el fondo repetido dos veces para el bucle; el cono es un `<svg>`
  `polygon` con `mix-blend-mode: screen` y opacidad 0,35; las columnas de primer plano son rectángulos negros con
  borde en degradado (no `blur`).
- **Para:** **N01** (un viaje mientras carga), N02 villano Némesis (el gigante en silueta).

**px342 · Moto en un puente bajo la lluvia · 36 cuadros a 100 ms (3,6 s), 16 colores, bucle**
https://co.pinterest.com/pin/e1_AfqPShw9Andj9EYzAp5bVauaB0OuTFGR-q9Yz6gyPFta4lU5tW-i/
- **Composición:** franja cinemascope (barras negras arriba y abajo), puente de vigas azules, ciudad al fondo.
- **Movimiento:** **la moto no se mueve en pantalla**; se mueve el mundo: vigas rápido, baranda media, ciudad muy lenta,
  rayas del asfalto. Lluvia en diagonal en capa propia. El piloto tiene un ciclo de 2 poses (rebote de 1 px).
- **Luz y paleta:** 16 colores, azul acero y verde musgo; nada brilla, todo está mojado.
- **Texto:** ninguno.
- **Técnicas:** *side-scroller* con cámara fija sobre el personaje, parallax, letterbox, lluvia en capa.
- **En Remotion:** igual que px368; la moto con `translateY = (Math.floor(frame/3)%2)*4`; la lluvia es un patrón de
  líneas de 1×6 px que baja 12 px por cuadro.
- **Para:** N04 flecha de Crazy Taxi (el viaje, sin copiar el juego), N01.

**px366 · «Backtrace 2083», calle de neón con lluvia · 56 cuadros a 100 ms (5,6 s), cambia 23 % por cuadro**
https://co.pinterest.com/pin/e1_AfqPShzZQSYdUmFWbs-QYxkv6RounPK3zS3MlOfYqRhg0Zg4-A1s/
- **Composición:** horizontal, la mitad de abajo es **reflejo en el agua** del piso.
- **Movimiento:** **paneo lateral continuo** (la cámara recorre la calle de izquierda a derecha); un vehículo flotante
  entra a 3,0 s con estela azul y sale por la derecha. Lluvia vertical.
- **Luz:** faroles con halo redondo, letreros cian, ventanas amarillas; el reflejo repite todo con bandas.
- **Texto:** letreros dentro de la escena («SUSHI») y el título del juego como marca de agua en el reflejo.
- **Técnicas:** paneo, reflejo por espejo con bandas, *whoosh* con estela.
- **En Remotion:** la escena ancha (3× el cuadro) se mueve con `translateX` lineal; el reflejo es la misma capa con
  `scaleY(-1)`, opacidad 0,4 y 6 franjas desplazadas 1-2 px que cambian cada 4 cuadros.
- **Para:** N01, «Hice mi primera web a los 15».

**px421 · Vagón de metro en Japón (Toyoi Yuuta) · 24 cuadros a 80 ms (1,9 s), bucle**
https://co.pinterest.com/pin/e1_AfqPShxZ2VX5-xRKgCFqv_8hx7SAh6A9MVBhb0fIv3L1IpIZX-Ia/
- **Composición:** plano medio lleno de gente mirando el celular, de lado a lado del cuadro.
- **Movimiento:** **todos se mecen con el tren** (1 px), las ventanas pasan de blanco a paisaje y vuelven (el exterior
  corre), una pantalla de anuncio arriba cambia.
- **Paleta:** monocroma azul con un verde ácido de acento.
- **Texto:** solo en los anuncios del vagón.
- **Técnicas:** *crowd loop*, monocromo con acento, vida cotidiana en 8 bits.
- **Para:** N16 cuánto cuesta construir software (gente en su rutina), N09–N12.

**px352 · Escena estilo NES: el jefe en su trono · 91 cuadros a 30 ms (3,3 s), 13 colores**
https://co.pinterest.com/pin/e1_AfqPShxuXtRmtIqBRP8obsc0x2oI_j_bWs_qkOPxvNIrEvi6Jgor/
- **Composición:** sala del trono vista de lado, fondo negro puro, personajes con contorno de 1 pixel.
- **Movimiento:** el villano **levanta el báculo en 2 poses** y del piso **crecen columnas de fuego** de abajo arriba
  (draw-on vertical en 6-8 pasos); el héroe se agacha y se protege. Sin cámara.
- **Paleta:** 13 colores, la paleta real de la consola: rojo, morado, azul cobalto, piel.
- **Texto:** ninguno.
- **Técnicas:** paleta limitada de consola, anticipación en 2 poses, *draw-on* por escalones.
- **Ojo:** es una franquicia conocida. Sirve la técnica, no los personajes.
- **Para:** N02 villano Némesis, N01 si se quiere la estética de consola de la época.

**px381 · Científico al que le cae un rayo · 40 cuadros a 70 ms (2,7 s)**
https://co.pinterest.com/pin/e1_AfqPShy3wItG71QO8_FgWrRKBmq-1kvifzRNr62gX8t7oxz4jD0x/
- **Composición:** un solo sprite grande (ocupa media pantalla) sobre gris plano.
- **Movimiento:** entra de espaldas, se voltea, pose de victoria; cae el rayo; **1 cuadro de radiografía** (esqueleto
  en blanco y negro), 3 cuadros de vibración con contorno blanco, queda **chamuscado** con humo.
- **Técnicas:** *hit flash* de rayos X (1 cuadro), *screen shake* local, gag en 3 tiempos (anticipación, golpe, consecuencia).
- **En Remotion:** el esqueleto es otro sprite que se muestra solo en el cuadro del golpe; el «chamuscado» es el mismo
  sprite con `filter: brightness(.35)`.
- **Para:** N01 (el momento en que llega la demanda de la patente), N05 homenaje o copia.

**px245 · Corredor que cambia de armadura · 10 cuadros a 100 ms (1 s), bucle**
https://co.pinterest.com/pin/e1_AfqPShz-84UUNE9RPJZzk-8sFB0dulNSSwswbj1ESGCt-pVSKw7a/
- **Composición:** sprite grande corriendo a la derecha; fondo en franjas horizontales que corren (velocidad).
- **Movimiento:** ciclo de carrera de **2 poses** que se repite mientras cambia la armadura cada 2 cuadros (azul → plata
  → roja → dorada): un *palette/sprite swap* sobre el mismo ciclo.
- **Ojo:** personaje de franquicia. Sirve la técnica.
- **Para:** «Hice mi primera web a los 15» (la misma figura cambia de época), N05.

**px411 · «I Want to Believe» en pixel · 97 cuadros a 100 ms (10,7 s), bucle**
https://co.pinterest.com/pin/e1_AfqPShzyRfVbxq4v7bxDb-bPX9acbZmkp38MbteZbyQMuTpnORCl/
- **Composición:** póster: cielo degradado en bandas, pinos en silueta, **título enorme abajo** ocupando todo el ancho.
- **Movimiento:** el ovni va y viene **cambiando de tamaño a saltos** (grande → sale por la derecha → punto lejano →
  vuelve desde arriba): profundidad fingida solo con escala.
- **Texto:** letras de póster fijas, blancas, en pixel grueso; el texto **es** la composición, no una caja.
- **Técnicas:** póster animado, escala por pasos, degradado por bandas (*banding*).
- **Para:** N01 (versión póster: título grande abajo y la escena arriba), N06 patentes en Colombia.

**px230 · La Tierra y una frase · 3 cuadros a 200 ms, bucle**
https://co.pinterest.com/pin/e1_AfqPShzjfxKRR3OJbbGEZ7UaQdBSzmTRs_TPZ-35LiEGAhZTMSjZ/
- **Composición:** negro con estrellas, frase corta centrada, Tierra en pixel abajo.
- **Movimiento:** 2 cuadros normales y **1 cuadro invertido** (blanco con todo en negativo). Es un parpadeo de
  inversión: incomodidad con un solo cuadro.
- **Técnicas:** *invert flash*, minimalismo.
- **En Remotion:** `filter: invert(1)` en un solo cuadro de cada 3.
- **Para:** N01 (un golpe de inversión en la frase clave), ganchos de juanda.

**px313 · Tres puntos de carga · 60 cuadros a 20 ms (1,2 s), bucle**
https://co.pinterest.com/pin/e1_AfqPShxDOBNmZAdEAvAsSO-Hw9KsQTT0vX9IRi6vp3muZvLf84we/
- **Movimiento:** los tres puntos suben y bajan **en ola** (desfase de un tercio) y se aclaran al subir; el ciclo
  dura 1,2 s.
- **Técnicas:** *loading indicator* en ola, desfase de fase.
- **En Remotion:** `y_i = Math.round(Math.sin((frame/36)*2*Math.PI - i*2.09)*2)*4`.
- **Para:** N01 como detalle pequeño **dentro** de la escena (no como interfaz encima).

**px314 · Ventanas de error en cascada · 10 cuadros a 50 ms (0,5 s), bucle**
https://co.pinterest.com/pin/e1_AfqPShz2Q807tdAASK8tzH-Lz5p_gp-xVLuOZveZTE3S81hul9lt/
- **Movimiento:** cada 50 ms aparece una ventana «Error / Fail» **desplazada en diagonal** sobre la anterior: el
  rastro clásico de una ventana arrastrada en un sistema viejo que se cuelga.
- **Técnicas:** *window trail*, acumulación, sistema operativo retro.
- **Para:** N33–N34 ChatGPT vs Contrappto, «Hice mi primera web a los 15».

**px376 · Diálogo que se corrompe (Javier G) · 284 cuadros a 100 ms (28,4 s)**
https://co.pinterest.com/pin/e1_AfqPShwnN1IjPoAm9LPW1NmmfUXV_ENjcWWW2tfZamD2Qi4mFA-M/
- **Composición:** franja de escena arriba (cuarto naranja) y franja negra abajo **solo para el texto**, sin caja ni borde.
- **Movimiento:** la palabra aparece letra a letra; luego las letras **se corrompen** (glifos rotos) y se reescriben en
  otra frase; la escena cambia de iluminación (día → noche) y el personaje se transforma con un contorno verde de glitch.
- **Técnicas:** *typewriter*, *text scramble*, cambio de luz como giro de guion.
- **Ojo:** los personajes son de un juego conocido.
- **Para:** N02 villano Némesis, N01 (la frase «¿y si cargar fuera jugar?» que se corrompe en «patente»).

**px275 · Interfaz de juego en 4 tonos · 125 cuadros a 40 ms (12,2 s), 4 colores**
https://co.pinterest.com/pin/e1_AfqPShwJIbzlnhTVh8j8h7f4KG3hx5qq2RRwKRM1kYOuiSHTmLWu/
- **Movimiento:** la tienda **sube desde abajo** y tapa la escena; pestañas que cambian; al cerrar, transición **iris**
  (el mundo se apaga y aparece un círculo alrededor del personaje que crece hasta llenar la pantalla).
- **Paleta:** 4 tonos de beige y gris (tipo consola portátil).
- **Técnicas:** *iris in/out*, paleta de 4 tonos, UI que entra por abajo.
- **En Remotion:** `clipPath: circle(${r}px at 50% 42%)` con `r` que sube en saltos de 16 px.
- **Para:** transición de entrada y salida de N01 (iris), N19–N24 (la app en estética de consola).

**px003 · Fondo animado: niña en un muelle sobre una cascada · video 12 s, 30 fps, sin audio**
https://co.pinterest.com/pin/e1_AfqPShxylvn7pfZglaMLGN2dV0-3cBOLtZGEP1fXgR10vUjKPefq/
- **Composición:** vertical; muelle de madera en diagonal arriba, cascada abajo, bosque oscuro alrededor.
- **Movimiento:** **rayos de sol diagonales** que aparecen y se desvanecen en ciclo (~2 s), cascada con textura que baja
  en bucle, la niña balancea los pies. Cámara fija.
- **Luz:** los rayos de luz (*god rays*) son lo único que respira.
- **Técnicas:** cinemagraph en pixel art, *god rays* por opacidad, textura de agua en bucle.
- **En Remotion:** los rayos son 3 polígonos SVG blancos con `opacity = interpolate(frame % 60, [0,30,60], [0,.25,0])`,
  desfasados; el agua es una tira de 4 cuadros que se repite.
- **Ojo:** el fondo es de una franquicia conocida (título del pin). Sirve la técnica.
- **Para:** fondos de N01, «La historia de una firma» (calma).

**px016 · Granja isométrica con molino (juego indie) · video 7,7 s, 60 fps, sin audio**
https://co.pinterest.com/pin/e1_AfqPShy2GFvJEXRFQWXGy2znKKzhT8I0kRJE0YBHXCiuwGBxLD3O/
- **Movimiento:** solo gira el molino (4 poses) y se mecen los árboles; nubes que pasan como sombra sobre el pasto.
- **Técnicas:** diorama isométrico vivo, sombras de nubes en movimiento.
- **Para:** N16 cuánto cuesta construir software («la granja» que se construye).

Otros GIF animados del tablero (sin ficha): Kirokaze px183, px219, px258, px315 (pantalla «OBSOLETE MEN» con chispas
de cable), px351, px384, px468; ventanas retro px460 (un cuadro de diálogo de 1998 que sale y el cursor pulsa OK);
pelea de palitos px255 (34 s, ya hay uno parecido en el análisis anterior); px393 (impacto con silueta blanca y
salpicadura); px407 (cuarto desde arriba con globos de diálogo y palabra clave en rojo); px490 («WILL YOU CONTINUE?
YES / NO», cursor que parpadea cada 360 ms sobre un pasillo de columnas); px042 (fondo de Zelda: ya analizado
como #18 del archivo anterior). El resto (más de 130) se ve en las hojas de contacto del scratchpad.

### Receta pixel art para Remotion (lo que sale de todo el tablero)

```js
const PX = 4;                                   // 1 pixel de arte = 4 px de pantalla (arte a 270×480)
const paso = (v) => Math.round(v / PX) * PX;     // toda posición cae en la rejilla
const pose = (frame, n, en = 3) => Math.floor(frame / en) % n;   // ciclo de n poses «en tres» (10 cps)
// movimiento: siempre lineal y a pasos; nada de spring ni easing en el mundo pixel
const x = paso(-frame * 2.5);                   // travelling lateral constante
```
- **Escena:** un PNG pintado a 270×480 (o SVG con `shapeRendering="crispEdges"`) escalado ×4 con
  `imageRendering: 'pixelated'`. **No** sprites hechos con divs: se dibujan como imagen o como SVG de rectángulos.
- **Parallax:** 4-5 capas con velocidades 0,1 · 0,3 · 0,6 · 1 · 2,5; la del frente oscura y rápida.
- **Luz:** polígonos SVG con `mix-blend-mode: screen` y opacidad que respira (conos, rayos, halos); halos de farol
  como círculos con borde escalonado (3 anillos de color, no degradado ni blur).
- **Transiciones:** iris (`clipPath: circle()` a saltos), barrido de scanlines, *dither* (máscara con patrón Bayer 4×4
  que se va llenando en 8 pasos), *palette swap* por cortes, inversión de 1 cuadro.
- **CRT, solo si la escena es una pantalla:** scanlines con `repeating-linear-gradient(0deg, rgba(0,0,0,.25) 0 1px,
  transparent 1px 3px)`, viñeta radial y un parpadeo de opacidad 0,97–1. Ya existe `CRT` en `remotion/arcade/Pixel.jsx`.
- **Texto:** dentro del mundo (valla, pantalla, cartel) o como letras de póster gigantes; si entra letra a letra,
  2 cuadros por letra y un «blip» de sonido.

### Los 3 pins más fuertes para N01

1. **px344 · Kirokaze, «Explore the System».** Resuelve exactamente lo que falló: no hay marco ni subtítulos; **la
   pantalla de carga es una valla dentro de una ciudad** y alguien pequeño, de espaldas, la mira. El texto entra con un
   barrido de scanlines en el mundo, no encima. Permite contar la patente sin interfaz: la valla dice «NOW LOADING»,
   luego el minijuego, luego el sello de la patente.
2. **px368 · Jinete con linterna frente al gigante.** Da la **cámara y la luz** que le faltaron al N01: travelling
   lateral con 4 capas de parallax, columnas negras de primer plano que tapan, y un cono de luz que es lo único cálido.
   La espera de la carga se vuelve un viaje, y el gigante en silueta puede ser la patente que vigila el camino.
3. **px071 · Kirokaze, el mismo personaje y el mundo que cambia de época.** Da la **estructura**: un personaje fijo en el
   centro y el mundo alrededor que cambia de paleta cada ~4,5 s con un glitch de 3 cuadros. Sirve para mostrar cargas de
   distintas épocas de las consolas sin cambiar de plano, y cierra en bucle.

---

## 2 · Motion graphics (tablero `jdvanegas52/motion-graphics`)

87 pins: 65 videos y 17 GIF. Unos 20 ya estaban en `pinterest-2026-11.md` (pluma y árbol de luz, acantilado,
inventos, collage de época, ASCII, ChatGPT UI, cubos de vidrio, Kinect, retratos que se disuelven, ciudad «sky is
loading», casa en venta, cara con kanji, diorama isométrico, fondo de Zelda, pelea de luz…) y no se repiten.
Fichas de 14 videos nuevos, los más distintos entre sí.

**mg070 · Matriz LED de 3 celdas · 12,2 s, 24 fps, ~150 BPM, sin cortes**
https://co.pinterest.com/pin/e1_AfqPShyeg8Ss8BAZAer5bCrVvYHYfG3cG7auWuNBZXcuq9ggy4xM/
- **Ficha:** negro total, tres cuadrículas de 7×7 LED en una fila al centro. Cada celda pasa de un ícono a otro
  (X, corazón, flecha, cuadro, letra L) **pixel por pixel**: los LED que se apagan bajan de brillo en 4-6 cuadros
  (persistencia de fósforo) y los que se encienden saltan de golpe. Las tres celdas cambian desfasadas, como un reloj.
  Cámara fija. El volumen sube hasta los 4 s y se queda; el cambio de íconos va con la percusión.
- **Técnicas:** *LED matrix*, persistencia (*decay*), *dot-matrix morph*, desfase escalonado (*stagger*).
- **Remotion:** SVG de 49 círculos por celda; para cada LED, `brillo = encendido ? 1 : interpolate(frame - tApagado, [0, 6], [1, .12], {extrapolateRight: 'clamp'})`; íconos como matrices de 7 cadenas. Cero GPU.
- **Para:** **N01** (el «NOW LOADING» como LED, sin caja), N09–N12 alertas de monitoreo judicial.

**mg084 · Figura hecha de íconos de Windows 98 que corre · 9,1 s, 30 fps, 23 cortes**
https://co.pinterest.com/pin/e1_AfqPShw5ePUMzSQhPbo0XfPxY3Fh925cQ0hZ8fGTzTKiIgCQgRYx/
- **Ficha:** un hombre corriendo hecho de íconos, ventanas, buscaminas, Bloc de notas, salvapantallas de tubería…
  **Un corte cada ~0,3 s** (0,33 · 0,63 · 0,90 · 1,20 · 2,37 · 2,67…); golpes de audio a 0,05 · 0,3 · 2,3 · 2,6 · 4,6 ·
  4,85: los cortes van a corcheas y cada frase de ~2,3 s reinicia. Cada plano dura 8-10 cuadros; la figura siempre en
  el centro y en la misma pose del ciclo de carrera; lo que cambia es el «material».
- **Técnicas:** *match cut* sobre la silueta, rotoscopia con collage digital, estética Y2K/vaporwave, cortes al ritmo.
- **Remotion:** la silueta como máscara (`clipPath` con un SVG de la figura) y debajo una capa distinta por plano;
  `Sequence` de 9 cuadros alineadas a la rejilla de golpes.
- **Para:** **«Hice mi primera web a los 15»** (épocas de la web), N33–N34.

**mg058 · Cruce de calles en pixel art con lluvia · 7 s, 30 fps, 63 BPM**
https://co.pinterest.com/pin/e1_AfqPShzXPxKIQ71P97kYyxaobgTszNjbN-h0-G7-zd6SI0dT0MSV/
- **Ficha:** fachada llena de letreros (en español: «ESPAÑA», «PACO») de frente; cámara fija; cruzan vehículos de lado
  a lado con **estela de color** (2-3 cuadros); a 2,4 s un camión cruza tan cerca que tapa medio cuadro (*wipe* por
  objeto). Un anuncio grande cambia de cara. Lluvia.
- **Técnicas:** *object wipe*, letreros que parpadean a destiempo, estelas.
- **Para:** N04 flecha de Crazy Taxi (sin copiar el juego), N01 (transición por un objeto que cruza).

**mg065 · Hotel de neón bajo la lluvia · 21,4 s, 30 fps, lo-fi constante (−16 dB, sin respiro)**
https://co.pinterest.com/pin/e1_AfqPShwkemqy2BkPHOLrn4mOKPufdxmvn3aQs9KrsiFgzjDoG3t1/
- **Ficha:** cinemagraph: edificio centrado, cielo magenta, lluvia en 2 capas (cerca rápida, lejos lenta), ventanas que
  se encienden y apagan una a una, letrero «HOTEL» que zumba. Sin cortes ni cámara.
- **Técnicas:** cinemagraph, lluvia en 2 planos, *flicker* de neón.
- **Para:** fondo de N09–N12 (cada ventana que se enciende = una alerta), N01.

**mg036 · Fachada de miles de ventanas que se encienden en verde · 12,9 s, 71 BPM**
https://co.pinterest.com/pin/e1_AfqPShxHfR1-kahGfx0uGuoJxTL_jbbhz5u451bjP0H9e9RJoHED/
- **Ficha:** foto real de un bloque de edificios virada a verde petróleo. Ventanas sueltas se encienden en verde, cada
  vez más; algunas se marcan con un **recuadro de seguimiento** y se unen con líneas finas. Una mancha de luz recorre la
  fachada. Cada golpe (1,05 · 1,75 · 3,4 · 3,8 · 4,25…) prende un grupo.
- **Técnicas:** *data overlay* sobre foto, *tracking boxes*, *plexus*, monocromo con acento.
- **Remotion:** foto con `filter: grayscale(1) sepia(.4) hue-rotate(110deg)`; ventanas como lista de coordenadas con
  `frameEncendido` aleatorio (semilla fija); líneas SVG con `strokeDashoffset` (draw-on de 6 cuadros).
- **Para:** **N09–N12 monitoreo judicial** (cada ventana es un proceso; el recuadro es la alerta).

**mg040 · Tormenta eléctrica real con «constelaciones» de seguimiento · 23,8 s, 60 fps, 120 BPM**
https://co.pinterest.com/pin/e1_AfqPShxveh3c7pGEyfmBxjj_s6L51RWhcFx3MSD_j9cLQ7hCV9p2/
- **Ficha:** relámpagos de noche; sobre cada destello aparecen **cajitas con etiquetas** y líneas que las unen (un grafo
  que sigue la luz). Cortes a 9,1 · 14,0 · 15,7 · 16,1 · 17,5 · 22,2 s: el corte cae en el relámpago.
- **Técnicas:** *blob tracking* estilo TouchDesigner, grafo sobre video, corte en el pico de luz.
- **Para:** **«Cómo piensa una IA»** (las conexiones aparecen donde hay luz), N14 una hora de IA aplicada.

**mg086 · Pinturas de Van Eyck con subtítulo palabra por palabra · 70 s, 25 fps, 120 BPM**
https://co.pinterest.com/pin/e1_AfqPShy-ObNnxxr3BbTOc5TacJli9a_9orWVf0s7jf04q0_v225Q/
- **Ficha:** un cuadro por plano, cada uno 4-6 s (cortes a 1,3 · 6,1 · 11,9 · 18,2 · 26,0 · 30,0 · 34,0 · 43,2…), con
  **push-in lento** (Ken Burns). La narración aparece **una palabra a la vez**, pequeña y blanca en el centro («John»,
  «did», «He worked», «controlled», «materials»…). Dos transiciones de **barras verticales RGB** (3 cuadros) a 18,2 y 34,0 s.
- **Técnicas:** *Ken Burns*, *one-word captions*, *RGB bar glitch transition*.
- **Remotion:** `scale = interpolate(local, [0, dur], [1, 1.08])` lineal; palabras con su tiempo desde la transcripción;
  el glitch: 8 rectángulos verticales de colores puros con `mix-blend-mode: difference` por 3 cuadros.
- **Para:** **N07 legal design en un documento de 1666** (el documento en planos detalle, palabra por palabra).

**mg016 · Dos manos de papel escrito unidas por hilos · 15,9 s, 63 BPM, golpe cada ~1 s**
https://co.pinterest.com/pin/e1_AfqPShyMILMgzHR9ZT4cEjFUu3MBf96waw9cCzTLz6QMrpw5BSq9/
- **Ficha:** una mano arriba (como de titiritero) y otra abajo, con manuscrito sobre la piel, fondo gris claro. Se
  acercan **muy lento** mientras los hilos se multiplican en una malla; cortes suaves a 7,9 · 10,3 · 12,4 s a planos más
  cerrados. Golpes cada segundo (2,05 · 3,1 · 4,1 · 6,05…) que hacen temblar los hilos.
- **Técnicas:** acercamiento lento, plexus de hilos, textura de manuscrito, cita a «La creación de Adán».
- **Para:** **«La historia de una firma»**, contrato de palabra (N19–N24) (los hilos = el acuerdo), firma en el celular.

**mg059 · «FRAME WAR»: revista con tres videos que compiten · 14,4 s, 133 BPM**
https://co.pinterest.com/pin/e1_AfqPShxPfN0AWgGMib041YPf2dBfVYB8GhoJwGM-UtDQzLvWmvCu/
- **Ficha:** maqueta de revista fija (titular condensado negro, fondo crema, número rojo en círculo); tres tarjetas con
  video adentro que cambian de plano a su ritmo. La página no se mueve: **lo que se mueve está dentro de las ventanas**.
  El audio entra a 0,65 s y sale en fundido.
- **Técnicas:** *editorial layout*, video en marcos, comparación lado a lado.
- **Para:** **N33–N34 ChatGPT vs Contrappto** (tres tarjetas: ChatGPT, abogado, Contrappto).

**mg056 · Cara de papel que se arruga · 3,75 s, sin audio**
https://co.pinterest.com/pin/e1_AfqPShwJ7yLXb_NN6RTIwj3yfNwvVYL7j9wWtqIijIBJdgqH_7oo/
- **Ficha:** una cabeza low-poly de papel se **arruga en una bola** en ~2 s, acelerando hasta el final. Título fijo en
  magenta y una diagonal.
- **Técnicas:** *paper crumple*, ease-in, low-poly.
- **Remotion:** sin 3D: 8-10 fotos de papel arrugándose cambiadas con `Easing.in(Easing.cubic)`.
- **Para:** **contrato de palabra (N19–N24)** (el acuerdo verbal se arruga), incumplimiento.

**mg028 · Póster tipográfico que se derrite · 9 s, sin audio**
https://co.pinterest.com/pin/e1_AfqPShz_LDrRraMxTrY7aldl_Z1ufCZvF7YANeD0KTdDKqkUxS6H/
- **Ficha:** póster suizo en blanco y negro; después de 1 s las letras se **estiran en perspectiva** y se deforman como
  líquido hasta salirse del cuadro. Sin cortes.
- **Técnicas:** *kinetic type*, *displacement*, distorsión tipográfica.
- **Remotion:** cada línea en un `<div>` con `perspective(600px) rotateX() skewX() scaleY()` crecientes y desfasados.
- **Para:** las cláusulas (N19–N24) (la letra pequeña que se deforma), ganchos de juanda.

**mg072 · Retrato en puntos ámbar · 9 s, sin audio**
https://co.pinterest.com/pin/e1_AfqPShyAJAUnpd6iDMeSORyaEJ9WF0GbBgoVT3gvegdmVu0N17QU/
- Perfil en rejilla de puntos ámbar, casi quieto, con destellos sueltos. *Halftone*, monocromo. **Para:** portada de
  «Cómo piensa una IA», N14.

**mg052 · Torso solarizado que mira arriba · 5,6 s, sin audio**
https://co.pinterest.com/pin/e1_AfqPShxIdwMZerpUuywywP70JbNowUa16bBPE0W2S17dFRtyS4jO/
- Figura en negativo térmico (rosa, cian, ámbar) que levanta la cabeza y vuelve (ease-in-out, bucle de ida y vuelta),
  rejilla de puntos amarillos. Solarización, *ping-pong loop*. **Para:** «Cómo piensa una IA».

**mg050 · Ojo en la pirámide y gente frente a televisores · 20,8 s, 80 BPM**
https://co.pinterest.com/pin/e1_AfqPShx_f3LpyzQL3-nz34ld-_ti3xYc068icI0usWQzCXdM4Efo/
- Plano fijo; siluetas de espaldas, televisores con estática; **destellos de luz rojos y morados** suben cada ~6 s, justo
  en los golpes medidos (6,4 · 12,4 · 17,65 s). *Light leak* en el golpe. **Para:** N09–N12 (vigilancia), N02.

Otros videos sin ficha: mg004 (El grito, «What if fear»), mg008 (Hora de Aventura en pixel, franquicia), mg011, mg012
(surreal, 87 s), mg013, mg014, mg019 (cabeza-reloj), mg020, mg021, mg023 (cubos azules), mg024 (árbol de luz), mg025,
mg029, mg030, mg032 (casa con IA), mg037, mg041, mg042 (corredores cenitales con sombra larga), mg048, mg049 y mg074
(tren de noche), mg053, mg061, mg062, mg064, mg066, mg067 (tinta), mg068, mg076 (TouchDesigner), mg078 (mapa de un
juego conocido), mg079 (póster con realidad aumentada), mg080. Además 17 GIF (Kirokaze, planetas, ríos).

---

## 3 · Arte para lo digital (tablero `jdvanegas52/arte-para-lo-digital`)

19 pins: **15 imágenes, 2 GIF, 3 videos**. Es casi todo póster editorial, así que se analiza el estilo y cómo se animaría.

### Estilo que se repite en las imágenes
- **Paleta:** fondo crema o de papel (ad02, ad07, ad14, ad17, ad18) con **un color sólido dominante** (mostaza,
  bermellón, cobalto) y negro. O un color plano que llena todo (ad03 rojo, ad10 azul).
- **Texturas:** papel rasgado (ad02: un retrato antiguo asoma por la rotura del papel amarillo), grano de impresión,
  grabado en tinta (ad00, el pelo en líneas azules), fotos en blanco y negro recortadas.
- **Tipografía:** **titulares condensados gigantes** (ESPERANZA, SILENT, RETRO, Galería) que ocupan el ancho y a veces
  quedan **detrás** de la figura (ad07); textos pequeños tipo ficha técnica en las esquinas, cruces de registro,
  códigos de barras.
- **Composición:** una figura grande, o arquitectura en perspectiva central (ad03, ad10: arcos hacia un punto de fuga);
  collage surrealista con escalas imposibles (ad11, ad14, ad18); mucho espacio vacío.
- **Arte clásico + diseño de hoy:** estatua griega con geometría roja (ad05), pintura barroca con tipografía moderna (ad07, ad12).

### Cómo se animaría cada una
| Pin | Imagen | Animación propuesta y pieza |
|---|---|---|
| ad02 · https://co.pinterest.com/pin/e1_AfqPShznO9qWBIIi2mkczxM1_YDiZJtCYyiEdSgG6uZgcHgkmng0/ | Papel amarillo rasgado con un retrato antiguo, «ESPERANZA» | El papel se **rasga** en 3 pasos (máscara SVG de borde irregular que crece), push-in lento al retrato, titular letra por letra con *stagger* de 2 cuadros. **N07 documento de 1666.** |
| ad07 · https://co.pinterest.com/pin/e1_AfqPShyDiG5VnNVHP9QUikMogrRt1gMMLnE2UA81ENsgXjPTEL10/ | Retrato barroco con «SILENT» detrás | Texto **detrás** de la figura recortada: el titular sube por detrás y la figura queda delante. Gancho de juanda con su cara recortada. |
| ad10 y ad03 | Arcos que se repiten hacia el fondo | *Infinite zoom*: push-in lineal; cuando un arco llena el cuadro se reinicia (bucle perfecto). **renovación automática (N19–N24)** (el pasillo que no termina). |
| ad11 · https://co.pinterest.com/pin/e1_AfqPShw1LxUnD_u2_B4RUlVR7lxEACwYOe_01LI8-SJTUtaRw4Bk/ | Escalera, sol rojo, luna, «Good ideas better days» | Parallax de 4 capas con cámara muy lenta; la figura sentada es lo único que se mueve. |
| ad14 y ad18 · https://co.pinterest.com/pin/e1_AfqPShyB3I5RkKFHquKDYR4loeQoR_TvEkFgZ4Ts1qTJOanXfyah/ | Collage de recortes en escalas imposibles | Cada recorte entra con un **golpe** (escala 1,15 → 1 en 4 cuadros, sombra dura) siguiendo el ritmo. **«La historia de una firma».** |
| ad12 · https://co.pinterest.com/pin/e1_AfqPShyGNyhDygTpzTsen5ezrFzk8BYEr0yRQ1wFnDCAYryjkjkR/ | Persona de espaldas ante un cuadro | Push-in hasta entrar en el cuadro (transición a la escena siguiente). |

**ad016 · Collage editorial «Society» en movimiento · 6,1 s, 120 BPM**
https://co.pinterest.com/pin/e1_AfqPShx3Lqfn135-IGcxKWTmlhGLhTq_BdPdvAjBvXpoNX3ct0Rp/
- **Ficha:** fondo crema, fotos B/N recortadas, círculos rojos y azules sólidos. Push-in leve y **el layout se
  reacomoda**: las fotos se deslizan, los círculos flotan y se funden, el título naranja se desvanece. Todo con
  ease-in-out suave. El golpe de 3,85 s coincide con el momento en que el collage se asienta.
- **Técnicas:** *layout morph*, *editorial collage motion*, formas geométricas sólidas.
- **Remotion:** cada elemento con `desde` y `hasta`, `interpolate` con `Easing.inOut(Easing.cubic)`, desfasados 3-5 cuadros.
- **Para:** **«La historia de una firma»**, N06 patentes en Colombia.

**ad015 · Isla de tierra flotante con bordes de cascada · 10 s, sin audio**
https://co.pinterest.com/pin/e1_AfqPShwgAdZOZfcr0hC4Fu9nxuxGBfDXZnkuTMxabETX4ovtRz4k/
- Un pedazo de paisaje real recortado como **losa** sobre negro, con los bordes extruidos hacia abajo y el agua
  cayendo; la losa gira muy lento. *Extruded terrain*, *diorama cut-out*. **Para:** N06 (Colombia como una losa que flota), N16.

**ad013 · Imágenes generadas de iglesia y circuitos · 29,7 s, ~150 BPM**
https://co.pinterest.com/pin/e1_AfqPShzCyKuFFFljJMtWiDkMuCe8yRme2z32J0iSumSy1_9sTAsV/
- Imágenes con IA una tras otra (cortes a 1,3 · 4,8 · 6,4 · 10,0 · 11,7 · 14,8 · 16,5 · 19,0 · 21,3 · 24,8 s, sobre golpes)
  con push-in suave. Es el ejemplo de lo que **se ve «IA»**: imágenes brillantes sin idea de movimiento propia. Sirve
  solo el ritmo de cortes. Tema religioso satírico: no es para las marcas.

GIF del tablero: ad06 (taxi volador en voxel con neón) y ad08 (Instagram en ventana de Windows 98 con orcas en bucle).

---

## Tabla resumen

| Pin | Tablero | Pieza | Técnica clave |
|---|---|---|---|
| px344 | Pixel | **N01**, primera web | Texto diegético en una valla, barrido de scanlines, figura de espaldas |
| px071 | Pixel | **N01**, primera web | Palette swap por épocas con glitch de 3 cuadros |
| px368 | Pixel | **N01**, N02 | Parallax de 4 capas, primer plano que tapa, cono de luz |
| px342 | Pixel | N04, N01 | Side-scroller con cámara fija, letterbox, lluvia |
| px366 | Pixel | N01, primera web | Paneo lateral con reflejo en el piso |
| px421 | Pixel | N16, N09–N12 | Multitud que se mece, monocromo con acento |
| px352 | Pixel | N02, N01 | Paleta NES de 13 colores, draw-on por escalones |
| px381 | Pixel | N01, N05 | Hit flash de rayos X de 1 cuadro |
| px245 | Pixel | primera web, N05 | Ciclo de carrera de 2 poses + cambio de armadura |
| px411 | Pixel | N01, N06 | Póster animado, escala por pasos |
| px230 | Pixel | N01 | Inversión de 1 cuadro |
| px313 | Pixel | N01 | Puntos de carga en ola |
| px314 | Pixel | N33–N34, primera web | Rastro de ventanas de error |
| px376 | Pixel | N02, N01 | Typewriter + text scramble |
| px275 | Pixel | N01, N19–N24 | Iris in/out, paleta de 4 tonos |
| px003 | Pixel | N01 (fondo), firma | God rays que respiran, cinemagraph |
| px016 | Pixel | N16 | Diorama isométrico vivo |
| mg070 | MG | **N01**, N09–N12 | Matriz LED con persistencia |
| mg084 | MG | primera web, N33–N34 | Match cut sobre silueta, cortes a corcheas |
| mg058 | MG | N04, N01 | Wipe por objeto que cruza |
| mg065 | MG | N09–N12, N01 | Cinemagraph de neón con lluvia |
| mg036 | MG | **N09–N12** | Ventanas que se encienden + tracking boxes |
| mg040 | MG | Cómo piensa una IA, N14 | Grafo que sigue la luz, corte en el relámpago |
| mg086 | MG | **N07** | Ken Burns + subtítulo palabra por palabra + glitch RGB |
| mg016 | MG | La historia de una firma, contrato de palabra, firma en el celular | Acercamiento lento + plexus de hilos |
| mg059 | MG | **N33–N34** | Maqueta de revista con videos en tarjetas |
| mg056 | MG | contrato de palabra, incumplimiento | Papel que se arruga con ease-in |
| mg028 | MG | cláusulas (N19–N24) | Tipografía que se deforma en perspectiva |
| mg072 | MG | Cómo piensa una IA | Halftone ámbar con destellos |
| mg052 | MG | Cómo piensa una IA | Solarización en bucle de ida y vuelta |
| mg050 | MG | N09–N12, N02 | Light leaks en el golpe |
| ad016 | Arte digital | La historia de una firma, N06 | Layout morph de collage editorial |
| ad015 | Arte digital | N06, N16 | Losa de terreno extruida |
| ad02 | Arte digital | N07 | Papel que se rasga y revela el retrato |
| ad10/ad03 | Arte digital | renovación automática (N19–N24) | Zoom infinito en arcos |
