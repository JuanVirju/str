(function () {
  'use strict';

  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var DIA_CORTO = ['D', 'L', 'M', 'MI', 'J', 'V', 'S'];
  var DIA_LARGO = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var NOMBRE = { M: 'Mañana', T: 'Tarde', N: 'Noche', V: 'V', '-': 'Libre' };

  var datos = null;
  var hoy = new Date();
  // Para probar: añade ?hoy=2027-01-15 a la direccion y la app actuara como si fuera ese dia.
  var simulado = /[?&]hoy=(\d{4})-(\d{2})-(\d{2})/.exec(location.search);
  if (simulado) hoy = new Date(+simulado[1], +simulado[2] - 1, +simulado[3], 12, 0, 0);
  var ymHoy = ym(hoy.getFullYear(), hoy.getMonth() + 1);
  
  /* ---------- utilidades ---------- */
  function ym(y, m) { return y + '-' + (m < 10 ? '0' : '') + m; }
  function leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function guardar(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } }

  function el(tag, props, hijos) {
    var n = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        if (k === 'class') n.className = props[k];
        else if (k === 'text') n.textContent = props[k];
        else n.setAttribute(k, props[k]);
      });
    }
    (hijos || []).forEach(function (h) { if (h) n.appendChild(h); });
    return n;
  }

  function diasDelMes(ymKey) {
    var p = ymKey.split('-');
    return new Date(+p[0], +p[1], 0).getDate();
  }
  function esFinde(ymKey, dia) {
    var p = ymKey.split('-');
    var d = new Date(+p[0], +p[1] - 1, dia).getDay();
    return d === 0 || d === 6;
  }
  function nombreMes(ymKey) {
    var p = ymKey.split('-');
    return MESES[+p[1] - 1] + ' ' + p[0];
  }

  function fechaLarga(y, m, d) {
    return DIA_LARGO[new Date(y, m - 1, d).getDay()] + ' ' + d + ' de ' + MESES[m - 1] + ' de ' + y;
  }
  function fechaCorta(iso) {
    var p = iso.split('-');
    var wd = new Date(+p[0], +p[1] - 1, +p[2]).getDay();
    return DIA_LARGO[wd].slice(0, 3) + ' ' + (+p[2]) + ' ' + MESES[+p[1] - 1].slice(0, 3);
  }
  function fmtHoras(t) { return t.slice(1).replace('.', ','); }
  function esFestivo(emp, ymKey, dia) {
    return !!datos.empresas[emp].festivos[ymKey + '-' + (dia < 10 ? '0' : '') + dia];
  }

  /* ---------- acceso a datos ---------- */
  function turnoDe(emp, ymKey, equipo, dia) {
    var mes = datos.empresas[emp].turnos.meses[ymKey];
    if (!mes || !mes[equipo]) return null;
    var c = mes[equipo].charAt(dia - 1);
    return c ? c : null;
  }
  function ordinarioDe(emp, ymKey, dia) {
    var s = datos.empresas[emp].ordinario.meses[ymKey];
    if (!s) return null;
    var c = s.charAt(dia - 1);
    return c ? c : null;
  }

  /* ---------- piezas comunes ---------- */
  function cabecera(titulo, sub, atras, emp) {
    document.getElementById('titulo').textContent = titulo;
    // Con logo en la cabecera no hace falta repetir el nombre de la empresa debajo.
    document.getElementById('sub').textContent = emp ? '' : (sub || '');
    var a = document.getElementById('atras');
    if (atras) { a.setAttribute('href', atras); a.hidden = false; } else { a.hidden = true; }
    // La casita solo cuando "Atrás" no lleva ya al inicio.
    document.getElementById('inicio').hidden = !atras || atras === '#/';
    var cl = document.getElementById('cab-logo');
    cl.textContent = '';
    if (emp) cl.appendChild(logo(emp, 'peque'));
    document.title = titulo + (sub ? ' · ' + sub : '');
  }

  // Logo: prueba cada direccion de la lista; si ninguna carga, muestra la inicial de la empresa.
  function logo(emp, clase) {
    var e = datos.empresas[emp];
    var fuentes = [].concat(e.logo || []);
    var caja = el('div', { class: 'logo ' + (clase || '') });
    if (e.logoFondo) caja.style.background = e.logoFondo;
    var img = el('img', { alt: e.nombre, loading: 'lazy' });
    var i = 0;
    function siguiente() {
      if (i < fuentes.length) { img.src = fuentes[i++]; return; }
      caja.textContent = '';
      caja.style.background = '';
      caja.classList.add('ph');
      caja.appendChild(el('span', { text: e.nombre.charAt(0) }));
    }
    img.addEventListener('error', siguiente);
    caja.appendChild(img);
    siguiente();
    return caja;
  }

  function bloqueEnlaces(emp, sec) {
    var cont = el('section', { class: 'bloque info' }, [el('h2', { text: 'Información' })]);
    var cfg = (datos.empresas[emp].enlaces || {})[sec] || {};
    var lista = el('div', { class: 'tiles uno' });
    [['convenio', 'Convenio colectivo'], ['faq', 'Preguntas frecuentes y dudas']].forEach(function (par) {
      var url = cfg[par[0]];
      if (url) {
        lista.appendChild(el('a', { class: 'tile ancho', href: url, target: '_blank', rel: 'noopener' }, [el('span', { class: 'tile-t', text: par[1] })]));
      } else {
        lista.appendChild(el('span', { class: 'tile ancho pronto-tile', 'aria-disabled': 'true' }, [
          el('span', { class: 'tile-t', text: par[1] }),
          el('span', { class: 'tile-s', text: 'Próximamente' })
        ]));
      }
    });
    cont.appendChild(lista);
    return cont;
  }

  // Cuadricula mensual generica (lunes primero). codigo(d) devuelve el codigo del dia o null.
  // opts.fest(d) -> bool marca festivo; opts.texto(codigo) -> texto grande de la celda.
  function cuadricula(ymKey, codigo, opts) {
    opts = opts || {};
    var grid = el('div', { class: 'cal' });
    ['L', 'M', 'MI', 'J', 'V', 'S', 'D'].forEach(function (n) { grid.appendChild(el('div', { class: 'dn', text: n })); });
    var p = ymKey.split('-');
    var hueco = (new Date(+p[0], +p[1] - 1, 1).getDay() + 6) % 7;
    for (var i = 0; i < hueco; i++) grid.appendChild(el('div', { class: 'c vacio' }));
    var total = diasDelMes(ymKey);
    for (var d = 1; d <= total; d++) {
      var t = codigo(d);
      var clases = 'c';
      if (esFinde(ymKey, d)) clases += ' finde';
      if (ymKey === ymHoy && d === hoy.getDate()) clases += ' hoy-c';
      if (t && t !== '-' && t !== '?') clases += ' ' + t.charAt(0);
      if (opts.fest && opts.fest(d)) clases += ' fest';
      var texto = !t || t === '?' ? '?' : (t === '-' ? '·' : (opts.texto ? opts.texto(t) : t));
      if (opts.soloDia) clases += ' solo';
      grid.appendChild(el('div', { class: clases }, [
        el('span', { class: 'd', text: String(d) }),
        opts.soloDia ? null : el('span', { class: 's', text: texto })
      ]));
    }
    return grid;
  }

  function sinDatos(texto) { return el('p', { class: 'sin-datos', text: texto }); }

  /* ---------- pantalla 1: inicio ---------- */
  function pantallaInicio(app) {
    cabecera('Cuadrantes', 'Elige tu empresa', null);
    var cont = el('div', { class: 'tiles' });
    Object.keys(datos.empresas).forEach(function (id) {
      cont.appendChild(el('a', { class: 'tile', href: '#/' + id }, [
        logo(id, 'grande'),
        el('span', { class: 'tile-t', text: datos.empresas[id].nombre })
      ]));
    });
    app.appendChild(cont);
    app.appendChild(el('div', { class: 'enlaces-inicio' }, [
      el('a', { class: 'chip-link', href: '#/comentarios', text: 'Mis comentarios' }),
      el('a', { class: 'chip-link', href: '#/ayuda', text: 'Ayuda' })
    ]));
  }

  /* ---------- pantalla 2: menu de la empresa ---------- */
  function pantallaEmpresa(app, emp) {
    cabecera(datos.empresas[emp].nombre, '', '#/');
    app.appendChild(el('div', { class: 'banner' }, [logo(emp, 'grande')]));
    var e = datos.empresas[emp];
    var hay = {
      turnos: Object.keys((e.turnos || {}).meses || {}).length > 0,
      ordinario: Object.keys((e.ordinario || {}).meses || {}).length > 0
    };
    function boton(sec, texto) {
      if (hay[sec]) return el('a', { class: 'tile ancho', href: '#/' + emp + '/' + sec }, [el('span', { class: 'tile-t', text: texto })]);
      return el('span', { class: 'tile ancho pronto-tile', 'aria-disabled': 'true' }, [
        el('span', { class: 'tile-t', text: texto }),
        el('span', { class: 'tile-s', text: 'Próximamente' })
      ]);
    }
    app.appendChild(el('div', { class: 'tiles uno' }, [
      boton('turnos', 'Cuadrante de turnos'),
      boton('ordinario', 'Calendario de ordinaria')
    ]));
    app.appendChild(bloqueEnlaces(emp, 'turnos'));
  }

  /* ---------- pantalla 3: lista de meses (turnos u ordinario) ---------- */
  function pantallaMeses(app, emp, sec) {
    var e = datos.empresas[emp];
    var meses = Object.keys(sec === 'turnos' ? e.turnos.meses : e.ordinario.meses).sort();
    cabecera(sec === 'turnos' ? 'Cuadrante de turnos' : 'Calendario de ordinaria', e.nombre, '#/' + emp, emp);
    var anio = null, rejilla = null;
    meses.forEach(function (k) {
      if (k.slice(0, 4) !== anio) {
        anio = k.slice(0, 4);
        app.appendChild(el('h2', { class: 'anio', text: anio }));
        rejilla = el('div', { class: 'meses' });
        app.appendChild(rejilla);
      }
      var m = +k.slice(5) - 1;
      var cls = 'mes' + (k === ymHoy ? ' actual' : '');
      rejilla.appendChild(el('a', { class: cls, href: '#/' + emp + '/' + sec + '/' + k }, [
        el('span', { class: 'mes-n', text: String(m + 1) }),
        el('span', { class: 'mes-t', text: MESES[m] })
      ]));
    });
    app.appendChild(bloqueEnlaces(emp, sec));
  }

  // Flechas al mes anterior y siguiente que tengan datos.
  function navVecinos(emp, sec, k, claves) {
    var i = claves.indexOf(k);
    function lado(j, clase, flecha, alReves) {
      if (j < 0 || j >= claves.length) return el('span', { class: 'vecino ' + clase + ' off' });
      var nm = MESES[+claves[j].slice(5) - 1];
      var partes = alReves ? [el('span', { class: 'fl', text: flecha }), el('span', { text: nm })]
                           : [el('span', { text: nm }), el('span', { class: 'fl', text: flecha })];
      return el('a', { class: 'vecino ' + clase, href: '#/' + emp + '/' + sec + '/' + claves[j],
        'aria-label': (alReves ? 'Mes anterior: ' : 'Mes siguiente: ') + nm }, partes);
    }
    return el('nav', { class: 'vecinos', 'aria-label': 'Cambiar de mes' }, [lado(i - 1, 'ant', '‹', true), lado(i + 1, 'sig', '›', false)]);
  }

  /* ---------- comentarios (solo en este dispositivo) ---------- */
  function leerNotas() {
    try { var o = JSON.parse(leer('comentarios') || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; }
  }
  function clNota(emp, k, d, eq) { return emp + '|' + k + '-' + (d < 10 ? '0' + d : d) + '|' + eq; }
  function ponerNota(clave, texto) {
    var n = leerNotas();
    if (texto) n[clave] = texto; else delete n[clave];
    guardar('comentarios', JSON.stringify(n));
  }
  function panelNota(titulo, sub, clave, alCambiar) {
    var fondo = el('div', { class: 'modal-fondo' });
    var area = el('textarea', { class: 'modal-area', rows: '4', maxlength: '500', placeholder: 'Escribe aquí tu comentario…', 'aria-label': 'Comentario' });
    area.value = leerNotas()[clave] || '';
    function cerrar() { if (fondo.parentNode) fondo.parentNode.removeChild(fondo); }
    function fin() { ponerNota(clave, area.value.trim()); cerrar(); alCambiar(); }
    var guardarB = el('button', { class: 'btn-p', type: 'button', text: 'Guardar' });
    var borrarB = el('button', { class: 'btn-s', type: 'button', text: 'Borrar' });
    var cerrarB = el('button', { class: 'btn-s', type: 'button', text: 'Cancelar' });
    guardarB.addEventListener('click', fin);
    borrarB.addEventListener('click', function () { area.value = ''; fin(); });
    cerrarB.addEventListener('click', cerrar);
    fondo.addEventListener('click', function (ev) { if (ev.target === fondo) cerrar(); });
    fondo.appendChild(el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' }, [
      el('h3', { text: titulo }),
      el('p', { class: 'modal-sub', text: sub }),
      area,
      el('p', { class: 'nota', text: 'Se guarda solo en este dispositivo.' }),
      el('div', { class: 'modal-btns' }, [borrarB, cerrarB, guardarB])
    ]));
    document.body.appendChild(fondo);
    setTimeout(function () { area.focus(); }, 50);
  }

  /* ---------- Mis comentarios y Ayuda ---------- */
  var CLAVE_EXPORT = 'STR-COMENTARIOS';
  function textoExport(notas) { return CLAVE_EXPORT + '\n' + JSON.stringify({ v: 1, notas: notas }); }
  function leerExport(txt) {
    var i = txt.indexOf(CLAVE_EXPORT);
    if (i < 0) return null;
    try {
      var o = JSON.parse(txt.slice(i + CLAVE_EXPORT.length).trim());
      return o && o.notas && typeof o.notas === 'object' ? o.notas : null;
    } catch (e) { return null; }
  }

  function pantallaComentarios(app) {
    cabecera('Mis comentarios', 'Solo en este dispositivo', '#/');
    var notas = leerNotas();
    var claves = Object.keys(notas).filter(function (c) {
      var q = c.split('|'); return datos.empresas[q[0]] && /^\d{4}-\d{2}-\d{2}$/.test(q[1] || '');
    }).sort(function (a, b) { return a.split('|')[1] < b.split('|')[1] ? -1 : a.split('|')[1] > b.split('|')[1] ? 1 : 0; });

    var lista = el('section', { class: 'bloque' });
    if (!claves.length) {
      lista.appendChild(el('p', { class: 'sin-datos', text: 'Aún no has escrito ningún comentario. Entra en el cuadrante de turnos, abre un mes y toca un día de tu equipo.' }));
    }
    claves.forEach(function (c) {
      var q = c.split('|'), f = q[1].split('-'), emp = q[0];
      lista.appendChild(el('a', { class: 'nota-fila', href: '#/' + emp + '/turnos/' + f[0] + '-' + f[1] }, [
        el('span', { class: 'nota-cab', text: (+f[2]) + ' de ' + MESES[+f[1] - 1] + ' de ' + f[0] + ' · ' + datos.empresas[emp].nombre + ' · Equipo ' + q[2] }),
        el('span', { class: 'nota-txt', text: notas[c] })
      ]));
    });
    app.appendChild(lista);

    var zona = el('div', { class: 'zona-copia' });
    var bExp = el('button', { class: 'btn-s', type: 'button', text: 'Exportar' });
    var bImp = el('button', { class: 'btn-s', type: 'button', text: 'Importar' });
    app.appendChild(el('section', { class: 'bloque info' }, [
      el('h2', { text: 'Copia de seguridad' }),
      el('div', { class: 'modal-btns' }, [bExp, bImp]),
      zona
    ]));
    if (!claves.length) bExp.disabled = true;

    bExp.addEventListener('click', function () {
      zona.textContent = '';
      var txt = textoExport(notas);
      var area = el('textarea', { class: 'modal-area', rows: '5', readonly: 'readonly', 'aria-label': 'Texto de la copia' });
      area.value = txt;
      var fila = el('div', { class: 'modal-btns' });
      if (navigator.share) {
        var bs = el('button', { class: 'btn-p', type: 'button', text: 'Compartir' });
        bs.addEventListener('click', function () { navigator.share({ text: txt }).catch(function () {}); });
        fila.appendChild(bs);
      }
      var bc = el('button', { class: 'btn-p', type: 'button', text: 'Copiar' });
      bc.addEventListener('click', function () {
        function ok() { bc.textContent = 'Copiado'; }
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, function () { area.select(); });
        else { area.select(); try { document.execCommand('copy'); ok(); } catch (e) { /* se queda seleccionado */ } }
      });
      fila.appendChild(bc);
      zona.appendChild(el('p', { class: 'nota', text: 'Guarda este texto (por ejemplo en notas o en un mensaje a ti mismo). Para recuperarlo, pégalo en «Importar».' }));
      zona.appendChild(area); zona.appendChild(fila);
    });

    bImp.addEventListener('click', function () {
      zona.textContent = '';
      var area = el('textarea', { class: 'modal-area', rows: '5', placeholder: 'Pega aquí el texto copiado…', 'aria-label': 'Texto a importar' });
      var msg = el('p', { class: 'nota', text: 'Los comentarios que ya tengas no se sobrescriben: solo se añaden los que falten.' });
      var b = el('button', { class: 'btn-p', type: 'button', text: 'Añadir comentarios' });
      b.addEventListener('click', function () {
        var nuevas = leerExport(area.value);
        if (!nuevas) { msg.textContent = 'No reconozco ese texto. Pega el texto completo tal y como se copió.'; return; }
        var actual = leerNotas(), add = 0, ya = 0;
        Object.keys(nuevas).forEach(function (c) {
          if (typeof nuevas[c] !== 'string' || !nuevas[c].trim()) return;
          if (actual[c]) { ya++; return; }
          actual[c] = nuevas[c].slice(0, 500); add++;
        });
        guardar('comentarios', JSON.stringify(actual));
        render();
        var m = document.querySelector('.zona-copia');
        if (m) m.appendChild(el('p', { class: 'nota', text: add + ' comentario(s) añadido(s)' + (ya ? ', ' + ya + ' ya existían y se han dejado como estaban.' : '.') }));
      });
      zona.appendChild(msg); zona.appendChild(area);
      zona.appendChild(el('div', { class: 'modal-btns' }, [b]));
    });
  }

  function pantallaAyuda(app) {
    cabecera('Ayuda', '', '#/');
    var ul = el('ul', { class: 'ayuda' });
    (datos.ayuda || []).forEach(function (t) { ul.appendChild(el('li', { text: t })); });
    app.appendChild(el('section', { class: 'bloque' }, [ul]));
  }

  /* ---------- pantalla 4a: un mes de turnos, los 5 equipos ---------- */
  function pantallaMesTurnos(app, emp, k) {
    var e = datos.empresas[emp];
    var equipos = e.turnos.equipos;
    cabecera(nombreMes(k), e.nombre, '#/' + emp + '/turnos', emp);
    if (!e.turnos.meses[k]) { app.appendChild(sinDatos('Aún no hay datos de este mes.')); return; }
    var p = k.split('-');
    var total = diasDelMes(k);
    var f1 = el('tr', null, [el('th', { class: 'eq', rowspan: '2', text: '' })]);
    var f2 = el('tr');
    var d;
    for (d = 1; d <= total; d++) {
      var cls = (esFinde(k, d) ? 'finde-h' : '') + (esFestivo(emp, k, d) ? ' fest-h' : '') +
        (k === ymHoy && d === hoy.getDate() ? ' hoy-col' : '');
      f1.appendChild(el('th', { class: cls, text: String(d) }));
      f2.appendChild(el('th', { class: cls, text: DIA_CORTO[new Date(+p[0], +p[1] - 1, d).getDay()] }));
    }
    var notas = leerNotas();
    var tbody = el('tbody');
    equipos.forEach(function (x) {
      var tr = el('tr', null, [el('th', { class: 'eq', text: x })]);
      for (var i = 1; i <= total; i++) {
        var t = turnoDe(emp, k, x, i);
        var cc = '';
        if (esFinde(k, i)) cc += ' finde';
        if (t === 'V') cc += ' V';
        if (k === ymHoy && i === hoy.getDate()) cc += ' hoy-col';
        if (notas[clNota(emp, k, i, x)]) cc += ' nota-c';
        var td = el('td', { class: cc.trim(), text: !t || t === '-' ? '' : t });
        td.setAttribute('data-d', String(i)); td.setAttribute('data-eq', x);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    });
    var tabla = el('table', { class: 't' }, [el('thead', null, [f1, f2]), tbody]);
    tabla.addEventListener('click', function (ev) {
      var td = ev.target.closest ? ev.target.closest('td') : null;
      if (!td || !td.getAttribute('data-d')) return;
      var dia = +td.getAttribute('data-d'), eq = td.getAttribute('data-eq');
      var t = turnoDe(emp, k, eq, dia);
      var nombreT = { M: 'Mañana', T: 'Tarde', N: 'Noche', V: 'Vacaciones' }[t] || 'Libre';
      panelNota('Equipo ' + eq + ' · ' + dia + ' de ' + MESES[+p[1] - 1] + ' de ' + p[0], nombreT,
        clNota(emp, k, dia, eq), function () {
          var sl = td.closest('.tabla-wrap').scrollLeft, sy = window.pageYOffset;
          render();
          var w = document.querySelector('.tabla-wrap');
          if (w) w.scrollLeft = sl;
          window.scrollTo(0, sy);
        });
    });
    app.appendChild(navVecinos(emp, 'turnos', k, Object.keys(e.turnos.meses).sort()));
    app.appendChild(el('section', { class: 'bloque' }, [el('div', { class: 'tabla-wrap' }, [tabla]), el('p', { class: 'nota', text: 'Desliza hacia los lados para ver todos los días. Toca un día para añadir un comentario.' })]));
  }

  /* ---------- pantalla 4b: un mes de ordinario ---------- */
  function pantallaMesOrdinario(app, emp, k) {
    var e = datos.empresas[emp];
    cabecera(nombreMes(k), e.nombre, '#/' + emp + '/ordinario', emp);
    var mes = e.ordinario.meses[k];
    if (!mes) { app.appendChild(sinDatos('Aún no hay datos de este mes.')); return; }
    var leyenda = el('ul', { class: 'leyenda' });
    [['J', 'Jornada 8,5 h'], ['R', 'Jornada 8 h'], ['I', 'Intensiva 6 / 6,5 h'], ['F', 'Festivo']].forEach(function (par) {
      leyenda.appendChild(el('li', null, [el('span', { class: 'p ' + par[0], text: par[0] }), document.createTextNode(' ' + par[1])]));
    });
    app.appendChild(navVecinos(emp, 'ordinario', k, Object.keys(e.ordinario.meses).sort()));
    app.appendChild(el('section', { class: 'bloque' }, [
      cuadricula(k, function (d) { return mes[d - 1]; }, { soloDia: true }),
      leyenda
    ]));
  }

  /* ---------- router ---------- */
  function render() {
    var h = location.hash.replace(/^#\/?/, '');
    var p = h ? h.split('/') : [];
    var app = document.getElementById('app');
    app.textContent = '';
    if (p[0] === 'comentarios') return pantallaComentarios(app);
    if (p[0] === 'ayuda') return pantallaAyuda(app);
    var emp = p[0] && datos.empresas[p[0]] ? p[0] : null;
    if (!emp) return pantallaInicio(app);
    if (p[1] === 'turnos') return p[2] ? pantallaMesTurnos(app, emp, p[2]) : pantallaMeses(app, emp, 'turnos');
    if (p[1] === 'ordinario') return p[2] ? pantallaMesOrdinario(app, emp, p[2]) : pantallaMeses(app, emp, 'ordinario');
    return pantallaEmpresa(app, emp);
  }

  window.addEventListener('hashchange', function () {
    render();
    window.scrollTo(0, 0);
  });

  fetch('data/cuadrante.json', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (j) { datos = j; render(); })
    .catch(function () {
      document.getElementById('app').textContent = 'No se pudo cargar el cuadrante. Comprueba la conexión.';
    });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* sin offline */ });
    });
  }
})();
