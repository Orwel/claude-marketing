import { icons } from 'lucide-react';
import React from 'react';
import { interpolate, random, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { fuente } from '../fuentes.js';
import { Vidrio as VidrioBase } from '../graficos/base.jsx';
import { useMarca } from '../marca.js';
import { conAlfa, partirPalabras } from '../util.js';
import { Escena } from '../kit/Escenas.jsx';
import { Certificado as Hoja } from '../componentes/Certificado.jsx';

/**
 * Beats graficos de la plantilla Montaje. Reglas del estudio (prompt de
 * produccion, oct-2026): todo entra con resorte, nunca lineal, en 250-400 ms,
 * desde 16 px abajo y de opacidad 0 a 1; si entran varias cosas, escalonadas
 * 80 ms (3 cuadros a 30 fps). Nada de glitch, shake ni zoom brusco.
 *
 * Iconos: todos de Lucide (ISC), mismo trazo (1,75) y siempre en colores de
 * la marca. Lo que no es un icono (documento, libro, correos) se dibuja aqui
 * con las formas y la paleta de la marca.
 */
export const TRAZO = 1.75;

// El panel ya es casi opaco: sin backdrop-filter, que en el Chrome sin GPU del render cuesta mucho por cuadro.
const Vidrio = ({ estilo, ...props }) => <VidrioBase {...props} estilo={{ backdropFilter: 'none', ...estilo }} />;
export const ESCALON = 3;

/** Resorte de entrada: ~10 cuadros (330 ms) hasta asentarse. */
export const resorte = (frame, desde, fps) => spring({ frame: frame - desde, fps, config: { damping: 20, stiffness: 190, mass: 0.7 } });
export const subir = (a, d = 16) => ({ opacity: Math.min(1, a * 1.4), transform: `translateY(${(1 - a) * d}px)` });

export const Icono = ({ nombre, tamano = 48, color }) => {
  const marca = useMarca();
  const C = icons[nombre] ?? icons.Circle;
  return <C size={tamano} strokeWidth={TRAZO} color={color ?? marca.colores.acento} absoluteStrokeWidth />;
};

/** Texto con *enfasis* en el color de acento de la marca. */
export const Texto = ({ texto, tamano = 44, familia = 'texto', color, estilo }) => {
  const marca = useMarca();
  return (
    <span style={{ ...fuente(marca.fuentes[familia]), fontSize: tamano, lineHeight: 1.18, color: color ?? marca.colores.tinta, ...estilo }}>
      {partirPalabras(texto).map((p, i) => (
        <span key={i} style={{ color: p.enfasis ? marca.colores.acento : undefined }}>
          {i ? ' ' : ''}
          {p.texto}
        </span>
      ))}
    </span>
  );
};

const Titulo = ({ texto, a }) => (texto ? <div style={{ ...subir(a), marginBottom: 26 }}><Texto texto={texto} tamano={40} familia="enfasis" /></div> : null);

/** Circulo con icono: la misma pieza en listas, pasos y tarjetas. */
const Disco = ({ nombre, tamano = 76, color }) => {
  const { colores } = useMarca();
  const c = color ?? colores.acento;
  return (
    <div style={{ width: tamano, height: tamano, flex: 'none', borderRadius: '50%', display: 'grid', placeItems: 'center', background: conAlfa(c, 0.13), border: `1.5px solid ${conAlfa(c, 0.4)}` }}>
      <Icono nombre={nombre} tamano={tamano * 0.5} color={c} />
    </div>
  );
};

// `ya: true`: el item viene de un beat anterior (una lista partida para no pasar de 5 s) y entra con el panel.
const retardoItem = (b, i) => (b.items[i]?.ya ? 0 : b.itemsCuadros?.[i] != null ? b.itemsCuadros[i] : 8 + i * (b.paso ?? 12));

/** Lista que aparece item por item (con un tick cada uno). */
export const Lista = ({ b, ancho, alto }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tamano = b.items.length > 3 ? 38 : 44;
  return (
    <Vidrio ancho={ancho} alto={alto} relleno={44}>
      <Titulo texto={b.titulo} a={resorte(frame, 0, fps)} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: b.items.length > 3 ? 20 : 30 }}>
        {b.items.map((it, i) => {
          const a = resorte(frame, retardoItem(b, i), fps);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 26, ...subir(a) }}>
              <Disco nombre={it.icono ?? 'Check'} tamano={b.items.length > 3 ? 62 : 74} color={it.alerta ? undefined : undefined} />
              <Texto texto={it.texto} tamano={tamano} />
            </div>
          );
        })}
      </div>
    </Vidrio>
  );
};

