import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import React, { useEffect, useMemo, useState } from 'react';
import { cancelRender, continueRender, delayRender, random, useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { cargarFuentes } from '../fuentes.js';

/**
 * El planeta de la presentación «Vuelo por la IA» (y del juego Vuelo de Divisas) en Remotion: océano
 * azul, continentes de fichas hexagonales, ciudades con letrero, rutas punteadas y el avión naranja.
 * Es el mismo modelo del HTML de esa noche, para que el tráiler se vea como la clase.
 *
 * En el navegador el avión se movía con requestAnimationFrame y la cámara se suavizaba con lerp; aquí
 * todo sale del número de cuadro (`ruta` trae los tramos ya calculados), porque Remotion renderiza
 * cuadros sueltos en paralelo y cada uno tiene que poder calcularse solo.
 */
const R = 140;
const RAD = Math.PI / 180;
const COLOR = { oceano: 0x1f4fb4, fondo: '#0a1330', blanco: 0xfbf6ee, celeste: 0x5be1ff, celesteClaro: 0xbfe6ff, naranja: 0xff6a2b, navy: 0x0a1330 };
export const VISTAS = {
  lejos: { alt: 340, tilt: 0.06, mira: 0.25 },
  cerca: { alt: 95, tilt: 0.42, mira: 1 },
  llegada: { alt: 62, tilt: 0.55, mira: 1 },
};

// Continentes simplificados (los mismos del juego y de la presentación): polígonos [lat, lon].
const CONT = [
  [[71,-156],[70,-140],[69,-125],[72,-95],[66,-82],[60,-65],[52,-56],[47,-53],[44,-66],[41,-70],[35,-76],[31,-81],[25,-80],[26,-82],[30,-84],[29,-90],[29,-95],[26,-97],[21,-97],[18,-95],[19,-91],[21,-87],[16,-88],[15,-83],[11,-84],[9,-79],[8,-77],[9,-80],[10,-85],[13,-88],[16,-95],[20,-105],[23,-106],[31,-114],[24,-110],[23,-110],[32,-117],[38,-123],[48,-125],[55,-131],[60,-140],[60,-147],[58,-153],[55,-164],[60,-165],[65,-168],[71,-156]],
  [[82,-60],[83,-30],[78,-18],[70,-22],[60,-43],[65,-53],[76,-68],[82,-60]],
  [[12,-72],[11,-64],[8,-60],[5,-52],[0,-50],[-5,-35],[-10,-37],[-23,-42],[-28,-48],[-34,-53],[-39,-57],[-41,-63],[-46,-67],[-52,-69],[-55,-67],[-54,-72],[-47,-75],[-38,-73],[-30,-71],[-18,-70],[-14,-76],[-5,-81],[-1,-80],[2,-78],[7,-77],[9,-76],[12,-72]],
  [[36,-9],[43,-9],[44,-1],[48,-4],[49,0],[51,2],[53,5],[54,9],[57,8],[58,6],[62,5],[70,20],[71,28],[69,40],[66,44],[60,60],[46,50],[45,37],[41,29],[40,26],[38,24],[36,22],[40,19],[44,13],[40,18],[38,16],[42,12],[44,9],[43,4],[42,3],[37,-1],[36,-6],[36,-9]],
  [[50,-5],[51,1],[53,0],[56,-2],[58,-3],[58,-6],[55,-6],[53,-4],[51,-4],[50,-5]],
  [[35,-6],[37,10],[33,11],[31,20],[32,30],[30,33],[22,37],[12,43],[11,51],[2,46],[-5,40],[-15,41],[-25,35],[-34,26],[-35,20],[-29,16],[-17,12],[-10,13],[-5,12],[4,9],[5,2],[4,-8],[8,-13],[15,-17],[21,-17],[28,-13],[35,-6]],
  [[-12,49],[-16,50],[-25,47],[-25,44],[-16,44],[-12,49]],
  [[41,29],[37,36],[30,35],[13,44],[17,54],[22,60],[25,57],[25,66],[23,68],[20,73],[8,77],[13,80],[22,88],[21,92],[16,95],[10,98],[1,104],[7,100],[13,100],[10,105],[16,108],[21,108],[23,117],[30,122],[35,120],[40,122],[39,125],[35,126],[38,129],[43,132],[50,141],[54,136],[60,150],[60,163],[65,179],[70,179],[73,140],[77,105],[73,80],[68,70],[70,58],[66,44],[60,60],[46,50],[45,37],[41,29]],
  [[31,130],[34,131],[36,136],[41,140],[45,142],[43,145],[40,142],[35,141],[33,135],[31,130]],
  [[5,95],[-6,106],[-8,115],[-8,125],[-3,135],[-9,141],[-1,131],[2,118],[7,117],[1,109],[5,95]],
  [[-11,131],[-12,137],[-17,141],[-11,142],[-19,146],[-25,153],[-33,152],[-38,148],[-38,141],[-35,136],[-32,133],[-35,118],[-31,115],[-22,114],[-20,119],[-14,126],[-11,131]],
];
const enPol = (lat, lon, p) => {
  let d = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [ai, oi] = p[i];
    const [aj, oj] = p[j];
    if (ai > lat !== aj > lat && lon < ((oj - oi) * (lat - ai)) / (aj - ai) + oi) d = !d;
  }
  return d;
};
const esTierra = (lat, lon) => CONT.some((p) => enPol(lat, lon, p));

