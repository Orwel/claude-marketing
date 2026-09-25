# Traspaso · claude-marketing (estudio de producción)

> Pega este documento al arrancar un chat nuevo y di "continúa sobre este repo".

## 1. Qué es

Un **estudio de producción de video con Remotion**, manejado desde Claude Code.
Toma lo que Juan David graba (o nada, en los videos animados) y entrega MP4
terminados con la marca de cada cuenta. **No publica**: la publicación es manual.

La estrategia no vive aquí, vive en el FigJam de Trifuerza
(fileKey `k01OtwxjWRkXi3HF4Yu11X`: zonas 5, 7, 8 y "Parrilla de contenidos · Octubre 2026").
Lo que este repo necesita saber de ella:

- Un día de grabación al mes (octubre: el 13; alterno: el 20). Se graba con un mes de adelanto.
- Guiones de 6 líneas: gancho, quién soy, dato o norma, ejemplo, qué hacer hoy, llamado a la acción.
- Cada tema rinde 8 a 10 piezas: verticales, carrusel, historias, horizontal, miniatura.
- Tres cuentas. Todo nace en juanda.trifuerza. Contrappto le habla a arrendadores,
  brokers, freelancers y RRHH, en tono de producto, sin jerga jurídica y sin "Soy Juan David".
- Republicar = mismo video, distinto primer segundo, otro copy y otro CTA, 3 a 7 días después.

## 2. Decisiones tomadas (no re-litigar)

| Decisión | Por qué |
|---|---|
| Sin publicación automática | La publica Juan David a mano. Blotato, Graph API, Gemini y Veo salieron. El proyecto anterior completo está en `archivo/agente-anterior/` como consulta: no se ejecuta ni se importa (ver su `LEEME.md`). |
| Tres capas: marca, pieza, plantilla | Cambiar de cuenta es cambiar un JSON de marca; republicar es cambiar la variante. La plantilla nunca tiene un color ni un texto de una cuenta. |
| Drive como carpeta de trabajo | Google Drive para escritorio sincroniza `G:\Mi unidad\Redes sociales`. La ruta va en `.env` (`CARPETA_REDES`), nunca en el código. |
| Carpeta por mes `AAAA-MM mes` | `2026-10 octubre`: se ordena bien en Drive aunque cambie el año. Dentro: `videos grabados` y `videos editados`. |
| Fuentes locales en `public/fuentes` | Son los archivos variables de Google Fonts (OFL). Locales para que un render no dependa de la red; con fuentes remotas, un fallo de red mete la fuente del sistema sin avisar. |
| `delayRender` de fuentes en un hook | A nivel de módulo el renderizador no veía liberada la espera y cortaba a los 30 s. Ver `remotion/fuentes.js`. |
| H.264 + yuv420p + bt709 | Sin `bt709`, los cuadros JPEG salen `yuvj420p` y las redes recodifican. `validar.js` lo comprueba sobre el archivo real. |
| Render por CLI, no por API de Node | Evita sumar `@remotion/renderer` y `@remotion/bundler`; la CLI ya viene con `@remotion/cli`. |
| Revisión en Remotion Studio | El hub de revisión se decide después. |
| Datos jurídicos siempre marcados | Cada pieza trae `verificar[]`; `render` los imprime. Nada se publica con uno en `pendiente`. |

## 3. Estructura

```
marcas/                       identidad por cuenta (videos y carruseles leen lo mismo)
  contrappto.json             Sora · #07141D #0F2533 #F0F6FC #9BB0BD #0090DE #FFB038
  juanda.json                 Fraunces 600 + Inter · #0B1426 #F4EFE6 #F26B1D
piezas/AAAA-MM/<slug>.json    contenido: escenas + variantes por cuenta + verificar[]
public/                       estáticos que ve Remotion (fuentes, logos)
remotion/
  index.js · Root.jsx         registra <slug>--<cuenta> por cada pieza, agrupado por mes
  catalogo.js                 lee todas las piezas con webpackContext
  fuentes.js · marca.js       fuentes locales y contexto de marca
  util.js                     "$campo" → variante, *énfasis*, duración, formatos
  componentes/                Fondo, TextoCinetico, Firma/Etiqueta, Celular, Iconos, Aparecer
  escenas/                    gancho, frase, lineaTiempo, dato, notificacion, pasos, cierre
  plantillas/Animado.jsx      video 100 % generado
  plantillas/Vertical.jsx     metraje propio cortado + gancho + subtítulos + cierre
docs/TONO.md                  tono, público y restricciones para escribir copys
archivo/agente-anterior/      el proyecto anterior, solo consulta (LEEME.md dice qué se aprovechó)
src/
  config.js                   .env sin dependencias + carpeta del mes
  render.js                   npm run render -- <slug> [cuenta]
  video/validar.js            requisitos de Reels con ffprobe
```

