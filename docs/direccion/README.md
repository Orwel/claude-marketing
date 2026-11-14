# Tablero de dirección (bot de Telegram)

Cinco áreas, cada una con su comando. Responden solo cuando Juan David las pide (no se satura) y van al chat
privado del bot. Las atiende la rutina «Bandeja» (`docs/bandeja/RUTINA.md`), así que tardan hasta 30 minutos.
Cada respuesta cabe en un mensaje (máx. 3.500 caracteres), en texto plano, con fuentes y sin datos inventados.

| Comando | Área | De dónde sale | Qué responde |
|---|---|---|---|
| `/marketing` | Marketing | El último `docs/radar/AAAA-MM-DD.md`, `pauta-*.md`, `benchmarking-*.md` y `retencion-*.md`, más `docs/bandeja/ideas.md` | Cómo van las cuentas, qué pieza funcionó y por qué, qué hace la competencia y 3 videos para esta semana según `docs/LINEA-ESTRUCTURAL.md`. Si el radar tiene más de 8 días, lo dice. |
| `/estrategia` | Dirección estratégica | `docs/direccion/metas.md` | Para cada meta: va bien, en riesgo o atrasada (avance contra el tiempo que ha pasado), la decisión clave de la semana y qué dejar de hacer. Sin metas, guía para definir 3–5 medibles. |
| `/finanzas` | Finanzas | Notion (✨ Gastos e Ingresos 2026) si la rutina tiene el conector; si no, `docs/direccion/finanzas.md` | Ingresos, gastos, ahorro y los 3 gastos más grandes del mes, contra el mes anterior. Las finanzas de Trifuerza quedan pendientes hasta saber dónde se llevan. |
| `/entorno` | Entorno económico | Búsqueda web del día, `node src/radar/mercados.mjs` y la última `docs/noticias/` | PESTEL corto (global y Colombia): Fed, BanRep, dólar, inflación, regulación de IA y datos, y «qué le cambia» a Technology, Legal/Contrappto y Academy. |
| `/tendencias` | Innovación | Búsqueda web de la semana | 5 movimientos en IA, legaltech, edtech, govtech y videojuegos, con una idea concreta de cómo aprovechar cada uno. |
| `/semana` | Las cinco | Todo lo anterior, en corto | Comité de dirección de una página: una línea por área, las 3 decisiones de la semana y lo que cierra pronto (oportunidades, licitaciones). |

Relacionados: `/oportunidades` y `/secop` (innovación y Estado), `/mercados`, `/analiza` y `/aprende` (MBA).

Reglas:
- Ninguna cifra inventada. Si falta un dato, se dice qué falta y de dónde sale.
- Las ideas y recomendaciones de negocio son para Trifuerza. En inversión personal se enseña el método (skill `analisis-financiero`).
- Ningún cliente identificable ni competidor por nombre en algo que vaya a publicarse (en el chat privado sí se puede nombrar).