/** Proceso por pasos: numeros unidos por una linea que se dibuja. */
export const Pasos = ({ b, ancho, alto }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const { colores } = marca;
  return (
    <Vidrio ancho={ancho} alto={alto} relleno={44}>
      <Titulo texto={b.titulo} a={resorte(frame, 0, fps)} />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 26 }}>
        {b.items.map((it, i) => {
          const a = resorte(frame, retardoItem(b, i), fps);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 26, ...subir(a) }}>
              <div style={{ ...fuente(marca.fuentes.enfasis), width: 64, height: 64, flex: 'none', borderRadius: 18, display: 'grid', placeItems: 'center', fontSize: 32, color: marca.claro ? '#FFFFFF' : colores.fondo, background: colores.acento }}>{i + 1}</div>
              <Texto texto={it.texto} tamano={40} />
              {it.icono ? <span style={{ marginLeft: 'auto' }}><Icono nombre={it.icono} tamano={40} color={colores.tenue} /></span> : null}
            </div>
          );
        })}
      </div>
    </Vidrio>
  );
};

const formatoNumero = (n) => Math.round(n).toLocaleString('es-CO');

/**
 * Una cifra que cuenta hasta su valor. Con `puntos`, dibuja esa cantidad de
 * puntos: cuando dice "doscientos procesos", en pantalla hay doscientos.
 */