export const vec = (lat, lon) => {
  const f = lat * RAD;
  const l = lon * RAD;
  return new THREE.Vector3(Math.cos(f) * Math.cos(l), Math.sin(f), -Math.cos(f) * Math.sin(l));
};
const ARRIBA = new THREE.Vector3(0, 1, 0);
/** Este y norte locales de un punto de la esfera. */
const base = (n) => {
  const e = new THREE.Vector3().crossVectors(ARRIBA, n).normalize();
  const no = new THREE.Vector3().crossVectors(n, e).normalize();
  return { e, no };
};
const apoyar = (obj, dir, h = 0) => {
  const n = dir.clone().normalize();
  const { e, no } = base(n);
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(e, n, no.clone().negate()));
  obj.position.copy(n.multiplyScalar(R + h));
};
const puntosArco = (a, b, n, alt) => {
  const q = new THREE.Quaternion().setFromUnitVectors(a, b);
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const qt = new THREE.Quaternion().slerp(q, t);
    pts.push(a.clone().applyQuaternion(qt).multiplyScalar(R + 1.5 + Math.sin(Math.PI * t) * alt));
  }
  return pts;
};
const suave = (u) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2);
const tope = (x) => Math.min(1, Math.max(0, x));
/** Kilómetros entre dos paradas por la superficie (para el letrero de la ruta). */
export const kmEntre = (A, B) => Math.round(vec(A.lat, A.lon).angleTo(vec(B.lat, B.lon)) * 6371);

function letrero(a, b) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const x = c.getContext('2d');
  x.fillStyle = 'rgba(10,19,48,.92)';
  const r = 34;
  x.beginPath();
  x.moveTo(r, 10); x.arcTo(502, 10, 502, 150, r); x.arcTo(502, 150, 10, 150, r); x.arcTo(10, 150, 10, 10, r); x.arcTo(10, 10, 502, 10, r);
  x.fill();
  x.strokeStyle = '#FF6A2B';
  x.lineWidth = 6;
  x.stroke();
  x.fillStyle = '#fbf6ee';
  x.font = '700 58px "Space Grotesk"';
  x.textAlign = 'center';
  x.fillText(a, 256, 82);
  x.fillStyle = '#FF6A2B';
  x.font = '600 34px "JetBrains Mono"';
  x.fillText(b, 256, 128);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
  s.renderOrder = 10;
  return s;
}

