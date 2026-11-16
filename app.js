(function () {
  'use strict';

  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var DIA_CORTO = ['D', 'L', 'M', 'MI', 'J', 'V', 'S'];
  var DIA_LARGO = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var NOMBRE = { M: 'Mañana', T: 'Tarde', N: 'Noche', V: 'V', '-': 'Libre' };

  var datos = null;
  var hoy = new Date();
  var ymHoy = ym(hoy.getFullYear(), hoy.getMonth() + 1);
  var estado = { ym: ymHoy, vista: leer('vista') || 'mi' };

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
  function cabecera(titulo, sub, atras) {
    document.getElementById('titulo').textContent = titulo;
    document.getElementById('sub').textContent = sub || '';
    var a = document.getElementById('atras');
    if (atras) { a.setAttribute('href', atras); a.hidden = false; } else { a.hidden = true; }
    document.title = titulo + (sub ? ' · ' + sub : '');
  }

  // Logo: si el archivo no existe, se muestra la inicial de la empresa.
  function logo(emp, clase) {
    var e = datos.empresas[emp];
    var caja = el('div', { class: 'logo ' + (clase || '') });
    var img = el('img', { src: e.logo, alt: e.nombre, loading: 'lazy' });
    img.addEventListener('error', function () {
      caja.textContent = '';
      caja.classList.add('ph');
      caja.appendChild(el('span', { text: e.nombre.charAt(0) }));
    });
    caja.appendChild(img);
    return caja;
  }

  function bloqueEnlaces(emp, sec) {
    var cont = el('section', { class: 'bloque' }, [el('h2', { text: 'Información' })]);
    var cfg = (datos.empresas[emp].enlaces || {})[sec] || {};
    var lista = el('div', { class: 'enlaces' });
    [['convenio', 'Convenio colectivo'], ['faq', 'Preguntas frecuentes y dudas']].forEach(function (par) {
      var url = cfg[par[0]];
      if (url) {
        lista.appendChild(el('a', { href: url, target: '_blank', rel: 'noopener', text: par[1] }));
      } else {
        lista.appendChild(el('span', { class: 'pronto', 'aria-disabled': 'true', text: par[1] + ' (próximamente)' }));
      }
    });
    cont.appendChild(lista);
    return cont;
  }

  function navMes(alCambiar) {
    var titulo = el('strong', { text: nombreMes(estado.ym) });
    function mover(delta) {
      var p = estado.ym.split('-');
      var f = new Date(+p[0], +p[1] - 1 + delta, 1);
      estado.ym = ym(f.getFullYear(), f.getMonth() + 1);
      titulo.textContent = nombreMes(estado.ym);
      alCambiar();
    }
    var prev = el('button', { type: 'button', 'aria-label': 'Mes anterior', text: '‹' });
    var next = el('button', { type: 'button', 'aria-label': 'Mes siguiente', text: '›' });
    prev.addEventListener('click', function () { mover(-1); });
    next.addEventListener('click', function () { mover(1); });
    return el('nav', { class: 'mes-nav', 'aria-label': 'Cambiar de mes' }, [prev, titulo, next]);
  }

  // Cuadricula mensual generica (lunes primero). codigo(d) devuelve el codigo del dia o null.
  function cuadricula(ymKey, codigo) {
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
      if (t && t !== '-') clases += ' ' + t;
      grid.appendChild(el('div', { class: clases }, [
        el('span', { class: 'd', text: String(d) }),
        el('span', { class: 's', text: t ? (t === '-' ? '·' : t) : '?' })
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
  }

  /* ---------- pantalla 2: menu de la empresa ---------- */
  function pantallaEmpresa(app, emp) {
    cabecera(datos.empresas[emp].nombre, '', '#/');
    app.appendChild(el('div', { class: 'banner' }, [logo(emp, 'grande')]));
    app.appendChild(el('div', { class: 'tiles uno' }, [
      el('a', { class: 'tile ancho', href: '#/' + emp + '/turnos' }, [
        el('span', { class: 'tile-t', text: 'Cuadrante de turnos' }),
        el('span', { class: 'tile-s', text: 'Tu turno de hoy y del mes' })
      ]),
      el('a', { class: 'tile ancho', href: '#/' + emp + '/ordinario' }, [
        el('span', { class: 'tile-t', text: 'Calendario ordinario' }),
        el('span', { class: 'tile-s', text: 'Jornada ordinaria y festivos' })
      ])
    ]));
  }

  /* ---------- pantalla 3a: cuadrante de turnos ---------- */
  function pantallaTurnos(app, emp) {
    var e = datos.empresas[emp];
    var equipos = e.turnos.equipos;
    var claveEq = 'equipo:' + emp;
    var equipo = leer(claveEq);
    if (equipos.indexOf(equipo) < 0) equipo = null;
    cabecera('Cuadrante de turnos', e.nombre, '#/' + emp);

    var cardHoy = el('section', { class: 'hoy', 'aria-live': 'polite' });
    var chips = el('div', { class: 'chips', role: 'radiogroup', 'aria-label': 'Elegir equipo' });
    var vista = el('div');
    var btnMi = el('button', { type: 'button', role: 'tab', text: 'Mi calendario' });
    var btnTabla = el('button', { type: 'button', role: 'tab', text: 'Tabla A–E' });

    function pintarHoy() {
      cardHoy.textContent = '';
      var d = hoy.getDate();
      cardHoy.appendChild(el('p', { class: 'fecha', text: DIA_LARGO[hoy.getDay()] + ' ' + d + ' de ' + MESES[hoy.getMonth()] }));
      var t = equipo ? turnoDe(emp, ymHoy, equipo, d) : null;
      if (!equipo) cardHoy.appendChild(el('p', { class: 'grande', text: 'Elige tu equipo' }));
      else if (!t) cardHoy.appendChild(el('p', { class: 'grande', text: 'Sin datos de hoy' }));
      else cardHoy.appendChild(el('p', { class: 'grande' }, [document.createTextNode(NOMBRE[t]), el('small', { text: '  · Equipo ' + equipo })]));
      var q = el('p', { class: 'quien' });
      var alguno = false;
      ['M', 'T', 'N'].forEach(function (s) {
        var eqs = equipos.filter(function (x) { return turnoDe(emp, ymHoy, x, d) === s; });
        if (eqs.length) { alguno = true; q.appendChild(el('span', { text: NOMBRE[s] + ': ' + eqs.join(', ') })); }
      });
      if (alguno) cardHoy.appendChild(q);
    }

    function pintarEquipos() {
      chips.textContent = '';
      equipos.forEach(function (x) {
        var b = el('button', { type: 'button', role: 'radio', 'aria-checked': String(equipo === x), text: x });
        b.addEventListener('click', function () { equipo = x; guardar(claveEq, x); pintarHoy(); pintarEquipos(); pintarVista(); });
        chips.appendChild(b);
      });
    }

    function vistaMi() {
      var c = el('div');
      if (!equipo) { c.appendChild(sinDatos('Elige tu equipo arriba para ver tu calendario.')); return c; }
      if (!e.turnos.meses[estado.ym]) { c.appendChild(sinDatos('Aún no hay datos de este mes.')); return c; }
      c.appendChild(cuadricula(estado.ym, function (d) { return turnoDe(emp, estado.ym, equipo, d); }));
      return c;
    }

    function vistaTabla() {
      var c = el('div');
      if (!e.turnos.meses[estado.ym]) { c.appendChild(sinDatos('Aún no hay datos de este mes.')); return c; }
      var p = estado.ym.split('-');
      var total = diasDelMes(estado.ym);
      var f1 = el('tr', null, [el('th', { class: 'eq', rowspan: '2', text: '' })]);
      var f2 = el('tr');
      var d;
      for (d = 1; d <= total; d++) {
        var cls = (esFinde(estado.ym, d) ? 'finde-h' : '') + (estado.ym === ymHoy && d === hoy.getDate() ? ' hoy-col' : '');
        f1.appendChild(el('th', { class: cls, text: String(d) }));
        f2.appendChild(el('th', { class: cls, text: DIA_CORTO[new Date(+p[0], +p[1] - 1, d).getDay()] }));
      }
      var tbody = el('tbody');
      equipos.forEach(function (x) {
        var tr = el('tr', { class: x === equipo ? 'mi' : '' }, [el('th', { class: 'eq', text: x })]);
        for (var k = 1; k <= total; k++) {
          var t = turnoDe(emp, estado.ym, x, k);
          var cc = '';
          if (esFinde(estado.ym, k)) cc += ' finde';
          if (t === 'V') cc += ' V';
          if (!t) cc += ' sd';
          if (estado.ym === ymHoy && k === hoy.getDate()) cc += ' hoy-col';
          tr.appendChild(el('td', { class: cc.trim(), text: t ? (t === '-' ? '' : t) : '?' }));
        }
        tbody.appendChild(tr);
      });
      var tabla = el('table', { class: 't' }, [el('thead', null, [f1, f2]), tbody]);
      c.appendChild(el('div', { class: 'tabla-wrap' }, [tabla]));
      return c;
    }

    function pintarVista() {
      vista.textContent = '';
      vista.appendChild(estado.vista === 'tabla' ? vistaTabla() : vistaMi());
      btnMi.setAttribute('aria-selected', String(estado.vista !== 'tabla'));
      btnTabla.setAttribute('aria-selected', String(estado.vista === 'tabla'));
    }
    btnMi.addEventListener('click', function () { estado.vista = 'mi'; guardar('vista', 'mi'); pintarVista(); });
    btnTabla.addEventListener('click', function () { estado.vista = 'tabla'; guardar('vista', 'tabla'); pintarVista(); });

    var leyenda = el('ul', { class: 'leyenda' });
    [['M', 'Mañana'], ['T', 'Tarde'], ['N', 'Noche'], ['V', 'V'], ['L', 'Libre']].forEach(function (par) {
      leyenda.appendChild(el('li', null, [el('span', { class: 'p ' + par[0], text: par[0] === 'L' ? '·' : par[0] }), document.createTextNode(' ' + par[1])]));
    });

    app.appendChild(cardHoy);
    app.appendChild(el('section', { class: 'bloque' }, [el('h2', { text: 'Mi equipo' }), chips]));
    app.appendChild(el('section', { class: 'bloque' }, [
      navMes(pintarVista),
      el('div', { class: 'vistas', role: 'tablist' }, [btnMi, btnTabla]),
      vista,
      leyenda
    ]));
    app.appendChild(bloqueEnlaces(emp, 'turnos'));
    pintarHoy(); pintarEquipos(); pintarVista();
  }

  /* ---------- pantalla 3b: calendario ordinario ---------- */
  function pantallaOrdinario(app, emp) {
    var e = datos.empresas[emp];
    cabecera('Calendario ordinario', e.nombre, '#/' + emp);
    var vista = el('div');
    function pintar() {
      vista.textContent = '';
      if (!e.ordinario.meses[estado.ym]) { vista.appendChild(sinDatos('Aún no hay datos de este mes.')); return; }
      vista.appendChild(cuadricula(estado.ym, function (d) { return ordinarioDe(emp, estado.ym, d); }));
    }
    var leyenda = el('ul', { class: 'leyenda' });
    [['J', 'Jornada'], ['F', 'Festivo'], ['L', 'Libre']].forEach(function (par) {
      leyenda.appendChild(el('li', null, [el('span', { class: 'p ' + par[0], text: par[0] === 'L' ? '·' : par[0] }), document.createTextNode(' ' + par[1])]));
    });
    app.appendChild(el('section', { class: 'bloque' }, [navMes(pintar), vista, leyenda]));
    app.appendChild(bloqueEnlaces(emp, 'ordinario'));
    pintar();
  }

  /* ---------- router ---------- */
  function render() {
    var h = location.hash.replace(/^#\/?/, '');
    var p = h ? h.split('/') : [];
    var app = document.getElementById('app');
    app.textContent = '';
    var emp = p[0] && datos.empresas[p[0]] ? p[0] : null;
    if (!emp) return pantallaInicio(app);
    if (p[1] === 'turnos') return pantallaTurnos(app, emp);
    if (p[1] === 'ordinario') return pantallaOrdinario(app, emp);
    return pantallaEmpresa(app, emp);
  }

  window.addEventListener('hashchange', function () {
    estado.ym = ymHoy;
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
