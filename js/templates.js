/* ══════════════════════════════════════════════════════════════
   CV Builder — Plantillas de diseño
   Cada plantilla recibe d (datos normalizados) y ctx (colores,
   fuentes, escala) y devuelve una definición de documento pdfmake.
   Los bloques de contenido (experiencia, estudios, etc.) se arman
   con builders compartidos y "perillas" de estilo (st).
══════════════════════════════════════════════════════════════ */
(function () {
  const B = CV.B;
  const join = (arr, sep = ' · ') => arr.filter(Boolean).join(sep);
  const up = s => (s || '').toLocaleUpperCase('es-AR');

  /* ── Títulos de sección ────────────────────────────────────── */
  const TITLES = {
    /** MAYÚSCULAS + línea fina a todo el ancho */
    rule: (text, st) => ({
      stack: [
        { text: up(text), font: st.headFont, bold: true, fontSize: st.s(10), characterSpacing: 1.1, color: st.titleColor },
        B.rule(st.w, st.ruleColor, 0.8, [0, 3, 0, 0])
      ],
      margin: [0, 0, 0, 7]
    }),
    /** Texto + raya corta y gruesa debajo */
    short: (text, st) => ({
      stack: [
        { text: up(text), font: st.headFont, bold: true, fontSize: st.s(10.5), characterSpacing: 1.2, color: st.titleColor },
        { canvas: [{ type: 'rect', x: 0, y: 0, w: 26, h: 2.4, r: 1.2, color: st.accent }], margin: [0, 3.5, 0, 0] }
      ],
      margin: [0, 0, 0, 8]
    }),
    /** Cuadradito de color a la izquierda */
    bar: (text, st) => ({
      columns: [
        { canvas: [{ type: 'rect', x: 0, y: 1.5, w: 4, h: st.s(10), r: 1, color: st.accent }], width: 4 },
        { text: up(text), font: st.headFont, bold: true, fontSize: st.s(10.5), characterSpacing: 1, color: st.titleColor, width: '*' }
      ],
      columnGap: 7,
      margin: [0, 0, 0, 7]
    }),
    /** Banda de color suave a todo el ancho */
    band: (text, st) => ({
      table: { widths: ['*'], body: [[{ text: up(text), font: st.headFont, bold: true, fontSize: st.s(9.5), characterSpacing: 1.3, color: st.titleColor, margin: [7, 3.5, 7, 2.5] }]] },
      layout: { hLineWidth: () => 0, vLineWidth: (i) => (i === 0 ? 2.5 : 0), vLineColor: () => st.accent, fillColor: () => st.bandColor, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
      margin: [0, 0, 0, 8]
    }),
    /** Versalitas serif con doble línea (ejecutivo / elegante) */
    classic: (text, st) => ({
      stack: [
        { text: up(text), font: st.headFont, bold: true, fontSize: st.s(10.5), characterSpacing: 1.8, color: st.titleColor, alignment: st.titleAlign || 'left' },
        B.rule(st.w, st.ruleColor, 0.6, [0, 3, 0, 0])
      ],
      margin: [0, 0, 0, 7]
    }),
    /** Solo texto en color (minimalista) */
    plain: (text, st) => ({
      text: text, font: st.headFont, bold: true, fontSize: st.s(11.5), color: st.titleColor, margin: [0, 0, 0, 6]
    })
  };

  /* ── Ítems ─────────────────────────────────────────────────── */
  function headRow(left, right, st) {
    if (!right) return left;
    return {
      columns: [
        Object.assign({ width: '*' }, left),
        { text: right, width: 'auto', fontSize: st.s(8.5), color: st.muted, font: st.mediumFont, margin: [10, st.periodTop || 1.6, 0, 0] }
      ]
    };
  }

  function expItem(e, st) {
    const title = e.title || e.company;
    const sub = join([e.title ? e.company : '', e.place]);
    const rows = [];
    const titleNode = { text: title, font: st.semiFont, fontSize: st.s(10.5), color: st.ink, lineHeight: 1.2 };
    if (st.periodPos === 'below') {
      rows.push(titleNode);
      const meta = join([sub, e.period], '   |   ');
      if (meta) rows.push({ text: [sub ? { text: sub, color: st.companyColor, font: st.mediumFont } : '', sub && e.period ? { text: '   ·   ', color: st.muted } : '', e.period ? { text: e.period, color: st.muted } : ''], fontSize: st.s(9), margin: [0, 1.5, 0, 0] });
    } else {
      rows.push(headRow(titleNode, st.periodPos === 'none' ? '' : e.period, st));
      if (sub) rows.push({ text: sub, fontSize: st.s(9.3), color: st.companyColor, font: st.mediumFont, margin: [0, 1.2, 0, 0] });
    }
    if (e.bullets.length) {
      rows.push(B.bullets(e.bullets, { fontSize: st.s(9.3), color: st.text, markerColor: st.bulletColor, type: st.bulletType, lineHeight: st.lh, margin: [0, 3, 0, 0] }));
    }
    return { stack: rows };
  }

  function eduItem(e, st) {
    const sub = join([e.inst, e.estado && e.estado !== 'Completo' ? e.estado : '']);
    const rows = [headRow({ text: e.title || e.inst, font: st.semiFont, fontSize: st.s(10), color: st.ink, lineHeight: 1.2 }, st.periodPos === 'none' ? '' : e.period, st)];
    if (e.title && sub) rows.push({ text: sub, fontSize: st.s(9.2), color: st.muted, margin: [0, 1.2, 0, 0] });
    return { stack: rows };
  }

  function cursoItem(e, st) {
    const meta = join([e.inst, e.hours]);
    return {
      stack: [
        headRow({ text: e.title, font: st.semiFont, fontSize: st.s(9.8), color: st.ink, lineHeight: 1.2 }, st.periodPos === 'none' ? '' : e.year, st),
        meta ? { text: meta, fontSize: st.s(9), color: st.muted, margin: [0, 1, 0, 0] } : ''
      ]
    };
  }

  /** Fila con fecha a la izquierda (minimalista / compacto) */
  function leftDated(period, body, st) {
    const p = (period || '').split(' – ');
    const dateText = p.length === 2 ? `${p[0]} –\n${p[1]}` : (period || '');
    return {
      columns: [
        { text: dateText, width: st.dateW, fontSize: st.s(8.5), color: st.muted, font: st.mediumFont, margin: [0, 1.8, 0, 0] },
        Object.assign({ width: '*' }, body)
      ],
      columnGap: 12
    };
  }

  /* ── Secciones del cuerpo principal ────────────────────────── */
  function mainSections(d, st, include) {
    const inc = Object.assign({ perfil: true, exp: true, edu: true, cursos: true, skills: false, soft: false, langs: false, personal: false, disp: true, refs: true, adicional: true }, include || {});
    const T = st.title;
    const out = [];
    const push = (blocks) => { if (blocks.length) { if (out.length) blocks[0].margin = [0, st.sectionGap, 0, 0]; out.push(...blocks); } };
    const dated = st.periodPos === 'left';
    const stI = dated ? Object.assign({}, st, { periodPos: 'none' }) : st;

    if (inc.perfil && d.perfil) {
      push(B.section(T(st.labels.perfil, st), [{ stack: B.paragraphs(d.perfil, { fontSize: st.s(9.8), color: st.text, lineHeight: st.plh, alignment: st.justify ? 'justify' : 'left' }) }]));
    }
    if (inc.exp && d.exp.length) {
      push(B.section(T(st.labels.exp, st), d.exp.map(e => dated ? leftDated(e.period, expItem(e, stI), st) : expItem(e, st)), { gap: st.itemGap }));
    }
    if (inc.edu && d.edu.length) {
      push(B.section(T(st.labels.edu, st), d.edu.map(e => dated ? leftDated(e.period, eduItem(e, stI), st) : eduItem(e, st)), { gap: st.itemGap - 2 }));
    }
    if (inc.cursos && d.cursos.length) {
      push(B.section(T(st.labels.cursos, st), d.cursos.map(e => dated ? leftDated(e.year, cursoItem(e, stI), st) : cursoItem(e, st)), { gap: st.itemGap - 3 }));
    }
    if (inc.combo && (d.skills.length || d.soft.length || d.langs.length)) {
      const hasS = d.skills.length || d.soft.length;
      const label = hasS && d.langs.length ? 'Habilidades e idiomas' : hasS ? st.labels.skills : st.labels.langs;
      push(B.section(T(label, st), [skillsLangsColumns(d, st)]));
    }
    if (inc.skills && (d.skills.length || d.soft.length)) {
      push(B.section(T(st.labels.skills, st), [skillsInline(d, st)]));
    }
    if (inc.langs && d.langs.length) {
      push(B.section(T(st.labels.langs, st), [langsInline(d, st)]));
    }
    if (inc.personal && d.personal.length) {
      push(B.section(T(st.labels.personal, st), [personalGrid(d, st)]));
    }
    if (inc.disp && d.disponibilidad) {
      push(B.section(T(st.labels.disp, st), [{ text: d.disponibilidad, fontSize: st.s(9.6), color: st.text }]));
    }
    if (inc.refs && d.refs.length) {
      push(B.section(T(st.labels.refs, st), [refsGrid(d, st)]));
    }
    if (inc.adicional && d.adicional) {
      push(B.section(T(st.labels.adicional, st), [{ stack: B.paragraphs(d.adicional, { fontSize: st.s(9.6), color: st.text }) }]));
    }
    return out;
  }

  /** Habilidades y competencias en dos columnas de viñetas (plantillas de 1 columna) */
  function skillsInline(d, st) {
    const blocks = [];
    const list = (title, items) => ({
      stack: [
        title ? { text: title, font: st.semiFont, fontSize: st.s(9.3), color: st.ink, margin: [0, 0, 0, 3] } : '',
        B.bullets(items, { fontSize: st.s(9.3), color: st.text, markerColor: st.bulletColor, type: st.bulletType, margin: [0, 0, 0, 0], itemGap: 1 })
      ]
    });
    const both = d.skills.length && d.soft.length;
    if (d.skills.length) blocks.push(list(both ? 'Técnicas' : '', d.skills));
    if (d.soft.length) blocks.push(list(both ? 'Competencias' : '', d.soft));
    if (blocks.length === 1 && d.skills.length + d.soft.length > 5) {
      // una sola lista larga → repartirla en 2 columnas
      const all = d.skills.length ? d.skills : d.soft;
      const half = Math.ceil(all.length / 2);
      return { columns: [list('', all.slice(0, half)), list('', all.slice(half))], columnGap: 18 };
    }
    return blocks.length === 1 ? blocks[0] : { columns: blocks, columnGap: 18 };
  }

  function langsInline(d, st) {
    const cells = d.langs.map(l => ({
      columns: [
        { text: [{ text: l.name, font: st.semiFont, color: st.ink }, { text: '  ' + join([l.level, l.detail], ' · '), color: st.muted, fontSize: st.s(8.8) }], width: '*', fontSize: st.s(9.4) },
        Object.assign(B.dots(l.score, st.accent, st.dotOff, 2.4, 2.8), { margin: [6, 3, 0, 0] })
      ]
    }));
    return grid(cells, 2, 18, 5);
  }

  function personalGrid(d, st) {
    const cells = d.personal.map(p => ({ text: [{ text: p.label + ': ', color: st.muted }, { text: p.value, color: st.text }], fontSize: st.s(9.3) }));
    return grid(cells, 2, 18, 3);
  }

  function refsGrid(d, st) {
    const cells = d.refs.map(r => ({
      stack: [
        { text: r.name, font: st.semiFont, fontSize: st.s(9.6), color: st.ink },
        { text: join([r.rel, r.tel]), fontSize: st.s(9), color: st.muted, margin: [0, 1, 0, 0] }
      ]
    }));
    return grid(cells, 2, 18, 6);
  }

  function grid(cells, cols, gap, rowGap) {
    const rows = [];
    for (let i = 0; i < cells.length; i += cols) {
      const row = cells.slice(i, i + cols);
      while (row.length < cols) row.push({ text: '' });
      rows.push({ columns: row.map(c => Object.assign({ width: '*' }, c)), columnGap: gap, margin: [0, i ? rowGap : 0, 0, 0] });
    }
    return { stack: rows };
  }

  /* ── Secciones de la barra lateral ─────────────────────────── */
  function sideSections(d, sb, include) {
    const inc = Object.assign({ contact: true, personal: true, skills: true, soft: true, langs: true, disp: false }, include || {});
    const out = [];
    const push = (blocks) => { if (blocks.length) { if (out.length) blocks[0].margin = [0, sb.sectionGap, 0, 0]; out.push(...blocks); } };
    const T = sb.title;

    if (inc.contact && d.contacts.length) {
      push(B.section(T('Contacto', sb), d.contacts.map(c => B.iconLine(c, { color: sb.text, iconColor: sb.icon, fontSize: sb.s(8.8), spacing: 0, iconSize: 8.5 })), { gap: 5.5 }));
    }
    if (inc.personal && d.personal.length) {
      const items = d.personal.map(p => ({
        stack: [
          { text: up(p.label), fontSize: sb.s(6.8), characterSpacing: 0.8, color: sb.muted, font: sb.semiFont },
          { text: p.value, fontSize: sb.s(8.8), color: sb.text, margin: [0, 0.5, 0, 0] }
        ]
      }));
      push(B.section(T('Datos personales', sb), items, { gap: 5 }));
    }
    if (inc.skills && d.skills.length) {
      push(B.section(T(sb.labels && sb.labels.skills || 'Habilidades', sb), [sideList(d.skills, sb)]));
    }
    if (inc.soft && d.soft.length) {
      push(B.section(T('Competencias', sb), [sideList(d.soft, sb)]));
    }
    if (inc.langs && d.langs.length) {
      const items = d.langs.map(l => ({
        stack: [
          { columns: [
            { text: l.name, font: sb.semiFont, fontSize: sb.s(9), color: sb.text, width: '*' },
            { text: l.detail || '', fontSize: sb.s(8), color: sb.muted, width: 'auto' }
          ] },
          { columns: [
            { text: l.level, fontSize: sb.s(8), color: sb.muted, width: '*' },
            Object.assign(B.dots(l.score, sb.dotOn, sb.dotOff, 2.3, 2.6), { width: 'auto', margin: [0, 2.6, 0, 0] })
          ], margin: [0, 0.5, 0, 0] }
        ]
      }));
      push(B.section(T('Idiomas', sb), items, { gap: 6 }));
    }
    if (inc.disp && d.disponibilidad) {
      push(B.section(T('Disponibilidad', sb), [{ text: d.disponibilidad, fontSize: sb.s(8.8), color: sb.text }]));
    }
    return out;
  }

  function sideList(items, sb) {
    return {
      stack: items.map((t, i) => ({
        columns: [
          { canvas: [{ type: 'rect', x: 0, y: 0, w: 3.2, h: 3.2, r: sb.bulletRound ? 1.6 : 0.4, color: sb.bullet }], width: 3.2, margin: [0, sb.s(4), 0, 0] },
          { text: t, width: '*', fontSize: sb.s(8.9), color: sb.text, lineHeight: 1.25 }
        ],
        columnGap: 7,
        margin: [0, i ? 3.2 : 0, 0, 0]
      }))
    };
  }

  const SIDE_TITLES = {
    /** Título de barra lateral: mayúsculas pequeñas + línea */
    line: (text, sb) => ({
      stack: [
        { text: up(text), font: sb.headFont, bold: true, fontSize: sb.s(8.6), characterSpacing: 1.4, color: sb.titleColor },
        B.rule(sb.w, sb.ruleColor, 0.7, [0, 3, 0, 0])
      ],
      margin: [0, 0, 0, 7]
    }),
    plain: (text, sb) => ({ text: up(text), font: sb.headFont, bold: true, fontSize: sb.s(8.8), characterSpacing: 1.4, color: sb.titleColor, margin: [0, 0, 0, 6] })
  };

  const LABELS = {
    perfil: 'Perfil profesional', exp: 'Experiencia laboral', edu: 'Formación académica', cursos: 'Cursos y certificaciones',
    skills: 'Habilidades', langs: 'Idiomas', personal: 'Datos personales', disp: 'Disponibilidad', refs: 'Referencias', adicional: 'Información adicional'
  };

  /** Arma el objeto de estilo para el cuerpo principal */
  function mainStyle(ctx, w, over) {
    const c = ctx.c, f = ctx.f;
    return Object.assign({
      w, s: ctx.s, labels: LABELS,
      headFont: f.head, semiFont: f.bodySemi, mediumFont: f.bodyMedium,
      ink: c.ink, text: c.text, muted: c.muted, accent: c.accent,
      titleColor: c.accentText, ruleColor: c.line, bandColor: c.soft, companyColor: c.accentText,
      bulletColor: c.accent, bulletType: 'circle', dotOff: c.soft,
      title: TITLES.rule, periodPos: 'right', sectionGap: 16, itemGap: 10, dateW: 74, justify: false, lh: 1.3, plh: 1.45
    }, over || {});
  }

  function sideStyle(ctx, w, over) {
    const c = ctx.c, f = ctx.f;
    return Object.assign({
      w, s: ctx.s, headFont: f.head, semiFont: f.bodySemi,
      text: c.onAccent, muted: c.onAccentMuted, icon: c.onAccentMuted, titleColor: c.onAccent,
      ruleColor: c.onAccentLine, bullet: c.onAccentMuted, dotOn: c.onAccent, dotOff: c.onAccentLine,
      title: SIDE_TITLES.line, sectionGap: 16, bulletRound: true
    }, over || {});
  }

  /** Nombre en dos tonos (nombre / apellido) */
  function nameBlock(d, ctx, o) {
    const first = d.firstName || (d.isEmpty ? 'Tu nombre' : '');
    const last = d.lastName || (d.isEmpty ? 'y apellido' : '');
    const nameText = o.upper ? [{ text: up(first) + ' ' }, { text: up(last), color: o.lastColor || o.color }] : [{ text: first + ' ' }, { text: last, color: o.lastColor || o.color }];
    const stack = [{
      text: nameText, font: o.font || ctx.f.head, bold: o.bold !== false, fontSize: ctx.s(o.size), color: o.color,
      characterSpacing: o.spacing || 0, lineHeight: 1.05, alignment: o.align || 'left'
    }];
    if (d.role) {
      stack.push({
        text: o.roleUpper ? up(d.role) : d.role, font: o.roleFont || ctx.f.bodyMedium, fontSize: ctx.s(o.roleSize || 11),
        color: o.roleColor, characterSpacing: o.roleSpacing || 0, alignment: o.align || 'left', margin: [0, o.roleGap || 5, 0, 0]
      });
    }
    return { stack, margin: o.margin || [0, 0, 0, 0] };
  }

  /** Reparte elementos en renglones sin cortar ninguno a la mitad (estimación de ancho conservadora) */
  function packLines(items, width, fontSize, sepLen) {
    const est = t => t.length * fontSize * 0.56;
    const lines = [];
    let cur = [], used = 0;
    items.forEach(it => {
      const w = est(it.text) + (cur.length ? sepLen * fontSize * 0.56 : 0);
      if (cur.length && used + w > width) { lines.push(cur); cur = []; used = 0; }
      cur.push(it); used += est(it.text) + (cur.length > 1 ? sepLen * fontSize * 0.56 : 0);
    });
    if (cur.length) lines.push(cur);
    return lines;
  }

  /** Contactos en una o más líneas con separadores (ejecutivo / minimalista / compacto) */
  function contactRow(d, ctx, o) {
    const items = o.items || d.contacts;
    if (!items.length) return null;
    const sep = o.sep || '   ·   ';
    const fs = ctx.s(o.size || 9);
    const lines = packLines(items, o.width || 400, fs, sep.length);
    return {
      stack: lines.map(line => {
        const parts = [];
        line.forEach((c, i) => {
          if (i) parts.push({ text: sep, color: o.sepColor || o.color });
          if (c.label) parts.push({ text: c.label + ' ', color: o.labelColor || o.color });
          parts.push({ text: c.value != null ? c.value : c.text, link: c.link, color: o.color });
        });
        return { text: parts, alignment: o.align || 'left' };
      }),
      fontSize: fs, lineHeight: 1.45, margin: o.margin || [0, 0, 0, 0]
    };
  }

  /** Contacto + datos personales en renglones compactos (plantillas de una columna) */
  function infoRows(d, ctx, o) {
    const extra = o.withDisp && d.disponibilidad ? [{ label: 'Disponibilidad', value: d.disponibilidad }] : [];
    const items = d.contacts.concat(d.personal.concat(extra).map(p => ({ text: p.label + ' ' + p.value, label: p.label + ':', value: p.value })));
    if (!items.length) return null;
    return contactRow(d, ctx, Object.assign({}, o, { items }));
  }

  /** Habilidades, competencias e idiomas en hasta 3 columnas (ahorra mucho espacio vertical) */
  function skillsLangsColumns(d, st) {
    const cols = [];
    const head = t => ({ text: t, font: st.semiFont, fontSize: st.s(9.4), color: st.ink, margin: [0, 0, 0, 3.5] });
    const list = items => B.bullets(items, { fontSize: st.s(9.2), color: st.text, markerColor: st.bulletColor, type: st.bulletType, margin: [0, 0, 0, 0], itemGap: 1.2 });
    if (d.skills.length) cols.push({ stack: [head('Técnicas'), list(d.skills)] });
    if (d.soft.length) cols.push({ stack: [head('Competencias'), list(d.soft)] });
    if (d.langs.length) {
      cols.push({
        stack: [head('Idiomas'), ...d.langs.map((l, i) => ({
          columns: [
            { text: [{ text: l.name, font: st.semiFont, color: st.text }, { text: '  ' + (l.detail || l.level), color: st.muted, fontSize: st.s(8.4) }], fontSize: st.s(9.2), width: '*' },
            Object.assign(B.dots(l.score, st.accent, st.dotOff, 2.2, 2.4), { width: 'auto', margin: [4, 3.2, 0, 0] })
          ],
          margin: [0, i ? 3 : 0, 0, 0]
        }))]
      });
    }
    while (cols.length < 3 && cols.length > 0) cols.push({ text: '' });
    return { columns: cols.map(c => Object.assign({ width: '*' }, c)), columnGap: 18 };
  }

  /** Contactos con íconos en columnas (creativo / profesional) */
  function contactIcons(d, ctx, o) {
    if (!d.contacts.length) return null;
    const cells = d.contacts.map(c => B.iconLine(c, { color: o.color, iconColor: o.iconColor, fontSize: ctx.s(o.size || 8.8), spacing: 0, iconSize: 8.5 }));
    return Object.assign(grid(cells, o.cols || 2, 14, 5), { margin: o.margin || [0, 0, 0, 0] });
  }

  /* ════════════════════════════════════════════════════════════
     1. MODERNO — barra lateral de color a la izquierda
  ════════════════════════════════════════════════════════════ */
  CV.registerTemplate({
    id: 'moderno', name: 'Moderno', desc: 'Barra lateral de color con foto', defaultFonts: 'moderna', photo: true,
    build(d, ctx) {
      const c = ctx.c;
      const SW = 188, M = 38, padL = 22, padR = 18, GAP = 26;
      const sideW = SW - padL - padR;
      const mainW = CV.A4.w - SW - GAP - M;
      const sb = sideStyle(ctx, sideW);
      const st = mainStyle(ctx, mainW, { title: TITLES.rule });

      const side = [];
      const ph = B.photo(d, ctx, 112, { ring: c.onAccentLine, ringWidth: 3, alignment: 'center' });
      if (ph) side.push({ columns: [{ width: '*', text: '' }, ph, { width: '*', text: '' }], margin: [0, 0, 0, 22] });
      side.push(...sideSections(d, sb, { disp: true }));

      const main = [
        nameBlock(d, ctx, { size: 27, color: c.ink, lastColor: c.accentText, roleColor: c.muted, roleUpper: true, roleSpacing: 1.6, roleSize: 10, roleGap: 6 }),
        { canvas: [{ type: 'rect', x: 0, y: 0, w: 38, h: 3, r: 1.5, color: c.accent }], margin: [0, 12, 0, 20] },
        ...mainSections(d, st, { disp: false })
      ];

      return {
        pageMargins: [0, M, M, M],
        background: () => ({ canvas: [{ type: 'rect', x: 0, y: 0, w: SW, h: CV.A4.h, color: c.accent }] }),
        content: [{
          columns: [
            { width: SW, stack: side, margin: [padL, 6, padR, 0] },
            { width: '*', stack: main, margin: [GAP, 8, 0, 0] }
          ],
          columnGap: 0
        }]
      };
    }
  });

  /* ════════════════════════════════════════════════════════════
     2. EJECUTIVO — una columna, encabezado centrado, sobrio
  ════════════════════════════════════════════════════════════ */
  CV.registerTemplate({
    id: 'ejecutivo', name: 'Ejecutivo', desc: 'Una columna, sobrio y clásico', defaultFonts: 'editorial', photo: true,
    build(d, ctx) {
      const c = ctx.c;
      const M = 50, W = CV.A4.w - M * 2;
      const st = mainStyle(ctx, W, { title: TITLES.classic, titleColor: c.accentText, ruleColor: c.mid, bulletType: 'square', sectionGap: 12, itemGap: 8, companyColor: c.text, justify: true, lh: 1.24, plh: 1.38 });
      const ph = B.photo(d, ctx, 74, {});
      const head = [];
      const hw = ph ? W - 74 - 18 : W;
      const al = ph ? 'left' : 'center';
      const nb = nameBlock(d, ctx, { size: 25, color: c.ink, lastColor: c.ink, roleColor: c.accentText, roleSize: 11.5, roleGap: 5, align: al, roleFont: ctx.f.headSemi });
      const cr = infoRows(d, ctx, { color: c.text, labelColor: c.muted, sepColor: c.mid, size: 8.7, align: al, width: hw, withDisp: true, margin: [0, 8, 0, 0] });
      const hs = [nb, cr || ''];
      if (ph) {
        head.push({ columns: [ph, { width: '*', stack: hs, margin: [0, 4, 0, 0] }], columnGap: 18 });
      } else {
        head.push(...hs);
      }
      head.push({ canvas: [
        { type: 'line', x1: 0, y1: 0, x2: W, y2: 0, lineWidth: 1.6, lineColor: c.accent },
        { type: 'line', x1: 0, y1: 3, x2: W, y2: 3, lineWidth: 0.5, lineColor: c.accent }
      ], margin: [0, 12, 0, 14] });
      return {
        pageMargins: [M, 38, M, 36],
        content: [...head, ...mainSections(d, st, { combo: true, disp: false })]
      };
    }
  });

  /* ════════════════════════════════════════════════════════════
     3. MINIMALISTA — blanco, mucho aire, fechas a la izquierda
  ════════════════════════════════════════════════════════════ */
  CV.registerTemplate({
    id: 'minimalista', name: 'Minimalista', desc: 'Limpio, mucho aire, ideal ATS', defaultFonts: 'moderna', photo: true,
    build(d, ctx) {
      const c = ctx.c;
      const M = 52, W = CV.A4.w - M * 2;
      const st = mainStyle(ctx, W, {
        title: TITLES.plain, titleColor: c.ink, periodPos: 'left', dateW: 78, companyColor: c.accentText,
        bulletColor: c.mid, sectionGap: 14, itemGap: 9, lh: 1.24, plh: 1.38
      });
      const ph = B.photo(d, ctx, 70, {});
      const nb = nameBlock(d, ctx, { size: 28, color: c.ink, lastColor: c.ink, bold: true, roleColor: c.accentText, roleSize: 12, roleGap: 4 });
      const hw = ph ? W - 70 - 16 : W;
      const cr = infoRows(d, ctx, { color: c.text, labelColor: c.muted, sepColor: c.lineStrong, sep: '   /   ', size: 8.7, width: hw, withDisp: true, margin: [0, 9, 0, 0] });
      const head = { columns: [{ width: '*', stack: [nb, cr || ''] }, ph || { width: 0, text: '' }], columnGap: 16 };
      return {
        pageMargins: [M, 44, M, 38],
        content: [
          head,
          B.rule(W, c.line, 0.8, [0, 16, 0, 16]),
          ...mainSections(d, st, { combo: true, disp: false })
        ]
      };
    }
  });

  /* ════════════════════════════════════════════════════════════
     4. CREATIVO — gran encabezado de color, dos columnas
  ════════════════════════════════════════════════════════════ */
  CV.registerTemplate({
    id: 'creativo', name: 'Creativo', desc: 'Encabezado de color y dos columnas', defaultFonts: 'geometrica', photo: true,
    build(d, ctx) {
      const c = ctx.c;
      const M = 38, W = CV.A4.w - M * 2;
      const SIDE = 168, GAP = 24, MAINW = W - SIDE - GAP;
      const st = mainStyle(ctx, MAINW, { title: TITLES.short, titleColor: c.ink });
      const sb = sideStyle(ctx, SIDE, {
        text: c.text, muted: c.muted, icon: c.accent, titleColor: c.ink, ruleColor: c.line, bullet: c.accent,
        dotOn: c.accent, dotOff: c.soft, title: SIDE_TITLES.line, headFont: ctx.f.head
      });
      const ph = B.photo(d, ctx, 96, { ring: c.onAccentLine, ringWidth: 3 });
      const nb = nameBlock(d, ctx, { size: 27, color: c.onAccent, lastColor: c.onAccent, roleColor: c.onAccentMuted, roleUpper: true, roleSpacing: 1.8, roleSize: 10, roleGap: 7 });
      const headInner = ph
        ? { columns: [ph, { width: '*', stack: [nb], margin: [0, ph ? 22 : 0, 0, 0] }], columnGap: 22 }
        : nb;
      const header = {
        table: { widths: ['*'], body: [[{ stack: [headInner], fillColor: c.accent, margin: [M, 30, M, 28] }]] },
        layout: 'noBorders',
        margin: [-M, -M, -M, 0]
      };
      const contactBand = d.contacts.length ? {
        table: { widths: ['*'], body: [[{ stack: [contactRowIcons(d, ctx, c)], fillColor: c.soft, margin: [M, 9, M, 8] }]] },
        layout: 'noBorders',
        margin: [-M, 0, -M, 22]
      } : { text: '', margin: [0, 0, 0, 22] };

      return {
        pageMargins: [M, M, M, M],
        content: [
          header,
          contactBand,
          {
            columns: [
              { width: '*', stack: mainSections(d, st, { disp: false }) },
              { width: SIDE, stack: sideSections(d, sb, { contact: false, disp: true }) }
            ],
            columnGap: GAP
          }
        ]
      };
    }
  });

  /** Contactos con íconos en una fila (banda del creativo) */
  function contactRowIcons(d, ctx, c) {
    const cells = d.contacts.map(it => ({
      columns: [
        Object.assign(CV.icon(it.icon, c.accent, 8.5), { margin: [0, 1.2, 0, 0] }),
        { text: it.text, link: it.link, width: 'auto', fontSize: ctx.s(8.7), color: c.ink }
      ],
      columnGap: 5, width: 'auto'
    }));
    return { columns: cells, columnGap: 18 };
  }

  /* ════════════════════════════════════════════════════════════
     5. PROFESIONAL — barra lateral clara a la derecha
  ════════════════════════════════════════════════════════════ */
  CV.registerTemplate({
    id: 'profesional', name: 'Profesional', desc: 'Columna clara a la derecha', defaultFonts: 'moderna', photo: true,
    build(d, ctx) {
      const c = ctx.c;
      const SW = 196, M = 40, GAP = 26, padL = 20, padR = 26;
      const mainW = CV.A4.w - SW - M - GAP;
      const sideW = SW - padL - padR;
      const st = mainStyle(ctx, mainW, { title: TITLES.bar, titleColor: c.ink, sectionGap: 17 });
      const sb = sideStyle(ctx, sideW, {
        text: c.ink, muted: c.muted, icon: c.accentText, titleColor: c.accentText, ruleColor: c.mid,
        bullet: c.accent, dotOn: c.accent, dotOff: c.mid, headFont: ctx.f.head
      });
      const side = [];
      const ph = B.photo(d, ctx, 104, { ring: c.white, ringWidth: 3.5, alignment: 'center' });
      if (ph) side.push({ columns: [{ width: '*', text: '' }, ph, { width: '*', text: '' }], margin: [0, 0, 0, 20] });
      side.push(...sideSections(d, sb, { disp: true }));
      const main = [
        nameBlock(d, ctx, { size: 28, color: c.ink, lastColor: c.accentText, roleColor: c.text, roleSize: 12, roleGap: 6 }),
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: mainW, y2: 0, lineWidth: 0.8, lineColor: c.line }], margin: [0, 16, 0, 18] },
        ...mainSections(d, st, { disp: false })
      ];
      return {
        pageMargins: [M, M, 0, M],
        background: () => ({ canvas: [
          { type: 'rect', x: CV.A4.w - SW, y: 0, w: SW, h: CV.A4.h, color: c.softer },
          { type: 'rect', x: 0, y: 0, w: 6, h: CV.A4.h, color: c.accent }
        ] }),
        content: [{
          columns: [
            { width: '*', stack: main, margin: [0, 6, GAP, 0] },
            { width: SW, stack: side, margin: [padL, 4, padR, 0] }
          ],
          columnGap: 0
        }]
      };
    }
  });

  /* ════════════════════════════════════════════════════════════
     6. ELEGANTE — encabezado centrado, columna izquierda fina
  ════════════════════════════════════════════════════════════ */
  CV.registerTemplate({
    id: 'elegante', name: 'Elegante', desc: 'Serif, centrado y refinado', defaultFonts: 'elegante', photo: true,
    build(d, ctx) {
      const c = ctx.c;
      const M = 44, W = CV.A4.w - M * 2;
      const SIDE = 150, GAP = 28, MAINW = W - SIDE - GAP;
      const st = mainStyle(ctx, MAINW, { title: TITLES.classic, titleColor: c.accentText, ruleColor: c.mid, bulletType: 'circle', companyColor: c.muted, sectionGap: 14, itemGap: 8, periodPos: 'below' });
      const sb = sideStyle(ctx, SIDE, {
        text: c.text, muted: c.muted, icon: c.accentText, titleColor: c.accentText, ruleColor: c.mid,
        bullet: c.mid, dotOn: c.accent, dotOff: c.soft, headFont: ctx.f.head, title: SIDE_TITLES.line
      });
      const ph = B.photo(d, ctx, 76, { alignment: 'center', ring: c.mid, ringWidth: 1 });
      const head = [];
      if (ph) head.push({ columns: [{ width: '*', text: '' }, ph, { width: '*', text: '' }], margin: [0, 0, 0, 10] });
      head.push(nameBlock(d, ctx, { size: 28, color: c.ink, lastColor: c.ink, bold: false, align: 'center', roleColor: c.accentText, roleUpper: true, roleSpacing: 2.6, roleSize: 9.5, roleGap: 7 }));
      head.push({ canvas: [
        { type: 'line', x1: W / 2 - 110, y1: 0, x2: W / 2 - 8, y2: 0, lineWidth: 0.6, lineColor: c.mid },
        { type: 'rect', x: W / 2 - 3, y: -3, w: 6, h: 6, color: c.accent },
        { type: 'line', x1: W / 2 + 8, y1: 0, x2: W / 2 + 110, y2: 0, lineWidth: 0.6, lineColor: c.mid }
      ], margin: [0, 12, 0, 18] });
      return {
        pageMargins: [M, 36, M, 36],
        content: [
          ...head,
          {
            columns: [
              { width: SIDE, stack: sideSections(d, sb, { disp: true }) },
              { width: '*', stack: mainSections(d, st, { disp: false }) }
            ],
            columnGap: GAP
          }
        ]
      };
    }
  });

  /* ════════════════════════════════════════════════════════════
     7. COMPACTO — aprovecha la hoja, ideal para mucha experiencia
  ════════════════════════════════════════════════════════════ */
  CV.registerTemplate({
    id: 'compacto', name: 'Compacto', desc: 'Entra más contenido en una hoja', defaultFonts: 'moderna', photo: true,
    build(d, ctx) {
      const c = ctx.c;
      const M = 34, W = CV.A4.w - M * 2;
      const SIDE = 160, GAP = 22, MAINW = W - SIDE - GAP;
      const st = mainStyle(ctx, MAINW, { title: TITLES.band, titleColor: c.accentText, bandColor: c.soft, sectionGap: 12, itemGap: 8 });
      const sb = sideStyle(ctx, SIDE, {
        text: c.text, muted: c.muted, icon: c.accentText, titleColor: c.accentText, ruleColor: c.line,
        bullet: c.accent, dotOn: c.accent, dotOff: c.soft, sectionGap: 13, title: (text, s) => TITLES.band(text, Object.assign({}, s, { w: SIDE, bandColor: c.soft, accent: c.accent, titleColor: c.accentText }))
      });
      const ph = B.photo(d, ctx, 64, {});
      const nb = nameBlock(d, ctx, { size: 23, color: c.ink, lastColor: c.accentText, roleColor: c.text, roleSize: 10.5, roleGap: 3 });
      const cr = contactRow(d, ctx, { color: c.text, sepColor: c.mid, sep: '  |  ', size: 8.6, width: ph ? W - 64 - 14 : W, margin: [0, 7, 0, 0] });
      const head = ph
        ? { columns: [ph, { width: '*', stack: [nb, cr || ''], margin: [0, 6, 0, 0] }], columnGap: 14 }
        : { stack: [nb, cr || ''] };
      return {
        pageMargins: [M, 32, M, 32],
        defaultStyle: { lineHeight: 1.25 },
        content: [
          head,
          { canvas: [{ type: 'rect', x: 0, y: 0, w: W, h: 2.5, color: c.accent }], margin: [0, 12, 0, 14] },
          {
            columns: [
              { width: '*', stack: mainSections(d, st, { disp: false }) },
              { width: SIDE, stack: sideSections(d, sb, { contact: false, disp: true }) }
            ],
            columnGap: GAP
          }
        ]
      };
    }
  });

  CV._tpl = { TITLES, SIDE_TITLES, LABELS, mainSections, sideSections, mainStyle, sideStyle, nameBlock, contactRow, contactIcons, grid, skillsInline, langsInline, join, up };
})();