export const Cifra = ({ b, ancho, alto }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const { colores } = marca;
  const a = resorte(frame, 0, fps);
  const cuenta = interpolate(frame, [2, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => 1 - (1 - t) ** 3 });
  const valor = b.valor * cuenta;
  const puntos = b.puntos ?? 0;
  const columnas = puntos > 100 ? 25 : puntos > 30 ? 12 : 8;
  // El lado del punto sale del espacio que queda: 200 puntos tienen que caber enteros, no cortados.
  const filas = Math.ceil(puntos / columnas) || 1;
  const lado = Math.max(6, Math.min(34, (ancho - 88) / columnas - 6, (alto - 330) / filas - 6));
  return (
    <Vidrio ancho={ancho} alto={alto} relleno={44}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22, ...subir(a) }}>
        {b.icono ? <Disco nombre={b.icono} tamano={70} /> : null}
        <Texto texto={b.titulo ?? ''} tamano={34} color={colores.tenue} />
      </div>
      <div style={{ ...fuente(marca.fuentes.titulo), fontSize: puntos ? 120 : 170, lineHeight: 1, color: colores.acento, margin: '22px 0 10px', letterSpacing: '-0.02em', ...subir(resorte(frame, ESCALON, fps)) }}>
        {b.prefijo ?? ''}
        {formatoNumero(valor)}
        <span style={{ fontSize: puntos ? 60 : 80, color: colores.tinta }}>{b.sufijo ?? ''}</span>
      </div>
      {b.etiqueta ? <div style={subir(resorte(frame, ESCALON * 2, fps))}><Texto texto={b.etiqueta} tamano={40} /></div> : null}
      {puntos ? (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columnas}, ${lado}px)`, gap: 6, marginTop: 22 }}>
          {Array.from({ length: puntos }, (_, i) => {
            const t = interpolate(frame, [4 + (i / puntos) * 22, 8 + (i / puntos) * 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            return <span key={i} style={{ width: lado, height: lado, borderRadius: b.forma === 'cuadro' ? 6 : '50%', background: i < (b.resaltados ?? 0) ? colores.acento : conAlfa(colores.tinta, 0.28), opacity: t, transform: `scale(${0.4 + 0.6 * t})` }} />;
          })}
        </div>
      ) : null}
    </Vidrio>
  );
};

/** Antes / despues, o dos caminos: dos columnas que entran una tras otra. */
export const Comparativa = ({ b, ancho, alto }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const { colores } = marca;
  const columnas = [b.izquierda, b.derecha];
  const ancho1 = (ancho - 88 - 24) / 2;
  return (
    <Vidrio ancho={ancho} alto={alto} relleno={44}>
      <Titulo texto={b.titulo} a={resorte(frame, 0, fps)} />
      <div style={{ display: 'flex', gap: 24, height: b.titulo ? 'calc(100% - 80px)' : '100%' }}>
        {columnas.map((c, k) => {
          const a = resorte(frame, (b.columnasCuadros?.[k] ?? (k ? 22 : 10)), fps);
          const bien = c.tono === 'bien';
          const color = bien ? colores.acento : colores.tenue;
          return (
            <div key={k} style={{ width: ancho1, borderRadius: 24, padding: 28, boxSizing: 'border-box', background: bien ? conAlfa(colores.acento, 0.1) : conAlfa(colores.tinta, 0.05), border: `1.5px solid ${bien ? conAlfa(colores.acento, 0.45) : colores.linea}`, ...subir(a) }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <Icono nombre={c.icono ?? (bien ? 'CircleCheck' : 'CircleX')} tamano={40} color={color} />
                <Texto texto={c.titulo} tamano={34} familia="enfasis" color={color} />
              </div>
              {(c.items ?? []).map((t, i) => (
                <div key={i} style={{ marginBottom: 14, ...subir(resorte(frame, (b.columnasCuadros?.[k] ?? (k ? 22 : 10)) + (i + 1) * ESCALON, fps)) }}>
                  <Texto texto={t} tamano={c.items.length > 2 ? 30 : 36} />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </Vidrio>
  );
};

/** Cita textual: comillas grandes, frase y quien la dijo. */
export const Cita = ({ b, ancho, alto }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  return (
    <Vidrio ancho={ancho} alto={alto} relleno={52}>
      <div style={subir(resorte(frame, 0, fps))}>
        <Icono nombre="Quote" tamano={64} />
      </div>
      <div style={{ margin: '18px 0 26px', ...subir(resorte(frame, ESCALON, fps)) }}>
        <Texto texto={b.texto} tamano={b.texto.length > 70 ? 44 : 54} familia="titulo" />
      </div>
      {b.autor ? <div style={subir(resorte(frame, ESCALON * 2, fps))}><Texto texto={`— ${b.autor}`} tamano={32} color={marca.colores.tenue} /></div> : null}
    </Vidrio>
  );
};

/** Una idea en una tarjeta: icono grande, titulo y bajada. */
export const Tarjeta = ({ b, ancho, alto }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const color = b.alerta ? marca.colores.alerta : undefined;
  return (
    <Vidrio ancho={ancho} alto={alto} relleno={48} estilo={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={subir(resorte(frame, 0, fps))}>
        <Disco nombre={b.icono ?? 'Lightbulb'} tamano={104} color={color} />
      </div>
      <div style={{ marginTop: 28, ...subir(resorte(frame, ESCALON, fps)) }}>
        <Texto texto={b.titulo} tamano={b.titulo.length > 40 ? 50 : 62} familia="titulo" />
      </div>
      {b.texto ? <div style={{ marginTop: 18, ...subir(resorte(frame, ESCALON * 2, fps)) }}><Texto texto={b.texto} tamano={36} color={marca.colores.tenue} /></div> : null}
    </Vidrio>
  );
};

/** Libro: portada con lomo y sombra, titulo y autora al lado. */
export const Libro = ({ b, ancho, alto }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const { colores } = marca;
  const a = resorte(frame, 0, fps);
  const alturaLibro = alto - 110;
  return (
    <Vidrio ancho={ancho} alto={alto} relleno={52} estilo={{ display: 'flex', alignItems: 'center', gap: 44 }}>
      <div style={{ ...subir(a, 24), flex: 'none', position: 'relative', width: alturaLibro * 0.66, height: alturaLibro, borderRadius: '6px 14px 14px 6px', background: `linear-gradient(145deg, ${colores.secundario ?? colores.acento}, ${colores.fondo})`, boxShadow: `18px 22px 40px rgba(0,0,0,.45), inset 10px 0 0 ${conAlfa('#000000', 0.25)}`, padding: '34px 26px 30px 36px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
        <div style={{ width: 54, height: 4, background: colores.acento, marginBottom: 22 }} />
        <span style={{ ...fuente(marca.fuentes.titulo), color: '#FFFFFF', fontSize: 34, lineHeight: 1.1 }}>{b.portada ?? b.titulo}</span>
        <span style={{ ...fuente(marca.fuentes.texto), color: conAlfa('#FFFFFF', 0.75), fontSize: 20, marginTop: 'auto' }}>{b.autor}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={subir(resorte(frame, ESCALON * 2, fps))}><Texto texto={b.etiqueta ?? 'Libro'} tamano={26} color={colores.tenue} estilo={{ textTransform: 'uppercase', letterSpacing: '0.1em' }} /></div>
        <div style={subir(resorte(frame, ESCALON * 3, fps))}><Texto texto={b.titulo} tamano={46} familia="titulo" /></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, ...subir(resorte(frame, ESCALON * 4, fps)) }}>
          <Disco nombre="UserRound" tamano={60} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Texto texto={b.autor} tamano={34} familia="enfasis" />
            {b.rol ? <Texto texto={b.rol} tamano={26} color={colores.tenue} /> : null}
          </div>
        </div>
      </div>
    </Vidrio>
  );
};

/**
 * "El contrato vive en el correo de alguien": un documento que entra y se
 * pierde entre correos que van llegando encima, cada uno un poco corrido.
 */
export const Correos = ({ b, ancho, alto }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const { colores } = marca;
  const correos = b.correos ?? ['RE: RE: contrato', 'FW: versión final', 'contrato_v3_FINAL.pdf', 'RE: ¿quién lo tiene?', 'FW: firmado (2)'];
  const doc = resorte(frame, 0, fps);
  const perdido = interpolate(frame, [18, 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <Vidrio ancho={ancho} alto={alto} relleno={40}>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <div style={{ position: 'absolute', left: ancho / 2 - 150, top: 40, width: 220, height: 280, borderRadius: 16, background: colores.fondo2, border: `2px solid ${colores.acento}`, padding: 22, boxSizing: 'border-box', ...subir(doc), opacity: Math.min(1, doc * 1.4) * (1 - perdido * 0.55), filter: perdido > 0 ? `blur(${perdido * 3}px)` : undefined }}>
          <Icono nombre="FileText" tamano={56} />
          {[0.9, 0.7, 0.8, 0.5].map((w, i) => <div key={i} style={{ height: 10, borderRadius: 5, marginTop: 16, width: `${w * 100}%`, background: conAlfa(colores.tinta, 0.25) }} />)}
        </div>
        {correos.map((c, i) => {
          const a = resorte(frame, 10 + i * 5, fps);
          const r = (k) => random(`correo-${i}-${k}`);
          return (
            <div key={i} style={{ position: 'absolute', left: 20 + r('x') * (ancho - 520), top: 30 + i * ((alto - 190) / correos.length), width: 440, display: 'flex', alignItems: 'center', gap: 16, padding: '16px 22px', borderRadius: 16, background: marca.claro ? '#FFFFFF' : colores.fondo2, border: `1px solid ${colores.linea}`, boxShadow: '0 12px 30px rgba(0,0,0,.28)', transform: `translateY(${(1 - a) * 16}px) rotate(${(r('g') - 0.5) * 6}deg)`, opacity: Math.min(1, a * 1.4) }}>
              <Icono nombre="Mail" tamano={34} color={colores.tenue} />
              <Texto texto={c} tamano={27} />
            </div>
          );
        })}
      </div>
    </Vidrio>
  );
};

/**
 * "Te lo inventa con toda la seguridad del mundo": un dato que se ve perfecto
 * y, al acercarse, esta vacio. El acercamiento es lento (no un zoom brusco) y
 * el contenido se deshace en lineas punteadas.
 */
export const Espejismo = ({ b, ancho, alto }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const { colores } = marca;
  const a = resorte(frame, 0, fps);
  const cerca = interpolate(frame, [16, 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => t * t * (3 - 2 * t) });
  const lineas = b.lineas ?? ['Sentencia 2019-00412', 'Sala de Casación Civil', 'Magistrado ponente: —', '“…el deber de diligencia…”'];
  return (
    <Vidrio ancho={ancho} alto={alto} relleno={44}>
      <div style={{ ...subir(a), transform: `translateY(${(1 - a) * 16}px) scale(${1 + cerca * 0.14})`, transformOrigin: '50% 40%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <Icono nombre="BadgeCheck" tamano={44} color={cerca > 0.5 ? colores.tenue : colores.acento} />
          <Texto texto={cerca > 0.5 ? (b.vacio ?? 'No existe') : (b.etiqueta ?? 'Fuente verificada')} tamano={30} familia="enfasis" color={cerca > 0.5 ? colores.alerta : colores.acento} />
        </div>
        {lineas.map((l, i) => {
          const d = Math.min(1, Math.max(0, cerca * 1.6 - i * 0.15));
          return (
            <div key={i} style={{ position: 'relative', height: i ? 58 : 76, marginBottom: 10 }}>
              <div style={{ opacity: 1 - d }}><Texto texto={l} tamano={i ? 36 : 48} familia={i ? 'texto' : 'titulo'} /></div>
              <div style={{ position: 'absolute', left: 0, top: '40%', height: 14, width: `${(i ? 70 : 90) - i * 6}%`, borderRadius: 8, border: `2px dashed ${conAlfa(colores.tinta, 0.35)}`, opacity: d }} />
            </div>
          );
        })}
      </div>
    </Vidrio>
  );
};

/** Hueco de una demo: color plano con el marcador encima, hasta que llegue la captura real. */
export const Pantalla = ({ b, ancho, alto }) => {
  // Hueco de demo ya resuelto: la app real (escena "app") o una escena animada del kit.
  if (b.escena) return <Escena b={b} ancho={ancho} alto={alto} />;
  const marca = useMarca();
  const { colores } = marca;
  return (
    <div style={{ width: ancho, height: alto, borderRadius: 28, background: conAlfa(colores.acento, 0.2), border: `3px dashed ${colores.acento}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 40, boxSizing: 'border-box', textAlign: 'center' }}>
      <Icono nombre="MonitorPlay" tamano={72} />
      <Texto texto={`[Pantalla: ${b.texto}]`} tamano={44} familia="enfasis" />
      <Texto texto={b.detalle ?? ''} tamano={30} color={colores.tenue} />
    </div>
  );
};

