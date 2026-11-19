/* ══════════════════════════════════════════════════════════════
   CV Builder — Arranque, portada y acciones globales
══════════════════════════════════════════════════════════════ */
window.CV = window.CV || {};

(() => {
  const $ = id => document.getElementById(id);

  /* ── Avisos breves ───────────────────────────────────────── */
  let toastT;
  CV.toast = (msg, err) => {
    const t = $('toast');
    t.textContent = msg;
    t.classList.toggle('err', !!err);
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), err ? 4200 : 2800);
  };

  /* ── Navegación portada ↔ editor ─────────────────────────── */
  let editorReady = false;
  function openEditor() {
    if (!editorReady) { CV.Editor.init(); CV.Export.init(); CV.Photo.init(); editorReady = true; }
    $('landing').hidden = true;
    $('editor').hidden = false;
    document.title = 'Editando tu CV — CV Builder';
    CV.Preview.schedule(0);
  }
  function openLanding() {
    $('editor').hidden = true;
    $('landing').hidden = false;
    document.title = 'CV Builder — Creá tu currículum profesional gratis';
    window.scrollTo(0, 0);
  }

  /* ── Vista previa en celular (panel que sube desde abajo) ── */
  function openPreview() {
    $('preview-pane').classList.add('open');
    document.body.style.overflow = 'hidden';
    try { history.pushState({ pv: 1 }, ''); } catch (e) { /* file:// */ }
    CV.Preview.showNow();
  }
  function closePreview(fromPop) {
    if (!$('preview-pane').classList.contains('open')) return;
    $('preview-pane').classList.remove('open');
    document.body.style.overflow = '';
    if (!fromPop) { try { if (history.state && history.state.pv) history.back(); } catch (e) { /* */ } }
  }
  window.addEventListener('popstate', () => closePreview(true));

  CV.App = { openEditor, openLanding, openPreview, closePreview };

  /* ── Acciones con data-action / data-goto ────────────────── */
  const ACTIONS = {
    'start': () => { openEditor(); CV.Editor.goTo('datos'); },
    'home': () => openLanding(),
    'download': () => CV.Export.download(),
    'share': () => CV.Export.share(),
    'wa-other': () => CV.Export.waOther(),
    'mail': () => CV.Export.mail(),
    'print': () => CV.Export.print(),
    'crop-photo': () => CV.Photo.recrop(),
    'change-photo': () => CV.Photo.pick(),
    'remove-photo': () => CV.Photo.remove(),
    'crop-cancel': () => CV.Photo.close(),
    'crop-apply': () => CV.Photo.apply(),
    'crop-rotate': () => CV.Photo.rotate(),
    'open-preview': () => openPreview(),
    'close-preview': () => closePreview(),
    'send-close': () => CV.Export.closeSend()
  };

  document.addEventListener('click', e => {
    const a = e.target.closest('[data-action]');
    if (a && ACTIONS[a.dataset.action]) { e.preventDefault(); ACTIONS[a.dataset.action](a); return; }
    const g = e.target.closest('[data-goto]');
    if (g) {
      e.preventDefault();
      openEditor();
      closePreview();
      CV.Editor.goTo(g.dataset.goto);
      return;
    }
    const q = e.target.closest('[data-quick]');
    if (q) {
      if (q.dataset.quick === 'size') CV.state.design.size = 'compacto';
      if (q.dataset.quick === 'tpl') { CV.state.design.template = 'compacto'; CV._designOnlyBumps = (CV._designOnlyBumps || 0) + 1; }
      CV.Editor.syncSegs();
      CV.changed();
      CV.Editor.refreshDesign();
      return;
    }
    const tc = e.target.closest('[data-start-tpl]');
    if (tc) {
      CV.state.design.template = tc.dataset.startTpl;
      openEditor();
      CV.Editor.goTo('datos');
      CV.toast(`Elegiste el diseño ${CV.TEMPLATES[tc.dataset.startTpl].name}. Lo podés cambiar cuando quieras.`);
    }
  });

  /* ── Portada: miniaturas reales generadas con datos de ejemplo ── */
  async function renderLanding() {
    const sample = CV.sampleState();
    // foto de ejemplo dibujada (silueta), para que se vea el lugar de la foto
    sample.foto = { out: samplePhoto() };
    const heroDesigns = [
      { host: '.hv-1', design: { template: 'creativo', palette: 'petroleo', fonts: 'auto', photoShape: 'circle', size: 'normal' } },
      { host: '.hv-2', design: { template: 'profesional', palette: 'bordo', fonts: 'auto', photoShape: 'circle', size: 'normal' } },
      { host: '.hv-3', design: { template: 'moderno', palette: 'marino', fonts: 'auto', photoShape: 'circle', size: 'normal' } }
    ];
    const show = $('tpl-showcase');
    const palettes = { moderno: 'marino', ejecutivo: 'grafito', minimalista: 'azul', creativo: 'esmeralda', profesional: 'bordo', elegante: 'mostaza', compacto: 'violeta' };
    show.innerHTML = CV.TEMPLATE_ORDER.map(id => {
      const t = CV.TEMPLATES[id];
      return `<button class="tpl-show" data-start-tpl="${id}"><span class="tpl-thumb" data-show="${id}"><span class="skeleton"></span></span><strong>${t.name}</strong><span>${t.desc}</span></button>`;
    }).join('');
    try {
      await CV.ensurePdfLibs();
    } catch (e) {
      console.warn(e);
      return;
    }
    for (const h of heroDesigns) {
      const host = document.querySelector(h.host);
      if (host) await CV.Thumbs.render(host, sample, h.design, host.clientWidth || 300);
    }
    for (const id of CV.TEMPLATE_ORDER) {
      const host = document.querySelector(`[data-show="${id}"]`);
      if (host) CV.Thumbs.render(host, sample, { template: id, palette: palettes[id], fonts: 'auto', photoShape: 'circle', size: 'normal' }, host.clientWidth || 200);
    }
  }

  function samplePhoto() {
    const c = document.createElement('canvas');
    c.width = c.height = 400;
    const g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 0, 400);
    bg.addColorStop(0, '#DCE3EE'); bg.addColorStop(1, '#C3CDDD');
    g.fillStyle = bg; g.fillRect(0, 0, 400, 400);
    g.fillStyle = '#8A97AD';
    g.beginPath(); g.arc(200, 165, 78, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(200, 420, 150, 150, 0, Math.PI, 0); g.fill();
    return c.toDataURL('image/jpeg', 0.9);
  }

  /* ── Aviso antes de cerrar si hay datos cargados ─────────── */
  window.addEventListener('beforeunload', e => {
    if (CV.clean(CV.state.nombre) || CV.clean(CV.state.apellido) || CV.state.foto) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  /* ── Arranque ───────────────────────────────────────────── */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderLanding);
  else renderLanding();
})();
