# claude-marketing

Agente de marketing para Instagram que **aprende de sus propias métricas**.

No es un programador de publicaciones. Cada guion se escribe sabiendo cómo
rindieron los anteriores, y la estrategia se ajusta sola con la evidencia.

```
  medir  →  aprender  →  planificar  →  [grabar]  →  publicar
    ↑                                                    │
    └────────────────────  al día siguiente  ────────────┘
```

## Arranque

```bash
npm install
cp .env.example .env      # rellena las credenciales
```

Luego edita `data/marca.json` — nada funciona hasta que la marca esté definida.

```bash
npm run probar            # verifica cada integración por separado
```

`probar` te dice, entre otras cosas, el `accountId` de Instagram que tienes que
poner en `BLOTATO_ACCOUNT_ID_INSTAGRAM`.

## Uso

```bash
npm run planificar        # genera el guion de hoy
# ... grabas el video y lo subes a una URL pública ...
npm run publicar -- --id <id> --video <URL>

npm run diario            # al día siguiente: mide, aprende y planifica lo siguiente
```

`SIMULAR=true` (el valor por defecto) hace que `publicar` imprima lo que haría
sin llegar a publicar. Ponlo en `false` cuando estés listo.

## Cómo está montado

| Pieza | Qué hace |
|---|---|
| **Claude** (`claude-opus-5`) | Escribe los guiones y analiza las métricas |
| **Blotato** | Publica en Instagram. Solo vías oficiales: OAuth, sin credenciales nuestras |
| **Instagram Graph API v22** | Métricas. Solo lectura |
| `data/marca.json` | Identidad, público, tono, objetivo |
| `data/tipos-video.json` | Catálogo de formatos. Lo edita el humano **y** el agente |
| `data/historial.json` | Estado del agente: publicaciones, métricas y aprendizajes |

El bucle de aprendizaje está en `src/flujo/aprender.js`. Es la parte que
distingue esto de un programador de publicaciones cualquiera.

## Documentación

**[`docs/HANDOFF.md`](docs/HANDOFF.md)** — spec completo: arquitectura,
decisiones tomadas, detalles verificados de cada API, el bucle de mejora paso a
paso y los TODOs priorizados. Pégalo en un chat nuevo para retomar el proyecto
sin perder contexto.
