import React from 'react';
import { MONO, TEXTO, TITULO, useMetafora } from './base.js';

/**
 * Metaforas de tiempo, criterio y conversacion. Cada una trae su dato por `d`
 * (fecha, numero, etiquetas); nada se inventa aqui dentro.
 */

/** Boleto de entrada: la invitacion a la clase. */
export const Boleto = ({ d = {} }) => {
  const { f, fps, c, a, A, S, L, marca } = useMetafora();
  const e = S(0, { stiffness: 200, damping: 16 });
  const aro = (f % (fps * 1.4)) / (fps * 1.4);
  return (
    <svg viewBox="0 0 900 560" width="100%" height="100%">
      <defs>
        <mask id="muescas-boleto">
          <rect x={0} y={0} width={900} height={560} fill="#fff" />
          <circle cx={690} cy={90} r={26} fill="#000" /><circle cx={690} cy={470} r={26} fill="#000" />
        </mask>
      </defs>
      <g transform={`translate(${(1 - e) * -120} 0) rotate(${(1 - e) * -6} 450 280)`} opacity={e}>
        <rect x={60} y={90} width={780} height={380} rx={28} fill={c.fondo2} stroke={a(c.tinta, 0.14)} strokeWidth={2} mask="url(#muescas-boleto)" />
        <rect x={60} y={90} width={780} height={8} rx={4} fill={c.acento} />
        <line x1={690} y1={124} x2={690} y2={436} stroke={a(c.tinta, 0.25)} strokeWidth={3} strokeDasharray="10 10" />
        <g transform="translate(110 150)" opacity={A(10, 12)}>
          <rect width={170} height={44} rx={22} fill={a(c.error, 0.16)} stroke={a(c.error, 0.5)} />
          <circle cx={26} cy={22} r={7} fill={c.error} />
          <circle cx={26} cy={22} r={7 + aro * 10} fill="none" stroke={c.error} strokeWidth={2} opacity={1 - aro} />
          <text x={44} y={30} fontFamily={TEXTO} fontWeight={800} fontSize={20} letterSpacing={2} fill={c.error}>{d.insignia ?? 'EN VIVO'}</text>
        </g>
        <text x={110} y={262} fontFamily={TITULO(marca)} fontWeight={600} fontSize={46} fill={c.tinta} opacity={A(14, 14)}>{d.titulo ?? 'Fundamentos para'}</text>
        <text x={110} y={318} fontFamily={TITULO(marca)} fontWeight={600} fontSize={46} fill={c.acento} opacity={A(18, 14)}>{d.titulo2 ?? 'la Inteligencia Artificial'}</text>
        <text x={110} y={410} fontFamily={MONO} fontWeight={700} fontSize={30} fill={a(c.tinta, 0.85)} opacity={A(26, 14)}>{d.fecha ?? '27 OCT · 7:00 P.M.'}</text>
        <g transform="translate(765 280) rotate(-90)" opacity={A(30, 14)}>
          <text textAnchor="middle" y={12} fontFamily={TEXTO} fontWeight={800} fontSize={40} letterSpacing={8} fill={c.acento}>{d.talon ?? 'GRATIS'}</text>
        </g>
      </g>
      <g transform={`translate(700 110) rotate(12) scale(${1.6 - 0.6 * S(44, { stiffness: 300, damping: 12 })})`} opacity={A(44, 6)}>
        <rect x={-120} y={-30} width={240} height={60} rx={10} fill={a(c.ok, 0.12)} stroke={c.ok} strokeWidth={4} />
        <text textAnchor="middle" y={10} fontFamily={TEXTO} fontWeight={800} fontSize={22} letterSpacing={2} fill={c.ok}>{d.sello ?? 'CON CERTIFICADO'}</text>
      </g>
      <rect x={60} y={480} width={780} height={6} rx={3} fill={a(c.acento, 0.12 + 0.2 * L())} />
    </svg>
  );
};

