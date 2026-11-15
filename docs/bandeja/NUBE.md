# Bot siempre prendido (Supabase de Trifuerza)

Desde el 15-nov-2026 el bot de Telegram responde desde una Edge Function en el proyecto **Trifuerza** de Supabase,
aunque el PC esté apagado. Telegram le avisa cada mensaje por webhook y la función contesta al instante.

| Pieza | Dónde |
|---|---|
| Código | `supabase/functions/telegram-bot/index.ts` (se despliega con el conector de Supabase o la CLI) |
| Datos | esquema `bot` del proyecto Trifuerza: metas, finanzas, ediciones de oportunidades, mensajes, lecciones. No está expuesto a la API pública |
| Secretos | Supabase → Edge Functions → Secrets: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET` y, opcional, `ANTHROPIC_API_KEY` |
| Conexión con Telegram | `npm run bot-nube` (registrar), `-- --estado` (ver errores), `-- --quitar` (volver al modo PC) |

Qué responde sin IA: el menú, /secop, /mercados, /analiza, /oportunidades (edición guardada), /meta, /avance, /caja.
Qué necesita `ANTHROPIC_API_KEY`: /semana, /marketing, /estrategia, /finanzas, /entorno, /tendencias, /aprende y preguntas libres.

Para publicar una edición nueva de oportunidades se inserta en `bot.ediciones` (tema `general`, `videojuegos`, etc.).
El escucha del PC (`npm run bot`, `ESCUCHA.md`) queda como respaldo: solo funciona si se quita el webhook, porque
Telegram no deja usar las dos formas al tiempo.

También existe la función `legal-telegram-webhook` en el mismo proyecto: es otro bot (Trifuerza Legal) y no se toca.
