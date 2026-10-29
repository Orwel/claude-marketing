import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { icons } from 'lucide-react';
import { useFuentes } from '../fuentes.js';
import { Globo, kmEntre } from './Globo.jsx';
import { Kicker, Mono } from './Trailer.jsx';

/**
 * Remontaje de una clase grabada (clases/<slug>.json → remontaje): lo que va ENCIMA de la clase lineal
 * para darle ritmo, en el lenguaje de la presentación y del tráiler de viaje.
 *
 *   SaltoParada    → al cambiar de parada, el avión vuela por el planeta y aterriza con el tema en grande
 *   VentanaClaude  → Claude dibujado (no grabado): tapa la pantalla real cuando se habla de una función,
 *                    y también donde la grabación muestra proyectos o chats privados
 *
 * src/clase/remontaje.js las renderiza y las pega sobre la clase con ffmpeg.
 */
const RES = { stiffness: 240, damping: 24 };
const useEntrada = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (d, config = RES) => spring({ frame: frame - d, fps, config });
};

// ---------------------------------------------------------------------------------------------
// Salto de parada

export const duracionSalto = 4.4;

export const SaltoParada = ({ clase, de, a }) => {
  useFuentes();
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const T = clase.tema;
  const mapa = clase.remontaje.mapa;
  const pa = clase.paradas[a];
  const codDe = clase.paradas[de].codigo;
  const codA = pa.codigo;
  const VUELO = 1.8;
  const quieto = 0.35;
  // El globo: medio segundo orbitando la parada anterior y luego el vuelo a la nueva.
  const escenas = [
    { parada: codDe, dura: quieto, vista: 'lejos' },
    { parada: codA, dura: duracionSalto - quieto, vuelo: VUELO, vista: 'cerca', off: [-0.2, 0] },
  ];
  const vuelo = Math.round((quieto + VUELO) * fps);
  const u = interpolate(frame, [quieto * fps, vuelo], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const hud = interpolate(frame, [0, 6, vuelo + 2, vuelo + 10], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const llega = (d, c = { stiffness: 260, damping: 20 }) => spring({ frame: frame - vuelo + 4 - d, fps, config: c });
  const entra = interpolate(frame, [0, 6], [0, 1], { extrapolateRight: 'clamp' });
  const sale = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const A = mapa[codDe];
  const B = mapa[codA];
  const palabras = pa.titulo.split(' ');
  const grande = /^\d{4}$/.test(pa.anio) ? pa.anio : null;
  return (
    <AbsoluteFill style={{ background: T.fondo, opacity: Math.min(entra, sale) }}>
      <Globo escenas={escenas} mapa={mapa} />
      <div style={{ position: 'absolute', top: 60, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: hud }}>
        <div style={{ background: `${T.fondo}e6`, border: `1.5px solid ${T.linea}`, borderRadius: 22, padding: '16px 30px', minWidth: 620 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, justifyContent: 'space-between' }}>
            <Mono style={{ fontSize: 28, color: T.tinta }}>{A.codigo} <span style={{ color: T.acento }}>→</span> {B.codigo}</Mono>
            <Mono style={{ fontSize: 20, color: T.tenue, letterSpacing: '0.08em' }}>{A.codigo === B.codigo ? 'aterrizaje' : `${kmEntre(A, B).toLocaleString('es-CO')} km`}</Mono>
          </div>
          <div style={{ marginTop: 12, height: 6, borderRadius: 3, background: T.linea, overflow: 'hidden' }}>
            <div style={{ width: `${u * 100}%`, height: '100%', background: T.acento }} />
          </div>
        </div>
      </div>
      {frame >= vuelo - 6 && (
        <>
          <AbsoluteFill style={{ background: `linear-gradient(90deg, ${T.fondo}f2 0%, ${T.fondo}a8 48%, transparent 72%)`, opacity: llega(0) }} />
          <div style={{ position: 'absolute', left: 140, top: grande ? 200 : 300, width: 1000 }}>
            <Kicker T={T} a={llega(0)}>{pa.etiqueta}</Kicker>
            {grande && (
              <div style={{ fontFamily: `'Space Grotesk'`, fontWeight: 700, fontSize: 220, lineHeight: 0.9, letterSpacing: '-0.04em', color: T.acento, marginTop: 26,
                opacity: llega(2), transform: `scale(${0.8 + 0.2 * llega(2, { stiffness: 320, damping: 14 })})`, transformOrigin: 'left' }}>{grande}</div>
            )}
            <div style={{ fontFamily: `'Space Grotesk'`, fontWeight: 700, fontSize: grande ? 84 : 96, lineHeight: 1.04, letterSpacing: '-0.03em', color: T.tinta, marginTop: grande ? 14 : 30,
              display: 'flex', flexWrap: 'wrap', columnGap: 22 }}>
              {palabras.map((p, i) => {
                const s = llega(5 + i * 2);
                return <span key={i} style={{ display: 'inline-block', opacity: s, transform: `translateY(${(1 - s) * 30}px)`, color: (pa.resalta ?? []).includes(p) ? T.acento : T.tinta }}>{p}</span>;
              })}
            </div>
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------
// Claude dibujado

// Colores de una interfaz tipo Claude en modo oscuro (aproximados, no la marca): papel cálido y acento terracota.
const C = { fondo: '#262624', panel: '#1f1e1d', borde: '#3a3936', tinta: '#f5f4ef', tenue: '#a6a39a', apagado: '#77746b', acento: '#d97757', burbuja: '#393937', ok: '#5fb27c' };

const Icono = ({ n, size = 18, color = C.tenue, style }) => {
  const I = icons[n] ?? icons.Circle;
  return <I size={size} color={color} strokeWidth={1.9} style={style} />;
};

/** Marco de ventana (como los MiniFrame de trifuerza.co/legal) con la barra lateral de Claude. */
const Ventana = ({ seccion, children, recientes }) => (
  <div style={{ position: 'absolute', inset: 0, background: C.fondo, borderRadius: 18, overflow: 'hidden', border: `1.5px solid ${C.borde}`, display: 'flex', flexDirection: 'column', fontFamily: `'Inter'` }}>
    <div style={{ height: 44, background: C.panel, borderBottom: `1px solid ${C.borde}`, display: 'flex', alignItems: 'center', padding: '0 18px', gap: 9 }}>
      {['#ff5f57', '#febc2e', '#28c840'].map((c) => <div key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c, opacity: 0.85 }} />)}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div style={{ background: C.fondo, border: `1px solid ${C.borde}`, borderRadius: 8, padding: '5px 60px', fontSize: 15, color: C.tenue }}>claude.ai</div>
      </div>
    </div>
    <div style={{ flex: 1, display: 'flex' }}>
      <div style={{ width: 290, background: C.panel, borderRight: `1px solid ${C.borde}`, padding: '22px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px 18px' }}>
          <Icono n="Sparkle" size={24} color={C.acento} />
          <span style={{ fontFamily: `'Space Grotesk'`, fontWeight: 700, fontSize: 24, color: C.tinta }}>Claude</span>
        </div>
        {[['Plus', 'Nuevo chat'], ['MessagesSquare', 'Chats'], ['FolderClosed', 'Proyectos'], ['Shapes', 'Artefactos']].map(([ic, t]) => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 10px', borderRadius: 10, background: seccion === t ? C.burbuja : 'transparent' }}>
            <Icono n={ic} color={seccion === t ? C.tinta : C.tenue} />
            <span style={{ fontSize: 17, color: seccion === t ? C.tinta : C.tenue, fontWeight: seccion === t ? 600 : 500 }}>{t}</span>
          </div>
        ))}
        <div style={{ fontSize: 13, color: C.apagado, padding: '20px 10px 8px', letterSpacing: '0.04em' }}>Recientes</div>
        {(recientes ?? ['Contrato de arrendamiento', 'Resumen de una sentencia', 'Correo a un cliente', 'Plan de clase']).map((t) => (
          <div key={t} style={{ fontSize: 15, color: C.tenue, padding: '7px 10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t}</div>
        ))}
      </div>
      <div style={{ flex: 1, position: 'relative' }}>{children}</div>
    </div>
  </div>
);

/** Texto que se escribe letra a letra entre los cuadros d y d + dura. */
const escrito = (txt, frame, d, dura) => txt.slice(0, Math.max(0, Math.round(((frame - d) / dura) * txt.length)));

const ModoChat = ({ e }) => {
  const frame = useCurrentFrame();
  const ent = useEntrada();
  const pregunta = escrito(e.pregunta, frame, 8, 40);
  const respondida = frame > 54;
  const palabras = (e.respuesta ?? '').split(' ');
  const n = Math.max(0, Math.floor((frame - 60) / 1.6));
  return (
    <div style={{ position: 'absolute', inset: 0, padding: '40px 120px', display: 'flex', flexDirection: 'column', gap: 28 }}>
      {respondida && (
        <div style={{ alignSelf: 'flex-end', background: C.burbuja, color: C.tinta, borderRadius: 18, padding: '16px 22px', fontSize: 21, maxWidth: 760, opacity: ent(54), lineHeight: 1.45 }}>{e.pregunta}</div>
      )}
      {respondida && (
        <div style={{ display: 'flex', gap: 16, color: C.tinta, fontSize: 21, lineHeight: 1.55, maxWidth: 980 }}>
          <Icono n="Sparkle" size={26} color={C.acento} style={{ flexShrink: 0, marginTop: 4, transform: `rotate(${frame * 3}deg)` }} />
          <div>{palabras.slice(0, n).join(' ')}</div>
        </div>
      )}
      <div style={{ position: 'absolute', left: 120, right: 120, bottom: 40, background: C.burbuja, border: `1.5px solid ${C.borde}`, borderRadius: 20, padding: '20px 24px', minHeight: 110 }}>
        <div style={{ fontSize: 21, color: respondida || pregunta ? C.tinta : C.apagado, lineHeight: 1.45 }}>
          {respondida ? '' : pregunta || '¿En qué te ayudo hoy?'}
          {!respondida && <span style={{ opacity: Math.floor(frame / 8) % 2 ? 1 : 0, color: C.acento }}>|</span>}
        </div>
        <div style={{ position: 'absolute', right: 18, bottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 15, color: C.tenue }}>{e.modelo ?? 'Claude Sonnet'}</span>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: C.acento, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icono n="ArrowUp" color="#fff" /></div>
        </div>
      </div>
    </div>
  );
};

/** Rejilla de tarjetas (proyectos o artefactos) con nombres genéricos: tapa los nombres reales. */
const ModoRejilla = ({ e }) => {
  const ent = useEntrada();
  const frame = useCurrentFrame();
  return (
    <div style={{ position: 'absolute', inset: 0, padding: '40px 56px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: `'Space Grotesk'`, fontWeight: 700, fontSize: 38, color: C.tinta }}>{e.titulo}</div>
        <div style={{ background: C.tinta, color: C.fondo, borderRadius: 10, padding: '10px 18px', fontSize: 16, fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Icono n="Plus" size={16} color={C.fondo} />{e.boton}
        </div>
      </div>
      <div style={{ fontSize: 18, color: C.tenue, marginTop: 10, maxWidth: 900, lineHeight: 1.45 }}>{e.texto}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22, marginTop: 34 }}>
        {e.tarjetas.map((t, i) => {
          const a = ent(6 + i * 4, { stiffness: 300, damping: 20 });
          // En las tapas largas la tarjeta resaltada va cambiando cada 5 s: la pantalla no se ve congelada.
          const sel = e.ciclo ? Math.floor(Math.max(0, frame - 50) / 150) % e.tarjetas.length : e.activa;
          const activa = sel === i && frame > 50;
          return (
            <div key={i} style={{ background: C.panel, border: `1.5px solid ${activa ? C.acento : C.borde}`, borderRadius: 16, padding: 20, minHeight: 150, opacity: a,
              transform: `translateY(${(1 - a) * 24}px) scale(${activa ? 1.03 : 1})`, boxShadow: activa ? `0 0 0 4px ${C.acento}33` : 'none' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${t.color ?? C.acento}26`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icono n={t.icono ?? 'FileText'} size={22} color={t.color ?? C.acento} />
              </div>
              <div style={{ fontSize: 20, fontWeight: 600, color: C.tinta, marginTop: 16 }}>{t.nombre}</div>
              <div style={{ fontSize: 15, color: C.tenue, marginTop: 6, lineHeight: 1.4 }}>{t.detalle}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Lista de interruptores (conectores, skills, plugins) que se van encendiendo. */
const ModoLista = ({ e }) => {
  const ent = useEntrada();
  const frame = useCurrentFrame();
  return (
    <div style={{ position: 'absolute', inset: 0, padding: '40px 70px' }}>
      <div style={{ fontFamily: `'Space Grotesk'`, fontWeight: 700, fontSize: 38, color: C.tinta }}>{e.titulo}</div>
      <div style={{ fontSize: 18, color: C.tenue, marginTop: 10, lineHeight: 1.45, maxWidth: 950 }}>{e.texto}</div>
      <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1000 }}>
        {e.items.map((it, i) => {
          const a = ent(6 + i * 5);
          const on = frame > 30 + i * 12;
          const k = spring({ frame: frame - (30 + i * 12), fps: 30, config: { stiffness: 400, damping: 22 } });
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 18, background: C.panel, border: `1.5px solid ${on ? `${C.acento}88` : C.borde}`, borderRadius: 14, padding: '16px 20px', opacity: a, transform: `translateX(${(1 - a) * 30}px)` }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, background: `${it.color ?? C.acento}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icono n={it.icono} size={24} color={it.color ?? C.acento} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: C.tinta }}>{it.nombre}</div>
                <div style={{ fontSize: 15, color: C.tenue, marginTop: 3 }}>{it.detalle}</div>
              </div>
              <div style={{ width: 58, height: 32, borderRadius: 16, background: on ? C.acento : C.burbuja, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 4, left: 4 + 26 * k, width: 24, height: 24, borderRadius: 12, background: '#fff' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Claude Code: una terminal donde se escribe el pedido y el agente va marcando pasos. */
const ModoCode = ({ e }) => {
  const frame = useCurrentFrame();
  const ent = useEntrada();
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#141413', padding: '40px 56px', fontFamily: `'JetBrains Mono'`, fontSize: 20, color: C.tinta, lineHeight: 1.7 }}>
      <div style={{ color: C.acento, fontWeight: 700 }}>✻ Claude Code</div>
      <div style={{ color: C.tenue }}>~/{e.carpeta ?? 'mi-proyecto'}</div>
      <div style={{ marginTop: 24 }}><span style={{ color: C.acento }}>&gt; </span>{escrito(e.pedido, frame, 6, 50)}</div>
      {e.pasos.map((p, i) => {
        const d = 64 + i * 22;
        const a = ent(d);
        const hecho = frame > d + 16;
        return (
          <div key={i} style={{ opacity: a, marginTop: 6, display: 'flex', gap: 14 }}>
            <span style={{ color: hecho ? C.ok : C.acento }}>{hecho ? '✓' : '●'}</span>
            <span style={{ color: hecho ? C.tinta : C.tenue }}>{p}</span>
          </div>
        );
      })}
    </div>
  );
};

const MODOS = { chat: ModoChat, rejilla: ModoRejilla, lista: ModoLista, code: ModoCode };

/**
 * Tarjeta de cabina (320×200, el hueco de la cámara): reemplaza la cara donde la voz y los labios no
 * cuadran del todo o la señal se congeló. Es un cuadro fijo; ffmpeg la pega en esos tramos.
 */
export const Cabina = ({ clase }) => {
  useFuentes();
  const T = clase.tema;
  const barras = [10, 22, 34, 18, 40, 26, 14, 30, 20, 12];
  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${T.fondo2} 0%, ${T.fondo} 100%)`, alignItems: 'center', justifyContent: 'center', gap: 12, fontFamily: `'Inter'` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 62, height: 62, borderRadius: 31, border: `3px solid ${T.acento}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${T.acento}1f` }}>
          <span style={{ fontFamily: `'Space Grotesk'`, fontWeight: 700, fontSize: 24, color: T.tinta }}>JD</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 44 }}>
          {barras.map((h, i) => <div key={i} style={{ width: 5, height: h, borderRadius: 3, background: i % 3 === 0 ? T.acento : T.cian, opacity: 0.85 }} />)}
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: `'Space Grotesk'`, fontWeight: 700, fontSize: 19, color: T.tinta }}>{clase.cartel.nombre}</div>
        <Mono style={{ fontSize: 11, color: T.acento, marginTop: 4, display: 'block' }}>Piloto · en cabina</Mono>
      </div>
    </AbsoluteFill>
  );
};

/** Claude dibujado sobre el hueco de la pantalla compartida (1600×900), con un rótulo de qué se ve. */
export const VentanaClaude = ({ clase, e }) => {
  useFuentes();
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const T = clase.tema;
  const Modo = MODOS[e.modo];
  const a = spring({ frame, fps: 30, config: { stiffness: 220, damping: 24 } });
  const sale = interpolate(frame, [durationInFrames - 9, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: T.fondo, opacity: sale }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 20% 10%, ${T.acento}22 0%, transparent 45%), radial-gradient(circle at 90% 90%, ${T.cian}18 0%, transparent 40%)` }} />
      <div style={{ position: 'absolute', left: 50, right: 50, top: 92, bottom: 30, opacity: a, transform: `translateY(${(1 - a) * 40}px) scale(${0.96 + 0.04 * a})` }}>
        <Ventana seccion={e.seccion}>{Modo && <Modo e={e} />}</Ventana>
      </div>
      <div style={{ position: 'absolute', left: 50, top: 26 }}>
        <Kicker T={T} a={spring({ frame: frame - 4, fps: 30, config: RES })}>{e.rotulo}</Kicker>
      </div>
    </AbsoluteFill>
  );
};
