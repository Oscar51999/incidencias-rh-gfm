/* Núcleo compartido — Solicitud de Permisos e Incidencias (RH-FM / FO-GR-08) */
(function () {
  'use strict';

  // URL de la Web App de Apps Script (se llena al desplegar el backend)
  var API_PROD = 'https://script.google.com/macros/s/AKfycby0klqCfoy76bCiDEaE6b7zQtkNxmRBEs4_YH84nE5Ssh2i_bUd748LtIpoVEQ3HvatIQ/exec';

  var local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var override = local ? new URLSearchParams(location.search).get('api') : null;
  if (override) sessionStorage.setItem('inc_api', override);

  var INC = window.INC = {};
  INC.API = (local && sessionStorage.getItem('inc_api')) || API_PROD;
  INC.CODIGO = 'RH-FM / FO-GR-08 / REV. 00';
  INC.NAVY = '#002060';

  INC.EMPRESAS = [
    'GRUPO FIRME DE MEXICO', 'CONTROL DE INGENIERIA Y SERVICIOS AÑADIDOS', 'CONSTRUCCIONES Y TERRACERIAS VANGUARDIA',
    'COMERCIALIZADORA MUPO', 'INMOBILIARIA ATARDECER DE LA PAZ', 'PROYECTOS Y DESARROLLOS PUNTA CORTEZ', 'SANTA CRUZ FID'
  ];

  INC.CATEGORIAS = [
    { id: 'ASISTENCIA', icono: 'ic-asistencia.png', tipos: ['RETARDO', 'FALTA', 'OMISIÓN DE ENTRADA', 'OMISIÓN DE SALIDA', 'HOME OFFICE'] },
    { id: 'PERMISOS', icono: 'ic-permisos.png', tipos: ['MOTIVOS PERSONALES', 'TEMA MÉDICO', 'TEMA FAMILIAR', 'TEMA ACADÉMICO', 'TRÁMITES', 'OTRO'] },
    { id: 'VACACIONES', icono: 'ic-vacaciones.png', tipos: ['VACACIONES'] },
    { id: 'OTRAS INCIDENCIAS', icono: 'ic-otras.png', tipos: ['INCAPACIDAD', 'AUSENTARSE UNAS HORAS', 'AUSENTARSE EL RESTO DEL DÍA', 'TIEMPO POR TIEMPO', 'PERMISOS SALIDAS FORÁNEOS', 'OTRO'] }
  ];
  INC.NOTA_FORANEOS = 'Solo aplica en casos específicos con negociación previa a su contratación';
  INC.POR_HORAS = ['RETARDO', 'OMISIÓN DE ENTRADA', 'OMISIÓN DE SALIDA', 'AUSENTARSE UNAS HORAS', 'AUSENTARSE EL RESTO DEL DÍA', 'TIEMPO POR TIEMPO'];
  INC.JUSTIFICACIONES = ['CON GOCE DE SUELDO', 'SIN GOCE DE SUELDO', 'OTRO'];

  INC.ESTADOS = {
    pendiente_jefe: { txt: 'Pendiente del jefe', cls: 'st-pend' },
    autorizada_jefe: { txt: 'Autorizada · por registrar', cls: 'st-aut' },
    rechazada_jefe: { txt: 'Rechazada', cls: 'st-rech' },
    registrada: { txt: 'Registrada por RH', cls: 'st-reg' },
    cancelada: { txt: 'Cancelada', cls: 'st-canc' }
  };

  /* ---------- Fechas ---------- */
  INC.fecha = function (iso) { // YYYY-MM-DD... -> DD/MM/AAAA
    if (!iso) return '';
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
    return m ? m[3] + '/' + m[2] + '/' + m[1] : String(iso);
  };
  INC.fechaHora = function (iso) {
    if (!iso) return '';
    var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(iso));
    return m ? m[3] + '/' + m[2] + '/' + m[1] + ' ' + m[4] + ':' + m[5] : INC.fecha(iso);
  };
  INC.hoy = function () {
    var d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  };
  INC.diasHabiles = function (a, b) { // lunes a viernes, inclusivo
    if (!a || !b) return 0;
    var d = new Date(a + 'T12:00:00'), f = new Date(b + 'T12:00:00'), n = 0;
    if (f < d) return 0;
    while (d <= f) { var w = d.getDay(); if (w !== 0 && w !== 6) n++; d.setDate(d.getDate() + 1); }
    return n;
  };
  INC.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  };

  /* ---------- API ---------- */
  INC.api = function (data) {
    return fetch(INC.API, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data)
    }).then(function (r) { return r.json(); });
  };

  /* ---------- Firma en pantalla ---------- */
  INC.firma = function (canvas) {
    var ctx = canvas.getContext('2d'), dibujando = false, vacio = true, ult = null;
    function ajustar() {
      var r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      var copia = vacio ? null : canvas.toDataURL();
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0b1a3a';
      if (copia) { var im = new Image(); im.onload = function () { ctx.drawImage(im, 0, 0, r.width, r.height); }; im.src = copia; }
    }
    function pos(e) { var r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    canvas.addEventListener('pointerdown', function (e) { dibujando = true; ult = pos(e); canvas.setPointerCapture(e.pointerId); e.preventDefault(); });
    canvas.addEventListener('pointermove', function (e) {
      if (!dibujando) return; var p = pos(e);
      ctx.beginPath(); ctx.moveTo(ult.x, ult.y); ctx.lineTo(p.x, p.y); ctx.stroke(); ult = p; vacio = false;
      canvas.dispatchEvent(new Event('firma'));
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) { canvas.addEventListener(t, function () { dibujando = false; }); });
    window.addEventListener('resize', ajustar);
    setTimeout(ajustar, 0);
    return {
      limpiar: function () { ctx.clearRect(0, 0, canvas.width, canvas.height); vacio = true; canvas.dispatchEvent(new Event('firma')); },
      vacia: function () { return vacio; },
      ajustar: ajustar,
      // PNG recortado y reducido (para que quepa en una celda de la hoja)
      exportar: function () {
        if (vacio) return '';
        var w = canvas.width, h = canvas.height, data = ctx.getImageData(0, 0, w, h).data;
        var x0 = w, y0 = h, x1 = 0, y1 = 0;
        for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 10) {
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
        if (x1 <= x0) return '';
        var pad = 8; x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w, x1 + pad); y1 = Math.min(h, y1 + pad);
        var cw = x1 - x0, ch = y1 - y0, esc = Math.min(1, 360 / cw, 130 / ch);
        var c = document.createElement('canvas'); c.width = Math.round(cw * esc); c.height = Math.round(ch * esc);
        c.getContext('2d').drawImage(canvas, x0, y0, cw, ch, 0, 0, c.width, c.height);
        return c.toDataURL('image/png');
      }
    };
  };

  /* ---------- Archivos ---------- */
  INC.leerArchivo = function (file) {
    return new Promise(function (ok, mal) {
      var fr = new FileReader();
      fr.onload = function () { ok(fr.result); }; fr.onerror = mal; fr.readAsDataURL(file);
    });
  };
  INC.comprimirImagen = function (file, max, calidad) {
    return INC.leerArchivo(file).then(function (src) {
      return new Promise(function (ok) {
        var im = new Image();
        im.onload = function () {
          var e = Math.min(1, (max || 1600) / Math.max(im.width, im.height));
          var c = document.createElement('canvas'); c.width = Math.round(im.width * e); c.height = Math.round(im.height * e);
          var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
          ok(c.toDataURL('image/jpeg', calidad || 0.75));
        };
        im.onerror = function () { ok(src); };
        im.src = src;
      });
    });
  };

  /* ---------- Imágenes para el PDF ---------- */
  var cacheImg = {};
  INC.img = function (src) {
    if (cacheImg[src]) return cacheImg[src];
    cacheImg[src] = new Promise(function (ok) {
      var im = new Image();
      im.onload = function () {
        var c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
        c.getContext('2d').drawImage(im, 0, 0);
        ok({ data: c.toDataURL('image/png'), w: im.naturalWidth, h: im.naturalHeight });
      };
      im.onerror = function () { ok(null); };
      im.src = src;
    });
    return cacheImg[src];
  };

  /* ---------- PDF del formato FO-GR-08 ya llenado ---------- */
  INC.pdf = function (s) {
    var srcs = ['logo-firme.png', 'pie-izq.png', 'pie-der.png'].concat(INC.CATEGORIAS.map(function (c) { return c.icono; }));
    var firmas = [s.firmaColaborador, s.jefeFirma].map(function (f) { return f ? INC.img(f) : Promise.resolve(null); });
    return Promise.all(srcs.map(INC.img).concat(firmas)).then(function (im) {
      var J = window.jspdf.jsPDF, doc = new J({ unit: 'mm', format: 'letter' });
      var NAV = [0, 32, 96], X0 = 12, W = 191.9;
      var logo = im[0], pieI = im[1], pieD = im[2], iconos = im.slice(3, 7), fC = im[7], fJ = im[8];

      function color(c) { doc.setTextColor(c[0], c[1], c[2]); }
      function txt(t, x, y, o) {
        o = o || {};
        doc.setFont('helvetica', o.estilo || 'normal'); doc.setFontSize(o.t || 8); color(o.c || [0, 0, 0]);
        doc.text(String(t == null ? '' : t), x, y, { align: o.al || 'left', maxWidth: o.max });
      }
      function barra(t, x, y, w) {
        doc.setFillColor(NAV[0], NAV[1], NAV[2]); doc.rect(x, y, w, 6.2, 'F');
        txt(t, x + 2, y + 4.4, { estilo: 'bold', t: 9.5, c: [255, 255, 255] });
      }
      function caja(x, y, w, h) { doc.setDrawColor(NAV[0], NAV[1], NAV[2]); doc.setLineWidth(0.45); doc.rect(x, y, w, h); }
      function campo(etq, val, x, y, wEtq, wLinea) {
        txt(etq, x, y, { estilo: 'bold', t: 7 });
        var xv = x + wEtq;
        txt(val, xv + 1, y - 0.3, { t: 8.3, max: wLinea - 1 });
        doc.setDrawColor(90); doc.setLineWidth(0.2); doc.line(xv, y + 0.8, xv + wLinea, y + 0.8);
      }
      function check(x, y, marcado) {
        doc.setDrawColor(0); doc.setLineWidth(0.35); doc.rect(x, y, 3.6, 3.6);
        if (marcado) {
          doc.setDrawColor(NAV[0], NAV[1], NAV[2]); doc.setLineWidth(0.7);
          doc.line(x + 0.6, y + 0.6, x + 3, y + 3); doc.line(x + 3, y + 0.6, x + 0.6, y + 3);
        }
      }
      function imagen(o, x, y, wMax, hMax, al) {
        if (!o) return;
        var r = Math.min(wMax / o.w, hMax / o.h), w = o.w * r, h = o.h * r;
        var xx = al === 'centro' ? x + (wMax - w) / 2 : al === 'der' ? x + wMax - w : x;
        doc.addImage(o.data, 'PNG', xx, y + (hMax - h) / 2, w, h);
      }

      /* Encabezado */
      imagen(logo, X0, 13, 40, 12);
      txt('SOLICITUD DE PERMISOS E INCIDENCIAS', 105, 18.5, { estilo: 'bold', t: 13.5, c: NAV, al: 'center' });
      txt('Este formato deberá ser llenado por el colaborador y entregado al jefe directo para su', 105, 23, { estilo: 'italic', t: 7, al: 'center' });
      txt('autorización', 105, 26.2, { estilo: 'italic', t: 7, al: 'center' });
      txt('FOLIO: ' + (s.folio || '—'), 105, 32, { estilo: 'bold', t: 10, c: NAV, al: 'center' });
      caja(158, 10, 45.9, 25);
      txt('FECHA DE SOLICITUD:', 181, 16.5, { t: 7.5, al: 'center' });
      txt(INC.fecha(s.fechaSolicitud) || '____/____/_____', 181, 24, { estilo: 'bold', t: 11, al: 'center' });
      txt('(DD / MM / AAAA)', 181, 28.5, { t: 5.8, al: 'center' });

      /* 1 y 2 */
      var y = 39;
      barra('1.- DATOS DEL COLABORADOR', X0, y, 94); barra('2.- PERIODO DE LA INCIDENCIA', 109.9, y, 94);
      caja(X0, y + 6.2, 94, 36); caja(109.9, y + 6.2, 94, 36);
      var yy = y + 13;
      campo('NOMBRE COMPLETO:', s.nombre, X0 + 1.5, yy, 27, 63);
      campo('PUESTO:', s.puesto, X0 + 1.5, yy + 6.5, 13, 77);
      campo('ÁREA / DEPARTAMENTO:', s.area, X0 + 1.5, yy + 13, 32, 58);
      campo('FECHA DE INGRESO:', INC.fecha(s.fechaIngreso), X0 + 1.5, yy + 19.5, 27, 63);
      campo('EMPRESA:', s.empresa, X0 + 1.5, yy + 26, 14, 76);

      var x2 = 111.4;
      campo('TOTAL DE DÍAS U HORAS:', s.totalDiasHoras, x2, yy, 34, 56);
      campo('FECHA DE INICIO:', INC.fecha(s.fechaInicio), x2, yy + 6.5, 24, 27);
      campo('HORA DE INICIO:', s.horaInicio, x2 + 54, yy + 6.5, 22, 14);
      campo('FECHA DE FIN:', INC.fecha(s.fechaFin), x2, yy + 13, 24, 27);
      campo('HORA DE FIN:', s.horaFin, x2 + 54, yy + 13, 22, 14);
      campo('FECHA DE REINCORPORACIÓN:', INC.fecha(s.fechaReincorporacion), x2, yy + 19.5, 40, 50);
      txt('Jefe directo: ' + (s.jefeNombre || ''), x2, yy + 26, { t: 7, c: [80, 80, 80], max: 90 });

      /* 3 */
      y = 85;
      barra('3.- TIPO DE INCIDENCIA (Marque solo una opción)', X0, y, W);
      var cols = [42, 50, 48, 51.9], hc = 60, xc = X0;
      caja(X0, y + 6.2, W, hc);
      INC.CATEGORIAS.forEach(function (cat, i) {
        var w = cols[i];
        if (i) { doc.setDrawColor(NAV[0], NAV[1], NAV[2]); doc.setLineWidth(0.45); doc.line(xc, y + 6.2, xc, y + 6.2 + hc); }
        var nom = cat.id;
        txt(nom, xc + w / 2, y + 11.5, { estilo: 'bold', t: 9.5, al: 'center' });
        imagen(iconos[i], xc + w / 2 - 5, y + 13.5, 10, 10, 'centro');
        var sel = s.categoria === cat.id;
        if (cat.id === 'VACACIONES') {
          txt('TOTAL DE DÍAS:', xc + w / 2, y + 30, { estilo: 'bold', t: 9, c: NAV, al: 'center' });
          txt(sel ? (s.vacDias || s.totalDiasHoras || '') : '', xc + w / 2, y + 36, { estilo: 'bold', t: 11, al: 'center' });
          doc.setDrawColor(0); doc.setLineWidth(0.4); doc.line(xc + w / 2 - 9, y + 37.5, xc + w / 2 + 9, y + 37.5);
          doc.setLineWidth(0.25); doc.setDrawColor(160); doc.line(xc, y + 41, xc + w, y + 41);
          txt('DE:', xc + 3, y + 47, { estilo: 'bold', t: 7.5 }); txt(sel ? INC.fecha(s.fechaInicio) : '____/____/______', xc + 11, y + 47, { t: 8 });
          txt('A :', xc + 3, y + 52, { estilo: 'bold', t: 7.5 }); txt(sel ? INC.fecha(s.fechaFin) : '____/____/______', xc + 11, y + 52, { t: 8 });
          txt('REINCORPORACIÓN:', xc + 3, y + 58, { estilo: 'bold', t: 7.5 });
          txt(sel ? INC.fecha(s.fechaReincorporacion) : '____/____/______', xc + w / 2, y + 63, { t: 8, al: 'center' });
          if (sel) { doc.setDrawColor(NAV[0], NAV[1], NAV[2]); doc.setLineWidth(0.9); doc.rect(xc + 1.2, y + 7.4, w - 2.4, hc - 2.4); }
        } else {
          cat.tipos.forEach(function (t, k) {
            var yo = y + 28 + k * 5.5 + (cat.id === 'OTRAS INCIDENCIAS' && k === 5 ? 1.8 : 0);
            check(xc + 2, yo - 2.9, sel && s.tipo === t);
            txt(t, xc + 7, yo, { t: 7.2, estilo: sel && s.tipo === t ? 'bold' : 'normal', c: sel && s.tipo === t ? NAV : [0, 0, 0] });
            if (t === 'PERMISOS SALIDAS FORÁNEOS') {
              doc.setFontSize(4.6); doc.setFont('helvetica', 'normal');
              doc.splitTextToSize('(' + INC.NOTA_FORANEOS + ')', w - 9).forEach(function (l, n) { txt(l, xc + 7, yo + 2.1 + n * 1.8, { t: 4.6 }); });
            }
          });
          if (cat.tipos.indexOf('OTRO') >= 0) {
            txt('ESPECIFICAR:', xc + 10, y + 63.5, { estilo: 'bold', t: 7 });
            txt(sel && s.tipo === 'OTRO' ? s.especificar : '', xc + 27, y + 63.2, { t: 7, max: w - 28 });
            doc.setDrawColor(0); doc.setLineWidth(0.2); doc.line(xc + 26, y + 64.2, xc + w - 2, y + 64.2);
          }
        }
        xc += w;
      });

      /* 4 */
      y = 155;
      barra('4.- MOTIVO (Descripción de la Incidencia)', X0, y, W);
      caja(X0, y + 6.2, W, 18);
      doc.setDrawColor(0); doc.setLineWidth(0.25); doc.line(X0, y + 12.2, X0 + W, y + 12.2); doc.line(X0, y + 18.2, X0 + W, y + 18.2);
      doc.setFont('helvetica', 'normal');
      var tm = 8.5, lineas;
      do { doc.setFontSize(tm); lineas = doc.splitTextToSize(String(s.motivo || ''), W - 4); tm -= 0.5; } while (lineas.length > 3 && tm > 6);
      lineas.slice(0, 3).forEach(function (l, i) { txt(l, X0 + 2, y + 10.6 + i * 6, { t: tm + 0.5 }); });

      /* 5 */
      y = 183;
      barra('5.- FORMA DE JUSTIFICACIÓN (Solo aplica en los apartados de Asistencia, Permisos y otras Incidencias)', X0, y, W);
      caja(X0, y + 6.2, W, 17);
      var vac = s.categoria === 'VACACIONES';
      check(X0 + 2, y + 9.5, !vac && s.justificacion === 'CON GOCE DE SUELDO'); txt('INCIDENCIA JUSTIFICADA CON GOCE DE SUELDO', X0 + 7, y + 12.3, { t: 7.5 });
      check(X0 + 72, y + 9.5, !vac && s.justificacion === 'SIN GOCE DE SUELDO'); txt('INCIDENCIA JUSTIFICADA SIN GOCE DE SUELDO', X0 + 77, y + 12.3, { t: 7.5 });
      doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
      var u0 = X0 + 77 + doc.getTextWidth('INCIDENCIA JUSTIFICADA '), u1 = u0 + doc.getTextWidth('SIN GOCE');
      doc.setLineWidth(0.25); doc.setDrawColor(0); doc.line(u0, y + 13, u1, y + 13);
      check(X0 + 142, y + 9.5, !vac && s.justificacion === 'OTRO'); txt('OTRO:', X0 + 147, y + 12.3, { t: 7.5 });
      txt(!vac && s.justificacion === 'OTRO' ? s.justificacionOtro : '', X0 + 157, y + 12, { t: 7, max: 33 });
      doc.line(X0 + 156, y + 13, X0 + W - 2, y + 13);
      var nAdj = (s.adjuntos || []).length;
      txt('*Adjuntar documentación de soporte (Recetas médicas, Incapacidad, Cita del trámite, Etc., ...)' + (vac ? '   ·   No aplica para vacaciones' : '   ·   Soporte adjunto: ' + (nAdj ? nAdj + ' archivo(s)' : 'ninguno')),
        X0 + 2, y + 20.8, { estilo: 'italic', t: 6.6 });

      /* 6 */
      y = 209;
      barra('6.- AUTORIZACIONES', X0, y, W);
      caja(X0, y + 6.2, W, 38.8);
      var bx = [X0 + 4, X0 + 67, X0 + 130], bw = 58;
      var cajas = [
        { t: 'COLABORADOR', st: 'Declaro que la información proporcionada es verídica', f: fC, nom: s.nombre, pie: 'Firma del colaborador', fecha: s.fechaRegistro },
        { t: 'JEFE DIRECTO', st: 'Autorizo la incidencia conforme a la revisión de la documentación soporte.', f: fJ, nom: s.jefeNombreFirma || '', pie: 'Nombre y Firma del Jefe Directo', fecha: s.jefeFecha, rech: s.jefeDecision === 'RECHAZADA' },
        { t: 'RECURSOS HUMANOS', st: 'Recibido y registrado', f: null, nom: s.rhUsuario || '', pie: 'Nombre y Firma de RH', fecha: s.rhFecha, rh: !!s.rhUsuario }
      ];
      cajas.forEach(function (c, i) {
        var x = bx[i];
        doc.setDrawColor(0); doc.setLineWidth(0.3); doc.rect(x, y + 9, bw, 34);
        txt(c.t, x + bw / 2, y + 13, { estilo: 'bold', t: 8, c: NAV, al: 'center' });
        doc.setFontSize(5.6); doc.setFont('helvetica', 'normal');
        doc.splitTextToSize(c.st, bw - 6).forEach(function (l, k) { txt(l, x + bw / 2, y + 15.6 + k * 2.3, { t: 5.6, al: 'center' }); });
        if (c.rech) {
          txt('RECHAZADA', x + bw / 2, y + 28, { estilo: 'bold', t: 13, c: [197, 19, 21], al: 'center' });
        } else if (c.f) {
          imagen(c.f, x + 6, y + 19.5, bw - 12, 12.5, 'centro');
        } else if (c.rh) {
          txt('RECIBIDO Y REGISTRADO', x + bw / 2, y + 28, { estilo: 'bold', t: 9, c: NAV, al: 'center' });
        }
        doc.setDrawColor(0); doc.setLineWidth(0.25); doc.line(x + 6, y + 33, x + bw - 6, y + 33);
        txt(c.nom, x + bw / 2, y + 36, { estilo: 'bold', t: 7, al: 'center', max: bw - 4 });
        txt(c.pie, x + bw / 2, y + 39, { t: 5.8, al: 'center' });
        if (c.fecha) txt(INC.fechaHora(c.fecha), x + bw / 2, y + 41.6, { t: 5.6, c: [90, 90, 90], al: 'center' });
      });
      if (s.jefeComentario) txt('Comentario del jefe directo: ' + s.jefeComentario, X0 + 1, y + 48.4, { t: 6.2, c: [80, 80, 80], max: W - 4 });

      /* Pie */
      y = 262;
      imagen(pieI, X0, y, 60, 6);
      imagen(pieD, X0 + W - 64, y, 64, 6, 'der');
      txt('Código: ' + INC.CODIGO, 105, y + 2.5, { estilo: 'italic', t: 6, al: 'center' });
      txt('PAG. 1 DE 1', 105, y + 5, { estilo: 'italic', t: 6, al: 'center' });
      doc.setDrawColor(0); doc.setLineWidth(0.3); doc.line(X0, y + 7.5, X0 + W, y + 7.5);
      txt('Documento generado electrónicamente · ' + (s.folio || '') + ' · ' + INC.fechaHora(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString()),
        105, y + 11, { t: 5.6, c: [120, 120, 120], al: 'center' });
      return doc;
    });
  };

  /* ---------- Vista de solo lectura (autorizar y panel) ---------- */
  INC.vista = function (s) {
    var e = INC.esc;
    function f(etq, v) { return '<div class="rv"><span>' + etq + '</span><b>' + (v ? e(v) : '<i>—</i>') + '</b></div>'; }
    var periodo = INC.fecha(s.fechaInicio) + (s.horaInicio ? ' ' + s.horaInicio : '') +
      (s.fechaFin && (s.fechaFin !== s.fechaInicio || s.horaFin) ? ' → ' + INC.fecha(s.fechaFin) + (s.horaFin ? ' ' + s.horaFin : '') : (s.horaFin ? ' → ' + s.horaFin : ''));
    var cat = INC.CATEGORIAS.filter(function (c) { return c.id === s.categoria; })[0];
    var just = s.categoria === 'VACACIONES' ? 'No aplica (vacaciones)' : (s.justificacion ? 'Justificada ' + s.justificacion.toLowerCase() + (s.justificacionOtro ? ': ' + s.justificacionOtro : '') : '');
    var adj = (s.adjuntos || []).filter(function (a) { return a.url; }).map(function (a) {
      return '<a class="adj" href="' + e(a.url) + '" target="_blank" rel="noopener">' + (/pdf/i.test(a.tipo || a.nombre) ? '📄 ' : '🖼 ') + e(a.nombre) + '</a>';
    }).join('');
    return '<div class="rview">' +
      '<div class="rtipo">' + (cat ? '<img src="' + cat.icono + '" alt="">' : '') + '<div><small>' + e(s.categoria) + '</small><strong>' + e(s.tipo) + (s.especificar ? ' — ' + e(s.especificar) : '') + '</strong></div>' +
      '<div class="rtot"><small>Total</small><strong>' + e(s.totalDiasHoras || (s.vacDias ? s.vacDias + ' días' : '—')) + '</strong></div></div>' +
      '<div class="rgrid">' +
      f('Colaborador', s.nombre) + f('Empresa', s.empresa) + f('Puesto', s.puesto) + f('Área / departamento', s.area) +
      f('Fecha de ingreso', INC.fecha(s.fechaIngreso)) + f('Fecha de solicitud', INC.fecha(s.fechaSolicitud)) +
      f('Periodo', periodo) + f('Reincorporación', INC.fecha(s.fechaReincorporacion)) +
      '</div>' +
      '<div class="rv full"><span>Motivo</span><b class="mot">' + e(s.motivo) + '</b></div>' +
      '<div class="rgrid">' + f('Forma de justificación', just) + f('Jefe directo', s.jefeNombre + (s.jefeCorreo ? ' · ' + s.jefeCorreo : '')) + '</div>' +
      '<div class="rv full"><span>Soporte adjunto</span><div class="adjs">' + (adj || (s.categoria === 'VACACIONES' ? '<i>No aplica</i>' : '<i>Sin documentos adjuntos</i>')) + '</div></div>' +
      '</div>';
  };

  INC.descargarPDF = function (s) {
    return INC.pdf(s).then(function (doc) { doc.save((s.folio || 'SOLICITUD') + ' - ' + (s.nombre || '').toUpperCase() + '.pdf'); });
  };
})();
