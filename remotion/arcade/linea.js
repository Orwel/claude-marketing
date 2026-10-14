/**
 * Linea de tiempo de una pieza Arcade (SOFA, oct-2026), en cuadros y sin React:
 * la leen la plantilla (remotion/plantillas/Arcade.jsx) y el sintetizador de
 * sonido 8 bits (src/audio/arcade.js), asi cada blip cae en el cuadro en que
 * aparece lo suyo.
 *
 * Una pieza Arcade es una lista de escenas ya armadas por src/sofa/armar.js
 * (pieza.generado.escenas): titulo, clip (entrevista), nivel (mapa), juego
 * (gameplay a pantalla completa), cierre y final. Aqui se resuelven, por escena:
 *  - paginas de dialogo (subtitulos por quien habla, tipo cuadro de RPG);
 *  - turnos (quien habla en cada momento) para el zoom al que habla;
 *  - golpes de texto pixel anclados a palabras ("¡A LA FUERZA!") y chispas
 *    automaticas (iconos pixel) con sus cuadros;
 *  - efectos (fx) y gameplay incrustado, anclados a palabras.
 */
export const FPS = 30;
export const ADELANTO = 6; // cuadros: lo que entra antes de la palabra se siente intencional
export const TRANSICION = 12; // cuadros del barrido pixel entre escenas

const aCuadros = (ms) => Math.round((ms / 1000) * FPS);
export const limpia = (t) => String(t ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]/g, '').trim();

/** Cuadro (relativo a la escena) en que se dice `en` (una o varias palabras); null si no se dice. */
export function cuadroDe(subtitulos, en, vez = 1, desde = -1) {
  if (!en) return null;
  const buscadas = limpia(en).split(' ');
  let vista = 0;
  for (let i = 0; i < subtitulos.length; i++) {
    if (aCuadros(subtitulos[i].startMs) <= desde) continue;
    if (buscadas.every((b, k) => limpia(subtitulos[i + k]?.text) === b) && ++vista === vez) return aCuadros(subtitulos[i].startMs);
  }
  return null;
}

