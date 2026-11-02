import React from 'react';
import { MONO, TEXTO, useMetafora } from './base.js';

/**
 * Metaforas de papel: documentos, sellos y firmas. Son el mundo de un abogado,
 * asi que cargan el sentido sin explicarlo (una sentencia que se desvanece es
 * "alucinacion" antes de leer el titulo).
 */

/** Renglones de una hoja: rectangulos redondeados de ancho variable, siempre los mismos. */
const Renglones = ({ x, y, ancho, n, alto = 10, paso = 24, color, anchos = [1, 0.92, 0.97, 0.7, 0.88, 0.95, 0.6, 0.9] }) => (
  <g>
    {Array.from({ length: n }, (_, i) => (
      <rect key={i} x={x} y={y + i * paso} width={ancho * anchos[i % anchos.length]} height={alto} rx={alto / 2} fill={color} />
    ))}
  </g>
);

/** Seis sentencias que se ven perfectas y luego resultan no existir. */
export const Espejismo = ({ d = {} }) => {
  const { c, a, A, S } = useMetafora();
  const n = d.cantidad ?? 6;
  const etiqueta = d.etiqueta ?? 'No existe';
  const cols = 3;
  const w = 250, h = 228;
  return (
    <svg viewBox="0 0 900 560" width="100%" height="100%">
      {Array.from({ length: n }, (_, i) => {
        const x = 30 + (i % cols) * 290, y = 30 + Math.floor(i / cols) * 262;
        const entra = S(4 + i * 4);
        const cae = A(54 + i * 7, 18);
        return (
          <g key={i} transform={`translate(${x + cae * Math.sin(i * 7) * 6} ${y + (1 - entra) * 30})`} opacity={entra}>
            <rect width={w} height={h} rx={16} fill={a(c.tinta, 0.06 * (1 - cae) + 0.01)} stroke={cae > 0.5 ? a(c.error, 0.7) : a(c.tinta, 0.18)} strokeWidth={2} strokeDasharray={cae > 0.5 ? '10 8' : '0'} />
            <g opacity={1 - cae * 0.75}>
              <rect x={22} y={24} width={120} height={14} rx={7} fill={a(c.acento, 0.9)} />
              <text x={22} y={70} fontFamily={MONO} fontSize={17} fill={a(c.tinta, 0.55)}>{`Rad. ••• / 20••`}</text>
              <Renglones x={22} y={92} ancho={200} n={4} color={a(c.tinta, 0.16)} />
            </g>
            {/* El chulito verde de "se ve bien" pasa a la X roja cuando se descubre. */}
            <circle cx={w - 34} cy={34} r={16} fill={cae > 0.5 ? c.error : c.ok} opacity={0.9} />
            <path d={cae > 0.5 ? `M${w - 41} 27 l14 14 M${w - 27} 27 l-14 14` : `M${w - 42} 34 l6 6 l12 -12`} stroke={c.fondo} strokeWidth={4} fill="none" strokeLinecap="round" />
            <g opacity={A(60 + i * 7, 10)} transform={`translate(${w / 2} ${h / 2 + 30}) rotate(-12) scale(${1.4 - 0.4 * S(60 + i * 7)})`}>
              <rect x={-86} y={-24} width={172} height={48} rx={8} fill="none" stroke={c.error} strokeWidth={4} />
              <text textAnchor="middle" y={10} fontFamily={TEXTO} fontWeight={800} fontSize={26} letterSpacing={3} fill={c.error}>{etiqueta.toUpperCase()}</text>
            </g>
          </g>
        );
      })}
    </svg>
  );
};

