/* ══════════════════════════════════════════════════════════════
   CV Builder — Descargar, compartir, WhatsApp, mail e imprimir
══════════════════════════════════════════════════════════════ */
window.CV = window.CV || {};

CV.Export = (() => {
  const $ = id => document.getElementById(id);

  function busy(on, txt) {
    $('busy').hidden = !on;
    if (txt) $('busy-txt').textContent = txt;
  }

  function requireName() {
    const d = CV.normalize(CV.state);
    if (!d.firstName || !d.lastName) {
      CV.toast('Antes de descargar, completá tu nombre y apellido.', true);
      CV.App.openEditor();
      CV.Editor.goTo('datos');
      return false;
    }
    return true;
  }

  async function getFile() {
    busy(true, 'Generando tu PDF…');
    try {
      const bytes = await CV.Preview.getCurrentPdf();
      const name = CV.pdfFileName(CV.state);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      return { blob, name, file: typeof File === 'function' ? new File([blob], name, { type: 'application/pdf' }) : null };
    } finally {
      busy(false);
    }
  }

  function saveBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  async function download() {
    if (!requireName()) return;
    try {
      const { blob, name } = await getFile();
      saveBlob(blob, name);
      CV.toast(`Listo: se descargó ${name}`);
    } catch (e) {
      console.error(e);
      CV.toast('No se pudo generar el PDF. Revisá tu conexión e intentá de nuevo.', true);
    }
  }

  function canShareFiles() {
    try {
      const f = new File([new Blob(['x'], { type: 'application/pdf' })], 'test.pdf', { type: 'application/pdf' });
      return !!(navigator.canShare && navigator.canShare({ files: [f] }));
    } catch (e) { return false; }
  }

  async function share() {
    if (!requireName()) return;
    try {
      const { file, blob, name } = await getFile();
      const d = CV.normalize(CV.state);
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `CV ${d.name}`, text: `Curriculum Vitae de ${d.name}` });
      } else {
        saveBlob(blob, name);
        CV.toast('Tu navegador no permite compartir archivos: lo descargamos para que lo adjuntes.');
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return; // la persona cerró el menú de compartir
      console.error(e);
      CV.toast('No se pudo compartir. Probá con "Descargar PDF".', true);
    }
  }

  /** Normaliza números argentinos para wa.me (549 + característica + número) */
  function normalizeWa(raw) {
    let n = String(raw || '').replace(/\D/g, '');
    if (!n) return '';
    if (n.startsWith('00')) n = n.slice(2);
    if (n.startsWith('54')) {
      n = n.slice(2);
      if (n.startsWith('9')) n = n.slice(1);
    }
    if (n.startsWith('0')) n = n.slice(1);
    // quita el "15" después de la característica (ej: 11 15 2345 6789 → 11 2345 6789)
    if (n.length === 12) {
      for (const len of [2, 3, 4]) {
        if (n.slice(len, len + 2) === '15') { n = n.slice(0, len) + n.slice(len + 2); break; }
      }
    }
    if (n.length !== 10) return n.length >= 8 ? n : '';
    return '549' + n;
  }

  function showSend(o) {
    $('send-title').textContent = o.title;
    $('send-desc').innerHTML = o.desc;
    const box = $('send-actions');
    box.innerHTML = '';
    o.actions.forEach(a => {
      const b = document.createElement(a.href ? 'a' : 'button');
      b.className = 'btn btn-xl btn-block ' + (a.cls || 'btn-primary');
      b.innerHTML = a.html;
      if (a.href) { b.href = a.href; b.target = a.target || '_blank'; b.rel = 'noopener'; }
      b.addEventListener('click', () => { if (a.onClick) a.onClick(); setTimeout(closeSend, 400); });
      box.appendChild(b);
    });
    $('send-modal').hidden = false;
  }
  function closeSend() { $('send-modal').hidden = true; }

  async function sendWhatsApp(number) {
    if (!requireName()) return;
    let f;
    try { f = await getFile(); } catch (e) { CV.toast('No se pudo generar el PDF.', true); return; }
    const d = CV.normalize(CV.state);
    const msg = `Hola, les envío mi Curriculum Vitae.\n${d.name}${d.role ? ' — ' + d.role : ''}${d.contacts.find(c => c.icon === 'phone') ? '\nTel: ' + d.contacts.find(c => c.icon === 'phone').text : ''}`;
    const url = `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
    const shareable = f.file && canShareFiles();
    saveBlob(f.blob, f.name);
    const actions = [{
      html: '<svg class="i"><use href="#i-whatsapp"/></svg>Abrir el chat de WhatsApp', cls: 'btn-wa', href: url
    }];
    if (shareable) {
      actions.push({
        html: '<svg class="i"><use href="#i-share"/></svg>Compartir el PDF directamente', cls: 'btn-soft',
        onClick: () => navigator.share({ files: [f.file], title: f.name }).catch(() => {})
      });
    }
    showSend({
      title: 'Tu PDF ya se descargó',
      desc: `Guardamos <strong>${f.name}</strong> en tu dispositivo.<br>Ahora abrí el chat y <strong>adjuntá el archivo</strong> con el clip 📎.`,
      actions
    });
  }

  function waOther() {
    const inp = $('wa-number');
    const n = normalizeWa(inp.value);
    if (!n) {
      inp.classList.add('invalid'); inp.focus();
      CV.toast('Escribí un número de WhatsApp válido, con característica (ej: 11 2345-6789).', true);
      setTimeout(() => inp.classList.remove('invalid'), 2500);
      return;
    }
    sendWhatsApp(n);
  }

  async function mail() {
    if (!requireName()) return;
    const inp = $('mail-to');
    const to = CV.cleanEmail(inp.value);
    if (to && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) {
      inp.classList.add('invalid'); inp.focus();
      CV.toast('Revisá la dirección de mail.', true);
      setTimeout(() => inp.classList.remove('invalid'), 2500);
      return;
    }
    let f;
    try { f = await getFile(); } catch (e) { CV.toast('No se pudo generar el PDF.', true); return; }
    saveBlob(f.blob, f.name);
    const d = CV.normalize(CV.state);
    const subj = `Curriculum Vitae — ${d.name}${d.role ? ' (' + d.role + ')' : ''}`;
    const body = `Hola, ¿cómo están?\n\nLes escribo para postularme${d.role ? ' como ' + d.role.toLowerCase() : ''}. Adjunto mi Curriculum Vitae en PDF.\n\nQuedo a disposición por cualquier consulta.\n\nSaludos cordiales,\n${d.name}${d.contacts.find(c => c.icon === 'phone') ? '\nTel: ' + d.contacts.find(c => c.icon === 'phone').text : ''}`;
    showSend({
      title: 'Tu PDF ya se descargó',
      desc: `Guardamos <strong>${f.name}</strong>. Al abrir tu correo, <strong>adjuntá el archivo</strong> antes de enviarlo.`,
      actions: [{ html: '<svg class="i"><use href="#i-mail"/></svg>Abrir mi correo', href: `mailto:${to}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`, target: '_self' }]
    });
  }

  async function print() {
    if (!requireName()) return;
    const w = window.open('', '_blank');
    try {
      const { blob } = await getFile();
      const url = URL.createObjectURL(blob);
      if (w) { w.location.href = url; }
      else { window.location.href = url; }
      setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch (e) {
      if (w) w.close();
      CV.toast('No se pudo abrir el PDF para imprimir.', true);
    }
  }

  function init() {
    if (canShareFiles()) $('btn-share').hidden = false;
    $('send-modal').addEventListener('click', e => { if (e.target.id === 'send-modal') closeSend(); });
    $('wa-number').addEventListener('keydown', e => { if (e.key === 'Enter') waOther(); });
    $('mail-to').addEventListener('keydown', e => { if (e.key === 'Enter') mail(); });
  }

  return { init, download, share, waOther, mail, print, closeSend, normalizeWa };
})();
