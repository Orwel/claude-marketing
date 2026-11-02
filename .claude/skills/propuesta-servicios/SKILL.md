---
name: propuesta-servicios
description: Crea o actualiza una propuesta de servicios de Trifuerza (Legal, Academy, Technology) en el estilo brochure — HTML A4 con mockups de la plataforma, metáforas visuales y la constelación de trifuerza.co — y la entrega SOLO como PDF en Drive (nunca como Artifact). Usar cuando se pida "haz una propuesta", "propuesta de servicios para <cliente>", "rehaz la propuesta de <cliente>", "cotiza <proyecto>" o "pásala al estilo brochure".
---

# Propuesta de servicios (estilo brochure)

Una propuesta es un documento comercial que Juan David envía él mismo, **solo como PDF A4**.

> **Nunca se publica una propuesta como Artifact ni en ninguna web** (decisión de Juan David, 4-oct-2026:
> confidencialidad y derechos de autor). El HTML es la fuente de trabajo; lo que se entrega es el PDF.

El PDF es estático: la constelación sale quieta (las animaciones del HTML solo se ven al abrirlo en un
navegador, y eso no se entrega). Un PDF no se anima de forma nativa en celulares ni en Drive.

## Referencias que ya existen (leer la más parecida antes de escribir)

| Archivo | Cliente | Línea | Qué tiene de modelo |
|---|---|---|---|
| `brochures/propuesta-libertadores.html` | Consultorio Jurídico U. Los Libertadores | Technology (rótulo; paleta dorada) | Software a la medida con precio por puntos, transición, marco legal, mockups claros de la app |
| `brochures/propuesta-libertadores-academy.html` | U. Los Libertadores | Academy (turquesa) | Sin precio: arranca con diagnóstico; dos caminos; mockups oscuros |
| `brochures/propuesta-sas-marca-web.html` | Dos Tierras | Trifuerza (navy y naranja) | SAS + marca + web; la constelación original y el cierre con "Conócenos" |

Cada HTML de `brochures/` es su propia fuente: se edita directo (la de Academy nació de la cabeza CSS de la
del consultorio, pero ya es independiente). Para una nueva, copia el HTML de la referencia más cercana y
reescribe las secciones.

## 1. Recoger antes de diseñar

- **Cliente, problema y su contexto**: si ya hubo una versión anterior, búscala en Drive
  (`CARPETA_PROPUESTAS`, también en `Anteriores a 2026-1/Propuestas enviadas`) y **conserva precios y
  planeación** salvo que él diga otra cosa.
- **Lo que ya existe**: si hay una app o repo (`../<proyecto>`), mándale un agente Explore a mapear
  pantallas, tokens de color, etiquetas reales y qué funciona hoy vs. qué está solo en docs.
- **Precio**: nunca se inventa. Si no lo dio, la propuesta dice "se define tras el diagnóstico".
  Para cotizar por puntos sirve el método de la skill `trifuerza-propuestas` (Libertadores: ~$421.000 por punto).
- **Lo que se necesita del cliente**, en lenguaje no técnico y con responsable (Cliente / Trifuerza / Conjunto).

## 2. Mundo visual por línea

| Línea | Fondo | Acento | Llamada a la acción |
|---|---|---|---|
| Trifuerza Legal | `#030712` | dorado `#C9A227` / `#E8C547` | dorado |
| Trifuerza Academy | `#050B16` | turquesa `#00C4CC` / `#33D6DD` | naranja `#F28C28` |
| Trifuerza (Technology, mixtas) | navy `#0B1426` | naranja `#F28C28`, azul `#0090DE` | naranja |

**El rótulo junto al logo es la línea del servicio, no el sector del cliente**: software a la medida →
TECHNOLOGY (aunque el cliente sea jurídico), cursos y formación → ACADEMY, servicios jurídicos → LEGAL.

Fuentes: `<link rel="stylesheet" href="kit/fuentes.css">` (Inter y Fraunces **estáticas**, nunca las variables), logo `../public/marcas/trifuerza/logo-horizontal-claro.png`
con la línea al lado (LEGAL / ACADEMY). Logos de clientes en `public/clientes/<cliente>/`.
Hojas `section.pagina` de 210×297 mm, `@page { size: A4; margin: 0 }`, una página por sección.

## 3. Estructura que le gusta (10 a 14 páginas)

