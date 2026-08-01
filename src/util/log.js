const COLORES = {
  gris: '\x1b[90m',
  verde: '\x1b[32m',
  amarillo: '\x1b[33m',
  rojo: '\x1b[31m',
  azul: '\x1b[36m',
  reset: '\x1b[0m',
};

const hora = () => new Date().toISOString().slice(11, 19);

function escribir(color, etiqueta, mensaje, extra) {
  const linea = `${COLORES.gris}${hora()}${COLORES.reset} ${color}${etiqueta}${COLORES.reset} ${mensaje}`;
  console.log(linea);
  if (extra !== undefined) {
    console.log(
      typeof extra === 'string' ? extra : JSON.stringify(extra, null, 2)
    );
  }
}

export const log = {
  info: (m, e) => escribir(COLORES.azul, 'info ', m, e),
  ok: (m, e) => escribir(COLORES.verde, 'ok   ', m, e),
  aviso: (m, e) => escribir(COLORES.amarillo, 'aviso', m, e),
  error: (m, e) => escribir(COLORES.rojo, 'error', m, e),
  paso: (m) => console.log(`\n${COLORES.azul}▸ ${m}${COLORES.reset}`),
};
