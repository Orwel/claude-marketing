# Locución · entrenamiento de Juan David

Meta: hablar como «Juan Da Voice oficial» (su clon de ElevenLabs, `ZdAh80pu3q47gWzmqvOL`) en el reel
«Kafkiano»: **tranquilo pero interesante**, con pausas, modulación y frases que caen al final.
Locución modelo: `public/kafka/voz.mp3` (42,9 s, eleven_v4). Texto: las `frases` de `piezas/2026-11/jd-kafka.json`.

Este documento es el plan y el diario. Se actualiza en cada medición.

---

## 1. Cómo se mide

```bash
npm run medir-voz -- <audio> [texto.txt | número de palabras]
```

`src/voz/medir.js` usa ffmpeg (sin dependencias) y saca:

| Medida | Qué dice | Cómo se calcula |
|---|---|---|
| **ppm con pausas** | la sensación de velocidad | palabras ÷ tiempo total hablado |
| **ppm articulando** | qué tan rápido dices cada palabra | palabras ÷ tiempo con voz (sin pausas) |
| **pausas/min y % de silencio** | cuánto dejas respirar la idea | silencios ≥ 250 ms, umbral relativo a tu propia voz |
| **rango de volumen** | si hay palabras que pesan | dB entre el p90 y el p20 de la voz |
| **variación de tono** | si la voz se mueve o es plana | desviación en semitonos alrededor de tu tono medio |
| **caídas** | si las frases aterrizan | tono de los últimos 300 ms vs. el resto de la frase; ≤ −1,5 st = cae |

El umbral de silencio es relativo a la voz, así que un celular y el MP3 de ElevenLabs se miden con la misma
vara. Los números sirven para **compararte contigo mismo** semana a semana, no son de laboratorio.

## 2. La voz modelo en números

| Medida | Clon (`voz.mp3`) |
|---|---|
| Velocidad con pausas | **151 ppm** (107 palabras) |
| Velocidad articulando | **204 ppm** |
| Pausas | **23 por minuto** (una cada ~2,6 s) · **26 %** del tiempo en silencio |
| Duración de pausa | media **0,69 s** · 9 de 16 pasan de 0,6 s · la más larga **2,0 s** |
| Rango de volumen | **11,9 dB** |
| Tono | mediana **125 Hz** · variación **2,8 st** · rango **8,9 st** |
| Finales de frase | 5 de 11 caen ≥ 1,5 st · cambio medio **−1,2 st** · las dos caídas más fuertes: −4,7 y −4,9 st |

**Lo que revelan (y corrige lo que le dijimos antes):**

1. **Lo tranquilo no es hablar despacio.** Las palabras salen a 204 ppm, que es ritmo normal de conversación.
   La calma la ponen los silencios: una cuarta parte del audio es pausa. Bajar la velocidad de las
   palabras suena a lectura lenta; lo que hay que copiar es **cortar y esperar**. (El «~140 ppm» de la sesión
   anterior era una estimación; el medido es 151.)
2. **La pausa más larga va justo antes de la frase clave.** 2 s de silencio después de «Y la cierra.» y antes
   de «Eso es lo kafkiano». Una sola pausa enorme por pieza, en el giro.
3. **No todas las frases caen.** En la narración («lo detienen una mañana», «Nadie le dice…») el final queda
   suspendido o sube: eso dice «sigue, no he terminado». Caen con fuerza los remates de bloque. Regla:
   **subir = continúa · bajar = punto**. El error típico es subir en todas (suena a duda) o bajar en todas
   (suena a sermón).
4. **La palabra que pesa se marca más con tiempo que con volumen.** 12 dB de rango es moderado: el clon no
   grita la palabra clave, la **alarga un poco y la deja caer** antes de la pausa.

## 3. Diagnóstico (semana 0)

Dos grabaciones con el iPhone, mismo sitio, misma distancia:

1. **Lectura en frío.** Lee el texto de abajo una vez **sin escuchar antes el clon**. Como te salga.
2. **Habla libre, 30–45 s.** Sin papel: explica a un amigo qué es algo «kafkiano» y cuéntale un trámite que
   te haya pasado. Aquí salen los hábitos reales.

Texto de la lectura (el mismo que dice el clon):