/** Una lupa recorre un documento y marca el renglon que no se sostiene. */
export const Lupa = ({ d = {} }) => {
  const { f, c, a, A, S } = useMetafora();
  const malo = d.renglon ?? 3;
  const etiqueta = d.etiqueta ?? 'Cita inventada';
  const filas = 8, y0 = 96, paso = 50;
  // La lupa baja renglon por renglon y se detiene en el malo.
  const t = Math.min(1, Math.max(0, (f - 12) / 70));
  const ly = y0 + t * malo * paso + 6;
  const lx = 250 + Math.sin(f / 9) * 150 * (1 - A(84, 20));
  const halla = A(80, 14);
  return (
    <svg viewBox="0 0 900 560" width="100%" height="100%">
      <g opacity={A(0, 12)}>
        <rect x={120} y={40} width={560} height={500} rx={20} fill={a(c.tinta, 0.05)} stroke={a(c.tinta, 0.16)} strokeWidth={2} />
        <rect x={160} y={64} width={180} height={14} rx={7} fill={a(c.acento, 0.9)} />
        {Array.from({ length: filas }, (_, i) => (
          <rect key={i} x={160} y={y0 + i * paso} width={[440, 410, 460, 380, 430, 300, 450, 360][i]} height={14} rx={7}
            fill={i === malo ? a(c.error, 0.25 + 0.6 * halla) : a(c.tinta, 0.18)} />
        ))}
        <path d={`M160 ${y0 + malo * paso + 26} ${Array.from({ length: 19 }, (_, k) => `q 10 ${k % 2 ? 8 : -8} 20 0`).join(' ')}`} stroke={c.error} strokeWidth={3} fill="none"
          strokeDasharray={400} strokeDashoffset={400 * (1 - halla)} />
      </g>
      <g transform={`translate(${lx} ${ly})`} opacity={A(8, 10)}>
        <circle r={74} fill={a(c.tinta, 0.08)} stroke={c.tinta} strokeWidth={9} />
        <circle r={74} fill="none" stroke={a(c.fondo, 0.4)} strokeWidth={2} />
        <path d="M-30 -40 a52 52 0 0 1 40 -16" stroke={a(c.tinta, 0.6)} strokeWidth={6} fill="none" strokeLinecap="round" />
        <rect x={50} y={50} width={90} height={24} rx={12} transform="rotate(45 50 50)" fill={c.tinta} />
      </g>
      <g transform={`translate(700 ${y0 + malo * paso - 44}) scale(${S(88)})`} opacity={halla}>
        <rect x={0} y={0} width={190} height={60} rx={30} fill={c.error} />
        <text x={95} y={39} textAnchor="middle" fontFamily={TEXTO} fontWeight={700} fontSize={22} fill="#fff">{etiqueta}</text>
      </g>
    </svg>
  );
};

/** Anonimizar: barras negras tapan nombres y cifras, y un candado cierra el documento. */
export const Candado = ({ d = {} }) => {
  const { c, a, A, S, L } = useMetafora();
  const etiqueta = d.etiqueta ?? 'Anonimizado';
  // Cada renglon tiene un tramo "sensible" (nombre, cedula, cifra) que se tacha.
  const filas = [[0, 140, 120], [1, 60, 170], [2, 220, 90], [3, 30, 150], [4, 180, 130], [5, 90, 110]];
  const cierra = S(92, { stiffness: 260, damping: 14 });
  return (
    <svg viewBox="0 0 900 560" width="100%" height="100%">
      <g opacity={A(0, 12)} transform={`translate(0 ${(1 - A(0, 14)) * 20})`}>
        <rect x={170} y={36} width={500} height={488} rx={20} fill={a(c.tinta, 0.05)} stroke={a(c.tinta, 0.16)} strokeWidth={2} />
        <rect x={210} y={66} width={200} height={16} rx={8} fill={a(c.acento, 0.9)} />
        {filas.map(([i, x, w]) => (
          <g key={i}>
            <rect x={210} y={118 + i * 62} width={420} height={14} rx={7} fill={a(c.tinta, 0.14)} />
            <rect x={210 + x} y={112 + i * 62} width={w} height={26} rx={6} fill={a(c.acento, 0.55)} />
            <rect x={206 + x} y={110 + i * 62} width={(w + 8) * A(22 + i * 8, 12)} height={30} rx={4} fill="#05080F" />
          </g>
        ))}
      </g>
      <g transform={`translate(640 330) scale(${S(80)})`}>
        <path d={`M-44 0 v-46 a44 44 0 0 1 88 0 v${-10 + cierra * 46}`} stroke={c.tinta} strokeWidth={14} fill="none" strokeLinecap="round" />
        <rect x={-72} y={-4} width={144} height={124} rx={22} fill={c.acento} />
        <circle cx={0} cy={48} r={14} fill={c.fondo} />
        <rect x={-5} y={52} width={10} height={32} rx={5} fill={c.fondo} />
      </g>
      <text x={640} y={500} textAnchor="middle" fontFamily={TEXTO} fontWeight={700} fontSize={26} fill={c.acento} opacity={A(100, 12) * (0.75 + 0.25 * L())}>{etiqueta}</text>
    </svg>
  );
};

