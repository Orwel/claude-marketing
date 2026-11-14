# Licitaciones de tecnología en el SECOP

`src/radar/secop.mjs` consulta los datos abiertos oficiales del SECOP I (`f789-7hwg`) y del SECOP II (`p6dx-8zbt`)
en datos.gov.co. No es scraping: es la API pública de Colombia Compra Eficiente, sin clave ni costo. Los datos
llegan con 1 o 2 días de retraso frente a la plataforma, así que fechas y pliegos se confirman en la ficha del proceso.

## Uso

```
npm run secop                                  tecnología e IA, últimos 30 días, desde $20 millones
npm run secop -- inteligencia artificial       por palabras (se buscan juntas, como frase)
npm run secop -- ia --dias 60 --min 50000000
npm run secop -- chatbot --todas               incluye contratación directa y persona natural
npm run secop -- ia --telegram                 además lo manda al tema «Licitaciones SECOP»
```

Desde el celular: escríbele al bot `/secop inteligencia artificial` (lo atiende la bandeja en ≤ 30 min).

Qué filtra: solo procesos abiertos y con fecha de ofertas vigente; quita la contratación directa y los servicios de
persona natural (contratos ya amarrados a alguien). Ordena primero lo que Trifuerza sí hace (IA, desarrollo,
asistentes, datos, plataformas) y dentro de eso lo de mayor valor; las compras de licencias y equipos bajan.

`vistos.json` es la memoria del aviso diario (`--nuevos`): qué procesos ya se mandaron. Se limpia sola a los 90 días.

## Tarea diaria (opcional; hoy se usa a solicitud con /secop)

En la app de Claude → Tareas programadas → nueva, «Licitaciones SECOP (Telegram)», de lunes a viernes a las 7:40
(cron `40 7 * * 1-5`), con este texto:

```
Trabaja en el repo C:\Users\User\Documents\Proyectos\claude-mk (en español). Tarea corta y silenciosa.
1. Corre: node --use-system-ca src/radar/secop.mjs --nuevos --telegram --max 20
   Manda al tema «Licitaciones SECOP» los procesos de tecnología e IA nuevos. Si no hay nada nuevo, no manda nada.
2. Si falla por red o porque datos.gov.co no responde, reintenta una vez a los 2 minutos. Si vuelve a fallar, avisa con
   node --use-system-ca src/radar/telegram.mjs --tema licitaciones --texto "Hoy no pude consultar el SECOP: <error corto>"
3. No hagas commit, no edites código, no hagas nada más.
```
