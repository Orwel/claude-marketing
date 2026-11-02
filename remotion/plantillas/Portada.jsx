import React from 'react';
import { AbsoluteFill, Img, OffthreadVideo, staticFile } from 'remotion';
import { Firma } from '../componentes/Firma.jsx';
import { fuente, useFuentes } from '../fuentes.js';
import { ContextoMarca } from '../marca.js';
import { conAlfa, partirPalabras } from '../util.js';
import { METAFORAS } from '../metaforas/index.js';

/**
 * Portada de un video (una sola imagen): un cuadro limpio de la grabacion, sin
 * subtitulos ni graficos, y el titulo con la tipografia y el color de la cuenta.
 *
 * Reel 9:16: Instagram muestra la portada recortada a 3:4 en la cuadricula del
 * perfil (franja central de 1440 px), asi que firma y titulo van dentro de ella.
 * LinkedIn 4:5 usa la foto completa; 16:9 (Contrappto) pone la foto en tarjeta a
 * la izquierda y el titulo a la derecha, igual que el video.
 */
export const Portada = ({ pieza, marca, cuadro, titulo }) => (
  <ContextoMarca.Provider value={marca}>
    <Lienzo pieza={pieza} cuadro={cuadro} titulo={titulo} />
  </ContextoMarca.Provider>
);

const Lienzo = ({ cuadro, titulo }) => {
  useFuentes();
  const marca = React.useContext(ContextoMarca);
  const { colores } = marca;
  const foto = <OffthreadVideo src={staticFile(cuadro.archivo)} startFrom={cuadro.cuadro} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;

  if (cuadro.ancho > cuadro.alto) {
    return (
      <AbsoluteFill style={{ background: `linear-gradient(135deg, ${colores.fondo} 0%, ${colores.fondo2} 100%)` }}>
        <div style={{ position: 'absolute', left: 90, top: 60, width: 540, height: 960, borderRadius: 36, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,.45)' }}>{foto}</div>
        <div style={{ position: 'absolute', left: 720, right: 110, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 44 }}>
          <Firma tamano={0.7} />
          <Titulo texto={titulo} tamano={96} />
        </div>
      </AbsoluteFill>
    );
  }

  const reel = cuadro.alto / cuadro.ancho > 1.5;
  // En reel todo va dentro de la franja 3:4 del perfil (de 240 a 1680 px).
  const arriba = reel ? 300 : 70;
  const abajo = reel ? cuadro.alto - 1640 : 80;
  return (
    <AbsoluteFill style={{ backgroundColor: colores.fondo }}>
      {foto}
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${conAlfa(colores.fondo, 0.55)} 0%, ${conAlfa(colores.fondo, 0)} 22%, ${conAlfa(colores.fondo, 0)} 42%, ${conAlfa(colores.fondo, 0.92)} 78%, ${colores.fondo} 100%)` }} />
      <div style={{ position: 'absolute', top: arriba, left: 70 }}>
        <div style={{ padding: '16px 24px', borderRadius: 20, background: conAlfa(colores.fondo, 0.6) }}>
          <Firma tamano={0.62} />
        </div>
      </div>
      <div style={{ position: 'absolute', left: 70, right: 70, bottom: abajo, display: 'flex', flexDirection: 'column', gap: 26 }}>
        <div style={{ width: 90, height: 8, borderRadius: 4, background: colores.acento }} />
        <Titulo texto={titulo} tamano={reel ? 104 : 92} />
      </div>
    </AbsoluteFill>
  );
};

/** Titulo con *enfasis*: la marca decide si se subraya (juanda) o se resalta con marcador (Contrappto). */
const Titulo = ({ texto, tamano, centrado = false }) => {
  const marca = React.useContext(ContextoMarca);
  const { colores } = marca;
  return (
    <div style={{ ...fuente(marca.fuentes.titulo), fontSize: tamano, lineHeight: 1.04, letterSpacing: '-0.025em', color: colores.tinta, display: 'flex', flexWrap: 'wrap', justifyContent: centrado ? 'center' : 'flex-start', columnGap: tamano * 0.24, textShadow: '0 4px 30px rgba(0,0,0,.35)' }}>
      {partirPalabras(texto).map((p, i) => (
        <span key={i} style={p.enfasis ? { color: colores.acento, ...(marca.resaltado === 'marcador' ? { background: conAlfa(colores.acento, 0.16), padding: '0 8px', borderRadius: 8 } : {}) } : undefined}>{p.texto}</span>
      ))}
    </div>
  );
};

/**
 * Portada para un reel ya publicado. La miniatura vieja trae textos y colores que se enciman con el
 * titulo (29-sep-2026), asi que la imagen es una metafora animada de remotion/metaforas, en el mismo
 * estilo de los carruseles del evento. Titulo centrado, firma arriba: todo dentro de la franja 3:4 que
 * muestra la cuadricula del perfil. Se toma el cuadro 150, cuando la metafora ya termino de armarse.
 */
export const PortadaAnterior = ({ marca, metafora, datos, titulo }) => (
  <ContextoMarca.Provider value={marca}>
    <IlustracionAnterior metafora={metafora} datos={datos} titulo={titulo} />
  </ContextoMarca.Provider>
);

const IlustracionAnterior = ({ metafora, datos, titulo }) => {
  useFuentes();
  const marca = React.useContext(ContextoMarca);
  const { colores } = marca;
  const Metafora = METAFORAS[metafora];
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 78% 22%, ${conAlfa(colores.acento, 0.22)} 0%, ${conAlfa(colores.acento, 0)} 45%), radial-gradient(circle at 12% 88%, ${conAlfa(colores.secundario ?? colores.acento, 0.16)} 0%, transparent 42%), linear-gradient(180deg, ${colores.fondo} 0%, ${colores.fondo2} 100%)` }}>
      <div style={{ position: 'absolute', top: 290, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <div style={{ padding: '14px 24px', borderRadius: 20, background: conAlfa(colores.fondo, 0.6) }}>
          <Firma tamano={0.6} />
        </div>
      </div>
      <div style={{ position: 'absolute', top: 420, left: 60, right: 60, height: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Metafora d={datos ?? {}} />
      </div>
      <div style={{ position: 'absolute', top: 1080, left: 80, right: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, textAlign: 'center' }}>
        <div style={{ width: 90, height: 8, borderRadius: 4, background: colores.acento }} />
        <Titulo texto={titulo} tamano={100} centrado />
      </div>
    </AbsoluteFill>
  );
};