/** Reloj de arena y un numero grande que cuenta hacia atras. */
export const Reloj = ({ d = {} }) => {
  const { f, c, a, A, S, marca } = useMetafora();
  const final = d.numero ?? 8;
  const arena = A(0, 110);
  const mostrado = Math.max(final, final + 3 - Math.floor(A(10, 60) * 3));
  const salta = S(10 + (final + 3 - mostrado) * 20);
  return (
    <svg viewBox="0 0 900 560" width="100%" height="100%">
      <g transform="translate(250 280)" opacity={A(0, 10)}>
        <rect x={-120} y={-230} width={240} height={22} rx={11} fill={c.acento} />
        <rect x={-120} y={208} width={240} height={22} rx={11} fill={c.acento} />
        <path d="M-96 -208 C-96 -80 -14 -40 -14 0 C-14 40 -96 80 -96 208 H96 C96 80 14 40 14 0 C14 -40 96 -80 96 -208 Z" fill={a(c.tinta, 0.06)} stroke={a(c.tinta, 0.5)} strokeWidth={4} />
        {/* Arena de arriba: un triangulo que baja; abajo, un monticulo que sube. */}
        <path d={`M${-80 * (1 - arena)} ${-200 + 180 * arena} L${80 * (1 - arena)} ${-200 + 180 * arena} L0 -14 Z`} fill={c.acento} opacity={0.9} />
        <path d={`M-84 200 Q0 ${200 - 170 * arena} 84 200 Z`} fill={c.acento} />
        <line x1={0} y1={-14} x2={0} y2={200 - 150 * arena} stroke={c.acento} strokeWidth={4} strokeDasharray="6 6" strokeDashoffset={-f * 2} opacity={arena < 1 ? 1 : 0.3} />
      </g>
      <g transform="translate(560 300)">
        <text x={0} y={60} fontFamily={TITULO(marca)} fontWeight={700} fontSize={250} fill={c.tinta} transform={`translate(0 ${(1 - salta) * -40})`} opacity={0.4 + 0.6 * salta}>{mostrado}</text>
        <text x={8} y={130} fontFamily={TEXTO} fontWeight={600} fontSize={38} fill={c.acento} opacity={A(20, 12)}>{d.unidad ?? (final === 1 ? 'día' : 'días')}</text>
      </g>
    </svg>
  );
};

/** Hoja de calendario de octubre con el dia marcado a mano. */
export const Calendario = ({ d = {} }) => {
  const { c, a, A, S, L, marca } = useMetafora();
  const dia = d.dia ?? 27;
  const inicio = d.inicio ?? 3; // octubre de 2026 empieza en jueves (lunes = 0)
  const dias = d.dias ?? 31;
  const x0 = 180, y0 = 170, w = 78, h = 58;
  const pos = (n) => ({ x: x0 + ((n - 1 + inicio) % 7) * w, y: y0 + Math.floor((n - 1 + inicio) / 7) * h });
  const p = pos(dia);
  const trazo = A(40, 24);
  return (
    <svg viewBox="0 0 900 560" width="100%" height="100%">
      <g opacity={A(0, 12)} transform={`translate(0 ${(1 - A(0, 14)) * 24})`}>
        <rect x={140} y={40} width={620} height={500} rx={24} fill={a(c.tinta, 0.05)} stroke={a(c.tinta, 0.14)} strokeWidth={2} />
        <rect x={140} y={40} width={620} height={70} rx={24} fill={c.acento} />
        <rect x={140} y={86} width={620} height={24} fill={c.acento} />
        <text x={450} y={88} textAnchor="middle" fontFamily={TEXTO} fontWeight={800} fontSize={30} letterSpacing={6} fill={c.fondo}>{d.mes ?? 'OCTUBRE 2026'}</text>
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((l, i) => (
          <text key={i} x={x0 + i * w + 22} y={148} textAnchor="middle" fontFamily={TEXTO} fontWeight={700} fontSize={18} fill={a(c.tinta, 0.45)}>{l}</text>
        ))}
        {Array.from({ length: dias }, (_, i) => {
          const n = i + 1, q = pos(n);
          return (
            <text key={n} x={q.x + 22} y={q.y + 26} textAnchor="middle" fontFamily={TEXTO} fontWeight={n === dia ? 800 : 500} fontSize={24}
              fill={n === dia ? c.tinta : a(c.tinta, n < (d.hoy ?? 0) ? 0.2 : 0.6)} opacity={A(4 + i * 0.6, 8)}>{n}</text>
          );
        })}
      </g>
      {/* Circulo "a mano": trazo con dasharray que se dibuja y queda latiendo. */}
      <ellipse cx={p.x + 22} cy={p.y + 17} rx={36} ry={28} fill="none" stroke={c.acento} strokeWidth={5} strokeLinecap="round"
        strokeDasharray={210} strokeDashoffset={210 * (1 - trazo)} transform={`rotate(-8 ${p.x + 22} ${p.y + 17})`} opacity={0.6 + 0.4 * L()} />
      <g transform={`translate(320 486) scale(${S(60)})`} style={{ transformOrigin: '130px 26px' }}>
        <rect x={0} y={0} width={260} height={52} rx={26} fill={c.acento} />
        <text x={130} y={34} textAnchor="middle" fontFamily={TEXTO} fontWeight={700} fontSize={21} fill={c.fondo}>{d.etiqueta ?? 'Clase en vivo · 7 p.m.'}</text>
      </g>
    </svg>
  );
};

