# Oportunidades: convocatorias, fondos y concursos para Trifuerza y Juan David

Una edición por semana en `AAAA-MM-DD.md`, que llega al tema «Convocatorias y concursos» de Telegram.
Desde el celular, `/oportunidades` pide la última edición; `/oportunidades videojuegos` (o legaltech, edtech, IA,
cooperación…) hace una búsqueda nueva sobre ese tema. Nada llega solo todos los días, para no saturar.

Alcance: apoyos públicos y privados para **tecnología, IA, videojuegos e interactivos, legaltech, edtech e innovación**,
en Colombia, Latinoamérica y el mundo. Vale tanto lo que pide Trifuerza (SAS) como lo que puede pedir Juan David
como persona natural (becas, fellowships, estímulos culturales para videojuegos, premios). Cada ítem dice quién lo pide.

## Reglas
- Solo dinero o algo de valor parecido: subvención, premio, capital o créditos de nube grandes. Nada de deuda comercial ni de «visibilidad».
- Debe estar abierta hoy o abrir en las próximas 8 semanas, y la debe poder pedir una SAS colombiana pequeña (Technology, Legal/Contrappto, Academy) o Juan David como persona natural.
- Toda fecha y todo monto salen de la página oficial o de prensa con fecha del año en curso. Si el cierre no aparece: «cierre sin confirmar». Nunca se inventa.
- Cada ítem lleva la línea de Trifuerza, qué da, cuándo cierra, un «Ojo» con el requisito que la puede dejar por fuera y el enlace oficial.
- No se repite lo que ya salió en ediciones anteriores, salvo que cambie la fecha o falte una semana para el cierre (recordatorio).

## Fuentes a vigilar
minciencias.gov.co/convocatorias/todas · innovamos.gov.co · convocatorias.innpulsacolombia.com (ALDEA+) · fondoemprender.com ·
bogota.gov.co/boletin-oferta-internacional (la mejor fuente semanal para Latam y el mundo) · desarrolloeconomico.gov.co · agenciaatenea.gov.co ·
ccb.org.co (Innovalab) · fundacionbolivardavivienda.org/convocatorias · eulacdigitalaccelerator.com · unicefventurefund.org/apply-funding ·
startupchile.org · aiforgood.itu.int · claude.com/programs/startups
Videojuegos: convocatorias de MinTIC (Crea Digital) · Programa Nacional de Estímulos del Ministerio de las Culturas · Idartes ·
unrealengine.com/megagrants · unity.com/social-impact · Google Play Indie Games · Ibermedia

## Tarea semanal (opcional; hoy se usa a solicitud con /oportunidades)
En la app de Claude → Tareas programadas → nueva, «Convocatorias (martes)», los martes a las 8:00 (cron `0 8 * * 2`):

```
Trabaja en el repo C:\Users\User\Documents\Proyectos\claude-mk (en español). Lee docs/convocatorias/README.md y la última edición de docs/convocatorias/.
1. Busca en internet convocatorias, fondos, concursos, aceleradoras y premios con dinero, en tres niveles (Colombia, Latam, mundo), siguiendo las reglas y las fuentes del README.
2. Escribe en texto plano, en máximo 3.500 caracteres, docs/convocatorias/AAAA-MM-DD.md con el formato de la edición anterior, ordenado por fecha de cierre. Si no hay nada nuevo, manda solo los recordatorios de lo que cierra en los próximos 7 días.
3. Mándalo con: node --use-system-ca src/radar/telegram.mjs --tema convocatorias --archivo docs/convocatorias/AAAA-MM-DD.md
4. No hagas commit. No te postules a nada ni llenes formularios.
```
