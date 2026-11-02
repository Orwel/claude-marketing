/*
  Constelación de trifuerza.co hecha SVG (misma lógica que la propuesta de Dos Tierras): tres familias de
  nodos agrupadas hacia los vértices de un triángulo imaginario, con conceptos de esta propuesta escritos
  junto a los nodos. Enlaces sólidos dentro de cada familia y punteados entre familias. Semilla fija: el PDF
  sale vectorial e idéntico en cada impresión.

  Uso: <svg class="constelacion" data-paleta="trifuerza|legal|academy" data-semilla="7"
         data-zona="x0,y0,x1,y1" data-nodos="30" data-cliente="Nombre" viewBox="0 0 794 1123"></svg>
  Los conceptos de cada propuesta se pasan antes de cargar este archivo:
    <script>window.TERMINOS_PROPUESTA = { tech: [...], law: [...], design: [...] };</script>
  En pantalla titila y lleva pulsos; el CSS de la propuesta apaga las animaciones al imprimir.
*/
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const PALETAS = {
    trifuerza: {
      color: { tech: '#3B82F6', law: '#C9D3E6', design: '#F59E0B' }, acento: '#FFB038', halo: '#F28C28',
      terminos: {
        tech: ['</>', 'JavaScript', 'API', 'HTTPS', 'PostgreSQL', 'JSON', 'SEO', 'app móvil', 'en la nube', '{ }', 'trifuerza.co'],
        law: ['§', 'Art. 1°', 'contratos', 'T&C', 'Ley 1581', 'propiedad intelectual', 'firma electrónica', 'Decreto'],
        design: ['UX', 'identidad', 'storytelling', 'mockup', 'Design Thinking', '✦', '⬡', '△'],
      },
    },
    legal: {
      color: { tech: '#3B82F6', law: '#E8C547', design: '#C9D3E6' }, acento: '#E8C547', halo: '#C9A227',
      terminos: {
        tech: ['Rama Judicial', 'sync()', 'Telegram', 'correo', 'API', 'PostgreSQL', 'JavaScript', 'HTTPS', 'roles', '.csv', 'alertas', 'app móvil', 'PostgreSQL', '{ }', 'panel', 'App Store'],
        law: ['§', 'Art. 317 CGP', 'desistimiento tácito', 'radicado', 'términos', 'actuación', 'Ley 1581', 'expediente', 'T&C', 'auto admisorio', 'firma electrónica', 'habeas data'],
        design: ['UX', 'estudiantes', 'docentes', 'directores', 'semáforo', 'mobile first', 'capacitación', 'sustituciones', '✦', '⬡', '△'],
      },
    },
    academy: {
      color: { tech: '#3B82F6', law: '#C9D3E6', design: '#33D6DD' }, acento: '#33D6DD', halo: '#00C4CC',
      terminos: {
        tech: ['en vivo', 'streaming', 'OBS', 'QR', 'Mercado Pago', 'App Store', 'Play Store', 'SEO', 'CRM', 'JavaScript', 'pagos en línea', '{ }', 'HTTPS', 'API'],
        law: ['§', 'certificado', 'créditos', 'educación continua', 'Ley 1581', 'retracto', 'derechos de autor', 'T&C', 'acreditación'],
        design: ['UX', 'cursos', 'lecciones', 'evaluaciones', 'progreso', 'egresados', 'comunidad', 'docentes', 'diagnóstico', '✦', '⬡', '△'],
      },
    },
  };
  const PESO = { tech: 1.5, law: 1, design: 1 };

  const generador = (semilla) => () => { semilla = (semilla * 1664525 + 1013904223) % 4294967296; return semilla / 4294967296; };
  const el = (tag, attrs, padre) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); padre.appendChild(n); return n; };

  document.querySelectorAll('svg.constelacion').forEach((svg) => {
    const P = PALETAS[svg.dataset.paleta] || PALETAS.legal;
    const COLOR = P.color, TERMINOS = Object.assign({}, P.terminos, window.TERMINOS_PROPUESTA || {});
    const azar = generador(+svg.dataset.semilla || 1);
    const [x0, y0, x1, y1] = svg.dataset.zona.split(',').map(Number);
    const W = x1 - x0, H = y1 - y0;
    const total = +svg.dataset.nodos || 18;
    const cx = x0 + W / 2, cy = y0 + H / 2;
    const vertice = {
      law: { x: cx, y: cy - H * 0.3 },
      tech: { x: cx + Math.cos(Math.PI / 6) * W * 0.34, y: cy + H * 0.15 },
      design: { x: cx - Math.cos(Math.PI / 6) * W * 0.34, y: cy + H * 0.15 },
    };
    const sumaPesos = PESO.tech + PESO.law + PESO.design;
    const usados = new Set();
    const nodos = [];
    const S = Math.sqrt(W * H);
    // Minimalista: ningún nodo encima de otro. Se prueba varias posiciones y se descarta la que quede
    // a menos de `separacion` de un nodo ya puesto o del nodo del cliente.
    const separacion = S * 0.14;
    const centro = { x: cx + W * 0.02, y: cy + H * 0.02 };
    const libre = (x, y) => nodos.every((n) => Math.hypot(n.x - x, n.y - y) >= separacion)
      && (!svg.dataset.cliente || Math.hypot(centro.x - x, centro.y - y) >= separacion * 1.1);
    for (const tipo of ['tech', 'law', 'design']) {
      const n = Math.round(total * PESO[tipo] / sumaPesos);
      const v = vertice[tipo];
      for (let i = 0; i < n; i++) {
        let punto = null;
        for (let intento = 0; intento < 40 && !punto; intento++) {
          const ux = x0 + azar() * W, uy = y0 + azar() * H, mezcla = 0.65 + azar() * 0.35;
          const x = v.x + (ux - v.x) * mezcla, y = v.y + (uy - v.y) * mezcla;
          if (libre(x, y)) punto = { x, y };
        }
        if (!punto) continue;
        let palabra = null;
        if (azar() > 0.3) {
          const banco = TERMINOS[tipo].filter((t) => !usados.has(t));
          if (banco.length) { palabra = banco[Math.floor(azar() * banco.length)]; usados.add(palabra); }
        }
        nodos.push({ tipo, ...punto, palabra, alfa: 0.45 + azar() * 0.45, r: 1.8 + azar() * 1.4, tam: 9.5 + azar() * 3 });
      }
    }

    const enlaces = new Map();
    const unir = (i, j, f) => { const k = i < j ? i + '-' + j : j + '-' + i; enlaces.set(k, Math.max(enlaces.get(k) || 0, f)); };
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    nodos.forEach((a, i) => {
      const cercanos = [];
      nodos.forEach((b, j) => {
        if (i === j) return;
        const d = dist(a, b);
        const max = a.tipo === b.tipo ? S * 0.2 : S * 0.15;
        if (j > i && d < max) unir(i, j, 1 - d / max);
        if (d < S * 0.4) cercanos.push([d, j]);
      });
      cercanos.sort((p, q) => p[0] - q[0]).slice(0, 2).forEach(([d, j]) => unir(i, j, Math.max(0.3, 1 - d / (S * 0.4))));
    });

    const defs = el('defs', {}, svg);
    const capaLineas = el('g', {}, svg);
    const capaPulsos = el('g', {}, svg);
    const capaNodos = el('g', {}, svg);
    let g = 0, p = 0;
    enlaces.forEach((fuerza, clave) => {
      const [i, j] = clave.split('-').map(Number);
      const a = nodos[i], b = nodos[j];
      const base = Math.min(a.alfa, b.alfa);
      if (a.tipo === b.tipo) {
        el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: COLOR[a.tipo], 'stroke-width': 0.8, 'stroke-opacity': (fuerza * base * 0.9).toFixed(3) }, capaLineas);
        if (fuerza > 0.45 && p < 9) {
          p++;
          const pulso = el('circle', { class: 'pulso', r: 2, fill: '#fff', opacity: 0.9 }, capaPulsos);
          el('animateMotion', { dur: (2.4 + azar() * 2.4).toFixed(2) + 's', begin: (azar() * 3).toFixed(2) + 's', repeatCount: 'indefinite', path: `M${a.x},${a.y} L${b.x},${b.y}` }, pulso);
        }
      } else {
        const id = 'gc' + svg.dataset.semilla + '-' + g++;
        const grad = el('linearGradient', { id, gradientUnits: 'userSpaceOnUse', x1: a.x, y1: a.y, x2: b.x, y2: b.y }, defs);
        el('stop', { offset: 0, 'stop-color': COLOR[a.tipo] }, grad);
        el('stop', { offset: 1, 'stop-color': COLOR[b.tipo] }, grad);
        el('line', { class: 'cruce', x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: `url(#${id})`, 'stroke-width': 0.7, 'stroke-dasharray': '3 6', 'stroke-opacity': (fuerza * base * 0.7).toFixed(3) }, capaLineas);
      }
    });

    // Etiquetas sin choques: cada palabra ocupa una caja; si choca con otra caja, con un nodo o con el nombre
    // del cliente, se prueba al otro lado del nodo y, si tampoco cabe, el nodo queda sin palabra.
    const cajas = [];
    const choca = (c) => cajas.some((o) => c.x < o.x + o.w && c.x + c.w > o.x && c.y < o.y + o.h && c.y + c.h > o.y)
      || nodos.some((n) => n.x > c.x - 3 && n.x < c.x + c.w + 3 && n.y > c.y - 3 && n.y < c.y + c.h + 3);
    if (svg.dataset.cliente) cajas.push({ x: centro.x - 16, y: centro.y - 16, w: svg.dataset.cliente.length * 9.5 + 34, h: 30 });
    nodos.forEach((n) => {
      const grupo = el('g', { class: 'nodo', style: `animation-delay:${(-azar() * 5).toFixed(2)}s` }, capaNodos);
      if (azar() > 0.75) el('circle', { class: 'anillo', cx: n.x, cy: n.y, r: 5, fill: 'none', stroke: COLOR[n.tipo], 'stroke-width': 0.8, style: `animation-delay:${(azar() * 3).toFixed(2)}s` }, grupo);
      el('circle', { cx: n.x, cy: n.y, r: n.r * 2.4, fill: COLOR[n.tipo], opacity: (n.alfa * 0.16).toFixed(3) }, grupo);
      el('circle', { cx: n.x, cy: n.y, r: n.r, fill: COLOR[n.tipo], opacity: (n.alfa * 0.95).toFixed(3) }, grupo);
      if (!n.palabra) return;
      const w = n.palabra.length * n.tam * 0.6, h = n.tam;
      const derecha = { x: n.x + n.r + 4, y: n.y - h / 2, w, h, ancla: 'start' };
      const izquierda = { x: n.x - n.r - 4 - w, y: n.y - h / 2, w, h, ancla: 'end' };
      const opciones = n.x > x1 - 110 ? [izquierda, derecha] : [derecha, izquierda];
      const caja = opciones.find((c) => !choca(c));
      if (!caja) return;
      cajas.push(caja);
      const t = el('text', { x: caja.ancla === 'start' ? caja.x : caja.x + w, 'text-anchor': caja.ancla, y: n.y + 3.5, fill: COLOR[n.tipo], 'font-size': n.tam.toFixed(1), opacity: (n.alfa * 0.85).toFixed(3) }, grupo);
      t.textContent = n.palabra;
    });

    if (svg.dataset.cliente) {
      const c = centro;
      nodos.map((n) => [dist(n, c), n]).sort((p, q) => p[0] - q[0]).slice(0, 5).forEach(([, n]) => {
        el('line', { x1: c.x, y1: c.y, x2: n.x, y2: n.y, stroke: '#F4EFE6', 'stroke-width': 0.9, 'stroke-opacity': 0.4 }, capaLineas);
      });
      el('circle', { class: 'anillo', cx: c.x, cy: c.y, r: 9, fill: 'none', stroke: P.acento, 'stroke-width': 1.2 }, capaNodos);
      el('circle', { cx: c.x, cy: c.y, r: 14, fill: P.halo, opacity: 0.18 }, capaNodos);
      el('circle', { cx: c.x, cy: c.y, r: 5, fill: P.acento }, capaNodos);
      const t = el('text', { class: 'cliente', x: c.x + 14, y: c.y + 6, fill: '#F4EFE6', 'font-size': 15 }, capaNodos);
      t.textContent = svg.dataset.cliente;
    }
  });
})();
