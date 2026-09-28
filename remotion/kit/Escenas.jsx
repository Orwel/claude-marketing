import { icons } from 'lucide-react';
import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { fuente } from '../fuentes.js';
import { conAlfa } from '../util.js';
import { aparece, azar, cuandoItem, entra, pulso, tramo } from './movimiento.js';
import { useTema } from './tema.js';
import { App } from './Celular.jsx';
import { Medio } from './Medio.jsx';
import { Pill, Ventana } from './Ventana.jsx';

/**
 * Escenas del metodo web (ver movimiento.js). No son pantallas copiadas: son
 * piezas que se arman con lo que Juan David dice en cada video. Todas reciben
 * { b, ancho, alto } como cualquier beat de la plantilla Montaje, y cada item
 * de `b.items` entra cuando se dice su palabra (`en`).
 *
 * Uso en una pieza: { "tipo": "escena", "escena": "<nombre>", "en": "...", "hasta": "...", "items": [...] }
 */

const Ico = ({ nombre, tamano = 26, color }) => {
  const C = icons[nombre] ?? icons.Circle;
  return <C size={tamano} strokeWidth={1.9} color={color} absoluteStrokeWidth />;
};
const txt = (t, familia = 'texto') => fuente(t.marca.fuentes[familia]);

/** Fila generica de las listas tipo app: icono, texto, detalle y estado a la derecha. */
const Fila = ({ t, icono, texto, detalle, derecha, resaltar, estilo }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', borderRadius: 14, background: resaltar ? resaltar : conAlfa(t.tinta, 0.04), border: `1px solid ${resaltar ? 'transparent' : conAlfa(t.tinta, 0.07)}`, ...estilo }}>
    {icono ? <Ico nombre={icono} tamano={26} color={t.acentoTexto} /> : null}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ ...txt(t, 'enfasis'), fontSize: 24, color: t.tinta, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{texto}</div>
      {detalle ? <div style={{ ...txt(t), fontSize: 17, color: t.tenue, marginTop: 3, fontFamily: detalle.mono ? t.mono : undefined }}>{detalle.texto ?? detalle}</div> : null}
    </div>
    {derecha}
  </div>
);

/* ------------------------------------------------------------------ chat */
/** Chat tipo wizard / WhatsApp: burbujas que entran con el resorte de la web y puntos de "escribiendo". */
export const Chat = ({ b, ancho, alto }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTema(b);
  const items = b.items ?? [];
  const siguiente = items.findIndex((_, i) => cuandoItem(b, i) > frame);
  const escribiendo = siguiente > 0 && items[siguiente].de !== 'tu' && cuandoItem(b, siguiente) - frame < 24;
  return (
    <Ventana b={b} ancho={ancho} alto={alto} derecha={<span style={{ ...txt(t), fontSize: 17, color: t.okTexto }}>● {b.estado ?? 'en línea'}</span>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, justifyContent: 'flex-end', height: '100%' }}>
        {items.map((m, i) => {
          const a = entra(frame, cuandoItem(b, i), fps);
          if (frame < cuandoItem(b, i)) return null;
          const mio = m.de === 'tu';
          return (
            <div key={i} style={{ alignSelf: mio ? 'flex-end' : 'flex-start', maxWidth: '78%', ...aparece(a, { y: 10, escala: 0.05 }) }}>
              <div style={{ ...txt(t), fontSize: 25, lineHeight: 1.3, color: '#F4F8FB', padding: '14px 20px', borderRadius: 22, borderBottomRightRadius: mio ? 6 : 22, borderBottomLeftRadius: mio ? 22 : 6, background: mio ? conAlfa(t.acento, 0.85) : conAlfa(t.tinta, 0.09) }}>{m.texto}</div>
            </div>
          );
        })}
        {escribiendo ? (
          <div style={{ display: 'flex', gap: 8, padding: '16px 20px', borderRadius: 22, background: conAlfa(t.tinta, 0.09), alignSelf: 'flex-start' }}>
            {[0, 6, 12].map((d) => <span key={d} style={{ width: 10, height: 10, borderRadius: 5, background: t.okTexto, opacity: pulso(frame, 30, 0.3, 1, d) }} />)}
          </div>
        ) : null}
      </div>
    </Ventana>
  );
};

