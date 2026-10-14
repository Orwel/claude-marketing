import { ThreeCanvas } from '@remotion/three';
import React, { useMemo } from 'react';
import { random, useCurrentFrame, useVideoConfig } from 'remotion';
import { useMarca } from '../marca.js';

/**
 * Mundos voxel por tema (SOFA, oct-2026): la pantalla de nivel y la intro cambian
 * con el personaje que viene. Juan David: "no que sea la misma siempre; todo muy
 * contextual". Cada mundo es una receta (cielo, suelo, decorado, particulas) y el
 * generador arma la isla con cubos sin sombras ni posprocesado (render sin GPU).
 *
 * Uso: <Isla3D mundo="fuego" semilla="mavuika" nivel={2} /> (nombres en MUNDOS).
 * El tema de una escena se escribe en la pieza (`personaje.tema`) y la escena
 * `nivel` siguiente lo hereda si no trae `mundo`.
 */
export const MUNDOS = {
  // Pradera de siempre (Corferias): la isla verde con el pabellon.
  pradera: { cielo: ['#0B1426', '#1C2B4A'], suelo: ['#4FB65A', '#3F9D4A'], tierra: '#8B5A2B', deco: 'pabellon', particulas: 'estrellas', acento: '#F26B1D' },
  // Natlan / Mavuika / fuego: roca negra, lava que brilla, volcan.
  fuego: { cielo: ['#1A0506', '#4A1208'], suelo: ['#2E2A2A', '#3A3030'], tierra: '#1C1818', deco: 'volcan', particulas: 'brasas', acento: '#FF6B35', lava: '#FF7A1A' },
  // Hollow Knight / Capitano / nieve: azul palido, cristales.
  hielo: { cielo: ['#0A1630', '#1F3A66'], suelo: ['#DCEBFF', '#B9D3F5'], tierra: '#6F8DB8', deco: 'cristales', particulas: 'nieve', acento: '#9FE3FF' },
  // Astronauta / Freezer / universo 7: planeta oscuro con estrellas y un anillo.
  espacio: { cielo: ['#03030C', '#0B1030'], suelo: ['#5A4C7A', '#463A62'], tierra: '#2A2240', deco: 'planeta', particulas: 'estrellas', acento: '#B388FF' },
  // Vastaya / Aurora / bosque magico: arboles voxel y luciernagas.
  bosque: { cielo: ['#06160F', '#0F3A24'], suelo: ['#2F7A3C', '#256A32'], tierra: '#4A3220', deco: 'arboles', particulas: 'luciernagas', acento: '#58D35A' },
  // Bogota / Bogo Fighters / ciudad: edificios de ladrillo, cielo gris de Bogota.
  ciudad: { cielo: ['#1A2030', '#3A4A66'], suelo: ['#6E6E76', '#5C5C64'], tierra: '#3A3A42', deco: 'edificios', particulas: 'lluvia', acento: '#F26B1D' },
  // Mazmorra / Revan / lado oscuro: piedra y pilares, antorchas.
  mazmorra: { cielo: ['#050507', '#15121A'], suelo: ['#4A4652', '#3C3844'], tierra: '#2A2730', deco: 'pilares', particulas: 'brasas', acento: '#E8323C' },
  // Mundo digital / Angemon / Zenless: rejilla cian y bits que suben.
  digital: { cielo: ['#020A14', '#063050'], suelo: ['#0E5F73', '#0B4D5E'], tierra: '#062A36', deco: 'rejilla', particulas: 'bits', acento: '#5BC0F8' },
  // Terror / Toga / ghouls: tierra morada, lapidas, luna.
  terror: { cielo: ['#0B0612', '#2A0F3A'], suelo: ['#3F2F52', '#352846'], tierra: '#221830', deco: 'lapidas', particulas: 'niebla', acento: '#F06292' },
  // Arena de pelea / titanes / Mikasa: muro gigante al fondo.
  muro: { cielo: ['#1B1A14', '#4A4330'], suelo: ['#8A7A4E', '#75683F'], tierra: '#4A4028', deco: 'muro', particulas: 'polvo', acento: '#E8323C' },
  // Oro / dinero / Contrappto: suelo dorado, monedas.
  oro: { cielo: ['#07141D', '#0F2533'], suelo: ['#E8B83A', '#C9962B'], tierra: '#7A5A14', deco: 'monedas', particulas: 'monedas', acento: '#FFB038' },
  // Claustro del Rosario: ladrillo y arcos.
  claustro: { cielo: ['#0B1426', '#2A3754'], suelo: ['#B3202E', '#8E1A24'], tierra: '#5A1016', deco: 'arcos', particulas: 'estrellas', acento: '#F2C85B' },
};