/** Semaforo de criterio: verde, ambar, rojo, cada uno con su regla. */
export const Semaforo = ({ d = {} }) => {
  const { f, fps, c, a, A, S } = useMetafora();
  const items = d.items ?? ['Confía: redactar y resumir', 'Verifica: citas y datos', 'No subas: el documento crudo'];
  const colores = [c.ok, c.pendiente, c.error];
  // Tras encender las tres, el foco recorre las luces en bucle.
  const foco = f < 70 ? -1 : Math.floor((f - 70) / (fps * 1.1)) % 3;
  return (
    <svg viewBox="0 0 900 560" width="100%" height="100%">
      <g opacity={A(0, 10)}>
        <rect x={80} y={40} width={170} height={480} rx={40} fill={a(c.tinta, 0.08)} stroke={a(c.tinta, 0.2)} strokeWidth={3} />
        {colores.map((col, i) => {
          const on = A(12 + i * 16, 8);
          const brilla = foco === i ? 1 : 0.75;
          return (
            <g key={i}>
              <circle cx={165} cy={120 + i * 160} r={58} fill={a(col, 0.12 + 0.78 * on * brilla)} />
              <circle cx={165} cy={120 + i * 160} r={58 + 16 * on * (foco === i ? 1 : 0)} fill="none" stroke={a(col, 0.4)} strokeWidth={4} />
              <g transform={`translate(${300 + (1 - S(16 + i * 16)) * 40} ${120 + i * 160})`} opacity={on}>
                <rect x={0} y={-40} width={540} height={80} rx={40} fill={a(col, foco === i ? 0.2 : 0.1)} stroke={a(col, 0.5)} strokeWidth={2} />
                <text x={34} y={11} fontFamily={TEXTO} fontWeight={700} fontSize={28} fill={c.tinta}>{items[i]}</text>
              </g>
            </g>
          );
        })}
      </g>
    </svg>
  );
};

/** Autocompletar: la frase pide la siguiente palabra y gana la mas probable, no la verdadera. */
export const Autocompletar = ({ d = {} }) => {
  const { f, c, a, A, S } = useMetafora();
  const frase = d.frase ?? 'El abogado citó la sentencia';
  const opciones = d.opciones ?? [['que parece real', 62], ['que no existe', 21], ['correcta', 11], ['anterior', 6]];
  const escrito = frase.slice(0, Math.floor(A(0, 34) * frase.length));
  const gana = S(78);
  const cursor = Math.floor(f / 12) % 2 === 0;
  const tam = Math.min(38, 1300 / (frase.length + opciones[0][0].length + 3));
  return (
    <svg viewBox="0 0 900 560" width="100%" height="100%">
      <rect x={40} y={40} width={820} height={120} rx={24} fill={a(c.tinta, 0.06)} stroke={a(c.tinta, 0.16)} strokeWidth={2} />
      <text x={80} y={112} fontFamily={TEXTO} fontWeight={600} fontSize={tam} fill={c.tinta}>
        {escrito}
        <tspan fill={c.acento} opacity={gana}>{gana > 0.05 ? ` ${opciones[0][0]}` : ''}</tspan>
        <tspan fill={c.acento}>{cursor ? ' ▍' : '  '}</tspan>
      </text>
      <text x={80} y={220} fontFamily={TEXTO} fontWeight={700} fontSize={18} letterSpacing={3} fill={a(c.tinta, 0.45)} opacity={A(34, 10)}>{(d.pregunta ?? 'Siguiente palabra más probable').toUpperCase()}</text>
      {opciones.map(([palabra, p], i) => {
        const e = A(38 + i * 6, 20);
        const y = 250 + i * 72;
        const primero = i === 0;
        return (
          <g key={palabra} opacity={e * (primero ? 1 : 1 - 0.5 * gana)}>
            <rect x={80} y={y} width={740} height={54} rx={14} fill={a(c.tinta, 0.04)} />
            <rect x={80} y={y} width={740 * (p / 100) * e} height={54} rx={14} fill={a(primero ? c.acento : c.secundario, primero ? 0.8 : 0.35)} />
            <text x={100} y={y + 36} fontFamily={TEXTO} fontWeight={600} fontSize={26} fill={c.tinta}>{palabra}</text>
            <text x={800} y={y + 36} textAnchor="end" fontFamily={MONO} fontWeight={700} fontSize={24} fill={a(c.tinta, 0.8)}>{Math.round(p * e)}%</text>
          </g>
        );
      })}
    </svg>
  );
};

