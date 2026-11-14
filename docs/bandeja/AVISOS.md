# Avisos automáticos separados por temas

Antes todo llegaba revuelto al chat privado del bot (@radar_trifuerza_bot), el mismo donde Juan David le escribe a la
bandeja. Ahora cada aviso automático tiene su tema en un grupo de Telegram, y el chat privado queda para conversar.

| Tema | Qué llega | Quién lo manda |
|---|---|---|
| Noticias del día | Tecnología, política y economía de la mañana | tarea «Noticias del día» |
| Radar de redes | Conclusiones, videos propuestos y pauta del lunes | tarea «Radar de redes (lunes)» |
| Publicaciones | Qué salió o falló en Metricool | tarea «Avisos de publicación» |
| Convocatorias y concursos | Fondos, concursos y aceleradoras (tecnología, videojuegos, innovación) | comando `/oportunidades` |
| Licitaciones SECOP | Procesos de tecnología e IA abiertos en el SECOP I y II | comando `/secop` |
| Mercados y MBA | Foto del día y fichas fundamentales | comandos `/mercados` y `/analiza` |

Oportunidades, SECOP y mercados llegan **solo cuando se piden** desde el menú del bot (tocar «/»), para no saturar.
Si algún día se quieren automáticos, los textos de las tareas están en `docs/licitaciones/README.md` y
`docs/convocatorias/README.md`.

Mientras el grupo no exista, cada aviso llega al chat privado con su etiqueta al inicio (📰, 📡, 📣, 💰, 🏛️, 📈): ya se
distinguen, solo que no están en carpetas separadas.

## Cómo armar el grupo (5 minutos, una sola vez)

1. En Telegram: **Nuevo grupo** → llámalo «Avisos Trifuerza» → agrega a @radar_trifuerza_bot.
2. Ajustes del grupo → **Temas**: enciéndelo.
3. Ajustes del grupo → **Administradores** → agrega al bot con el permiso **Gestionar temas**.
4. En el grupo escribe `/start@radar_trifuerza_bot` y enseguida, en el PC:
   ```
   npm run telegram -- --chat-id
   ```
   Copia la línea `TELEGRAM_GRUPO_ID=-100…` al `.env`. Si no sale el grupo, la rutina de la bandeja se llevó el
   mensaje: escribe otra vez en el grupo y repite el comando de inmediato.
5. Crea los temas (el bot los arma y anota sus números en el `.env`):
   ```
   npm run telegram -- --crear-temas
   ```
6. Copia `TELEGRAM_GRUPO_ID` y las seis `TELEGRAM_TEMA_…` también en las variables del entorno de la nube
   (claude.ai/code → entorno Default), para que las rutinas de la nube manden a los mismos temas.

Prueba: `npm run telegram -- --tema licitaciones --texto "Prueba del tema SECOP"`.

## Notas

- El bot ignora todo lo que se escriba en el grupo: la bandeja solo lee el chat privado de Juan David.
- Si se borra un tema en Telegram, ese aviso vuelve a caer en el chat privado con su etiqueta (no se pierde).
- El código está en `src/radar/tg.mjs` (envío y temas), `src/radar/telegram.mjs` (comando) y `src/radar/secop.mjs`.
