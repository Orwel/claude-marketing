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
  │   2. APRENDER       la IA analiza qué funcionó                │
  │      → escribe en historial.aprendizajes                     │
  │      → repriorija data/tipos-video.json                      │
  │                          │                                   │
  │                          ▼                                   │
  │   3. PLANIFICAR     la IA escribe el guion de hoy             │
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
| **Modelo: Gemini** (`gemini-2.5-pro` por defecto) | Structured outputs + thinking. Se eligio porque es la clave que tiene el usuario. La capa de IA esta aislada en `src/ia/`: cambiar de proveedor toca dos archivos, `cliente.js` y `esquemas.js`. Ver §4. |
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
├── remotion/                  Proyecto Remotion (React)
│   ├── index.js               registerRoot
│   ├── Root.jsx               Composition 1080x1920, duracion desde props
│   ├── Reel.jsx               Gancho, subtitulos, fondos, metraje propio
│   └── public/                Assets por publicacion (gitignored)
│
├── salida/                    mp4 renderizados (gitignored)
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
    │   ├── cliente.js         Wrapper de la API de Gemini. Ver §4.
    │   ├── esquemas.js        Esquemas OpenAPI para structured outputs
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
    │   ├── producir.js        Orquesta voz + fondos + montaje Remotion
    │   ├── broll.js           Fondos con Veo / Imagen (caro)
    │   ├── stock.js           Fondos con Pexels (gratis)
    │   └── validar.js         Requisitos de Reels (9:16, 5–90s, ≤300MB)
    │
    ├── voz/
    │   └── elevenlabs.js      TTS con timestamps por caracter
    │
    ├── almacenamiento/
    │   └── subir.js           manual | supabase | r2 (S3 firmado a mano)
    │
    ├── hub/
    │   ├── servidor.js        Servidor http + auth por clave
    │   └── pagina.js          Interfaz de revision (movil primero)
    │
    └── util/
        ├── log.js             Logging con color y hora
        ├── almacen.js         Lectura/escritura de historial.json
        └── reintentos.js      Backoff exponencial + ErrorHttp + pedirJson
