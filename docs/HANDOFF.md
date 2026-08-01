# Spec de traspaso — claude-marketing

> Pega este documento al arrancar un chat nuevo y di "continúa sobre este repo".
> Contiene todo lo necesario para retomar sin contexto previo.

---

## 1. Qué es el proyecto

Un agente de marketing para Instagram que **aprende de sus propias métricas**.

No es un programador de publicaciones. La diferencia está en que cada guion se
escribe sabiendo cómo rindieron los anteriores, y la estrategia se ajusta sola
con la evidencia.

### El flujo diario

```
  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  │   1. MEDIR          Instagram Graph API v22                  │
  │      métricas de publicaciones con +24h de vida              │
  │                          │                                   │
  │                          ▼                                   │
  │   2. APRENDER       Claude analiza qué funcionó               │
  │      → escribe en historial.aprendizajes                     │
  │      → repriorija data/tipos-video.json                      │
  │                          │                                   │
  │                          ▼                                   │
  │   3. PLANIFICAR     Claude escribe el guion de hoy            │
  │      leyendo los aprendizajes acumulados                     │
  │                          │                                   │
  │                          ▼                                   │
  │      [ humano graba el video ]  ← único paso manual           │
  │                          │                                   │
  │                          ▼                                   │
  │   4. PUBLICAR       Blotato /v2/media → /v2/posts             │
  │                          │                                   │
  └──────────────────────────┘  (al día siguiente vuelve a 1)
```

El orden de `medir → aprender → planificar` **no es arbitrario**. Si se
planificara antes de aprender, el guion de hoy se escribiría sin los datos de
ayer y el bucle no cerraría. Está así en `src/flujo/diario.js`.

---

## 2. Decisiones ya tomadas (no re-litigar)

| Decisión | Motivo |
|---|---|
| **Blotato como tercero para publicar** | Una sola API para varias plataformas. Nosotros nunca vemos las credenciales de Instagram: Blotato guarda el token OAuth y solo referenciamos su `accountId`. |
| **Solo vías oficiales** | Nada de automatización de navegador ni credenciales de usuario. Blotato conecta por OAuth; las métricas vienen de la Graph API oficial. Esto es una restricción dura, no una preferencia. |
| **Publicar por Blotato, medir por Graph API directa** | Blotato no expone insights con el detalle que necesita el bucle de aprendizaje (retención, guardados, tiempo medio visto). |
| **Tipos de video en JSON, no en código** | `data/tipos-video.json` lo edita el humano *y* lo edita el agente (repriorización). Si estuviera en código, el agente no podría ajustarlo. |
| **Modelo: `claude-opus-5`** | Adaptive thinking + structured outputs. Ver §4 para los detalles de API. |
| **Estado en JSON plano, sin base de datos** | Volumen de una publicación al día. El historial debe poder auditarse a ojo para ver qué está aprendiendo el agente. |
| **`SIMULAR=true` por defecto** | Publicar es irreversible. Hay que optar explícitamente por publicar de verdad. |

---

## 3. Estructura y responsabilidad de cada archivo

```
claude-marketing/
├── package.json               Node ESM ("type": "module"), Node >=20
├── .env.example               Plantilla de credenciales (copiar a .env)
├── .gitignore
│
├── docs/
│   └── HANDOFF.md             Este documento
│
├── data/
│   ├── marca.json             Identidad, público, tono, objetivo. Lo rellena el humano.
│   ├── tipos-video.json       Catálogo de formatos. Lo edita el humano Y el agente.
│   └── historial.json         Estado del agente (se genera solo, está en .gitignore)
│
├── scripts/
│   └── probar-conexiones.js   Verifica credenciales una por una. Ejecutar primero.
│
└── src/
    ├── index.js               CLI: diario | planificar | publicar | medir | aprender
    ├── config.js              Carga .env sin dependencias + exigir() valida por etapa
    │
    ├── flujo/                 Las cuatro etapas
    │   ├── diario.js          Orquesta medir → aprender → planificar
    │   ├── planificar.js      Genera y valida el guion del día
    │   ├── publicar.js        Sube el medio y publica (respeta SIMULAR)
    │   ├── medir.js           Recoge insights de publicaciones con +24h
    │   └── aprender.js        ★ El núcleo. Analiza y repriorija tipos.
    │
    ├── ia/
    │   ├── cliente.js         Wrapper de la API de Anthropic. Ver §4.
    │   ├── esquemas.js        Esquemas JSON para structured outputs
    │   ├── generar-guion.js   Prompt de planificación
    │   └── analizar-metricas.js  Prompt de análisis
    │
    ├── blotato/
    │   ├── cliente.js         Auth (header blotato-api-key) + reintentos
    │   ├── cuentas.js         GET /v2/accounts
    │   ├── media.js           POST /v2/media
    │   └── posts.js           POST /v2/posts + componerTexto()
    │
    ├── instagram/
    │   ├── cliente.js         Graph API, solo lectura
    │   └── insights.js        Métricas de reels + tasas derivadas
    │
    ├── video/
    │   └── validar.js         Requisitos de Reels (9:16, 5–90s, ≤300MB)
    │
    └── util/
        ├── log.js             Logging con color y hora
        ├── almacen.js         Lectura/escritura de historial.json
        └── reintentos.js      Backoff exponencial + ErrorHttp + pedirJson
```

