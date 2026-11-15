# Escucha del bot en el PC (respuesta inmediata)

La rutina de la nube revisaba el bot cada 30 minutos, y nunca se llegó a crear: los mensajes se quedaban horas sin
respuesta. Ahora `src/radar/escucha.mjs` corre en el PC y contesta apenas llega algo.

| Qué le pides | Cuánto tarda | Quién responde |
|---|---|---|
| Menú, /secop, /mercados, /analiza, /oportunidades (edición guardada), /meta, /avance, /caja | segundos | scripts de `src/radar` |
| /semana, /marketing, /estrategia, /finanzas, /entorno, /tendencias, /aprende, preguntas, links, fotos | 1–3 minutos (avisa «lo estoy preparando») | Claude Code en modo no interactivo, con las reglas de `docs/bandeja/RUTINA.md` |

## Requisitos
- **Claude Code con la sesión iniciada en el PC.** Abre una terminal, escribe `claude`, luego `/login` y sigue los pasos.
  Si la sesión vence, el bot lo avisa en el chat.
- **El PC encendido.** Apagado no responde; los mensajes esperan en Telegram hasta 24 horas.

## Encenderlo
- A mano: `npm run bot` (deja la ventana abierta).
- Automático al iniciar Windows: `npm run bot-arranque`. Instala `src/radar/arranque.vbs` en la carpeta Inicio y corre
  oculto, sin ventana. Para quitarlo, borra «escucha-bot.vbs» de `shell:startup`.
- Registro: `trabajo/escucha.log`. Solo puede haber un escucha a la vez (`trabajo/escucha.pid`).

## El menú
Los botones van dentro del mensaje, no fijos abajo: escribe «menú», «hola» o /menu y aparecen. Cada botón dice qué
hace, y las secciones son 🧭 Dirección, 🏛️ Plata y Estado y 📈 MBA y mercados. Se definen en `src/radar/menu.mjs`.