```

---

## 4. Detalles técnicos verificados (no reinventar)

### API de Gemini — lo que es fácil equivocar

Implementado en `src/ia/cliente.js`. Estos puntos son la fuente habitual de
errores:

```js
await ai.models.generateContent({
  model: 'gemini-2.5-pro',
  contents: prompt,
  config: {
    systemInstruction: sistema,              // ✓ el system va aquí, no como mensaje
    responseMimeType: 'application/json',    // ✓ OBLIGATORIO junto a responseSchema
    responseSchema: esquema,
    maxOutputTokens: 8000,
    thinkingConfig: { thinkingBudget: -1 },  // 2.5 → budget; 3 → thinkingLevel
  },
});
// el texto se lee de respuesta.text  (propiedad, NO función)
```

Además:

- **Sin `responseMimeType: 'application/json'`** el modelo devuelve el JSON
  envuelto en markdown y `JSON.parse` revienta. Es el error número uno.
- **`thinkingConfig` cambia de forma entre familias.** Gemini 2.5 usa
  `thinkingBudget` (`-1` = dinámico); Gemini 3 usa `thinkingLevel`
  (`low`/`medium`/`high`). Mandar el de la otra familia da error.
  `configuracionDeRazonamiento()` en `cliente.js` lo resuelve por el id del
  modelo: es el único sitio a tocar cuando salga una familia nueva.
- **Comprobar `finishReason` antes de parsear.** Un bloqueo por filtros de
  seguridad no lanza excepción: llega una respuesta válida con
  `finishReason` distinto de `STOP` y sin texto.
- **El esquema NO es JSON Schema completo**, es un subconjunto de OpenAPI 3.0:
  no admite `additionalProperties` (el SDK lo rechaza en validación local),
  ni esquemas recursivos. Los tipos se declaran con el enum `Type` del SDK.
- **`propertyOrdering` no es cosmético.** Define el orden en que el modelo
  genera los campos, y lo que se genera primero condiciona lo que viene
  después. Por eso `razonDelTipo` va antes que el contenido que justifica, y
  `evidencia` antes que `confianza`.
- **El modelo se comprueba contra la cuenta**, no se supone: `npm run probar`
  lista los modelos que la clave tiene disponibles y falla claro si el
  configurado no está.

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

## 4bis. Produccion de video — lo verificado

**Remotion**
- `browserExecutable` va en `selectComposition` **y** en `renderMedia`. Solo en
  la segunda, la primera intenta descargar Chrome igualmente.
- La duracion NO es fija: `calculateMetadata` la lee de las props, para que el
  video dure exactamente lo que dura la locucion.
- Licencia: gratis para individuos y empresas de ≤3 personas. **Trifuerza puede
  necesitar licencia de empresa** — revisar antes de produccion.

**ElevenLabs**
- `convertWithTimestamps`, no `convert`. Los tiempos por caracter son lo que
  permite subtitular palabra a palabra; sin ellos habria que repartir por
  numero de caracteres y cualquier pausa rompe la sincronia.
- Se agrupan caracteres en palabras en `agruparEnPalabras()`.

**Orden de la cadena**
La locucion va **primero**: su duracion real define la del video. Al reves
habria que estimarla y los subtitulos quedarian desincronizados.

**Modos de fondo**
`plantilla` (gratis, defecto) · `stock` (Pexels, gratis, uso comercial sin
atribucion) · `imagen` (Imagen) · `veo` (caro, minutos por escena).
Plantilla es el defecto porque cuando el contenido ES texto —una clausula, una
traduccion— un fondo generado detras del dato distrae en vez de sumar.

**Metraje propio (`--metraje`)**
Tu video es la capa base con su propio audio; Remotion solo superpone. No se
llama a ElevenLabs. El velo oscuro se aplica mas suave, porque uno fuerte
oscurece la cara, que es justo el valor de ese modo. `--desde N` recorta el
arranque.

---

## 4ter. Almacenamiento — por que existe

Blotato **descarga** el video desde una URL publica; no acepta subida directa.
Sin un sitio publico donde dejar el mp4 no hay publicacion automatica posible.

- **Google Drive NO sirve** para esto: los enlaces devuelven una pagina HTML
  del visor, no los bytes. Vale para archivo y revision, no como CDN.
- Modos: `manual` (defecto), `supabase` (bucket **publico**), `r2` (S3
  compatible, firma AWS v4 a mano para no arrastrar el SDK de AWS).

---

## 4quater. El hub de revision

`npm run hub` → http://localhost:4321

Existe porque la estrategia es "el agente produce, tu apruebas" y **en una
terminal no se puede ver un video**. Una revision incomoda no ocurre, y una
revision que no ocurre es peor que no tenerla: da falsa sensacion de control.

- Sin framework ni build: servidor http de Node + una pagina. Movil primero.
- Las acciones reutilizan las funciones de la CLI, sin duplicar logica.
- Sirve el mp4 con `Range` o el navegador no deja saltar dentro del video.
- **Auth**: sin `HUB_CLAVE` solo acepta trafico local. Con clave, por query,
  cabecera o cookie. El hub publica en Instagram: exponerlo sin clave es un
  agujero, no un detalle.

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
| `GEMINI_API_KEY` | aistudio.google.com/apikey |
| `MODELO_IA` | Por defecto `gemini-2.5-pro`. `npm run probar` lista los disponibles |
| `ESFUERZO_IA` | `low`\|`medium`\|`high`. Por defecto `high` |
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
- Integración con Gemini (structured outputs + thinking).
- Integración con Blotato (accounts, media, posts).
- Integración con Instagram Insights v22 + tasas derivadas.
- Bucle de aprendizaje con repriorización automática de tipos.
- Validación de requisitos de Reels antes de publicar.
- Modo simulación.

### Lo que falta, por prioridad

1. **Credenciales.** Sin ellas nada corre:
   `GEMINI_API_KEY` (guion) · `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID`
   (voz; **clona la tuya**, una de stock resta credibilidad) ·
   `BLOTATO_API_KEY` + cuenta conectada · `IG_ACCESS_TOKEN` + `IG_USER_ID` ·
   almacenamiento (R2 recomendado).
2. **Multi-clip con transiciones y subtitulos del audio propio.** Hoy
   `--metraje` acepta UN video. Falta: aceptar una carpeta, encadenar con
   `@remotion/transitions`, y transcribir el audio propio con timestamps
   (Gemini procesa audio, asi que sale con la clave que ya hay). Es lo mas
   valioso que queda: la cara del humano con produccion automatica.
3. **`online_followers`** para la hora optima de publicacion. Señal directa
   de la API, no inferida del rendimiento. Se implementa rapido.
4. **`business_discovery`** para 3-5 competidores: cadencia, formatos y
   engagement. Como benchmark, NO como variable de control — no da views,
   guardados ni retencion, que son privados.
5. **Cron + despliegue.** El cron y el hub deben compartir `historial.json`:
   si el cron corre en un servidor y la revision en el portatil, son dos
   historiales y el bucle se parte en dos. Se despliegan juntos.
6. **Dashboard con `@remotion/player`** — preview en el navegador sin
   exportar, para editar el gancho y verlo al instante. Cuando haya datos.
7. **Validar el fichero de video** con el media-parser (ya es dependencia).
8. **Multiplataforma**: Blotato soporta TikTok, YouTube, LinkedIn. Cambiar
   `targetType` y añadir los insights de cada una.

### Decidido y descartado

- **Google Drive como CDN de publicacion**: no sirve (ver §4ter). Vale como
  archivo y revision.
- **ManyChat para publicar**: no publica Reels, es automatizacion de
  conversaciones (DMs, comentarios). Complementario —comentario → DM con la
  minuta convierte comentarios en leads— pero no sustituye a Blotato.
- **Supabase del proyecto de Contrappto** para guardar videos: mezcla la base
  de produccion del producto legal con marketing. Proyecto aparte o R2.

---

## 8. Reglas del proyecto para el chat nuevo

- **Node ESM.** `"type": "module"`. `import`/`export`, nunca `require`.
  `__dirname` no existe: usar `fileURLToPath(import.meta.url)`.
- **Todo en español**: nombres de variables, funciones, comentarios, logs y
  mensajes de error. Es deliberado, mantenlo.
- **Sin dependencias más allá del SDK de Gemini** (`@google/genai`). `.env`, HTTP y
  almacenamiento están resueltos con Node puro. No añadas `dotenv`, `axios` ni
  un ORM sin una razón concreta.
- **Antes de tocar la API de Gemini, lee §4.** Los errores de esa lista son
  fáciles de reintroducir, sobre todo el `responseMimeType`.
- **Dónde está el valor:** en `src/flujo/aprender.js` y en los prompts de
  `src/ia/`. La fontanería de Blotato e Instagram es sustituible; el bucle de
  aprendizaje es el producto. Si hay que elegir dónde invertir esfuerzo, es
  ahí.
- **Los comentarios explican el *porqué*, no el *qué*.** Sigue ese estilo.
