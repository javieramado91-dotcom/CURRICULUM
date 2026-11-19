/* ══════════════════════════════════════════════════════════════
   CV Builder — Núcleo del motor PDF (pdfmake, texto vectorial)
   - Íconos SVG, bloques reutilizables y contexto de diseño
   - CV.generatePdf(state, design) → Uint8Array con el PDF
══════════════════════════════════════════════════════════════ */
window.CV = window.CV || {};
CV.TEMPLATES = CV.TEMPLATES || {};
CV.TEMPLATE_ORDER = CV.TEMPLATE_ORDER || [];

const A4 = { w: 595.28, h: 841.89 };
CV.A4 = A4;

/* ── Íconos (trazos estilo "lucide", 24×24) ─────────────────── */
const ICON_PATHS = {
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  cake: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
  id: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2.5"/><path d="M14 10h5M14 14h3"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z"/>',
  child: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-2a5 5 0 0 1 9.5-2"/><circle cx="17.5" cy="13.5" r="2.5"/><path d="M14.5 21v-1a3 3 0 0 1 6 0v1"/>',
  car: '<path d="M5 17h14M5 17a2 2 0 1 1-4 0v-5l2.5-6h17L23 12v5a2 2 0 1 1-4 0"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>'
};
CV.icon = (name, color, size) => ({
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name] || ICON_PATHS.user}</svg>`,
  width: size, height: size
});

/* ── Contexto de diseño que recibe cada plantilla ────────────── */
CV.makeCtx = (design, tpl) => {
  const pairId = design.fonts === 'auto' || !design.fonts ? tpl.defaultFonts : design.fonts;
  const pair = CV.FONT_PAIRS.find(f => f.id === pairId) || CV.FONT_PAIRS[0];
  const k = CV.SIZES[design.size] || 1;
  return {
    c: CV.buildColors(design.palette),
    f: pair,
    k,
    s: n => Math.round(n * k * 100) / 100,     // tamaño de letra escalado
    photoShape: design.photoShape || 'circle',
    design
  };
};

/* ── Bloques reutilizables ───────────────────────────────────── */
const B = {};
CV.B = B;

/** Mantiene juntos el título de una sección y su primer elemento (evita títulos huérfanos al pie de página) */
B.section = (titleNode, items, opts = {}) => {
  if (!items || !items.length) return [];
  const gap = opts.gap == null ? 9 : opts.gap;
  const spaced = items.map((it, i) => (i === 0 ? it : { stack: [it], margin: [0, gap, 0, 0] }));
  return [
    { stack: [titleNode, spaced[0]], unbreakable: true, margin: opts.margin || [0, 0, 0, 0] },
    ...spaced.slice(1).map(n => ({ stack: [n], unbreakable: true }))
  ];
};

/** Fila con ícono + texto (contacto, datos personales) */
B.iconLine = (item, o) => {
  const textNode = item.label && o.showLabel
    ? { text: [{ text: item.label + ': ', color: o.labelColor || o.color, font: o.labelFont }, { text: item.value }], color: o.color }
    : { text: item.text != null ? item.text : item.value, color: o.color, link: item.link };
  return {
    columns: [
      Object.assign(CV.icon(item.icon, o.iconColor, o.iconSize || 8.5), { margin: [0, o.iconTop == null ? 1.2 : o.iconTop, 0, 0] }),
      Object.assign({ width: '*', fontSize: o.fontSize, lineHeight: 1.25 }, textNode)
    ],
    columnGap: o.gap || 7,
    margin: [0, 0, 0, o.spacing == null ? 5 : o.spacing]
  };
};

/** Puntos de nivel (idiomas) */
B.dots = (score, on, off, r = 2.6, gap = 3.2, total = 5) => {
  const els = [];
  for (let i = 0; i < total; i++) {
    els.push({ type: 'ellipse', x: r + i * (r * 2 + gap), y: r + 0.5, r1: r, r2: r, color: i < score ? on : off });
  }
  return { canvas: els, width: total * (r * 2 + gap) - gap, height: r * 2 + 1 };
};

/** Barra de nivel (idiomas) */
B.bar = (score, on, off, w, h = 3) => ({
  canvas: [
    { type: 'rect', x: 0, y: 0, w, h, r: h / 2, color: off },
    { type: 'rect', x: 0, y: 0, w: Math.max(h, w * score / 5), h, r: h / 2, color: on }
  ],
  width: w, height: h
});

/** Línea horizontal */
B.rule = (w, color, lw = 0.75, margin = [0, 0, 0, 0]) => ({
  canvas: [{ type: 'line', x1: 0, y1: 0, x2: w, y2: 0, lineWidth: lw, lineColor: color }],
  margin
});

/** Lista con viñetas para tareas */
B.bullets = (lines, o) => ({
  ul: lines.map(l => ({ text: l, margin: [0, 0, 0, o.itemGap == null ? 1.5 : o.itemGap] })),
  markerColor: o.markerColor,
  type: o.type || 'circle',
  fontSize: o.fontSize,
  color: o.color,
  lineHeight: o.lineHeight || 1.3,
  margin: o.margin || [0, 3, 0, 0]
});

/** Texto multipárrafo */
B.paragraphs = (text, o) => text.split('\n').map((p, i) => ({
  text: p, fontSize: o.fontSize, color: o.color, lineHeight: o.lineHeight || 1.4,
  alignment: o.alignment || 'left', margin: [0, i ? 4 : 0, 0, 0]
}));

/** Foto con forma; el anillo se dibuja encima con un canvas */
B.photo = (d, ctx, size, o = {}) => {
  if (!d.photo || ctx.photoShape === 'none') return null;
  const shape = ctx.photoShape;
  const variant = CV.photoVariant(d.photo, shape);
  if (!variant) return null;
  const stack = [{ image: variant, width: size, height: size }];
  if (o.ring) {
    const lw = o.ringWidth || 2;
    const ringEl = shape === 'circle'
      ? { type: 'ellipse', x: size / 2, y: size / 2, r1: size / 2 - lw / 2, r2: size / 2 - lw / 2, lineWidth: lw, lineColor: o.ring }
      : { type: 'rect', x: lw / 2, y: lw / 2, w: size - lw, h: size - lw, r: shape === 'rounded' ? size * 0.12 : 0, lineWidth: lw, lineColor: o.ring };
    stack.push({ canvas: [ringEl], margin: [0, -size, 0, 0] });
  }
  return { stack, width: size, alignment: o.alignment, margin: o.margin || [0, 0, 0, 0] };
};

/* Variantes de foto (círculo / redondeada / cuadrada) ya recortadas en canvas.
   Se generan una vez por foto y quedan en caché. */
const _photoCache = new Map();
CV.photoVariant = (src, shape) => {
  const key = shape + '|' + src.length + '|' + src.slice(-64);
  return _photoCache.get(key) || null;
};
CV.preparePhotoVariants = async (src) => {
  if (!src) return;
  const shapes = ['circle', 'rounded', 'square'];
  const pending = shapes.filter(s => !_photoCache.has(s + '|' + src.length + '|' + src.slice(-64)));
  if (!pending.length) return;
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const S = Math.min(700, img.naturalWidth || 700);
  for (const shape of pending) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const g = cv.getContext('2d');
    g.imageSmoothingQuality = 'high';
    if (shape === 'circle') {
      g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); g.closePath(); g.clip();
    } else if (shape === 'rounded') {
      const r = S * 0.12;
      g.beginPath();
      g.moveTo(r, 0); g.arcTo(S, 0, S, S, r); g.arcTo(S, S, 0, S, r); g.arcTo(0, S, 0, 0, r); g.arcTo(0, 0, S, 0, r);
      g.closePath(); g.clip();
    }
    g.drawImage(img, 0, 0, S, S);
    const url = shape === 'square' ? cv.toDataURL('image/jpeg', 0.9) : cv.toDataURL('image/png');
    _photoCache.set(shape + '|' + src.length + '|' + src.slice(-64), url);
  }
};

/* ── Registro de plantillas ──────────────────────────────────── */
CV.registerTemplate = (tpl) => {
  CV.TEMPLATES[tpl.id] = tpl;
  if (!CV.TEMPLATE_ORDER.includes(tpl.id)) CV.TEMPLATE_ORDER.push(tpl.id);
};

/* ── Librerías externas (pdfmake + pdf.js) ───────────────────── */
CV.LIBS = {
  pdfmake: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.10/pdfmake.min.js',
  pdfjs: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  pdfjsWorker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
};
const _libPromises = {};
CV.loadScript = (url) => {
  if (_libPromises[url]) return _libPromises[url];
  _libPromises[url] = new Promise((resolve, reject) => {
    const sc = document.createElement('script');
    sc.src = url; sc.async = true;
    sc.onload = resolve;
    sc.onerror = () => { delete _libPromises[url]; reject(new Error('No se pudo cargar ' + url)); };
    document.head.appendChild(sc);
  });
  return _libPromises[url];
};
CV.ensurePdfLibs = async () => {
  await Promise.all([CV.loadScript(CV.LIBS.pdfmake), CV.loadScript(CV.LIBS.pdfjs), CV.loadFontPack('inter')]);
  if (window.pdfjsLib && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = CV.LIBS.pdfjsWorker;
  }
};

/* ── Construcción del documento ──────────────────────────────── */
CV.buildDocDefinition = (state, design) => {
  const tpl = CV.TEMPLATES[design.template] || CV.TEMPLATES[CV.TEMPLATE_ORDER[0]];
  const ctx = CV.makeCtx(design, tpl);
  const d = CV.normalize(state);
  const doc = tpl.build(d, ctx);
  doc.pageSize = 'A4';
  doc.info = {
    title: d.name ? `Curriculum Vitae — ${d.name}` : 'Curriculum Vitae',
    author: d.name || '',
    subject: 'Curriculum Vitae',
    keywords: [d.role, ...d.skills].filter(Boolean).join(', '),
    creator: 'CV Builder',
    producer: 'CV Builder'
  };
  doc.defaultStyle = Object.assign({ font: ctx.f.body, fontSize: ctx.s(9.5), color: ctx.c.text, lineHeight: 1.3 }, doc.defaultStyle || {});
  clampTracking(doc.content, doc.defaultStyle.fontSize);
  return { doc, ctx, tpl };
};

/* Los lectores automáticos de CV (ATS) leen "E X P E R I E N C I A" si las letras
   quedan muy separadas. Por encima de ~0,08 em el texto se "rompe" al extraerlo,
   así que limitamos el espaciado a 0,072 em en todo el documento. */
function clampTracking(node, fs) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(n => clampTracking(n, fs)); return; }
  const size = node.fontSize || fs;
  if (node.characterSpacing) node.characterSpacing = Math.min(node.characterSpacing, size * 0.072);
  ['content', 'stack', 'columns', 'text', 'ul', 'ol'].forEach(k => { if (node[k] && typeof node[k] === 'object') clampTracking(node[k], size); });
  if (node.table && node.table.body) node.table.body.forEach(row => clampTracking(row, size));
}

CV.fontsForDesign = (design) => {
  const tpl = CV.TEMPLATES[design.template] || CV.TEMPLATES[CV.TEMPLATE_ORDER[0]];
  const pairId = design.fonts === 'auto' || !design.fonts ? tpl.defaultFonts : design.fonts;
  const pair = CV.FONT_PAIRS.find(f => f.id === pairId) || CV.FONT_PAIRS[0];
  return pair.packs;
};

/** Genera el PDF y devuelve los bytes (Uint8Array) */
CV.generatePdf = async (state, design) => {
  design = design || state.design;
  await CV.ensurePdfLibs();
  await CV.loadFontPacks(CV.fontsForDesign(design));
  if (state.foto && state.foto.out) await CV.preparePhotoVariants(state.foto.out);
  const { doc } = CV.buildDocDefinition(state, design);
  const fonts = CV.availablePdfFonts();
  return new Promise((resolve, reject) => {
    try {
      pdfMake.createPdf(doc, null, fonts, window.CV_FONT_VFS).getBuffer(buf => resolve(new Uint8Array(buf)));
    } catch (e) { reject(e); }
  });
};

CV.pdfFileName = (state) => {
  const d = CV.normalize(state);
  const base = ['CV', d.firstName, d.lastName].filter(Boolean).join('_')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\-]+/g, '_');
  return (base || 'Curriculum') + '.pdf';
};
