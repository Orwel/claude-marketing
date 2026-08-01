import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Almacen de estado en JSON plano. Sin base de datos a proposito:
 * el volumen es de una publicacion al dia y el historial debe ser
 * legible a ojo para poder auditar que esta aprendiendo el agente.
 */

export function leerJson(ruta, porDefecto = null) {
  if (!existsSync(ruta)) return porDefecto;
  try {
    return JSON.parse(readFileSync(ruta, 'utf8'));
  } catch (e) {
    throw new Error(`No se pudo leer ${ruta}: ${e.message}`);
  }
}

export function escribirJson(ruta, datos) {
  mkdirSync(dirname(ruta), { recursive: true });
  writeFileSync(ruta, JSON.stringify(datos, null, 2) + '\n', 'utf8');
}

const HISTORIAL_VACIO = { publicaciones: [], aprendizajes: [] };

export function leerHistorial(ruta) {
  const h = leerJson(ruta, HISTORIAL_VACIO);
  return {
    publicaciones: h.publicaciones ?? [],
    aprendizajes: h.aprendizajes ?? [],
  };
}

/** Añade una publicacion planificada al historial y devuelve su id. */
export function registrarPublicacion(ruta, publicacion) {
  const historial = leerHistorial(ruta);
  const id = publicacion.id ?? `pub_${Date.now()}`;
  historial.publicaciones.push({ ...publicacion, id });
  escribirJson(ruta, historial);
  return id;
}

/** Mezcla campos nuevos sobre una publicacion ya registrada. */
export function actualizarPublicacion(ruta, id, campos) {
  const historial = leerHistorial(ruta);
  const i = historial.publicaciones.findIndex((p) => p.id === id);
  if (i === -1) throw new Error(`No existe la publicacion ${id} en el historial`);
  historial.publicaciones[i] = { ...historial.publicaciones[i], ...campos };
  escribirJson(ruta, historial);
  return historial.publicaciones[i];
}

export function registrarAprendizaje(ruta, aprendizaje) {
  const historial = leerHistorial(ruta);
  historial.aprendizajes.push({ fecha: new Date().toISOString(), ...aprendizaje });
  escribirJson(ruta, historial);
}

/** Publicaciones ya publicadas que todavia no tienen metricas. */
export function pendientesDeMedir(ruta, horasMinimas = 24) {
  const limite = Date.now() - horasMinimas * 3600 * 1000;
  return leerHistorial(ruta).publicaciones.filter(
    (p) =>
      p.estado === 'publicada' &&
      !p.metricas &&
      p.publicadaEn &&
      new Date(p.publicadaEn).getTime() <= limite
  );
}
