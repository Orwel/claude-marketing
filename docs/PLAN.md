# Plan de trabajo

Cada entrega termina con videos reales renderizados y validados, no con código a medias.

## Entrega 1 · Estructura y Animado ✅
- Tres capas (marcas, piezas, plantillas) y Drive por mes.
- Plantilla Animado: gancho, frase, línea de tiempo, dato con cifra, celular con aviso, pasos y cierre.
- "La fecha que cuesta plata" en Contrappto y juanda, y promocional de Contrappto.

## Entrega 2 · Vertical con tu metraje (antes del 13 de octubre)
Es lo que más rinde: tu cara con producción automática.
1. Leer los crudos de `videos grabados` del mes.
2. Transcribir con **Whisper local** (whisper.cpp) con tiempos por palabra.
3. Casar tomas con las 6 líneas del guion; si dices "otra", se descarta la toma anterior.
4. Quitar silencios y armar el corte.
5. Gancho, subtítulos quemados con el estilo de la marca y cierre.
6. Mismo corte en cada cuenta, con primer segundo, copy y CTA distintos.

Hace falta de ti: ruta local exacta de Drive y un video de prueba grabado en el celular.

## Entrega 3 · Carrusel
- Pasar a Remotion el prototipo "Qué sí se registra y qué no" (7 láminas, 1080x1350, `renderStill`).
- Hace falta de ti: los archivos `carrusel.json`, `render.mjs`, `marcas.mjs`, `pieza-arriendo.json` y
  `fotogramas.mjs`. Están en una carpeta temporal de tu PC que esta sesión en la nube no alcanza a leer:
  súbelos a Drive o al repo.

## Entrega 4 · DemoApp (Contrappto en YouTube)
- Grabación de pantalla de Contrappto dentro del marco de celular o navegador (el `Celular` ya existe).
- Zooms, señalamientos y textos por marca de tiempo desde el JSON de la pieza.
- Horizontal 16:9 para YouTube y cortes verticales de 30 s para tiendas y Reels.
- **Voz**: tu voz grabada con el micrófono de solapa (no sintética). Whisper saca los subtítulos.

## Entrega 5 · Clase (Trifuerza Academy y temas para clientes de Trifuerza)
- Tú en una esquina + diapositivas o pantalla, rótulos y portadas de capítulo, estilo Platzi.
- De cada clase, 3 o 4 verticales derivados.
- Hace falta de ti: la marca de Academy y la de trifuerza.co.

## Entrega 6 · Analítica (por decidir)
Sin publicación automática, la analítica solo lee.
- **Recomendación: Metricool.** Ya está en tu plan como programador, cubre Instagram, TikTok, LinkedIn y
  YouTube en un solo panel, mide aunque publiques a mano y tiene API para traer los números aquí.
- Alternativa sin terceros: las APIs oficiales de cada red (más trabajo, una integración por red).
- Lo que se haría aquí: un reporte mensual por pieza y cuenta para la revisión del día 30 de la parrilla.

## Pendientes tuyos
- Verificar los datos jurídicos de `piezas/2026-10/*.json` (`verificar[]`).
- Confirmar colores derivados de juanda y definir academy y trifuerza.co.
- Elegir herramienta de analítica.
