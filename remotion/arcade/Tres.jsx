import { ThreeCanvas } from '@remotion/three';
import React, { useMemo } from 'react';
import { interpolate, random, useCurrentFrame, useVideoConfig } from 'remotion';
import { useMarca } from '../marca.js';
import { CABALLERO } from './Sprites.jsx';

/**
 * Escenas 3D de la plantilla Arcade (SOFA, oct-2026) con three.js por
 * react-three-fiber. Todo es voxel: cubos con luz plana, sin sombras ni
 * posprocesado, porque el render corre sin GPU (SwiftShader) y cada cuadro
 * tiene que salir en menos de un segundo.
 *
 * - Trifuerza: las tres piezas del logo como pixeles en 3D que giran (es la
 *   Trifuerza, literal: el guiño de Zelda que da nombre a la marca).
 * - Moneda: una moneda de 8 bits girando, para los conteos y el "cuanto cobraria".
 * - Mundo: isla isometrica de voxeles con la ruta de niveles del recorrido.
 */
const mezclar = (a, b, p) => a + (b - a) * p;

/** Cubos de un triangulo pixel de `filas` filas (la fila i tiene i+1 cubos) centrado en (cx, cy). */
function triangulo(filas, cx, cy) {
  const cubos = [];
  for (let i = 0; i < filas; i++) {
    for (let k = 0; k <= i; k++) cubos.push([cx + (k - i / 2), cy + (filas - 1) / 2 - i]);
  }
  return cubos;
}

const Cubo = ({ x, y, z = 0, color, emisivo = 0.25, escala = 1 }) => (
  <mesh position={[x, y, z]} scale={escala}>
    <boxGeometry args={[0.96, 0.96, 0.96]} />
    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={emisivo} roughness={0.45} metalness={0.35} />
  </mesh>
);

