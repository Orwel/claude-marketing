import React from 'react';
import { Img, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { fuente } from '../fuentes.js';
import { avance } from '../graficos/base.jsx';

/**
 * El certificado real de Trifuerza Academy (Juan David, 6-oct-2026): panel oscuro
 * a la izquierda con el logo y los datos, hoja clara a la derecha con el titulo,
 * el nombre en serif, el curso con barra naranja, la firma y el QR. Se dibuja a
 * 1154×815 (la proporcion del PDF) y se escala al ancho pedido: asi el texto
 * conserva sus proporciones en cualquier formato.
 *
 * Textos y colores vienen de la marca (montaje.certificado): la plantilla no los
 * conoce. El nombre se escribe letra a letra para que quien lo ve se imagine el suyo.
 */
const ANCHO = 1154;
const ALTO = 815;

// QR de mentira pero con cara de QR: 25×25 modulos, los tres ojos y un relleno fijo
// (pseudoaleatorio con semilla: el mismo dibujo en todos los cuadros).
const MODULOS = 25;
const QR = (() => {
  const ojo = (x, y) => (x >= 0 && x < 7 && y >= 0 && y < 7 ? (x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4) ? 1 : 0) : null);
  let s = 20261027;
  const azar = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const celdas = [];
  for (let y = 0; y < MODULOS; y++) {
    for (let x = 0; x < MODULOS; x++) {
      const v = ojo(x, y) ?? ojo(x - (MODULOS - 7), y) ?? ojo(x, y - (MODULOS - 7));
      const separador = (x <= 7 && y <= 7) || (x >= MODULOS - 8 && y <= 7) || (x <= 7 && y >= MODULOS - 8);
      const lleno = v != null ? v === 1 : !separador && azar() > 0.52;
      if (lleno) celdas.push([x, y]);
    }
  }
  return celdas;
})();

