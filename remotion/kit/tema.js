import { useMarca } from '../marca.js';
import { conAlfa } from '../util.js';

/**
 * Tokens de las escenas tipo web. Salen de la marca (marcas/<id>.json) y se
 * completan con los colores semanticos de las dos webs de referencia:
 * listo/OK esmeralda, critico rojo, pendiente ambar, activo sky, persona violeta.
 * Una pieza puede cambiar el acento por escena (`b.tema`), p. ej. el dorado de
 * Trifuerza Legal (#C9A227) dentro de un video de la cuenta trifuerza.
 */
export const SEMANTICOS = {
  ok: '#10B981',
  okTexto: '#34D399',
  error: '#EF4444',
  errorFondo: 'rgba(127,29,29,.32)',
  errorTexto: '#FECACA',
  pendiente: '#FBBF24',
  pendienteTexto: '#FCD34D',
  activo: '#0EA5E9',
  activoTexto: '#BAE6FD',
  persona: '#8B5CF6',
  personaTexto: '#C4B5FD',
};

export function useTema(b = {}) {
  const marca = useMarca();
  const c = marca.colores;
  const web = marca.web ?? {};
  const t = {
    marca,
    fondo: web.fondo ?? c.fondo,
    panel: web.panel ?? c.fondo2,
    elevado: web.elevado ?? conAlfa(c.tinta, 0.06),
    borde: web.borde ?? c.linea,
    tinta: c.tinta,
    tenue: c.tenue,
    acento: c.acento,
    acentoTexto: web.acentoTexto ?? c.acento,
    secundario: c.secundario ?? c.acento,
    titulo: web.titulo ?? marca.nombre,
    tituloAcento: web.tituloAcento ?? '',
    mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
    ...SEMANTICOS,
  };
  return { ...t, ...(b.tema ?? {}) };
}