**Enlace `www.trifuerza.co ↗` en el pie de TODAS las páginas** (no solo en la portada), como
`<a class="web" href="https://www.trifuerza.co">`, además del botón del cierre.

1. **Portada**: título grande, lead, **mockups** (computador + celular) de cómo quedaría, 3 cifras clave,
   constelación con el cliente como nodo central arriba a la derecha, `www.trifuerza.co ↗` en el pie.
2. **Por qué / la oportunidad**, con una **metáfora visual** en SVG (arrendar vs. ser dueño, el puente
   de la transición, el ciclo del contenido, un curso con muchas vidas…).
3. **Lo que ya existe** (mockup fiel a la app real) y lo que **se construye** (rotulado así).
4. **Desde el celular**: tres teléfonos con pantallas distintas.
5. **Para cada tipo de usuario** (no solo el usuario final: también quien supervisa o dirige).
6. Metodología por etapas o sprints · alcance (por puntos si hay precio) · **lo que necesitamos del cliente**.
7. **Marco legal y seguridad** (T&C, datos personales Ley 1581, roles, incidentes) y **expectativas claras**
   (es un apoyo, puede fallar poco, soporte opcional).
8. **Inversión** (o "tras el diagnóstico"), módulos opcionales, entregables y fuera del alcance.
9. **Cierre**: frase de cierre + "¿Quieres saber más de nosotros?" + botón
   `<a class="boton-web" href="https://www.trifuerza.co">Conócenos en www.trifuerza.co ↗</a>`
   y una franja tenue de constelación sin cliente.

Cada página debe quedar llena y sin roces: si sobra aire abajo, añade un bloque útil (ejemplos de
cursos, ideas de uso, preguntas que responde el diagnóstico); si se desborda, compacta.

## 4. Reglas de contenido (decisiones de Juan David)

- **Mockups en HTML con datos de mentira**, nunca capturas de la app real: radicados `Rad. ••••• / 20••`,
  personas como "Estudiante A · 9.º sem.", nombres de partes tachados. Pie: "con datos de ejemplo".
- **Competidores**: por defecto no se nombran ("la herramienta actual", "licencia genérica"). Solo si él lo
  pide, y como comparación sana (se reconoce el producto, se compara ajuste, no calidad). LegisOffice: no.
  Blackboard: sí, como referencia de LMS.
- **Sin detalles de implementación**: nada de Next.js, Supabase, Vercel, React, LiveKit, Hostinger ni nombres
  de librerías o proveedores técnicos, ni en el texto ni en la constelación. Como mucho, PostgreSQL y
  JavaScript; lo demás en lenguaje de cliente ("servidores y base de datos en la nube").
- **Colores sólidos**: tarjetas de precio y destacadas con fondo sólido y borde de acento (estilo Academy),
  barras y cajas de gráficas con relleno pleno. Nada de degradados de acento a oscuro: en el PDF se parten en dos.
- Textos sobre cajas de color sólido: **letra negra** (`#0B1220`); nunca texto claro sobre fondo claro o vivo.
- Dice **firma electrónica** (nunca "digital"), y que lo construye **un equipo** de abogados y desarrolladores.
- App en App Store / Play Store = **costo adicional** ($6.000.000 en Libertadores); app institucional = se cotiza.
- Funciones que no existen hoy van como alcance a construir; no se prometen duraciones que él no dio.
- En Academy la plataforma **transmite**; las clases se graban con **OBS** y se suben.
- **IVA siempre explícito en la página de inversión** (decisión 4-oct-2026; confirmar casos nuevos con su contador):
  desarrollo de software a la medida y asesorías jurídicas facturadas por la SAS → "antes de IVA" + IVA 19 % + total;
  suscripciones en la nube (Trifuerza Legal, Contrappto, plataformas SaaS) y suministro de páginas web → excluidas;
  si factura Juan David como persona natural no responsable de IVA (tope 3.500 UVT acumulado en el año) →
  "sin IVA" y a su nombre (así quedó Dos Tierras). Libertadores: SAS, $40M + $7,6M = $47,6M.
- Todo dato de producto, precio o norma va en `brochures/verificar.json` bajo la clave de la propuesta.

## 5. Montaje del diseño (lo que aprendimos armando Libertadores y Dos Tierras)

**Portada**
- Tres tarjetas abajo con un dato corto cada una: el titular en **una o dos palabras** ("12 semanas",
  "95 puntos", "Premium") y la explicación en la línea pequeña. Un titular largo se parte y descuadra la fila.
