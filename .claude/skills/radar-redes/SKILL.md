---
name: radar-redes
description: Radar semanal de marketing — benchmarking de la competencia (qué les funciona y qué no), revisión de los tableros de Pinterest y referencias nuevas, análisis de lo que nos funcionó a nosotros (con pauta o sin pauta, si logró el objetivo de la campaña) y propuesta de los videos de la semana. Usar cuando se pida "haz el radar", "benchmarking de la competencia", "qué nos funcionó esta semana", "revisa los tableros", "qué videos hacemos esta semana", "cómo va la campaña", o cuando lo dispare la tarea programada de los lunes. NO usar para producir los videos (eso es video-artistico o producir-pieza) ni para publicar.
---

# Radar semanal de redes

Una vez por semana (tarea programada «Radar de redes», lunes 8:00) y cada vez que Juan David lo pida. Junta en un
solo reporte lo que hace la competencia, las referencias nuevas de sus tableros y lo que nos funcionó, contra el
**objetivo de la campaña**, y termina **siempre** con los videos que se proponen para la semana.

Antes de empezar: `docs/INSTAGRAM.md` (cómo recomienda Instagram, qué ayuda y qué castiga el alcance), `docs/SERIES.md` (series y **objetivo de cada cuenta**), `docs/ESTILOS.md`, `docs/TONO.md`, las entradas recientes de `docs/APRENDIZAJES.md` y el último
reporte en `docs/radar/`.

## Fuentes
| Qué | De dónde | Notas |
|---|---|---|
| Objetivo de la campaña y metas | `referencias/campana.json` | Si está vacío, preguntar antes de juzgar resultados. |
| Nuestras publicaciones | Metricool (plan Pro desde nov-2026): **todas las marcas** de `getBrandSettings` (juanda.trifuerza `7140789`, trifuerza.co y Contrappto cuando estén conectadas) y **todas sus redes** (instagram, tiktok, linkedin): `getAnalyticsDataByMetrics` con los conectores de publicaciones de cada red | Alcance, vistas, guardados, compartidos, comentarios, seguidores ganados. Una sección por marca y red. |
| Pauta | Metricool, red `metaAds` (conectores `campaigns`, `promoted reels`) | Separar orgánico de pautado: una pieza pautada no se compara con una orgánica. |
| Competencia | Metricool: `competitor reels`/`competitors` de instagram y los de tiktok si los hay | Las cuentas se agregan en Metricool → Competidores **de cada marca**. La lista y su porqué están en `referencias/competencia.json`. |
| Mejor hora | `getBestTimeToPostByNetwork` | Para la propuesta de la semana. |
| Tableros de Pinterest | `node src/archivo/tableros.mjs` | Detecta los pins nuevos por el RSS, baja a Drive `Referencias/<tablero>/` lo que Pinterest entrega sin sesión (en los pins con id `e1_…` solo la imagen) y los anota en `referencias/tableros-nuevos.md`. Para ver el **video o GIF** de un pin `e1_…`, abrirlo en el navegador integrado, leer el `<video>` o el GIF original y pasarlo por `referencia.mjs`. |
| Calendario | `calendario/AAAA-MM.json` | Qué se publicó y qué viene. |
| Bandeja del bot | `docs/bandeja/` (referencias, competidores, ideas) | Lo que Juan David mandó al bot de Telegram durante la semana. **Va primero**: cada referencia se analiza en el paso 1, cada competidor nuevo entra al paso 3 (y se le recuerda agregarlo en Metricool → Competidores) y cada idea se considera en el paso 5. Al usarla, marcar la línea con «✓ radar AAAA-MM-DD». |
| Metas | `referencias/campana.json` → `metas` de cada cuenta | Cada pieza y cada semana se comparan contra la meta; el reporte abre con «vamos X de Y». |
| Tendencias de TikTok | TikTok Creative Center (`ads.tiktok.com/business/creativecenter`): hashtags, canciones y videos en tendencia, región Colombia, últimos 7 días | Público y sin sesión. Leerlo con el navegador integrado o web-fetch; anotar los 5 hashtags y los 3 audios que encajen con cada cuenta. |
| Google Trends | `trends.google.com/trending?geo=CO` (búsquedas en tendencia, 7 días) y `trends.google.com/explore?geo=CO&date=now%207-d&q=<tema>` para comparar los temas de cada cuenta | Qué busca la gente esta semana en Colombia: subir los temas que crecen (contratos, arriendo, IA, apps, videojuegos, fechas). |
| Tendencias de LinkedIn | LinkedIn News del día (Colombia y Latinoamérica) y los posts con más reacciones de la semana sobre los temas de trifuerza.co y Contrappto | Para el tono profesional: qué discusión de la semana puede abrir un post de Technology, Academy o Contrappto. |

Antes de llamar a una métrica, confirmar su nombre con `getAnalyticsAvailableMetrics` (Metricool los cambia).

