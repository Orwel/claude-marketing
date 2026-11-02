# Estilos de video · guía individual

Cada pieza nueva **escoge el estilo por la historia**, no por variedad, y **explora** uno distinto: Kafka (nov-2026)
marca el **nivel**, no el estilo de siempre. Referencias analizadas: `referencias/pinterest-2026-11.md` (#1–#19) e
`referencias/instagram-2026-11.md`.

## Las cinco reglas de todos los estilos

1. **Contextual.** El mundo visual sale del tema: Kafka es grabado y archivo de 1920; la IA es partícula y código; un
   producto es su interfaz. Si el estilo se podría pegar a cualquier otro tema, está mal escogido.
2. **Se dibuja lo que se narra.** Cada frase de la voz tiene su imagen y esa imagen **aparece mientras se dice**:
   «lo detienen» = llegan los hombres de bombín; «tres trámites más» = tres puertas o tres golpes; «la cierra» = se
   cierra y llega el silencio. Nada de imágenes de relleno.
3. **Todo se mueve.** Nada aparece quieto: se traza (*draw-on*), se construye pieza por pieza, se sombrea. Los
   personajes **actúan**: respiran, giran la cabeza, miran, fuman, envejecen. Las transiciones solas no bastan.
4. **Ritmo de la referencia.** Ráfaga de cortes rápidos (0,3–0,8 s), una **pausa larga** donde pasa algo hermoso,
   golpes de luz en los cortes y cierre en **bucle** con el primer plano. Los cambios caen en los golpes de la música.
5. **El texto acompaña, no tapa.** Cada palabra dicha sale en pantalla, en su zona (arriba, con velo cuando el dibujo
   sube), moderna y con el énfasis en itálica. Nunca encima de la cara o del gesto que se está contando.

Este proceso está en la skill `video-artistico`. Resumen: (1) bajar la referencia y sacar la hoja a 1 cuadro/s + cortes con
`select='gt(scene,0.25)'` + medida del audio; (2) guion de ~40 s y voz oficial (ElevenLabs «Juan Da Voice oficial»);
(3) **una escena de prueba** antes del video entero; (4) cuadros fijos, render, Drive y kit de publicación.

## Estilos

### 1. Grabado a plumilla · *hecho: Kafka v4*
- **Para:** historia del derecho, literatura, casos célebres, ideas abstractas con peso (justicia, burocracia).
- **Mundo:** papel gris moteado, tinta, rayado de grabado; un solo color (naranja) cuando llega la idea central.
- **Narra dibujando:** manuscritos que se escriben solos con plumilla; personajes de **fotos de época de dominio
  público** vectorizados con sombreado a lápiz (`src/archivo/trazos.py`); arquitectura que se construye (puertas,
  arcos, piso en perspectiva); escaleras infinitas en 3D (`remotion/tinta/Escalera3D.jsx`).
- **Movimiento:** line boil (temblor de 3 en 3 cuadros), cabezas recortadas que giran, respiración, humo, polvo en la
  luz, árbol de luz que crece, cámara que empuja lento.
- **Música:** piano y cuerdas oscuras (Kevin MacLeod, CC BY). **Plantilla:** `Grabado`.

### 2. Collage de archivo vivo · *referencias #4, #5*
- **Para:** «la ley que esperó 70 años», el origen de una norma, la historia de un contrato o de un producto.
- **Mundo:** papeles viejos sobre madera, sellos, recortes de fotos de época, máquina de escribir.
- **Narra dibujando:** cada fecha se estampa con un sello; cada persona entra como recorte de foto que se pega; las
  cifras se escriben a máquina tecla por tecla; termina en la pantalla del producto, que sale de una carpeta.
- **Movimiento:** parallax de capas de papel, recortes que caen y rebotan, cinta que se pega, flechas a mano.
- **Música:** ~115 BPM, cortes en el golpe. **Por construir:** escena de collage sobre `Grabado` (reusa recortes y trazos).

### 3. Teléfono en capas · *hecho: Contrappto, referencia #8*
- **Para:** mostrar todo lo que hace la app sin un tutorial aburrido.
- **Narra dibujando:** cada función que se nombra sale de la pantalla como capa real de la app y pasa al frente.
- **Movimiento:** vista explotada en 3D, flotar, implosión al cierre. **Plantilla:** `Capas`.

### 4. Interfaz que se arregla · *referencias #6 y el reel ganador de feuxui*
- **Para:** consejos prácticos («deja de firmar sin fecha de terminación»), demos de Contrappto.
- **Narra dibujando:** el documento o la pantalla se corrige mientras se explica; pastillas rojo/ámbar/verde marcan el
  error, el cambio y el resultado; cierre en tres verbos y «Comenta PALABRA».
- **Movimiento:** escritura con cursor, tarjetas en cascada, brillo que recorre. **Base:** kit web (`remotion/kit`).

### 5. Partículas y ASCII · *referencias #9, #10, #11, #12*
- **Para:** inteligencia artificial, datos, «lo que la máquina ve».
- **Narra dibujando:** el rostro o el documento se arma de puntos o caracteres mientras se nombra y se desarma en el golpe.
- **Movimiento:** dispersión y recomposición al ritmo (en el #12, un golpe cada 3,2 s), HUD de audio.
- **Por construir:** escena de partículas sobre canvas (sin GPU, cuidar el número de puntos).

### 6. Trazos de luz · *referencia #1*
- **Para:** intros, energía, combate de ideas (demanda contra contestación).
- **Narra dibujando:** las figuras son solo trazos de luz que se dibujan con estela; el choque es un destello.
- **Movimiento:** draw-on con brillo, estelas, flash en el impacto, fondo negro.

### 7. Ilustración pintada sobre video real · *referencias #13, #14*
- **Para:** juanda con su propio video del iPhone (la oficina, la ciudad, un evento).
- **Narra dibujando:** etiquetas y anotaciones que se pegan a lo que aparece; el cielo o un objeto se vuelve dibujo o
  pintura; un solo objeto recoloreado con el acento.
- **Movimiento:** etiquetas que siguen al objeto, pixelado que «carga», cortes cada ~0,5 s. **Base:** plantilla `Montaje`.

### 8. Diorama isométrico en pixel art · *referencias #16, #17*
- **Para:** stories, Academy, «el despacho» o el curso como un pequeño mundo.
- **Narra dibujando:** cada elemento del diorama se enciende cuando se nombra (la biblioteca, el escritorio, el reloj).
- **Movimiento:** bucle perfecto, solo humo, luces y agua se mueven. **Base:** mundos de la plantilla `Arcade`.

### 8b. Ciudad pixel con valla (Kirokaze) · *referencia px344 · hecho: N01 v2, aprobado 2-nov-2026 (`remotion/n01/CiudadValla.jsx`)*
- **Para:** historias de videojuegos, tecnología y nostalgia (patentes de juegos, «mi primera web», la historia de internet).
- **Mundo:** una ciudad nocturna vertical a pantalla completa, pintada en pixel (arte a 270×480 escalado ×4, `pixelated`),
  paleta corta: azul petróleo de base, la valla en verde menta como única luz fuerte, rosa neón de acento.
  Una figura pequeña (5–10 % del alto) sentada de espaldas en una terraza, mirando la valla. Sin marco, sin barra, sin cajas.
- **Narra dibujando:** la valla es la pantalla de la historia: cada frase cambia lo que muestra (NOW LOADING, el minijuego,
  el sello) con un **barrido de scanlines** de arriba abajo. El texto clave vive **dentro de la valla**.
- **Movimiento:** cámara quieta o un travelling lateral lineal; solo 3–4 cosas se mueven (carros voladores que cruzan,
  lluvia, parpadeo de neones, la figura que respira o gira la cabeza en tres). Todo a pasos de pixel, sin spring ni easing.
  Transiciones: iris a saltos, inversión de 1 cuadro, destello de 1 cuadro en el golpe.
- **Material:** fondo de un pack comprado con licencia comercial (ciudad en capas de parallax) + lo que se anima encima.
  Nada de sprites hechos con divs ni del kit Arcade del SOFA (N01 v1 fue rechazado por eso).
- **Música:** synthwave o lo-fi de librería con licencia (nada sintetizado por código).
- **Subtítulo:** cada palabra dicha en una franja baja sobre el piso oscuro de la terraza, letra moderna, sin caja.

### 9. Vidrio y luz en 3D · *referencia #7*
- **Para:** servicios de Trifuerza.co, lanzamientos.
- **Narra dibujando:** cada servicio es un bloque de vidrio que se ensambla; la estructura completa es el resultado.
- **Movimiento:** cubos que se arman, refracción, cámara que orbita. **Base:** three.js como la escalera (sin GPU: pocas piezas).

### 10. Noticia con cifra · *referencia de midu (robo de cripto)*
- **Para:** una noticia jurídica o de IA con un número que impacta.
- **Narra dibujando:** la cifra gigante se cuenta hacia arriba; los objetos de la historia aparecen en 3D o dibujados
  (la bóveda, el portátil); cierra con la lección en una línea. Todo dato va a `verificar[]`.

### 11. Lista para guardar · *referencia de midu (Git)*
- **Para:** «10 cláusulas que tienes que entender», como reel y carrusel.
- **Narra dibujando:** por cada punto, número, concepto, definición de una línea y un diagrama mínimo que se dibuja;
  abre y cierra con el índice. CTA: «Guárdalo».

## Portadas
Cada reel lleva **portada editorial propia**, no un cuadro del video, con identidad nuestra (no copiar a la otra cuenta):
grotesca condensada gigante con el gancho y la palabra clave en la **Fraunces itálica** de la marca en el acento, el
objeto protagonista dibujado en el estilo del video entrando por un borde, etiqueta con flecha, número de serie
(«N.º 01 · Derecho que nadie te explica») para que el perfil se lea como colección, logo visible y flecha en círculo.
Se diseña para el **recorte 3:4 del perfil** (franja y 240–1680, márgenes ~95 px) y se reparte en todo ese recuadro.
Componente: `remotion/tinta/PortadaEditorial.jsx`.

## Voz
Voz oficial de ElevenLabs. Narración: `[serious, calm]` con `[pause]` antes de lo importante. **Las preguntas al público
van en el mismo tono de la narración**, solo con entonación de pregunta: se generan con la frase anterior delante
(«Eso es lo kafkiano. [pause] ¿…?», con `[serious, calm]`) y se corta la pregunta. Nunca `[warmly]` (suena risueña y
falsa) ni forzarla grave.

## Lo que ya sabemos que NO
- Pictogramas planos o muñecos genéricos: se ven «hechos con IA». Las figuras salen de fotos reales dibujadas.
- Fotos o imágenes quietas con solo zoom: le falta animación.
- Fondos neón o cajas detrás del logo. El logo de Trifuerza va en negro sobre fondo claro.
- Convertir una foto con un filtro de rayado: parece billete o fotocopia.
- Texto encima de la cara o del gesto principal; separar todo tan estrictamente que se vea viejo.
- Pausas abruptas: el silencio llega con un descenso de la música y la imagen.