/** Burbujas de chat que llegan: preguntas de la comunidad. */
export const Burbujas = ({ d = {} }) => {
  const { f, c, a, S } = useMetafora();
  const items = (d.items ?? ['¿Puedo subir el contrato de mi cliente?', '¿Cómo sé si es cierto?', '¿Cuál herramienta compro?']).slice(0, 5);
  const alto = 560 / Math.max(items.length + 1, 4);
  return (
    <svg viewBox="0 0 900 560" width="100%" height="100%">
      {items.map((t, i) => {
        const e = S(6 + i * 14);
        const izq = i % 2 === 0;
        const w = Math.min(760, 90 + t.length * 15.5);
        const x = izq ? 60 : 840 - w;
        const y = 20 + i * alto;
        return (
          <g key={i} transform={`translate(${x + (izq ? -30 : 30) * (1 - e)} ${y}) scale(${0.85 + 0.15 * e})`} opacity={e}>
            <circle cx={izq ? -2 : w + 2} cy={alto * 0.72 - 10} r={16} fill={a([c.acento, c.secundario, c.persona][i % 3], 0.9)} />
            <rect x={izq ? 24 : -24} y={0} width={w} height={alto * 0.72} rx={alto * 0.3} fill={izq ? a(c.tinta, 0.1) : a(c.acento, 0.9)} />
            <text x={(izq ? 24 : -24) + 30} y={alto * 0.36 + 10} fontFamily={TEXTO} fontWeight={600} fontSize={Math.min(28, alto * 0.3)} fill={izq ? c.tinta : c.fondo}>{t}</text>
          </g>
        );
      })}
      <g transform={`translate(60 ${20 + items.length * alto})`} opacity={S(6 + items.length * 14)}>
        <rect x={24} y={0} width={120} height={alto * 0.6} rx={alto * 0.3} fill={a(c.tinta, 0.08)} />
        {[0, 1, 2].map((k) => <circle key={k} cx={60 + k * 24} cy={alto * 0.3} r={7} fill={a(c.tinta, 0.4 + 0.5 * Math.max(0, Math.sin(f / 5 - k)))} />)}
      </g>
    </svg>
  );
};

/** Balanza: lo que la IA hace bien pesa mas que lo que recuerda. */
export const Balanza = ({ d = {} }) => {
  const { c, a, A, S, L, marca } = useMetafora();
  const inclina = -13 * S(30, { stiffness: 90, damping: 9 }) + L(3, -1, 1);
  const izq = d.izq ?? 'Transforma', der = d.der ?? 'Recuerda';
  const rad = (inclina * Math.PI) / 180;
  const py = (lado) => 150 + lado * 260 * Math.sin(rad);
  return (
    <svg viewBox="0 0 900 560" width="100%" height="100%">
      <g opacity={A(0, 12)}>
        <path d="M410 520 h80 l-20 -40 h-40 Z" fill={a(c.tinta, 0.5)} />
        <rect x={442} y={150} width={16} height={340} rx={8} fill={a(c.tinta, 0.5)} />
        <g transform={`rotate(${inclina} 450 150)`}>
          <rect x={180} y={142} width={540} height={16} rx={8} fill={c.tinta} />
        </g>
        <circle cx={450} cy={150} r={18} fill={c.acento} />
        {[-1, 1].map((lado) => {
          const x = 450 + lado * 260 * Math.cos(rad), y = py(lado);
          return (
            <g key={lado}>
              <line x1={x} y1={y} x2={x - 70} y2={y + 120} stroke={a(c.tinta, 0.4)} strokeWidth={3} />
              <line x1={x} y1={y} x2={x + 70} y2={y + 120} stroke={a(c.tinta, 0.4)} strokeWidth={3} />
              <path d={`M${x - 90} ${y + 120} h180 a90 30 0 0 1 -180 0 Z`} fill={a(c.tinta, 0.25)} />
              {lado < 0
                ? <rect x={x - 56} y={y + 36 - 50 * (1 - S(18))} width={112} height={84} rx={12} fill={c.acento} />
                : <rect x={x - 28} y={y + 80 - 50 * (1 - S(24))} width={56} height={40} rx={8} fill={a(c.secundario, 0.8)} />}
              <text x={x} y={y + 196} textAnchor="middle" fontFamily={TITULO(marca)} fontWeight={600} fontSize={40} fill={lado < 0 ? c.acento : a(c.tinta, 0.8)} opacity={A(40, 12)}>{lado < 0 ? izq : der}</text>
            </g>
          );
        })}
      </g>
    </svg>
  );
};

