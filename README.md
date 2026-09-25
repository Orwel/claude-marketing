# claude-marketing · estudio de producción

Estudio de video con **Remotion**, manejado desde Claude Code, para las tres
cuentas: **juanda.trifuerza**, **trifuerza.co** y **Contrappto**.

No publica nada. Produce el MP4 terminado y lo deja en Drive; tú publicas a mano.
La estrategia vive en el FigJam de Trifuerza (zonas 5, 7 y 8 y la parrilla del mes).

```
 tú grabas ──► Drive/Redes sociales/2026-10 octubre/videos grabados
                                    │
                         Remotion (marca + pieza)
                                    │
 tú publicas ◄── Drive/Redes sociales/2026-10 octubre/videos editados
```

## Arranque

```bash
npm install
cp .env.example .env     # pon la ruta de tu carpeta de Drive en CARPETA_REDES
npm run estudio          # Remotion Studio: aquí se revisa todo
```

## Uso

```bash
npm run render -- la-fecha-que-cuesta-plata            # todas sus cuentas
npm run render -- la-fecha-que-cuesta-plata juanda     # solo una
npm run validar -- ruta/al/video.mp4                   # revisar un MP4 cualquiera
```

`render` deja el MP4 en `CARPETA_REDES/<mes>/videos editados/` (o en `salida/`
si no hay `.env`), lo valida y te recuerda los datos jurídicos por verificar.

## Tres capas

| Capa | Dónde | Qué decide |
|---|---|---|
| Marca | `marcas/<cuenta>.json` | Cómo se ve: fuentes, colores, radios, resaltado, firma |
| Pieza | `piezas/AAAA-MM/<slug>.json` | Qué dice: escenas, y por cuenta gancho, cierre, CTA y copy |
| Plantilla | `remotion/plantillas/` | Cómo se arma: lee marca + pieza y no sabe de ninguna cuenta |

Crear un JSON en `piezas/` basta para que aparezca en el Studio.

## Documentación

- [`docs/HANDOFF.md`](docs/HANDOFF.md): cómo está montado y las decisiones que ya se tomaron.
- [`docs/PLAN.md`](docs/PLAN.md): plan de trabajo (vive en el FigJam, zona 5B).
- [`docs/TONO.md`](docs/TONO.md): tono y restricciones para escribir copys.
- [`docs/APRENDIZAJES.md`](docs/APRENDIZAJES.md): bitácora de lo aprendido en cada sesión.
- [`CLAUDE.md`](CLAUDE.md) y la skill `producir-pieza`: lo que Claude Code lee solo al abrir el repo.
- [`archivo/agente-anterior/`](archivo/agente-anterior/LEEME.md): el proyecto anterior, solo como consulta.
