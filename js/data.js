/* ══════════════════════════════════════════════════════════════
   CV Builder — Modelo de datos y normalización
   Todo el estado del CV vive en CV.state. Las plantillas PDF no
   leen el estado crudo: reciben CV.normalize(state), que ya trae
   los textos limpios, los períodos formateados y las listas filtradas.
══════════════════════════════════════════════════════════════ */
window.CV = window.CV || {};

CV.MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
CV.MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

CV.NIVELES_IDIOMA = [
  { value: 'Básico', score: 2 },
  { value: 'Intermedio', score: 3 },
  { value: 'Avanzado', score: 4 },
  { value: 'Bilingüe / Nativo', score: 5 }
];

CV.ESTADOS_ESTUDIO = ['Completo', 'En curso', 'Incompleto', 'Abandonado'];

CV.LICENCIAS = [
  { value: 'A', label: 'A — Motos y ciclomotores' },
  { value: 'B', label: 'B — Autos y camionetas' },
  { value: 'C', label: 'C — Camiones sin acoplado' },
  { value: 'D', label: 'D — Transporte de pasajeros' },
  { value: 'E', label: 'E — Camiones con acoplado' },
  { value: 'F', label: 'F — Vehículos adaptados' },
  { value: 'G', label: 'G — Maquinaria agrícola' }
];

CV.newExperiencia = () => ({ puesto: '', empresa: '', lugar: '', desdeM: '', desdeA: '', hastaM: '', hastaA: '', actual: false, tareas: '' });
CV.newEstudio = () => ({ titulo: '', inst: '', estado: '', desde: '', hasta: '' });
CV.newCurso = () => ({ nombre: '', inst: '', anio: '', horas: '' });
CV.newIdioma = () => ({ nombre: '', nivel: 'Intermedio', detalle: '' });
CV.newReferencia = () => ({ nombre: '', relacion: '', tel: '' });

CV.createState = () => ({
  rubro: '',
  nombre: '', apellido: '', puesto: '',
  foto: null, // { original, out, crop:{zoom,x,y,rot} }
  contacto: { tel: '', email: '', dir: '', web: '' },
  personal: {
    fnac: '', mostrarEdad: true, nacionalidad: '', dni: '', cuil: '', ecivil: '',
    hijos: '', hijosN: 1, lic: '', licCat: [], movilidad: false
  },
  perfil: '',
  experiencia: [CV.newExperiencia()],
  estudios: [CV.newEstudio()],
  cursos: [],
  habilidades: [],
  competencias: [],
  idiomas: [],
  extras: { disponibilidad: '', referencias: [], adicional: '' },
  design: { template: 'moderno', palette: 'marino', fonts: 'auto', photoShape: 'circle', size: 'normal' }
});

CV.state = CV.createState();

/* ── Helpers de texto ─────────────────────────────────────────── */
CV.clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
CV.cleanMultiline = s => String(s == null ? '' : s).replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean);

/** Convierte "fulano@MAIL.com " → "fulano@mail.com" sin tocar otras cosas */
CV.cleanEmail = s => CV.clean(s).replace(/\s/g, '').toLowerCase();

/** Quita https://, www. y la barra final de una URL para mostrarla prolija */
CV.prettyUrl = s => CV.clean(s).replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
CV.fullUrl = s => {
  const v = CV.clean(s);
  if (!v) return '';
  return /^https?:\/\//i.test(v) ? v : 'https://' + v.replace(/^\/+/, '');
};