**Retención en reels de Instagram (5-nov-2026):** IGRE28 `reelsViewRate` es el % de vistas que pasó de 3 s, IGRE24 `averageWatchTime` es la vista promedio en segundos e IGRE21 son los compartidos. IGRE27 `retention` viene vacío en lo orgánico: el % del video visto se saca con IGRE24 dividido por la duración del MP4. IGRE20 `spend` > 0 marca lo pautado. Las columnas de la respuesta se leen por su metricName, no por el orden en que se pidieron. Las metas de cada pieza están en `docs/GUIONES.md` §1b, y cada radar compara contra ellas y contra `docs/radar/retencion-2026-11-05.md`.

## Pasos
1. **Tableros:** correr `tableros.mjs`. Para cada pin nuevo, mirar la hoja (`…-analisis/hoja.png`) y anotar en
   `referencias/pinterest-<AAAA-MM>.md` qué técnica trae y para qué estilo o marca sirve. Si es un estilo nuevo, agregar
   su ficha en `docs/ESTILOS.md` (regla de la skill `video-artistico`).
2. **Nosotros (últimos 7 días y acumulado del mes):** por pieza, alcance, retención/vistas, guardados + compartidos por
   cada mil alcanzados (la «señal»), comentarios y seguidores. Marcar **con pauta / sin pauta**. Comparar contra la
   mediana de la cuenta y contra **el objetivo de su cuenta y de la pieza** (`o` en el calendario; juanda = seguidores,
   Academy = vender cursos, Technology = vender servicios, Contrappto = uso de la app; ver `docs/SERIES.md`): ¿cumplió?, ¿por qué sí o por qué no (gancho, estilo, hora,
   tema)? Lo que supere la mediana en alcance **y** señal se marca «pautar».
3. **Competencia:** reels de la semana de cada competidor; los que superen 2× la mediana de su cuenta son «lo que les
   funciona». Para cada uno: formato, gancho, duración, estilo, CTA. Si hace falta verlo, abrir el reel con el embed
   público (`instagram.com/p/<código>/embed/captioned/`) en el navegador y pasarlo por `src/archivo/referencia.mjs`.
   Nunca se nombra a un competidor en nuestras piezas; el reporte es interno.
3b. **Coyuntura y fechas:** revisar `docs/FECHAS-COLOMBIA.md` (lo que cae en las próximas dos semanas) y las noticias
   de la semana en las fuentes de esa página. Cruzarlo con TikTok Creative Center, Google Trends (Colombia) y LinkedIn
   News: una tendencia sirve si cruza con el tema de una cuenta y se puede producir en 24–48 h. Lo que encaje va como
   video de la serie 7 (Coyuntura) en la propuesta, con la fuente enlazada; lo urgente se le avisa a Juan David el mismo día.
3c. **Pauta propuesta (siempre, sección «## Pauta propuesta»):** una tabla por marca (juanda.trifuerza, trifuerza.co
   —Academy y Technology—, Contrappto) y por red (Instagram/Facebook con Meta Ads, TikTok Ads, LinkedIn Ads), con lo
   marcado «pautar» en el paso 2 y lo que sale la semana siguiente. Cada fila: pieza, red, **objetivo** (seguidores →
   visitas al perfil; Academy → inscritos/visitas a la página del curso; Technology → mensajes para cotizar;
   Contrappto → visitas a contrappto.com), **monto en COP y días**, **segmentación** (país/ciudades, edad, intereses o
   cargos/industrias en LinkedIn, públicos similares o de quienes vieron el video), el llamado y el criterio para
   seguir o cortar (costo por resultado de la semana anterior, si ya hay datos de Meta Ads en Metricool). El monto sale
   de la analítica: más a lo que superó la mediana en alcance y señal, nada a lo que no la superó. Cerrar con el total
   de la semana. Nunca se lanza sin el «sí» de Juan David con el monto; lo ya publicado se promociona desde
   Instagram/Meta Ads o el conector de pauta, no desde Metricool.
4. **Conclusiones:** tres aprendizajes de la semana (qué repetir, qué dejar, qué probar), con la evidencia.
5. **Propuesta de videos (siempre):** 3 a 5 videos para la semana, cada uno con cuenta, **serie**, objetivo de la cuenta al que
   apunta, idea y gancho, estilo del catálogo (o referencia nueva), si lleva cara o voz clonada, día y hora sugeridos,
   y si conviene pautarlo. Uno debe repetir lo que mejor funcionó; otro debe probar algo nuevo.
6. **Entregar:** `docs/radar/AAAA-MM-DD.md` y un PDF corto en Drive `Redes sociales/Radar/Radar AAAA-MM-DD.pdf` (para
   leer desde el celular). Avisar con el resumen: lo que funcionó, lo que no y los videos propuestos.
7. **Memoria:** lo que se confirme varias semanas seguidas (un formato que siempre gana, una hora que no sirve) va a
   `docs/APRENDIZAJES.md` y a `docs/ESTILOS.md`.

## Reglas
- Ningún número inventado: si una métrica no está, se dice que falta.
- Comparar peras con peras: orgánico con orgánico, reel con reel, misma cuenta.
- Una pieza con menos de 72 h no se juzga.
- El radar no publica ni programa: propone. Lo aprobado lo programa la sesión principal en Metricool (desde nov-2026).
