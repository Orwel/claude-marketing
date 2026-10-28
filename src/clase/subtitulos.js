import { writeFileSync } from 'node:fs';

/**
 * Subtítulos de una clase: en ASS (los quema ffmpeg con libass) y en WebVTT (closed captions del
 * reproductor de la app, que se prenden y se apagan). Ambos salen de las mismas líneas.
 *
 * Van en UNA línea, en la franja de abajo de la pantalla compartida (la grabación de LiveKit la
 * deja vacía): así no tapan nada de lo que el profesor muestra. Una línea de hasta ~70
 * caracteres se lee en el tiempo que se dice; dos líneas no caben en esa franja.
 *
 * Cortes: en pausas de más de 0,5 s, al final de una oración, o al llegar al largo máximo,
 * prefiriendo cortar después de una coma. `clase.subtitulos.correcciones` arregla palabras que
 * Whisper escribe mal ({"Banegas": "Vanegas"}); se aplican sobre la palabra suelta y sobre frases.
 */
export function lineasDe({ clase, transcripcion, desde, hasta }) {
  const cfg = clase.subtitulos ?? {};
  const MAX = cfg.maxCaracteres ?? 68;
  const MAXSEG = cfg.maxSegundos ?? 5;
  // `omitir`: tramos donde Whisper alucinó (repite una palabra decenas de veces en un ruido).
  const omitir = cfg.omitir ?? [];
  const palabras = transcripcion
    .flatMap((s) => s.palabras)
    .filter((w) => w.fin > desde && w.ini < hasta && w.p.trim() && !omitir.some((o) => w.ini >= o.desde && w.ini < o.hasta));

  const lineas = [];
  let cur = [];
  const cerrar = () => {
    if (cur.length) lineas.push(cur);
    cur = [];
  };
  for (let i = 0; i < palabras.length; i++) {
    const w = palabras[i];
    const prev = cur[cur.length - 1];
    if (prev && w.ini - prev.fin > 0.5) cerrar();
    const texto = [...cur, w].map((x) => x.p).join(' ');
    if (cur.length && (texto.length > MAX || w.fin - cur[0].ini > MAXSEG)) {
      // Si hay una coma en la segunda mitad de la línea, se corta ahí y el resto pasa a la siguiente.
      const k = cur.findLastIndex((x, j) => j >= cur.length / 2 && /[,;:]$/.test(x.p));
      if (k >= 0 && k < cur.length - 1) {
        const resto = cur.slice(k + 1);
        cur = cur.slice(0, k + 1);
        cerrar();
        cur = resto;
      } else cerrar();
    }
    cur.push(w);
    if (/[.?!…]$/.test(w.p) && cur.map((x) => x.p).join(' ').length > 18) cerrar();
  }
  cerrar();
  return lineas;
}

/** Inicio, fin (segundos del MP4 final) y texto corregido de cada línea. */
function cuesDe({ clase, transcripcion, desde, hasta, aSalida }) {
  const lineas = lineasDe({ clase, transcripcion, desde, hasta });
  const corr = Object.entries(clase.subtitulos?.correcciones ?? {});
  const corregir = (txt) => corr.reduce((t, [mal, bien]) => t.replace(new RegExp(`(?<![\\p{L}])${mal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'gu'), bien), txt);
  return lineas.map((l, i) => {
    const ini = aSalida(l[0].ini);
    const sig = lineas[i + 1] ? aSalida(lineas[i + 1][0].ini) : Infinity;
    // Se queda un poco más que la última palabra (lectura), sin pisar la línea siguiente.
    const fin = Math.min(aSalida(l[l.length - 1].fin) + 0.35, sig - 0.02);
    const txt = corregir(l.map((x) => x.p).join(' ')).replace(/\s+/g, ' ').trim();
    return { ini, fin, txt };
  });
}

export function generarAss({ clase, transcripcion, desde, hasta, aSalida, salida }) {
  const cfg = clase.subtitulos ?? {};
  const T = clase.tema;
  const fmt = (s) => {
    s = Math.max(0, s);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = (s % 60).toFixed(2).padStart(5, '0');
    return `${h}:${String(m).padStart(2, '0')}:${ss}`;
  };
  // ASS usa &HAABBGGRR (alfa invertido: 00 = opaco).
  const color = (hex, alfa = 0) => `&H${alfa.toString(16).padStart(2, '0').toUpperCase()}${hex.slice(5, 7)}${hex.slice(3, 5)}${hex.slice(1, 3)}`.toUpperCase();
  const [px, py, pw, ph] = clase.marco.pantalla;
  const margenV = Math.max(8, Math.round((1080 - py - ph - (cfg.tamano ?? 34)) / 2) - 4);
  const cab = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Clase,Inter SemiBold,${cfg.tamano ?? 34},${color(T.tinta)},${color(T.acento)},${color(T.fondo, 0x40)},${color(T.fondo, 0x60)},0,0,0,0,100,100,0,0,1,2.4,0,2,${px + 20},${1920 - px - pw + 20},${margenV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  const ev = cuesDe({ clase, transcripcion, desde, hasta, aSalida }).map(
    (c) => `Dialogue: 0,${fmt(c.ini)},${fmt(c.fin)},Clase,,0,0,0,,${c.txt}`
  );
  writeFileSync(salida, '﻿' + cab + ev.join('\n') + '\n', 'utf8');
  return ev.length;
}

/** Los mismos subtítulos en WebVTT: la app los muestra como closed captions de la grabación. */
export function generarVtt({ clase, transcripcion, desde, hasta, aSalida, salida }) {
  const fmt = (s) => {
    s = Math.max(0, s);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${(s % 60).toFixed(3).padStart(6, '0')}`;
  };
  const ev = cuesDe({ clase, transcripcion, desde, hasta, aSalida }).map(
    (c, i) => `${i + 1}\n${fmt(c.ini)} --> ${fmt(c.fin)}\n${c.txt}`
  );
  writeFileSync(salida, 'WEBVTT\n\n' + ev.join('\n\n') + '\n', 'utf8');
  return ev.length;
}
