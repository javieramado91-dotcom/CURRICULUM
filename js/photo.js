/* ══════════════════════════════════════════════════════════════
   CV Builder — Carga y recorte de foto (sin librerías)
   Arrastrar para mover, rueda / pellizco / control para el zoom,
   botón para girar. Resultado: JPEG cuadrado de 800×800.
══════════════════════════════════════════════════════════════ */
window.CV = window.CV || {};

CV.Photo = (() => {
  const $ = id => document.getElementById(id);
  const VIEW = 600, OUT = 800;
  let img = null, rot = 0, zoom = 1, ox = 0, oy = 0;
  let originalUrl = null;
  const pointers = new Map();
  let pinchStart = null;

  function loadImage(src) {
    return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  }

  /** Reduce fotos enormes (cámaras de 12+ MP) para no saturar la memoria del celular */
  async function downscale(dataUrl, max = 1600) {
    const im = await loadImage(dataUrl);
    const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
    if (k >= 1 && dataUrl.startsWith('data:image/jpeg')) return dataUrl;
    const c = document.createElement('canvas');
    c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    g.imageSmoothingQuality = 'high';
    g.drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.92);
  }

  function rotatedSize() {
    const r = rot % 180 !== 0;
    return { w: r ? img.naturalHeight : img.naturalWidth, h: r ? img.naturalWidth : img.naturalHeight };
  }
  function baseScale(size) {
    const { w, h } = rotatedSize();
    return size / Math.min(w, h);
  }
  function clamp() {
    const { w, h } = rotatedSize();
    const s = baseScale(VIEW) * zoom;
    const mx = Math.max(0, (w * s - VIEW) / 2), my = Math.max(0, (h * s - VIEW) / 2);
    ox = Math.max(-mx, Math.min(mx, ox));
    oy = Math.max(-my, Math.min(my, oy));
  }

  function draw(ctx, size) {
    const k = size / VIEW;
    const s = baseScale(size) * zoom;
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.translate(size / 2 + ox * k, size / 2 + oy * k);
    ctx.rotate(rot * Math.PI / 180);
    ctx.scale(s, s);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();
  }

  function redraw() {
    clamp();
    draw($('crop-canvas').getContext('2d'), VIEW);
    $('crop-zoom').value = zoom;
  }

  async function open(src, crop) {
    img = await loadImage(src);
    originalUrl = src;
    if (crop) { rot = crop.rot || 0; zoom = crop.zoom || 1; ox = crop.x || 0; oy = crop.y || 0; }
    else {
      rot = 0; zoom = 1; ox = 0;
      // en fotos verticales, arrancamos un poco más arriba (donde suele estar la cara)
      const { w, h } = rotatedSize();
      const s = baseScale(VIEW);
      oy = h > w ? ((h * s - VIEW) / 2) * 0.45 : 0;
    }
    $('crop-modal').hidden = false;
    redraw();
  }

  function close() { $('crop-modal').hidden = true; pointers.clear(); pinchStart = null; }

  function apply() {
    const c = document.createElement('canvas');
    c.width = c.height = OUT;
    draw(c.getContext('2d'), OUT);
    const out = c.toDataURL('image/jpeg', 0.9);
    CV.state.foto = { original: originalUrl, out, crop: { zoom, x: ox, y: oy, rot } };
    close();
    refreshStep();
    CV.changed();
  }

  function refreshStep() {
    const f = CV.state.foto;
    const zone = $('photo-zone'), circle = $('photo-circle');
    if (f && f.out) {
      circle.style.backgroundImage = `url(${f.out})`;
      zone.classList.add('has');
      $('photo-title').textContent = '¡Foto lista!';
      $('photo-sub').textContent = 'Podés encuadrarla de nuevo o cambiarla cuando quieras.';
      $('photo-actions').hidden = false;
      if (CV.state.design.photoShape === 'none') { CV.state.design.photoShape = 'circle'; CV.Editor && CV.Editor.syncSegs(); }
    } else {
      circle.style.backgroundImage = '';
      zone.classList.remove('has');
      $('photo-title').textContent = 'Subir una foto';
      $('photo-sub').textContent = 'Tocá acá o arrastrá una imagen · JPG, PNG o WEBP';
      $('photo-actions').hidden = true;
    }
  }

  async function handleFile(file) {
    if (!file) return;
    if (!/^image\//.test(file.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
      CV.toast('Ese archivo no es una imagen. Elegí una foto JPG o PNG.', true);
      return;
    }
    if (file.size > 25 * 1024 * 1024) { CV.toast('La imagen es muy pesada (máx. 25 MB).', true); return; }
    const raw = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
    try {
      const small = await downscale(raw);
      await open(small, null);
    } catch (e) {
      console.error(e);
      CV.toast('No pudimos abrir esa imagen. Probá con otra foto (JPG o PNG).', true);
    }
  }

  function init() {
    const zone = $('photo-zone'), input = $('photo-input');
    zone.addEventListener('click', () => input.click());
    zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
    input.addEventListener('change', () => { handleFile(input.files[0]); input.value = ''; });
    ['dragenter', 'dragover'].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.remove('drag'); }));
    zone.addEventListener('drop', e => handleFile(e.dataTransfer.files[0]));

    const stage = $('crop-stage');
    const toView = () => VIEW / stage.getBoundingClientRect().width;
    stage.addEventListener('pointerdown', e => {
      stage.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchStart = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom };
      }
    });
    stage.addEventListener('pointermove', e => {
      if (!pointers.has(e.pointerId)) return;
      const prev = pointers.get(e.pointerId);
      const cur = { x: e.clientX, y: e.clientY };
      pointers.set(e.pointerId, cur);
      if (pointers.size === 2 && pinchStart) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        zoom = Math.max(1, Math.min(4, pinchStart.zoom * d / pinchStart.d));
      } else if (pointers.size === 1) {
        const k = toView();
        ox += (cur.x - prev.x) * k;
        oy += (cur.y - prev.y) * k;
      }
      redraw();
    });
    const up = e => { pointers.delete(e.pointerId); if (pointers.size < 2) pinchStart = null; };
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    stage.addEventListener('wheel', e => {
      e.preventDefault();
      zoom = Math.max(1, Math.min(4, zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08)));
      redraw();
    }, { passive: false });
    $('crop-zoom').addEventListener('input', e => { zoom = parseFloat(e.target.value); redraw(); });

    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('crop-modal').hidden) close(); });
  }

  return {
    init, refreshStep, apply, close,
    pick: () => $('photo-input').click(),
    rotate: () => { rot = (rot + 90) % 360; ox = 0; oy = 0; redraw(); },
    recrop: () => { const f = CV.state.foto; if (f && f.original) open(f.original, f.crop); },
    remove: () => { CV.state.foto = null; refreshStep(); CV.changed(); }
  };
})();
