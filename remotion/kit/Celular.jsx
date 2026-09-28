import { icons } from 'lucide-react';
import React from 'react';
import { OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { fuente } from '../fuentes.js';
import { conAlfa, partirPalabras } from '../util.js';
import { aparece, cuandoItem, entra, pulso } from './movimiento.js';
import { useTema } from './tema.js';

/**
 * La app real dentro de un celular 3D (grabacion de pantalla de Juan David).
 *
 * `b.app`: { archivo, desde, hasta?, recorte: [arriba, abajo] (fraccion a quitar:
 * barra de estado y del navegador), tapar: [{ x, y, w, h, texto? }] (fracciones
 * de la grabacion) }. Lo que se tapa son datos reales (nombres, direcciones):
 * se cubre con el color de la app y, si hay `texto`, con un rotulo generico en
 * el mismo estilo, para que no se note el parche.
 *
 * `b.items`: rotulos que salen al costado del celular cuando se dicen, unidos
 * con una linea al telefono. El celular entra girando (rotateY 28° -> 8°), flota
 * y tiene un halo del acento detras.
 */
export const App = ({ b, ancho, alto }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTema(b);
  const app = b.app ?? {};
  const [quitaArriba, quitaAbajo] = app.recorte ?? [0.065, 0.12];
  const proporcion = app.proporcion ?? 1566 / 720; // alto / ancho de la grabacion
  const altoTel = alto - 16;
  const anchoPantalla = (altoTel - 28) / (proporcion * (1 - quitaArriba - quitaAbajo));
  const anchoTel = anchoPantalla + 28;
  const altoGrab = anchoPantalla * proporcion;
  const a = entra(frame, 0, fps, { stiffness: 140, damping: 18 });
  const flota = Math.sin(frame / 28) * 6;
  const giro = 28 - 20 * Math.min(1, a) + Math.sin(frame / 60) * 3;
  const items = b.items ?? [];
  const izq = b.lado === 'derecha' ? ancho - anchoTel - 20 : 20;
  return (
    <div style={{ position: 'relative', width: ancho, height: alto }}>
      {/* Halo detras del telefono */}
      <div style={{ position: 'absolute', left: izq + anchoTel / 2 - 260, top: alto / 2 - 260, width: 520, height: 520, borderRadius: '50%', background: `radial-gradient(circle, ${conAlfa(t.acento, 0.35 * pulso(frame, 70, 0.6, 1))} 0%, ${conAlfa(t.acento, 0)} 65%)` }} />
      <div style={{ position: 'absolute', left: izq, top: 8, perspective: 1600 }}>
        <div
          style={{
            width: anchoTel,
            height: altoTel,
            borderRadius: 46,
            padding: 14,
            boxSizing: 'border-box',
            background: 'linear-gradient(145deg, #2A3444, #0B1018)',
            boxShadow: `0 40px 90px rgba(0,0,0,.6), 0 0 0 2px ${conAlfa('#FFFFFF', 0.08)}, inset 0 0 0 2px ${conAlfa('#FFFFFF', 0.06)}`,
            transform: `rotateY(${b.lado === 'derecha' ? giro : -giro}deg) rotateX(4deg) translateY(${(1 - a) * 80 + flota}px) scale(${0.85 + 0.15 * Math.min(1, a)})`,
            opacity: Math.min(1, a * 1.5),
          }}
        >
          <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 34, overflow: 'hidden', background: '#07141D' }}>
            <div style={{ position: 'absolute', left: 0, top: -altoGrab * quitaArriba, width: anchoPantalla, height: altoGrab }}>
              <OffthreadVideo src={staticFile(app.archivo ?? 'app/2026-10/contrappto.mp4')} trimBefore={Math.round((app.desde ?? 0) * fps)} playbackRate={app.velocidad ?? 1} muted style={{ width: '100%', height: '100%' }} />
              {(app.tapar ?? []).map((r, i) => (
                <div key={i} style={{ position: 'absolute', left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%`, background: r.fondo ?? '#0D1F2B', borderRadius: 6, display: 'flex', alignItems: 'center', padding: '0 6px', boxSizing: 'border-box' }}>
                  {r.texto ? <span style={{ ...fuente(t.marca.fuentes.enfasis), fontSize: anchoPantalla * 0.042, color: r.color ?? '#F0F6FC', whiteSpace: 'nowrap' }}>{r.texto}</span> : null}
                </div>
              ))}
            </div>
            {/* Isla dinamica y reflejo de vidrio */}
            <div style={{ position: 'absolute', top: 8, left: '50%', width: anchoPantalla * 0.3, height: 20, marginLeft: -anchoPantalla * 0.15, borderRadius: 12, background: '#000' }} />
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(115deg, ${conAlfa('#FFFFFF', 0.08)} 0%, transparent 35%)` }} />
          </div>
        </div>
      </div>
      {/* Rotulos que salen cuando se dicen */}
      <div style={{ position: 'absolute', left: b.lado === 'derecha' ? 20 : izq + anchoTel + 40, right: b.lado === 'derecha' ? anchoTel + 60 : 20, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18 }}>
        {b.titulo ? <div style={{ ...fuente(t.marca.fuentes.titulo), fontSize: 36, lineHeight: 1.12, color: t.tinta, ...aparece(entra(frame, 6, fps), { y: 12 }) }}>{partirPalabras(b.titulo).map((p, i) => <span key={i} style={{ color: p.enfasis ? t.acentoTexto : undefined }}>{i ? ' ' : ''}{p.texto}</span>)}</div> : null}
        {items.map((it, i) => {
          const ai = entra(frame, cuandoItem(b, i, 12, 14), fps);
          if (ai <= 0.001) return null;
          const C = icons[it.icono] ?? icons.Sparkles;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 16, background: conAlfa(t.panel, 0.94), border: `1.5px solid ${conAlfa(t.acento, 0.4)}`, boxShadow: `0 14px 36px rgba(0,0,0,.35), 0 0 ${18 * pulso(frame, 50, 0.3, 1, i * 10)}px ${conAlfa(t.acento, 0.25)}`, ...aparece(ai, { x: b.lado === 'derecha' ? 24 : -24, y: 0 }) }}>
              <C size={28} strokeWidth={1.9} color={t.acentoTexto} absoluteStrokeWidth />
              <span style={{ ...fuente(t.marca.fuentes.enfasis), fontSize: 24, color: t.tinta }}>{it.texto}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
