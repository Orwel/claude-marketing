/**
 * Tiempos internos de cada grafico, en cuadros desde que entra. Viven aqui, sin
 * React, porque los leen dos lados: el componente que anima y el sintetizador
 * que pone un sonido en cada cosa que aparece (src/audio/pista.js). Si el
 * sonido y la animacion leyeran numeros distintos, el pop llegaria antes que
 * la tarjeta y el ojo lo nota.
 */
export const SALIDA = 8; // cuadros de salida de todo grafico
export const TRANSICION = 9; // medio barrido a cada lado del cambio de grabacion

export const T = {
  cajaNegra: { nodos: 6, pasoNodo: 1, enlaces: 14, pregunta: 18, etiqueta: 4 },
  ensayo: { titulo: 8, cuadrosPorLetra: 0.75, lineas: 22, pasoLinea: 3 },
  sello: { golpe: 0, tachon: 14, brillo: 8 },
  lenguaje: { fichas: 4, pasoFicha: 3, vectores: 20, barras: 40, pasoBarra: 4, ganadora: 58 },
  webinar: { insignia: 4, titulo: 10, boton: 28 },
};

/**
 * Efectos de sonido de un grafico: [{ cuadro, tipo }] relativos a su inicio.
 * Tipos: swish (entra una tarjeta), pop (aparece un elemento), tecla, impacto,
 * brillo (algo se ilumina), golpe (acercamiento de camara).
 */
export function efectosDe(g) {
  const e = [];
  const t = T[g.tipo];
  if (g.modo === 'arriba') e.push({ cuadro: 0, tipo: 'swish' });
  switch (g.tipo) {
    case 'cajaNegra':
      e.push({ cuadro: t.nodos, tipo: 'pop' }, { cuadro: t.enlaces, tipo: 'pop' }, { cuadro: t.pregunta, tipo: 'brillo' });
      break;
    case 'ensayo': {
      const letras = (g.titulo ?? '').length;
      for (let i = 0; i < letras; i += 3) e.push({ cuadro: Math.round(t.titulo + i * t.cuadrosPorLetra), tipo: 'tecla' });
      if (g.marcas?.autor !== undefined) e.push({ cuadro: g.marcas.autor, tipo: 'pop' }, { cuadro: g.marcas.autor + 4, tipo: 'brillo' });
      break;
    }
    case 'sello':
      if (g.estilo === 'tachar') e.push({ cuadro: t.golpe, tipo: 'impacto' }, { cuadro: t.tachon, tipo: 'swish' });
      else e.push({ cuadro: 0, tipo: 'pop' }, { cuadro: t.brillo, tipo: 'brillo' });
      break;
    case 'lenguaje':
      (g.fichas ?? []).forEach((_, i) => e.push({ cuadro: t.fichas + i * t.pasoFicha, tipo: 'pop' }));
      for (let i = 0; i < 8; i++) e.push({ cuadro: t.vectores + i * 3, tipo: 'tecla' });
      (g.opciones ?? []).forEach((_, i) => e.push({ cuadro: t.barras + i * t.pasoBarra, tipo: 'pop' }));
      e.push({ cuadro: t.ganadora, tipo: 'brillo' });
      break;
    case 'webinar':
      e.push({ cuadro: t.insignia, tipo: 'pop' }, { cuadro: t.titulo, tipo: 'brillo' }, { cuadro: t.boton, tipo: 'pop' });
      break;
    case 'zoom':
      e.push({ cuadro: 0, tipo: 'golpe' });
      break;
  }
  return e;
}