### Plantilla Vertical (metraje propio)

`npm run vertical -- 2026-10` lee `CARPETA_REDES/2026-10 octubre/videos grabados/` y por cada video:
proxy H.264 en `public/crudos/` → audio 16 kHz → whisper.cpp local (`@remotion/install-whisper-cpp`,
se instala solo en `.whisper/`) → `src/vertical/corte.js` decide el corte (tomas separadas por pausas
de 1 s, "otra" descarta la toma, silencios de más de 0,35 s fuera) → pieza en borrador
`piezas/2026-10/grabado-<archivo>.json`. Si la pieza ya existe, solo se actualiza el corte; gancho,
cierre, CTA y copy se respetan. Luego se revisa en el Studio y `npm run render -- <slug>`.
El corte se probó con transcripción simulada; falta la primera prueba con metraje real (en el PC).

### Cómo se escribe una pieza

Campos de pieza con ritmo (ver `contrappto-en-accion.json`): `bpm`, `transicion: "barrido"`
(corte seco tapado por franjas, sin solape), `formas: true` (figuras que laten) y `pista: true`
(música sintetizada por `src/audio/pista.js`, sin licencias, con whoosh en cada corte y golpe en
cada impacto). Antes de abrir el Studio: `npm run pista -- <slug>`; `render` la regenera solo.

Voz: cada escena puede traer `voz` (texto o `"$campo"`). `npm run voz -- <slug>` llama a ElevenLabs
con la voz clonada (`ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`), deja un mp3 por escena y un
manifiesto en `public/voz/`. La plantilla alarga cada escena a lo que dura su frase y baja la música.
**Sin probar contra la API real**: en la sesión en la nube `api.elevenlabs.io` está bloqueado por la
política de red. El camino de manifiesto sí se probó con un audio falso.

Escenas: gancho, frase, lineaTiempo, dato, notificacion, pasos, cierre, golpe, partes, pantalla
(captura real con `recorte` para esconder datos), ritmo y celularReal.

- `escenas[]`: cada una con `tipo` y `segundos`. Entre escenas hay 10 cuadros de fundido.
- Un texto que empieza por `$` se lee de la variante de la cuenta (`"$gancho"`).
- `*palabras*` entre asteriscos se resaltan: marcador en Contrappto, subrayado en juanda.
- `variantes.<cuenta>`: etiqueta, gancho, cierre, cta, web y copy de esa cuenta.
- `cuentas[]`: en qué cuentas se renderiza.
- `verificar[]`: cada dato jurídico o de producto, con `estado: pendiente | verificado`.

## 4. Marcas

- **contrappto**: verificada contra `contrappto/src/app/globals.css` (`--brand-*`) el 24-sep-2026.
  El logo oficial trae la palabra en gris para fondo blanco; en oscuro se usa el ícono y la palabra se compone en Sora.
- **juanda**: `fondo2`, `tenue` y `linea` son propuestos (derivados). Confirmar.
- **academy / trifuerza.co**: sin definir. Preguntar antes de inventar.

## 5. Estado

Hecho (primera entrega):
- Estructura de tres capas, marcas contrappto y juanda, plantilla Animado con 7 escenas.
- "La fecha que cuesta plata" en contrappto y juanda (19 s) y un promocional de Contrappto (24 s). Los tres validados.
- "Contrappto en acción" (23 s): versión con ritmo, personas, capturas reales de la app (`public/marcas/contrappto/app/`, copiadas de `contrappto/public/images/home`) y pista sintetizada.
- Drive: `Redes sociales/2026-10 octubre` y `2026-11 noviembre`, cada una con `videos grabados` y `videos editados`.

Siguiente: ver `docs/PLAN.md`.

## 6. Reglas

- Node ESM. Nombres, comentarios y logs en español. Los comentarios explican el porqué.
- Cero dependencias innecesarias: hoy son `remotion`, `@remotion/cli`, `react`, `react-dom`.
- Ningún dato jurídico inventado: se marca en `verificar[]`.
- No mencionar clientes identificables ni competidores por nombre.
- Licencia de Remotion: gratis para empresas de hasta 3 personas. Si Trifuerza crece, hay que comprar licencia.