/** Arma la escena fija una vez: planeta, ciudades, rutas, nubes, estrellas y el avión. */
function construir(mapa, ruta) {
  const escena = new THREE.Group();
  escena.add(new THREE.Mesh(new THREE.IcosahedronGeometry(R, 24), new THREE.MeshStandardMaterial({ color: COLOR.oceano, roughness: 0.55, metalness: 0.05, flatShading: true })));
  for (const s of [1, -1]) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(R + 0.6, 48, 8, 0, Math.PI * 2, 0, 0.32), new THREE.MeshStandardMaterial({ color: COLOR.blanco, flatShading: true }));
    if (s < 0) c.rotation.x = Math.PI;
    escena.add(c);
  }
  const fichas = [];
  const paso = 2.2;
  for (let lat = -56; lat <= 82; lat += paso) {
    const pl = paso / Math.max(0.2, Math.cos(lat * RAD));
    for (let lon = -180; lon < 180; lon += pl) if (esTierra(lat, lon)) fichas.push([lat, lon]);
  }
  const geoF = new THREE.CylinderGeometry(2.75, 3, 1, 6);
  geoF.translate(0, 0.5, 0);
  const inst = new THREE.InstancedMesh(geoF, new THREE.MeshStandardMaterial({ roughness: 0.8, flatShading: true }), fichas.length);
  const o3 = new THREE.Object3D();
  const col = new THREE.Color();
  const tonos = [COLOR.blanco, COLOR.blanco, COLOR.celesteClaro, 0xe3f1ff, 0xf3e7d8];
  fichas.forEach(([lat, lon], i) => {
    apoyar(o3, vec(lat, lon), -0.4);
    o3.scale.set(1, 0.9 + ((Math.sin(lat * 3.1 + lon * 1.7) + 1) / 2) * 1.3, 1);
    o3.updateMatrix();
    inst.setMatrixAt(i, o3.matrix);
    col.setHex(tonos[Math.abs(Math.round(lat * 7 + lon * 3)) % tonos.length]);
    inst.setColorAt(i, col);
  });
  escena.add(inst);
  {
    const n = 900;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3(random(`ex${i}`) - 0.5, random(`ey${i}`) - 0.5, random(`ez${i}`) - 0.5).normalize().multiplyScalar(1100 + random(`ed${i}`) * 400);
      pos.set([v.x, v.y, v.z], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    escena.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false })));
  }
  {
    const geo = new THREE.IcosahedronGeometry(2.4, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, flatShading: true, depthWrite: false });
    for (let i = 0; i < 30; i++) {
      const g = new THREE.Group();
      for (let k = 0; k < 3; k++) {
        const b = new THREE.Mesh(geo, mat);
        b.position.set((k - 1) * 2.6, random(`ny${i}${k}`), random(`nz${i}${k}`) * 1.5);
        b.scale.setScalar(0.8 + random(`ns${i}${k}`) * 0.6);
        g.add(b);
      }
      g.scale.setScalar(0.75);
      apoyar(g, vec(-50 + random(`nl${i}`) * 110, -180 + random(`no${i}`) * 360), 10 + random(`nh${i}`) * 3);
      escena.add(g);
    }
  }
  const ciudades = {};
  const matBase = new THREE.MeshStandardMaterial({ color: COLOR.celeste, flatShading: true });
  const matEd = new THREE.MeshStandardMaterial({ color: COLOR.blanco, flatShading: true });
  const matTecho = new THREE.MeshStandardMaterial({ color: COLOR.naranja, flatShading: true });
  const geoBase = new THREE.CylinderGeometry(4, 4.4, 0.8, 6);
  const geoEd = new THREE.BoxGeometry(1.2, 1, 1.2);
  for (const [id, p] of Object.entries(mapa)) {
    if (p.sinCiudad) continue;
    const g = new THREE.Group();
    const b = new THREE.Mesh(geoBase, matBase);
    b.position.y = 1.4;
    g.add(b);
    for (let i = 0; i < 5; i++) {
      const alto = 1.5 + ((i * 37 + id.length) % 5) * 0.7;
      const e = new THREE.Mesh(geoEd, i % 2 ? matEd : matTecho);
      e.scale.y = alto;
      e.position.set(Math.cos(i * 1.3) * 2.2, 1.8 + alto / 2, Math.sin(i * 1.3) * 2.2);
      g.add(e);
    }
    const anillo = new THREE.Mesh(new THREE.RingGeometry(5.2, 6, 6), new THREE.MeshBasicMaterial({ color: COLOR.naranja, transparent: true, opacity: 0, side: THREE.DoubleSide }));
    anillo.rotation.x = -Math.PI / 2;
    anillo.position.y = 2;
    g.add(anillo);
    apoyar(g, vec(p.lat, p.lon), 0);
    escena.add(g);
    const l = letrero(p.nombre, p.anio);
    l.position.copy(vec(p.lat, p.lon).multiplyScalar(R + (p.alto ?? 15)));
    escena.add(l);
    ciudades[id] = { anillo, l };
  }
  const avion = new THREE.Group();
  {
    const bl = new THREE.MeshStandardMaterial({ color: COLOR.blanco, flatShading: true });
    const na = new THREE.MeshStandardMaterial({ color: COLOR.naranja, flatShading: true });
    const nv = new THREE.MeshStandardMaterial({ color: COLOR.navy, flatShading: true });
    const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 3.6, 10), bl);
    cuerpo.rotation.x = Math.PI / 2;
    avion.add(cuerpo);
    for (const z of [1.8, -1.8]) {
      const t = new THREE.Mesh(new THREE.SphereGeometry(0.75, 10, 8), bl);
      t.position.z = z;
      avion.add(t);
    }
    const ala = new THREE.Mesh(new THREE.BoxGeometry(7, 0.18, 1.4), na);
    ala.position.set(0, -0.1, 0.2);
    avion.add(ala);
    const cola = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 0.8), na);
    cola.position.set(0, 0.1, -2.1);
    avion.add(cola);
    const timon = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.3, 0.9), na);
    timon.position.set(0, 0.75, -2.15);
    avion.add(timon);
    const cab = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 6), nv);
    cab.position.set(0, 0.45, 1.3);
    cab.scale.set(1, 0.7, 1.4);
    avion.add(cab);
    avion.userData.helice = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 0.08), nv);
    avion.userData.helice.position.set(0, 0, 2.65);
    avion.add(avion.userData.helice);
    avion.scale.setScalar(1.15);
    escena.add(avion);
  }
  // Rutas: la planeada punteada y tenue; la recorrida en naranja, que se dibuja con el vuelo.
  const estelas = [];
  for (let i = 0; i < ruta.length - 1; i++) {
    const A = mapa[ruta[i]];
    const B = mapa[ruta[i + 1]];
    const a = vec(A.lat, A.lon);
    const b = vec(B.lat, B.lon);
    const gp = new THREE.BufferGeometry().setFromPoints(puntosArco(a, b, 80, 6));
    const lp = new THREE.Line(gp, new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 2.2, gapSize: 2.4, transparent: true, opacity: 0.35 }));
    lp.computeLineDistances();
    escena.add(lp);
    const ge = new THREE.BufferGeometry().setFromPoints(puntosArco(a, b, 120, 14));
    ge.setDrawRange(0, 0);
    escena.add(new THREE.Line(ge, new THREE.LineBasicMaterial({ color: COLOR.naranja, transparent: true, opacity: 0.95 })));
    estelas.push(ge);
  }
  return { escena, ciudades, avion, estelas };
}