- **El precio no va en la portada**: se guarda para la página de inversión. Su lugar lo toma un mensaje de
  valor, p. ej. "Premium · diseño sofisticado y moderno, a la altura de la universidad": el diseño también
  vende estatus y mejora reputacional para el cliente. Sin cháchara.
- El lead dice el alcance completo en una frase (p. ej. "todos los casos del consultorio, estén o no en la
  Rama Judicial"), no solo la función estrella.
- Escena de mockups: computador a la izquierda y celular superpuesto a la derecha (`.escena`), con los
  colores, el logo y las etiquetas reales de la app del cliente (los saca el agente Explore del repo).

**Mockups**
- Las pantallas del cliente van claras si su app es clara (Libertadores: verde `#004F4A`, lateral `#18181B`);
  las de Trifuerza Academy, oscuras. Nunca mezclar el mundo visual de la propuesta dentro de la app.
- Los mensajes de bots (Telegram) copian el formato real del bot, con puntos de color en vez de emojis.
- Lo que no existe todavía se rotula en la misma pantalla ("Se construye en el Sprint 2").

**Páginas y cajas**
- Cada página llena y pareja: si sobra aire, un bloque útil (ideas de uso, ejemplos, preguntas que resuelve);
  si se desborda, compactar textos antes que achicar letra.
- Tarjetas de una misma fila con el mismo alto y estructura; grillas de 2, 3 o 4 columnas. Con 4 columnas
  (adicionales con precio), precio a 20 px.
- **Responsables en chips**: Universidad / Cliente, Trifuerza, Estudiantes, Conjunto. Trifuerza hace la
  **carga inicial parcial**; lo que cada usuario debe apropiarse (p. ej. radicar y verificar sus procesos)
  va a nombre de esos usuarios, no de Trifuerza.
- Listas de ejemplos (trámites, cursos) como chips del acento y marcadas como ejemplos: confirmar con él.
- Metáforas visuales en SVG con colores sólidos y textos legibles (letra negra sobre caja de color).

**Precios: al cambiar uno, se recalcula todo**
Precio en su página de servicio → fila de la tabla de inversión → total → total tachado → precio con
descuento → sello "Ahorras" → opción por servicio → nota de adicionales → `verificar.json`. Luego
`npm run propuesta` (vuelve a copiar a Drive) y revisar esas páginas con PDFium.
Adicionales opcionales (blog, SEO, catálogo $500.000, e-commerce…) van fuera del total y del descuento.

**Criterio de precio** (si él pregunta): lo legal suele estar bien cotizado; lo que se queda corto es el
software. Cerrar alcance (rondas de ajustes, contenido a cargo del cliente, mantenimiento aparte) y, en
marcas, ofrecer abonar el análisis a la solicitud.

## 6. Que el PDF salga limpio y nítido en el celular (obligatorio)

Al imprimir, Chrome convierte en **imágenes rectangulares de baja resolución** todo lo que lleva
transparencia o desenfoque: sombras (`box-shadow`), `filter: blur()`, degradados con `rgba`, grupos
transparentes del SVG y texto con `background-clip: text`. En el computador se disimula; en Drive y en
el celular salen como **cubos y bloques fuera de lugar, rayas en los títulos y una constelación borrosa**
(pasó con Dos Tierras: 129 máscaras de transparencia en el PDF).

La solución está en el kit y va en **toda** propuesta, como último script antes de `</body>`
(después de la constelación):

```html
<script src="kit/pdf-limpio.js"></script>
```

`kit/pdf-limpio.js` aplana la hoja antes de imprimir:
1. quita sombras, filtros y mezclas;
2. pinta el fondo de cada hoja (color base + brillos `.brillo` + patrón de cruces o rejilla) en un canvas
   al doble de resolución y lo pone como imagen opaca;
3. vuelve opacos los fondos y degradados con transparencia, mezclándolos con lo que tienen debajo;
4. en la constelación, cambia cada opacidad por el color ya mezclado con el fondo real de esa zona.

Además, al diseñar:
- **Fuentes estáticas** (`kit/fuentes.css`): las variables de `public/fuentes/*.woff2` Chrome las incrusta
  como Type3 (glifos dibujados), menos nítidos en el celular. Si hace falta otro peso, se instancia con
  fontTools en `public/fuentes/estaticas/`.
- **Nada de emojis** en mockups ni textos (🔴📎💬…): entran como fuente de color con degradados y salen
  borrosos. Estados con puntos de color en CSS o íconos SVG del sprite.
- Brillos como `.brillo` hijos directos de la `section.pagina`, con `radial-gradient(...)` o color; nada de `blur`.
- Títulos con degradado: `@media print` los pasa a color sólido.
- **Logos de clientes o de marcas**: todos con el mismo tratamiento (cuadro blanco igual, logo centrado
  con `object-fit: contain` y el mismo margen). Nunca un fondo distinto por logo.
- **Verificación antes de entregar**:
  - Máscaras de transparencia de grupo en el PDF: deben quedar en **0** (las de imágenes PNG con alfa no cuentan),
    y las fuentes deben salir como `Type0`, no `Type3`:
    `python -c "import fitz,collections; d=fitz.open('trabajo/propuestas/<nombre>.pdf'); print(sum(1 for x in range(1,d.xref_length()) if '/SMask' in d.xref_object(x) and '/SMask /None' not in d.xref_object(x) and '/Subtype /Image' not in d.xref_object(x)), collections.Counter(f[2] for p in d for f in p.get_fonts()))"`
  - Mira las páginas con el motor de Android/Drive (pypdfium2):
    `python -c "import pypdfium2 as p; d=p.PdfDocument('trabajo/propuestas/<nombre>.pdf'); [d[i].render(scale=1.1).to_pil().save(f'p{i+1}.png') for i in range(len(d))]"`
  (PyMuPDF, pypdfium2 y pillow están en el Python del equipo, no en el repo.)

## 7. Constelación (la de trifuerza.co)

Al final de la página, antes de `</body>`:

```html
<script>window.TERMINOS_PROPUESTA = {
  tech: ['Rama Judicial', 'Telegram', 'API', '{ }'],          // tecnología de esta propuesta
  law: ['§', 'Art. 317 CGP', 'Ley 1581', 'T&C'],              // derecho / reglas
  design: ['UX', 'estudiantes', 'mobile first', '✦'],         // personas, diseño, negocio
};</script>
<script src="kit/constelacion.js"></script>
```

Portada: `<svg class="constelacion" data-paleta="legal|academy|trifuerza" data-semilla="7" data-zona="495,105,785,400" data-nodos="18" data-cliente="Cliente" viewBox="0 0 794 1123" aria-hidden="true"></svg>`
justo después de abrir la sección. Cierre: misma etiqueta sin `data-cliente`, `data-nodos="9"`,
zona en la franja libre sobre el pie y `style="opacity:.55"`. Copia también el bloque CSS
`/* Constelación … */` de `propuesta-libertadores.html` (estilos, animaciones solo en pantalla y
`@media print` que las apaga). Cuida que las palabras no pisen el título ni el lead: mueve la zona.
La constelación es **minimalista**: el kit separa los nodos (ninguno encima de otro), deja libre el
nombre del cliente y quita la palabra de un nodo si choca con otra. No subas `data-nodos` por encima de ~20.
Toda propuesta usa `kit/constelacion.js` (nunca una copia pegada en la página), así un arreglo llega a todas.

## 8. Producir, revisar y entregar

```bash
npm run propuesta -- <nombre> --archivo=Propuesta_<Cliente>_<tema>_v1.pdf --revisar
```

- Saca el PDF en `trabajo/propuestas/` y, con `--revisar`, una captura por página en
  `trabajo/propuestas/<nombre>/revision/pN.png`. **Mira todas las capturas** y la portada con PDFium.
- Copia el PDF a Drive: `CARPETA_PROPUESTAS/<semestre>/` (semestre `AAAA-1` ene-jun, `AAAA-2` jul-dic).
  Lo anterior a 2026-2 vive en `Anteriores a 2026-1/`. `--sin-drive` para pruebas.
- Anota la propuesta en `docs/PROPUESTAS.md` y entrégale el PDF con `SendUserFile`, más los
  pendientes de `verificar.json`. **No se publica ningún link.**

## Video de la propuesta (opcional)

Si pide la propuesta en video, se hace con la skill `producir-pieza` (plantilla Brochure, sección
"Brochures y propuestas en video"): mismos textos y precios del PDF, música según el negocio y copia a la
misma carpeta de Drive del semestre. Tampoco se publica en redes ni como Artifact.

## Al terminar

Lo que pidió cambiar y lo que se resolvió va a `docs/APRENDIZAJES.md` (sección de propuestas).