const Cubo = ({ x, y, z, color, emisivo = 0, escala = 1 }) => (
  <mesh position={[x, y, z]} scale={escala}>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={emisivo} roughness={0.85} />
  </mesh>
);

/** Cubos del decorado de cada mundo. Todo con semilla: el mismo mundo siempre se ve igual. */
function decorado(tipo, m, r) {
  const b = [];
  const add = (x, y, z, color, emisivo = 0) => b.push({ x, y, z, color, emisivo });
  if (tipo === 'pabellon') {
    for (let x = -5; x <= 5; x++) for (let y = 1; y <= 3; y++) for (let z = -8; z <= -6; z++) add(x, y, z, y === 3 ? '#C9CED6' : '#E8ECF2');
    for (let x = -4; x <= 4; x++) for (let z = -8; z <= -6; z++) add(x, 4, z, '#9AA3B2');
  }
  if (tipo === 'volcan') {
    for (let y = 1; y <= 6; y++) { const rad = 6 - y; for (let x = -rad; x <= rad; x++) for (let z = -rad; z <= rad; z++) if (Math.abs(x) + Math.abs(z) >= rad - 1 && Math.abs(x) + Math.abs(z) <= rad + 1) add(x, y, z - 6, y > 4 ? '#3A2A2A' : '#2E2424'); }
    for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) add(x, 6, z - 6, m.lava, 1.2);
    for (let i = 0; i < 14; i++) add(Math.round((r(`lx${i}`) - 0.5) * 14), 1, Math.round((r(`lz${i}`) - 0.5) * 10) + 2, m.lava, 1);
  }
  if (tipo === 'cristales') {
    for (let i = 0; i < 9; i++) { const x = Math.round((r(`cx${i}`) - 0.5) * 14), z = Math.round((r(`cz${i}`) - 0.5) * 12); const h = 2 + Math.round(r(`ch${i}`) * 4); for (let y = 1; y <= h; y++) add(x, y, z, y === h ? '#FFFFFF' : '#9FE3FF', 0.5); }
  }
  if (tipo === 'planeta') {
    for (let i = 0; i < 40; i++) add(Math.round((r(`sx${i}`) - 0.5) * 40), 6 + Math.round(r(`sy${i}`) * 14), -10 - Math.round(r(`sz${i}`) * 10), '#FFFFFF', 1);
    for (let x = -14; x <= 14; x++) add(x, 9 + Math.round(Math.sin(x / 3) * 1.5), -16, m.acento, 0.8);
    for (let x = -3; x <= 3; x++) for (let y = -3; y <= 3; y++) if (x * x + y * y <= 9) add(x + 8, y + 12, -18, y > 0 ? '#C8B8FF' : '#8C78C8', 0.4);
  }
  if (tipo === 'arboles') {
    for (let i = 0; i < 10; i++) { const x = Math.round((r(`ax${i}`) - 0.5) * 16), z = Math.round((r(`az${i}`) - 0.5) * 12) - 1; const h = 3 + Math.round(r(`ah${i}`) * 2); for (let y = 1; y <= h; y++) add(x, y, z, '#4A3220'); for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (let dy = 0; dy <= 1; dy++) add(x + dx, h + dy, z + dz, dy ? '#2E8B3C' : '#3FA74C'); add(x, h + 2, z, '#58D35A'); }
  }
  if (tipo === 'edificios') {
    for (let i = 0; i < 9; i++) { const x = -8 + i * 2, h = 3 + Math.round(r(`eh${i}`) * 6); for (let y = 1; y <= h; y++) for (let z = -9; z <= -8; z++) add(x, y, z, y % 2 ? '#8B4A3A' : '#9C5444'); for (let y = 2; y <= h; y += 2) add(x, y, -7.49, r(`ev${i}${y}`) > 0.4 ? '#FFD88A' : '#2A2A30', 0.6); }
  }
  if (tipo === 'pilares') {
    for (let i = 0; i < 6; i++) { const x = -7.5 + i * 3; for (let y = 1; y <= 7; y++) add(x, y, -7, y % 2 ? '#5A5566' : '#4A4652'); add(x, 5, -6, '#FF8A2A', 1.2); }
  }
  if (tipo === 'rejilla') {
    for (let x = -10; x <= 10; x += 2) for (let z = -10; z <= 4; z += 2) add(x, 0.52, z, m.acento, 0.9);
    for (let i = 0; i < 8; i++) { const x = Math.round((r(`rx${i}`) - 0.5) * 16), z = Math.round((r(`rz${i}`) - 0.5) * 10) - 2; const h = 2 + Math.round(r(`rh${i}`) * 5); for (let y = 1; y <= h; y++) add(x, y, z, y === h ? '#BAE6FD' : '#0EA5E9', 0.5); }
  }
  if (tipo === 'lapidas') {
    for (let i = 0; i < 9; i++) { const x = Math.round((r(`tx${i}`) - 0.5) * 14), z = Math.round((r(`tz${i}`) - 0.5) * 10); add(x, 1, z, '#6E6A78'); add(x, 2, z, '#8A8694'); }
    for (let x = -2; x <= 2; x++) for (let y = -2; y <= 2; y++) if (x * x + y * y <= 4) add(x - 7, y + 12, -16, '#FFF4C8', 0.9);
  }
  if (tipo === 'muro') {
    for (let x = -12; x <= 12; x++) for (let y = 1; y <= 9; y++) add(x, y, -9, (x + y) % 2 ? '#8A7A5A' : '#766848');
    for (let x = -12; x <= 12; x += 2) add(x, 10, -9, '#5A4A30');
  }
  if (tipo === 'monedas') {
    for (let i = 0; i < 16; i++) { const x = Math.round((r(`mx${i}`) - 0.5) * 14), z = Math.round((r(`mz${i}`) - 0.5) * 10); const h = 1 + Math.round(r(`mh${i}`) * 3); for (let y = 1; y <= h; y++) add(x, y, z, y % 2 ? '#F2C85B' : '#C9962B', 0.35); }
  }
  if (tipo === 'arcos') {
    for (let i = 0; i < 7; i++) { const x = -9 + i * 3; for (let y = 1; y <= 5; y++) add(x, y, -8, '#E9DCC8'); add(x, 6, -8, '#D8C8A8'); if (i < 6) { add(x + 1, 6, -8, '#D8C8A8'); add(x + 2, 6, -8, '#D8C8A8'); add(x + 1.5, 5, -8, '#E9DCC8'); } }
    for (let x = -9; x <= 9; x++) add(x, 7, -8, '#B3202E');
  }
  return b;
}

