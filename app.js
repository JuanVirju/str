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
  var estado = {
    ym: ymHoy,
    equipo: leer('equipo'),
    vista: leer('vista') || 'mi'
  };

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

  function turno(ymKey, equipo, dia) {
    var mes = datos.meses[ymKey];
    if (!mes || !mes[equipo]) return null;
    var c = mes[equipo].charAt(dia - 1);
    return c ? c : null;
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

  /* ---------- Tarjeta "Hoy" ---------- */
  function pintarHoy() {
    var cont = document.getElementById('hoy');
    cont.textContent = '';
    var d = hoy.getDate();
    cont.appendChild(el('p', { class: 'fecha', text: DIA_LARGO[hoy.getDay()] + ' ' + d + ' de ' + MESES[hoy.getMonth()] }));

    var t = estado.equipo ? turno(ymHoy, estado.equipo, d) : null;
    if (!estado.equipo) {
      cont.appendChild(el('p', { class: 'grande', text: 'Elige tu equipo' }));
    } else if (!t) {
      cont.appendChild(el('p', { class: 'grande', text: 'Sin datos de hoy' }));
    } else {
      var g = el('p', { class: 'grande', text: NOMBRE[t] });
      g.appendChild(el('small', { text: '  · Equipo ' + estado.equipo }));
      cont.appendChild(g);
    }

    var q = el('p', { class: 'quien' });
    var alguno = false;
    ['M', 'T', 'N'].forEach(function (s) {
      var eqs = datos.equipos.filter(function (e) { return turno(ymHoy, e, d) === s; });
      if (eqs.length) {
        alguno = true;
        q.appendChild(el('span', { text: NOMBRE[s] + ': ' + eqs.join(', ') }));
      }
    });
    if (alguno) cont.appendChild(q);
  }

  /* ---------- Selector de equipo ---------- */
  function pintarEquipos() {
    var cont = document.getElementById('equipos');
    cont.textContent = '';
    datos.equipos.forEach(function (e) {
      var b = el('button', { type: 'button', role: 'radio', 'aria-checked': String(estado.equipo === e), text: e });
      b.addEventListener('click', function () {
        estado.equipo = e;
        guardar('equipo', e);
        pintarTodo();
      });
      cont.appendChild(b);
    });
  }

  /* ---------- Vista: calendario del equipo ---------- */
  function vistaMi() {
    var cont = el('div');
    if (!estado.equipo) {
      cont.appendChild(el('p', { class: 'sin-datos', text: 'Elige tu equipo arriba para ver tu calendario.' }));
      return cont;
    }
    if (!datos.meses[estado.ym]) {
      cont.appendChild(el('p', { class: 'sin-datos', text: 'Aún no hay datos de este mes.' }));
      return cont;
    }
    var grid = el('div', { class: 'cal' });
    ['L', 'M', 'MI', 'J', 'V', 'S', 'D'].forEach(function (n) { grid.appendChild(el('div', { class: 'dn', text: n })); });

    var p = estado.ym.split('-');
    var primero = new Date(+p[0], +p[1] - 1, 1).getDay();
    var hueco = (primero + 6) % 7;
    for (var i = 0; i < hueco; i++) grid.appendChild(el('div', { class: 'c vacio' }));

    var total = diasDelMes(estado.ym);
    for (var d = 1; d <= total; d++) {
      var t = turno(estado.ym, estado.equipo, d);
      var clases = 'c';
      if (esFinde(estado.ym, d)) clases += ' finde';
      if (estado.ym === ymHoy && d === hoy.getDate()) clases += ' hoy-c';
      if (t && t !== '-') clases += ' ' + t;
      var txt = t ? (t === '-' ? '·' : t) : '?';
      grid.appendChild(el('div', { class: clases }, [
        el('span', { class: 'd', text: String(d) }),
        el('span', { class: 's', text: txt })
      ]));
    }
    cont.appendChild(grid);
    return cont;
  }

  /* ---------- Vista: tabla A-E ---------- */
  function vistaTabla() {
    var cont = el('div');
    if (!datos.meses[estado.ym]) {
      cont.appendChild(el('p', { class: 'sin-datos', text: 'Aún no hay datos de este mes.' }));
      return cont;
    }
    var p = estado.ym.split('-');
    var total = diasDelMes(estado.ym);
    var tabla = el('table', { class: 't' });
    var thead = el('thead');
    var f1 = el('tr', null, [el('th', { class: 'eq', rowspan: '2', text: '' })]);
    var f2 = el('tr');
    for (var d = 1; d <= total; d++) {
      var fin = esFinde(estado.ym, d);
      var esHoy = estado.ym === ymHoy && d === hoy.getDate();
      var cls = (fin ? 'finde-h' : '') + (esHoy ? ' hoy-col' : '');
      var dow = new Date(+p[0], +p[1] - 1, d).getDay();
      f1.appendChild(el('th', { class: cls, text: String(d) }));
      f2.appendChild(el('th', { class: cls, text: DIA_CORTO[dow] }));
    }
    thead.appendChild(f1);
    thead.appendChild(f2);
    tabla.appendChild(thead);

    var tbody = el('tbody');
    datos.equipos.forEach(function (e) {
      var tr = el('tr', { class: e === estado.equipo ? 'mi' : '' }, [el('th', { class: 'eq', text: e })]);
      for (var d = 1; d <= total; d++) {
        var t = turno(estado.ym, e, d);
        var c = '';
        if (esFinde(estado.ym, d)) c += ' finde';
        if (t === 'V') c += ' V';
        if (!t) c += ' sd';
        if (estado.ym === ymHoy && d === hoy.getDate()) c += ' hoy-col';
        var txt = t ? (t === '-' ? '' : t) : '?';
        tr.appendChild(el('td', { class: c.trim(), text: txt }));
      }
      tbody.appendChild(tr);
    });
    tabla.appendChild(tbody);
    cont.appendChild(el('div', { class: 'tabla-wrap' }, [tabla]));
    return cont;
  }

  /* ---------- Pintado general ---------- */
  function pintarMes() {
    document.getElementById('mes-titulo').textContent = nombreMes(estado.ym);
    var vi = document.getElementById('vista');
    vi.textContent = '';
    vi.appendChild(estado.vista === 'tabla' ? vistaTabla() : vistaMi());
    document.getElementById('v-mi').setAttribute('aria-selected', String(estado.vista !== 'tabla'));
    document.getElementById('v-tabla').setAttribute('aria-selected', String(estado.vista === 'tabla'));
  }

  function pintarEnlaces() {
    var cont = document.getElementById('enlaces');
    cont.textContent = '';
    (datos.enlaces || []).forEach(function (e) {
      cont.appendChild(el('a', { href: e.url, target: '_blank', rel: 'noopener', text: e.texto }));
    });
  }

  function pintarTodo() {
    pintarHoy();
    pintarEquipos();
    pintarMes();
  }

  function moverMes(delta) {
    var p = estado.ym.split('-');
    var f = new Date(+p[0], +p[1] - 1 + delta, 1);
    estado.ym = ym(f.getFullYear(), f.getMonth() + 1);
    pintarMes();
  }

  function iniciar() {
    document.getElementById('lugar').textContent = datos.lugar || '';
    document.getElementById('prev').addEventListener('click', function () { moverMes(-1); });
    document.getElementById('next').addEventListener('click', function () { moverMes(1); });
    document.getElementById('v-mi').addEventListener('click', function () { estado.vista = 'mi'; guardar('vista', 'mi'); pintarMes(); });
    document.getElementById('v-tabla').addEventListener('click', function () { estado.vista = 'tabla'; guardar('vista', 'tabla'); pintarMes(); });
    pintarEnlaces();
    pintarTodo();
  }

  fetch('data/cuadrante.json', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (j) { datos = j; iniciar(); })
    .catch(function () {
      document.getElementById('hoy').textContent = 'No se pudo cargar el cuadrante. Comprueba la conexión.';
    });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* sin offline */ });
    });
  }
})();
