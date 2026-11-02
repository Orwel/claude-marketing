/*
  Aplana una propuesta para que el PDF se vea nítido en cualquier visor (Drive, Android, iPhone).

  Por qué: al imprimir, Chrome convierte en imágenes rectangulares de baja resolución las sombras con
  desenfoque, los degradados con transparencia y los grupos transparentes del SVG. En el computador
  se disimula; en el celular salen como "cubos" con bordes visibles y la constelación se ve borrosa.

  Qué hace, en este orden (se carga al final, después de dibujar la constelación):
   1. Quita sombras, filtros y mezclas.
   2. Pinta el fondo de cada hoja (color base + brillos + patrón de cruces o rejilla) en un canvas al
      doble de resolución y lo pone como imagen de fondo opaca; oculta los .brillo y los ::before.
   3. Vuelve opacos los colores con transparencia de fondos y degradados, mezclándolos con el color
      que tienen debajo.
   4. En los SVG de la constelación, cambia cada opacidad por el color ya mezclado con el fondo real
      de esa zona de la hoja, y los trazos con degradado por un color sólido.
*/
(() => {
  const ESCALA = 2;
  const estilo = document.createElement('style');
  estilo.textContent = `*, *::before, *::after { box-shadow: none !important; text-shadow: none !important; filter: none !important; backdrop-filter: none !important; mix-blend-mode: normal !important; }
    .brillo { display: none !important; } .pagina::before { display: none !important; }`;

  const rgba = (texto) => {
    const m = String(texto).match(/rgba?\(([^)]+)\)/);
    if (!m) {
      const h = String(texto).match(/#([0-9a-f]{6})\b/i);
      return h ? [parseInt(h[1].slice(0, 2), 16), parseInt(h[1].slice(2, 4), 16), parseInt(h[1].slice(4, 6), 16), 1] : null;
    }
    const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number);
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  };
  const mezclar = (c, base, alfa = c[3]) => [0, 1, 2].map((i) => Math.round(c[i] * alfa + base[i] * (1 - alfa)));
  const css = (c) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;

  const hojas = [...document.querySelectorAll('.pagina')];
  const lienzos = new Map();

  // Lee del CSS lo que hay que pintar en el fondo, antes de ocultar brillos y patrones.
  const planes = hojas.map((hoja) => {
    const caja = hoja.getBoundingClientRect();
    const base = rgba(getComputedStyle(hoja).backgroundColor) || [3, 7, 18, 1];
    const brillos = [...hoja.querySelectorAll(':scope > .brillo')].map((b) => {
      const r = b.getBoundingClientRect();
      const fondo = getComputedStyle(b).backgroundImage;
      const color = rgba(fondo) || rgba(getComputedStyle(b).backgroundColor);
      const corte = Number((fondo.match(/transparent\s+([\d.]+)%/) || fondo.match(/rgba\(0, 0, 0, 0\)\s+([\d.]+)%/) || [])[1] || 100) / 100;
      const cerca = /closest-side/.test(fondo) || !/radial/.test(fondo);
      return { x: r.left - caja.left + r.width / 2, y: r.top - caja.top + r.height / 2, radio: (cerca ? r.width / 2 : r.width / Math.SQRT2) * corte, borde: r.width / 2, color };
    }).filter((b) => b.color);
    const antes = getComputedStyle(hoja, '::before');
    const patron = antes.content && antes.content !== 'none' ? { imagen: antes.backgroundImage, tam: parseFloat(antes.backgroundSize) || 48 } : null;
    return { hoja, ancho: caja.width, alto: caja.height, base, brillos, patron };
  });
  document.head.appendChild(estilo);

  // 2 · Fondo de cada hoja en un canvas opaco
  for (const plan of planes) {
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(plan.ancho * ESCALA);
    lienzo.height = Math.round(plan.alto * ESCALA);
    const g = lienzo.getContext('2d');
    g.scale(ESCALA, ESCALA);
    g.fillStyle = css(plan.base);
    g.fillRect(0, 0, plan.ancho, plan.alto);
    for (const b of plan.brillos) {
      g.save();
      g.beginPath(); g.arc(b.x, b.y, b.borde, 0, Math.PI * 2); g.clip();
      const grad = g.createRadialGradient(b.x, b.y, 0, b.x, b.y, Math.max(1, b.radio));
      grad.addColorStop(0, `rgba(${b.color[0]}, ${b.color[1]}, ${b.color[2]}, ${b.color[3]})`);
      grad.addColorStop(1, `rgba(${b.color[0]}, ${b.color[1]}, ${b.color[2]}, 0)`);
      g.fillStyle = grad;
      g.fillRect(b.x - b.borde, b.y - b.borde, b.borde * 2, b.borde * 2);
      g.restore();
    }
    if (plan.patron) {
      const color = rgba(plan.patron.imagen);
      const paso = plan.patron.tam;
      if (/linear-gradient/.test(plan.patron.imagen) && color) {
        // Rejilla de líneas finas
        g.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`;
        for (let x = 0; x < plan.ancho; x += paso) g.fillRect(x, 0, 1, plan.alto);
        for (let y = 0; y < plan.alto; y += paso) g.fillRect(0, y, plan.ancho, 1);
      } else {
        // Cruces pequeñas en el centro de cada celda
        g.strokeStyle = 'rgba(255, 255, 255, .05)';
        g.lineWidth = 1.2;
        for (let x = 0; x < plan.ancho; x += paso) for (let y = 0; y < plan.alto; y += paso) {
          g.beginPath(); g.moveTo(x + paso / 2, y + paso / 2 - 4); g.lineTo(x + paso / 2, y + paso / 2 + 4);
          g.moveTo(x + paso / 2 - 4, y + paso / 2); g.lineTo(x + paso / 2 + 4, y + paso / 2); g.stroke();
        }
      }
    }
    plan.hoja.style.backgroundImage = `url(${lienzo.toDataURL('image/jpeg', 0.92)})`;
    plan.hoja.style.backgroundSize = '100% 100%';
    lienzos.set(plan.hoja, { g, lienzo });
  }

  // Color real del fondo en un punto de la hoja (para mezclar lo que va encima).
  const fondoEn = (hoja, x, y) => {
    const l = lienzos.get(hoja);
    if (!l) return [3, 7, 18];
    const px = Math.min(l.lienzo.width - 1, Math.max(0, Math.round(x * ESCALA)));
    const py = Math.min(l.lienzo.height - 1, Math.max(0, Math.round(y * ESCALA)));
    const d = l.g.getImageData(px, py, 1, 1).data;
    return [d[0], d[1], d[2]];
  };

  // 3 · Fondos y degradados con transparencia → opacos sobre lo que tienen debajo
  const opacos = new WeakMap();
  const debajo = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      if (opacos.has(p)) return opacos.get(p);
      if (p.classList && p.classList.contains('pagina')) {
        const caja = p.getBoundingClientRect(), r = el.getBoundingClientRect();
        return fondoEn(p, r.left - caja.left + r.width / 2, r.top - caja.top + r.height / 2);
      }
    }
    return [3, 7, 18];
  };
  for (const el of document.querySelectorAll('.pagina *')) {
    if (el.closest('svg')) continue;
    const cs = getComputedStyle(el);
    const fondo = debajo(el);
    let propio = null;
    if (/gradient/.test(cs.backgroundImage) && /rgba\(/.test(cs.backgroundImage)) {
      const imagen = cs.backgroundImage.replace(/rgba\(([^)]+)\)/g, (t) => css(mezclar(rgba(t), fondo)));
      el.style.backgroundImage = imagen;
      propio = rgba(imagen);
    }
    const color = rgba(cs.backgroundColor);
    if (color && color[3] > 0 && color[3] < 1) {
      const mezcla = mezclar(color, fondo);
      el.style.backgroundColor = css(mezcla);
      propio = propio || mezcla;
    } else if (color && color[3] === 1) propio = propio || color;
    if (propio) opacos.set(el, propio.slice(0, 3));
  }

  // 3b · Pseudo-elementos (::before / ::after) con degradado transparente: regla propia ya mezclada.
  const reglas = [];
  let n = 0;
  for (const el of document.querySelectorAll('.pagina *')) {
    if (el.closest('svg')) continue;
    for (const ps of ['::before', '::after']) {
      const c = getComputedStyle(el, ps);
      if (c.content === 'none' || !/gradient/.test(c.backgroundImage) || !/rgba\(/.test(c.backgroundImage)) continue;
      const fondo = opacos.get(el) || debajo(el);
      el.dataset.plano = el.dataset.plano || String(++n);
      reglas.push(`[data-plano="${el.dataset.plano}"]${ps} { background-image: ${c.backgroundImage.replace(/rgba\(([^)]+)\)/g, (t) => css(mezclar(rgba(t), fondo)))} !important; }`);
    }
  }
  if (reglas.length) { const e = document.createElement('style'); e.textContent = reglas.join(' '); document.head.appendChild(e); }

  // 4 · SVG (constelación y metáforas): opacidades y rgba → colores ya mezclados con su fondo real.
  //     Si el SVG está sobre una tarjeta opaca, el fondo es el de la tarjeta; si está sobre la hoja, se lee del canvas.
  for (const svg of document.querySelectorAll('.pagina svg')) {
    if (svg.closest('defs') || svg.getAttribute('width') === '0') continue;
    const hoja = svg.closest('.pagina');
    const caja = hoja.getBoundingClientRect();
    let tarjeta = null;
    for (let p = svg.parentElement; p && p !== hoja; p = p.parentElement) if (opacos.has(p)) { tarjeta = opacos.get(p); break; }
    const alfaSvg = Number(getComputedStyle(svg).opacity) || 1;
    svg.style.opacity = '1';
    const escala = svg.getBoundingClientRect().width / (svg.viewBox.baseVal.width || 794);
    const colorDe = (valor) => {
      const ref = String(valor).match(/url\(['"]?#([^'")]+)/);
      if (ref) { const parada = svg.querySelector(`#${CSS.escape(ref[1])} stop`); return parada ? rgba(parada.getAttribute('stop-color')) : null; }
      return rgba(valor);
    };
    for (const el of svg.querySelectorAll('circle, line, text, path, rect, ellipse, polygon, polyline')) {
      if (el.classList.contains('pulso') || el.classList.contains('anillo')) { el.remove(); continue; }
      let alfa = alfaSvg * Number(el.getAttribute('opacity') ?? 1);
      for (let p = el.parentElement; p && p !== svg; p = p.parentElement) alfa *= Number(p.getAttribute('opacity') ?? 1);
      const b = el.getBBox();
      const fondo = tarjeta || fondoEn(hoja, (b.x + b.width / 2) * escala + (svg.getBoundingClientRect().left - caja.left), (b.y + b.height / 2) * escala + (svg.getBoundingClientRect().top - caja.top));
      for (const prop of ['fill', 'stroke']) {
        const valor = el.getAttribute(prop) || (prop === 'fill' && el.parentElement.getAttribute('fill')) || (prop === 'stroke' && el.parentElement.getAttribute('stroke'));
        if (!valor || valor === 'none') continue;
        // Un relleno con degradado (p. ej. el semáforo) se conserva; solo en la constelación pasa a color sólido.
        if (/url\(/.test(valor) && !svg.classList.contains('constelacion')) continue;
        const c = colorDe(valor);
        if (!c) continue;
        // La transparencia propia del color (rgba) también cuenta, no solo los atributos de opacidad.
        const a = c[3] * alfa * Number(el.getAttribute(`${prop}-opacity`) ?? el.parentElement.getAttribute(`${prop}-opacity`) ?? 1);
        el.setAttribute(prop, css(mezclar(c, fondo, Math.min(1, a))));
        el.removeAttribute(`${prop}-opacity`);
      }
      el.removeAttribute('opacity');
    }
    svg.querySelectorAll('g').forEach((g) => {
      ['opacity', 'stroke-opacity', 'fill-opacity'].forEach((a) => g.removeAttribute(a));
      if (svg.classList.contains('constelacion')) g.removeAttribute('style');
    });
    // Degradados usados como trazo de la constelación ya se volvieron color sólido; los demás (p. ej. el semáforo)
    // se quedan, pero con paradas opacas.
    svg.querySelectorAll('stop').forEach((st) => {
      const c = rgba(st.getAttribute('stop-color'));
      const a = (c ? c[3] : 1) * Number(st.getAttribute('stop-opacity') ?? 1);
      if (c && a < 1) st.setAttribute('stop-color', css(mezclar(c, tarjeta || [3, 7, 18], a)));
      st.removeAttribute('stop-opacity');
    });
    if (svg.classList.contains('constelacion')) svg.querySelectorAll('linearGradient, radialGradient').forEach((d) => d.remove());
  }
})();
