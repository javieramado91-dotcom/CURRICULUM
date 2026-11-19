# CV Builder

Herramienta web gratuita para armar un currículum vitae moderno, prolijo y fácil de leer, en minutos y sin registrarse.

## Qué hace

- **Asistente de 10 pasos**: datos, foto, contacto, datos personales, perfil, experiencia, estudios, habilidades, extras y diseño.
- **Vista previa en vivo**: muestra el mismo PDF que se descarga, mientras escribís.
- **7 plantillas** (Moderno, Ejecutivo, Minimalista, Creativo, Profesional, Elegante y Compacto), **12 colores**, **5 tipografías**, 3 tamaños de letra y 4 formas de foto.
- **PDF con texto real** (generado con pdfmake): nítido a cualquier zoom, se puede seleccionar y copiar, y lo leen bien los sistemas automáticos de selección de personal (ATS). Los cortes de página no parten ningún trabajo ni título por la mitad.
- **Recorte de foto**: mover, hacer zoom (también con pellizco) y girar.
- **Frases sugeridas por rubro** (16 rubros): puestos, perfiles de ejemplo, tareas y habilidades.
- **Descargar, compartir el archivo** (en celulares, directo a WhatsApp o Drive), **enviar por WhatsApp o mail** e **imprimir**.
- Todo pasa en el navegador: los datos no se mandan a ningún servidor.

## Estructura

```
index.html          Portada + asistente
css/app.css         Estilos de la aplicación
js/data.js          Modelo de datos, formatos (fechas, DNI, CUIL) y normalización
js/themes.js        Paletas, pares tipográficos y carga de fuentes
js/suggestions.js   Frases sugeridas por rubro
js/pdf-core.js      Núcleo del motor PDF (íconos, bloques, generación)
js/templates.js     Las 7 plantillas
js/preview.js       Vista previa en vivo y miniaturas (pdf.js)
js/photo.js         Carga y recorte de foto
js/editor.js        Pasos, formularios, listas y selector de diseño
js/export.js        Descargar, compartir, WhatsApp, mail, imprimir
js/app.js           Portada, acciones globales y arranque
fonts/*.js          Fuentes (Inter, Lora, Playfair Display, Montserrat) recortadas a caracteres latinos, licencia OFL
```

No necesita instalación ni compilación: funciona abriendo `index.html` o publicándolo tal cual (por ejemplo en GitHub Pages). Las librerías pdfmake y pdf.js se cargan desde cdnjs.

## Agregar una plantilla

En `js/templates.js`, llamá a `CV.registerTemplate({ id, name, desc, defaultFonts, build(d, ctx) })`. `build` recibe los datos ya normalizados (`d`) y el contexto de diseño (`ctx.c` colores, `ctx.f` fuentes, `ctx.s()` escala de letra) y devuelve una definición de documento de pdfmake. Los bloques compartidos (`mainSections`, `sideSections`, títulos, etc.) resuelven la mayor parte.

---
Desarrollado por **JA**.
