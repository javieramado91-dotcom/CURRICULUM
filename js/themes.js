/* ══════════════════════════════════════════════════════════════
   CV Builder — Paletas de color, tipografías y carga de fuentes
══════════════════════════════════════════════════════════════ */
window.CV = window.CV || {};

/* ── Paletas ─────────────────────────────────────────────────────
   accent: color principal (fondos de barras, títulos)
   Los tonos suaves se derivan automáticamente mezclando con blanco. */
CV.PALETTES = [
  { id: 'marino',    name: 'Azul marino',  accent: '#1F3A5F' },
  { id: 'azul',      name: 'Azul',         accent: '#1D4ED8' },
  { id: 'petroleo',  name: 'Petróleo',     accent: '#0F5E6E' },
  { id: 'esmeralda', name: 'Esmeralda',    accent: '#047857' },
  { id: 'oliva',     name: 'Verde oliva',  accent: '#4D5B2A' },
  { id: 'bordo',     name: 'Bordó',        accent: '#8B1E3F' },
  { id: 'terracota', name: 'Terracota',    accent: '#B4532A' },
  { id: 'mostaza',   name: 'Mostaza',      accent: '#A16207' },
  { id: 'rosa',      name: 'Rosa viejo',   accent: '#9D4B6B' },
  { id: 'violeta',   name: 'Violeta',      accent: '#5B21B6' },
  { id: 'grafito',   name: 'Grafito',      accent: '#334155' },
  { id: 'negro',     name: 'Negro',        accent: '#18181B' }
];

/* ── Pares tipográficos ──────────────────────────────────────────
   Cada familia está definida en CV.PDF_FONTS. "packs" indica qué
   archivos de /fonts hay que cargar para usarla. */
CV.FONT_PAIRS = [
  { id: 'moderna',    name: 'Moderna',    desc: 'Inter',                 head: 'Inter',      headSemi: 'InterSemi', body: 'Inter', bodyMedium: 'InterMedium', bodySemi: 'InterSemi', packs: ['inter'] },
  { id: 'geometrica', name: 'Geométrica', desc: 'Montserrat + Inter',    head: 'Montserrat', headSemi: 'MontserratSemi', body: 'Inter', bodyMedium: 'InterMedium', bodySemi: 'InterSemi', packs: ['inter', 'montserrat'] },
  { id: 'elegante',   name: 'Elegante',   desc: 'Playfair + Inter',      head: 'Playfair',   headSemi: 'Playfair', body: 'Inter', bodyMedium: 'InterMedium', bodySemi: 'InterSemi', packs: ['inter', 'playfair'] },
  { id: 'editorial',  name: 'Editorial',  desc: 'Lora + Inter',          head: 'Lora',       headSemi: 'LoraSemi', body: 'Inter', bodyMedium: 'InterMedium', bodySemi: 'InterSemi', packs: ['inter', 'lora'] },
  { id: 'clasica',    name: 'Clásica',    desc: 'Lora',                  head: 'Lora',       headSemi: 'LoraSemi', body: 'Lora', bodyMedium: 'Lora', bodySemi: 'LoraSemi', packs: ['inter', 'lora'] }
];

CV.SIZES = { compacto: 0.92, normal: 1, grande: 1.08 };