/** Texto listo para el cuadro de dialogo: sin guiones de Whisper ni comillas sueltas, mayuscula tras punto. */
export function normalizar(subtitulos) {
  let mayuscula = true;
  return subtitulos
    .map((s) => ({ ...s, text: s.text.replace(/["“”]/g, ' ').replace(/^\s*-\s*/, '').replace(/\s+/g, ' ').trim() }))
    .filter((s) => s.text && s.text !== '-')
    .map((s) => {
      const text = mayuscula ? s.text.charAt(0).toLocaleUpperCase('es') + s.text.slice(1) : s.text;
      mayuscula = /[.?!]$/.test(s.text);
      return { ...s, text };
    });
}

// Lo que una pagina necesita quedarse en pantalla para leerse (13-oct-2026, Juan David: "los textos
// son muy fugaces"): ninguna dura menos de 0,9 s, y la ultima de cada escena se queda 0,9 s mas.
export const PAGINA_MIN_MS = 900;
export const COLA_PAGINA_MS = 900;

/**
 * Paginas del cuadro de dialogo: hasta 10 palabras o 2,4 s, cortando en
 * puntuacion, pausas de 500 ms y SIEMPRE cuando cambia quien habla (cada
 * pagina lleva el nombre de quien la dice). Las palabras que van en un golpe
 * no se repiten en el dialogo: salen en el golpe. Menos paginas y mas largas:
 * el ojo se queda en el mismo sitio y alcanza a leer.
 */
export function paginar(subtitulosCrudos, golpes = []) {
  const subtitulos = normalizar(subtitulosCrudos);
  // Mientras hay un golpe no aparece la caja (Juan David, 12-oct-2026). Las palabras que son del golpe
  // salen en el golpe; las dichas durante el golpe pero fuera de el salen en la caja apenas termina.
  const enGolpe = new Set(golpes.flatMap((g) => g.palabras.map((w) => w.startMs)));
  const ventanas = golpes.map((g) => ({ desde: (g.inicio / FPS) * 1000, hasta: (g.fin / FPS) * 1000 }));
  const paginas = [];
  let actual = null;
  for (const s of subtitulos) {
    if (enGolpe.has(s.startMs)) {
      actual = null;
      continue;
    }
    const tapada = ventanas.find((v) => s.startMs >= v.desde && s.startMs < v.hasta);
    let inicio = tapada ? tapada.hasta : s.startMs;
    // Si al terminar un golpe ya empezo otro, la palabra espera al que siga.
    for (let v = tapada && ventanas.find((x) => inicio >= x.desde && inicio < x.hasta); v; v = ventanas.find((x) => inicio >= x.desde && inicio < x.hasta)) inicio = v.hasta;
    const previo = actual?.tokens.at(-1);
    // Todo lo dicho mientras habia un golpe (y no es del golpe) se junta en UNA pagina que sale al terminar el golpe.
    const mismaEspera = tapada && actual && actual.espera === tapada && actual.quien === (s.quien ?? 'jd') && actual.tokens.length < 12;
    // Una coma no parte la pagina si la pagina es corta: "Yo diría que," + "es super fuerte" se lee de un tiron.
    const cierraFrase = /[.;:?!]$/.test(previo?.text ?? '') || (/,$/.test(previo?.text ?? '') && actual?.tokens.length >= 5);
    const corte = !actual || (tapada && !mismaEspera) || actual.quien !== s.quien || (!mismaEspera && (cierraFrase || s.startMs - previo.endMs > 500 || s.startMs - actual.startMs > 2400 || actual.tokens.length >= 10));
    if (corte) {
      actual = { startMs: inicio, quien: s.quien ?? 'jd', tokens: [], espera: tapada ?? null };
      paginas.push(actual);
    }
    actual.tokens.push({ text: s.text, startMs: Math.max(inicio, s.startMs), endMs: Math.max(s.endMs, inicio + 250) });
  }
  paginas.forEach((p, i) => {
    const siguiente = paginas[i + 1]?.startMs ?? Infinity;
    // Ninguna pagina sigue en pantalla cuando arranca un golpe.
    const golpeSiguiente = ventanas.filter((v) => v.desde > p.startMs).reduce((m, v) => Math.min(m, v.desde), Infinity);
    p.finMs = Math.min(p.tokens.at(-1).endMs + COLA_PAGINA_MS, siguiente, golpeSiguiente);
  });
  // Una pagina diferida por un golpe que dura menos de 400 ms se adelanta a la siguiente (misma persona):
  // "Entonces," salia un solo cuadro antes de "pues para eso tenemos".
  for (let i = paginas.length - 2; i >= 0; i--) {
    const p = paginas[i];
    const q = paginas[i + 1];
    const golpeEntre = ventanas.some((v) => v.desde >= p.startMs && v.desde < q.startMs + 1);
    if (!golpeEntre && p.espera && p.finMs - p.startMs < 400 && q.quien === p.quien && p.tokens.length + q.tokens.length <= 9) {
      q.tokens.unshift(...p.tokens);
      q.startMs = p.startMs;
      paginas.splice(i, 1);
    }
  }
  // Paginas fugaces (< 0,9 s, p. ej. "Yo", "Uy,", "Vamos a ver"): se juntan con la siguiente de la misma
  // persona; si no se puede, se alargan hasta el minimo y la siguiente entra despues (nunca encima de un golpe).
  for (let i = 0; i < paginas.length; i++) {
    const p = paginas[i];
    if (p.finMs - p.startMs >= PAGINA_MIN_MS) continue;
    const q = paginas[i + 1];
    const golpeEntre = q && ventanas.some((v) => v.desde >= p.startMs && v.desde < q.startMs + 1);
    if (q && !golpeEntre && q.quien === p.quien && p.tokens.length + q.tokens.length <= 12) {
      q.tokens.unshift(...p.tokens);
      q.startMs = p.startMs;
      paginas.splice(i, 1);
      i--;
      continue;
    }
    const previa = paginas[i - 1];
    const golpeAntes = previa && ventanas.some((v) => v.desde >= previa.startMs && v.desde < p.startMs + 1);
    if (previa && !golpeAntes && previa.quien === p.quien && previa.tokens.length + p.tokens.length <= 12) {
      previa.tokens.push(...p.tokens);
      previa.finMs = Math.max(previa.finMs, p.finMs);
      paginas.splice(i, 1);
      i--;
      continue;
    }
    const tope = Math.min(p.startMs + PAGINA_MIN_MS, ventanas.filter((v) => v.desde > p.startMs).reduce((m, v) => Math.min(m, v.desde), Infinity));
    p.finMs = Math.max(p.finMs, tope);
    if (q && q.startMs < p.finMs) q.startMs = p.finMs;
  }
  // Una pagina que no alcanza a leerse se suma a la anterior si es de la misma persona.
  for (let i = paginas.length - 1; i > 0; i--) {
    // Nunca se junta por encima de un golpe: la pagina anterior ya salio cuando el golpe entro.
    const golpeEnMedio = ventanas.some((v) => v.desde >= paginas[i - 1].startMs && v.desde < paginas[i].startMs + 1);
    if (!golpeEnMedio && paginas[i].finMs - paginas[i].startMs < 260 && paginas[i - 1].quien === paginas[i].quien && paginas[i - 1].tokens.length < 12) {
      paginas[i - 1].tokens.push(...paginas[i].tokens);
      paginas[i - 1].finMs = Math.max(paginas[i - 1].finMs, paginas[i].finMs);
      paginas.splice(i, 1);
    }
  }
  return paginas;
}

/** Turnos de habla en cuadros de la escena: [{ inicio, fin, quien }]. Se sacan de los subtitulos. */
export function turnosDe(subtitulos, cuadros) {
  const turnos = [];
  for (const s of subtitulos) {
    const q = s.quien ?? 'jd';
    const u = turnos.at(-1);
    if (u && u.quien === q) u.fin = aCuadros(s.endMs);
    else turnos.push({ inicio: Math.max(0, aCuadros(s.startMs) - ADELANTO), fin: aCuadros(s.endMs), quien: q });
  }
  if (!turnos.length) return [{ inicio: 0, fin: cuadros, quien: 'jd' }];
  turnos[0].inicio = 0;
  turnos.forEach((t, i) => { t.fin = turnos[i + 1] ? turnos[i + 1].inicio : cuadros; });
  return turnos;
}

/** Iconos pixel automaticos ("chispas") cuando se dice una palabra con peso. Nombres de remotion/arcade/Pixel.jsx. */
export const ICONOS_PIXEL = [
  [/^(demand|abogad|juez|ley|leyes|juridic|derecho|tribunal)/, 'martillo'],
  [/^(plata|dinero|cobra|cobrar|pesos|millon|precio|pagar|dolar)/, 'moneda'],
  [/^(videojuego|juego|jugar|juega|consola|nintendo|steam|gameplay)/, 'control'],
  [/^(personaje|cosplay|disfraz|heroe|villano)/, 'estrella'],
  [/^(fuerza|poder|golpe|espada|pelea|combat|ataca)/, 'espada'],
  [/^(magia|hechiz|varita|mago|bruja)/, 'varita'],
  [/^(corazon|amor|amig|respeto|cariñ)/, 'corazon'],
  [/^(indie|estudio|desarroll|programa|codigo|software)/, 'chip'],
  [/^(universidad|colegio|rosario|estudi|clase)/, 'libro'],
  [/^(muerte|morir|murio|cazador|monstruo|terror|macabr)/, 'calavera'],
  [/^(vida|vidas|salud|cura)/, 'vida'],
  [/^(premio|gano|ganar|trofeo|campeon|exito)/, 'trofeo'],
  [/^(mundo|real|realidad|mapa|lugar)/, 'mapa'],
  [/^(habilidad|skill|talento|nivel)/, 'rayo'],
];
export const DURA_CHISPA = 42;

function chispasDe(subtitulos, cuadros, ocupados) {
  const chispas = [];
  for (const s of subtitulos) {
    const palabra = limpia(s.text);
    const icono = ICONOS_PIXEL.find(([re]) => re.test(palabra))?.[1];
    if (!icono || palabra.length < 3) continue;
    const inicio = aCuadros(s.startMs) - 3;
    const fin = inicio + DURA_CHISPA;
    if (inicio < 12 || fin > cuadros - 6) continue;
    if (chispas.length && inicio - chispas.at(-1).inicio < 1.6 * FPS) continue;
    if (chispas.some((c) => c.palabra === palabra && inicio - c.inicio < 10 * FPS)) continue;
    if (ocupados.some((o) => inicio < o.fin + 4 && fin > o.inicio - 4)) continue;
    chispas.push({ inicio, fin, icono, palabra, texto: s.text.replace(/^-\s*/, '').replace(/[,.;:?!¿¡"]+/g, '').split(/\s+/)[0], lado: chispas.length % 2 ? 'derecha' : 'izquierda' });
  }
  return chispas;
}

/**
 * Golpes de texto pixel: `escena.golpes` = [{ en, vez?, texto?, estilo? }]. El texto es lo
 * que se dice (la palabra y hasta 2 vecinas) salvo que la pieza ponga uno propio ("¡+100 XP!").
 * Estilos: golpe (grande, sombra escalonada), pastilla (sobre bloque de acento), xp (verde +XP),
 * daño (rojo, tiembla). Duran ~1,3 s.
 */
function golpesDe(escena) {
  const subs = normalizar(escena.subtitulos ?? []);
  const golpes = [];
  const ESTILOS = ['golpe', 'pastilla', 'xp', 'golpe', 'daño'];
  const cierra = (t) => /[.?!;:]$/.test(t.trim());
  // En orden de tiempo, y cada palabra pertenece a un solo golpe: antes, las vecinas de "excepto" se tragaban
  // "a todos los cazadores" (el golpe anterior) y el segundo golpe se descartaba por encimado.
  const usadas = new Set();
  const pedidos = (escena.golpes ?? []).map((g) => ({ g, inicio: cuadroDe(subs, g.en, g.vez) })).filter((x) => x.inicio != null).sort((a, b) => a.inicio - b.inicio);
  // La palabra clave de un golpe esta reservada: ningun otro golpe la toma como vecina.
  const reservadas = new Set(pedidos.map(({ inicio }) => subs.find((s) => aCuadros(s.startMs) === inicio)?.startMs));
  for (const { g, inicio } of pedidos) {
    const i = subs.findIndex((s) => aCuadros(s.startMs) === inicio);
    // La clave son las palabras dichas que el golpe muestra (el texto, si son palabras dichas seguidas) o,
    // si el texto es propio ("$100.000.000"), las palabras de `en`. Siempre salen del dialogo.
    let clave = subs.slice(i, i + limpia(g.en).split(' ').length);
    if (g.texto) {
      const frase = limpia(g.texto).split(' ').filter(Boolean);
      for (let d = Math.max(0, i - frase.length + 1); d <= i; d++) {
        if (frase.every((w, k) => limpia(subs[d + k]?.text) === w)) { clave = subs.slice(d, d + frase.length); break; }
      }
    }
    // Frase completa alrededor (Juan David: "o todo en caja de texto o todo en enfasis"): hasta 3 palabras
    // antes y 3 despues, sin cruzar puntuacion final, pausas de 350 ms ni cambio de hablante.
    const i0 = subs.indexOf(clave[0]);
    const i1 = subs.indexOf(clave.at(-1));
    const quien = clave[0].quien ?? 'jd';
    const antes = [];
    // Hasta 10 palabras antes y 6 despues: con menos quedaban sueltas "En", "Yo" o "dijeron." en una caja fugaz.
    const ajena = (k) => usadas.has(subs[k].startMs) || (reservadas.has(subs[k].startMs) && !clave.includes(subs[k]));
    // Las pausas de hasta 0,9 s dentro de la frase no cortan las vecinas (aparecen cuando se dicen, la pausa no se nota);
    // y si al tope de 10 solo quedan 1 o 2 palabras sueltas de la frase, entran tambien ("Yo" no se queda solo en una caja).
    const sigueFrase = (k) => !(ajena(k) || cierra(subs[k].text) || subs[k + 1].startMs - subs[k].endMs > 900 || (subs[k].quien ?? 'jd') !== quien);
    for (let k = i0 - 1; k >= 0 && antes.length < 10; k--) {
      if (!sigueFrase(k)) break;
      antes.unshift(subs[k]);
    }
    for (let k = i0 - antes.length - 1, extra = 0; k >= 0 && antes.length === 10 + extra && extra < 2 && sigueFrase(k) && (k === 0 || !sigueFrase(k - 1) || extra === 1); k--, extra++) antes.unshift(subs[k]);
    const despues = [];
    if (!cierra(clave.at(-1).text)) {
      for (let k = i1 + 1; k < subs.length && despues.length < 6; k++) {
        if (ajena(k) || subs[k].startMs - subs[k - 1].endMs > 900 || (subs[k].quien ?? 'jd') !== quien) break;
        despues.push(subs[k]);
        if (cierra(subs[k].text)) break;
      }
    }
    // Un texto propio conserva su puntuacion ("¿QUÉ NOS RESPONDIERON?"); el de palabras dichas la pierde.
    const texto = (g.texto ?? clave.map((w) => w.text).join(' ').replace(/[,.;:?!]+$/, '')).toUpperCase();
    // Las vecinas pegadas a la clave que repiten lo que ya dice el texto grande (palabras o cifras) no se muestran,
    // pero se consumen: "100 millones" junto a "$100.000.000". Solo las pegadas: esconder un "video" a mitad de
    // "y haremos un video explicándolo" dejaba la frase sin sentido.
    const enTexto = new Set(limpia(texto).split(' '));
    const repite = (w) => limpia(w.text).split(' ').every((x) => enTexto.has(x)) || (/\d/.test(texto) && /^\d/.test(limpia(w.text)));
    const ocultas = new Set();
    for (let k = antes.length - 1; k >= 0 && repite(antes[k]); k--) ocultas.add(antes[k]);
    for (let k = 0; k < despues.length && repite(despues[k]); k++) ocultas.add(despues[k]);
    const muestra = (w) => !ocultas.has(w);
    // El golpe no entra antes de que termine la palabra anterior (si no, esa palabra quedaba suelta y salia
    // despues del golpe, fuera de contexto: "real?", "16 años.").
    let iPrev = subs.indexOf(antes[0] ?? clave[0]) - 1;
    // Y deja a la caja anterior (de la otra persona) al menos 0,9 s en pantalla desde su primera palabra: si el golpe
    // arrancaria antes, sus primeras vecinas pasan a la caja. Se mide desde el inicio de la tanda de esa persona, no
    // desde su ultima palabra: con 350 ms desde la ultima palabra, "Uff," quedaba suelto en una caja de 0,4 s.
    const inicioTanda = (k) => { let j = k; while (j > 0 && (subs[j - 1].quien ?? 'jd') === (subs[k].quien ?? 'jd') && !usadas.has(subs[j - 1].startMs)) j--; return subs[j].startMs; };
    while (antes.length && iPrev >= 0 && (subs[iPrev].quien ?? 'jd') !== quien && antes[0].startMs - inicioTanda(iPrev) < 900) {
      antes.shift();
      iPrev = subs.indexOf(antes[0] ?? clave[0]) - 1;
    }
    const finPrev = iPrev >= 0 ? aCuadros(Math.max(subs[iPrev].endMs, subs[iPrev].startMs + 350)) : 0;
    const inicioG = Math.min(aCuadros(clave[0].startMs), Math.max(0, aCuadros((antes[0] ?? clave[0]).startMs) - 2, finPrev));
    const finUltima = aCuadros((despues.at(-1) ?? clave.at(-1)).endMs);
    // Un golpe se queda al menos 1,5 s (antes 1,3) y 0,7 s despues de su ultima palabra: tiempo de leerlo.
    const finG = Math.min(escena.cuadros, Math.max(inicio + (g.dura ? Math.round(g.dura * FPS) : 45), finUltima + 21));
    const conCuadro = (w) => ({ text: w.text, startMs: w.startMs, cuadro: aCuadros(w.startMs) - inicioG });
    for (const w of [...antes, ...clave, ...despues]) usadas.add(w.startMs);
    golpes.push({
      inicio: inicioG, fin: finG, texto, estilo: g.estilo ?? ESTILOS[golpes.length % ESTILOS.length],
      palabras: [...antes, ...clave, ...despues].map((w) => ({ text: w.text, startMs: w.startMs })),
      antes: antes.filter(muestra).map(conCuadro), despues: despues.filter(muestra).map(conCuadro),
      clave: aCuadros(clave[0].startMs) - inicioG, lado: g.lado ?? (golpes.length % 2 ? 'derecha' : 'izquierda'),
      // `lineas` es solo presentacion (frase larga en renglones); el texto sigue mandando para casar palabras.
      ...(g.lineas ? { lineas: g.lineas } : {}),
    });
  }
  // Palabras sueltas entre dos golpes (menos de medio segundo de caja) pasan al golpe siguiente como vecinas.
  golpes.sort((a, b) => a.inicio - b.inicio);
  for (let k = 1; k < golpes.length; k++) {
    const a = golpes[k - 1];
    const b = golpes[k];
    const usadas = new Set([...a.palabras, ...b.palabras].map((w) => w.startMs));
    const entre = subs.filter((w) => aCuadros(w.startMs) >= a.inicio && aCuadros(w.startMs) < b.inicio + b.clave && !usadas.has(w.startMs) && w.startMs > (a.palabras.at(-1)?.startMs ?? -1));
    if (entre.length && entre.length <= 5 && (b.inicio - Math.min(a.fin, b.inicio)) < 15) {
      const nuevoInicio = Math.max(a.inicio + 1, aCuadros(entre[0].startMs) - 2);
      const corrimiento = b.inicio - nuevoInicio;
      b.inicio = nuevoInicio;
      b.clave += corrimiento;
      b.antes = b.antes.map((w) => ({ ...w, cuadro: w.cuadro + corrimiento }));
      b.despues = b.despues.map((w) => ({ ...w, cuadro: w.cuadro + corrimiento }));
      b.antes.unshift(...entre.map((w) => ({ text: w.text, startMs: w.startMs, cuadro: aCuadros(w.startMs) - nuevoInicio })));
      b.palabras.unshift(...entre.map((w) => ({ text: w.text, startMs: w.startMs })));
    }
  }
  // Sin golpes encimados: si el siguiente entra antes de que salga el anterior, el anterior se corta ahi; si
  // asi quedaria muy corto, el siguiente se descarta (sus palabras vuelven a la caja).
  golpes.sort((a, b) => a.inicio - b.inicio);
  const limpios = [];
  for (const g of golpes) {
    const u = limpios.at(-1);
    if (u && g.inicio < u.fin) {
      // El anterior se queda al menos 0,8 s despues de su clave. Si no cabe, el nuevo espera a que salga el anterior
      // (sus primeras vecinas ya dichas aparecen de una); solo si su clave ya paso se descarta (vuelve a la caja).
      if (g.inicio - u.inicio >= u.clave + 24) u.fin = g.inicio;
      else if (g.inicio + g.clave >= u.fin) {
        const corrimiento = u.fin - g.inicio;
        g.inicio = u.fin;
        g.clave -= corrimiento;
        g.antes = g.antes.map((w) => ({ ...w, cuadro: Math.max(0, w.cuadro - corrimiento) }));
        g.despues = g.despues.map((w) => ({ ...w, cuadro: w.cuadro - corrimiento }));
        g.fin = Math.max(g.fin, g.inicio + 45);
      } else continue;
    }
    // Ninguna palabra del golpe puede caer despues de que el golpe sale.
    g.palabras = g.palabras.filter((w) => aCuadros(w.startMs) < g.fin);
    g.despues = g.despues.filter((w) => w.cuadro < g.fin - g.inicio);
    limpios.push(g);
  }
  return limpios;
}

/** Efectos anclados a palabras: [{ tipo, en, hasta?, dura?, color?, ... }] → con inicio y fin en cuadros. */
function efectosDe(escena) {
  const subs = normalizar(escena.subtitulos ?? []);
  return (escena.fx ?? []).flatMap((f) => {
    const inicio = f.en ? cuadroDe(subs, f.en, f.vez) : Math.round((f.desde ?? 0) * FPS);
    if (inicio == null) return [];
    const i0 = Math.max(0, inicio - ADELANTO);
    const fin = f.hasta ? (cuadroDe(subs, f.hasta, f.vezHasta, i0 + ADELANTO) ?? i0 + Math.round((f.dura ?? 2.5) * FPS)) : i0 + Math.round((f.dura ?? 2.5) * FPS);
    return [{ ...f, inicio: i0, fin: Math.min(escena.cuadros, fin) }];
  });
}

/** Gameplay incrustado en una escena clip: { archivo, en|desde, hasta|dura, modo: lleno|dividido|ventana, desdeS }. */
function juegoDe(escena) {
  const subs = normalizar(escena.subtitulos ?? []);
  return (escena.juego ?? []).flatMap((j) => {
    const inicio = j.en ? cuadroDe(subs, j.en, j.vez) : Math.round((j.desde ?? 0) * FPS);
    if (inicio == null) return [];
    const i0 = Math.max(0, inicio - ADELANTO);
    const fin = j.hasta ? (cuadroDe(subs, j.hasta, j.vezHasta, i0 + ADELANTO) ?? i0 + Math.round((j.dura ?? 4) * FPS)) : i0 + Math.round((j.dura ?? 4) * FPS);
    return [{ modo: 'lleno', ...j, inicio: i0, fin: Math.min(escena.cuadros, fin) }];
  });
}

/** Acercamientos de golpe en las palabras con peso (una cada ~4 s), fuera de golpes y fichas. */
function zoomsDe(escena, ocupados) {
  const subs = normalizar(escena.subtitulos ?? []);
  const zooms = [];
  const pedidos = escena.zooms ?? subs.filter((s) => limpia(s.text).length >= 7 && !/^(entonces|tambien|porque|cualquier|estamos|tenemos|todavia|personaje)$/.test(limpia(s.text))).map((s) => ({ en: s.text }));
  for (const z of pedidos) {
    const inicio = (cuadroDe(subs, z.en, z.vez) ?? 0) - 2;
    const fin = inicio + Math.round((z.dura ?? 1.1) * FPS);
    if (inicio < 20 || fin > escena.cuadros - 10) continue;
    if (zooms.some((x) => Math.abs(x.inicio - inicio) < 4 * FPS)) continue;
    if (ocupados.some((o) => inicio < o.fin && fin > o.inicio)) continue;
    zooms.push({ inicio, fin, escala: z.escala ?? 1.12 });
    if (!escena.zooms && zooms.length >= Math.floor(escena.cuadros / (4 * FPS))) break;
  }
  return zooms.sort((a, b) => a.inicio - b.inicio);
}

export function lineaArcade(pieza) {
  const g = pieza.generado;
  if (!g) throw new Error(`${pieza.slug}: sin armar (npm run sofa-armar)`);
  const escenas = g.escenas.map((e) => {
    if (e.tipo !== 'clip' && e.tipo !== 'cierre') return { ...e };
    const golpes = golpesDe(e);
    const ficha = e.ficha ? { inicio: Math.round((e.fichaEn ?? 0.3) * FPS), fin: Math.round((e.fichaEn ?? 0.3) * FPS) + Math.round((e.fichaDura ?? 2.4) * FPS) } : null;
    const juego = juegoDe(e);
    const ocupados = [...golpes, ...(ficha ? [ficha] : []), ...juego];
    const paginas = paginar(e.subtitulos ?? [], golpes);
    return {
      ...e,
      golpes,
      ficha,
      juego,
      fx: efectosDe(e),
      paginas,
      turnos: turnosDe(e.subtitulos ?? [], e.cuadros),
      // Chispas apagadas (13-oct-2026): repetian una palabra del dialogo al lado y saturaban la pantalla.
      chispas: [],
      zooms: zoomsDe(e, ocupados),
    };
  });
  // Cada escena de nivel toma el mundo del personaje que viene (`personaje.tema`), salvo que traiga `mundo`.
  escenas.forEach((e, i) => {
    if (e.tipo !== 'nivel' || e.mundo) return;
    const prox = escenas.slice(i + 1).find((x) => x.personaje?.tema);
    e.mundo = prox?.personaje?.tema ?? pieza.mundo ?? 'pradera';
  });
  // Numero de jugador en orden de aparicion: Juan David es PLAYER 1 (con ficha en la intro o implicito).
  // Un personaje sin identificar (`anonimo`) tambien cuenta como jugador: su nombre en el dialogo es PLAYER N.
  let jugador = escenas.some((e) => e.personaje && /PLAYER 1/i.test(e.personaje?.etiqueta ?? '')) ? 1 : 2;
  const vistos = new Map();
  for (const e of escenas) {
    if (!e.personaje || e.tipo === 'nivel') continue;
    const clave = e.personaje.nombre;
    if (!vistos.has(clave)) vistos.set(clave, jugador++);
    e.jugador = vistos.get(clave);
  }
  // Cada cortinilla de nivel sabe quien viene (ficha, retrato, mundo) y quien acaba de hablar.
  escenas.forEach((e, i) => {
    if (e.tipo !== 'nivel') return;
    const prox = escenas.slice(i + 1).find((x) => (x.tipo === 'clip' || x.tipo === 'cierre') && x.personaje);
    const prev = escenas.slice(0, i).reverse().find((x) => (x.tipo === 'clip' || x.tipo === 'cierre') && x.personaje);
    e.prox = prox ? { personaje: prox.personaje, retrato: prox.retratoPng, jugador: prox.jugador } : null;
    e.prev = prev ? { personaje: prev.personaje, retrato: prev.retratoPng, jugador: prev.jugador } : null;
  });
  // Cambios de escena (barrido pixel) en cada frontera salvo la primera.
  const cambios = escenas.slice(1).map((e) => e.inicio);
  return { escenas, cambios, total: g.total };
}

/** Sonidos de una escena, relativos a su inicio: [{ cuadro, tipo }]. Tipos en src/audio/arcade.js. */
export function sonidosDe(e) {
  const s = [];
  if (e.tipo === 'titulo') {
    s.push({ cuadro: 2, tipo: 'inicio' }, { cuadro: 26, tipo: 'moneda' });
    const SONIDO_MOTIVO = { protesto: [[14, 'golpe'], [40, 'daño']], tesoro: [[10, 'moneda'], [22, 'moneda'], [34, 'moneda'], [48, 'moneda']], plataformas: [[20, 'salto'], [44, 'salto'], [60, 'moneda']], torneo: [[12, 'blip'], [24, 'blip'], [36, 'blip'], [56, 'fanfarria']], tienda: [[10, 'seleccion'], [30, 'blip'], [42, 'blip'], [54, 'moneda']], cartuchos: [[16, 'blip'], [30, 'blip'], [44, 'blip'], [58, 'seleccion']], arcade: [[12, 'moneda'], [40, 'seleccion']] };
    for (const [c, tipo] of SONIDO_MOTIVO[e.motivo] ?? []) s.push({ cuadro: c, tipo });
  }
  if (e.tipo === 'nivel') {
    const SONIDO_ESTILO = { vs: [[0, 'nivel'], [22, 'golpe']], seleccion: [[0, 'blip'], [8, 'blip'], [16, 'blip'], [30, 'seleccion']], encuentro: [[0, 'daño'], [18, 'ficha']], mundo2d: [[0, 'nivel'], [26, 'salto']], jefe: [[0, 'daño'], [10, 'daño'], [20, 'daño']], resultado: [[0, 'nivel'], [16, 'xp'], [26, 'xp'], [36, 'xp']], mision: [[0, 'seleccion'], [20, 'tecla'], [26, 'tecla'], [32, 'tecla']] };
    for (const [c, tipo] of SONIDO_ESTILO[e.estilo] ?? [[0, 'nivel']]) s.push({ cuadro: c, tipo });
  }
  if (e.tipo === 'juego') s.push({ cuadro: 0, tipo: 'seleccion' });
  if (e.tipo === 'final') s.push({ cuadro: 2, tipo: 'fanfarria' });
  if (e.tipo === 'clip' || e.tipo === 'cierre') {
    if (e.ficha) s.push({ cuadro: e.ficha.inicio, tipo: 'ficha' }, { cuadro: e.ficha.inicio + 10, tipo: 'tecla' }, { cuadro: e.ficha.inicio + 16, tipo: 'tecla' }, { cuadro: e.ficha.inicio + 22, tipo: 'tecla' });
    for (const g of e.golpes) s.push({ cuadro: g.inicio + 2, tipo: g.estilo === 'xp' ? 'xp' : g.estilo === 'daño' ? 'daño' : 'golpe' });
    for (const z of e.zooms) s.push({ cuadro: z.inicio, tipo: 'zoom' });
    const SONIDO_FX = { aura: 'poder', rayos: 'poder', corte: 'corte', onda: 'daño', relampago: 'daño', 'puño': 'golpe', pow: 'golpe', salto: 'salto', dobleSalto: 'salto', teletransporte: 'teletransporte', clones: 'seleccion', respawn: 'respawn', golpeado: 'daño', nivelUp: 'nivel', dinero: 'moneda', monedas: 'moneda', turnos: 'blip', mapa: 'blip', combo: 'golpe', vida: 'daño', escudo: 'poder', plataformas: 'blip', kagune: 'corte', crecer: 'poder' };
    for (const f of e.fx) { const tipo = SONIDO_FX[f.tipo] ?? (['lluvia', 'bits', 'luciernagas', 'polvo', 'niebla', 'brasas', 'levitar', 'vuelo', 'temblor', 'estrellas', 'nieve', 'fuego'].includes(f.tipo) ? null : 'poder'); if (tipo) s.push({ cuadro: f.inicio + 2, tipo }); if (f.tipo === 'dobleSalto') s.push({ cuadro: f.inicio + Math.round((f.fin - f.inicio) / 2), tipo: 'salto' }); if (f.tipo === 'teletransporte' || f.tipo === 'respawn') s.push({ cuadro: f.inicio + Math.round((f.fin - f.inicio) / 2), tipo: 'poder' }); }
    for (const j of e.juego) s.push({ cuadro: j.inicio, tipo: 'seleccion' });
    // Un tick de maquina de escribir al entrar cada pagina de dialogo.
    for (const p of e.paginas) s.push({ cuadro: Math.round((p.startMs / 1000) * FPS), tipo: 'texto' });
    // Pop suave en cada corte interno.
    e.tramos.slice(1).forEach((t) => s.push({ cuadro: t.inicio, tipo: 'pop' }));
  }
  return s;
}
