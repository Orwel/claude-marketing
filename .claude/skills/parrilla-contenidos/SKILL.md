---
name: parrilla-contenidos
description: Arma, revisa o reorganiza la parrilla de contenidos de juanda.trifuerza, Trifuerza.co y Contrappto (Instagram y LinkedIn). Usar SIEMPRE que se pida revisar, reorganizar, mover o llenar la parrilla, programar reels, carruseles o stories, o cuando se mencione el artefacto «Parrilla» del mes. Incluye las reglas fijas: no repetir contenido y los reels como eje.
---

# Parrilla de contenidos

La parrilla del mes vive en un artefacto de claude.ai (por ejemplo «Parrilla Octubre 2026»,
https://claude.ai/artifact/VjdH2xKhm6sZLTWQ2VStnX). Las piezas están en `const D = {"filas":[…]}`
dentro del HTML. El estado de publicación (pendiente, programada, publicada…) está en la base del
artefacto, colección `publicaciones`. La clave es `fecha_hora_cuenta_red_pieza`, así que si mueves
una pieza ya marcada, se pierde su estado: muévela en la base también.

Los guiones y videos de los meses siguientes están en el artefacto «Videos Oct–Ene · Trifuerza».

## Antes de tocar nada

1. Lee el artefacto y la colección `publicaciones`.
2. Pregunta o anota qué ya se subió aunque no esté marcado. Lo que el usuario dice que ya publicó
   cuenta como publicado.

## Regla 1: no se repite contenido

- Cada pieza (mismo video, carrusel o story, aunque tenga otro título) sale **una sola vez por red**:
  una vez en Instagram y una vez en LinkedIn, en **una sola cuenta**.
- Pasar la misma pieza de Instagram a LinkedIn sí se vale: es otra red con otro público.
- Trifuerza.co y Contrappto **no reciclan** los reels de juanda en Instagram. Cada cuenta tiene su voz
  (ver «Voz por canal»), y los huecos se llenan con piezas propias, no con republicaciones.
- Lo que ya se publicó no vuelve a la parrilla, ni en otra cuenta ni en otra semana.
- Una story no se repite otro día.
- Cuidado también con repetir el **tema**: si ya salió un caso (por ejemplo, Mata contra Avianca, «seis
  sentencias»), no armes otra pieza que cuente lo mismo. Avísale al usuario.
- Única excepción: TikTok, que recicla el MP4 de Instagram. No va en esta parrilla.

Al terminar, comprueba que ninguna combinación (pieza, red) aparezca dos veces en `filas`.

## Regla 2: los reels son el eje

- Los reels de juanda.trifuerza son lo principal de la estrategia.
- Hay dos por semana: uno **abre la semana** (lunes a las 12:00; el martes si el lunes es festivo) y
  otro **la cierra** (sábado a las 12:00).
- Si hay más reels que espacios, el tercero va el jueves a las 12:00.
- **Todo lo planeado para el mes sale en ese mes.** Nunca pases piezas al mes siguiente: cada mes ya
  tiene sus propios planes. Si no caben, usa el jueves o reacomoda dentro del mismo mes.
- Un reel que sale después de la clase o el evento no puede llevar el CTA de inscribirse («Comenta
  CLASE»): hay que cambiarlo.

## Al reorganizar

- Si mueves una pieza, ponle una nota (`n`) que diga de dónde viene.
- Deja en el bloque «Antes de publicar» del artefacto qué salió de la parrilla y por qué.
- Antes de republicar, revisa la sintaxis del script con `node --check`.
- Republica sobre la misma URL.