/** Brujula: la aguja da vueltas y se asienta en el criterio. */
export const Brujula = ({ d = {} }) => {
  const { f, c, a, A, S, marca } = useMetafora();
  const asienta = S(20, { stiffness: 40, damping: 7 });
  const giro = (1 - asienta) * 720 + Math.sin(f / 20) * 3 * asienta;
  return (
    <svg viewBox="0 0 900 560" width="100%" height="100%">
      <g transform="translate(450 290)" opacity={A(0, 12)}>
        <circle r={230} fill={a(c.tinta, 0.05)} stroke={a(c.tinta, 0.25)} strokeWidth={4} />
        <circle r={200} fill="none" stroke={a(c.tinta, 0.12)} strokeWidth={2} />
        {Array.from({ length: 36 }, (_, i) => (
          <line key={i} x1={0} y1={-200} x2={0} y2={i % 9 === 0 ? -176 : -188} stroke={a(c.tinta, i % 9 === 0 ? 0.7 : 0.3)} strokeWidth={i % 9 === 0 ? 4 : 2} transform={`rotate(${i * 10})`} />
        ))}
        <text y={-128} textAnchor="middle" fontFamily={TEXTO} fontWeight={800} fontSize={30} fill={c.acento}>{d.norte ?? 'N'}</text>
        <g transform={`rotate(${giro})`}>
          <path d="M0 -150 L22 0 L-22 0 Z" fill={c.acento} />
          <path d="M0 150 L22 0 L-22 0 Z" fill={a(c.tinta, 0.5)} />
          <circle r={16} fill={c.tinta} />
        </g>
      </g>
      <text x={450} y={40} textAnchor="middle" fontFamily={TITULO(marca)} fontWeight={600} fontSize={34} fill={c.tinta} opacity={A(60, 12)}>{d.etiqueta ?? ''}</text>
    </svg>
  );
};

/** Caja negra: se entreabre y deja ver una red de nodos adentro. */
export const Caja = ({ d = {} }) => {
  const { f, c, a, A, S } = useMetafora();
  const abre = S(40, { stiffness: 120, damping: 12 });
  const nodos = Array.from({ length: 14 }, (_, i) => ({ x: 330 + ((i * 97) % 240), y: 250 + ((i * 53) % 150) }));
  return (
    <svg viewBox="0 0 900 560" width="100%" height="100%">
      <g opacity={A(0, 10)}>
        <g opacity={abre}>
          {nodos.map((n, i) => nodos.slice(i + 1, i + 3).map((m, k) => (
            <line key={`${i}-${k}`} x1={n.x} y1={n.y} x2={m.x} y2={m.y} stroke={a(c.secundario, 0.6)} strokeWidth={2} />
          )))}
          {nodos.map((n, i) => <circle key={i} cx={n.x} cy={n.y} r={6 + 3 * Math.max(0, Math.sin(f / 8 + i))} fill={i % 3 ? c.secundario : c.acento} />)}
          <path d={`M300 ${220} L200 40 L700 40 L600 ${220} Z`} fill={a(c.acento, 0.08 * abre)} />
        </g>
        <path d="M280 220 L620 220 L620 480 L280 480 Z" fill="#05080F" stroke={a(c.tinta, 0.2)} strokeWidth={3} opacity={1 - 0.55 * abre} />
        <g transform={`rotate(${-38 * abre} 280 220)`}>
          <path d="M260 200 L640 200 L640 226 L260 226 Z" fill="#111827" stroke={a(c.tinta, 0.3)} strokeWidth={3} />
        </g>
        {['?', '?', '?'].map((q, i) => (
          <text key={i} x={330 + i * 120} y={360 - Math.sin(f / 10 + i) * 12} fontFamily={TEXTO} fontWeight={800} fontSize={70} fill={a(c.tinta, 0.5 * (1 - abre))}>{q}</text>
        ))}
      </g>
      <text x={450} y={530} textAnchor="middle" fontFamily={TEXTO} fontWeight={700} fontSize={26} fill={c.acento} opacity={A(60, 12)}>{d.etiqueta ?? ''}</text>
    </svg>
  );
};