/** Diploma con sello que cae y un brillo que lo recorre: "certificado" sin decir la palabra. */
export const Certificado = ({ d = {} }) => {
  const { f, c, a, A, S } = useMetafora();
  const sello = S(46, { stiffness: 300, damping: 12 });
  const brillo = ((f - 70) % 90) / 90;
  const golpe = f > 46 && f < 56 ? Math.sin((f - 46) * 1.6) * 4 * (1 - (f - 46) / 10) : 0;
  return (
    <svg viewBox="0 0 900 560" width="100%" height="100%">
      <defs>
        <clipPath id="hoja-cert"><rect x={110} y={40} width={680} height={460} rx={18} /></clipPath>
        <linearGradient id="brillo-cert" x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset="0.5" stopColor="#fff" stopOpacity="0.22" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g transform={`translate(${golpe} ${(1 - A(0, 16)) * 30})`} opacity={A(0, 12)}>
        <rect x={110} y={40} width={680} height={460} rx={18} fill={c.tinta} />
        <rect x={132} y={62} width={636} height={416} rx={10} fill="none" stroke={c.acento} strokeWidth={3} />
        <rect x={142} y={72} width={616} height={396} rx={8} fill="none" stroke={a(c.acento, 0.4)} strokeWidth={1.5} />
        <text x={450} y={140} textAnchor="middle" fontFamily={TEXTO} fontWeight={800} fontSize={30} letterSpacing={10} fill={c.fondo}>{(d.titulo ?? 'Certificado').toUpperCase()}</text>
        <text x={450} y={184} textAnchor="middle" fontFamily={TEXTO} fontSize={20} fill={a(c.fondo, 0.6)}>{d.subtitulo ?? 'de participación'}</text>
        <rect x={270} y={236} width={360 * A(14, 20)} height={4} rx={2} fill={a(c.fondo, 0.8)} />
        <text x={450} y={226} textAnchor="middle" fontFamily="'Fraunces', Georgia, serif" fontSize={40} fontStyle="italic" fill={c.fondo} opacity={A(20, 16)}>{d.nombre ?? 'Tu nombre'}</text>
        <rect x={250} y={292} width={400} height={10} rx={5} fill={a(c.fondo, 0.18)} />
        <rect x={290} y={318} width={320} height={10} rx={5} fill={a(c.fondo, 0.18)} />
        <rect x={190} y={420} width={170} height={3} fill={a(c.fondo, 0.5)} />
        <rect x={540} y={420} width={170} height={3} fill={a(c.fondo, 0.5)} />
        <g clipPath="url(#hoja-cert)" opacity={f > 70 ? 1 : 0}>
          <rect x={110 + brillo * 900 - 300} y={40} width={200} height={460} fill="url(#brillo-cert)" transform="skewX(-20)" />
        </g>
      </g>
      <g transform={`translate(450 420) scale(${2.2 - 1.2 * sello}) rotate(${-8 * sello})`} opacity={Math.min(1, sello * 1.4)}>
        <path d="M-26 30 l-18 70 l26 -14 l18 22 l6 -74 Z" fill={a(c.acento, 0.85)} />
        <path d="M26 30 l18 70 l-26 -14 l-18 22 l-6 -74 Z" fill={c.acento} />
        {Array.from({ length: 24 }, (_, i) => (
          <path key={i} d="M0 -62 L7 -48 L-7 -48 Z" fill={c.acento} transform={`rotate(${i * 15})`} />
        ))}
        <circle r={52} fill={c.acento} />
        <circle r={40} fill="none" stroke={a('#ffffff', 0.7)} strokeWidth={2} strokeDasharray="4 5" />
        <path d="M0 -20 l6 13 l14 2 l-10 10 l2 14 l-12 -7 l-12 7 l2 -14 l-10 -10 l14 -2 Z" fill="#fff" />
      </g>
    </svg>
  );
};

