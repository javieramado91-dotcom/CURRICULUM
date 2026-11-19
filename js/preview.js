/* ══════════════════════════════════════════════════════════════
   CV Builder — Vista previa en vivo y miniaturas
   La vista previa muestra EL MISMO PDF que se descarga
   (renderizado con pdf.js), así lo que se ve es lo que se obtiene.
══════════════════════════════════════════════════════════════ */
window.CV = window.CV || {};

CV.version = 0;          // se incrementa con cada cambio de datos/diseño
CV.lastPdf = null;       // { version, bytes, pages }

CV.Preview = (() => {
  let timer = null;
  let token = 0;
  let rendering = false;
  let pending = false;
  let lastWidth = 0;
  const $ = id => document.getElementById(id);

  function setBadge(text, cls) {
    const b = $('pv-badge');
    if (!b) return;
    b.textContent = text;
    b.className = 'pv-badge' + (cls ? ' ' + cls : '');
  }

  function schedule(delay = 380) {
    clearTimeout(timer);
    timer = setTimeout(run, delay);
  }

  function isVisible() {
    const pane = $('preview-pane');
    if (!pane) return false;
    if (window.matchMedia('(max-width: 1100px)').matches) return pane.classList.contains('open');
    return !$('editor').hidden;
  }

  async function run() {
    if (rendering) { pending = true; return; }
    rendering = true; pending = false;
    const my = ++token;
    const ver = CV.version;
    setBadge('Actualizando…', 'busy');
    try {
      const bytes = await CV.generatePdf(CV.state);
      if (my !== token) return;
      CV.lastPdf = { version: ver, bytes, pages: null };
      if (isVisible()) await paint(bytes, my);
      else CV.lastPdf.pages = await countPages(bytes);
      updateInfo();
    } catch (e) {
      console.error(e);
      setBadge('Error al generar', 'warn');
      if (String(e.message || e).includes('cargar')) CV.toast('No se pudo cargar el generador de PDF. Revisá tu conexión a internet.', true);
    } finally {
      rendering = false;
      if (pending || CV.version !== ver) schedule(60);
    }
  }

  async function countPages(bytes) {
    const doc = await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
    const n = doc.numPages;
    doc.destroy();
    return n;
  }

  /** Dibuja todas las páginas en canvas nuevos y recién al final reemplaza los viejos (sin parpadeo) */
  async function paint(bytes, my) {
    const host = $('pv-pages');
    const scroller = $('pv-scroll');
    const doc = await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
    if (my !== token) { doc.destroy(); return; }
    const avail = Math.max(260, scroller.clientWidth - (window.innerWidth <= 640 ? 24 : 52));
    const cssW = Math.min(avail, 820);
    lastWidth = scroller.clientWidth;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const frag = document.createDocumentFragment();
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const base = page.getViewport({ scale: 1 });
      const scale = (cssW / base.width) * dpr;
      const vp = page.getViewport({ scale });
      const wrap = document.createElement('div');
      wrap.className = 'pv-page';
      wrap.style.width = cssW + 'px';
      wrap.style.height = (cssW * base.height / base.width) + 'px';
      const cv = document.createElement('canvas');
      cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
      wrap.appendChild(cv);
      if (doc.numPages > 1) {
        const n = document.createElement('span');
        n.className = 'pv-page-num'; n.textContent = `Hoja ${p} de ${doc.numPages}`;
        wrap.appendChild(n);
      }
      await page.render({ canvasContext: cv.getContext('2d'), viewport: vp, intent: 'print' }).promise;
      if (my !== token) { doc.destroy(); return; }
      frag.appendChild(wrap);
    }
    CV.lastPdf.pages = doc.numPages;
    doc.destroy();
    host.replaceChildren(frag);
  }

  function updateInfo() {
    const n = CV.lastPdf && CV.lastPdf.pages;
    if (!n) { setBadge(''); return; }
    setBadge(n === 1 ? '1 hoja A4' : `${n} hojas A4`, n > 2 ? 'warn' : '');
    const warn = $('pv-warn');
    if (!warn) return;
    const d = CV.state.design;
    if (n > 1) {
      const tips = [];
      if (d.size !== 'compacto') tips.push('<button data-quick="size">usar letra compacta</button>');
      if (d.template !== 'compacto') tips.push('<button data-quick="tpl">probar el diseño Compacto</button>');
      warn.innerHTML = `<svg class="i"><use href="#i-info"/></svg><span>Tu CV ocupa <strong>${n} hojas</strong>. Está bien si tenés mucha experiencia; si preferís que entre en una sola, podés ${tips.join(' o ') || 'resumir algunas tareas'}.</span>`;
      warn.hidden = false;
    } else {
      warn.hidden = true;
    }
    const sum = $('export-summary');
    if (sum) {
      const tpl = CV.TEMPLATES[d.template];
      sum.textContent = `Diseño ${tpl ? tpl.name : ''} · ${n === 1 ? '1 hoja' : n + ' hojas'} A4 · Descargalo o envialo directamente.`;
    }
  }

  /** Repinta si cambió el ancho disponible (rotar el celular, achicar la ventana) */
  function onResize() {
    const sc = $('pv-scroll');
    if (!sc || !CV.lastPdf || !isVisible()) return;
    if (Math.abs(sc.clientWidth - lastWidth) > 30) {
      const my = ++token;
      paint(CV.lastPdf.bytes, my).catch(() => {});
    }
  }
  let rz;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(onResize, 200); });

  /** Pinta el último PDF al abrir el panel en el celular */
  async function showNow() {
    if (CV.lastPdf && CV.lastPdf.version === CV.version) {
      const my = ++token;
      await paint(CV.lastPdf.bytes, my);
      updateInfo();
    } else {
      schedule(0);
    }
  }

  /** Devuelve el PDF actualizado (reutiliza el de la vista previa si no hubo cambios) */
  async function getCurrentPdf() {
    if (CV.lastPdf && CV.lastPdf.version === CV.version) return CV.lastPdf.bytes;
    const ver = CV.version;
    const bytes = await CV.generatePdf(CV.state);
    CV.lastPdf = { version: ver, bytes, pages: CV.lastPdf ? CV.lastPdf.pages : null };
    return bytes;
  }

  return { schedule, run, showNow, getCurrentPdf, updateInfo };
})();

/* ── Miniaturas (portada y selector de plantillas) ───────────── */
CV.Thumbs = (() => {
  const queue = [];
  let busy = false;

  /** Renderiza la página 1 de un estado+diseño en el contenedor indicado */
  function render(host, state, design, cssWidth) {
    return new Promise((resolve) => {
      queue.push({ host, state, design, cssWidth, resolve });
      pump();
    });
  }

  async function pump() {
    if (busy || !queue.length) return;
    busy = true;
    const job = queue.shift();
    try {
      const bytes = await CV.generatePdf(job.state, job.design);
      const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
      const page = await doc.getPage(1);
      const base = page.getViewport({ scale: 1 });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = job.cssWidth || job.host.clientWidth || 200;
      const vp = page.getViewport({ scale: (w / base.width) * dpr * 1.15 });
      const cv = document.createElement('canvas');
      cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
      await page.render({ canvasContext: cv.getContext('2d'), viewport: vp, intent: 'print' }).promise;
      doc.destroy();
      job.host.replaceChildren(cv);
    } catch (e) {
      console.warn('Miniatura', e);
    }
    job.resolve();
    busy = false;
    // cede el hilo para que la interfaz siga fluida
    setTimeout(pump, 16);
  }

  return { render };
})();

CV.changed = () => {
  CV.version++;
  CV.Preview.schedule();
};