---

## 4. Detalles técnicos verificados (no reinventar)

### API de Anthropic — lo que es fácil equivocar

Implementado en `src/ia/cliente.js`. Estos cuatro puntos son la fuente habitual
de errores 400:

```js
{
  model: 'claude-opus-5',
  thinking: { type: 'adaptive' },        // ✓ adaptive thinking
  output_config: {
    effort: 'high',                       // low|medium|high|xhigh|max
    format: { type: 'json_schema', schema } // ✓ anidado en output_config
  }
  // ✗ NADA de temperature / top_p / top_k  → 400 en Opus 5
  // ✗ NADA de budget_tokens                → 400 en Opus 5
  // ✗ NO usar output_format de nivel superior (obsoleto)
}
```

Además:

- **`thinking` está activo por defecto** en Opus 5. `max_tokens` limita
  pensamiento + respuesta juntos, así que hay que dar holgura.
- **Comprobar `stop_reason` antes de leer `content[0]`.** Una negativa por
  seguridad llega como HTTP 200 con `stop_reason: 'refusal'` y `content` vacío.
  `cliente.js` ya lo maneja.
- **Restricciones de los esquemas JSON:** todo objeto necesita
  `additionalProperties: false`, `required` debe listar *todas* las
  propiedades (no hay opcionales), y no se admiten `minimum`/`maxLength`/
  esquemas recursivos. Eso se valida en código, no en el esquema.
- Sin prefill del turno de assistant (devuelve 400 en Opus 5).

### Blotato

Base: `https://backend.blotato.com` · Header: `blotato-api-key: <clave>`

| Endpoint | Uso |
|---|---|
| `GET /v2/accounts` | Descubrir el `accountId` de la cuenta de Instagram conectada |
| `POST /v2/media` | `{url}` → devuelve `{url}` alojada. **Blotato descarga desde esa URL**, así que tiene que ser pública. Un fichero local no sirve. |
| `POST /v2/posts` | `{post: {accountId, target: {targetType}, content: {platform, text, mediaUrls}}, scheduledTime?}` |

Orden obligatorio: primero `/v2/media`, luego `/v2/posts` con la URL alojada.

### Instagram Graph API v22

Cuenta profesional (Business o Creator) + página de Facebook. Token de larga
duración con `instagram_basic` + `instagram_manage_insights`.

**Trampa de v22:** `plays` e `impressions` fueron retirados para reels. Ahora
son `views` y `reach`. Si sale "métrica desconocida", es casi siempre esto.

Métricas que se piden: `views`, `reach`, `likes`, `comments`, `shares`,
`saved`, `total_interactions`, `ig_reels_avg_watch_time`,
`ig_reels_video_view_total_time`.

Sobre esas, `insights.js` deriva las **tasas**, que son lo que de verdad se
compara entre publicaciones: `tasaInteraccion`, `tasaGuardado`,
`tasaCompartido`, `segundosMediosVistos`.

Para casar una publicación nuestra con el medio de Instagram se compara el
inicio del caption (Blotato no siempre devuelve el id nativo).

### Requisitos de Reels

9:16 (1080×1920) · 5–90 segundos · mp4 o mov · ≤300 MB · caption ≤2200 caracteres
· ≤30 hashtags. Todo en `src/video/validar.js`.

---

## 5. El bucle de mejora, paso a paso

Esto es lo más importante del proyecto. Está en `src/flujo/aprender.js`.

1. **Se leen todas las publicaciones con métricas** del historial.
2. **Claude las analiza** (`analizar-metricas.js`) con un prompt que le exige
   honestidad estadística: un patrón con menos de 5 publicaciones comparables
   se marca con confianza `baja`, y "no sabemos todavía" es una respuesta
   válida y preferible a inventar un patrón.