/* Definición de familias para pdfmake (nombres de archivo dentro del vfs) */
CV.PDF_FONTS = {
  Inter:          { normal: 'Inter-Regular.ttf',  bold: 'Inter-Bold.ttf',     italics: 'Inter-Italic.ttf', bolditalics: 'Inter-Bold.ttf' },
  InterMedium:    { normal: 'Inter-Medium.ttf',   bold: 'Inter-SemiBold.ttf', italics: 'Inter-Italic.ttf', bolditalics: 'Inter-SemiBold.ttf' },
  InterSemi:      { normal: 'Inter-SemiBold.ttf', bold: 'Inter-Bold.ttf',     italics: 'Inter-Italic.ttf', bolditalics: 'Inter-Bold.ttf' },
  Lora:           { normal: 'Lora-Regular.ttf',   bold: 'Lora-Bold.ttf',      italics: 'Lora-Italic.ttf',  bolditalics: 'Lora-Bold.ttf' },
  LoraSemi:       { normal: 'Lora-SemiBold.ttf',  bold: 'Lora-Bold.ttf',      italics: 'Lora-Italic.ttf',  bolditalics: 'Lora-Bold.ttf' },
  Playfair:       { normal: 'Playfair-SemiBold.ttf', bold: 'Playfair-Bold.ttf', italics: 'Playfair-SemiBold.ttf', bolditalics: 'Playfair-Bold.ttf' },
  Montserrat:     { normal: 'Montserrat-Medium.ttf',   bold: 'Montserrat-Bold.ttf', italics: 'Montserrat-Medium.ttf', bolditalics: 'Montserrat-Bold.ttf' },
  MontserratSemi: { normal: 'Montserrat-SemiBold.ttf', bold: 'Montserrat-Bold.ttf', italics: 'Montserrat-SemiBold.ttf', bolditalics: 'Montserrat-Bold.ttf' }
};
CV.FONT_PACK_OF = {
  Inter: 'inter', InterMedium: 'inter', InterSemi: 'inter',
  Lora: 'lora', LoraSemi: 'lora', Playfair: 'playfair',
  Montserrat: 'montserrat', MontserratSemi: 'montserrat'
};

/* ── Carga diferida de fuentes (script tags → funciona también con file://) ── */
const _packPromises = {};
CV.loadFontPack = (pack) => {
  if (_packPromises[pack]) return _packPromises[pack];
  _packPromises[pack] = new Promise((resolve, reject) => {
    const sc = document.createElement('script');
    sc.src = `fonts/${pack}.js`;
    sc.async = true;
    sc.onload = () => resolve();
    sc.onerror = () => { delete _packPromises[pack]; reject(new Error('No se pudo cargar la fuente ' + pack)); };
    document.head.appendChild(sc);
  });
  return _packPromises[pack];
};
CV.loadFontPacks = (packs) => Promise.all([...new Set(packs)].map(CV.loadFontPack));

/** Devuelve el objeto fonts para pdfmake con solo las familias cuyos archivos ya están cargados */
CV.availablePdfFonts = () => {
  const vfs = window.CV_FONT_VFS || {};
  const out = {};
  for (const [fam, def] of Object.entries(CV.PDF_FONTS)) {
    if (Object.values(def).every(f => vfs[f])) out[fam] = def;
  }
  return out;
};

/* ── Utilidades de color ─────────────────────────────────────── */
CV.hexToRgb = hex => {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
CV.rgbToHex = rgb => '#' + rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
/** Mezcla un color con otro: t=0 → a, t=1 → b */
CV.mix = (a, b, t) => {
  const A = CV.hexToRgb(a), B = CV.hexToRgb(b);
  return CV.rgbToHex(A.map((v, i) => v + (B[i] - v) * t));
};
CV.luminance = hex => {
  const [r, g, b] = CV.hexToRgb(hex).map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** Construye el juego de colores que usan las plantillas */
CV.buildColors = (paletteId) => {
  const p = CV.PALETTES.find(x => x.id === paletteId) || CV.PALETTES[0];
  const a = p.accent;
  return {
    accent: a,
    accentDark: CV.mix(a, '#000000', 0.25),
    accentText: CV.luminance(a) > 0.22 ? CV.mix(a, '#000000', 0.35) : a, // versión legible sobre blanco
    soft: CV.mix(a, '#FFFFFF', 0.88),      // fondos suaves
    softer: CV.mix(a, '#FFFFFF', 0.94),
    mid: CV.mix(a, '#FFFFFF', 0.55),       // líneas y puntos vacíos
    onAccent: '#FFFFFF',
    onAccentMuted: CV.mix(a, '#FFFFFF', 0.72),
    onAccentLine: CV.mix(a, '#FFFFFF', 0.28),
    ink: '#111827',     // títulos
    text: '#374151',    // cuerpo
    muted: '#6B7280',   // fechas, detalles
    line: '#E5E7EB',
    lineStrong: '#D1D5DB',
    white: '#FFFFFF'
  };
};