/**
 * Tramos del viaje a partir de las escenas: cada escena dice en qué parada está (`parada`), con qué
 * vista (`vista`) y cuántos segundos del inicio vuela desde la parada anterior (`vuelo`).
 */
export function tramosGlobo(escenas, fps) {
  let t = 0;
  let previa = null;
  const ruta = [];
  const tramos = escenas.map((e) => {
    const desde = t;
    t += e.dura;
    const parada = e.parada ?? previa;
    const vuela = previa && parada !== previa ? e.vuelo ?? 1.2 : 0;
    if (!ruta.length || ruta[ruta.length - 1] !== parada) ruta.push(parada);
    const r = { desde: desde * fps, hasta: t * fps, de: previa, parada, vuela: vuela * fps, tramo: vuela ? ruta.length - 2 : -1, vista: e.vista ?? 'cerca', centro: e.centro, off: e.off ?? [0, 0], offV: e.offV ?? e.off ?? [0, 0] };
    previa = parada;
    return r;
  });
  return { tramos, ruta };
}

const Escena = ({ datos, mapa, tramos, ruta }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { camera, size } = useThree();
  const { avion, ciudades, estelas } = datos;
  const vert = size.height > size.width;
  const k = tramos.findIndex((r) => frame < r.hasta);
  const actual = tramos[k < 0 ? tramos.length - 1 : k];
  const previo = tramos[Math.max(0, (k < 0 ? tramos.length - 1 : k) - 1)];
  const dir = (id) => vec(mapa[id].lat, mapa[id].lon);
  const theta = (f) => (f / fps) * 0.5;
  const enOrbita = (id, th) => {
    const d = dir(id);
    const { e, no } = base(d);
    const r = 9 / R;
    const p = d.clone().add(e.clone().multiplyScalar(Math.cos(th) * r)).add(no.clone().multiplyScalar(Math.sin(th) * r)).normalize();
    const f = e.clone().multiplyScalar(-Math.sin(th)).add(no.clone().multiplyScalar(Math.cos(th))).normalize();
    return { p, f };
  };
  const giro = (pDir, f, alabeo) => {
    const n = pDir.clone().normalize();
    const x = new THREE.Vector3().crossVectors(n, f).normalize();
    const fz = new THREE.Vector3().crossVectors(x, n).normalize();
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, n, fz));
    return q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), alabeo));
  };

  // --- El avión ---
  const u = actual.vuela ? tope((frame - actual.desde) / actual.vuela) : 1;
  let dirCam;
  let extra = 0;
  if (u < 1) {
    const s = suave(u);
    const ini = enOrbita(actual.de, theta(actual.desde)).p;
    const fin = enOrbita(actual.parada, theta(actual.desde + actual.vuela)).p;
    const q = new THREE.Quaternion().setFromUnitVectors(ini, fin);
    const p = ini.clone().applyQuaternion(new THREE.Quaternion().slerp(q, s));
    const p2 = ini.clone().applyQuaternion(new THREE.Quaternion().slerp(q, Math.min(1, s + 0.01)));
    const f = p2.clone().sub(p);
    f.sub(p.clone().multiplyScalar(f.dot(p))).normalize();
    // El rumbo del vuelo se funde con el de la órbita al despegar y al llegar: sin giros bruscos.
    let qa = giro(p, f, Math.sin(Math.PI * 2 * s) * 0.15);
    if (u < 0.25) qa = giro(enOrbita(actual.de, theta(actual.desde)).p, enOrbita(actual.de, theta(actual.desde)).f, -0.22).slerp(qa, suave(u / 0.25));
    if (u > 0.75) qa = giro(enOrbita(actual.parada, theta(actual.desde + actual.vuela)).p, enOrbita(actual.parada, theta(actual.desde + actual.vuela)).f, -0.22).slerp(qa, suave((1 - u) / 0.25));
    avion.quaternion.copy(qa);
    avion.position.copy(p.clone().multiplyScalar(R + 6 + Math.sin(Math.PI * s) * 14));
    const ang = dir(actual.de).angleTo(dir(actual.parada));
    dirCam = new THREE.Vector3().copy(dir(actual.de)).applyQuaternion(new THREE.Quaternion().slerp(new THREE.Quaternion().setFromUnitVectors(dir(actual.de), dir(actual.parada)), s));
    extra = Math.sin(Math.PI * s) * Math.min(95, ang * 110);
  } else {
    const { p, f } = enOrbita(actual.parada, theta(frame));
    avion.quaternion.copy(giro(p, f, -0.22));
    avion.position.copy(p.clone().multiplyScalar(R + 6 + Math.sin(frame / 21) * 0.4));
    dirCam = dir(actual.parada);
  }
  avion.userData.helice.rotation.z = frame * 1.3;

  // --- La cámara: cada escena tiene vista y encuadre; al cambiar de escena se funden en 0,8 s ---
  const fusion = actual === previo ? 1 : suave(tope((frame - actual.desde) / (0.8 * fps)));
  const mezcla = (a, b) => a + (b - a) * fusion;
  const va = VISTAS[previo.vista];
  const vb = VISTAS[actual.vista];
  const escala = vert ? 1.55 : 1;
  const v = { alt: mezcla(va.alt, vb.alt) * escala, tilt: mezcla(va.tilt, vb.tilt), mira: mezcla(va.mira, vb.mira) };
  const centroDe = (r) => (r.centro ? vec(r.centro[0], r.centro[1]) : null);
  const cA = centroDe(previo);
  const cB = centroDe(actual);
  if (cA || cB) dirCam = (cA ?? dirCam).clone().lerp(cB ?? dirCam, fusion).normalize();
  // Lejos se gira despacio para que el planeta no se vea quieto.
  if (actual.vista === 'lejos') dirCam = dirCam.clone().applyAxisAngle(ARRIBA, (frame - actual.desde) / fps * 0.035);
  const alt = v.alt + extra;
  const { no } = base(dirCam);
  camera.position.copy(dirCam.clone().multiplyScalar(R + alt).add(no.clone().multiplyScalar(-alt * v.tilt)));
  camera.up.copy(no);
  camera.lookAt(dirCam.clone().multiplyScalar(R * v.mira));
  const oA = vert ? previo.offV : previo.off;
  const oB = vert ? actual.offV : actual.off;
  camera.setViewOffset(size.width, size.height, mezcla(oA[0], oB[0]) * size.width, mezcla(oA[1], oB[1]) * size.height, size.width, size.height);
  camera.updateProjectionMatrix();

  // --- Estelas, anillos y letreros ---
  estelas.forEach((g, i) => {
    let p = 0;
    for (const r of tramos) {
      if (r.tramo !== i) continue;
      p = frame < r.desde ? 0 : suave(tope((frame - r.desde) / r.vuela));
    }
    g.setDrawRange(0, Math.floor(p * 121));
  });
  const lejos = actual.vista === 'lejos';
  for (const [id, c] of Object.entries(ciudades)) {
    const activa = id === actual.parada;
    c.l.visible = lejos ? ruta.includes(id) : activa;
    const sc = lejos ? 44 : 16;
    c.l.scale.set(sc, sc * 0.3125, 1);
    c.anillo.material.opacity = activa && u >= 1 ? 0.55 + 0.35 * Math.sin(frame / 9) : 0;
  }
  return null;
};