/** Un documento se multiplica en muchas firmas y un contador sube hasta la cifra. */
export const Firmas = ({ d = {} }) => {
  const { f, c, a, A, S } = useMetafora();
  const total = d.numero ?? 200;
  const cols = 12, filas = 5, n = cols * filas;
  const avance = A(24, 70);
  const cuenta = Math.round(total * avance);
  return (
    <svg viewBox="0 0 900 560" width="100%" height="100%">
      <g transform={`translate(450 150) scale(${S(0)})`}>
        <rect x={-60} y={-80} width={120} height={150} rx={12} fill={c.tinta} />
        <rect x={-38} y={-54} width={60} height={10} rx={5} fill={c.acento} />
        {[0, 1, 2, 3].map((i) => <rect key={i} x={-38} y={-30 + i * 20} width={76 - (i % 2) * 18} height={8} rx={4} fill={a(c.fondo, 0.25)} />)}
      </g>
      {Array.from({ length: n }, (_, i) => {
        const x = 90 + (i % cols) * 62, y = 270 + Math.floor(i / cols) * 52;
        const e = S(20 + i * 1.1);
        const firmado = avance * n > i;
        return (
          <g key={i} transform={`translate(${450 + (x - 450) * e} ${150 + (y - 150) * e}) scale(${0.4 + 0.6 * e})`} opacity={e}>
            <rect x={-20} y={-20} width={40} height={40} rx={8} fill={firmado ? a(c.ok, 0.9) : a(c.tinta, 0.14)} />
            {firmado ? <path d="M-9 1 l6 6 l12 -13" stroke={c.fondo} strokeWidth={4} fill="none" strokeLinecap="round" /> : null}
          </g>
        );
      })}
      <g opacity={A(24, 10)}>
        <text x={640} y={140} fontFamily={MONO} fontWeight={700} fontSize={84} fill={c.tinta}>{cuenta}</text>
        <text x={640} y={184} fontFamily={TEXTO} fontSize={26} fill={a(c.tinta, 0.6)}>{d.unidad ?? 'firmas'}</text>
      </g>
    </svg>
  );
};

/** Tablero: filas que pasan de pendiente a firmado y una que avisa que vence. */
export const Tablero = ({ d = {} }) => {
  const { c, a, A, S, L } = useMetafora();
  const filas = d.filas ?? ['Contrato 014', 'Contrato 015', 'Contrato 016', 'Contrato 017', 'Contrato 018'];
  const alerta = d.alerta ?? 3;
  return (
    <svg viewBox="0 0 900 560" width="100%" height="100%">
      <g opacity={A(0, 12)} transform={`translate(0 ${(1 - A(0, 14)) * 20})`}>
        <rect x={70} y={30} width={760} height={500} rx={24} fill={a(c.tinta, 0.05)} stroke={a(c.tinta, 0.14)} strokeWidth={2} />
        {['#FB7185', '#FBBF24', '#34D399'].map((col, i) => <circle key={col} cx={108 + i * 26} cy={66} r={8} fill={col} opacity={0.8} />)}
        <text x={200} y={73} fontFamily={TEXTO} fontSize={20} fill={a(c.tinta, 0.55)}>{d.titulo ?? 'Tablero'}</text>
        {['Documento', 'Estado', 'Vence'].map((t, i) => (
          <text key={t} x={[110, 470, 680][i]} y={126} fontFamily={TEXTO} fontWeight={700} fontSize={17} letterSpacing={2} fill={a(c.tinta, 0.45)}>{t.toUpperCase()}</text>
        ))}
        {filas.map((nombre, i) => {
          const y = 150 + i * 72;
          const listo = A(30 + i * 12, 8);
          const vence = i === alerta;
          const color = vence ? c.pendiente : c.ok;
          return (
            <g key={nombre} opacity={S(8 + i * 5)}>
              <rect x={96} y={y} width={708} height={58} rx={12} fill={vence ? a(c.pendiente, 0.08 + 0.06 * L(1.4)) : a(c.tinta, 0.03)} />
              <text x={112} y={y + 37} fontFamily={TEXTO} fontSize={22} fill={c.tinta}>{nombre}</text>
              <rect x={460} y={y + 14} width={150} height={30} rx={15} fill={a(listo > 0.5 ? color : c.tinta, 0.16)} />
              <circle cx={478} cy={y + 29} r={6} fill={listo > 0.5 ? color : a(c.tinta, 0.4)} />
              <text x={492} y={y + 36} fontFamily={TEXTO} fontWeight={600} fontSize={17} fill={listo > 0.5 ? color : a(c.tinta, 0.5)}>
                {listo > 0.5 ? (vence ? (d.textoAlerta ?? 'Vence en 5 días') : (d.textoListo ?? 'Firmado')) : 'Pendiente'}
              </text>
              <rect x={680} y={y + 22} width={90} height={12} rx={6} fill={a(vence ? c.pendiente : c.tinta, vence ? 0.8 : 0.2)} />
            </g>
          );
        })}
      </g>
    </svg>
  );
};

