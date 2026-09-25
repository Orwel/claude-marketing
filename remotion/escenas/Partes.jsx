import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Documento } from '../componentes/Iconos.jsx';
import { Persona } from '../componentes/Persona.jsx';
import { TextoCinetico } from '../componentes/TextoCinetico.jsx';
import { fuente } from '../fuentes.js';
import { useMarca } from '../marca.js';
import { Estallido } from './Golpe.jsx';

/**
 * Dos partes y un contrato en medio. El contrato va y viene entre ambas (el
 * ida y vuelta de versiones por correo) hasta que Contrappto cae en el centro
 * y lo sostiene: la idea de tercero neutral, dicha con imagen y no con texto.
 */
export const Partes = ({ titulo, izquierda = 'Arrendador', derecha = 'Arrendatario', centro = 'Tercero neutral', pulso = 15 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const { colores, radio } = marca;

  const entradaI = spring({ frame: frame - 6, fps, config: { damping: 12 } });
  const entradaD = spring({ frame: frame - 6 - pulso / 2, fps, config: { damping: 12 } });
  const llegada = 4 * pulso; // Contrappto cae en el cuarto pulso
  const caida = spring({ frame: frame - llegada, fps, config: { damping: 9, stiffness: 180 } });
  // El documento oscila entre las partes y se detiene en el centro cuando llega Contrappto.
  const vaiven = frame < llegada ? Math.sin(((frame - 10) / (pulso * 2)) * Math.PI * 2) * 260 : interpolate(frame, [llegada, llegada + 8], [Math.sin(((llegada - 10) / (pulso * 2)) * Math.PI * 2) * 260, 0], { extrapolateRight: 'clamp' });
  const docY = frame < llegada ? -Math.abs(Math.cos(((frame - 10) / (pulso * 2)) * Math.PI * 2)) * 60 : interpolate(frame, [llegada, llegada + 8], [0, -170], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ alignItems: 'center', paddingTop: 300 }}>
      <div style={{ width: 920 }}>
        <TextoCinetico texto={titulo} tamano={84} desde={2} alineacion="center" />
      </div>
      <div style={{ position: 'relative', width: 1080, height: 900, marginTop: 40 }}>
        <Etiquetada x={200} y={430} avance={entradaI} texto={izquierda}>
          <Persona tamano={250} ropa={colores.acento} variante={0} />
        </Etiquetada>
        <Etiquetada x={880} y={430} avance={entradaD} texto={derecha}>
          <Persona tamano={250} ropa={colores.alerta} piel="#C68B5E" pelo="#16110E" variante={1} />
        </Etiquetada>

        {/* documento viajero */}
        <div style={{ position: 'absolute', left: 540 + vaiven, top: 330 + docY, transform: `translate(-50%, -50%) rotate(${vaiven / 20}deg)`, opacity: entradaD }}>
          <div style={{ width: 130, height: 160, background: colores.tinta, borderRadius: 14, display: 'grid', placeItems: 'center', boxShadow: '0 20px 40px rgba(0,0,0,.4)' }}>
            <Documento tamano={80} color={colores.fondo} />
          </div>
        </div>

        {/* Contrappto cae al centro */}
        {frame >= llegada - 2 ? (
          <div style={{ position: 'absolute', left: 540, top: 560, transform: `translate(-50%, -50%) translateY(${(1 - caida) * -500}px)`, textAlign: 'center' }}>
            <Estallido desde={llegada + 6} cantidad={10} radio={320} />
            <div style={{ width: 190, height: 190, borderRadius: 999, background: colores.fondo2, border: `5px solid ${colores.acento}`, display: 'grid', placeItems: 'center', boxShadow: `0 0 80px ${colores.acento}88` }}>
              <Img src={staticFile('marcas/contrappto/icono.png')} style={{ width: 130 }} />
            </div>
            <div style={{ ...fuente(marca.fuentes.enfasis), fontSize: 38, color: colores.tinta, marginTop: 22, padding: '10px 26px', borderRadius: radio, background: colores.acento, whiteSpace: 'nowrap', opacity: caida }}>
              {centro}
            </div>
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

const Etiquetada = ({ x, y, avance, texto, children }) => {
  const marca = useMarca();
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) translateY(${(1 - avance) * 200}px) scale(${0.6 + avance * 0.4})`, opacity: Math.min(1, avance * 1.5), textAlign: 'center' }}>
      {children}
      <div style={{ ...fuente(marca.fuentes.enfasis), fontSize: 34, color: marca.colores.tenue, marginTop: 10 }}>{texto}</div>
    </div>
  );
};