/** El planeta a pantalla completa. `escenas` es la lista del tráiler (las mismas que arman el video). */
export const Globo = ({ escenas, mapa }) => {
  const { width, height, fps } = useVideoConfig();
  const [listo, setListo] = useState(false);
  const [espera] = useState(() => delayRender('Fuentes de los letreros del planeta'));
  useEffect(() => {
    // Los letreros se pintan en un canvas: si las fuentes no han cargado, saldrían con la del sistema.
    cargarFuentes().then(() => { setListo(true); continueRender(espera); }).catch((e) => cancelRender(e));
  }, [espera]);
  const { tramos, ruta } = useMemo(() => tramosGlobo(escenas, fps), [escenas, fps]);
  const datos = useMemo(() => (listo ? construir(mapa, ruta) : null), [listo, mapa, ruta]);
  if (!datos) return null;
  return (
    <ThreeCanvas width={width} height={height} camera={{ fov: 50, near: 0.5, far: 3000, position: [0, 0, 600] }} gl={{ antialias: true }} style={{ width, height }}>
      <color attach="background" args={[COLOR.fondo]} />
      <hemisphereLight args={[0xdfefff, 0x1a2a5a, 1.6]} />
      <directionalLight position={[200, 260, 180]} intensity={2.2} />
      <primitive object={datos.escena} />
      <Escena datos={datos} mapa={mapa} tramos={tramos} ruta={ruta} />
    </ThreeCanvas>
  );
};