/** La Trifuerza voxel: entra girando, se asienta, late con un brillo y sigue girando lento. */
export const Trifuerza3D = ({ ancho, alto, filas = 7, oro = '#E8B83A', entrada = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { colores } = useMarca();
  const piezas = useMemo(() => {
    const h = filas;
    return [triangulo(h, 0, h / 2 + 0.5), triangulo(h, -h / 2, -h / 2 + 0.5), triangulo(h, h / 2, -h / 2 + 0.5)];
  }, [filas]);
  const t = (frame - entrada) / fps;
  const llegada = Math.min(1, Math.max(0, t / 0.9));
  const suave = 1 - (1 - llegada) ** 3;
  const giro = mezclar(Math.PI * 2.5, 0, suave) + Math.max(0, t - 0.9) * 0.55;
  const latido = 1 + 0.03 * Math.sin(t * 4);
  const chispas = useMemo(() => Array.from({ length: 26 }, (_, i) => ({ r: 7 + random(`r${i}`) * 6, v: 0.3 + random(`v${i}`) * 0.6, f: random(`f${i}`) * Math.PI * 2, y: (random(`y${i}`) - 0.5) * 16, s: 0.25 + random(`s${i}`) * 0.3 })), []);
  return (
    <ThreeCanvas width={ancho} height={alto} camera={{ fov: 38, position: [0, 0, 34], near: 0.1, far: 200 }} style={{ width: ancho, height: alto }} linear={false}>
      <ambientLight intensity={0.55} color="#FFF4E0" />
      <directionalLight position={[8, 14, 18]} intensity={1.6} color="#FFFFFF" />
      <pointLight position={[-10, -6, 12]} intensity={40} color={colores.acento} />
      <group rotation={[0.18, giro, 0]} scale={suave * latido} position={[0, 0, 0]}>
        {piezas.map((p, k) =>
          p.map(([x, y], i) => {
            // Cada cubo cae a su sitio con un pequeño retardo: el logo se "arma" en vez de aparecer.
            const d = Math.min(1, Math.max(0, (t - 0.1 - (i + k * p.length) * 0.012) / 0.35));
            const e = 1 - (1 - d) ** 2;
            return <Cubo key={`${k}-${i}`} x={x} y={y * e + (1 - e) * (y + 12)} z={(1 - e) * 10} color={k === 0 ? oro : k === 1 ? '#F2C85B' : '#D9A42E'} escala={0.2 + 0.8 * e} />;
          })
        )}
      </group>
      {chispas.map((c, i) => {
        const a = c.f + t * c.v;
        return <Cubo key={`c${i}`} x={Math.cos(a) * c.r} y={c.y + Math.sin(t * 1.3 + i) * 0.6} z={Math.sin(a) * c.r * 0.6} color={i % 3 ? colores.acento : '#FFFFFF'} escala={c.s * suave} emisivo={0.9} />;
      })}
    </ThreeCanvas>
  );
};

/** Moneda pixel (cilindro bajo de 8 caras) que gira sobre su eje, con un simbolo de peso hecho de cubos. */
export const Moneda3D = ({ ancho, alto, color = '#F2C85B', velocidad = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const giro = t * 3.2 * velocidad;
  const simbolo = useMemo(() => {
    const filas = ['..###..', '.#.#.#.', '.#.#...', '..###..', '...#.#.', '.#.#.#.', '..###..'];
    const c = [];
    filas.forEach((f, j) => [...f].forEach((ch, i) => { if (ch === '#') c.push([i - 3, 3 - j]); }));
    return c;
  }, []);
  return (
    <ThreeCanvas width={ancho} height={alto} camera={{ fov: 30, position: [0, 0, 44], near: 0.1, far: 100 }} style={{ width: ancho, height: alto }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[6, 10, 12]} intensity={1.8} />
      <group rotation={[0.1, giro, 0]} position={[0, Math.sin(t * 2.4) * 0.4, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[6, 6, 1.6, 10]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.22} roughness={0.4} metalness={0.5} />
        </mesh>
        {simbolo.map(([x, y], i) => (
          <React.Fragment key={i}>
            <Cubo x={x * 0.95} y={y * 0.95} z={0.9} color="#8A5A12" escala={0.9} emisivo={0} />
            <Cubo x={-x * 0.95} y={y * 0.95} z={-0.9} color="#8A5A12" escala={0.9} emisivo={0} />
          </React.Fragment>
        ))}
      </group>
    </ThreeCanvas>
  );
};

/**
 * Mapa de niveles: una isla isometrica de voxeles (pasto, tierra, un edificio
 * pixel que es Corferias) con una ruta de puntos. `nivel` es el punto activo
 * (0..n-1): la camara se desliza hasta el y una ficha salta encima.
 */
export const Mundo3D = ({ ancho, alto, niveles = 5, nivel = 0, acento = '#F26B1D' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const { bloques, ruta } = useMemo(() => {
    const b = [];
    const lado = 18;
    for (let x = -lado / 2; x < lado / 2; x++) {
      for (let z = -lado / 2; z < lado / 2; z++) {
        const borde = Math.abs(x) + Math.abs(z) + random(`b${x},${z}`) * 3;
        if (borde > lado * 0.78) continue;
        const alto = random(`h${x},${z}`) > 0.86 ? 2 : 1;
        for (let y = 0; y < alto; y++) b.push({ x, y, z, color: y === alto - 1 ? (random(`g${x},${z}`) > 0.7 ? '#3F9D4A' : '#4FB65A') : '#8B5A2B' });
      }
    }
    // Edificio al fondo: el pabellon, con techo en arco pixelado.
    for (let x = -5; x <= 5; x++) for (let y = 1; y <= 3; y++) for (let z = -8; z <= -6; z++) b.push({ x, y, z, color: y === 3 ? '#C9CED6' : '#E8ECF2' });
    for (let x = -4; x <= 4; x++) for (let z = -8; z <= -6; z++) b.push({ x, y: 4, z, color: '#9AA3B2' });
    const r = Array.from({ length: niveles }, (_, i) => {
      const p = i / Math.max(1, niveles - 1);
      return { x: -6 + p * 12, z: 5 - Math.sin(p * Math.PI) * 4 - p * 2 };
    });
    return { bloques: b, ruta: r };
  }, [niveles]);
  const foco = ruta[Math.min(nivel, ruta.length - 1)];
  const salto = Math.abs(Math.sin(t * 5)) * 0.8;
  return (
    <ThreeCanvas width={ancho} height={alto} camera={{ fov: 32, position: [foco.x * 0.3 + 14, 16, foco.z * 0.3 + 18], near: 0.1, far: 200 }} style={{ width: ancho, height: alto }} onCreated={({ camera }) => camera.lookAt(foco.x * 0.3, 0, foco.z * 0.3)}>
      <ambientLight intensity={0.7} color="#FFF8EC" />
      <directionalLight position={[10, 18, 8]} intensity={1.5} />
      <group position={[0, -1, 0]}>
        {bloques.map((b, i) => (
          <mesh key={i} position={[b.x, b.y, b.z]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={b.color} roughness={0.9} />
          </mesh>
        ))}
        {ruta.map((p, i) => (
          <mesh key={`r${i}`} position={[p.x, 1.55, p.z]}>
            <boxGeometry args={[0.9, 0.3, 0.9]} />
            <meshStandardMaterial color={i <= nivel ? acento : '#F4EFE6'} emissive={i === nivel ? acento : '#000000'} emissiveIntensity={i === nivel ? 0.6 : 0} />
          </mesh>
        ))}
        <group position={[foco.x, 2.3 + salto, foco.z]}>
          <Cubo x={0} y={0.4} z={0} color="#0B1426" escala={0.8} emisivo={0} />
          <Cubo x={0} y={1.2} z={0} color="#E4B894" escala={0.7} emisivo={0} />
          <Cubo x={0} y={1.75} z={0} color="#2B1B12" escala={0.75} emisivo={0} />
        </group>
      </group>
    </ThreeCanvas>
  );
};

/** Cubos de un sprite pixel: cada celda es un cubo, centrado. */
function voxelesDe(fig) {
  const arte = fig.arte.map((f) => [...f]);
  for (const [c, r, l] of fig.extra ?? []) if (arte[r]?.[c] !== undefined) arte[r][c] = l;
  const cubos = [];
  arte.forEach((fila, j) => fila.forEach((ch, i) => { if (ch !== '.' && fig.pal[ch]) cubos.push({ x: i - 7.5, y: 11 - j, color: fig.pal[ch] }); }));
  return cubos;
}

/** El personaje del Claustro en voxeles: se arma cubo a cubo y gira para mostrarse (identidad). */
export const Personaje3D = ({ ancho, alto, entrada = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { colores } = useMarca();
  const cubos = useMemo(() => voxelesDe(CABALLERO), []);
  const t = (frame - entrada) / fps;
  const llegada = Math.min(1, Math.max(0, t / 0.8));
  const suave = 1 - (1 - llegada) ** 3;
  const giro = mezclar(Math.PI * 2, 0, suave) + Math.sin(Math.max(0, t - 0.8) * 1.4) * 0.6;
  const salto = Math.abs(Math.sin(Math.max(0, t - 0.8) * 4)) * 0.8;
  return (
    <ThreeCanvas width={ancho} height={alto} camera={{ fov: 36, position: [0, 2, 40], near: 0.1, far: 200 }} style={{ width: ancho, height: alto }}>
      <ambientLight intensity={0.7} color="#FFF4E0" />
      <directionalLight position={[8, 14, 18]} intensity={1.5} />
      <pointLight position={[-10, 4, 14]} intensity={30} color={colores.acento} />
      <group rotation={[0.08, giro, 0]} scale={suave} position={[0, salto - 1, 0]}>
        {cubos.map((c, i) => {
          const d = Math.min(1, Math.max(0, (t - 0.05 - i * 0.004) / 0.3));
          return <Cubo key={i} x={c.x} y={c.y * d + (1 - d) * (c.y - 10)} z={0} color={c.color} escala={0.2 + 0.8 * d} emisivo={0.12} />;
        })}
        <mesh position={[0, -12.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[12, 6]} />
          <meshStandardMaterial color="#000000" transparent opacity={0.35 * suave} />
        </mesh>
      </group>
    </ThreeCanvas>
  );
};

/** Martillo de juez en voxeles que golpea (demandas): mango, cabeza y base, con aros al caer. */
export const Martillo3D = ({ ancho, alto }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { colores } = useMarca();
  const t = frame / fps;
  // Golpe cada 1,4 s: sube suave y cae de golpe.
  const ciclo = (t % 1.4) / 1.4;
  const ang = ciclo < 0.7 ? mezclar(-0.9, -0.05, ciclo / 0.7) : ciclo < 0.78 ? -0.05 : mezclar(-0.05, -0.9, (ciclo - 0.78) / 0.22);
  const impacto = ciclo >= 0.7 && ciclo < 0.78;
  const madera = '#8B5A2B';
  const oscuro = '#5A3A1A';
  const cabeza = useMemo(() => { const c = []; for (let x = -4; x <= 4; x++) for (let y = 0; y <= 2; y++) for (let z = -1; z <= 1; z++) c.push([x, y, z, Math.abs(x) === 4 || y === 2 ? oscuro : madera]); return c; }, []);
  const mango = useMemo(() => Array.from({ length: 10 }, (_, i) => [0, -1 - i, 0, i % 2 ? madera : oscuro]), []);
  return (
    <ThreeCanvas width={ancho} height={alto} camera={{ fov: 36, position: [0, 2, 66], near: 0.1, far: 200 }} style={{ width: ancho, height: alto }}>
      <ambientLight intensity={0.65} color="#FFF4E0" />
      <directionalLight position={[8, 14, 18]} intensity={1.6} />
      <pointLight position={[-8, 2, 12]} intensity={30} color={colores.acento} />
      <group position={[-2, 2, 0]} rotation={[0, 0.5, 0]}>
        <group position={[-6, 4, 0]} rotation={[0, 0, ang]}>
          <group position={[8, 0, 0]}>
            {cabeza.map(([x, y, z, c], i) => <Cubo key={`c${i}`} x={x} y={y} z={z} color={c} emisivo={0.05} />)}
            {mango.map(([x, y, z, c], i) => <Cubo key={`m${i}`} x={x - 6} y={y + 1} z={z} color={c} emisivo={0.05} />)}
          </group>
        </group>
        {Array.from({ length: 7 }, (_, i) => <Cubo key={`b${i}`} x={i - 1} y={-8} z={0} color={i % 2 ? oscuro : madera} emisivo={0.05} />)}
        {impacto ? [0, 1, 2].map((k) => <mesh key={k} position={[2, -7.4, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[2 + k * 2 + ciclo * 20, 2.6 + k * 2 + ciclo * 20, 8]} /><meshStandardMaterial color={colores.acento} emissive={colores.acento} emissiveIntensity={1} /></mesh>) : null}
      </group>
    </ThreeCanvas>
  );
};