/** Rompecabezas: sin la pieza la imagen queda borrosa; con ella, se enfoca. */
export const Rompecabezas = ({ d = {} }) => {
  const { f, c, a, A, S, L } = useMetafora();
  const completo = d.completo !== false;
  const encaja = completo ? S(40, { stiffness: 220, damping: 18 }) : 0;
  const nitidez = completo ? A(52, 16) : 0;
  const pieza = (x, y, color, extra = {}) => (
    <g transform={`translate(${x} ${y})`} {...extra}>
      <path d="M0 0 h70 a26 26 0 1 1 52 0 h70 v70 a26 26 0 1 0 0 52 v70 h-192 Z" fill={color} stroke={a(c.fondo, 0.6)} strokeWidth={3} />
    </g>
  );
  return (
    <svg viewBox="0 0 900 560" width="100%" height="100%">
      <g transform="translate(258 88)" opacity={A(0, 12)}>
        <g opacity={0.45 + 0.55 * nitidez}>
          {pieza(0, 0, a(c.secundario, 0.85))}
          {pieza(192, 0, a(c.tinta, 0.8), { transform: 'translate(384 0) scale(-1 1)' })}
          {pieza(0, 192, a(c.tinta, 0.65), { transform: 'translate(0 384) scale(1 -1)' })}
          {/* Lo que la pieza completa: renglones de un expediente que se leen solo con contexto. */}
          <g opacity={0.9}>
            {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={30} y={40 + i * 26} width={120 - (i % 2) * 30} height={10} rx={5} fill={a(c.fondo, 0.5)} />)}
          </g>
        </g>
        {completo ? null : <rect x={194} y={194} width={190} height={190} rx={8} fill="none" stroke={a(c.tinta, 0.4)} strokeWidth={3} strokeDasharray="12 10" />}
        <g transform={`translate(${192 + (1 - encaja) * 260} ${192 + (1 - encaja) * (completo ? -40 : 0) + (completo ? 0 : Math.sin(f / 12) * 8)}) rotate(${(1 - encaja) * 14})`}>
          <path d="M0 0 h70 a26 26 0 1 0 52 0 h70 v192 h-192 v-70 a26 26 0 1 0 0 -52 Z" fill={c.acento} stroke={a(c.fondo, 0.6)} strokeWidth={3} />
          <text x={96} y={108} textAnchor="middle" fontFamily={TEXTO} fontWeight={800} fontSize={24} fill={c.fondo}>{d.etiqueta ?? 'Contexto'}</text>
        </g>
      </g>
      {completo ? <circle cx={450} cy={280} r={260} fill="none" stroke={a(c.acento, 0.25 * nitidez * L(1.6, 0.4, 1))} strokeWidth={4} /> : null}
    </svg>
  );
};
