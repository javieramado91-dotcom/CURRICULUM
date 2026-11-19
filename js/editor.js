/* ══════════════════════════════════════════════════════════════
   CV Builder — Asistente: pasos, formularios y diseño
══════════════════════════════════════════════════════════════ */
window.CV = window.CV || {};

CV.Editor = (() => {
  const $ = id => document.getElementById(id);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const icon = (id, cls = '') => `<svg class="i ${cls}"><use href="#i-${id}"/></svg>`;

  const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const setPath = (o, p, v) => { const ks = p.split('.'); const last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; };

  let steps = [];
  let cur = 0;
  const S = () => CV.state;

  /* ══════════════ PASOS ══════════════ */
  function buildStepper() {
    steps = $$('.step').map(el => ({ id: el.dataset.step, title: el.dataset.title, el }));
    const nav = $('stepper');
    nav.innerHTML = steps.map((s, i) =>
      (i ? '<span class="st-sep"></span>' : '') +
      `<button class="st-btn" data-step-i="${i}" title="${esc(s.title)}"><span class="st-num">${i + 1}</span><span class="st-lbl">${esc(s.title)}</span></button>`
    ).join('');
    nav.addEventListener('click', e => {
      const b = e.target.closest('[data-step-i]');
      if (b) goTo(parseInt(b.dataset.stepI, 10));
    });
  }

  function updateStepUI() {
    $$('.st-btn').forEach((b, i) => {
      b.classList.toggle('active', i === cur);
      b.classList.toggle('done', i < cur);
    });
    const activeBtn = $$('.st-btn')[cur];
    if (activeBtn) activeBtn.scrollIntoView({ block: 'nearest', inline: 'center' });
    const s = steps[cur];
    $('mstep-txt').textContent = `${cur + 1}/${steps.length} · ${s.title}`;
    $$('#step-menu [data-step-i]').forEach((b, i) => {
      b.classList.toggle('active', i === cur);
      b.classList.toggle('done', i < cur);
    });
    $('mprog-fill').style.width = ((cur + 1) / steps.length * 100) + '%';
    $('step-count').textContent = `${cur + 1} / ${steps.length}`;
    $('btn-back').disabled = cur === 0;
    const next = $('btn-next');
    const last = cur === steps.length - 1;
    next.innerHTML = last
      ? `${icon('download')}<span>Descargar PDF</span>`
      : `<span>${cur === steps.length - 2 ? 'Elegir diseño' : 'Siguiente'}</span>${icon('arrow-right')}`;
    next.classList.toggle('finish', last);
    $('editor').classList.toggle('on-design', s.id === 'diseno');
  }

  function goTo(i, opts = {}) {
    if (typeof i === 'string') i = steps.findIndex(s => s.id === i);
    if (i < 0 || i >= steps.length) return;
    closeStepMenu();
    const back = i < cur;
    steps.forEach((s, k) => { s.el.classList.toggle('active', k === i); s.el.classList.toggle('back', back && k === i); });
    cur = i;
    updateStepUI();
    $('form-scroll').scrollTop = 0;
    if (steps[i].id === 'diseno') refreshDesign(true);
    if (!opts.noFocus && window.matchMedia('(min-width: 1101px)').matches) {
      setTimeout(() => {
        const f = steps[i].el.querySelector('input.inp:not([type=checkbox]), textarea.inp');
        if (f && !f.value) f.focus({ preventScroll: true });
      }, 60);
    }
    try { history.replaceState(null, '', '#' + steps[i].id); } catch (e) { /* file:// */ }
  }

  function validate(stepId) {
    if (stepId === 'datos') {
      for (const k of ['nombre', 'apellido']) {
        if (!CV.clean(S()[k])) {
          const el = document.querySelector(`[data-bind="${k}"]`);
          el.classList.add('invalid');
          el.focus();
          CV.toast(k === 'nombre' ? 'Escribí tu nombre para continuar' : 'Escribí tu apellido para continuar', true);
          setTimeout(() => el.classList.remove('invalid'), 2500);
          return false;
        }
      }
    }
    return true;
  }

  function next() {
    if (!validate(steps[cur].id)) return;
    if (cur === steps.length - 1) { CV.Export.download(); return; }
    goTo(cur + 1);
  }
  function back() { if (cur > 0) goTo(cur - 1); }

  /* ── Menú de pasos (celular y tablet, donde no se ve la barra de pasos) ── */
  function buildStepMenu() {
    const menu = $('step-menu');
    menu.innerHTML = steps.map((s, i) =>
      `<button type="button" class="sm-item" data-step-i="${i}"><span class="st-num">${i + 1}</span><span>${esc(s.title)}</span></button>`
    ).join('');
    menu.addEventListener('click', e => {
      const b = e.target.closest('[data-step-i]');
      if (b) goTo(parseInt(b.dataset.stepI, 10));
    });
    $('mstep').addEventListener('click', e => {
      e.stopPropagation();
      const open = menu.hidden;
      menu.hidden = !open;
      $('mstep').setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', e => { if (!e.target.closest('#step-menu')) closeStepMenu(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeStepMenu(); });
  }
  function closeStepMenu() {
    const menu = $('step-menu');
    if (menu && !menu.hidden) { menu.hidden = true; $('mstep').setAttribute('aria-expanded', 'false'); }
  }

  /* ══════════════ CAMPOS SIMPLES ══════════════ */
  function bindFields() {
    $$('[data-bind]').forEach(el => {
      const path = el.dataset.bind;
      const ev = el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(ev, (e) => {
        let v = el.type === 'checkbox' ? el.checked : el.value;
        if (el.dataset.format === 'fecha') v = formatFechaInput(el, e);
        setPath(S(), path, v);
        el.classList.remove('invalid');
        onFieldChange(path);
        CV.changed();
      });
      if (path === 'contacto.email') el.addEventListener('blur', () => checkEmail(el));
    });
  }

  /** Inserta las barras de DD/MM/AAAA mientras se tipea (sin pelear con quien escribe "1/5/95") */
  function formatFechaInput(el, ev) {
    const raw = el.value;
    if (ev && ev.inputType && ev.inputType.startsWith('delete')) return raw;
    if (!/^[\d\/]*$/.test(raw)) return raw;
    const slashAt = [...raw].map((ch, i) => (ch === '/' ? i : -1)).filter(i => i >= 0);
    if (!slashAt.every(i => i === 2 || i === 5)) return raw;
    const d = raw.replace(/\D/g, '').slice(0, 8);
    const out = d.length > 4 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
    if (out !== raw) el.value = out;
    return el.value;
  }

  function checkEmail(el) {
    const v = CV.clean(el.value);
    const msg = document.querySelector('[data-msg-for="contacto.email"]');
    msg.textContent = v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? 'Revisá el mail: parece que le falta algo (ej: nombre@gmail.com).' : '';
  }

  function onFieldChange(path) {
    if (path === 'perfil') updateCounter();
    if (path === 'perfil') renderPerfilSugg();
    if (path === 'extras.disponibilidad') renderDispSugg();
    if (path === 'puesto') renderPuestoSugg();
  }

  function fillFields() {
    $$('[data-bind]').forEach(el => {
      const v = getPath(S(), el.dataset.bind);
      if (el.type === 'checkbox') el.checked = !!v;
      else el.value = v == null ? '' : v;
    });
    syncSegs();
    updateCounter();
  }

  function updateCounter() {
    const el = document.querySelector('[data-counter="perfil"]');
    if (!el) return;
    const n = (S().perfil || '').trim().length;
    const min = +el.dataset.min, max = +el.dataset.max;
    el.textContent = n ? `${n} caracteres · ${n < min ? 'podés sumar un poco más' : n > max ? 'un poco largo: tratá de resumir' : 'muy bien'}` : 'Ideal: entre 200 y 500 caracteres';
    el.className = 'counter' + (n >= min && n <= max ? ' ok' : n ? ' warn' : '');
  }

  /* Botoneras segmentadas, contadores y bloques condicionales */
  function bindSegs() {
    $$('[data-seg]').forEach(seg => {
      seg.addEventListener('click', e => {
        const b = e.target.closest('button[data-v]');
        if (!b) return;
        setPath(S(), seg.dataset.seg, b.dataset.v);
        syncSegs();
        CV.changed();
        if (seg.dataset.seg.startsWith('design.')) refreshDesign();
      });
    });
    $$('[data-num]').forEach(b => {
      b.addEventListener('click', () => {
        const p = b.dataset.num;
        const v = Math.max(1, Math.min(15, (parseInt(getPath(S(), p), 10) || 1) + parseInt(b.dataset.d, 10)));
        setPath(S(), p, v);
        syncSegs();
        CV.changed();
      });
    });
    // categorías de licencia
    $('lic-cats').innerHTML = CV.LICENCIAS.map(l =>
      `<label class="lic-cat" title="${esc(l.label)}"><input type="checkbox" value="${l.value}"><span><b>${l.value}</b> ${esc(l.label.split('—')[1] || '')}</span></label>`
    ).join('');
    $('lic-cats').addEventListener('change', () => {
      S().personal.licCat = $$('#lic-cats input:checked').map(i => i.value);
      CV.changed();
    });
  }

  function syncSegs() {
    $$('[data-seg]').forEach(seg => {
      const v = getPath(S(), seg.dataset.seg) || '';
      $$('button[data-v]', seg).forEach(b => b.classList.toggle('on', b.dataset.v === v));
    });
    $$('[data-out]').forEach(o => { o.textContent = getPath(S(), o.dataset.out); });
    $$('[data-show-when]').forEach(el => {
      const [p, v] = el.dataset.showWhen.split('=');
      el.hidden = (getPath(S(), p) || '') !== v;
    });
    const cats = S().personal.licCat || [];
    $$('#lic-cats input').forEach(i => { i.checked = cats.includes(i.value); });
  }

  /* ══════════════ RUBROS Y SUGERENCIAS ══════════════ */
  function renderRubros() {
    $('rubro-grid').innerHTML = CV.RUBROS.map(r =>
      `<button type="button" class="rubro${S().rubro === r.id ? ' on' : ''}" data-rubro="${r.id}"><span class="em">${r.emoji}</span>${esc(r.name)}</button>`
    ).join('');
    const opts = '<option value="">Elegí un rubro…</option>' + CV.RUBROS.map(r => `<option value="${r.id}">${r.emoji} ${esc(r.name)}</option>`).join('');
    $$('[data-rubro-select]').forEach(sel => { sel.innerHTML = opts; sel.value = S().rubro; });
  }

  function setRubro(id) {
    S().rubro = id;
    $$('.rubro').forEach(b => b.classList.toggle('on', b.dataset.rubro === id));
    $$('[data-rubro-select]').forEach(sel => { sel.value = id; });
    renderPuestoSugg(); renderPerfilSugg(); renderSkillSugg(); renderExpSugg();
  }

  function bindRubros() {
    $('rubro-grid').addEventListener('click', e => {
      const b = e.target.closest('[data-rubro]');
      if (b) setRubro(S().rubro === b.dataset.rubro ? '' : b.dataset.rubro);
    });
    document.addEventListener('change', e => {
      if (e.target.matches('[data-rubro-select]')) setRubro(e.target.value);
    });
  }

  function renderPuestoSugg() {
    const r = CV.rubro(S().rubro);
    const box = $('puesto-sugg');
    if (!r) { box.innerHTML = ''; return; }
    const cur = CV.clean(S().puesto).toLowerCase();
    box.innerHTML = r.puestos.map(p => `<button type="button" class="chip${cur === p.toLowerCase() ? ' used' : ''}" data-puesto="${esc(p)}">${esc(p)}</button>`).join('');
  }

  function renderPerfilSugg() {
    const r = CV.rubro(S().rubro);
    const box = $('perfil-sugg');
    if (!r) { box.innerHTML = '<p class="sugg-empty">Elegí tu rubro arriba para ver ejemplos pensados para vos.</p>'; return; }
    const hasText = CV.clean(S().perfil).length > 0;
    box.innerHTML = r.perfiles.map((p, i) => `
      <div class="sugg-item"><span>${esc(p)}</span>
        <button type="button" class="btn btn-soft btn-sm" data-perfil="${i}">${icon(hasText ? 'edit' : 'check')}${hasText ? 'Reemplazar mi texto' : 'Usar este texto'}</button>
      </div>`).join('');
  }

  function renderSkillSugg() {
    const r = CV.rubro(S().rubro);
    const have = new Set((S().habilidades || []).map(x => x.toLowerCase()));
    const list = r ? r.habilidades : ['Excel', 'Word', 'Atención al cliente', 'Manejo de caja', 'Redes sociales', 'Google Drive', 'Carga de datos', 'Ventas'];
    $('skills-sugg').innerHTML = list.map(h => `<button type="button" class="chip${have.has(h.toLowerCase()) ? ' used' : ''}" data-tag-add="habilidades" data-v="${esc(h)}">${icon(have.has(h.toLowerCase()) ? 'check' : 'plus')}${esc(h)}</button>`).join('');
    const haveS = new Set((S().competencias || []).map(x => x.toLowerCase()));
    $('soft-sugg').innerHTML = CV.COMPETENCIAS.map(h => `<button type="button" class="chip${haveS.has(h.toLowerCase()) ? ' used' : ''}" data-tag-add="competencias" data-v="${esc(h)}">${icon(haveS.has(h.toLowerCase()) ? 'check' : 'plus')}${esc(h)}</button>`).join('');
  }

  function renderDispSugg() {
    const curr = (S().extras.disponibilidad || '').toLowerCase();
    $('disp-sugg').innerHTML = CV.DISPONIBILIDAD.map(d => {
      const used = curr.includes(d.toLowerCase());
      return `<button type="button" class="chip${used ? ' used' : ''}" data-disp="${esc(d)}">${icon(used ? 'check' : 'plus')}${esc(d)}</button>`;
    }).join('');
  }

  function bindSuggestions() {
    $('puesto-sugg').addEventListener('click', e => {
      const b = e.target.closest('[data-puesto]');
      if (!b) return;
      S().puesto = b.dataset.puesto;
      document.querySelector('[data-bind="puesto"]').value = S().puesto;
      renderPuestoSugg(); CV.changed();
    });
    $('perfil-sugg').addEventListener('click', e => {
      const b = e.target.closest('[data-perfil]');
      if (!b) return;
      const r = CV.rubro(S().rubro);
      S().perfil = r.perfiles[+b.dataset.perfil];
      const ta = document.querySelector('[data-bind="perfil"]');
      ta.value = S().perfil;
      updateCounter(); renderPerfilSugg(); CV.changed();
      ta.focus({ preventScroll: true });
      ta.scrollIntoView({ behavior: 'smooth', block: 'center' });
      CV.toast('Listo. Adaptalo con tus palabras y tu experiencia.');
    });
    $('disp-sugg').addEventListener('click', e => {
      const b = e.target.closest('[data-disp]');
      if (!b) return;
      const v = b.dataset.disp;
      const parts = (S().extras.disponibilidad || '').split('·').map(x => x.trim()).filter(Boolean);
      const idx = parts.findIndex(p => p.toLowerCase() === v.toLowerCase());
      if (idx >= 0) parts.splice(idx, 1); else parts.push(v);
      S().extras.disponibilidad = parts.join(' · ');
      document.querySelector('[data-bind="extras.disponibilidad"]').value = S().extras.disponibilidad;
      renderDispSugg(); CV.changed();
    });
  }

  /* ══════════════ ETIQUETAS (habilidades / competencias) ══════════════ */
  function renderTags(key) {
    const box = document.querySelector(`[data-tags="${key}"]`);
    $$('.tag', box).forEach(t => t.remove());
    const input = box.querySelector('input');
    (S()[key] || []).forEach((t, i) => {
      const el = document.createElement('span');
      el.className = 'tag';
      el.innerHTML = `${esc(t)}<button type="button" data-tag-del="${i}" aria-label="Quitar ${esc(t)}">${icon('x')}</button>`;
      box.insertBefore(el, input);
    });
  }

  function addTags(key, raw) {
    const vals = String(raw).split(/[,;\n]/).map(CV.clean).filter(Boolean);
    if (!vals.length) return;
    const list = S()[key];
    vals.forEach(v => {
      v = v.charAt(0).toUpperCase() + v.slice(1);
      if (!list.some(x => x.toLowerCase() === v.toLowerCase())) list.push(v);
    });
    renderTags(key); renderSkillSugg(); CV.changed();
  }
  function toggleTag(key, v) {
    const list = S()[key];
    const i = list.findIndex(x => x.toLowerCase() === v.toLowerCase());
    if (i >= 0) list.splice(i, 1); else list.push(v);
    renderTags(key); renderSkillSugg(); CV.changed();
  }

  function bindTags() {
    $$('[data-tags]').forEach(box => {
      const key = box.dataset.tags;
      const input = box.querySelector('input');
      box.addEventListener('click', e => {
        const del = e.target.closest('[data-tag-del]');
        if (del) { S()[key].splice(+del.dataset.tagDel, 1); renderTags(key); renderSkillSugg(); CV.changed(); return; }
        input.focus();
      });
      input.addEventListener('keydown', e => {
        if ((e.key === 'Enter' || e.key === ',') && input.value.trim()) { e.preventDefault(); addTags(key, input.value); input.value = ''; }
        else if (e.key === 'Enter') e.preventDefault();
        else if (e.key === 'Backspace' && !input.value && S()[key].length) { S()[key].pop(); renderTags(key); renderSkillSugg(); CV.changed(); }
      });
      input.addEventListener('blur', () => { if (input.value.trim()) { addTags(key, input.value); input.value = ''; } });
      input.addEventListener('paste', e => {
        const t = (e.clipboardData || window.clipboardData).getData('text');
        if (/[,;\n]/.test(t)) { e.preventDefault(); addTags(key, t); }
      });
    });
    document.addEventListener('click', e => {
      const b = e.target.closest('[data-tag-add]');
      if (b) toggleTag(b.dataset.tagAdd, b.dataset.v);
    });
  }

  /* ══════════════ LISTAS DINÁMICAS ══════════════ */
  const YEAR = new Date().getFullYear();
  const yearOpts = (sel, from, to, ph = 'Año') => `<option value="">${ph}</option>` +
    Array.from({ length: from - to + 1 }, (_, k) => from - k).map(y => `<option${String(y) === String(sel) ? ' selected' : ''}>${y}</option>`).join('');
  const monthOpts = sel => '<option value="">Mes</option>' + CV.MESES_LARGOS.map((m, k) => `<option value="${k + 1}"${String(k + 1) === String(sel) ? ' selected' : ''}>${m}</option>`).join('');
  const toolBtns = (i, n, collapsible) => `
    <div class="dyn-tools">
      <button type="button" class="btn btn-ghost" data-move="-1" title="Subir"${i === 0 ? ' disabled' : ''}>${icon('up')}</button>
      <button type="button" class="btn btn-ghost" data-move="1" title="Bajar"${i === n - 1 ? ' disabled' : ''}>${icon('down')}</button>
      <button type="button" class="btn btn-ghost btn-danger" data-remove title="Eliminar">${icon('trash')}</button>
      ${collapsible ? icon('down', 'dyn-chev') : ''}
    </div>`;

  const LISTS = {
    experiencia: {
      host: 'exp-list', path: 'experiencia', make: CV.newExperiencia, collapsible: true,
      summary: e => ({
        title: CV.clean(e.puesto) || CV.clean(e.empresa) || 'Nuevo trabajo',
        sub: [CV.clean(e.puesto) ? CV.clean(e.empresa) : '', CV.formatPeriodo(e.desdeM, e.desdeA, e.hastaM, e.hastaA, e.actual)].filter(Boolean).join(' · ') || 'Completá los datos'
      }),
      body: (e) => `
        <div class="grid-2">
          <label class="field"><span class="lbl">Puesto</span><input class="inp" data-k="puesto" value="${esc(e.puesto)}" placeholder="Ej: Vendedor/a"></label>
          <label class="field"><span class="lbl">Empresa o lugar</span><input class="inp" data-k="empresa" value="${esc(e.empresa)}" placeholder="Ej: Supermercado Día"></label>
        </div>
        <label class="field"><span class="lbl">Localidad <span class="opt">opcional</span></span><input class="inp" data-k="lugar" value="${esc(e.lugar)}" placeholder="Ej: San Martín, Bs. As."></label>
        <div class="grid-2">
          <div class="field"><span class="lbl">Desde</span><div class="date-pair"><select class="inp" data-k="desdeM">${monthOpts(e.desdeM)}</select><select class="inp" data-k="desdeA">${yearOpts(e.desdeA, YEAR, 1960)}</select></div></div>
          <div class="field"><span class="lbl">Hasta</span><div class="date-pair"><select class="inp" data-k="hastaM"${e.actual ? ' disabled' : ''}>${monthOpts(e.hastaM)}</select><select class="inp" data-k="hastaA"${e.actual ? ' disabled' : ''}>${yearOpts(e.hastaA, YEAR, 1960)}</select></div></div>
        </div>
        <label class="check"><input type="checkbox" data-k="actual"${e.actual ? ' checked' : ''}><span>Trabajo actualmente acá</span></label>
        <label class="field"><span class="lbl">Tareas y logros <span class="opt">una por renglón</span></span>
          <textarea class="inp" data-k="tareas" rows="5" placeholder="Ej:&#10;Atención al cliente y cobro en caja&#10;Reposición y control de stock">${esc(e.tareas)}</textarea></label>
        <div class="tareas-sugg">
          <span class="sugg-lbl"><span>${icon('sparkles')} Ideas para tu rubro</span><select class="inp inp-xs rubro-select" data-rubro-select="exp"></select></span>
          <div class="chips" data-exp-sugg></div>
        </div>`
    },
    estudios: {
      host: 'edu-list', path: 'estudios', make: CV.newEstudio, collapsible: true,
      summary: e => ({
        title: CV.clean(e.titulo) || CV.clean(e.inst) || 'Nuevo estudio',
        sub: [CV.clean(e.titulo) ? CV.clean(e.inst) : '', CV.formatAnios(e.desde, e.hasta, e.estado), e.estado].filter(Boolean).join(' · ') || 'Completá los datos'
      }),
      body: (e) => `
        <label class="field"><span class="lbl">Título o carrera</span><input class="inp" data-k="titulo" value="${esc(e.titulo)}" placeholder="Ej: Secundario completo · Técnico/a en Administración"></label>
        <div class="grid-2">
          <label class="field"><span class="lbl">Institución</span><input class="inp" data-k="inst" value="${esc(e.inst)}" placeholder="Ej: Escuela N.º 12 · UBA"></label>
          <label class="field"><span class="lbl">Estado</span><select class="inp" data-k="estado"><option value="">Elegí…</option>${CV.ESTADOS_ESTUDIO.map(x => `<option${x === e.estado ? ' selected' : ''}>${x}</option>`).join('')}</select></label>
        </div>
        <div class="grid-2">
          <label class="field"><span class="lbl">Año de inicio</span><select class="inp" data-k="desde">${yearOpts(e.desde, YEAR, 1960)}</select></label>
          <label class="field"><span class="lbl">Año de finalización <span class="opt">o estimado</span></span><select class="inp" data-k="hasta">${yearOpts(e.hasta, YEAR + 6, 1960)}</select></label>
        </div>`
    },
    cursos: {
      host: 'curso-list', path: 'cursos', make: CV.newCurso, collapsible: true,
      summary: e => ({ title: CV.clean(e.nombre) || 'Nuevo curso', sub: [CV.clean(e.inst), e.anio].filter(Boolean).join(' · ') || 'Completá los datos' }),
      body: (e) => `
        <label class="field"><span class="lbl">Nombre del curso</span><input class="inp" data-k="nombre" value="${esc(e.nombre)}" placeholder="Ej: Manipulación de alimentos · Excel avanzado"></label>
        <label class="field"><span class="lbl">Institución o plataforma</span><input class="inp" data-k="inst" value="${esc(e.inst)}" placeholder="Ej: Centro de Formación Profesional N.º 401"></label>
        <div class="grid-2">
          <label class="field"><span class="lbl">Año</span><select class="inp" data-k="anio">${yearOpts(e.anio, YEAR + 1, 1970)}</select></label>
          <label class="field"><span class="lbl">Horas <span class="opt">opcional</span></span><input class="inp" data-k="horas" inputmode="numeric" value="${esc(e.horas)}" placeholder="Ej: 40"></label>
        </div>`
    },
    idiomas: {
      host: 'lang-list', path: 'idiomas', make: CV.newIdioma, simple: true,
      body: (e) => `
        <div class="row-inline">
          <input class="inp inp-sm" data-k="nombre" value="${esc(e.nombre)}" placeholder="Idioma" list="dl-idiomas">
          <select class="inp inp-sm" data-k="nivel">${CV.NIVELES_IDIOMA.map(n => `<option${n.value === e.nivel ? ' selected' : ''}>${n.value}</option>`).join('')}</select>
          <input class="inp inp-sm" data-k="detalle" value="${esc(e.detalle)}" placeholder="Detalle (ej: B2)">
          <button type="button" class="btn btn-ghost btn-sm btn-icon btn-danger" data-remove title="Eliminar">${icon('trash')}</button>
        </div>`
    },
    referencias: {
      host: 'ref-list', path: 'extras.referencias', make: CV.newReferencia, simple: true,
      body: (e) => `
        <div class="row-inline">
          <input class="inp inp-sm" data-k="nombre" value="${esc(e.nombre)}" placeholder="Nombre y apellido">
          <input class="inp inp-sm" data-k="relacion" value="${esc(e.relacion)}" placeholder="Relación (ej: Ex jefe)">
          <input class="inp inp-sm" data-k="tel" value="${esc(e.tel)}" placeholder="Teléfono" inputmode="tel">
          <button type="button" class="btn btn-ghost btn-sm btn-icon btn-danger" data-remove title="Eliminar">${icon('trash')}</button>
        </div>`
    }
  };

  function renderList(key, openIndex) {
    const L = LISTS[key];
    const arr = getPath(S(), L.path);
    const host = $(L.host);
    const opened = new Set($$('.dyn.open', host).map(el => +el.dataset.i));
    if (openIndex != null) opened.add(openIndex);
    host.innerHTML = arr.map((e, i) => {
      if (L.simple) return `<div class="dyn dyn-simple" data-i="${i}"><div class="dyn-body">${L.body(e)}</div></div>`;
      const sm = L.summary(e);
      return `<div class="dyn${opened.has(i) ? ' open' : ''}" data-i="${i}">
        <div class="dyn-head" data-toggle><div class="dyn-title"><strong>${esc(sm.title)}</strong><span>${esc(sm.sub)}</span></div>${toolBtns(i, arr.length, true)}</div>
        <div class="dyn-body">${L.body(e)}</div></div>`;
    }).join('');
    if (key === 'experiencia') {
      $$('[data-rubro-select="exp"]', host).forEach(sel => {
        sel.innerHTML = '<option value="">Elegí un rubro…</option>' + CV.RUBROS.map(r => `<option value="${r.id}">${r.emoji} ${esc(r.name)}</option>`).join('');
        sel.value = S().rubro;
      });
      renderExpSugg();
    }
    if (key === 'idiomas' && !$('dl-idiomas')) {
      const dl = document.createElement('datalist');
      dl.id = 'dl-idiomas';
      dl.innerHTML = CV.IDIOMAS_COMUNES.map(x => `<option value="${x}">`).join('');
      document.body.appendChild(dl);
    }
  }

  function renderExpSugg() {
    const r = CV.rubro(S().rubro);
    $$('#exp-list .dyn').forEach(item => {
      const box = item.querySelector('[data-exp-sugg]');
      if (!box) return;
      if (!r) { box.innerHTML = '<span class="sugg-empty">Elegí un rubro para ver tareas sugeridas.</span>'; return; }
      const e = S().experiencia[+item.dataset.i];
      const lines = CV.cleanMultiline(e ? e.tareas : '').map(l => l.toLowerCase());
      box.innerHTML = r.tareas.map(t => {
        const used = lines.includes(t.toLowerCase());
        return `<button type="button" class="chip${used ? ' used' : ''}" data-tarea="${esc(t)}">${icon(used ? 'check' : 'plus')}${esc(t)}</button>`;
      }).join('');
    });
  }

  function bindLists() {
    Object.entries(LISTS).forEach(([key, L]) => {
      const host = $(L.host);
      const arr = () => getPath(S(), L.path);
      const onEdit = e => {
        const el = e.target.closest('[data-k]');
        if (!el) return;
        const item = el.closest('.dyn');
        const i = +item.dataset.i;
        const rec = arr()[i];
        const k = el.dataset.k;
        rec[k] = el.type === 'checkbox' ? el.checked : el.value;
        if (k === 'actual') {
          $$('[data-k="hastaM"],[data-k="hastaA"]', item).forEach(s => { s.disabled = rec.actual; });
        }
        if (!L.simple) {
          const sm = L.summary(rec);
          item.querySelector('.dyn-title strong').textContent = sm.title;
          item.querySelector('.dyn-title span').textContent = sm.sub;
        }
        if (k === 'tareas') renderExpSugg();
        CV.changed();
      };
      host.addEventListener('input', onEdit);
      host.addEventListener('change', e => { if (e.target.matches('select, input[type=checkbox]')) onEdit(e); });
      host.addEventListener('click', e => {
        const item = e.target.closest('.dyn');
        if (!item) return;
        const i = +item.dataset.i;
        const mv = e.target.closest('[data-move]');
        const rm = e.target.closest('[data-remove]');
        const tarea = e.target.closest('[data-tarea]');
        if (mv) {
          e.stopPropagation();
          const j = i + parseInt(mv.dataset.move, 10);
          const a = arr();
          if (j < 0 || j >= a.length) return;
          [a[i], a[j]] = [a[j], a[i]];
          const wasOpen = new Set($$('.dyn.open', host).map(x => +x.dataset.i));
          $$('.dyn', host).forEach(x => x.classList.remove('open'));
          renderList(key);
          $$('.dyn', host).forEach(x => {
            const k = +x.dataset.i;
            const orig = k === i ? j : k === j ? i : k;
            if (wasOpen.has(orig)) x.classList.add('open');
          });
          CV.changed();
          return;
        }
        if (rm) {
          e.stopPropagation();
          const rec = arr()[i];
          const hasData = Object.values(rec).some(v => typeof v === 'string' ? v.trim() : false);
          arr().splice(i, 1);
          renderList(key);
          CV.changed();
          if (hasData) CV.toast('Elemento eliminado');
          return;
        }
        if (tarea) {
          const rec = arr()[i];
          const t = tarea.dataset.tarea;
          const lines = CV.cleanMultiline(rec.tareas);
          const idx = lines.findIndex(l => l.toLowerCase() === t.toLowerCase());
          if (idx >= 0) lines.splice(idx, 1); else lines.push(t);
          rec.tareas = lines.join('\n');
          item.querySelector('[data-k="tareas"]').value = rec.tareas;
          renderExpSugg();
          CV.changed();
          return;
        }
        if (e.target.closest('[data-toggle]') && !e.target.closest('.dyn-tools .btn')) {
          item.classList.toggle('open');
        }
      });
    });
    document.addEventListener('click', e => {
      const b = e.target.closest('[data-add]');
      if (!b) return;
      const L = LISTS[b.dataset.add];
      const a = getPath(S(), L.path);
      a.push(L.make());
      renderList(b.dataset.add, a.length - 1);
      CV.changed();
      const last = $(L.host).lastElementChild;
      if (last) {
        last.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const f = last.querySelector('input.inp');
        if (f) setTimeout(() => f.focus({ preventScroll: true }), 250);
      }
    });
  }

  /* ══════════════ DISEÑO ══════════════ */
  const UI_FONT = { Inter: "'Inter', sans-serif", Lora: "'Lora', serif", Playfair: "'Playfair Display', serif", Montserrat: "'Montserrat', sans-serif" };
  let thumbsKey = '';
  function renderDesignControls() {
    const d = S().design;
    $('tpl-grid').innerHTML = CV.TEMPLATE_ORDER.map(id => {
      const t = CV.TEMPLATES[id];
      return `<button type="button" class="tpl-opt${d.template === id ? ' on' : ''}" data-tpl="${id}">
        <span class="tpl-thumb" data-thumb="${id}"><span class="skeleton"></span></span>
        <strong>${esc(t.name)}</strong><span>${esc(t.desc)}</span></button>`;
    }).join('');
    $('swatches').innerHTML = CV.PALETTES.map(p => `<button type="button" class="sw${d.palette === p.id ? ' on' : ''}" data-pal="${p.id}" title="${esc(p.name)}" style="background:${p.accent}" aria-label="${esc(p.name)}"></button>`).join('');
    const tpl = CV.TEMPLATES[d.template];
    const defPair = CV.FONT_PAIRS.find(f => f.id === tpl.defaultFonts);
    $('font-grid').innerHTML = `<button type="button" class="font-opt${d.fonts === 'auto' ? ' on' : ''}" data-font="auto"><strong>Automática</strong><span>La del diseño (${esc(defPair ? defPair.name : '')})</span></button>` +
      CV.FONT_PAIRS.map(f => `<button type="button" class="font-opt${d.fonts === f.id ? ' on' : ''}" data-font="${f.id}"><strong style="font-family:${UI_FONT[f.head] || 'Inter'}">${esc(f.name)}</strong><span>${esc(f.desc)}</span></button>`).join('');
    thumbsKey = '';
  }

  function updateDesignSelection() {
    const d = S().design;
    $$('[data-tpl]').forEach(b => b.classList.toggle('on', b.dataset.tpl === d.template));
    $$('[data-pal]').forEach(b => b.classList.toggle('on', b.dataset.pal === d.palette));
    $$('[data-font]').forEach(b => b.classList.toggle('on', b.dataset.font === d.fonts));
    const tpl = CV.TEMPLATES[d.template];
    const defPair = CV.FONT_PAIRS.find(f => f.id === tpl.defaultFonts);
    const auto = document.querySelector('[data-font="auto"] span');
    if (auto) auto.textContent = `La del diseño (${defPair ? defPair.name : ''})`;
  }

  /** Miniaturas con los datos de la persona (o de ejemplo si todavía no cargó nada) */
  function refreshDesign(force) {
    updateDesignSelection();
    if (steps[cur] && steps[cur].id !== 'diseno' && !force) return;
    const d = S().design;
    const key = [CV.version - (CV._designOnlyBumps || 0), d.palette, d.fonts, d.photoShape, d.size].join('|');
    if (key === thumbsKey) return;
    thumbsKey = key;
    clearTimeout(refreshDesign._t);
    refreshDesign._t = setTimeout(() => {
      const n = CV.normalize(S());
      const base = n.isEmpty ? CV.sampleState() : S();
      CV.TEMPLATE_ORDER.forEach(id => {
        const host = document.querySelector(`[data-thumb="${id}"]`);
        if (!host) return;
        const design = Object.assign({}, d, { template: id, fonts: d.fonts === 'auto' ? 'auto' : d.fonts });
        CV.Thumbs.render(host, base, design, host.clientWidth || 160);
      });
    }, 150);
  }

  function bindDesign() {
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-tpl]');
      const p = e.target.closest('[data-pal]');
      const f = e.target.closest('[data-font]');
      if (!t && !p && !f) return;
      const d = S().design;
      if (t) { d.template = t.dataset.tpl; CV._designOnlyBumps = (CV._designOnlyBumps || 0) + 1; }
      if (p) d.palette = p.dataset.pal;
      if (f) d.fonts = f.dataset.font;
      CV.changed(); // (el cambio de plantilla no invalida las miniaturas: ver _designOnlyBumps)
      refreshDesign();
      if (t && window.matchMedia('(max-width: 1100px)').matches) CV.toast(`Diseño ${CV.TEMPLATES[d.template].name} seleccionado`);
    });
  }

  /* ══════════════ INICIO ══════════════ */
  function renderAll() {
    fillFields();
    renderRubros();
    renderPuestoSugg(); renderPerfilSugg(); renderSkillSugg(); renderDispSugg();
    Object.keys(LISTS).forEach(k => renderList(k, k === 'experiencia' || k === 'estudios' ? 0 : null));
    renderTags('habilidades'); renderTags('competencias');
    renderDesignControls();
    CV.Photo.refreshStep();
  }

  function init() {
    buildStepper();
    buildStepMenu();
    bindFields(); bindSegs(); bindRubros(); bindSuggestions(); bindTags(); bindLists(); bindDesign();
    $('btn-next').addEventListener('click', next);
    $('btn-back').addEventListener('click', back);
    renderAll();
    goTo(0, { noFocus: true });
  }

  return { init, goTo, next, back, renderAll, syncSegs, refreshDesign, currentStep: () => steps[cur] && steps[cur].id };
})();