/**
 * El certificado de Trifuerza Academy, tal cual el real, con el sello de "gratis":
 * para cuando se nombra la clase. Los datos salen de la marca (montaje.certificado).
 */
export const CertificadoBeat = ({ ancho, alto }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const c = marca.montaje?.certificado;
  if (!c) return null;
  const a = resorte(frame, 0, fps);
  const ancho2 = Math.min(ancho, alto * (1154 / 815));
  const sello = spring({ frame: frame - 26, fps, config: { damping: 9, stiffness: 240, mass: 0.6 } });
  const sobreAcento = marca.claro || marca.id === 'contrappto' ? '#FFFFFF' : marca.colores.fondo;
  return (
    <div style={{ width: ancho, height: alto, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', ...subir(a, 40), filter: 'drop-shadow(0 24px 48px rgba(0,0,0,.45))' }}>
        <Hoja c={c} ancho={ancho2} desde={2} />
        <div style={{ position: 'absolute', right: -18, top: -28, transform: `rotate(${8 - (1 - sello) * 30}deg) scale(${Math.max(0, sello)})`, padding: '12px 22px', borderRadius: 999, background: marca.colores.acento, boxShadow: `0 12px 30px ${conAlfa(marca.colores.acento, 0.45)}`, whiteSpace: 'nowrap' }}>
          <span style={{ ...fuente(marca.fuentes.enfasis), fontSize: 28, color: sobreAcento, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{c.sello}</span>
        </div>
      </div>
    </div>
  );
};

export const BEATS = { certificado: CertificadoBeat, lista: Lista, pasos: Pasos, cifra: Cifra, comparativa: Comparativa, cita: Cita, tarjeta: Tarjeta, libro: Libro, correos: Correos, espejismo: Espejismo, pantalla: Pantalla, escena: Escena };
