/* GRAPE-Bench project page: behaviour. All numbers come from window.GRAPE (the paper's tables, inlined by tools/build.py);
   the few written in the template carry the paper's text. */
(function () {
  'use strict';
  var DATA = window.GRAPE, D = document, root = D.documentElement;
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';
  var $ = function (id) { return D.getElementById(id); };
  function el(tag, attrs, text) { var e = D.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; return e; }
  function h(tag, cls, text) { var e = D.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function mean(a) { return a.reduce(function (s, v) { return s + v; }, 0) / a.length; }
  function f1(v) { return v.toFixed(1); }
  function sgn(v) { return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1); }
  function label(r) { return r.m + (r.size && r.size !== '--' ? ' ' + r.size : ''); }
  function tabs(box, items, cur, on) {
    var bs = items.map(function (it) {
      var b = h('button', '', it[1]); b.type = 'button'; b.setAttribute('aria-pressed', it[0] === cur ? 'true' : 'false');
      b.addEventListener('click', function () { bs.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); on(it[0]); });
      box.append(b); return b;
    });
  }
  var ICON = { play: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.6 1.2v9.6L10.6 6z" fill="currentColor"/></svg>', pause: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.4 1.5h2.5v9H2.4zM7.1 1.5h2.5v9H7.1z" fill="currentColor"/></svg>' };
  var SYN = {}, REAL = {};
  DATA.synth.forEach(function (r) { SYN[label(r)] = r; });
  DATA.real.forEach(function (r) { if (r.group !== 'tuned') REAL[label(r)] = r; });

  // ---------- theme ----------
  $('theme').addEventListener('click', function () {
    var cur = root.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'), next = cur === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next); try { localStorage.setItem('grape-theme', next); } catch (e) {}
  });

  // ---------- reveal on scroll ----------
  (function () {
    var nodes = [].slice.call(D.querySelectorAll('[data-r]'));
    function show(n) { n.classList.add('in'); }
    if (RM || !('IntersectionObserver' in window)) { setTimeout(function () { nodes.forEach(show); }, 0); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); show(e.target); } }); }, { rootMargin: '0px 0px -7% 0px', threshold: 0.04 });
    nodes.forEach(function (n) { io.observe(n); });
  })();

  // ---------- nav island and contents rail: the section in view gets the dark pill; on phones the links fold into a menu ----------
  (function () {
    var nav = $('island'), menu = $('menu'), pill = $('pill'), links = [].slice.call(D.querySelectorAll('#navlinks a')), rail = [].slice.call(D.querySelectorAll('#toc a')), cur = -2, busy = false;
    var secs = links.map(function (a) { return D.querySelector(a.getAttribute('href')); });
    function place() {
      var a = links[cur];
      if (!a) { pill.style.opacity = '0'; return; }
      pill.style.width = a.offsetWidth + 'px'; pill.style.transform = 'translateX(' + a.offsetLeft + 'px)'; pill.style.opacity = '1';
    }
    function upd() {
      busy = false; var c = -1;
      for (var i = 0; i < secs.length; i++) if (secs[i].getBoundingClientRect().top < 150) c = i;
      if (c !== cur) { cur = c; links.forEach(function (a, k) { a.classList.toggle('cur', k === c); }); rail.forEach(function (a, k) { a.classList.toggle('cur', k === c); }); place(); }
    }
    addEventListener('scroll', function () { if (!busy) { busy = true; requestAnimationFrame(upd); } }, { passive: true });
    addEventListener('resize', place);
    if (D.fonts && D.fonts.ready) D.fonts.ready.then(place);
    upd();
    function shut() { nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); }
    menu.addEventListener('click', function () { var o = nav.classList.toggle('open'); menu.setAttribute('aria-expanded', o ? 'true' : 'false'); });
    links.forEach(function (a) { a.addEventListener('click', shut); });
  })();

  // ---------- films: play while in view, click to pause ----------
  [].forEach.call(D.querySelectorAll('[data-film]'), function (node) {
    var v = node.querySelector('video'), btn = node.querySelector('.fp'), bar = node.querySelector('.fbar b'), want = !RM, seen = false;
    function sync() {
      if (want && seen) { if (!v.src) v.src = v.getAttribute('data-src'); var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause();
      node.classList.toggle('paused', !want); btn.innerHTML = want ? ICON.pause : ICON.play; btn.setAttribute('aria-label', want ? 'Pause' : 'Play');
    }
    node.addEventListener('click', function () { want = !want; sync(); });
    (function loop() { if (!v.paused && v.duration) bar.style.width = (100 * v.currentTime / v.duration).toFixed(2) + '%'; requestAnimationFrame(loop); })();
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { seen = es[0].isIntersecting; sync(); }, { threshold: 0.3 }).observe(node); else seen = true;
    sync();
  });

  // small looping clips (wall and gallery): load and play only while on screen
  function clip(file, poster) {
    var v = D.createElement('video'); v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.preload = 'none'; v.poster = poster; v.setAttribute('data-src', file); return v;
  }
  function watch(box, vids) {
    if (RM) return;
    function run(on) { vids.forEach(function (v) { if (on) { if (!v.src) v.src = v.getAttribute('data-src'); var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause(); }); }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { run(es[0].isIntersecting && getComputedStyle(box).display !== 'none'); }, { threshold: 0.05 }).observe(box); else run(true);
  }

  // ---------- hero wall: clips of the released sets fill the first screen; every tile has a still, and the ones on
  // screen (up to a cap) play as video ----------
  (function () {
    var wall = $('wall'), all = DATA.tiles.map(function (t) { return 'assets/video/t/' + t.f; }).concat(DATA.clips.map(function (c) { return 'assets/video/wall-' + ('0' + c.i).slice(-2); }));
    var n = all.length, NC = innerWidth < 700 ? 4 : innerWidth < 1150 ? 7 : 9, PER = innerWidth < 700 ? 9 : 11, CAP = innerWidth < 700 ? 10 : 26, tiles = [];
    for (var k = 0; k < NC; k++) {
      var col = h('div', 'wcol' + (k % 2 ? ' back' : '')), half = [];
      col.style.setProperty('--t', (190 + (k * 37) % 90) + 's');
      for (var i = 0; i < PER; i++) {
        var base = all[((k * PER + i) * 29 + k * 7) % n], d = h('div', 'tile'), im = new Image(), v = clip(base + '.mp4', '');
        im.src = base + '.jpg'; im.alt = ''; im.decoding = 'async'; v.removeAttribute('poster'); d.append(im, v); half.push(d);
      }
      half.forEach(function (x) { col.append(x); }); half.forEach(function (x) { col.append(x.cloneNode(true)); });
      wall.append(col);
    }
    if (RM || !('IntersectionObserver' in window)) return;
    var seen = [], playing = [];
    function sync() {
      playing = playing.filter(function (t) { if (seen.indexOf(t) >= 0) return true; var v = t.lastChild; v.pause(); v.classList.remove('on'); return false; });
      for (var i = 0; i < seen.length && playing.length < CAP; i++) {
        var t = seen[i]; if (playing.indexOf(t) >= 0) continue;
        var v = t.lastChild; v.muted = true; if (!v.getAttribute('src')) v.src = v.getAttribute('data-src');
        var p = v.play(); if (p && p.catch) p.catch(function () {}); v.classList.add('on'); playing.push(t);
      }
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { var k = seen.indexOf(e.target); if (e.isIntersecting && k < 0) seen.push(e.target); else if (!e.isIntersecting && k >= 0) seen.splice(k, 1); });
      sync();
    }, { threshold: 0.35 });
    [].forEach.call(wall.querySelectorAll('.tile'), function (t) { io.observe(t); });
  })();

  // ---------- the download command of the first screen ----------
  (function () {
    var cmd = $('run-cmd'), tabsBox = $('run-tabs'), btn = $('run-copy'), cur = 'Realworld';
    var SETS = [['Realworld', 'Real-world set · 572 videos'], ['Synthetic', 'Synthetic set · 10,841 videos, 187 GB']];
    function text() { return 'hf download grape-lab/GRAPE-Bench-' + cur + ' --repo-type dataset --local-dir GRAPE-Bench-' + cur; }
    function draw() { cmd.replaceChildren(D.createTextNode('hf download '), h('b', '', 'grape-lab/GRAPE-Bench-' + cur), D.createTextNode(' --repo-type dataset --local-dir GRAPE-Bench-' + cur)); cmd.setAttribute('aria-label', text()); }
    SETS.forEach(function (s) {
      var b = h('button', '', s[1]); b.type = 'button'; b.setAttribute('aria-pressed', s[0] === cur ? 'true' : 'false');
      b.addEventListener('click', function () { cur = s[0]; [].forEach.call(tabsBox.children, function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); draw(); });
      tabsBox.append(b);
    });
    btn.addEventListener('click', function () { if (navigator.clipboard) navigator.clipboard.writeText(text()).then(function () { btn.classList.add('ok'); setTimeout(function () { btn.classList.remove('ok'); }, 1400); }, function () {}); });
    draw();
  })();

  // ---------- shared: a tooltip that follows the pointer, and a short eased tween for redrawing charts ----------
  var tipEl = h('div', 'tip'); D.body.append(tipEl);
  function tip(node, e) {
    if (!node) { tipEl.classList.remove('on'); return; }
    if (typeof node === 'string') tipEl.textContent = node; else tipEl.replaceChildren(node);
    tipEl.classList.add('on');
    var x = Math.min(e.clientX + 14, innerWidth - tipEl.offsetWidth - 10), y = Math.min(e.clientY + 16, innerHeight - tipEl.offsetHeight - 10);
    tipEl.style.transform = 'translate(' + Math.max(6, x) + 'px,' + Math.max(6, y) + 'px)';
  }
  function tipRows(title, rows) { var d = h('div'); d.append(h('b', '', title)); rows.forEach(function (r) { var l = h('div'); l.append(h('span', '', r[0]), h('i', '', r[1])); d.append(l); }); return d; }
  function tween(ms, fn) {
    if (RM) { fn(1); return; }
    var t0 = performance.now();
    (function step(now) { var p = clamp((now - t0) / ms); fn(1 - Math.pow(1 - p, 3)); if (p < 1) requestAnimationFrame(step); })(t0);
  }
  function lerp(a, b, p) { return a + (b - a) * p; }
  function sizeB(r) { var m = /([\d.]+)([BT])/.exec(r.size || ''); return m ? parseFloat(m[1]) * (m[2] === 'T' ? 1000 : 1) : 0; }
  function logoImg(r) { var im = new Image(); im.src = 'assets/img/logos/' + r.logo + '.png'; im.alt = ''; im.loading = 'lazy'; return im; }
  function whenSeen(node, fn) { if (!('IntersectionObserver' in window)) { fn(); return; } var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); fn(); } }, { threshold: 0.2 }); io.observe(node); }

  // ---------- 03a: rank on a synthetic driving condition against rank on the real-world one, for any set of models ----------
  (function () {
    var body = $('rev-body'), links = $('rev-links'), chips = $('rev-chips'), read = $('rev-read'), cond = 'Rain', pin = null, hov = null;
    var ALL = Object.keys(SYN), on = {}, rows = {}, setBtns;
    var SETS = { five: ['MiniCPM-V 4.5 8B', 'InternVL3.5 8B', 'Cosmos-Reason2 8B', 'GLM-4.1V-Thinking 9B', 'VideoLLaMA3 7B'],
      small: ALL.filter(function (n) { var s = sizeB(SYN[n]); return s >= 7 && s <= 9; }), large: ALL.filter(function (n) { return sizeB(SYN[n]) >= 27; }), all: ALL };
    function val(n) { return { s: +mean(SYN[n].drive[cond]).toFixed(1), r: REAL[n].cond[cond][3] }; }
    ALL.forEach(function (n) {
      var c = h('button'); c.type = 'button'; c.append(logoImg(SYN[n]), D.createTextNode(n)); c.addEventListener('click', function () { on[n] = !on[n]; if (!Object.keys(on).some(function (k) { return on[k]; })) on[n] = true; pin = pin === n && !on[n] ? null : pin; setBtns(null); draw(); });
      chips.append(c);
      var mk = function (side) {
        var d = h('div', 'rr ' + side); d.append(h('i', 'rk'), logoImg(SYN[n]), h('span', 'nm', n), h('b', 'sc')); if (side === 'r') d.append(h('em', 'dl'));
        d.addEventListener('mouseenter', function () { hov = n; mark(); }); d.addEventListener('mouseleave', function () { hov = null; mark(); });
        d.addEventListener('click', function () { pin = pin === n ? null : n; mark(); });
        body.append(d); return d;
      };
      rows[n] = { chip: c, l: mk('l'), r: mk('r'), path: el('path', {}) }; links.append(rows[n].path);
    });
    function mark() {
      var a = hov || pin;
      body.classList.toggle('dim', !!a);
      ALL.forEach(function (n) { var hi = n === a; rows[n].l.classList.toggle('hi', hi); rows[n].r.classList.toggle('hi', hi); rows[n].path.classList.toggle('hi', hi); rows[n].l.classList.toggle('pin', n === pin); rows[n].r.classList.toggle('pin', n === pin); });
      readout(a);
    }
    function readout(a) {
      var act = ALL.filter(function (n) { return on[n]; });
      if (!a) { var best = act.slice().sort(function (x, y) { return (rows[y].ds || 0) - (rows[x].ds || 0); })[0]; a = best; }
      var S = SYN[a].drive[cond], R = REAL[a].cond[cond], d = rows[a], kids = [];
      var head = h('div', 'rd-h'); head.append(logoImg(SYN[a]), h('b', '', a), h('span', '', 'synthetic ' + cond.toLowerCase() + ' #' + (d.rs + 1) + ' → real-world ' + cond.toLowerCase() + ' #' + (d.rr + 1)));
      var badge = h('em', d.rr < d.rs ? 'up' : d.rr > d.rs ? 'dn' : 'eq', d.rr < d.rs ? '▲ ' + (d.rs - d.rr) : d.rr > d.rs ? '▼ ' + (d.rr - d.rs) : '=');
      head.append(badge); kids.push(head);
      var g = h('div', 'rd-g');
      ['L1', 'L2', 'L3'].forEach(function (L, k) {
        var c = h('div'); c.style.setProperty('--c', 'var(--l' + (k + 1) + ')');
        c.append(h('span', '', L), mini(S[k], 'var(--grape)'), h('i', '', f1(S[k])), mini(R[k], 'var(--teal)'), h('i', '', f1(R[k]))); g.append(c);
      });
      kids.push(g); read.replaceChildren.apply(read, kids);
    }
    function mini(v, col) { var t = h('div', 'mini'), i = h('u'); i.style.cssText = 'width:' + clamp((v - 30) / 65) * 100 + '%;background:' + col; t.append(i); return t; }
    function draw() {
      var act = ALL.filter(function (n) { return on[n]; }), dense = act.length > 9, RH = dense ? 27 : 46, W = body.clientWidth || 900, LW = Math.min(360, W * 0.4);
      var vals = {}; act.forEach(function (n) { vals[n] = val(n); });
      var bs = act.slice().sort(function (a, b) { return vals[b].s - vals[a].s; }), br = act.slice().sort(function (a, b) { return vals[b].r - vals[a].r; });
      body.style.height = act.length * RH + 'px'; body.classList.toggle('dense', dense); body.style.setProperty('--lw', LW + 'px');
      links.setAttribute('viewBox', '0 0 ' + W + ' ' + act.length * RH); links.style.height = act.length * RH + 'px';
      $('rev-hl').textContent = 'Synthetic ' + cond.toLowerCase(); $('rev-hr').textContent = 'Real-world ' + cond.toLowerCase();
      ALL.forEach(function (n) {
        var d = rows[n], is = !!on[n]; d.chip.setAttribute('aria-pressed', is ? 'true' : 'false');
        d.l.classList.toggle('off', !is); d.r.classList.toggle('off', !is); d.path.style.opacity = is ? '' : '0';
        if (!is) return;
        d.rs = bs.indexOf(n); d.rr = br.indexOf(n); d.ds = d.rs - d.rr;
        d.l.style.transform = 'translateY(' + d.rs * RH + 'px)'; d.r.style.transform = 'translateY(' + d.rr * RH + 'px)';
        d.l.querySelector('.rk').textContent = '#' + (d.rs + 1); d.r.querySelector('.rk').textContent = '#' + (d.rr + 1);
        d.l.querySelector('.sc').textContent = f1(vals[n].s); d.r.querySelector('.sc').textContent = f1(vals[n].r);
        var dl = d.r.querySelector('.dl'); dl.textContent = d.ds > 0 ? '▲' + d.ds : d.ds < 0 ? '▼' + -d.ds : ''; dl.className = 'dl ' + (d.ds > 0 ? 'up' : 'dn');
        var y1 = d.rs * RH + (RH - 5) / 2, y2 = d.rr * RH + (RH - 5) / 2, x1 = LW + 4, x2 = W - LW - 4, mx = (x2 - x1) * 0.45;
        d.path.setAttribute('d', 'M' + x1 + ' ' + y1 + 'C' + (x1 + mx) + ' ' + y1 + ' ' + (x2 - mx) + ' ' + y2 + ' ' + x2 + ' ' + y2);
        d.path.setAttribute('class', (d.ds > 0 ? 'up' : d.ds < 0 ? 'dn' : 'eq'));
      });
      mark();
    }
    tabs($('rev-cond'), DATA.drive.map(function (c) { return [c, c]; }), cond, function (c) { cond = c; draw(); });
    (function () {
      var box = $('rev-set'), items = [['five', 'Five of Figure 1'], ['small', '7–9B'], ['large', '27B and larger'], ['all', 'All 23']], bs = [];
      items.forEach(function (it) { var b = h('button', '', it[1]); b.type = 'button'; b.addEventListener('click', function () { on = {}; SETS[it[0]].forEach(function (n) { on[n] = true; }); if (pin && !on[pin]) pin = null; setBtns(it[0]); draw(); }); box.append(b); bs.push([it[0], b]); });
      setBtns = function (k) { bs.forEach(function (x) { x[1].setAttribute('aria-pressed', x[0] === k ? 'true' : 'false'); }); };
    })();
    SETS.five.forEach(function (n) { on[n] = true; }); setBtns('five'); pin = 'Cosmos-Reason2 8B';
    draw(); addEventListener('resize', draw);
  })();

  // ---------- 03b: one scene's three questions; safety-relevance ratings of all 1,716 real-world questions by level ----------
  (function () {
    var rowsBox = $('sf-rows'), svg = $('sf-chart'), read = $('sf-read'), type = 'all', prev = null;
    // the scene of the paper's Figure 1: share of the evaluated models that answer wrongly, and the safety relevance of each question
    [['Fundamental judgment', 'Did the ego vehicle stop because of a red traffic light?', 20, 85], ['Contextual reasoning', 'How does the electric two-wheeler move relative to its original lane?', 33, 82],
     ['Reasoning stress test', 'How many vehicles initially queue on the left side of the intersection?', 90, 38]].forEach(function (q, k) {
      var r = h('div', 'sf-r'), top = h('div', 'k'), m = h('div', 'ms'); r.style.setProperty('--c', 'var(--l' + (k + 1) + ')');
      top.append(h('b', '', 'L' + (k + 1)), h('strong', '', q[0]));
      [['models wrong', q[2], '%', 'd'], ['safety relevance', q[3], '', 's']].forEach(function (x) { var w = h('div', 'm ' + x[3]), t = h('div', 't'), i = h('u'); i.setAttribute('data-w', x[1]); t.append(i); w.append(h('span', '', x[0]), t, h('i', '', x[1] + x[2])); m.append(w); });
      r.append(top, h('p', '', q[1]), m); rowsBox.append(r);
    });
    whenSeen(rowsBox, function () { [].forEach.call(rowsBox.querySelectorAll('u'), function (u, k) { setTimeout(function () { u.style.width = u.getAttribute('data-w') + '%'; }, 120 + k * 90); }); });
    var S = DATA.fig.safety, LV = ['L1', 'L2', 'L3'], TYPES = [['all', 'All 1,716'], ['perception', 'Perception'], ['reasoning', 'Reasoning'], ['planning', 'Planning and prediction']];
    var W = 640, BH = 92, top = 14, left = 46, right = 14, PW = W - left - right, H = top + 3 * (BH + 16) + 24;
    function data() {
      return LV.map(function (L) {
        var v = type === 'all' ? S[L].perception.concat(S[L].planning, S[L].reasoning) : S[L][type], bins = [];
        for (var i = 0; i < 20; i++) bins.push(0);
        v.forEach(function (x) { bins[Math.min(19, Math.floor(x / 5))]++; });
        return { bins: bins, n: v.length, mean: v.length ? mean(v) : 0 };
      });
    }
    function draw() {
      var cur = data(), from = prev || cur.map(function (d) { return { bins: d.bins.map(function () { return 0; }), mean: d.mean, n: d.n }; }), max = 1;
      cur.concat(from).forEach(function (d) { d.bins.forEach(function (b) { if (b > max) max = b; }); });
      prev = cur;
      tween(650, function (p) {
        svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.replaceChildren();
        LV.forEach(function (L, k) {
          var y0 = top + k * (BH + 16), base = y0 + BH, col = 'var(--l' + (k + 1) + ')';
          svg.append(el('text', { x: 0, y: y0 + 22, 'class': 'sfL', fill: col }, L), el('text', { x: 0, y: y0 + 40, 'class': 'tk' }, 'n = ' + cur[k].n), el('path', { d: 'M' + left + ' ' + base + 'H' + (W - right), 'class': 'ax' }));
          cur[k].bins.forEach(function (b, i) {
            var v = lerp(from[k].bins[i], b, p), hh = v / max * (BH - 8), x = left + i * PW / 20 + 1.5, w = PW / 20 - 3;
            var r = el('rect', { x: x, y: base - hh, width: w, height: Math.max(hh, 0), rx: 3, fill: col, opacity: 0.85 });
            if (p === 1) { r.addEventListener('mousemove', function (e) { tip(tipRows(L + ' · rating ' + i * 5 + '–' + (i === 19 ? 100 : i * 5 + 4), [[b + ' question' + (b === 1 ? '' : 's'), (100 * b / (cur[k].n || 1)).toFixed(1) + '%']]), e); }); r.addEventListener('mouseleave', function () { tip(null); }); }
            svg.append(r);
          });
          var m = lerp(from[k].mean, cur[k].mean, p), mx = left + m / 100 * PW;
          svg.append(el('path', { d: 'M' + mx + ' ' + (y0 + 2) + 'V' + base, stroke: 'var(--ink)', 'stroke-width': 1.8 }), el('text', { x: mx + (m > 80 ? -6 : 6), y: y0 + 12, 'class': 'vl', 'text-anchor': m > 80 ? 'end' : 'start' }, 'mean ' + m.toFixed(1)));
        });
        [0, 20, 40, 60, 80, 100].forEach(function (v) { svg.append(el('text', { x: left + v / 100 * PW, y: H - 6, 'class': 'tk', 'text-anchor': 'middle' }, v)); });
      });
      read.textContent = 'Mean rating: ' + cur.map(function (d, k) { return LV[k] + ' ' + d.mean.toFixed(1); }).join(' · ') + (type === 'all' ? '' : ' (' + TYPES.filter(function (t) { return t[0] === type; })[0][1].toLowerCase() + ' questions only)');
    }
    tabs($('sf-type'), TYPES, type, function (t) { type = t; draw(); });
    whenSeen(svg, draw);
  })();

  // ---------- 03c: a deck of real-world question groups ----------
  (function () {
    var Q = DATA.questions, grid = $('qb-grid'), page = $('qb-page'), cond = 'all', at = 0, LV = ['Fundamental judgment', 'Contextual reasoning', 'Reasoning stress test'];
    function per() { return innerWidth < 700 ? 1 : innerWidth < 1050 ? 2 : 3; }
    function list() { return Q.filter(function (q) { return cond === 'all' || q.cond === cond; }); }
    function card(q) {
      var c = h('article', 'qc'), fig = h('figure'), im = new Image(), open = null;
      im.src = 'assets/img/q/' + ('0' + q.i).slice(-2) + '.jpg'; im.alt = 'A frame of a real-world driving video recorded in ' + q.cond; im.loading = 'lazy'; im.width = 480; im.height = 270;
      fig.append(im, h('span', 'chip', q.cond + ' · ' + q.src)); c.append(fig);
      q.q.forEach(function (x, k) {
        var b = h('button', 'qr'), k1 = h('span', 'k'), ul = h('ul'); b.type = 'button'; b.style.setProperty('--c', 'var(--l' + (k + 1) + ')'); b.setAttribute('aria-expanded', 'false');
        k1.append(h('b', '', 'L' + (k + 1)), h('em', '', x[3] + ' · ' + x[4]));
        x[1].forEach(function (o, m) { var L = 'ABCD'.charAt(m), li = h('li', L === x[2] ? 'ok' : ''); li.append(h('i', '', L), h('span', '', o)); ul.append(li); });
        b.append(k1, h('p', '', x[0]), ul);
        b.addEventListener('click', function () { if (open && open !== b) { open.classList.remove('open'); open.setAttribute('aria-expanded', 'false'); } var o = b.classList.toggle('open'); b.setAttribute('aria-expanded', o ? 'true' : 'false'); open = o ? b : null; });
        c.append(b);
      });
      return c;
    }
    function draw() {
      var L = list(), n = per(); at = Math.max(0, Math.min(at, Math.max(0, L.length - n)));
      grid.style.setProperty('--n', n); grid.replaceChildren.apply(grid, L.slice(at, at + n).map(card));
      page.textContent = (at + 1) + '–' + Math.min(L.length, at + n) + ' of ' + L.length;
      $('qb-prev').disabled = at === 0; $('qb-next').disabled = at + n >= L.length;
    }
    $('qb-prev').addEventListener('click', function () { at -= per(); draw(); }); $('qb-next').addEventListener('click', function () { at += per(); draw(); });
    tabs($('qb-cond'), [['all', 'All'], ['rain', 'Rain'], ['snow', 'Snow'], ['night', 'Night'], ['fog', 'Fog']], cond, function (c) { cond = c; at = 0; draw(); });
    draw(); var rw = per(); addEventListener('resize', function () { if (per() !== rw) { rw = per(); draw(); } });
  })();

  // ---------- 04a: what the two sets are made of (source datasets against corruption types / recording conditions) ----------
  (function () {
    var ST = DATA.stats, PAL = ['#6a4fc4', '#1f8e7d', '#d9822b', '#3f7fd1', '#c4567a', '#8a8f2a', '#7b6fa0'], PAL2 = ['#8b76dd', '#a995ea', '#5a3fb0', '#c2b4f2', '#2aa893', '#56bfae', '#167866', '#83d2c5', '#0f5f51', '#a9e0d6', '#3a9c8b', '#6fc9ba'];
    [].forEach.call(D.querySelectorAll('.st-set'), function (box) {
      var key = box.getAttribute('data-set'), S = ST[key], svg = box.querySelector('svg'), leg = box.querySelector('.st-leg'), dimB = key === 'syn' ? 'corr' : 'cond', act = null, parts = [];
      var A = S.src.map(function (x) { return { k: 'a', name: x[0], n: x[1] }; }), B = S[dimB].map(function (x) { return { k: 'b', name: x[0].charAt(0).toUpperCase() + x[0].slice(1), raw: x[0], n: x[1] }; });
      var total = A.reduce(function (s, x) { return s + x.n; }, 0), cross = {};
      S.cross.forEach(function (c) { cross[c[0] + '|' + c[1]] = c[2]; });
      function crossN(a, b) { return cross[a.name + '|' + (b.raw || b.name)] || 0; }
      function arc(r0, r1, a0, a1) {
        var p = function (r, a) { return (150 + r * Math.sin(a)).toFixed(2) + ' ' + (150 - r * Math.cos(a)).toFixed(2); }, big = a1 - a0 > Math.PI ? 1 : 0;
        return 'M' + p(r1, a0) + 'A' + r1 + ' ' + r1 + ' 0 ' + big + ' 1 ' + p(r1, a1) + 'L' + p(r0, a1) + 'A' + r0 + ' ' + r0 + ' 0 ' + big + ' 0 ' + p(r0, a0) + 'Z';
      }
      svg.setAttribute('viewBox', '0 0 300 300');
      [[A, 112, 142, PAL], [B, 74, 104, key === 'syn' ? PAL2 : ['#6a4fc4', '#3f7fd1', '#17131f', '#1f8e7d', '#8b869a']]].forEach(function (ring) {
        var a = 0;
        ring[0].forEach(function (it, i) {
          var a1 = a + it.n / total * Math.PI * 2, path = el('path', { d: arc(ring[1], ring[2], a + 0.012, a1 - 0.012), fill: ring[3][i % ring[3].length] });
          it.col = ring[3][i % ring[3].length]; it.path = path; a = a1; svg.append(path); parts.push(it);
          path.addEventListener('mouseenter', function () { set(it, true); }); path.addEventListener('mouseleave', function () { set(null, true); }); path.addEventListener('click', function () { pinned = pinned === it ? null : it; set(pinned); });
        });
      });
      var c1 = el('text', { x: 150, y: 142, 'class': 'dn1', 'text-anchor': 'middle' }), c2 = el('text', { x: 150, y: 164, 'class': 'dn2', 'text-anchor': 'middle' }), c3 = el('text', { x: 150, y: 181, 'class': 'dn2', 'text-anchor': 'middle' }); svg.append(c1, c2, c3);
      var pinned = null, rows = [];
      [['Source dataset', A], [key === 'syn' ? 'Corruption' : 'Condition', B]].forEach(function (g) {
        var col = h('div'); col.append(h('div', 'lab', g[0]));
        g[1].forEach(function (it) {
          var r = h('button', 'lg'), sw = h('i'); r.type = 'button'; sw.style.background = it.col; it.cnt = h('b', '', it.n.toLocaleString('en-US')); r.append(sw, h('span', '', it.name), it.cnt); it.row = r; col.append(r);
          r.addEventListener('mouseenter', function () { set(it, true); }); r.addEventListener('mouseleave', function () { set(null, true); }); r.addEventListener('click', function () { pinned = pinned === it ? null : it; set(pinned); });
        });
        leg.append(col);
      });
      function set(it, hover) {
        act = it || (hover ? pinned : null);
        parts.forEach(function (x) {
          var n = !act ? x.n : x === act ? x.n : x.k === act.k ? 0 : (act.k === 'a' ? crossN(act, x) : crossN(x, act)), on = !act || x === act || n > 0;
          x.path.style.opacity = on ? (act && x !== act ? 0.25 + 0.75 * Math.sqrt(n / x.n) : 1) : 0.12; x.row.classList.toggle('off', !on); x.row.classList.toggle('on', x === act);
          x.cnt.textContent = (!act || x === act ? x.n : n).toLocaleString('en-US');
        });
        c1.textContent = act ? act.name : total.toLocaleString('en-US'); c2.textContent = act ? act.n.toLocaleString('en-US') + ' videos' : 'videos';
        c3.textContent = act ? (100 * act.n / total).toFixed(1) + '% of the set' : (total * 3).toLocaleString('en-US') + ' questions';
      }
      set(null);
    });
  })();

  // ---------- 04b: one video per corruption, with clean against corrupted accuracy ----------
  (function () {
    var box = $('cg'), order = 'pool', vids = [], tiles = {};
    var TEXT = { 'Rain': 'Falling streaks in layers, overcast light, haze and a wet road.', 'Snow': 'Layers of airborne flakes with a whitish haze.', 'Night': 'The daytime scene relit: dark sky, lamps, glare and sensor noise.',
      'Fog': 'A drifting layer of fog that sharply lowers contrast.', 'Wet lens': 'Water droplets on the lens refract the scene behind them.', 'Glass occlusion': 'Patches of blurred, fogged glass cover part of the frame.',
      'Overexposure': 'Blown-out highlights wipe out detail in bright areas.', 'Underexposure': 'A far too dark exposure crushes the shadows.', 'Defocus': 'The whole frame out of focus.',
      'Motion blur': 'Camera shake with exposure trails.', 'Low bitrate': 'Very low bitrate H.264 with visible blocking.', 'Bit error': 'Damage in the compressed stream: smears and frozen blocks.' };
    DATA.corr.forEach(function (c) {
      var S = DATA.cx[c.c], t = h('article', 'ct'), fig = h('figure'), v = clip('assets/video/cx/' + S.f + '.mp4', 'assets/video/cx/' + S.f + '.jpg'), bars = h('div', 'cb'), ov = h('div', 'ov');
      v.setAttribute('aria-label', 'A video with the ' + c.c.toLowerCase() + ' corruption'); fig.append(v, h('span', 'chip', c.pool === 'driving' ? 'driving' : 'daily life'), ov); vids.push(v);
      ov.append(h('div', 'lab', 'Change by level'));
      c.lv.forEach(function (x, k) { var r = h('div'); r.style.setProperty('--c', 'var(--l' + (k + 1) + ')'); var tr = h('div', 't'), u = h('u'); u.style.width = (100 * -x / 28) + '%'; tr.append(u); r.append(h('span', '', 'L' + (k + 1)), tr, h('i', '', sgn(x))); ov.append(r); });
      [['clean', c.clean, 'var(--faint)'], ['corrupted', c.corr, 'var(--grape)']].forEach(function (x) { var r = h('div'), tr = h('div', 't'), u = h('u'); u.style.background = x[2]; u.setAttribute('data-w', x[1]); tr.append(u); r.append(h('span', '', x[0]), tr, h('i', '', f1(x[1]))); bars.append(r); });
      var hd = h('div', 'hd'); hd.append(h('h4', '', c.c), h('em', '', sgn(c.d)));
      t.append(fig, hd, h('p', '', TEXT[c.c]), bars); tiles[c.c] = t;
    });
    function place() { var L = DATA.corr.slice(); if (order === 'loss') L.sort(function (a, b) { return a.d - b.d; }); L.forEach(function (c) { box.append(tiles[c.c]); }); }
    tabs($('cg-sort'), [['pool', 'Driving, then daily life'], ['loss', 'Largest loss first']], order, function (o) { order = o; place(); });
    place(); watch(box, vids);
    whenSeen(box, function () { [].forEach.call(box.querySelectorAll('.cb u'), function (u) { u.style.width = u.getAttribute('data-w') + '%'; }); });
  })();

  // ---------- 04c: eight real-world videos with their three questions ----------
  (function () {
    var G = DATA.gallery, vbox = $('rw-video'), thumbs = $('rw-thumbs'), qbox = $('rw-q'), v = clip('', ''), chip = h('span', 'chip');
    var LV = ['Fundamental judgment', 'Contextual reasoning', 'Reasoning stress test'];
    vbox.append(v, chip);
    function show(i) {
      var g = G[i], base = 'assets/video/rw/' + g.f;
      v.poster = base + '.jpg'; v.setAttribute('data-src', base + '.mp4'); v.setAttribute('aria-label', 'A real-world driving video recorded in ' + g.cond);
      if (v.getAttribute('src')) { v.src = base + '.mp4'; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      chip.textContent = g.cond + ' · ' + g.src;
      [].forEach.call(thumbs.children, function (b, k) { b.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
      qbox.replaceChildren.apply(qbox, g.q.map(function (q, k) {
        var d = h('div', 'rq'), kk = h('div', 'k'), ul = h('ul'); d.style.setProperty('--c', 'var(--l' + (k + 1) + ')');
        kk.append(h('b', '', 'L' + (k + 1)), h('strong', '', LV[k]));
        q[1].forEach(function (o, m) { var L = 'ABCD'.charAt(m), li = h('li', L === q[2] ? 'ok' : ''); li.append(h('i', '', L), h('span', '', o)); ul.append(li); });
        d.append(kk, h('p', '', q[0]), ul); return d;
      }));
    }
    G.forEach(function (g, i) {
      var b = h('button'), im = new Image(); b.type = 'button'; b.setAttribute('aria-label', 'Example ' + (i + 1) + ': ' + g.cond); im.src = 'assets/video/rw/' + g.f + '.jpg'; im.alt = ''; im.loading = 'lazy';
      b.append(im, h('span', '', g.cond)); b.addEventListener('click', function () { show(i); }); thumbs.append(b);
    });
    watch(vbox, [v]); show(0);
  })();

  // ---------- 03: leaderboard ----------
  (function () {
    var table = $('lb-table'), cap = $('lb-cap'), viewBox = $('lb-view'), groupBox = $('lb-group'), set = 'real', view = 'All', group = 'all', sort = null, asc = false;
    function cols() {
      if (set === 'real') return [['L1', function (r) { return (view === 'All' ? r.all : r.cond[view])[0]; }], ['L2', function (r) { return (view === 'All' ? r.all : r.cond[view])[1]; }],
        ['L3', function (r) { return (view === 'All' ? r.all : r.cond[view])[2]; }], ['Avg.', function (r) { return (view === 'All' ? r.all : r.cond[view])[3]; }, 1]];
      if (view === 'Overall') return [['All', function (r) { return r.all; }, 1], ['Δ vs. clean', function (r) { return r.delta; }]];
      if (view === 'Daily life') return DATA.daily.map(function (c, k) { return [c.replace('occlusion', 'occl.').replace('exposure', 'exp.'), function (r) { return r.daily[c]; }, k === 0 ? 1 : 0]; });
      return [['L1', function (r) { return r.drive[view][0]; }], ['L2', function (r) { return r.drive[view][1]; }], ['L3', function (r) { return r.drive[view][2]; }], ['L1–L3 mean', function (r) { return +mean(r.drive[view]).toFixed(1); }, 1]];
    }
    function draw() {
      var C = cols(), keyI = 0; C.forEach(function (c, k) { if (c[2]) keyI = k; });
      if (sort == null || sort >= C.length) { sort = keyI; asc = false; }
      var rows = set === 'synth' ? DATA.synth.slice() : DATA.real.filter(function (r) { return group === 'tuned' ? r.group === 'tuned' : r.group !== 'tuned' && (group === 'all' || r.group === group); });
      var get = C[sort][1]; rows.sort(function (a, b) { return asc ? get(a) - get(b) : get(b) - get(a); });
      var kv = rows.map(C[keyI][1]), lo = Math.min.apply(null, kv), hi = Math.max.apply(null, kv);
      var thead = h('thead'), tr = h('tr'), tbody = h('tbody');
      tr.append(h('th', '', '#'), h('th', '', 'Model'));
      C.forEach(function (c, k) { var th = h('th', k === sort ? 'sort' + (asc ? ' asc' : '') : '', c[0]); th.addEventListener('click', function () { if (sort === k) asc = !asc; else { sort = k; asc = false; } draw(); }); tr.append(th); });
      thead.append(tr);
      rows.forEach(function (r, i) {
        var row = h('tr', r.group === 'tuned' ? 'tuned' : ''), md = h('td', 'md'), im = new Image();
        im.src = 'assets/img/logos/' + r.logo + '.png'; im.alt = ''; im.loading = 'lazy'; md.append(im, D.createTextNode(r.m));
        if (r.size && r.size !== '--') md.append(h('small', '', r.size));
        if (r.group === 'proprietary') md.append(h('em', '', 'API'));
        row.append(h('td', 'rk', String(i + 1)), md);
        C.forEach(function (c, k) {
          var v = c[1](r), td = h('td', (k === keyI ? 'key' : '') + (v < 0 ? ' neg' : ''));
          if (k === keyI) { var b = h('i'); b.style.width = 'calc(' + (18 + 82 * (v - lo) / (hi - lo || 1)).toFixed(1) + '% - 16px)'; td.append(b, h('span', '', f1(v))); } else td.textContent = v < 0 ? sgn(v) : f1(v);
          row.append(td);
        });
        tbody.append(row);
      });
      table.replaceChildren(thead, tbody);
      cap.textContent = set === 'real'
        ? (group === 'tuned' ? 'Qwen3.5-9B before and after training on the synthetic set (rank-16 LoRA); the real-world set is used only for testing. ' : '') + (view === 'All' ? 'All 572 videos (1,716 questions), including 20 labelled "others".' : 'Real-world ' + view.toLowerCase() + ' videos.') + ' Click a column to sort.'
        : (view === 'Overall' ? 'All twelve corruptions and three levels (32,523 questions). Δ is corrupted minus clean accuracy on the same questions, in percentage points.' : view === 'Daily life' ? 'Daily-life corruptions, questions pooled over L1–L3.' : 'Synthetic ' + view.toLowerCase() + ' on driving videos; the mean over L1–L3 is computed here from the three level scores.') + ' Click a column to sort.';
    }
    function menus() {
      viewBox.replaceChildren(h('span', 'lbl', 'VIEW')); groupBox.replaceChildren(h('span', 'lbl', 'MODELS'));
      var V = set === 'real' ? ['All'].concat(DATA.drive) : ['Overall'].concat(DATA.drive, ['Daily life']);
      view = V[0]; sort = null;
      tabs(viewBox, V.map(function (v) { return [v, v === 'All' ? 'All conditions' : v]; }), view, function (v) { view = v; sort = null; draw(); });
      groupBox.hidden = set !== 'real'; group = 'all';
      if (set === 'real') tabs(groupBox, [['all', 'All 30'], ['open', 'Open-weight'], ['proprietary', 'Proprietary'], ['tuned', 'Fine-tuned Qwen3.5-9B']], group, function (g) { group = g; sort = null; draw(); });
      draw();
    }
    tabs($('lb-set'), [['real', 'Real-world driving'], ['synth', 'Synthetic corruptions']], set, function (s) { set = s; menus(); });
    menus();
  })();

  // ---------- 05: findings. Every chart redraws with a short tween when its controls change, and answers the pointer ----------
  function frame(svg, W, H) { svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.replaceChildren(); }
  function legend(svg, items, x, y) { items.forEach(function (it) { svg.append(el('rect', { x: x, y: y - 9, width: 11, height: 11, rx: 3, fill: it[1] }), el('text', { x: x + 16, y: y + 1, 'class': 'tk' }, it[0])); x += 26 + it[0].length * 6.7; }); }
  function hover(node, title, rows) { node.addEventListener('mousemove', function (e) { tip(tipRows(title, rows), e); }); node.addEventListener('mouseleave', function () { tip(null); }); }
  function fill(sel, names, cur) { names.forEach(function (n) { var o = h('option', '', n); o.value = n; if (n === cur) o.selected = true; sel.append(o); }); }
  // grouped vertical bars; series = [[name, colour, values]]; `from` = the values drawn before (for the tween)
  function grouped(svg, groups, series, lo, hi, p, from, unit) {
    var W = 520, H = 300, top = 34, bot = H - 30, Y = function (v) { return bot - (clamp((v - lo) / (hi - lo))) * (bot - top); }, gw = (W - 50) / groups.length, bw = Math.min(36, (gw - 22) / series.length);
    frame(svg, W, H); legend(svg, series.map(function (s) { return [s[0], s[1]]; }), 40, 16);
    for (var v = lo; v <= hi; v += 5) svg.append(el('path', { 'class': 'ax', d: 'M40 ' + Y(v) + 'H' + W, opacity: 0.6 }), el('text', { x: 34, y: Y(v) + 4, 'class': 'tk', 'text-anchor': 'end' }, v));
    groups.forEach(function (g, k) {
      var x0 = 46 + k * gw + (gw - series.length * (bw + 3)) / 2;
      series.forEach(function (s, j) {
        var to = s[2][k], val = lerp(from && from[j] ? from[j][k] : lo, to, p), x = x0 + j * (bw + 3), r = el('rect', { x: x, y: Y(val), width: bw, height: Math.max(bot - Y(val), 0), rx: 4, fill: s[1] });
        if (p === 1) hover(r, s[0], [[g, f1(to) + (unit || '%')]]);
        svg.append(r, el('text', { x: x + bw / 2, y: Y(val) - 5 - (series.length > 2 && j % 2 ? 11 : 0), 'class': 'vl', 'text-anchor': 'middle', 'font-size': series.length > 2 ? 10 : 11.5 }, f1(val)));
      });
      svg.append(el('text', { x: 46 + k * gw + gw / 2, y: H - 8, 'class': 'lb2', 'text-anchor': 'middle' }, g));
    });
  }

  (function () {      // 1a: any model against any other, synthetic and real-world, per driving condition
    var svg = $('f1-chart'), cap = $('f1-cap'), A = $('f1-a'), B = $('f1-b'), names = Object.keys(SYN), prev = null;
    var PRE = [['Gemma 4 31B', 'Cosmos-Reason2 32B'], ['InternVL3.5 38B', 'Cosmos-Reason2 32B'], ['MiniCPM-V 4.5 8B', 'Cosmos-Reason2 8B'], ['Qwen3.8-Flash-Next 125B', 'Qwen3.6 27B']];
    fill(A, names, PRE[0][0]); fill(B, names, PRE[0][1]);
    function draw() {
      var a = A.value, b = B.value, W = 520, H = 300, mid = 156, U = 12.5;
      var cur = DATA.drive.map(function (c) { return [+(mean(SYN[a].drive[c]) - mean(SYN[b].drive[c])).toFixed(1), +(REAL[a].cond[c][3] - REAL[b].cond[c][3]).toFixed(1)]; }), from = prev || cur.map(function () { return [0, 0]; });
      prev = cur;
      var lim = Math.max(8, Math.ceil(Math.max.apply(null, cur.map(function (x) { return Math.max(Math.abs(x[0]), Math.abs(x[1])); })) / 4) * 4); U = 110 / lim;
      tween(550, function (p) {
        frame(svg, W, H); legend(svg, [['synthetic', 'var(--grape)'], ['real-world', 'var(--teal)']], 40, 16);
        for (var v = -lim; v <= lim; v += lim / 2) svg.append(el('path', { 'class': 'ax', d: 'M40 ' + (mid - v * U) + 'H' + W, opacity: v ? 0.6 : 1 }), el('text', { x: 34, y: mid - v * U + 4, 'class': 'tk', 'text-anchor': 'end' }, (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v)));
        DATA.drive.forEach(function (c, k) {
          var x = 76 + k * 112;
          [[0, 'var(--grape)', 0, 'Synthetic '], [1, 'var(--teal)', 40, 'Real-world ']].forEach(function (s) {
            var to = cur[k][s[0]], val = lerp(from[k][s[0]], to, p), hh = Math.abs(val) * U, y = val >= 0 ? mid - hh : mid, r = el('rect', { x: x + s[2], y: y, width: 36, height: Math.max(hh, 1), rx: 4, fill: s[1] });
            if (p === 1) hover(r, s[3] + c.toLowerCase(), [[a, f1(s[0] ? REAL[a].cond[c][3] : mean(SYN[a].drive[c])) + '%'], [b, f1(s[0] ? REAL[b].cond[c][3] : mean(SYN[b].drive[c])) + '%'], ['difference', sgn(to) + ' pp']]);
            svg.append(r, el('text', { x: x + s[2] + 18, y: val >= 0 ? y - 5 : y + hh + 13, 'class': 'vl', 'text-anchor': 'middle' }, sgn(val)));
          });
          svg.append(el('text', { x: x + 38, y: H - 8, 'class': 'lb2', 'text-anchor': 'middle' }, c));
        });
      });
      var flips = cur.filter(function (x) { return x[0] * x[1] < 0; }).length;
      cap.textContent = a + ' minus ' + b + ', in percentage points of accuracy over L1–L3. ' + (flips ? 'The sign flips in ' + flips + ' of 4 conditions.' : 'The sign is the same on both sets in all four conditions.');
      [].forEach.call($('f1-pre').children, function (c, k) { c.setAttribute('aria-pressed', PRE[k][0] === a && PRE[k][1] === b ? 'true' : 'false'); });
    }
    PRE.forEach(function (pp) { var c = h('button', '', pp[0].replace(/ \d.*$/, '') + ' vs. ' + pp[1].replace(/ \d.*$/, '')); c.type = 'button'; c.title = pp[0] + ' minus ' + pp[1]; c.addEventListener('click', function () { A.value = pp[0]; B.value = pp[1]; draw(); }); $('f1-pre').append(c); });
    A.addEventListener('change', draw); B.addEventListener('change', draw); whenSeen(svg, draw);
  })();
  (function () {      // 1b: two models by level, on the real-world set or one of its conditions
    var svg = $('f1b-chart'), A = $('f1c-a'), B = $('f1c-b'), names = Object.keys(REAL), set = 'All', prev = null;
    fill(A, names, 'Kimi K3 2.8T'); fill(B, names, 'Qwen3.8-Flash-Next 125B');
    function vals(n) { return set === 'All' ? REAL[n].all : REAL[n].cond[set]; }
    function draw() {
      var a = A.value, b = B.value, cur = [vals(a), vals(b)], from = prev; prev = cur;
      tween(550, function (p) { grouped(svg, ['L1', 'L2', 'L3', 'Avg.'], [[a, 'var(--grape)', cur[0]], [b, 'var(--amber)', cur[1]]], 45, 100, p, from); });
      var d = cur[0].map(function (v, k) { return v - cur[1][k]; }), lead = d[3] >= 0 ? a : b, other = d[3] >= 0 ? b : a, s = d[3] >= 0 ? 1 : -1, behind = ['L1', 'L2', 'L3'].filter(function (L, k) { return d[k] * s < 0; });
      $('f1b-cap').textContent = 'Real-world set' + (set === 'All' ? '' : ', ' + set.toLowerCase()) + '. ' + lead + ' leads on average by ' + Math.abs(d[3]).toFixed(1) + ' points' + (behind.length ? ', yet trails ' + other + ' at ' + behind.join(' and ') + '.' : ', and at every level.');
    }
    tabs($('f1c-set'), [['All', 'All conditions']].concat(DATA.drive.map(function (c) { return [c, c]; })), set, function (s) { set = s; draw(); });
    A.addEventListener('change', draw); B.addEventListener('change', draw); whenSeen(svg, draw);
  })();

  (function () {      // 2a: the sizes of one model family on both sets
    var svg = $('f2-chart'), FAM = { 'Qwen3.5': ['0.8B', '2B', '4B', '9B', '27B'], 'InternVL3.5': ['4B', '8B', '14B', '38B'], 'Cosmos-Reason2': ['8B', '32B'], 'Qwen3-VL': ['4B', '8B'], 'Ovis2.5': ['2B', '9B'] }, fam = 'Qwen3.5';
    function draw() {
      var sizes = FAM[fam], W = 520, H = 300, lo = 50, hi = 90, top = 34, bot = H - 46, Y = function (v) { return bot - (v - lo) / (hi - lo) * (bot - top); }, X = function (k) { return sizes.length > 1 ? 86 + k * (W - 140) / (sizes.length - 1) : W / 2; };
      tween(700, function (p) {
        frame(svg, W, H); legend(svg, [['synthetic (All)', 'var(--grape)'], ['real-world (Avg.)', 'var(--teal)']], 40, 16);
        for (var v = lo; v <= hi; v += 10) svg.append(el('path', { 'class': 'ax', d: 'M40 ' + Y(v) + 'H' + W, opacity: 0.6 }), el('text', { x: 34, y: Y(v) + 4, 'class': 'tk', 'text-anchor': 'end' }, v));
        [['var(--grape)', function (s) { return SYN[fam + ' ' + s].all; }, 17, 'Synthetic set'], ['var(--teal)', function (s) { return REAL[fam + ' ' + s].all[3]; }, -10, 'Real-world set']].forEach(function (L) {
          var pts = sizes.map(function (s, k) { return [X(k), Y(lerp(lo, L[1](s), p)), L[1](s)]; });
          svg.append(el('path', { d: 'M' + pts.map(function (q) { return q[0] + ' ' + q[1].toFixed(1); }).join('L'), fill: 'none', stroke: L[0], 'stroke-width': 2.6, 'stroke-linejoin': 'round' }));
          pts.forEach(function (q, k) { var c = el('circle', { cx: q[0], cy: q[1], r: 6, fill: L[0], stroke: 'var(--surface)', 'stroke-width': 2 }); if (p === 1) hover(c, fam + ' ' + sizes[k], [[L[3], f1(q[2]) + '%']]); svg.append(c, el('text', { x: q[0], y: q[1] + L[2], 'class': 'vl', 'text-anchor': 'middle' }, f1(lerp(lo, q[2], p)))); });
        });
        sizes.forEach(function (s, k) { svg.append(el('text', { x: X(k), y: H - 26, 'class': 'lb2', 'text-anchor': 'middle' }, s), el('text', { x: X(k), y: H - 9, 'class': 'tk', 'text-anchor': 'middle', fill: 'var(--red)' }, 'Δ ' + sgn(SYN[fam + ' ' + s].delta))); });
      });
      var first = sizes[0], last = sizes[sizes.length - 1], worse = sizes.filter(function (s, k) { return k && REAL[fam + ' ' + s].all[3] < REAL[fam + ' ' + sizes[k - 1]].all[3]; });
      $('f2-cap').textContent = fam + ' from ' + first + ' to ' + last + ': synthetic ' + f1(SYN[fam + ' ' + first].all) + ' → ' + f1(SYN[fam + ' ' + last].all) + '%, real-world ' + f1(REAL[fam + ' ' + first].all[3]) + ' → ' + f1(REAL[fam + ' ' + last].all[3]) + '%.' + (worse.length ? ' The ' + worse.join(', ') + ' model is behind its smaller sibling on real-world video.' : '') + ' Δ: loss against clean video.';
    }
    tabs($('f2-fam'), Object.keys(FAM).map(function (f) { return [f, f]; }), fam, function (f) { fam = f; draw(); });
    whenSeen(svg, draw);
  })();
  (function () {      // 2b: clean against corrupted accuracy for every model of the synthetic set; sortable
    var svg = $('f2b-chart'), order = 'acc', pos = {}, W = 520, RH = 15.5, top = 30, lo = 50, hi = 92, hot = null;
    var X = function (v) { return 178 + (v - lo) / (hi - lo) * (W - 228); };
    function draw(animate) {
      var rows = DATA.synth.slice().sort(order === 'acc' ? function (a, b) { return b.all - a.all; } : order === 'loss' ? function (a, b) { return a.delta - b.delta; } : function (a, b) { return sizeB(b) - sizeB(a); }), H = top + rows.length * RH + 22, from = {};
      rows.forEach(function (r, k) { from[label(r)] = pos[label(r)] == null ? k : pos[label(r)]; pos[label(r)] = k; });
      var paint = function (p) {
        frame(svg, W, H); legend(svg, [['corrupted', 'var(--grape)'], ['clean', 'var(--faint)']], 178, 16);
        for (var v = 50; v <= 90; v += 10) svg.append(el('path', { 'class': 'ax', d: 'M' + X(v) + ' ' + (top - 4) + 'V' + (H - 20), opacity: 0.6 }), el('text', { x: X(v), y: H - 6, 'class': 'tk', 'text-anchor': 'middle' }, v));
        rows.forEach(function (r, k) {
          var n = label(r), y = top + lerp(from[n], k, p) * RH + RH / 2, clean = r.all - r.delta, g = el('g', { opacity: hot && hot !== n ? 0.3 : 1 });
          g.append(el('rect', { x: 0, y: y - RH / 2, width: W, height: RH, fill: 'transparent' }), el('text', { x: 170, y: y + 3.5, 'class': 'tk', 'text-anchor': 'end', fill: 'var(--ink)', 'font-weight': hot === n ? 700 : 500 }, n),
            el('path', { d: 'M' + X(r.all) + ' ' + y + 'H' + X(clean), stroke: hot === n ? 'var(--red)' : 'var(--line)', 'stroke-width': 3, 'stroke-linecap': 'round' }),
            el('circle', { cx: X(clean), cy: y, r: 3.6, fill: 'var(--faint)' }), el('circle', { cx: X(r.all), cy: y, r: 4.4, fill: 'var(--grape)' }), el('text', { x: W - 2, y: y + 3.5, 'class': 'tk', 'text-anchor': 'end', fill: 'var(--red)' }, sgn(r.delta)));
          if (p === 1) {
            g.addEventListener('mousemove', function (e) { tip(tipRows(n, [['clean video', f1(clean) + '%'], ['corrupted video', f1(r.all) + '%'], ['change', sgn(r.delta) + ' pp']]), e); if (hot !== n) { hot = n; paint(1); } });
            g.addEventListener('mouseleave', function () { tip(null); });
          }
          svg.append(g);
        });
      };
      svg.onmouseleave = function () { tip(null); if (hot) { hot = null; paint(1); } };
      if (animate) tween(600, paint); else paint(1);
    }
    tabs($('f2-sort'), [['acc', 'By accuracy'], ['loss', 'By loss'], ['size', 'By size']], order, function (o) { order = o; draw(true); });
    whenSeen(svg, function () { draw(true); });
  })();

  (function () {      // 3: Qwen3.5-9B on the real-world set, before and after training on synthetic data
    var T = DATA.real.filter(function (r) { return r.group === 'tuned'; }), names = ['Qwen3.5-9B', 'SFT', 'SFT + reasoning', 'OPSD + reasoning'], col = ['var(--faint)', 'var(--grape)', 'var(--l2)', 'var(--teal)'];
    var svg = $('f3-chart'), leg = $('f3-leg'), on = [true, true, true, true], prevA = null, svgB = $('f3b-chart'), cond = 'All', prevB = null;
    function drawA() {
      var series = T.map(function (r, k) { return [names[k], col[k], r.all, k]; }).filter(function (s) { return on[s[3]]; }), from = prevA; prevA = null;
      tween(550, function (p) { grouped(svg, ['L1', 'L2', 'L3', 'Avg.'], series, 60, 92, p, from); });
      $('f3-cap').textContent = 'Qwen3.5-9B on the real-world set: ' + T.map(function (r, k) { return names[k] + ' ' + f1(r.all[3]) + '%'; }).join(', ') + '. Click a recipe to hide or show it.';
    }
    names.forEach(function (n, k) {
      var c = h('button'), sw = h('i'); c.type = 'button'; sw.style.background = col[k]; c.append(sw, D.createTextNode(n)); c.setAttribute('aria-pressed', 'true');
      c.addEventListener('click', function () { on[k] = !on[k]; if (!on.some(Boolean)) on[k] = true; c.setAttribute('aria-pressed', on[k] ? 'true' : 'false'); drawA(); }); leg.append(c);
    });
    function drawB() {
      var get = function (r) { return cond === 'All' ? r.all : r.cond[cond]; }, base = get(T[0]), cur = T.slice(1).map(function (r) { return get(r).map(function (v, k) { return +(v - base[k]).toFixed(1); }); }), from = prevB || cur.map(function (s) { return s.map(function () { return 0; }); });
      prevB = cur;
      var W = 520, H = 300, mid = 190, lim = 12, U = 150 / lim, groups = ['L1', 'L2', 'L3', 'Avg.'], gw = (W - 50) / 4, bw = 30;
      tween(550, function (p) {
        frame(svgB, W, H); legend(svgB, names.slice(1).map(function (n, k) { return [n, col[k + 1]]; }), 40, 16);
        [-4, 0, 4, 8, 12].forEach(function (v) { svgB.append(el('path', { 'class': 'ax', d: 'M40 ' + (mid - v * U) + 'H' + W, opacity: v ? 0.6 : 1 }), el('text', { x: 34, y: mid - v * U + 4, 'class': 'tk', 'text-anchor': 'end' }, (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v))); });
        groups.forEach(function (g, k) {
          var x0 = 46 + k * gw + (gw - 3 * (bw + 3)) / 2;
          cur.forEach(function (s, j) {
            var to = s[k], val = lerp(from[j][k], to, p), hh = Math.abs(val) * U, y = val >= 0 ? mid - hh : mid, r = el('rect', { x: x0 + j * (bw + 3), y: y, width: bw, height: Math.max(hh, 1), rx: 4, fill: col[j + 1] });
            if (p === 1) hover(r, names[j + 1] + ' · ' + g, [['unadapted', f1(base[k]) + '%'], ['after training', f1(base[k] + to) + '%'], ['gain', sgn(to) + ' pp']]);
            svgB.append(r, el('text', { x: x0 + j * (bw + 3) + bw / 2, y: val >= 0 ? y - 5 : y + hh + 12, 'class': 'vl', 'text-anchor': 'middle', 'font-size': 10 }, sgn(val)));
          });
          svgB.append(el('text', { x: 46 + k * gw + gw / 2, y: H - 8, 'class': 'lb2', 'text-anchor': 'middle' }, g));
        });
      });
    }
    tabs($('f3-cond'), [['All', 'All conditions']].concat(DATA.drive.map(function (c) { return [c, c]; })), cond, function (c) { cond = c; drawB(); });
    whenSeen(svg, drawA); whenSeen(svgB, drawB);
  })();

  (function () {      // 4: accuracy by level across the steering coefficient; a slider moves the coefficient
    var F = DATA.fig.steer, svg = $('st4-chart'), range = $('st4-range'), read = $('st4-read'), play = $('st4-play'), set = 'syn', i = 4, timer = 0, shown = 0;
    var W = 900, H = 330, left = 52, right = 80, top = 18, bot = H - 34;
    function draw(p) {
      var S = F[set], lo = Math.floor((Math.min.apply(null, S.L3) - 2) / 5) * 5, hi = Math.ceil((Math.max.apply(null, S.L1) + 1) / 5) * 5, X = function (k) { return left + k * (W - left - right) / 8; }, Y = function (v) { return bot - (v - lo) / (hi - lo) * (bot - top); };
      frame(svg, W, H);
      for (var v = lo; v <= hi; v += 5) svg.append(el('path', { 'class': 'ax', d: 'M' + left + ' ' + Y(v) + 'H' + (W - right), opacity: 0.6 }), el('text', { x: left - 8, y: Y(v) + 4, 'class': 'tk', 'text-anchor': 'end' }, v));
      F.lam.forEach(function (l, k) { svg.append(el('text', { x: X(k), y: H - 10, 'class': 'tk', 'text-anchor': 'middle', 'font-weight': k === i ? 700 : 500, fill: k === i ? 'var(--ink)' : 'var(--faint)' }, (l > 0 ? '+' : l < 0 ? '−' : '') + Math.abs(l))); });
      var n = Math.max(1, Math.round(8 * p)), band = 'M' + S.L1.slice(0, n + 1).map(function (v, k) { return X(k) + ' ' + Y(v); }).join('L') + 'L' + S.L3.slice(0, n + 1).map(function (v, k) { return X(k) + ' ' + Y(v); }).reverse().join('L') + 'Z';
      svg.append(el('path', { d: band, fill: 'var(--grape)', opacity: 0.07 }));
      svg.append(el('path', { d: 'M' + X(i) + ' ' + top + 'V' + bot, stroke: 'var(--ink)', 'stroke-width': 1.5, 'stroke-dasharray': '4 4', opacity: 0.55 }));
      [['L2', 'var(--l2)', 2, '5 4'], ['All', 'var(--ink)', 2.4, '2 5'], ['L3', 'var(--l3)', 3.2, null], ['L1', 'var(--l1)', 3.2, null]].forEach(function (L) {
        var pts = S[L[0]].slice(0, n + 1).map(function (v, k) { return [X(k), Y(v)]; }), a = { d: 'M' + pts.map(function (q) { return q[0] + ' ' + q[1].toFixed(1); }).join('L'), fill: 'none', stroke: L[1], 'stroke-width': L[2], 'stroke-linejoin': 'round', 'stroke-linecap': 'round' };
        if (L[3]) a['stroke-dasharray'] = L[3];
        svg.append(el('path', a));
        pts.forEach(function (q, k) { svg.append(el('circle', { cx: q[0], cy: q[1], r: k === i ? 7 : L[3] ? 2.6 : 4, fill: L[1], stroke: 'var(--surface)', 'stroke-width': k === i ? 2.5 : 1.5 })); });
        if (p === 1) svg.append(el('text', { x: W - right + 10, y: Y(S[L[0]][8]) + 4, 'class': 'lb2', fill: L[1] }, L[0] === 'All' ? 'All' : L[0]));
      });
      if (p === 1) ['L1', 'L3'].forEach(function (L) { svg.append(el('text', { x: X(i), y: Y(S[L][i]) + (L === 'L1' ? -13 : 22), 'class': 'vl', 'text-anchor': 'middle', 'font-size': 13 }, f1(S[L][i]))); });
      var hit = el('rect', { x: left - 20, y: top, width: W - left - right + 40, height: bot - top, fill: 'transparent' }); hit.style.cursor = 'ew-resize';
      hit.addEventListener('mousemove', function (e) { var r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, k = Math.round(clamp((x - left) / (W - left - right)) * 8); if (k !== i) { stop(); i = k; range.value = k; draw(1); } });
      svg.append(hit);
      var l = F.lam[i], gap = S.L1[i] - S.L3[i], kids = [];
      [['λ', (l > 0 ? '+' : l < 0 ? '−' : '') + Math.abs(l).toFixed(2), 'var(--ink)'], ['L1', f1(S.L1[i]) + '%', 'var(--l1)'], ['L2', f1(S.L2[i]) + '%', 'var(--l2)'], ['L3', f1(S.L3[i]) + '%', 'var(--l3)'], ['All', f1(S.All[i]) + '%', 'var(--ink)'], ['L1 − L3', sgn(gap) + ' pp', 'var(--grape)']].forEach(function (x) {
        var d = h('div'); d.append(h('span', '', x[0]), h('b', '', x[1])); d.lastChild.style.color = x[2]; kids.push(d);
      });
      read.replaceChildren.apply(read, kids);
    }
    function stop() { if (timer) { clearInterval(timer); timer = 0; play.classList.remove('on'); play.innerHTML = ICON.play; } }
    play.innerHTML = ICON.play;
    play.addEventListener('click', function () { if (timer) { stop(); return; } play.classList.add('on'); play.innerHTML = ICON.pause; i = 0; range.value = 0; draw(1); timer = setInterval(function () { if (i >= 8) { stop(); return; } i++; range.value = i; draw(1); }, 620); });
    range.addEventListener('input', function () { stop(); i = +range.value; draw(1); });
    tabs($('st4-set'), [['syn', 'Synthetic driving'], ['real', 'Real-world driving']], set, function (s) { set = s; tween(700, draw); });
    whenSeen(svg, function () { tween(900, draw); });
  })();

  // ---------- figures open large; copy BibTeX ----------
  (function () {
    var dlg = $('zoom'), im = dlg.querySelector('img');
    D.addEventListener('click', function (e) { var t = e.target.closest('[data-zoom]'); if (!t || !dlg.showModal) return; e.preventDefault(); im.src = t.getAttribute('data-zoom') || t.src; im.alt = t.alt || ''; dlg.showModal(); });
    dlg.addEventListener('click', function () { dlg.close(); });
    [].forEach.call(D.querySelectorAll('[data-copy]'), function (b) {
      b.addEventListener('click', function () { if (navigator.clipboard) navigator.clipboard.writeText($(b.getAttribute('data-copy')).textContent).then(function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy'; }, 1600); }, function () {}); });
    });
  })();
})();