/* -------------------------------------------------------------- terminal */
/** Terminal que "audita": lineas mono con [ ✓ OK ] entrando cada vez que se dicen, resumen y cursor. */
export const Terminal = ({ b, ancho, alto }) => {
  const frame = useCurrentFrame();
  const t = useTema(b);
  const items = b.items ?? [];
  const ultimo = cuandoItem(b, items.length - 1);
  return (
    <Ventana b={{ ...b, ventana: b.ventana ?? `${t.titulo} · motor` }} ancho={ancho} alto={alto}>
      <div style={{ fontFamily: t.mono, fontSize: 22, lineHeight: 1.7 }}>
        {items.map((l, i) => {
          const a = tramo(frame, cuandoItem(b, i), 8);
          if (a <= 0) return null;
          return (
            <div key={i} style={{ display: 'flex', gap: 12, ...aparece(a, { x: -8, y: 0 }), color: l.error ? t.errorTexto : t.okTexto }}>
              <span style={{ color: t.tenue }}>›</span>
              <span style={{ flex: 1 }}>{l.texto}</span>
              <span style={{ color: l.error ? t.error : t.ok }}>[ {l.error ? '✕ ERROR' : '✓ OK'} ]</span>
            </div>
          );
        })}
        {b.resumen && frame > ultimo + 14 ? (
          <div style={{ marginTop: 14, color: '#FFFFFF', fontWeight: 700, ...aparece(tramo(frame, ultimo + 14, 8), { x: -8, y: 0 }) }}>{b.resumen}</div>
        ) : null}
        <span style={{ color: t.okTexto, opacity: Math.floor(frame / 12) % 2 ? 0 : 1 }}>█</span>
      </div>
    </Ventana>
  );
};