/** Linea de tiempo: la campana suena dias antes del vencimiento, no despues. */
export const Alarma = ({ d = {} }) => {
  const { f, c, a, A, S } = useMetafora();
  const avance = A(10, 60);
  const suena = f > 70;
  const giro = suena ? Math.sin(f * 1.2) * 18 * Math.max(0.2, 1 - (f - 70) / 60) : 0;
  const x = 90 + avance * 440;
  return (
    <svg viewBox="0 0 900 560" width="100%" height="100%">
      <g opacity={A(0, 10)}>
        <line x1={80} y1={360} x2={820} y2={360} stroke={a(c.tinta, 0.25)} strokeWidth={6} strokeLinecap="round" />
        <line x1={80} y1={360} x2={x} y2={360} stroke={c.acento} strokeWidth={6} strokeLinecap="round" />
        {Array.from({ length: 12 }, (_, i) => <circle key={i} cx={90 + i * 66} cy={360} r={7} fill={90 + i * 66 <= x ? c.acento : a(c.tinta, 0.35)} />)}
        <g transform="translate(772 360)">
          <line x1={0} y1={0} x2={0} y2={-120} stroke={c.tinta} strokeWidth={5} />
          <path d="M0 -120 h70 l-16 22 l16 22 h-70 Z" fill={c.error} />
          <text x={0} y={52} textAnchor="middle" fontFamily={TEXTO} fontWeight={700} fontSize={24} fill={c.error}>{d.etiqueta ?? 'Vence'}</text>
        </g>
        <circle cx={x} cy={360} r={16} fill={c.tinta} />
        <g transform={`translate(${x} 250) rotate(${giro})`} opacity={A(60, 8)}>
          <path d="M-34 20 C-34 -30 -20 -44 0 -44 C20 -44 34 -30 34 20 L44 30 H-44 Z" fill={c.pendiente} />
          <circle cx={0} cy={38} r={9} fill={c.pendiente} />
        </g>
      </g>
      <g transform={`translate(${Math.min(x, 560) - 150} ${60 + (1 - S(76)) * -30})`} opacity={A(76, 10)}>
        <rect width={340} height={96} rx={20} fill={c.fondo2} stroke={a(c.pendiente, 0.6)} strokeWidth={2} />
        <text x={28} y={42} fontFamily={TEXTO} fontWeight={700} fontSize={24} fill={c.pendiente}>{d.aviso ?? 'Vence en 5 días'}</text>
        <text x={28} y={74} fontFamily={TEXTO} fontSize={19} fill={a(c.tinta, 0.6)}>{d.detalle ?? 'Todavía estás a tiempo'}</text>
      </g>
    </svg>
  );
};

/** En vivo: aros que salen de un punto rojo. */
export const Vivo = ({ d = {} }) => {
  const { f, fps, c, a, A, S, marca } = useMetafora();
  return (
    <svg viewBox="0 0 900 560" width="100%" height="100%">
      <g transform="translate(450 250)">
        {[0, 1, 2, 3].map((k) => {
          const t = ((f / fps + k * 0.5) % 2) / 2;
          return <circle key={k} r={60 + t * 220} fill="none" stroke={c.error} strokeWidth={4} opacity={(1 - t) * A(0, 10)} />;
        })}
        <circle r={60 * S(0)} fill={c.error} />
        <rect x={-14} y={-22} width={28} height={44} rx={14} fill="#fff" opacity={S(6)} />
      </g>
      <text x={450} y={480} textAnchor="middle" fontFamily={TITULO(marca)} fontWeight={700} fontSize={64} letterSpacing={4} fill={c.tinta} opacity={A(12, 12)}>{d.texto ?? 'EN VIVO'}</text>
    </svg>
  );
};