/** Isla voxel del mundo: suelo, decorado, ruta de niveles y ficha del jugador saltando en el nivel activo. */
export const Isla3D = ({ ancho, alto, mundo = 'pradera', semilla = 'sofa', niveles = 4, nivel = 0, orbita = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marca = useMarca();
  const m = MUNDOS[mundo] ?? MUNDOS.pradera;
  const t = frame / fps;
  const r = (k) => random(`${semilla}-${k}`);
  const { suelo, deco, ruta } = useMemo(() => {
    const b = [];
    const lado = 18;
    for (let x = -lado / 2; x < lado / 2; x++) for (let z = -lado / 2; z < lado / 2; z++) {
      const borde = Math.abs(x) + Math.abs(z) + r(`b${x},${z}`) * 3;
      if (borde > lado * 0.78) continue;
      const altoS = r(`h${x},${z}`) > 0.86 ? 2 : 1;
      for (let y = 0; y < altoS; y++) b.push({ x, y, z, color: y === altoS - 1 ? (r(`g${x},${z}`) > 0.7 ? m.suelo[1] : m.suelo[0]) : m.tierra });
    }
    const rt = Array.from({ length: niveles }, (_, i) => { const p = i / Math.max(1, niveles - 1); return { x: -6 + p * 12, z: 5 - Math.sin(p * Math.PI) * 4 - p * 2 }; });
    return { suelo: b, deco: decorado(m.deco, m, r), ruta: rt };
  }, [mundo, semilla, niveles]);
  const foco = ruta[Math.min(nivel, ruta.length - 1)];
  const salto = Math.abs(Math.sin(t * 5)) * 0.8;
  // La camara orbita un poco distinto en cada mundo (orbita = angulo extra) y se desliza lento.
  const ang = 0.65 + orbita + Math.sin(t * 0.25) * 0.08;
  const dist = 24;
  const cam = [foco.x * 0.3 + Math.sin(ang) * dist, 16, foco.z * 0.3 + Math.cos(ang) * dist];
  return (
    <ThreeCanvas width={ancho} height={alto} camera={{ fov: 32, position: cam, near: 0.1, far: 220 }} style={{ width: ancho, height: alto }} onCreated={({ camera }) => camera.lookAt(foco.x * 0.3, 1, foco.z * 0.3)}>
      <ambientLight intensity={0.7} color="#FFF8EC" />
      <directionalLight position={[10, 18, 8]} intensity={1.4} />
      <pointLight position={[0, 8, 6]} intensity={30} color={m.acento} />
      <group position={[0, -1, 0]}>
        {suelo.map((b, i) => <Cubo key={`s${i}`} x={b.x} y={b.y} z={b.z} color={b.color} />)}
        {deco.map((b, i) => <Cubo key={`d${i}`} x={b.x} y={b.y} z={b.z} color={b.color} emisivo={b.emisivo} />)}
        {ruta.map((p, i) => (
          <mesh key={`r${i}`} position={[p.x, 1.55, p.z]}>
            <boxGeometry args={[0.9, 0.3, 0.9]} />
            <meshStandardMaterial color={i <= nivel ? m.acento : '#F4EFE6'} emissive={i === nivel ? m.acento : '#000000'} emissiveIntensity={i === nivel ? 0.6 : 0} />
          </mesh>
        ))}
        <group position={[foco.x, 2.3 + salto, foco.z]}>
          <Cubo x={0} y={0.4} z={0} color="#0B1426" escala={0.8} />
          <Cubo x={0} y={1.2} z={0} color="#E4B894" escala={0.7} />
          <Cubo x={0} y={1.75} z={0} color="#2B1B12" escala={0.75} />
        </group>
      </group>
    </ThreeCanvas>
  );
};

/** Cielo del mundo (degradado) para poner debajo de la isla. */
export const cieloDe = (mundo) => { const m = MUNDOS[mundo] ?? MUNDOS.pradera; return `linear-gradient(180deg, ${m.cielo[0]} 0%, ${m.cielo[1]} 100%)`; };
export const particulasDe = (mundo) => (MUNDOS[mundo] ?? MUNDOS.pradera).particulas;
export const acentoDe = (mundo) => (MUNDOS[mundo] ?? MUNDOS.pradera).acento;
