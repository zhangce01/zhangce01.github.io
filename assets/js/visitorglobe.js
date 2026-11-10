// Visitor globe. Above the footer line rises the dome of a dotted globe: land
// is a matrix of small dots (assets/data/land.json, built by _visitors/land.py)
// and every place visitors have come from is a larger dot, bigger where more
// of them came from. Beside it the eight countries and regions with the most
// visitors can be stepped through; the globe turns to the chosen one and its
// places light up in the accent colour. Drag the globe to spin it. It only
// redraws while it moves.
//
// The data is visitors.json from the visitor-map-data repository, which a
// workflow there rebuilds every day (assets/data/visitors.json is a snapshot
// to fall back on). Counting happens here: once a day per browser the
// visitor's rough location (their network's, from geojs.io, rounded to a
// 1 degree cell, never stored more precisely) and country add one to an
// Abacus counter, next to the total kept by counter.js. The visitor's own
// cell is ringed and labelled "You" straight away.
(function () {
  var box = document.getElementById('visitor-globe');
  var canvas = document.getElementById('vg-canvas');
  if (!box || !canvas || !canvas.getContext || !window.fetch) return;
  var g = canvas.getContext('2d');
  if (!g) return;

  var ABACUS = 'https://abacus.jasoncameron.dev';
  var SPACE = '/zhangce01-github-io/';
  var GEO = 'https://get.geojs.io/v1/ip/geo.json';
  var DATA = '/visitor-map-data/visitors.json';
  // previews and local copies read the map but never add to it
  var LIVE = location.hostname === 'zhangce01.github.io';

  var RAD = Math.PI / 180, TAU = Math.PI * 2;
  var TOP = 10;          // px from the canvas top to the top of the dome
  var SHOWN = 0.78;      // how much of the globe's radius stands above the footer line
  var TILT = -8;         // latitude of the view centre: the north fills the dome
  var RISE = 42;         // a place is shown this many degrees above the view centre
  var SHADES = 8;        // depth steps for the land dots
  var LIST = 8;          // countries and regions that can be stepped through
  var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var root = document.documentElement;
  var mqDark = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  var pal = null;

  var LX = null, LY = null, LZ = null;   // land dots as unit vectors
  var lit = [];                          // visitor dots: {x, y, z, w, by: {code: visits}}, light ones first
  var me = null;                         // this visitor's dot: {x, y, z}
  var grid = null;                       // land.json
  var ranked = [];                        // the listed countries: {code, name, share, lat, lon}
  var sel = -1;                          // which of them is chosen

  var W = 0, H = 0, R = 1, cx = 0, cy = 0, cut = 0, dotR = 1, litK = 1;
  var lon = -80, lat = TILT;             // centre of the view, degrees
  var home = -80;                        // longitude the globe turns to when it arrives
  var vLon = 0, vLat = 0;                // drag momentum, degrees per ms
  var ready = false, seen = false, raf = 0, lastT = 0;
  var intro = null;                      // {from, to, t0} while the globe turns into place
  var fly = null;                        // {lon0, lat0, dLon, dLat, t0} while it turns to a chosen country
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

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  // ---------- where is this visitor ----------

  // 1 degree cells: id = (floor(lat) + 90) * 360 + (floor(lon) + 180)
  function cellOf(la, lo) {
    if (!isFinite(la) || !isFinite(lo) || (la === 0 && lo === 0)) return -1;
    var a = Math.floor(la) + 90, o = ((Math.floor(lo) + 180) % 360 + 360) % 360;
    return a >= 0 && a < 180 ? a * 360 + o : -1;
  }

  // {d: day, cell: 1 degree cell or -1, cc: country code or 'ZZ'}, or null
  function locate() {
    try {
      var c = JSON.parse(localStorage.getItem('visit-geo'));
      if (c && c.d === today() && c.cc) return Promise.resolve(c);
    } catch (e) { /* no storage: look it up again */ }
    return fetch(GEO).then(json).then(function (d) {
      var cc = String(d.country_code || '').toUpperCase();
      var c = { d: today(), cell: cellOf(parseFloat(d.latitude), parseFloat(d.longitude)), cc: /^[A-Z]{2}$/.test(cc) ? cc : 'ZZ' };
      if (c.cell < 0 && c.cc === 'ZZ') return null;
      try { localStorage.setItem('visit-geo', JSON.stringify(c)); } catch (e) { /* fine */ }
      if (LIVE) tally(c.cell, c.cc);
      return c;
    }).catch(function () { return null; });
  }

  // One more visit from this place. Abacus cannot list its counters, so places
  // also sign a register the aggregator can walk: counter "cells" hands out
  // slot numbers and "slot-N" holds the cell and the country code packed into
  // one number. A place signs on its 1st visit and again on its 2nd, 4th,
  // 8th, ... in case an earlier signing was cut short; duplicates are harmless.
  function tally(cell, cc) {
    fetch(ABACUS + '/hit' + SPACE + 'c-' + (cell < 0 ? 'x' : cell) + '-' + cc).then(json).then(function (d) {
      var v = d.value;
      if (!(v > 0) || (v & (v - 1)) !== 0) return;
      var packed = (cell + 1) * 676 + (cc.charCodeAt(0) - 65) * 26 + cc.charCodeAt(1) - 65;
      return fetch(ABACUS + '/hit' + SPACE + 'cells').then(json).then(function (n) {
        return fetch(ABACUS + '/create' + SPACE + 'slot-' + n.value + '?initializer=' + packed);
      });
    }).catch(function () { /* the map misses one visit */ });
  }

  // ---------- data ----------

  function visitors() {
    return fetch(DATA).then(json)
      .catch(function () { return fetch('./assets/data/visitors.json').then(json); })
      .catch(function () { return {}; });
  }

  function vec(la, lo) {
    var c = Math.cos(la * RAD);
    return { x: c * Math.sin(lo * RAD), y: Math.sin(la * RAD), z: c * Math.cos(lo * RAD) };
  }

  // the dot of the land matrix nearest to a place, as [row, column]
  function snap(la, lo) {
    var i = Math.round((la - grid.lat0) / grid.step);
    i = clamp(i, 0, grid.rows.length - 1);
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

  // [cell, country, visits] places -> lit dots on the matrix (places can share a dot)
  function buildLit(places) {
    var at = {}, max = 1, key, i;
    for (i = 0; i < places.length; i++) {
      var id = places[i][0], cc = places[i][1], n = places[i][2];
      if (!(n > 0) || !(id >= 0 && id < 64800)) continue;
      var ll = cellCentre(id), rc = snap(ll[0], ll[1]);
      key = rc[0] * 4096 + rc[1];
      var d = at[key] || (at[key] = { n: 0, by: {} });
      d.n += n;
      d.by[cc] = (d.by[cc] || 0) + n;
      if (d.n > max) max = d.n;
    }
    lit = [];
    for (key in at) {
      var v = dot(Math.floor(key / 4096), key % 4096);
      v.by = at[key].by;
      v.w = Math.log(1 + at[key].n) / Math.log(1 + max);
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
    dotR = clamp(0.235 * R * grid.step * RAD, 0.6, 1.25);
    litK = clamp(R / 330, 0.72, 1);
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

    // visitors: everywhere else in ink first, then the chosen country's places
    // in the accent colour on top (all of them, when there is no list to choose from)
    var code = sel >= 0 ? ranked[sel].code : null;
    for (var pass = 0; pass < 2; pass++) {
      for (i = 0; i < lit.length; i++) {
        var v = lit[i], on = !code || v.by[code] > 0;
        if (on !== (pass === 1)) continue;
        var p = project(v, sl, cl, sp, cp);
        if (!p) continue;
        var fade = 0.2 + 0.8 * p.z, cr = (1.3 + 2.1 * v.w) * (0.7 + 0.3 * p.z) * litK;
        if (on && v.w > 0.3) {
          g.fillStyle = rgba(pal.acc, 0.15 * fade);
          g.beginPath();
          g.arc(p.x, p.y, cr * 2.7, 0, TAU);
          g.fill();
        }
        g.fillStyle = on ? rgba(pal.acc, (0.6 + 0.4 * v.w) * fade) : rgba(pal.land, (0.5 + 0.3 * v.w) * fade);
        g.beginPath();
        g.arc(p.x, p.y, on ? cr : cr * 0.85, 0, TAU);
        g.fill();
      }
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

  // ---------- the list of countries ----------

  var els = {};
  ['vg-from', 'vg-countries', 'vg-top', 'vg-no', 'vg-name', 'vg-stat', 'vg-ticks', 'vg-prev', 'vg-next'].forEach(function (id) {
    els[id] = document.getElementById(id);
  });
  var hasList = !!(els['vg-top'] && els['vg-no'] && els['vg-name'] && els['vg-stat'] && els['vg-ticks']);

  function buildList(data) {
    var all = data.countries || [], total = data.total || 0, i;
    if (els['vg-from'] && els['vg-countries'] && all.length > 1) {
      els['vg-countries'].textContent = all.length;
      els['vg-from'].hidden = false;
    }
    if (!hasList || !total) return;
    for (i = 0; i < all.length && i < LIST; i++) {
      ranked.push({ code: all[i][0], name: all[i][1], share: all[i][2] / total, lat: all[i][3], lon: all[i][4] });
    }
    if (ranked.length < 2) { ranked = []; return; }
    ranked.forEach(function (c, k) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'vg-tick';
      b.setAttribute('aria-label', c.name);
      b.addEventListener('click', function () { choose(k, true); });
      els['vg-ticks'].appendChild(b);
    });
    if (els['vg-prev']) els['vg-prev'].addEventListener('click', function () { choose((sel + ranked.length - 1) % ranked.length, true); });
    if (els['vg-next']) els['vg-next'].addEventListener('click', function () { choose((sel + 1) % ranked.length, true); });
    els['vg-top'].hidden = false;
  }

  // show country k beside the globe and, when asked, turn the globe to it
  function choose(k, turnTo) {
    sel = k;
    var c = ranked[k], pct = c.share * 100;
    els['vg-no'].textContent = k + 1;
    els['vg-name'].textContent = c.name;
    els['vg-stat'].textContent = (pct >= 1 ? Math.round(pct) : '<1') + '% of visitors';
    var ticks = els['vg-ticks'].children;
    for (var i = 0; i < ticks.length; i++) ticks[i].setAttribute('aria-pressed', i === k ? 'true' : 'false');
    if (!turnTo) return;
    box.classList.add('vg-used');
    aim(c.lon, clamp(c.lat - RISE, -80, 30));
  }

  // ---------- motion ----------

  // turn the view centre to (lo, la) by the shorter way round
  function aim(lo, la) {
    intro = null;
    vLon = vLat = 0;
    if (!seen || still) {
      // not on screen yet, or no animation wanted: just be there
      home = lo;
      lon = seen || still ? lo : lo - 75;
      lat = la;
      fly = null;
    } else {
      fly = { lon0: lon, lat0: lat, dLon: ((lo - lon + 540) % 360) - 180, dLat: la - lat, t0: performance.now() };
    }
    kick();
  }

  function frame(now) {
    raf = 0;
    var dt = lastT ? Math.min(64, now - lastT) : 16;
    lastT = now;
    var more = false, t;

    if (intro) {
      t = Math.min(1, (now - intro.t0) / 1700);
      lon = intro.from + (intro.to - intro.from) * (1 - Math.pow(1 - t, 3));
      if (t < 1) more = true;
      else { intro = null; if (me) ripple = now; }
    } else if (fly) {
      t = Math.min(1, (now - fly.t0) / 950);
      var e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      lon = fly.lon0 + fly.dLon * e;
      lat = fly.lat0 + fly.dLat * e;
      if (t < 1) more = true;
      else { fly = null; turn(0, 0); }
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
    lat = clamp(lat + dLat, -80, 40);
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
    intro = fly = null;
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
    vLon = clamp(vLon * 0.6 + (dLon / dt) * 0.4, -0.28, 0.28);
    vLat = clamp(vLat * 0.6 + (dLat / dt) * 0.4, -0.14, 0.14);
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
    intro = fly = null;
    turn(step[0], step[1]);
    box.classList.add('vg-used');
    kick();
  });

  // ---------- start ----------

  function start() {
    Promise.all([
      fetch('./assets/data/land.json').then(json),
      visitors(),
      locate()
    ]).then(function (res) {
      grid = res[0];
      var data = res[1] || {}, here = res[2];
      buildLand();
      buildLit(data.places || []);
      buildList(data);

      var ll = here && here.cell >= 0 ? cellCentre(here.cell) : null;
      if (ll) {
        var rc = snap(ll[0], ll[1]);
        me = dot(rc[0], rc[1]);
      }

      // open on the visitor's own country if it is listed, else on the first
      var k = 0;
      if (here) for (var i = 0; i < ranked.length; i++) if (ranked[i].code === here.cc) k = i;
      if (ranked.length) choose(k, false);

      // face the visitor when their country is the one shown (or nothing is),
      // otherwise the country shown
      if (ll && (!ranked.length || ranked[k].code === here.cc)) {
        lon = ll[1];
        lat = clamp(ll[0] - RISE, -80, TILT);
      } else if (ranked.length) {
        lon = ranked[k].lon;
        lat = clamp(ranked[k].lat - RISE, -80, 30);
      } else if (lit.length) {
        var most = lit[lit.length - 1];
        lon = Math.atan2(most.x, most.z) / RAD;
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