/** Camino de pasos: un punto recorre y enciende cada etapa. */
export const Pasos = ({ d = {} }) => {
  const { c, a, A, S } = useMetafora();
  const items = (d.items ?? ['Diagnóstico', 'Puntos', 'Construir', 'Entregas', 'Soporte']).slice(0, 5);
  const n = items.length;
  const x = (i) => 110 + (i * 680) / (n - 1);
  const avance = A(10, 80);
  return (
    <svg viewBox="0 0 900 560" width="100%" height="100%">
      <path d={`M${x(0)} 260 ${items.slice(1).map((_, i) => `Q ${(x(i) + x(i + 1)) / 2} ${i % 2 ? 330 : 190} ${x(i + 1)} 260`).join(' ')}`} fill="none" stroke={a(c.tinta, 0.2)} strokeWidth={6} strokeDasharray="4 14" strokeLinecap="round" />
      {items.map((t, i) => {
        const on = avance * (n - 1) >= i - 0.02;
        const e = S(10 + (80 * i) / (n - 1));
        return (
          <g key={t} transform={`translate(${x(i)} 260)`}>
            <circle r={54} fill={on ? c.acento : a(c.tinta, 0.1)} stroke={a(c.tinta, 0.25)} strokeWidth={2} transform={`scale(${0.8 + 0.2 * e})`} />
            <text y={15} textAnchor="middle" fontFamily={TEXTO} fontWeight={800} fontSize={42} fill={on ? c.fondo : a(c.tinta, 0.5)}>{i + 1}</text>
            <text y={i % 2 ? -88 : 118} textAnchor="middle" fontFamily={TEXTO} fontWeight={700} fontSize={32} fill={c.tinta} opacity={e}>{t}</text>
          </g>
        );
      })}
    </svg>
  );
};

/** Conversacion corta: la pregunta del abogado y la respuesta segura de la maquina. */
export const Chat = ({ d = {} }) => {
  const { f, c, a, A, S } = useMetafora();
  const pregunta = d.pregunta ?? '¿Estos casos son reales?';
  const respuesta = d.respuesta ?? 'Sí, son reales.';
  const escribe = f > 30 && f < 62;
  const responde = S(62);
  const vuelta = A(96, 12);
  return (
    <svg viewBox="0 0 900 560" width="100%" height="100%">
      <g transform={`translate(${840 - Math.min(700, 80 + pregunta.length * 17)} 90) scale(${S(6)})`}>
        <rect width={Math.min(700, 80 + pregunta.length * 17)} height={96} rx={34} fill={c.acento} />
        <text x={40} y={60} fontFamily={TEXTO} fontWeight={600} fontSize={32} fill={c.fondo}>{pregunta}</text>
      </g>
      <g transform="translate(60 250)">
        <circle cx={0} cy={60} r={26} fill={a(c.secundario, 0.9)} />
        {escribe ? (
          <g><rect x={46} y={20} width={130} height={80} rx={34} fill={a(c.tinta, 0.1)} />
            {[0, 1, 2].map((k) => <circle key={k} cx={84 + k * 26} cy={60} r={8} fill={a(c.tinta, 0.4 + 0.5 * Math.max(0, Math.sin(f / 4 - k)))} />)}</g>
        ) : (
          <g opacity={responde} transform={`scale(${0.9 + 0.1 * responde})`}>
            <rect x={46} y={20} width={Math.min(700, 120 + respuesta.length * 17)} height={96} rx={34} fill={a(c.tinta, 0.1)} stroke={vuelta > 0.5 ? c.error : 'none'} strokeWidth={3} />
            <text x={86} y={80} fontFamily={TEXTO} fontWeight={600} fontSize={32} fill={c.tinta}>{respuesta}</text>
            <circle cx={Math.min(700, 120 + respuesta.length * 17) + 20} cy={30} r={18} fill={vuelta > 0.5 ? c.error : c.ok} />
            <path d={vuelta > 0.5 ? `M${Math.min(700, 120 + respuesta.length * 17) + 13} 23 l14 14 m0 -14 l-14 14` : `M${Math.min(700, 120 + respuesta.length * 17) + 12} 30 l6 6 l10 -12`} stroke={c.fondo} strokeWidth={4} fill="none" strokeLinecap="round" />
          </g>
        )}
      </g>
      <text x={450} y={470} textAnchor="middle" fontFamily={TEXTO} fontWeight={800} fontSize={40} fill={c.error} opacity={vuelta}>{d.remate ?? ''}</text>
    </svg>
  );
};
