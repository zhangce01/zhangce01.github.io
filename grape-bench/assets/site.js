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

  // ---------- 01: rank on a synthetic driving condition against rank on the real-world one ----------
  (function () {
    var svg = $('rev-chart'), cap = $('rev-cap'), cond = 'Rain', set = 'five', hi = null;
    var SETS = { five: ['MiniCPM-V 4.5 8B', 'InternVL3.5 8B', 'Cosmos-Reason2 8B', 'GLM-4.1V-Thinking 9B', 'VideoLLaMA3 7B'], all: Object.keys(SYN) };
    function draw() {
      var names = SETS[set], rows = names.map(function (n) { return { n: n, s: +mean(SYN[n].drive[cond]).toFixed(1), r: REAL[n].cond[cond][3] }; });
      var bs = rows.slice().sort(function (a, b) { return b.s - a.s; }), br = rows.slice().sort(function (a, b) { return b.r - a.r; });
      rows.forEach(function (x) { x.rs = bs.indexOf(x); x.rr = br.indexOf(x); });
      var dense = rows.length > 8, RH = dense ? 23 : 46, BH = dense ? 19 : 36, W = 780, LW = 300, top = 26, H = top + rows.length * RH + 4;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('class', dense ? 'dense' : ''); svg.replaceChildren();
      svg.append(el('text', { x: 0, y: 12, 'class': 'hd' }, 'SYNTHETIC ' + cond.toUpperCase()), el('text', { x: W, y: 12, 'class': 'hd', 'text-anchor': 'end' }, 'REAL-WORLD ' + cond.toUpperCase()));
      var act = hi || (set === 'five' ? ['Cosmos-Reason2 8B', 'MiniCPM-V 4.5 8B'] : ['Cosmos-Reason2 32B', 'Gemma 4 31B']);
      function isHi(n) { return act.indexOf(n) >= 0; }
      rows.forEach(function (x) {
        var y1 = top + x.rs * RH + BH / 2, y2 = top + x.rr * RH + BH / 2, dir = x.rr < x.rs ? 'up' : x.rr > x.rs ? 'dn' : 'eq';
        svg.append(el('path', { 'class': 'ln ' + dir + (isHi(x.n) ? ' hi' : ''), d: 'M' + LW + ' ' + y1 + 'C' + (LW + 80) + ' ' + y1 + ' ' + (W - LW - 80) + ' ' + y2 + ' ' + (W - LW) + ' ' + y2 }));
      });
      [['rs', 's', 0], ['rr', 'r', W - LW]].forEach(function (side) {
        rows.forEach(function (x) {
          var g = el('g', { 'class': 'row' + (isHi(x.n) ? ' hi' : ''), transform: 'translate(' + side[2] + ' ' + (top + x[side[0]] * RH) + ')' });
          g.append(el('rect', { x: 0.5, y: 0.5, width: LW - 1, height: BH - 1, rx: dense ? 5 : 9 }), el('text', { x: 9, y: BH / 2 + 4, 'class': 'rk' }, '#' + (x[side[0]] + 1)),
            el('text', { x: dense ? 38 : 40, y: BH / 2 + 4.5, 'class': 'nm' }, x.n), el('text', { x: LW - 10, y: BH / 2 + 4.5, 'class': 'sc', 'text-anchor': 'end' }, f1(x[side[1]])));
          g.addEventListener('click', function () { hi = hi && hi.length === 1 && hi[0] === x.n ? null : [x.n]; draw(); });
          svg.append(g);
        });
      });
      var up = rows.slice().sort(function (a, b) { return (b.rs - b.rr) - (a.rs - a.rr); })[0], dn = rows.slice().sort(function (a, b) { return (a.rs - a.rr) - (b.rs - b.rr); })[0];
      cap.textContent = 'Accuracy (%) over L1–L3. ' + up.n + ' moves from #' + (up.rs + 1) + ' to #' + (up.rr + 1) + '; ' + dn.n + ' from #' + (dn.rs + 1) + ' to #' + (dn.rr + 1) + '. The two sets use different scenes and questions. Click a model to trace it.';
    }
    tabs($('rev-cond'), DATA.drive.map(function (c) { return [c, c]; }), cond, function (c) { cond = c; draw(); });
    tabs($('rev-set'), [['five', 'Five 7–9B models'], ['all', 'All 23 open-weight']], set, function (s) { set = s; hi = null; draw(); });
    draw();
  })();

  // ---------- 02: real-world conditions; the twelve corruptions; the clip grid ----------
  (function () {
    var box = $('conds'), C = [['Rain', 190, 'var(--grape)'], ['Snow', 109, 'var(--l2)'], ['Night', 153, 'var(--ink)'], ['Fog', 100, 'var(--teal)'], ['Others', 20, 'var(--faint)']];
    C.forEach(function (c) { var d = h('div', '', c[1] >= 100 ? c[0] + ' ' + c[1] : String(c[1])); d.style.cssText = 'flex:' + c[1] + ' 0 0;background:' + c[2] + (c[0] === 'Night' ? ';color:var(--bg)' : ''); d.title = c[0] + ': ' + c[1] + ' videos'; box.append(d); });
  })();
  (function () {
    var list = $('cx-list'), side = $('cx-side'), cur = 'Glass occlusion', btns = {}, vbox = h('div', 'cx-v'), vid = clip('', ''), vchip = h('span', 'chip');
    vbox.append(vid, vchip); watch(vbox, [vid]);
    var TEXT = {
      'Rain': 'Procedural particle layers with temporally coherent trajectories, illumination change and haze, and approximate wet-road reflections.',
      'Snow': 'Procedural airborne flakes in several layers with illumination change and haze; no accumulated snow on the ground.',
      'Night': 'Reduced ambient light with approximate headlights, street lighting, glare and signal-dependent noise.',
      'Fog': 'Smoothly varying, drifting opacity fields with contrast attenuation.',
      'Wet lens': 'Fixed multi-scale droplet fields refract every frame: a persistent distortion attached to the lens.',
      'Glass occlusion': 'Soft-edged translucent masks with local blur and tint, approximating obscured glass.',
      'Overexposure': 'Intensity scaling and nonlinear tone mapping, with clipping.',
      'Underexposure': 'Intensity scaling and nonlinear tone mapping toward the dark end.',
      'Defocus': 'Gaussian blur.',
      'Motion blur': 'Neighbouring frames integrated under simulated camera shake, leaving temporal trails.',
      'Low bitrate': 'Constrained H.264 encoding through FFmpeg.',
      'Bit error': 'Errors injected into the encoded bitstream; the damaged stream is decoded and re-encoded so the artifacts stay visible.'
    };
    var worst = Math.max.apply(null, DATA.corr.map(function (c) { return -c.d; }));
    function bar(lab, v, max, color, txt) { var t = h('div', 't'), i = h('i'); i.style.cssText = 'width:' + (100 * v / max).toFixed(1) + '%;background:' + color; t.append(i); return [h('span', '', lab), t, h('b', '', txt)]; }
    function show(name) {
      cur = name; var c = DATA.corr.filter(function (x) { return x.c === name; })[0], acc = h('div', 'cx-acc'), lv = h('div', 'cx-acc'), big = h('div', 'cx-big');
      Object.keys(btns).forEach(function (k) { btns[k].setAttribute('aria-pressed', k === name ? 'true' : 'false'); });
      bar('Clean', c.clean, 100, 'var(--faint)', f1(c.clean) + '%').concat(bar('Corrupted', c.corr, 100, 'var(--grape)', f1(c.corr) + '%')).forEach(function (n) { acc.append(n); });
      big.append(h('b', '', sgn(c.d)), h('span', '', 'points on average; from ' + sgn(c.range[0]) + ' to ' + sgn(c.range[1]) + ' across models'));
      c.lv.forEach(function (v, k) { bar('L' + (k + 1), -v, 28, 'var(--l' + (k + 1) + ')', sgn(v)).forEach(function (n) { lv.append(n); }); });
      var S = DATA.cx[name], base = 'assets/video/cx/' + S.f;
      vid.poster = base + '.jpg'; vid.setAttribute('data-src', base + '.mp4'); vchip.textContent = 'sample · ' + S.src;
      if (vid.getAttribute('src')) { vid.src = base + '.mp4'; var pp = vid.play(); if (pp && pp.catch) pp.catch(function () {}); }
      side.replaceChildren(vbox, h('div', 'lab', (c.pool === 'driving' ? 'Driving video' : 'Daily-life video') + ' · ' + c.q.toLocaleString('en-US') + ' questions'), h('h4', '', name), h('p', '', TEXT[name]), acc, big, h('div', 'lab', 'Change by level (pp)'), lv);
      side.lastChild.previousSibling.style.marginTop = '14px';
    }
    [['driving', 'Driving video'], ['daily', 'Daily-life video']].forEach(function (g) {
      list.append(h('div', 'cx-g', g[1]));
      DATA.corr.filter(function (c) { return c.pool === g[0]; }).forEach(function (c) {
        var b = h('button', 'cx-row'), t = h('div', 't'), i = h('i'); b.type = 'button'; i.style.width = (100 * -c.d / worst).toFixed(1) + '%'; t.append(i);
        b.append(h('span', '', c.c), t, h('span', 'v', sgn(c.d))); b.addEventListener('click', function () { show(c.c); }); list.append(b); btns[c.c] = b;
      });
    });
    show(cur);
  })();
  (function () {      // eight real-world videos with their three questions
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
      b.append(im); b.addEventListener('click', function () { show(i); }); thumbs.append(b);
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

  // ---------- 04: findings ----------
  function frame(svg, W, H) { svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.replaceChildren(); }
  function legend(svg, items, x, y) { items.forEach(function (it) { svg.append(el('rect', { x: x, y: y - 9, width: 11, height: 11, rx: 3, fill: it[1] }), el('text', { x: x + 16, y: y + 1, 'class': 'tk' }, it[0])); x += 24 + it[0].length * 6.6; }); }
  (function () {      // 1a: one model against Cosmos-Reason2, synthetic and real-world, per condition
    var svg = $('f1-chart'), cap = $('f1-cap'), PAIRS = [['Gemma 4 31B', 'Cosmos-Reason2 32B'], ['InternVL3.5 38B', 'Cosmos-Reason2 32B'], ['MiniCPM-V 4.5 8B', 'Cosmos-Reason2 8B']], cur = 0;
    function draw() {
      var a = PAIRS[cur][0], b = PAIRS[cur][1], W = 500, H = 300, mid = 150, U = 13, gs = [], gr = [];
      frame(svg, W, H); legend(svg, [['synthetic', 'var(--grape)'], ['real-world', 'var(--teal)']], 40, 16);
      [-8, -4, 0, 4, 8].forEach(function (v) { svg.append(el('path', { 'class': 'ax', d: 'M40 ' + (mid - v * U) + 'H' + W, opacity: v ? 0.6 : 1 }), el('text', { x: 34, y: mid - v * U + 4, 'class': 'tk', 'text-anchor': 'end' }, (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v))); });
      DATA.drive.forEach(function (c, k) {
        var ds = +(mean(SYN[a].drive[c]) - mean(SYN[b].drive[c])).toFixed(1), dr = +(REAL[a].cond[c][3] - REAL[b].cond[c][3]).toFixed(1), x = 70 + k * 108; gs.push(ds); gr.push(dr);
        [[ds, 'var(--grape)', 0], [dr, 'var(--teal)', 38]].forEach(function (s) {
          var hh = Math.abs(s[0]) * U, y = s[0] >= 0 ? mid - hh : mid;
          svg.append(el('rect', { x: x + s[2], y: y, width: 34, height: Math.max(hh, 1), rx: 4, fill: s[1] }), el('text', { x: x + s[2] + 17, y: s[0] >= 0 ? y - 5 : y + hh + 13, 'class': 'vl', 'text-anchor': 'middle' }, sgn(s[0])));
        });
        svg.append(el('text', { x: x + 36, y: H - 8, 'class': 'lb2', 'text-anchor': 'middle' }, c));
      });
      cap.textContent = a + ' minus ' + b + ', percentage points. Synthetic: ' + sgn(Math.min.apply(null, gs)) + ' to ' + sgn(Math.max.apply(null, gs)) + '. Real-world: ' + sgn(Math.min.apply(null, gr)) + ' to ' + sgn(Math.max.apply(null, gr)) + '.';
    }
    tabs($('f1-pair'), PAIRS.map(function (p, k) { return [k, p[0] + ' vs. ' + p[1]]; }), cur, function (k) { cur = k; draw(); });
    draw();
  })();
  function grouped(svg, groups, series, lo, hi, W, H) {     // grouped vertical bars; series = [[name, colour, values]]
    frame(svg, W, H); legend(svg, series.map(function (s) { return [s[0], s[1]]; }), 40, 16);
    var top = 34, bot = H - 30, Y = function (v) { return bot - (v - lo) / (hi - lo) * (bot - top); }, gw = (W - 50) / groups.length, bw = Math.min(34, (gw - 22) / series.length);
    for (var v = lo; v <= hi; v += 5) svg.append(el('path', { 'class': 'ax', d: 'M40 ' + Y(v) + 'H' + W, opacity: 0.6 }), el('text', { x: 34, y: Y(v) + 4, 'class': 'tk', 'text-anchor': 'end' }, v));
    groups.forEach(function (g, k) {
      var x0 = 46 + k * gw + (gw - series.length * (bw + 3)) / 2;
      series.forEach(function (s, j) {
        var val = s[2][k], x = x0 + j * (bw + 3);
        svg.append(el('rect', { x: x, y: Y(val), width: bw, height: bot - Y(val), rx: 4, fill: s[1] }), el('text', { x: x + bw / 2, y: Y(val) - 5 - (series.length > 2 && j % 2 ? 11 : 0), 'class': 'vl', 'text-anchor': 'middle', 'font-size': series.length > 2 ? 10 : 11.5 }, f1(val)));
      });
      svg.append(el('text', { x: 46 + k * gw + gw / 2, y: H - 8, 'class': 'lb2', 'text-anchor': 'middle' }, g));
    });
  }
  grouped($('f1b-chart'), ['L1', 'L2', 'L3', 'All'], [['Kimi K3', 'var(--grape)', REAL['Kimi K3 2.8T'].all], ['Qwen3.8-Flash-Next', 'var(--amber)', REAL['Qwen3.8-Flash-Next 125B'].all]], 70, 95, 500, 300);
  (function () {      // 2a: the five sizes of Qwen3.5 on both sets
    var svg = $('f2-chart'), sizes = ['0.8B', '2B', '4B', '9B', '27B'], W = 500, H = 300, lo = 50, hi = 90, top = 34, bot = H - 30;
    frame(svg, W, H); legend(svg, [['synthetic (All)', 'var(--grape)'], ['real-world (Avg.)', 'var(--teal)']], 40, 16);
    var Y = function (v) { return bot - (v - lo) / (hi - lo) * (bot - top); }, X = function (k) { return 80 + k * 96; };
    for (var v = lo; v <= hi; v += 10) svg.append(el('path', { 'class': 'ax', d: 'M40 ' + Y(v) + 'H' + W, opacity: 0.6 }), el('text', { x: 34, y: Y(v) + 4, 'class': 'tk', 'text-anchor': 'end' }, v));
    [['var(--grape)', function (s) { return SYN['Qwen3.5 ' + s].all; }, 16], ['var(--teal)', function (s) { return REAL['Qwen3.5 ' + s].all[3]; }, -9]].forEach(function (L) {
      var pts = sizes.map(function (s, k) { return [X(k), Y(L[1](s)), L[1](s)]; });
      svg.append(el('path', { d: 'M' + pts.map(function (p) { return p[0] + ' ' + p[1].toFixed(1); }).join('L'), fill: 'none', stroke: L[0], 'stroke-width': 2.5, 'stroke-linejoin': 'round' }));
      pts.forEach(function (p) { svg.append(el('circle', { cx: p[0], cy: p[1], r: 5, fill: L[0], stroke: 'var(--surface)', 'stroke-width': 2 }), el('text', { x: p[0], y: p[1] + L[2], 'class': 'vl', 'text-anchor': 'middle' }, f1(p[2]))); });
    });
    sizes.forEach(function (s, k) { svg.append(el('text', { x: X(k), y: H - 8, 'class': 'lb2', 'text-anchor': 'middle' }, s)); });
  })();
  (function () {      // 2b: clean against corrupted accuracy for every model of the synthetic set
    var svg = $('f2b-chart'), rows = DATA.synth.slice().sort(function (a, b) { return b.all - a.all; }), W = 500, RH = 15.5, top = 30, H = top + rows.length * RH + 22, lo = 50, hi = 92;
    frame(svg, W, H); legend(svg, [['corrupted', 'var(--grape)'], ['clean', 'var(--faint)']], 178, 16);
    var X = function (v) { return 178 + (v - lo) / (hi - lo) * (W - 228); };
    for (var v = 50; v <= 90; v += 10) svg.append(el('path', { 'class': 'ax', d: 'M' + X(v) + ' ' + (top - 4) + 'V' + (H - 20), opacity: 0.6 }), el('text', { x: X(v), y: H - 6, 'class': 'tk', 'text-anchor': 'middle' }, v));
    rows.forEach(function (r, k) {
      var y = top + k * RH + RH / 2, clean = r.all - r.delta;
      svg.append(el('text', { x: 170, y: y + 3.5, 'class': 'tk', 'text-anchor': 'end', fill: 'var(--ink)' }, label(r)), el('path', { d: 'M' + X(r.all) + ' ' + y + 'H' + X(clean), stroke: 'var(--line)', 'stroke-width': 3, 'stroke-linecap': 'round' }),
        el('circle', { cx: X(clean), cy: y, r: 3.6, fill: 'var(--faint)' }), el('circle', { cx: X(r.all), cy: y, r: 4.2, fill: 'var(--grape)' }), el('text', { x: W - 2, y: y + 3.5, 'class': 'tk', 'text-anchor': 'end', fill: 'var(--red)' }, sgn(r.delta)));
    });
  })();
  (function () {      // 3: Qwen3.5-9B on the real-world set, before and after training on synthetic data
    var T = DATA.real.filter(function (r) { return r.group === 'tuned'; }), names = ['Qwen3.5-9B', 'SFT', 'SFT + reasoning', 'OPSD + reasoning'], col = ['var(--faint)', 'var(--grape)', 'var(--l2)', 'var(--teal)'];
    grouped($('f3-chart'), ['L1', 'L2', 'L3', 'All'], T.map(function (r, k) { return [names[k], col[k], r.all]; }), 65, 90, 500, 300);
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