/** Capitaliza nombres propios respetando partículas ("de", "del", "la") */
CV.titleCase = s => {
  const small = ['de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'do', 'dos', 'van', 'von'];
  return CV.clean(s).toLowerCase().split(' ').map((w, i) => {
    if (i > 0 && small.includes(w)) return w;
    return w.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('-');
  }).join(' ');
};

/** Si el texto viene TODO EN MAYÚSCULAS o todo en minúsculas, lo normaliza */
CV.smartName = s => {
  const v = CV.clean(s);
  if (!v) return '';
  if (v === v.toUpperCase() || v === v.toLowerCase()) return CV.titleCase(v);
  return v;
};

/** Primera letra en mayúscula y punto final si es una oración */
CV.sentence = s => {
  let v = CV.clean(s);
  if (!v) return '';
  v = v.charAt(0).toUpperCase() + v.slice(1);
  return v;
};

CV.formatPeriodo = (dm, da, hm, ha, actual) => {
  const part = (m, a) => {
    if (!a) return '';
    const mi = parseInt(m, 10);
    return (mi >= 1 && mi <= 12 ? CV.MESES[mi - 1] + ' ' : '') + a;
  };
  const desde = part(dm, da);
  const hasta = actual ? 'Actualidad' : part(hm, ha);
  if (desde && hasta) return desde === hasta ? desde : `${desde} – ${hasta}`;
  if (desde) return actual ? `${desde} – Actualidad` : desde;
  if (hasta) return hasta;
  return '';
};

CV.formatAnios = (desde, hasta, estado) => {
  const d = CV.clean(desde), h = CV.clean(hasta);
  if (d && h) return d === h ? d : `${d} – ${h}`;
  if (d && estado === 'En curso') return `${d} – Actualidad`;
  return d || h || '';
};

/** Acepta DD/MM/AAAA, D-M-AA, AAAA-MM-DD; devuelve {d,m,a} o null */
CV.parseFecha = s => {
  const v = CV.clean(s);
  let m = v.match(/^(\d{1,2})[\/\-. ](\d{1,2})[\/\-. ](\d{2,4})$/);
  if (m) {
    let a = parseInt(m[3], 10);
    if (a < 100) a += a > (new Date().getFullYear() % 100) ? 1900 : 2000;
    return { d: parseInt(m[1], 10), m: parseInt(m[2], 10), a };
  }
  m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return { d: parseInt(m[3], 10), m: parseInt(m[2], 10), a: parseInt(m[1], 10) };
  return null;
};

CV.edad = f => {
  if (!f) return null;
  const hoy = new Date();
  let e = hoy.getFullYear() - f.a;
  if (hoy.getMonth() + 1 < f.m || (hoy.getMonth() + 1 === f.m && hoy.getDate() < f.d)) e--;
  return e > 0 && e < 110 ? e : null;
};

CV.formatFechaNac = (s, mostrarEdad) => {
  const f = CV.parseFecha(s);
  if (!f) return CV.clean(s);
  const txt = `${String(f.d).padStart(2, '0')}/${String(f.m).padStart(2, '0')}/${f.a}`;
  const e = mostrarEdad ? CV.edad(f) : null;
  return e ? `${txt} (${e} años)` : txt;
};

/** Formatea un DNI argentino con puntos: 35123456 → 35.123.456 */
CV.formatDni = s => {
  const v = CV.clean(s);
  const digits = v.replace(/\D/g, '');
  if (digits.length >= 7 && digits.length <= 8 && /^[\d.\s]+$/.test(v)) {
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  return v;
};

/** Formatea un CUIL: 27351234569 → 27-35123456-9 */
CV.formatCuil = s => {
  const v = CV.clean(s);
  const digits = v.replace(/\D/g, '');
  if (digits.length === 11) return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
  return v;
};

CV.nivelScore = nivel => (CV.NIVELES_IDIOMA.find(n => n.value === nivel) || { score: 3 }).score;

/* ══════════════════════════════════════════════════════════════
   NORMALIZE — lo que reciben las plantillas
══════════════════════════════════════════════════════════════ */
CV.normalize = (st) => {
  const s = st || CV.state;
  const nombre = CV.smartName(s.nombre);
  const apellido = CV.smartName(s.apellido);
  const c = s.contacto, p = s.personal;

  const contacts = [];
  if (CV.clean(c.tel)) contacts.push({ icon: 'phone', text: CV.clean(c.tel), link: 'tel:' + CV.clean(c.tel).replace(/[^\d+]/g, '') });
  if (CV.clean(c.email)) contacts.push({ icon: 'mail', text: CV.cleanEmail(c.email), link: 'mailto:' + CV.cleanEmail(c.email) });
  if (CV.clean(c.dir)) contacts.push({ icon: 'pin', text: CV.clean(c.dir) });
  if (CV.clean(c.web)) contacts.push({ icon: 'link', text: CV.prettyUrl(c.web), link: CV.fullUrl(c.web) });

  const personal = [];
  if (CV.clean(p.fnac)) personal.push({ icon: 'cake', label: 'Nacimiento', value: CV.formatFechaNac(p.fnac, p.mostrarEdad) });
  if (CV.clean(p.nacionalidad)) personal.push({ icon: 'flag', label: 'Nacionalidad', value: CV.sentence(p.nacionalidad) });
  if (CV.clean(p.dni)) personal.push({ icon: 'id', label: 'DNI', value: CV.formatDni(p.dni) });
  if (CV.clean(p.cuil)) personal.push({ icon: 'id', label: 'CUIL', value: CV.formatCuil(p.cuil) });
  if (CV.clean(p.ecivil)) personal.push({ icon: 'heart', label: 'Estado civil', value: CV.sentence(p.ecivil) });
  if (p.hijos === 'no') personal.push({ icon: 'child', label: 'Hijos', value: 'Sin hijos' });
  if (p.hijos === 'si') {
    const n = Math.max(1, parseInt(p.hijosN, 10) || 1);
    personal.push({ icon: 'child', label: 'Hijos', value: `${n} ${n === 1 ? 'hijo' : 'hijos'}` });
  }
  if (p.lic === 'si') {
    const cats = (p.licCat || []).slice().sort();
    personal.push({ icon: 'car', label: 'Licencia', value: cats.length ? `Categoría ${cats.join(', ')}` : 'Sí posee' });
  } else if (p.lic === 'no') {
    personal.push({ icon: 'car', label: 'Licencia', value: 'No posee' });
  }
  if (p.movilidad) personal.push({ icon: 'car', label: 'Movilidad', value: 'Movilidad propia' });

  const exp = (s.experiencia || []).map(e => ({
    title: CV.sentence(e.puesto),
    company: CV.clean(e.empresa),
    place: CV.clean(e.lugar),
    period: CV.formatPeriodo(e.desdeM, e.desdeA, e.hastaM, e.hastaA, e.actual),
    bullets: CV.cleanMultiline(e.tareas).map(l => CV.sentence(l.replace(/^[-•*·▪●]\s*/, '')))
  })).filter(e => e.title || e.company || e.bullets.length);

  const edu = (s.estudios || []).map(e => ({
    title: CV.sentence(e.titulo),
    inst: CV.clean(e.inst),
    estado: CV.clean(e.estado),
    period: CV.formatAnios(e.desde, e.hasta, e.estado)
  })).filter(e => e.title || e.inst);

  const cursos = (s.cursos || []).map(e => ({
    title: CV.sentence(e.nombre),
    inst: CV.clean(e.inst),
    year: CV.clean(e.anio),
    hours: CV.clean(e.horas) ? CV.clean(e.horas).replace(/\s*(hs?|horas)\.?$/i, '') + ' hs' : ''
  })).filter(e => e.title);

  const langs = (s.idiomas || []).map(l => ({
    name: CV.sentence(l.nombre),
    level: l.nivel,
    detail: CV.clean(l.detalle),
    score: CV.nivelScore(l.nivel)
  })).filter(l => l.name);

  const refs = (s.extras.referencias || []).map(r => ({
    name: CV.smartName(r.nombre), rel: CV.clean(r.relacion), tel: CV.clean(r.tel)
  })).filter(r => r.name);

  const uniq = arr => [...new Set(arr.map(CV.sentence).filter(Boolean))];

  return {
    firstName: nombre,
    lastName: apellido,
    name: [nombre, apellido].filter(Boolean).join(' '),
    role: CV.sentence(s.puesto),
    photo: s.foto && s.foto.out ? s.foto.out : null,
    contacts,
    personal,
    perfil: CV.cleanMultiline(s.perfil).join('\n'),
    exp, edu, cursos,
    skills: uniq(s.habilidades || []),
    soft: uniq(s.competencias || []),
    langs,
    disponibilidad: CV.sentence(s.extras.disponibilidad),
    refs,
    adicional: CV.cleanMultiline(s.extras.adicional).join('\n'),
    isEmpty: !nombre && !apellido
  };
};

/* ══════════════════════════════════════════════════════════════
   DATOS DE EJEMPLO — se usan en la portada y en las miniaturas
   mientras la persona todavía no cargó su nombre.
══════════════════════════════════════════════════════════════ */
CV.sampleState = () => {
  const s = CV.createState();
  Object.assign(s, {
    rubro: 'administracion',
    nombre: 'Lucía', apellido: 'Fernández', puesto: 'Asistente administrativa',
    contacto: { tel: '11 2345-6789', email: 'lucia.fernandez@mail.com', dir: 'Villa Urquiza, CABA', web: 'linkedin.com/in/luciafernandez' },
    perfil: 'Asistente administrativa con 6 años de experiencia en facturación, atención a proveedores y gestión documental. Me destaco por la organización, la atención al detalle y el manejo avanzado de Excel. Busco sumarme a un equipo donde pueda aportar orden y eficiencia a los procesos.',
    experiencia: [
      { puesto: 'Asistente administrativa', empresa: 'Distribuidora del Sur S.A.', lugar: 'CABA', desdeM: '3', desdeA: '2021', hastaM: '', hastaA: '', actual: true,
        tareas: 'Emisión y control de facturas y notas de crédito\nConciliaciones bancarias semanales\nAtención telefónica y por mail a clientes y proveedores\nArchivo y digitalización de documentación' },
      { puesto: 'Recepcionista', empresa: 'Consultorios Médicos Belgrano', lugar: 'CABA', desdeM: '2', desdeA: '2018', hastaM: '2', hastaA: '2021', actual: false,
        tareas: 'Gestión de agenda de turnos para 8 profesionales\nCobro de consultas y cierre de caja diario' }
    ],
    estudios: [
      { titulo: 'Técnica Superior en Administración', inst: 'Instituto Superior de Comercio', estado: 'Completo', desde: '2016', hasta: '2019' },
      { titulo: 'Bachiller en Economía y Gestión', inst: 'Escuela Media N.º 4', estado: 'Completo', desde: '2010', hasta: '2015' }
    ],
    cursos: [
      { nombre: 'Excel avanzado y tablas dinámicas', inst: 'Fundación Capacitar', anio: '2022', horas: '40' },
      { nombre: 'Liquidación de sueldos', inst: 'Centro de Formación Profesional', anio: '2020', horas: '' }
    ],
    habilidades: ['Excel avanzado', 'Facturación electrónica', 'Tango Gestión', 'Google Workspace'],
    competencias: ['Organización', 'Trabajo en equipo', 'Atención al detalle'],
    idiomas: [{ nombre: 'Español', nivel: 'Bilingüe / Nativo', detalle: '' }, { nombre: 'Inglés', nivel: 'Intermedio', detalle: 'B1' }]
  });
  s.personal = Object.assign(s.personal, { fnac: '14/05/1995', nacionalidad: 'Argentina', dni: '38123456', ecivil: '', lic: 'si', licCat: ['B'] });
  s.extras.disponibilidad = 'Full time · Disponibilidad inmediata';
  return s;
};