export const Certificado = ({ c, ancho = 700, desde = 0 }) => {
  const frame = useCurrentFrame() - desde;
  const { fps } = useVideoConfig();
  const k = ancho / ANCHO;
  const col = c.colores;
  const r = (d, cfg = { damping: 18, stiffness: 170, mass: 0.7 }) => spring({ frame: frame - d, fps, config: cfg });
  const entra = (d, y = 18) => {
    const a = r(d);
    return { opacity: Math.min(1, a * 1.4), transform: `translateY(${(1 - a) * y}px)` };
  };
  // El nombre se escribe entre los cuadros 16 y 40, con cursor que parpadea mientras escribe.
  const letras = Math.round(c.nombre.length * avance(frame, 16, 24));
  const escribiendo = letras < c.nombre.length;
  const barra = avance(frame, 30, 12);
  const brillo = ((frame - 46) % 110) / 110;

  return (
    <div style={{ width: ANCHO * k, height: ALTO * k, position: 'relative' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: ANCHO, height: ALTO, transform: `scale(${k})`, transformOrigin: '0 0', borderRadius: 18, overflow: 'hidden', background: col.hoja, display: 'flex' }}>
        {/* Panel izquierdo: noche con dos resplandores (naranja arriba, azul abajo), como en el PDF. */}
        <div style={{ position: 'relative', width: 357, height: ALTO, background: col.panel, overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ position: 'absolute', right: -140, top: -150, width: 420, height: 420, borderRadius: '50%', background: `radial-gradient(circle, ${col.resplandor1} 0%, transparent 65%)`, opacity: 0.85 }} />
          <div style={{ position: 'absolute', left: -170, bottom: -170, width: 520, height: 520, borderRadius: '50%', background: `radial-gradient(circle, ${col.resplandor2} 0%, transparent 65%)`, opacity: 0.9 }} />
          <Img src={staticFile(c.logo)} style={{ position: 'absolute', left: 38, top: 72, height: 58, width: 'auto', ...entra(4, 10) }} />
          <div style={{ position: 'absolute', left: 40, bottom: 60, display: 'flex', flexDirection: 'column', gap: 34 }}>
            {c.datos.map((d, i) => (
              <div key={d.etiqueta} style={entra(10 + i * 5, 14)}>
                <div style={{ ...fuente({ familia: 'Inter', peso: 700 }), fontSize: 13, letterSpacing: '0.24em', textTransform: 'uppercase', color: col.etiqueta }}>{d.etiqueta}</div>
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ ...fuente({ familia: 'Sora', peso: 700 }), fontSize: 36, color: '#FFFFFF', letterSpacing: '-0.02em' }}>{d.valor}</span>
                  {d.extra ? <span style={{ ...fuente({ familia: 'Inter', peso: 400 }), fontSize: 19, color: col.tenueOscuro }}>{d.extra}</span> : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hoja clara: el isotipo grande y desvanecido arriba a la derecha, recortado por el borde. */}
        <div style={{ position: 'relative', flex: 1, height: ALTO, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -190, top: -30, width: 560, height: 400, overflow: 'hidden', opacity: 0.32 * Math.min(1, r(6)), transform: `rotate(${(1 - r(6)) * -10}deg)` }}>
            <Img src={staticFile(c.isotipo)} style={{ width: 760, height: 'auto', marginLeft: -100, marginTop: 0 }} />
          </div>
          <div style={{ position: 'absolute', left: 58, top: 66, width: 680 }}>
            <div style={{ ...fuente({ familia: 'Sora', peso: 700 }), fontSize: 15, letterSpacing: '0.32em', textTransform: 'uppercase', color: col.academia, ...entra(6) }}>{c.academia}</div>
            <div style={{ ...fuente({ familia: 'Sora', peso: 700 }), fontSize: 52, lineHeight: 1.05, marginTop: 10, color: col.tinta, letterSpacing: '-0.025em', ...entra(9, 24) }}>{c.titulo}</div>
            <div style={{ ...fuente({ familia: 'Inter', peso: 400 }), fontSize: 17, color: col.tenue, marginTop: 44, ...entra(13) }}>Se certifica a</div>
            <div style={{ ...fuente({ familia: 'Fraunces', peso: 700 }), fontSize: 56, lineHeight: 1.1, marginTop: 8, color: col.tinta, minHeight: 64, whiteSpace: 'nowrap' }}>
              {c.nombre.slice(0, letras)}
              <span style={{ display: 'inline-block', width: 3, height: 50, marginLeft: 4, background: col.tinta, verticalAlign: '-4px', opacity: escribiendo && frame >= 14 && Math.floor(frame / 4) % 2 === 0 ? 1 : 0 }} />
            </div>
            <div style={{ ...fuente({ familia: 'Inter', peso: 400 }), fontSize: 17, color: col.tenue, marginTop: 16, ...entra(28) }}>{c.motivo}</div>
            <div style={{ position: 'relative', marginTop: 12, paddingLeft: 20, ...entra(30) }}>
              <div style={{ position: 'absolute', left: 0, top: 2, width: 4, height: 34 * barra, borderRadius: 2, background: col.barra }} />
              <div style={{ ...fuente({ familia: 'Sora', peso: 600 }), fontSize: 27, color: col.tinta, letterSpacing: '-0.01em' }}>{c.curso}</div>
            </div>
            <div style={{ ...fuente({ familia: 'Inter', peso: 400 }), fontSize: 17, color: col.tenue, marginTop: 14, ...entra(33) }}>{c.fecha}</div>
          </div>

          {/* Firma con la linea que se traza. */}
          <div style={{ position: 'absolute', left: 58, top: 620, ...entra(36) }}>
            <div style={{ ...fuente({ familia: 'Fraunces', peso: 600 }), fontSize: 22, color: col.tinta }}>{c.firma}</div>
            <div style={{ width: 218 * avance(frame, 38, 14), height: 1.5, background: col.tinta, marginTop: 8 }} />
            <div style={{ ...fuente({ familia: 'Inter', peso: 400 }), fontSize: 14, color: col.tenue, marginTop: 14, letterSpacing: '0.04em' }}>{c.cargo}</div>
          </div>

          {/* QR: los modulos aparecen en barrido diagonal. */}
          <div style={{ position: 'absolute', right: 62, top: 588, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <svg width={72} height={72} viewBox={`0 0 ${MODULOS} ${MODULOS}`} shapeRendering="crispEdges">
              {QR.map(([x, y]) => (
                <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={col.tinta} opacity={frame >= 34 + (x + y) * 0.35 ? 1 : 0} />
              ))}
            </svg>
            <div style={{ ...fuente({ familia: 'Inter', peso: 400 }), fontSize: 12.5, color: col.tenue, marginTop: 14, ...entra(44, 8) }}>{c.numero}</div>
          </div>
          {/* Brillo que cruza la hoja clara cada ~3,5 s, ya terminada: la hace sentir papel de verdad. Solo la hoja: sobre el panel oscuro quedaba como una mancha. */}
          {frame > 46 ? (
            <div style={{ position: 'absolute', top: -100, left: -300 + brillo * 1400, width: 180, height: ALTO + 200, transform: 'skewX(-18deg)', background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.7) 50%, rgba(255,255,255,0) 100%)', pointerEvents: 'none' }} />
          ) : null}
          <div style={{ position: 'absolute', left: 58, bottom: 36, ...fuente({ familia: 'Inter', peso: 400 }), fontSize: 13, color: col.tenue, ...entra(46, 8) }}>{c.verificable}</div>
        </div>

      </div>
    </div>
  );
};
