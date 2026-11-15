# Vigías: alertas de licitaciones y oportunidades

Juan David no quiere perderse otra mínima cuantía como la de Villavieja (abrió el 9-nov y cerró el 13-nov). Por eso
hay dos vigías que **solo escriben cuando hay algo nuevo**.

| Vigía | Qué mira | Cuándo | Dónde corre | Gasta suscripción |
|---|---|---|---|---|
| Licitaciones SECOP | SECOP I y II (datos abiertos), en tres perfiles: 💻 tecnología e IA, ⚖️ servicios jurídicos y 🎓 capacitaciones. Procesos de los últimos 4 días, desde $5 millones, con puntaje ≥ 2 | cada 2 h, de 6 a.m. a 10 p.m. (pg_cron `bot-vigia-secop`) | función `telegram-bot?tarea=vigia` en Supabase Trifuerza | no |
| Oportunidades | Cada tema de `bot.vigilancias`: iNNpulsa, MinCiencias, MinTIC, MinCulturas (Estímulos 2027), Fondo Emprender, Bogotá, Latam e internacional, licitaciones privadas (Ecopetrol, EPM, ISA, Bancolombia…), capacitación en IA para entidades | lunes a viernes, 7 a.m. | rutina «Vigía de oportunidades (Telegram)» `trig_01FqEVanfJ3ykgNiN2cjC6XX` | sí (1 ejecución al día) |

**Desde Telegram:**
- `/secop juridico` y `/secop capacitacion` buscan en esos perfiles; `/secop` solo es tecnología.
- `/vigila <tema>` agrega algo a vigilar. Ejemplos: `/vigila licitaciones privadas Grupo Sura software`, `/vigila Estímulos 2027 videojuegos`.
- `/vigilancias` muestra la lista con números y `/olvida <número>` quita un tema.

Memoria para no repetir: `bot.vistos` (procesos del SECOP ya avisados) y `bot.oportunidades_vistas` (convocatorias ya avisadas).
Los lunes la rutina además recuerda lo que cierra esa semana.

**Límites:**
- Los datos abiertos del SECOP llegan con 1 o 2 días de retraso y a veces datos.gov.co recarga la base: el 15-nov-2026
  el SECOP II quedó un tiempo con solo 1.000 filas viejas. Lo más rápido son las **alertas propias del SECOP II por
  códigos UNSPSC**, que se configuran en la cuenta de proveedor y llegan por correo.
- Muchas licitaciones privadas se publican en portales de proveedores con registro (Ariba, portales propios). La rutina
  encuentra las que salen en abierto. Para las demás conviene registrarse en esos portales como proveedor.
