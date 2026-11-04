# Cómo se escribe un guion (reglas con lo aprendido)

Sale del primer radar con datos reales (`docs/radar/2026-11-02.md`), de las guías oficiales de Instagram
(`docs/INSTAGRAM.md`) y de lo que Juan David pidió. Todo guion nuevo o reescrito las cumple. Línea base de juanda en
Instagram: alcance 366, retención a 3 s del 24 %, señal (guardados + compartidos por cada 1.000 alcanzados) de 8,1.

## 1. Gancho (0–3 s): ahí se pierde el 76 %
- **Una historia con algo en juego**, no un tema. Retuvieron 38–40 %: «En 2023 un abogado presentó seis sentencias.
  Ninguna existía» y «¿Eres apocalíptico u optimista con la IA?». Retuvieron 5–20 %: consejos sueltos y promos.
- **Dicho y escrito desde el cuadro 1**, con algo moviéndose en pantalla (nunca una placa quieta ni un logo).
- **Fórmulas que sirven:** un dato que contradice lo obvio («Nintendo no lo demandó por eso»); una persona con un
  problema («Son las 11 de la noche y sigues dándole F5»); un número concreto («Durante 20 años…»); una pregunta que el
  público se responde solo («¿Firmar en el celular vale?»).
- **Nunca:** «Hola, soy…», «En este video te voy a contar…», el nombre del curso o del producto primero.
- Escribir 2 o 3 opciones de gancho (A, B, C) y marcar la recomendada.

**Tu cara = tu voz (2-nov-2026):** cuando la cara de Juan David está en pantalla se oye su voz real, nunca la
clonada encima. La clonada va solo sobre ilustraciones y pantallas. En los videos mixtos él dice en cámara la frase de
ese momento (gancho o cierre) y el resto lo narra la clonada.

## 2. Cuerpo: 30–60 s, una sola idea
- Una idea por video. Si hay dos, son dos videos.
- Un giro a la mitad (el «pero…», el dato que nadie esperaba) para que no se vayan en el segundo 10.
- Lo visual cuenta la historia con o sin sonido: cada frase dicha también va en pantalla.
- Lo que más alcance trae es **lo que tú construiste** (videojuegos, apps, alertas): mostrarlo funcionando, no
  describirlo. Etiquetar a la institución o persona que aparece, con su permiso: ellos lo comparten.

## 3. Llamado a la acción: siempre, dicho, escrito y repetido en el copy
| Cuenta | Llamado |
|---|---|
| juanda (Instagram) | Seguir **con un motivo de experto**: «Si te interesa el derecho bien diseñado, sígueme». Nunca «sígueme para la parte 2». |
| juanda / trifuerza.co (LinkedIn) | Tono profesional: «Si te sirve, sígueme», «Escríbeme por DM», enlace en el primer comentario. |
| Trifuerza Academy | Vender el curso: «Inscríbete gratis, link en la bio». Si se usa «Comenta PALABRA», **una palabra distinta por curso** y no en todas las piezas («Comenta CLASE» repetido cansó). |
| Trifuerza Technology | «Agenda un diagnóstico» de desarrollo. **Trifuerza Legal está en pausa desde el 2-nov-2026: no se promociona** (ni monitoreo judicial ni alertas). |
| Contrappto | Uno de tres, según la pieza (que no se repita siempre el mismo): **«Síguenos para más casos como este»** · **«Escríbenos»** (cuando el caso pide ayuda) · **«Entra a contrappto.com y haz tu contrato gratis, link en la bio»**. «Muy pronto en App Store y Google Play» solo en el copy, sin fecha. Ya está en la web: **nunca «lista de espera» ni «llega en febrero»**, y nada de «agenda una demo». |

## 4. Engagement (lo que Instagram sí premia)
- **La pregunta final es concreta y fácil de responder**: «¿Cuál fue tu trámite más kafkiano?», no «¿qué opinas?».
- **Compartidos > likes:** frases tipo «Mándaselo a quien todavía firma de palabra»; lo cercano («así soy yo») se envía.
- **Guardados:** listas, pasos, plantillas («Guárdalo para tu próximo contrato»).
- **Comentario + seguir, siempre juntos:** nunca un CTA de solo «cuéntame en comentarios»; la pregunta va con «sígueme» (o inscribirse, cotizar, entrar a la web).
- **Prohibido el engagement bait** (pedir likes con trampas, «comenta SÍ si…»): Instagram lo castiga.
- Primera hora: responder cada comentario con otra pregunta.

## 5. Formato y frecuencia
- Instagram juanda: el mismo formato no más de 2 veces por semana (la tanda de 7 videos de IA iguales cayó).
- La opinión de IA rinde 4–5 veces más en el TikTok de trifuerza.co: va allá también.
- Carruseles: en juanda no rinden (19–220); van a LinkedIn o a stories.
- Promos de curso: el reel orgánico arranca con un caso; la versión que parece anuncio, solo en pauta.
- Reels de 30–90 s (los de más de 3 min no se recomiendan a público nuevo). Nada de marcas de agua de otras apps.

## 6. Producción: la vara de calidad (Juan David, 2-nov-2026)
- **Todo video lleva voz** (Juan David, 3-nov): narración con la voz de la marca o la suya. Nada de reels solo con música y texto; los carruseles y las stories pueden ir sin voz.
- **Gameplay fluido:** las grabaciones de videojuegos y apps a 30 o 60 cps estables, sin cuadros repetidos ni tirones (revisar con `ffmpeg -vf mpdecimate`); cortar los tiempos muertos y acelerar los tramos de manejo.
- **Reciclar:** Contrappto usa el mismo MP4 vertical en Instagram, TikTok y LinkedIn; juanda y trifuerza.co van también al TikTok de trifuerza.co.
- **Todo sale de la inspiración que él mandó:** los pines y reels analizados (`referencias/pinterest-*.md`,
  `referencias/instagram-*.md`, `referencias/tableros*.md`, `docs/ESTILOS.md`). Antes de animar, escoger la referencia
  y escribir su ficha de movimiento (skill `video-artistico`).
- **Motion graphics de altísima calidad, con el contenido descargado:** packs de autor y del banco (`trabajo/assets`),
  nunca formas genéricas ni plantillas solas. El nivel es N01 v3 («super aprobado»).
- **Muy contextual:** el mundo visual sale del tema de cada video (la ciudad pixel de la pantalla de carga, la imprenta
  de las Constituciones, el grabado de Kafka). Nada de fondos o transiciones que podrían ir en cualquier video.
- **Nunca el mismo video dos veces:** cada pieza con su estilo, su composición y su ritmo. Una serie puede compartir
  una línea (paleta, tipografía, personaje), pero cada episodio cambia de escena y de movimiento.
- Carruseles y stories también: animados, con la metáfora de su tema; no una plantilla con texto cambiado.

## 7. Plantilla de cada guion
```
# Título · cuenta · formato · ~N s · cara (habla | cameo | no)
**Objetivo:** … **Serie:** … **CTA:** (de la tabla de arriba)
## Gancho: A (recomendado) · B · C
## Guion
| # | Voz | Imagen y movimiento |
(última fila: el CTA dicho y escrito)
**Pregunta para comentarios:** …
**Copy:** primera línea = el gancho; cierre = CTA + 5 hashtags del tema.
## Verificar
```

**Pronunciación de la marca en la voz clonada:** escribir «Contrapto» y «contrapto punto com» en el texto que va a
ElevenLabs; con «pp» la deletrea mal («contrapeto», «contrapicto»). Verificar la toma con whisper.