> Kafka era abogado. Y escribió la peor pesadilla de cualquier cliente.
> En El proceso, a Josef K. lo detienen una mañana. Nadie le dice de qué lo acusan. Y aun así, el proceso sigue.
> Busca abogados, sube a juzgados escondidos en áticos. Cada paso le abre tres trámites más.
> Un hombre espera toda la vida frente a la puerta de la ley. Al final, el guardián le dice que esa entrada era solo para él. Y la cierra.
> Eso es lo kafkiano: no una ley injusta, sino una ley que nadie te explica.
> Hacer el derecho entendible también es justicia.
> ¿Cuál ha sido tu trámite más kafkiano?

**Cómo grabar:** Hollyland en la solapa (o el iPhone a un palmo de la boca, de lado), cuarto con cortinas o
ropa alrededor, sin ventilador. App Notas de voz o la cámara, da igual. Deja los archivos en
`trabajo/locucion/` con la fecha: `2026-11-01-lectura.m4a`, `2026-11-01-libre.m4a` (la carpeta `trabajo/`
no va a git). Para la habla libre basta pasar el número aproximado de palabras o dejar que lo transcriba.

## 4. Rutina diaria · 10 minutos

| Min | Bloque | Qué haces |
|---|---|---|
| 0–2 | **Calentamiento** | 3 respiraciones 4-4-8 (inhala por la nariz 4, sostén 4, suelta en «sss» 8). 30 s de vibración de labios («brrr») subiendo y bajando. 3 **sirenas** «mmm» de grave a agudo a grave. Termina con «mmm-sí» en tu tono más cómodo: ese es tu suelo. |
| 2–3 | **Articulación** | Un lápiz entre los dientes y lee 2 líneas cualquiera exagerando cada consonante. Quítalo y repítelas: notarás la boca más suelta. |
| 3–7 | **Sombra** | Tres frases de `voz.mp3` por día (rótalas). Por cada una: escúchala → pausa → repítela pegándote a la melodía, no a las palabras → otra vez, ahora con tus palabras de siempre. Al final, las tres seguidas con tus pausas. |
| 7–9 | **Marcar y leer** | Un párrafo nuevo (un copy del mes, un pedazo de clase). Márcalo con la notación de abajo en 1 minuto y léelo en voz alta respetando las marcas. |
| 9–10 | **Grabarte** | 30 s del párrafo marcado. Escúchalo una vez a 1x. Anota una sola cosa que cambiarías mañana. |

El domingo, en vez de la rutina: graba la lectura de Kafka y el reto de la semana, y mídelos.

### Notación para el guion

| Marca | Significa |
|---|---|
| `/` | pausa corta (respira sin tomar aire) · ~0,4 s |
| `//` | pausa larga, antes de lo importante · 0,7–1 s |
| `///` | **la** pausa del texto; solo una por pieza · 1,5–2 s |
| **negrita** | la palabra que pesa: una por frase, como mucho |
| `↘` | la frase cae: termina más grave y más suave |
| `↗` | la frase queda suspendida: sigue la historia |

Ejemplo, como lo dice el clon:

> Kafka era **abogado** ↘ // Y escribió la peor **pesadilla** / de cualquier cliente ↘ //
> En El proceso / a Josef K. lo **detienen** una mañana ↗ / Nadie le dice de qué lo **acusan** ↗ /
> Y aun así / el proceso **sigue** ↘ //
> … el guardián le dice que esa entrada era **solo para él** ↘ / Y la **cierra** ↘ ///
> Eso es lo **kafkiano** ↘ / no una ley injusta / sino una ley que **nadie te explica** ↘ //

## 5. Retos semanales

Cada domingo se mide la lectura de Kafka + el reto. La meta es acercarse al clon, no clavarlo.

