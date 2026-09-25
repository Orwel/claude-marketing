import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { TextoCinetico } from '../componentes/TextoCinetico.jsx';
import { fuente } from '../fuentes.js';
import { useMarca } from '../marca.js';

/**
 * Una captura real de la app en un marco de navegador, con zoom de empuje
 * hacia la zona que importa y una pastilla que la señala.
 *
 * `recorte` ({x, y, ancho, alto} en pixeles de la captura) decide que parte
 * se ve: asi se esconden datos que no deben salir (direcciones, nombres) sin
 * editar la imagen original.
 */
export const Pantalla = ({ titulo, imagen, anchoImagen, recorte, llamado, foco = { x: 0.5, y: 0.5 }, segundos }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const { colores, radio } = marca;

  const ancho = 940;
  const escalaImagen = ancho / recorte.ancho;
  const alto = recorte.alto * escalaImagen;
  const entrada = spring({ frame: frame - 3, fps, config: { damping: 15, stiffness: 150 } });
  // Empuje lento hacia el foco durante toda la escena: la camara nunca esta quieta.
  const zoom = interpolate(frame, [6, segundos * fps], [1, 1.1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad) });
  const pastilla = spring({ frame: frame - 18, fps, config: { damping: 11, stiffness: 180 } });

  return (
    <AbsoluteFill style={{ alignItems: 'center', paddingTop: 300, gap: 70 }}>
      <div style={{ width: 920 }}>
        <TextoCinetico texto={titulo} tamano={84} desde={0} />
      </div>
      <div
        style={{
          position: 'relative',
          transform: `perspective(1600px) rotateX(${(1 - entrada) * 25}deg) rotateY(${(1 - entrada) * -18}deg) translateY(${(1 - entrada) * 300}px)`,
          opacity: entrada,
        }}
      >
        <div style={{ width: ancho, borderRadius: radio, overflow: 'hidden', background: '#fff', boxShadow: `0 50px 120px rgba(0,0,0,.55), 0 0 0 2px ${colores.linea}` }}>
          {/* barra del navegador */}
          <div style={{ height: 54, background: '#EEF2F6', display: 'flex', alignItems: 'center', gap: 10, padding: '0 22px' }}>
            {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
              <span key={c} style={{ width: 16, height: 16, borderRadius: 99, background: c }} />
            ))}
            <span style={{ marginLeft: 18, flex: 1, height: 30, borderRadius: 8, background: '#fff', ...fuente(marca.fuentes.texto), fontSize: 18, color: '#667', display: 'flex', alignItems: 'center', paddingLeft: 14 }}>
              contrappto.com
            </span>
          </div>
          <div style={{ width: ancho, height: alto, overflow: 'hidden', position: 'relative' }}>
            <Img
              src={staticFile(imagen)}
              style={{
                position: 'absolute',
                width: anchoImagen * escalaImagen,
                left: -recorte.x * escalaImagen,
                top: -recorte.y * escalaImagen,
                transform: `scale(${zoom})`,
                transformOrigin: `${(recorte.x + recorte.ancho * foco.x) * escalaImagen}px ${(recorte.y + recorte.alto * foco.y) * escalaImagen}px`,
              }}
            />
          </div>
        </div>
        {llamado ? (
          <div
            style={{
              position: 'absolute',
              right: -20,
              bottom: -40,
              transform: `scale(${pastilla}) rotate(${(1 - pastilla) * 12 - 3}deg)`,
              ...fuente(marca.fuentes.enfasis),
              fontSize: 40,
              padding: '20px 34px',
              borderRadius: 999,
              background: colores.alerta,
              color: colores.fondo,
              boxShadow: '0 20px 50px rgba(0,0,0,.45)',
              whiteSpace: 'nowrap',
            }}
          >
            {llamado}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