3. **El análisis se guarda** en `historial.aprendizajes`.
4. **Se repriorizan los tipos de video** en `data/tipos-video.json`:
   - Lo que funciona sube de `peso` (+2 el primero, +1 el resto, máximo 10).
   - Un tipo desactivado que vuelve a funcionar se reactiva.
   - Lo que no funciona se desactiva **solo tras ≥3 intentos**. Con menos no
     hay señal suficiente; el código lo bloquea y lo dice en el log.
5. **La siguiente planificación lee esos aprendizajes** como contexto de
   entrada (`generar-guion.js` los inyecta en el prompt), y el prompt le dice
   explícitamente que los datos mandan sobre su intuición.

El cierre del bucle son los pasos 3→5. Sin ellos esto sería solo un generador
de guiones.

---

## 6. Credenciales y comandos

### `.env` (copiar de `.env.example`)

| Variable | De dónde sale |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → Settings → API Keys |
| `MODELO_IA` | Por defecto `claude-opus-5` |
| `ESFUERZO_IA` | `low`\|`medium`\|`high`\|`xhigh`\|`max`. Por defecto `high` |
| `BLOTATO_API_KEY` | my.blotato.com → Settings → API |
| `BLOTATO_ACCOUNT_ID_INSTAGRAM` | Sale de `npm run probar` |
| `IG_ACCESS_TOKEN` | App de Meta, token de larga duración |
| `IG_USER_ID` | Id de la cuenta profesional (no el @usuario) |
| `SIMULAR` | `true` mientras pruebas. `false` para publicar de verdad |

### Comandos

```bash
npm install
cp .env.example .env      # y rellenarlo
npm run probar            # verifica cada integración por separado

npm run planificar        # genera el guion de hoy
npm run publicar -- --id <id> --video <URL pública>
npm run medir             # métricas de publicaciones con +24h
npm run aprender          # analiza y ajusta la estrategia

npm run diario            # el ciclo completo: medir → aprender → planificar
```

---

## 7. Estado actual y TODOs priorizados

### Lo que funciona

- Las cuatro etapas del flujo, completas y encadenadas.
- Integración con Anthropic (structured outputs + adaptive thinking).
- Integración con Blotato (accounts, media, posts).
- Integración con Instagram Insights v22 + tasas derivadas.
- Bucle de aprendizaje con repriorización automática de tipos.
- Validación de requisitos de Reels antes de publicar.
- Modo simulación.

### Lo que falta, por prioridad

1. **Rellenar `data/marca.json`.** Nada tiene sentido hasta que la marca esté
   definida de verdad. `npm run probar` falla a propósito si sigue la
   plantilla.
2. **Adaptar `data/tipos-video.json` al nicho.** Los siete tipos actuales son
   genéricos y funcionan, pero los específicos del nicho rinden mejor.
3. **Producción del video: sigue siendo manual.** Es el único paso humano del
   flujo. Opciones a evaluar: generación con IA, plantillas, o dejarlo manual
   a propósito (para ciertas marcas la cara del humano *es* el producto).
4. **Validar el fichero de video con ffprobe.** `validarMedio()` en
   `video/validar.js` ya tiene la forma; falta enchufarle la lectura real del
   fichero.
5. **Programar el `npm run diario`** con cron o similar.
6. **Multiplataforma.** Blotato ya soporta TikTok, YouTube, LinkedIn. Cambiar
   `targetType` en `blotato/posts.js` y añadir los insights de cada una.
7. **Umbral mínimo antes de repriorizar.** Ahora se analiza desde la primera
   publicación (con aviso de confianza baja). Considerar no repriorizar hasta
   tener 5+.

---

## 8. Reglas del proyecto para el chat nuevo

- **Node ESM.** `"type": "module"`. `import`/`export`, nunca `require`.
  `__dirname` no existe: usar `fileURLToPath(import.meta.url)`.
- **Todo en español**: nombres de variables, funciones, comentarios, logs y
  mensajes de error. Es deliberado, mantenlo.
- **Sin dependencias más allá del SDK de Anthropic.** `.env`, HTTP y
  almacenamiento están resueltos con Node puro. No añadas `dotenv`, `axios` ni
  un ORM sin una razón concreta.
- **Antes de tocar la API de Anthropic, lee §4.** Los cuatro errores de 400 son
  fáciles de reintroducir.
- **Dónde está el valor:** en `src/flujo/aprender.js` y en los prompts de
  `src/ia/`. La fontanería de Blotato e Instagram es sustituible; el bucle de
  aprendizaje es el producto. Si hay que elegir dónde invertir esfuerzo, es
  ahí.
- **Los comentarios explican el *porqué*, no el *qué*.** Sigue ese estilo.