| Semana | Reto | Ejercicio extra | Meta medible |
|---|---|---|---|
| 1 · Pausas | Lee cualquier texto haciendo una pausa en cada coma y en cada punto, aunque se sienta exagerado. | Cuenta «uno» mental en cada `/` y «uno-dos» en cada `//`. | ≥ 20 pausas/min y ≥ 20 % de silencio |
| 2 · Caídas | Di 10 frases afirmativas terminando como si cerraras una puerta. Luego las mismas como pregunta, para sentir la diferencia. | Graba «Y la cierra.» diez veces, cada una más grave al final. | ≥ 50 % de frases caen · cambio medio ≤ −1,0 st |
| 3 · La palabra que pesa | En cada frase del texto, elige UNA palabra y alárgala un poco antes de una pausa. Lee la misma frase tres veces cambiando la palabra. | Lee «Nadie le dice de qué lo acusan» poniendo el peso en «Nadie», «dice» y «acusan». | rango de volumen ≥ 10 dB |
| 4 · Melodía | Cuenta una noticia del día como si fuera el inicio de un cuento. | Sirenas con frases: «Kafka era abogado» de agudo a grave, cinco veces. | variación de tono ≥ 2,5 st |
| 5 · Contraste | Alterna: una frase con ritmo (enumeración) y la siguiente lenta y corta. Como «busca abogados, sube a juzgados…» → «Y la cierra.» | Lee el bloque 4 del guion a 1,2x y el bloque 5 a 0,8x. | ppm con pausas entre 140 y 160 |
| 6 · Sin papel | Graba un reel corto de 30–40 s **con tu voz y tu cara**, sin leer, con la técnica completa. | Ponlo al lado del clon con el mismo texto y escúchalos en orden aleatorio. | todas las metas anteriores en habla libre |

Después de la semana 6: repetir el ciclo con textos de clase (Trifuerza Academy), que es donde más vas a
hablar.

**Material de sombra para textos nuevos:** el conector de ElevenLabs de la sesión puede locutar con tu clon
cualquier texto que vayas a grabar (copy del mes, inicio de una clase) para que tengas el modelo de esa misma
frase. Gasta créditos: se hace solo cuando lo pidas.

## 6. Lecturas para entrenar ya

Seis textos cortos, ya marcados y ordenados de fácil a difícil. Cada uno se lee **tres veces**: la primera
exagerando las marcas (pausas el doble de largas), la segunda normal y la tercera grabándote.

**1 · Pausas**
> Hay contratos que se firman en cinco minutos ↗ / y se pelean durante **cinco años** ↘ //
> La diferencia ↗ / casi siempre ↗ / está en una **sola cláusula** ↘ ///
> La que nadie **leyó** ↘

**2 · Caídas**
> Un contrato no es un trámite ↘ // Es una **promesa** ↘ // Y las promesas / se **cumplen** ↘

**3 · Suspender y caer**
> Una mañana ↗ / te llega un correo ↗ / que dice **urgente** ↗ // Lo abres ↗ / y es una demanda ↘ //
> No sabías que existía ↘ / pero el plazo / ya **empezó a correr** ↘ ///
> Eso pasa ↘ / más de lo que **crees** ↘

**4 · Contraste** (lo primero de corrido, lo segundo despacio)
> Firmas el arriendo, pagas el depósito, recibes las llaves, te mudas ↗ //
> y tres meses después ↗ / descubres que **nunca leíste** / la cláusula de salida ↘

**5 · Inicio de clase**
> Hoy no vamos a hablar de robots ↘ // Vamos a hablar de algo más **cercano** ↘ /
> de las herramientas que ya tienes en el celular ↗ / y que todavía **no estás usando** ↘ ///

**6 · Cierre con pregunta**
> ¿Cuál ha sido el contrato que **más te ha costado** entender? ↘ //
> Cuéntamelo ↘ / te leo en los comentarios ↘

Ojo con las preguntas: las que empiezan por *qué, cuál, cómo* **caen** al final en español; solo las de
sí/no («¿Lo firmaste?») suben.

Cada lectura tiene su guion completo (~25–40 s), con marcas de respiración, gestos y notas de dicción, en
`piezas/2026-11/guiones/practica-voz.md`.

## 7. Diario de progreso

| Fecha | Grabación | ppm (pausas / artic.) | Pausas/min · % silencio | Rango vol. | Var. tono | Caídas | Nota |
|---|---|---|---|---|---|---|---|
| — | **Clon (`voz.mp3`)** | 151 / 204 | 23 · 26 % | 11,9 dB | 2,8 st | 45 % · −1,2 st | referencia |
| 2026-11-?? | Lectura en frío | | | | | | pendiente de grabar |
| 2026-11-?? | Habla libre | | | | | | pendiente de grabar |
