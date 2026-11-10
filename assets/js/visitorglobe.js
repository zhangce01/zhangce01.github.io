// Visitor globe. Above the footer line rises the dome of a dotted globe: land
// is a matrix of small dots (assets/data/land.json, built by _visitors/land.py)
// and every place visitors have come from is a dot lit in the accent colour,
// larger where more of them came from. Drag it to spin; it only redraws while
// it moves.
//
// Where visitors come from is counted here too. Once a day per browser the
// visitor's rough location (their network's, from geojs.io, rounded to a
// 1 degree cell, never stored more precisely) adds one to that cell's Abacus
// counter, next to the total kept by counter.js. _visitors/aggregate.py turns
// those counters into assets/data/visitors.json, which is what gets drawn. The
// visitor's own cell is ringed and labelled "You" straight away.
(function () {
  var box = document.getElementById('visitor-globe');
  var canvas = document.getElementById('vg-canvas');
  if (!box || !canvas || !canvas.getContext || !window.fetch) return;
  var g = canvas.getContext('2d');
  if (!g) return;

  var ABACUS = 'https://abacus.jasoncameron.dev';
  var SPACE = '/zhangce01-github-io/';
  var GEO = 'https://get.geojs.io/v1/ip/geo.json';
  // previews and local copies read the map but never add to it
  var LIVE = location.hostname === 'zhangce01.github.io';

  var RAD = Math.PI / 180, TAU = Math.PI * 2;
  var TOP = 10;          // px from the canvas top to the top of the dome
  var SHOWN = 0.78;      // how much of the globe's radius stands above the footer line
  var TILT = -8;         // latitude of the view centre: the north fills the dome
  var SHADES = 8;        // depth steps for the land dots
  var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var root = document.documentElement;
  var mqDark = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  var pal = null;

  var LX = null, LY = null, LZ = null;   // land dots as unit vectors
  var lit = [];                          // visitor dots: {x, y, z, w} sorted by weight
  var me = null;                         // this visitor's dot: {x, y, z}
  var grid = null;                       // land.json

  var W = 0, H = 0, R = 1, cx = 0, cy = 0, cut = 0, dotR = 1, litK = 1;
  var lon = -80, lat = TILT;             // centre of the view, degrees
  var home = -80;                        // longitude the globe turns to when it arrives
  var vLon = 0, vLat = 0;                // drag momentum, degrees per ms
  var ready = false, seen = false, raf = 0, lastT = 0;
  var intro = null;                      // {from, to, t0} while the globe turns into place
  var ripple = 0;                        // start time of the ring that marks "You"
  var drag = null;
  var buckets = [];
  for (var s = 0; s < SHADES; s++) buckets.push([]);

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function json(r) {
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }

  // ---------- where is this visitor ----------

  // 1 degree cells: id = (floor(lat) + 90) * 360 + (floor(lon) + 180)
  function cellOf(la, lo) {
    var a = Math.floor(la) + 90, o = ((Math.floor(lo) + 180) % 360 + 360) % 360;
    return a >= 0 && a < 180 ? a * 360 + o : -1;
  }

  function locate() {
    try {
      var c = JSON.parse(localStorage.getItem('visit-geo'));
      if (c && c.d === today() && c.cell >= 0) return Promise.resolve(c);
    } catch (e) { /* no storage: look it up again */ }
    return fetch(GEO).then(json).then(function (d) {
      var la = parseFloat(d.latitude), lo = parseFloat(d.longitude);
      if (!isFinite(la) || !isFinite(lo) || (la === 0 && lo === 0)) return null;
      var c = { d: today(), cell: cellOf(la, lo) };
      if (c.cell < 0) return null;
      try { localStorage.setItem('visit-geo', JSON.stringify(c)); } catch (e) { /* fine */ }
      if (LIVE) tally(c.cell);
      return c;
    }).catch(function () { return null; });
  }

  // One more visit from this cell. Abacus cannot list its counters, so cells
  // also sign a register the aggregator can walk: counter "cells" hands out
  // slot numbers and "slot-N" holds a cell id. A cell signs on its 1st visit
  // and again on its 2nd, 4th, 8th, ... in case an earlier signing was cut
  // short; duplicates are harmless.
  function tally(cell) {
    fetch(ABACUS + '/hit' + SPACE + 'c-' + cell).then(json).then(function (d) {
      var v = d.value;
      if (!(v > 0) || (v & (v - 1)) !== 0) return;
      return fetch(ABACUS + '/hit' + SPACE + 'cells').then(json).then(function (n) {
        return fetch(ABACUS + '/create' + SPACE + 'slot-' + n.value + '?initializer=' + (cell + 1));
      });
    }).catch(function () { /* the map misses one visit */ });
  }

  // ---------- data ----------

  function vec(la, lo) {
    var c = Math.cos(la * RAD);
    return { x: c * Math.sin(lo * RAD), y: Math.sin(la * RAD), z: c * Math.cos(lo * RAD) };
  }

  // the dot of the land matrix nearest to a place, as [row, column]
  function snap(la, lo) {
    var i = Math.round((la - grid.lat0) / grid.step);
    i = Math.max(0, Math.min(grid.rows.length - 1, i));
    var n = grid.rows[i][0];
    var k = Math.floor(((lo + 180) % 360 + 360) % 360 / 360 * n);
    return [i, Math.min(n - 1, k)];
  }

  function dot(i, k) {
    return vec(grid.lat0 + i * grid.step, -180 + (k + 0.5) * 360 / grid.rows[i][0]);
  }

  function cellCentre(id) {
    return [Math.floor(id / 360) - 90 + 0.5, id % 360 - 180 + 0.5];
  }

  function buildLand() {
    var n = 0, i, r, k, j, p = 0;
    for (i = 0; i < grid.rows.length; i++) {
      r = grid.rows[i][1];
      for (j = 1; j < r.length; j += 2) n += r[j];
    }
    LX = new Float32Array(n); LY = new Float32Array(n); LZ = new Float32Array(n);
    for (i = 0; i < grid.rows.length; i++) {
      r = grid.rows[i][1];
      for (j = 0; j < r.length; j += 2) {
        for (k = r[j]; k < r[j] + r[j + 1]; k++) {
          var v = dot(i, k);
          LX[p] = v.x; LY[p] = v.y; LZ[p] = v.z; p++;
        }
      }
    }
  }

  // visitor cells -> lit dots on the matrix (several cells can share a dot)
  function buildLit(cells) {
    var sum = {}, max = 1, key, i;
    for (i = 0; i < cells.length; i++) {
      var id = cells[i][0], c = cells[i][1];
      if (!(c > 0) || !(id >= 0 && id < 64800)) continue;
      var ll = cellCentre(id), at = snap(ll[0], ll[1]);
      key = at[0] * 4096 + at[1];
      sum[key] = (sum[key] || 0) + c;
      if (sum[key] > max) max = sum[key];
    }
    lit = [];
    for (key in sum) {
      var v = dot(Math.floor(key / 4096), key % 4096);
      v.n = sum[key];
      v.w = Math.log(1 + sum[key]) / Math.log(1 + max);
      lit.push(v);
    }
    lit.sort(function (a, b) { return a.w - b.w; });
  }

  // ---------- drawing ----------

  function rgba(c, a) {
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a < 0 ? 0 : a > 1 ? 1 : a).toFixed(3) + ')';
  }

  function theme() {
    var c = root.classList;
    var dark = c.contains('theme-dark') || (!c.contains('theme-light') && mqDark && mqDark.matches);
    var body = getComputedStyle(document.body);
    pal = dark
      ? { land: [237, 237, 237], landA: 0.34, limb: 'rgba(237,237,237,0.16)', acc: [224, 170, 134], ink: '#ededed', rim: 'rgba(20,18,15,0.7)' }
      : { land: [17, 24, 39], landA: 0.46, limb: 'rgba(17,24,39,0.13)', acc: [154, 91, 60], ink: '#111827', rim: 'rgba(255,255,255,0.95)' };
    // the disc is painted in the page colour so the page's own grid stops at the horizon
    pal.disc = body.backgroundColor;
  }

  function size() {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return false;
    var d = Math.min(window.devicePixelRatio || 1, 2);
    W = w; H = h;
    canvas.width = Math.round(w * d);
    canvas.height = Math.round(h * d);
    g.setTransform(canvas.width / w, 0, 0, canvas.height / h, 0, 0);
    // as big as the height allows; on a wide column it moves to the right and
    // leaves the left to the visitor count, on a narrow one it sits centred
    R = Math.min((h - TOP) / SHOWN, w * 0.47);
    cx = w > 2 * R + 170 ? w - R - 24 : w / 2;
    cy = TOP + R;
    cut = (cy - h) / R;
    // dots keep their proportion to the gaps between them on a smaller globe
    dotR = Math.max(0.6, Math.min(1.25, 0.235 * R * grid.step * RAD));
    litK = Math.max(0.72, Math.min(1, R / 330));
    return true;
  }

  function draw(now) {
    g.clearRect(0, 0, W, H);
    g.beginPath();
    g.arc(cx, cy, R, 0, TAU);
    g.fillStyle = pal.disc;
    g.fill();
    g.lineWidth = 1;
    g.strokeStyle = pal.limb;
    g.stroke();

    var sl = Math.sin(lon * RAD), cl = Math.cos(lon * RAD);
    var sp = Math.sin(lat * RAD), cp = Math.cos(lat * RAD);
    var i, k, b, n = LX.length;

    // land, bucketed by how squarely it faces us: dots thin out towards the rim
    for (k = 0; k < SHADES; k++) buckets[k].length = 0;
    for (i = 0; i < n; i++) {
      var z1 = LX[i] * sl + LZ[i] * cl;
      var y2 = LY[i] * cp - z1 * sp;
      if (y2 < cut) continue;
      var z2 = LY[i] * sp + z1 * cp;
      if (z2 < 0.04) continue;
      b = buckets[Math.min(SHADES - 1, (z2 * SHADES) | 0)];
      b.push(cx + R * (LX[i] * cl - LZ[i] * sl), cy - R * y2);
    }
    for (k = 0; k < SHADES; k++) {
      b = buckets[k];
      if (!b.length) continue;
      var f = (k + 0.5) / SHADES, r = dotR * (0.58 + 0.42 * f);
      g.fillStyle = rgba(pal.land, pal.landA * (0.12 + 0.88 * Math.pow(f, 1.2)));
      g.beginPath();
      for (i = 0; i < b.length; i += 2) {
        g.moveTo(b[i] + r, b[i + 1]);
        g.arc(b[i], b[i + 1], r, 0, TAU);
      }
      g.fill();
    }

    // visitors, small ones first so the big ones sit on top
    for (i = 0; i < lit.length; i++) {
      var p = project(lit[i], sl, cl, sp, cp);
      if (!p) continue;
      var fade = 0.2 + 0.8 * p.z, cr = (1.3 + 2.1 * lit[i].w) * (0.7 + 0.3 * p.z) * litK;
      if (lit[i].w > 0.3) {
        g.fillStyle = rgba(pal.acc, 0.15 * fade);
        g.beginPath();
        g.arc(p.x, p.y, cr * 2.7, 0, TAU);
        g.fill();
      }
      g.fillStyle = rgba(pal.acc, (0.6 + 0.4 * lit[i].w) * fade);
      g.beginPath();
      g.arc(p.x, p.y, cr, 0, TAU);
      g.fill();
    }

    if (me) drawMe(project(me, sl, cl, sp, cp), now);
  }

  function project(v, sl, cl, sp, cp) {
    var z1 = v.x * sl + v.z * cl;
    var y2 = v.y * cp - z1 * sp;
    if (y2 < cut) return null;
    var z2 = v.y * sp + z1 * cp;
    if (z2 < 0.04) return null;
    return { x: cx + R * (v.x * cl - v.z * sl), y: cy - R * y2, z: z2 };
  }

  // this visitor: a ringed dot with a label, and one ripple when the globe arrives
  function drawMe(p, now) {
    if (!p) return;
    if (ripple) {
      var t = Math.min(1, (now - ripple) / 1100);
      g.beginPath();
      g.arc(p.x, p.y, 7 + 22 * t * (2 - t), 0, TAU);
      g.lineWidth = 1.5;
      g.strokeStyle = rgba(pal.acc, 0.7 * (1 - t));
      g.stroke();
    }
    g.beginPath();
    g.arc(p.x, p.y, 7.5, 0, TAU);
    g.fillStyle = rgba(pal.acc, 0.14);
    g.fill();
    g.lineWidth = 1.5;
    g.strokeStyle = rgba(pal.acc, 0.95);
    g.stroke();
    g.beginPath();
    g.arc(p.x, p.y, 4.1, 0, TAU);
    g.fillStyle = pal.rim;
    g.fill();
    g.beginPath();
    g.arc(p.x, p.y, 3, 0, TAU);
    g.fillStyle = rgba(pal.acc, 1);
    g.fill();

    g.font = '600 11px Inter, system-ui, sans-serif';
    g.textBaseline = 'middle';
    var left = p.x > W - 60;           // keep the label inside the canvas
    g.textAlign = left ? 'right' : 'left';
    var tx = p.x + (left ? -14 : 14);
    g.lineWidth = 3;
    g.strokeStyle = pal.disc;
    g.strokeText('You', tx, p.y + 0.5);
    g.fillStyle = pal.ink;
    g.fillText('You', tx, p.y + 0.5);
  }

  // ---------- motion ----------

  function frame(now) {
    raf = 0;
    var dt = lastT ? Math.min(64, now - lastT) : 16;
    lastT = now;
    var more = false;

    if (intro) {
      var t = Math.min(1, (now - intro.t0) / 1700);
      lon = intro.from + (intro.to - intro.from) * (1 - Math.pow(1 - t, 3));
      if (t < 1) more = true;
      else { intro = null; if (me) ripple = now; }
    } else if (!drag && (vLon || vLat)) {
      turn(vLon * dt, vLat * dt);
      var k = Math.exp(-dt / 320);
      vLon *= k; vLat *= k;
      if (Math.abs(vLon) + Math.abs(vLat) < 0.0004) vLon = vLat = 0;
      else more = true;
    }
    if (ripple && now - ripple >= 1100) ripple = 0;
    if (ripple) more = true;

    draw(now);
    if (more) kick();
    else lastT = 0;
  }

  function kick() {
    if (!raf && ready) raf = requestAnimationFrame(frame);
  }

  function turn(dLon, dLat) {
    lon = ((lon + dLon + 540) % 360) - 180;
    lat = Math.max(-80, Math.min(40, lat + dLat));
  }

  // the first time the dome scrolls into view it turns into place, once
  function arrive() {
    if (seen || !ready) return;
    seen = true;
    box.classList.add('vg-in');
    if (lon !== home) intro = { from: lon, to: home, t0: performance.now() };
    kick();
  }

  // ---------- input ----------

  canvas.addEventListener('pointerdown', function (e) {
    if (!ready || (e.pointerType === 'mouse' && e.button !== 0)) return;
    intro = null;
    vLon = vLat = 0;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), touch: e.pointerType === 'touch' };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
    canvas.classList.add('is-dragging');
    box.classList.add('vg-used');
  });

  canvas.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var now = performance.now(), dt = Math.max(1, now - drag.t);
    // a pixel of drag moves the surface under it by about a pixel
    var gain = 1.25 / (R * RAD);
    var dLon = -(e.clientX - drag.x) * gain;
    // on touch screens a vertical swipe scrolls the page, so only spin sideways
    var dLat = drag.touch ? 0 : (e.clientY - drag.y) * gain;
    turn(dLon, dLat);
    // momentum for after the release, capped so a flick cannot send it spinning for ages
    vLon = Math.max(-0.28, Math.min(0.28, vLon * 0.6 + (dLon / dt) * 0.4));
    vLat = Math.max(-0.14, Math.min(0.14, vLat * 0.6 + (dLat / dt) * 0.4));
    drag.x = e.clientX; drag.y = e.clientY; drag.t = now;
    kick();
  });

  function drop(e) {
    if (!drag || e.pointerId !== drag.id) return;
    // let go while still: no drift
    if (still || performance.now() - drag.t > 80) vLon = vLat = 0;
    drag = null;
    canvas.classList.remove('is-dragging');
    kick();
  }
  canvas.addEventListener('pointerup', drop);
  canvas.addEventListener('pointercancel', drop);

  canvas.addEventListener('keydown', function (e) {
    var step = { ArrowLeft: [-14, 0], ArrowRight: [14, 0], ArrowUp: [0, 8], ArrowDown: [0, -8] }[e.key];
    if (!step || !ready) return;
    e.preventDefault();
    intro = null;
    turn(step[0], step[1]);
    box.classList.add('vg-used');
    kick();
  });

  // ---------- start ----------

  function start() {
    var place = locate();
    Promise.all([
      fetch('./assets/data/land.json').then(json),
      fetch('./assets/data/visitors.json').then(json).catch(function () { return { cells: [] }; }),
      place
    ]).then(function (res) {
      grid = res[0];
      var cells = (res[1] && res[1].cells) || [];
      buildLand();
      buildLit(cells);

      var from = document.getElementById('vg-from'), places = document.getElementById('vg-places');
      if (from && places && cells.length > 1) {
        places.textContent = cells.length.toLocaleString('en-US');
        from.hidden = false;
      }

      // face the visitor, or else wherever most visitors are
      if (res[2]) {
        var ll = cellCentre(res[2].cell), at = snap(ll[0], ll[1]);
        me = dot(at[0], at[1]);
        lon = ll[1];
        lat = Math.max(-80, Math.min(TILT, ll[0] - 42));
      } else if (lit.length) {
        var top = lit[lit.length - 1];
        lon = Math.atan2(top.x, top.z) / RAD;
      }

      // it waits a quarter turn short of there until it is scrolled into view
      home = lon;
      if (!still) lon = home - 75;

      canvas.hidden = false;
      theme();
      if (!size()) return;
      ready = true;
      draw(0);

      if (window.ResizeObserver) new ResizeObserver(function () { if (size()) kick(); }).observe(canvas);
      else window.addEventListener('resize', function () { if (size()) kick(); });
      new MutationObserver(function () { theme(); kick(); }).observe(root, { attributes: true, attributeFilter: ['class'] });
      if (mqDark && mqDark.addEventListener) mqDark.addEventListener('change', function () { theme(); kick(); });

      if (window.IntersectionObserver) {
        var io = new IntersectionObserver(function (en) {
          if (en[0].isIntersecting) { io.disconnect(); arrive(); }
        }, { threshold: 0.35 });
        io.observe(canvas);
      } else {
        arrive();
      }
    }).catch(function () { /* no land data: the visitor line stands alone */ });
  }

  // nothing here is needed for first paint: wait until the page is idle
  if (window.requestIdleCallback) requestIdleCallback(start, { timeout: 2500 });
  else setTimeout(start, 600);
})();