/* ---------------------------------------------------------------- versus */
/** Dos tarjetas enfrentadas: la roja (lo de siempre) entra por la izquierda, la verde (la solucion) por la derecha. */
export const Versus = ({ b, ancho, alto }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTema(b);
  const lados = [
    { ...b.antes, color: t.error, texto: t.errorTexto, icono: b.antes?.icono ?? 'CircleX', desde: cuandoItem(b, 0, 4), x: -20 },
    { ...b.despues, color: t.ok, texto: t.okTexto, icono: b.despues?.icono ?? 'ShieldCheck', desde: cuandoItem(b, 1, 16), x: 20 },
  ];
  return (
    <div style={{ width: ancho, height: alto, display: 'flex', gap: 22, alignItems: 'stretch' }}>
      {lados.map((l, k) => {
        const a = entra(frame, l.desde, fps);
        return (
          <div key={k} style={{ flex: 1, borderRadius: 24, padding: 28, background: `linear-gradient(160deg, ${conAlfa(l.color, 0.16)}, ${conAlfa(t.fondo, 0.92)})`, border: `1.5px solid ${conAlfa(l.color, 0.35)}`, boxShadow: `0 20px 50px rgba(0,0,0,.35), 0 0 ${k ? 40 * pulso(frame, 50, 0.4, 1) : 0}px ${conAlfa(l.color, 0.25)}`, display: 'flex', flexDirection: 'column', gap: 16, ...aparece(a, { x: l.x, y: 0 }) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Ico nombre={l.icono} tamano={34} color={l.color} />
              <span style={{ ...txt(t, 'enfasis'), fontSize: 30, color: l.texto }}>{l.titulo}</span>
            </div>
            <div style={{ ...txt(t), fontSize: 24, lineHeight: 1.35, color: t.tinta, opacity: 0.92 }}>{l.detalle}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 'auto' }}>
              {(l.chips ?? []).map((c, i) => (
                <span key={i} style={aparece(entra(frame, l.desde + 8 + i * 3, fps), { y: 6 })}><Pill texto={c} color={l.color} tamano={15} /></span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ----------------------------------------------------------------- pasos */
/** Ciclo de vida / stepper: cada etapa se enciende cuando se dice, y el conector se llena en verde hasta la siguiente. */
export const Pasos = ({ b, ancho, alto }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTema(b);
  const items = b.items ?? [];
  const activo = items.reduce((k, _, i) => (frame >= cuandoItem(b, i, 6, 24) ? i : k), -1);
  const lado = Math.min(96, (ancho - 60) / items.length - 30);
  return (
    <Ventana b={b} ancho={ancho} alto={alto} pie={items[activo]?.estado}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', height: '100%', paddingTop: 24 }}>
        {items.map((p, i) => {
          const hecho = i < activo;
          const on = i === activo;
          const a = entra(frame, cuandoItem(b, i, 6, 24), fps);
          const c = on ? t.ok : hecho ? '#059669' : conAlfa(t.tinta, 0.18);
          const lleno = i < items.length - 1 ? interpolate(frame, [cuandoItem(b, i, 6, 24), cuandoItem(b, i + 1, 6, 24)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
          return (
            <React.Fragment key={i}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: lado + 40 }}>
                <div style={{ width: lado, height: lado, borderRadius: '50%', display: 'grid', placeItems: 'center', background: on || hecho ? c : conAlfa(t.tinta, 0.05), border: `2px solid ${c}`, boxShadow: on ? `0 0 ${24 + 16 * pulso(frame, 40)}px ${conAlfa(t.ok, 0.45)}` : 'none', transform: `scale(${on ? 1 + 0.12 * Math.min(1, a) : 1})` }}>
                  <Ico nombre={hecho ? 'Check' : p.icono ?? 'Circle'} tamano={lado * 0.45} color={on || hecho ? '#FFFFFF' : t.tenue} />
                </div>
                <span style={{ ...txt(t, 'enfasis'), fontSize: 20, textAlign: 'center', color: on ? t.tinta : t.tenue }}>{p.texto}</span>
              </div>
              {i < items.length - 1 ? (
                <div style={{ flex: 1, height: 4, borderRadius: 2, marginTop: lado / 2 - 2, background: conAlfa(t.tinta, 0.12), overflow: 'hidden' }}>
                  <div style={{ width: `${lleno * 100}%`, height: '100%', background: '#059669' }} />
                </div>
              ) : null}
            </React.Fragment>
          );
        })}
      </div>
    </Ventana>
  );
};

/* ----------------------------------------------------------------- tabla */
/**
 * Lista de casos/contratos que entra fila a fila (x -8 -> 0) y una alerta que
 * se despliega: la fila marcada `critico` se tiñe de rojo y cae el banner.
 * El item con `alerta: true` es el banner (entra cuando se dice su palabra).
 */
export const Tabla = ({ b, ancho, alto }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTema(b);
  const items = b.items ?? [];
  const iAlerta = items.findIndex((x) => x.alerta);
  const alerta = iAlerta >= 0 ? tramo(frame, cuandoItem(b, iAlerta), 10) : 0;
  return (
    <Ventana b={b} ancho={ancho} alto={alto}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {b.busqueda ? (
          // Buscador que se escribe solo (2 cuadros por letra) con cursor.
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderRadius: 14, border: `1.5px solid ${conAlfa(t.acento, 0.5)}`, background: conAlfa(t.tinta, 0.05), marginBottom: 4 }}>
            <Ico nombre="Search" tamano={24} color={t.acentoTexto} />
            <span style={{ ...txt(t), fontSize: 23, color: t.tinta }}>{b.busqueda.slice(0, Math.max(0, Math.floor((frame - 4) / 2)))}<span style={{ opacity: Math.floor(frame / 12) % 2 ? 0 : 1, color: t.acentoTexto }}>|</span></span>
          </div>
        ) : null}
        {iAlerta >= 0 ? (
          <div style={{ maxHeight: alerta * 90, overflow: 'hidden', opacity: alerta }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 14, background: t.errorFondo, border: `1.5px solid ${conAlfa(t.error, 0.5)}`, boxShadow: `0 0 ${20 * pulso(frame, 30, 0.3, 1)}px ${conAlfa(t.error, 0.35)}` }}>
              <Ico nombre={items[iAlerta].icono ?? 'TriangleAlert'} tamano={30} color={t.error} />
              <div style={{ flex: 1 }}>
                <div style={{ ...txt(t, 'enfasis'), fontSize: 23, color: t.errorTexto }}>{items[iAlerta].texto}</div>
                {items[iAlerta].detalle ? <div style={{ ...txt(t), fontSize: 17, color: conAlfa(t.errorTexto, 0.8) }}>{items[iAlerta].detalle}</div> : null}
              </div>
            </div>
          </div>
        ) : null}
        {items.map((f, i) => {
          if (f.alerta) return null;
          const a = entra(frame, cuandoItem(b, i, 4, 3), fps);
          const rojo = f.critico && alerta > 0;
          return (
            <div key={i} style={aparece(a, { x: -10, y: 0 })}>
              <Fila t={t} icono={f.icono} texto={f.texto} detalle={f.detalle ? { texto: f.detalle, mono: f.mono } : null} resaltar={rojo ? t.errorFondo : null}
                derecha={f.estado ? <Pill texto={rojo ? 'Crítico' : f.estado} color={rojo ? t.error : f.tono === 'ok' ? t.ok : f.tono === 'pendiente' ? t.pendiente : t.activo} /> : null} />
            </div>
          );
        })}
      </div>
    </Ventana>
  );
};

/* -------------------------------------------------------------- metricas */
/** Tarjetas de cifras que cuentan hasta su valor cuando se dicen. */
export const Metricas = ({ b, ancho, alto }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTema(b);
  const items = b.items ?? [];
  return (
    <div style={{ width: ancho, height: alto, display: 'grid', gridTemplateColumns: `repeat(${Math.min(3, items.length)}, 1fr)`, gap: 18, alignContent: 'center' }}>
      {items.map((m, i) => {
        const d = cuandoItem(b, i, 4, 3);
        const a = entra(frame, d, fps);
        const v = Math.round((m.valor ?? 0) * tramo(frame, d, 18));
        const color = m.tono === 'ok' ? t.okTexto : m.tono === 'pendiente' ? t.pendienteTexto : m.tono === 'error' ? t.errorTexto : t.acentoTexto;
        return (
          <div key={i} style={{ borderRadius: 22, padding: '26px 24px', background: conAlfa(t.panel, 0.92), border: `1.5px solid ${conAlfa(color, 0.3)}`, ...aparece(a, { y: 12 }) }}>
            <div style={{ ...txt(t, 'titulo'), fontSize: 64, lineHeight: 1, color }}>{m.prefijo ?? ''}{v.toLocaleString('es-CO')}{m.sufijo ?? ''}</div>
            <div style={{ ...txt(t), fontSize: 21, color: t.tenue, marginTop: 10 }}>{m.etiqueta}</div>
          </div>
        );
      })}
    </div>
  );
};

/* --------------------------------------------------------------- avisos */
const APPS = {
  telegram: { color: '#2AABEE', icono: 'Send', nombre: 'Telegram' },
  correo: { color: '#EA4335', icono: 'Mail', nombre: 'Correo' },
  whatsapp: { color: '#25D366', icono: 'MessageCircle', nombre: 'WhatsApp' },
  app: { color: null, icono: 'Bell', nombre: null },
};
/** Notificaciones que caen en un telefono (Telegram, correo, WhatsApp, la app) cuando se nombran. */
export const Avisos = ({ b, ancho, alto }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTema(b);
  const items = b.items ?? [];
  return (
    <div style={{ width: ancho, height: alto, display: 'flex', gap: 30, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: Math.min(ancho * 0.62, 600), display: 'flex', flexDirection: 'column', gap: 14 }}>
        {items.map((n, i) => {
          const app = APPS[n.app] ?? APPS.app;
          const color = app.color ?? t.acento;
          const a = entra(frame, cuandoItem(b, i, 4, 12), fps);
          if (a <= 0.001) return null;
          return (
            <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '16px 20px', borderRadius: 22, background: conAlfa(t.panel, 0.96), border: `1px solid ${conAlfa(color, 0.35)}`, boxShadow: `0 16px 40px rgba(0,0,0,.35)`, ...aparece(a, { y: -26, escala: 0.08 }) }}>
              <div style={{ width: 54, height: 54, borderRadius: 16, flex: 'none', display: 'grid', placeItems: 'center', background: color }}>
                <Ico nombre={n.icono ?? app.icono} tamano={28} color="#FFFFFF" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', ...txt(t), fontSize: 16, color: t.tenue }}>
                  <span>{app.nombre ?? t.titulo}</span>
                  <span>{n.hora ?? 'ahora'}</span>
                </div>
                <div style={{ ...txt(t, 'enfasis'), fontSize: 23, color: t.tinta, marginTop: 2 }}>{n.titulo}</div>
                {n.texto ? <div style={{ ...txt(t), fontSize: 19, color: t.tenue, fontFamily: n.mono ? t.mono : undefined }}>{n.texto}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------ documentos */
/** Documentos que aparecen "Generando" (spinner ambar) y pasan a "Listo" (verde) cuando se dicen. */
export const Documentos = ({ b, ancho, alto }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTema(b);
  const items = b.items ?? [];
  return (
    <Ventana b={b} ancho={ancho} alto={alto}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((d, i) => {
          const desde = cuandoItem(b, i, 4, 10);
          const a = entra(frame, i === 0 ? 0 : Math.max(0, desde - 16), fps);
          const listo = entra(frame, desde + 10, fps, { stiffness: 380, damping: 22 });
          const ok = frame >= desde + 10;
          return (
            <div key={i} style={aparece(a, { x: 10, y: 0 })}>
              <Fila t={t} icono={d.icono ?? (/\.pdf$/i.test(d.texto) ? 'FileText' : /zip|carpeta/i.test(d.texto) ? 'FolderClosed' : 'FileType')} texto={d.texto} detalle={d.detalle}
                derecha={ok ? <span style={{ transform: `scale(${0.8 + 0.2 * Math.min(1, listo)})` }}><Pill texto={d.listo ?? 'Listo'} color={t.ok} /></span> : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 20, height: 20, borderRadius: '50%', border: `3px solid ${conAlfa(t.pendiente, 0.3)}`, borderTopColor: t.pendiente, transform: `rotate(${frame * 18}deg)` }} />
                    <Pill texto={d.proceso ?? 'Generando'} color={t.pendiente} />
                  </span>
                )} />
            </div>
          );
        })}
      </div>
    </Ventana>
  );
};

/* ----------------------------------------------------------------- firma */
/**
 * Firma con identidad biometrica: la cara se escanea (linea que sube y baja,
 * dos anillos que se expanden), el stepper Creada -> Enviada -> Vista -> Firmada
 * se llena, y entra el escudo verde. Los pasos son los items.
 */
export const Firma = ({ b, ancho, alto }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTema(b);
  const items = b.items ?? [{ texto: 'Creada' }, { texto: 'Enviada' }, { texto: 'Vista' }, { texto: 'Firmada' }];
  const fin = cuandoItem(b, items.length - 1, 8, 18);
  const aprobado = entra(frame, fin + 6, fps, { stiffness: 380, damping: 22 });
  return (
    <Ventana b={b} ancho={ancho} alto={alto} pie={frame > fin + 6 ? (b.listo ?? '✓ Documento firmado') : b.estado ?? 'Prueba de vida en curso'}>
      <div style={{ display: 'flex', gap: 40, alignItems: 'center', height: '100%' }}>
        <div style={{ position: 'relative', width: 170, height: 170, flex: 'none', display: 'grid', placeItems: 'center' }}>
          {[0, 10].map((d) => {
            const o = ((frame + d) % 42) / 42;
            return <div key={d} style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2px solid ${t.acento}`, transform: `scale(${0.9 + o * 0.6})`, opacity: (1 - o) * (1 - Math.min(1, aprobado)) }} />;
          })}
          <div style={{ position: 'absolute', inset: 16, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${conAlfa(aprobado > 0.5 ? t.ok : t.acento, 0.7)}`, background: conAlfa(aprobado > 0.5 ? t.ok : t.acento, 0.12), display: 'grid', placeItems: 'center', transform: `scale(${1 + 0.04 * pulso(frame, 30, 0, 1)})` }}>
            <Ico nombre={aprobado > 0.5 ? 'ShieldCheck' : 'ScanFace'} tamano={70} color={aprobado > 0.5 ? t.okTexto : t.acentoTexto} />
            {aprobado < 0.5 ? <div style={{ position: 'absolute', left: 0, right: 0, height: 4, top: `${50 + 40 * Math.sin((frame / 45) * Math.PI * 2)}%`, background: `linear-gradient(90deg, transparent, ${t.acento}, transparent)` }} /> : null}
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {b.documento ? <div style={{ ...txt(t, 'enfasis'), fontSize: 24, color: t.tinta }}><Ico nombre="FilePen" tamano={24} color={t.acentoTexto} /> {b.documento}</div> : null}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {items.map((p, i) => {
              const on = frame >= cuandoItem(b, i, 8, 18);
              const s = entra(frame, cuandoItem(b, i, 8, 18), fps, { stiffness: 380, damping: 22 });
              return (
                <React.Fragment key={i}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', display: 'grid', placeItems: 'center', background: on ? t.acento : 'transparent', border: `2px solid ${on ? t.acento : conAlfa(t.tinta, 0.2)}`, transform: `scale(${on ? 0.8 + 0.2 * Math.min(1, s) : 1})` }}>
                      {on ? <Ico nombre="Check" tamano={24} color="#FFFFFF" /> : null}
                    </div>
                    <span style={{ ...txt(t), fontSize: 17, color: on ? t.tinta : t.tenue }}>{p.texto}</span>
                  </div>
                  {i < items.length - 1 ? <div style={{ flex: 1, height: 3, marginBottom: 28, background: frame >= cuandoItem(b, i + 1, 8, 18) ? t.acento : conAlfa(t.tinta, 0.15) }} /> : null}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </Ventana>
  );
};

/* ---------------------------------------------------------------- masiva */
/**
 * Contratacion masiva: una plantilla que se multiplica en N contratos. Cada item
 * es un numero que Juan David dice ("2, 10, 20, 30, 40…"): la cuadricula crece
 * hasta ese numero cuando lo dice, con un contador grande.
 */
export const Masiva = ({ b, ancho, alto }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTema(b);
  const items = b.items ?? [];
  let n = 0;
  let desde = 0;
  items.forEach((it, i) => {
    const c = cuandoItem(b, i, 6, 12);
    if (frame >= c) {
      n = it.n;
      desde = c;
    }
  });
  const maximo = Math.max(...items.map((x) => x.n), 1);
  // Con cientos de contratos se dibujan hasta 60 celdas que se llenan en proporcion: el numero grande dice la cifra real.
  const celdas = Math.min(maximo, 60);
  const cols = celdas > 30 ? 10 : celdas > 12 ? 8 : 6;
  const celda = Math.min(46, (ancho * 0.58 - (cols - 1) * 6) / cols);
  const cuenta = Math.round(interpolate(frame, [desde, desde + 12], [items[items.findIndex((x) => x.n === n) - 1]?.n ?? 0, n], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  return (
    <Ventana b={b} ancho={ancho} alto={alto} pie={b.pie}>
      <div style={{ display: 'flex', gap: 30, alignItems: 'center', height: '100%' }}>
        <div style={{ flex: 'none', textAlign: 'center', width: ancho * 0.28 }}>
          <div style={{ ...txt(t, 'titulo'), fontSize: 110, lineHeight: 1, color: t.acentoTexto }}>{cuenta}</div>
          <div style={{ ...txt(t), fontSize: 22, color: t.tenue }}>{b.unidad ?? 'contratos'}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${celda}px)`, gap: 6 }}>
          {Array.from({ length: celdas }, (_, i) => {
            const vivo = i < Math.round((cuenta * celdas) / maximo);
            const a = vivo ? entra(frame, desde + (i % cols) * 0.6, fps) : 0;
            return (
              <div key={i} style={{ width: celda, height: celda * 1.3, borderRadius: 6, background: vivo ? conAlfa(t.acento, 0.28) : conAlfa(t.tinta, 0.04), border: `1px solid ${vivo ? conAlfa(t.acento, 0.7) : conAlfa(t.tinta, 0.08)}`, display: 'grid', placeItems: 'center', transform: `scale(${vivo ? 0.6 + 0.4 * Math.min(1, a) : 1})` }}>
                {vivo ? <Ico nombre="FileCheck" tamano={celda * 0.5} color={t.acentoTexto} /> : null}
              </div>
            );
          })}
        </div>
      </div>
    </Ventana>
  );
};

/* ---------------------------------------------------------------- kanban */
/** Tablero: las tarjetas (items) saltan a la columna `a` cuando se dicen, con resorte 380/28 y brillo de acento. */
export const Kanban = ({ b, ancho, alto }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTema(b);
  const columnas = b.tablero ?? [{ nombre: 'Pendiente', color: '#6B7280' }, { nombre: 'En progreso', color: '#3B82F6' }, { nombre: 'Hecho', color: '#10B981' }];
  const ancCol = (ancho - 48 - (columnas.length - 1) * 16) / columnas.length;
  const tarjetas = (b.items ?? []).map((c, i) => {
    const salto = entra(frame, cuandoItem(b, i, 10, 16), fps, { stiffness: 380, damping: 28 });
    return { ...c, salto: frame >= cuandoItem(b, i, 10, 16) ? salto : 0 };
  });
  const filaDe = (col) => (c) => (c.salto > 0.5 ? c.a : c.de ?? 0) === col;
  return (
    <Ventana b={b} ancho={ancho} alto={alto}>
      <div style={{ position: 'relative', display: 'flex', gap: 16, height: '100%' }}>
        {columnas.map((col, k) => (
          <div key={k} style={{ width: ancCol, borderRadius: 14, background: conAlfa(t.tinta, 0.03), padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...txt(t, 'enfasis'), fontSize: 18, color: t.tenue, marginBottom: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: 5, background: col.color }} /> {col.nombre}
              <span style={{ marginLeft: 'auto' }}>{tarjetas.filter(filaDe(k)).length}</span>
            </div>
          </div>
        ))}
        {tarjetas.map((c, i) => {
          const fila = (col, antes) => tarjetas.slice(0, antes).filter(filaDe(col)).length;
          const x0 = (c.de ?? 0) * (ancCol + 16) + 12;
          const x1 = c.a * (ancCol + 16) + 12;
          const y0 = 48 + fila(c.de ?? 0, i) * 70;
          const y1 = 48 + fila(c.a, i) * 70;
          const s = Math.min(1.08, c.salto);
          const brillo = c.salto > 0.5 ? 1 : 0;
          return (
            <div key={i} style={{ position: 'absolute', left: x0 + (x1 - x0) * s, top: y0 + (y1 - y0) * s - Math.sin(Math.PI * Math.min(1, c.salto)) * 30, width: ancCol - 24, padding: '12px 14px', borderRadius: 12, ...txt(t, 'enfasis'), fontSize: 19, color: t.tinta, background: brillo ? conAlfa(t.acento, 0.14) : conAlfa(t.panel, 0.95), border: `1.5px solid ${brillo ? conAlfa(t.acento, 0.55) : conAlfa(t.tinta, 0.08)}`, boxShadow: brillo ? `0 0 18px ${conAlfa(t.acento, 0.3)}` : 'none' }}>
              {c.texto}
            </div>
          );
        })}
      </div>
    </Ventana>
  );
};

/* --------------------------------------------------------------- hojas3d */
/**
 * Fondo 3D del hero de Contrappto, en CSS: tres hojas de contrato translucidas
 * que flotan en trayectorias de Lissajous (las formulas de HeroAnimation.tsx,
 * con semilla fija) dentro de una perspectiva. Sin WebGL: en el render no hay GPU.
 */
export const Hojas3D = ({ ancho, alto, cantidad = 3, opacidad = 0.55 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTema();
  const tt = frame / fps;
  const bases = [[-4, 0, 0], [0, 1.5, -2], [4, -1, 1.5], [-2, -2, -3], [2.5, 2, -1]];
  const u = Math.min(ancho, alto) / 9;
  return (
    <div style={{ position: 'absolute', inset: 0, perspective: 900, overflow: 'hidden', pointerEvents: 'none' }}>
      {bases.slice(0, cantidad).map((p, i) => {
        const off = azar(`o${i}`) * Math.PI * 2;
        const spin = 0.2 + azar(`s${i}`) * 0.15;
        const x = p[0] + Math.cos(tt * (0.15 + 0.08 * i) + off * 2) * 2;
        const y = p[1] + Math.sin(tt * (0.18 + 0.12 * i) + off * 3) * 1.2;
        const z = p[2] + Math.sin(tt * (0.22 + 0.09 * i) + off * 4) * 1.8;
        return (
          <div key={i} style={{ position: 'absolute', left: ancho / 2 + x * u - u * 1.25, top: alto / 2 - y * u - u * 1.75, width: u * 2.5, height: u * 3.5, borderRadius: 10, background: `linear-gradient(150deg, ${conAlfa(t.acento, 0.55)}, ${conAlfa(t.acento, 0.18)})`, border: `1px solid ${conAlfa('#E6F1FB', 0.45)}`, boxShadow: `0 0 40px ${conAlfa(t.acento, 0.45)}`, opacity: opacidad, transform: `translateZ(${z * u}px) rotateX(${Math.sin(tt * spin * 0.8 + off) * 23}deg) rotateY(${((tt * spin * 1.2 + off * 2) * 180) / Math.PI}deg) rotateZ(${Math.cos(tt * spin * 0.6 + off * 3) * 17}deg)`, backfaceVisibility: 'visible' }}>
            {[0.2, 0.34, 0.48, 0.62].map((yy, k) => <div key={k} style={{ position: 'absolute', left: '14%', right: k % 2 ? '30%' : '14%', top: `${yy * 100}%`, height: 3, borderRadius: 2, background: conAlfa('#E6F1FB', 0.5) }} />)}
          </div>
        );
      })}
    </div>
  );
};

/** Registro de escenas para el beat `tipo: "escena"`. */
export const ESCENAS = { chat: Chat, terminal: Terminal, versus: Versus, pasos: Pasos, tabla: Tabla, metricas: Metricas, avisos: Avisos, documentos: Documentos, firma: Firma, masiva: Masiva, kanban: Kanban, app: App, medio: Medio };

/** Beat `escena`: la escena pedida, con las hojas 3D detras si la pieza lo pide (`b.fondo3d`). */
export const Escena = ({ b, ancho, alto }) => {
  const E = ESCENAS[b.escena];
  if (!E) return null;
  return (
    <div style={{ position: 'relative', width: ancho, height: alto }}>
      {b.fondo3d ? <Hojas3D ancho={ancho} alto={alto} /> : null}
      <E b={b} ancho={ancho} alto={alto} />
    </div>
  );
};
