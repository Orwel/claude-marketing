import { useThree } from '@react-three/fiber';
import { ThreeCanvas } from '@remotion/three';
import React, { useMemo } from 'react';
import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';

/**
 * Escalera infinita a tinta en 3D (three.js), en el espiritu de las «Carceres» de Piranesi:
 * una torre cuadrada con tramos de escalera que giran, pilares, vigas y puentes que cruzan el
 * vacio. Cada pieza es papel con rayado de grabado (textura de lineas hecha en un canvas) y su
 * contorno en tinta; la niebla del color del papel hace que lo lejano se pierda como en el grabado.
 * La camara sube por el hueco mientras una figura diminuta sube los tramos.
 *
 * Props: { papel, tinta, segundos } (colores de la pieza; nada de una cuenta aqui).
 */
export const Escalera3D = ({ papel = '#E6DCC6', tinta = '#15120E', subida = 13, duracion }) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  // `duracion` en cuadros cuando va dentro de otra composicion (una Sequence), si no la de la composicion.
  const avance = frame / (duracion ?? durationInFrames);
  const { piezas, ruta } = useMemo(() => torre(), []);
  const mats = useMemo(() => materiales(papel, tinta, width, height), [papel, tinta, width, height]);
  // Camara: sube por el centro de la torre girando despacio y mirando hacia arriba en diagonal.
  const ang = 0.6 + avance * 1.2;
  const y = -1 + avance * subida;
  const cam = [Math.cos(ang) * 0.6, y, Math.sin(ang) * 0.6];
  const mira = [Math.cos(ang + 1.9) * 3.5, y + 9, Math.sin(ang + 1.9) * 3.5];
  // La figura recorre la ruta de peldanos un poco por delante de la camara.
  const k = Math.min(ruta.length - 1, Math.floor((0.2 + avance * 0.45) * (ruta.length - 1)));
  const fig = ruta[k];
  const paso = Math.abs(Math.sin(t * 9)) * 0.06;
  return (
    <AbsoluteFill style={{ background: papel }}>
      <ThreeCanvas width={width} height={height} camera={{ fov: 72, position: cam, near: 0.1, far: 80 }} style={{ width, height }} linear flat onCreated={({ scene }) => { scene.fog = new THREE.Fog(papel, 10, 42); scene.background = new THREE.Color(papel); }}>
        <Camara posicion={cam} mira={mira} />
        {/* La torre se va construyendo mientras la camara sube: cada pieza crece cuando le llega su turno */}
        {piezas.map((p, i) => {
          const aparece = Math.min(1, Math.max(0, (y + 17 - p.y) / 3 + (p.siempre ? 1 : 0)));
          return aparece > 0 ? <Pieza key={i} p={p} mats={mats} tinta={tinta} escala={aparece} /> : null;
        })}
        {/* Cadenas que cuelgan del techo, como en Piranesi */}
        {[0, 1, 2].map((i) => (
          <Cadena key={i} x={-3 + i * 3} z={i % 2 ? 2 : -2} tinta={tinta} t={t + i} />
        ))}
        <group position={[fig.x, fig.y + 0.45 + paso, fig.z]}>
          <mesh>
            <capsuleGeometry args={[0.2, 0.7, 4, 8]} />
            <meshBasicMaterial color={tinta} />
          </mesh>
          <mesh position={[0, 0.68, 0]}>
            <sphereGeometry args={[0.18, 10, 10]} />
            <meshBasicMaterial color={tinta} />
          </mesh>
        </group>
      </ThreeCanvas>
      {/* Luz que entra desde arriba: el unico alivio de la torre */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 0%, rgba(255,255,255,${0.35 + 0.1 * Math.sin(t * 2)}) 0%, transparent 45%)` }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 55%, transparent 40%, rgba(20,16,10,.7) 100%)' }} />
      <Manchas ancho={width} alto={height} />
    </AbsoluteFill>
  );
};

/** Apunta la camara cada cuadro (la prop `camera` solo vale al crear el canvas). */
const Camara = ({ posicion, mira }) => {
  const { camera } = useThree();
  camera.position.set(...posicion);
  camera.lookAt(...mira);
  return null;
};

/** Una caja de la torre: caras de papel rayado y el contorno en tinta. */
const Pieza = ({ p, mats, tinta, escala = 1 }) => {
  const geo = useMemo(() => new THREE.BoxGeometry(p.w, p.h, p.d), [p.w, p.h, p.d]);
  // Contorno de plumilla: lineas con grosor real en pixeles (las de WebGL miden siempre 1 px).
  const borde = useMemo(() => {
    const g = new LineSegmentsGeometry().fromEdgesGeometry(new THREE.EdgesGeometry(geo));
    return new LineSegments2(g, mats.linea);
  }, [geo, mats.linea]);
  return (
    <group position={[p.x, p.y, p.z]} rotation={[0, p.r ?? 0, 0]} scale={[1, Math.max(0.001, 1 - Math.pow(1 - escala, 3)), 1]}>
      <mesh geometry={geo} material={p.oscuro ? mats.oscuro : mats.caja} />
      <primitive object={borde} />
    </group>
  );
};

const Cadena = ({ x, z, tinta, t }) => {
  const puntos = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 30; i++) pts.push(new THREE.Vector3(Math.sin(i * 0.2) * 0.3, 30 - i * 0.6, 0));
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);
  return (
    <line geometry={puntos} position={[x, 0, z]} rotation={[0, 0, Math.sin(t * 0.7) * 0.03]}>
      <lineBasicMaterial color={tinta} />
    </line>
  );
};

/** Rayado de grabado hecho en un canvas: lineas a mano (levemente irregulares). */
function rayado(papel, tinta, angulo, densidad, cruzado) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = papel;
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = tinta;
  const pasadas = cruzado ? [angulo, -angulo] : [angulo];
  pasadas.forEach((a, k) => {
    g.save();
    g.translate(128, 128);
    g.rotate((a * Math.PI) / 180);
    for (let y = -200; y < 200; y += densidad) {
      g.lineWidth = 2 + random(`w${k}${y}`) * 2.2;
      g.globalAlpha = 0.75 + random(`a${k}${y}`) * 0.25;
      g.beginPath();
      g.moveTo(-200, y + random(`y${k}${y}`) * 2);
      g.lineTo(200, y + random(`z${k}${y}`) * 2);
      g.stroke();
    }
    g.restore();
  });
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1);
  return tex;
}

function materiales(papel, tinta, ancho, alto) {
  const lados = new THREE.MeshBasicMaterial({ map: rayado(papel, tinta, 35, 16, false) });
  const abajo = new THREE.MeshBasicMaterial({ map: rayado(papel, tinta, 35, 11, true) });
  const arriba = new THREE.MeshBasicMaterial({ color: papel });
  // Orden de caras de BoxGeometry: +x, -x, +y, -y, +z, -z.
  const caja = [lados, lados, arriba, abajo, lados, lados];
  const oscuro = new THREE.MeshBasicMaterial({ map: rayado(papel, tinta, -40, 13, true) });
  const linea = new LineMaterial({ color: tinta, linewidth: 4.5, worldUnits: false, resolution: new THREE.Vector2(ancho, alto) });
  return { caja, oscuro, linea };
}

/**
 * La torre: un cuadrado de 9 x 9 con tramos de 8 peldanos que suben por cada lado y giran 90°,
 * descansos en las esquinas, cuatro pilares, vigas cada pocos niveles y puentes que cruzan.
 */
function torre() {
  const piezas = [];
  const ruta = [];
  const lado = 4.5;
  const alto = 0.32;
  let y = 0;
  const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  for (let tramo = 0; tramo < 12; tramo++) {
    const [dx, dz] = dirs[tramo % 4];
    // El tramo arranca en una esquina y avanza por el borde.
    const ex = tramo % 4 === 0 ? -lado : tramo % 4 === 1 ? lado : tramo % 4 === 2 ? lado : -lado;
    const ez = tramo % 4 === 0 ? -lado : tramo % 4 === 1 ? -lado : tramo % 4 === 2 ? lado : lado;
    for (let i = 0; i < 9; i++) {
      const x = ex + dx * (i + 0.5);
      const z = ez + dz * (i + 0.5);
      piezas.push({ x, y: y + alto / 2, z, w: dx ? 1 : 1.6, h: alto, d: dz ? 1 : 1.6 });
      ruta.push({ x, y: y + alto, z });
      y += alto;
    }
    piezas.push({ x: ex + dx * 9, y: y - 0.1, z: ez + dz * 9, w: 1.8, h: 0.25, d: 1.8 });
  }
  const tope = y + 6;
  [[-lado, -lado], [lado, -lado], [lado, lado], [-lado, lado]].forEach(([x, z]) => piezas.push({ x: x * 1.25, y: tope / 2 - 2, z: z * 1.25, w: 0.55, h: tope + 4, d: 0.55, oscuro: true, siempre: true }));
  for (let n = 1; n < 6; n++) {
    const yy = n * 3.2;
    piezas.push({ x: 0, y: yy, z: -lado * 1.25, w: lado * 2.6, h: 0.5, d: 0.5 });
    if (n % 2 === 0) piezas.push({ x: lado * 1.25, y: yy + 1.6, z: 0, w: 0.4, h: 0.4, d: lado * 2.6 });
    // Puentes que cruzan cerca de una pared (no por el centro, por donde sube la camara)
    if (n % 2) piezas.push({ x: -lado * 0.75, y: yy + 2.4, z: 0, w: 0.9, h: 0.28, d: lado * 2.4 });
  }
  return { piezas, ruta };
}

/** Papel manchado encima de todo (como el gris moteado del video de referencia): manchas y fibras deterministas. */
const Manchas = ({ ancho, alto }) => (
  <svg width={ancho} height={alto} style={{ position: 'absolute', inset: 0, mixBlendMode: 'multiply' }}>
    <defs>
      {Array.from({ length: 14 }, (_, i) => (
        <radialGradient key={i} id={`mancha${i}`}>
          <stop offset="0%" stopColor="#4A3C28" stopOpacity={0.1 + random(`mo${i}`) * 0.08} />
          <stop offset="100%" stopColor="#4A3C28" stopOpacity={0} />
        </radialGradient>
      ))}
    </defs>
    {Array.from({ length: 14 }, (_, i) => (
      <ellipse key={`m${i}`} cx={random(`mx${i}`) * ancho} cy={random(`my${i}`) * alto} rx={180 + random(`mr${i}`) * 300} ry={140 + random(`mq${i}`) * 260} fill={`url(#mancha${i})`} />
    ))}
    {Array.from({ length: 240 }, (_, i) => {
      const x = random(`fx${i}`) * ancho;
      const y = random(`fy${i}`) * alto;
      const a = random(`fa${i}`) * Math.PI;
      const l = 6 + random(`fl${i}`) * 30;
      return <line key={i} x1={x} y1={y} x2={x + Math.cos(a) * l} y2={y + Math.sin(a) * l} stroke="#2A2116" strokeOpacity={0.12} strokeWidth={1} />;
    })}
  </svg>
);
