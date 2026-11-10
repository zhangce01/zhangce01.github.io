// Cursor trail. On mouse devices the pointer becomes a small glowing dot that
// draws a line along the path it has just travelled. Every point of the line
// lives for about half a second (and the line never gets longer than MAXLEN),
// so it thins and fades from the tail. The background dot grid bends out of
// the line's way and lights up in the accent colour while it passes, then
// settles back.
//
// Two fixed canvases are created here: .fx-field, behind the content, takes
// over the dot grid from body::before so its dots can move; .fx-trail, above
// everything, carries the line and the dot. Only the grid cells around the
// trail are repainted, and the loop stops once the line has faded, so a
// resting page costs nothing. Touch, reduced-motion, high-contrast and
// no-canvas visitors keep the static CSS grid and their normal cursor.
(function () {
  if (!window.matchMedia || !window.requestAnimationFrame || !window.PointerEvent) return;
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // people who ask for more contrast often rely on a large system cursor
  if (matchMedia('(prefers-contrast: more)').matches || matchMedia('(forced-colors: active)').matches) return;

  var PITCH = 24;     // grid spacing, same as the CSS grid in style.scss
  var LIFE = 520;     // ms a point of the line lives
  var MAXLEN = 640;   // px, the line is never longer than this
  var REACH = 76;     // px, how far from the line the grid reacts
  var PUSH = 9;       // px, a dot's displacement stays below this; with the dot
                      // radius it must stay under PITCH / 2 so that a dot never
                      // leaves its own cell (cells are repainted independently)
  var AWAY = 0.40;    // how hard the line parts the dots sideways
  var ALONG = 3.4;    // how far it drags them in its direction of travel
  var GLOW = 2.4;     // how quickly dots near the line take the accent colour
  var SPOT = 180;     // px, radius of the soft tint around the resting pointer
  var NODE = 8;       // px, spacing of the points the grid reacts to
  var LEVELS = 16;    // tint steps between a resting dot and a fully lit one
  // the glow: [width as a multiple of the line's, alpha] from wide and faint inwards
  var GLOWS = [[7.5, 0.016], [5.4, 0.028], [3.7, 0.045], [2.3, 0.075]];
  var TAU = Math.PI * 2;
  var REACH2 = REACH * REACH, SPOT2 = SPOT * SPOT;

  var HOT = 'a[href], button, summary, label, select, input, textarea, [role="button"], .teaser-lightbox, .vg-canvas';

  // dot = resting grid dot, acc = lit dot / line / glow, core = the pointer dot
  // (centre, edge), rim = hairline that keeps the pointer visible on any content
  var LIGHT = {
    dot: [17, 24, 39], dotA: 0.10, acc: [154, 91, 60], litA: 0.60,
    line: [154, 91, 60], lineA: 0.90, glowA: 0.9,
    core: [[232, 170, 134], [154, 91, 60]], rim: 'rgba(255,255,255,0.95)', haloA: 0.26
  };
  var DARK = {
    dot: [200, 148, 114], dotA: 0, acc: [200, 148, 114], litA: 0.55,
    line: [236, 190, 158], lineA: 0.95, glowA: 1.5,
    core: [[255, 244, 234], [228, 176, 142]], rim: 'rgba(20,18,15,0.55)', haloA: 0.40
  };

  var root = document.documentElement;
  var field = document.createElement('canvas');
  var trail = document.createElement('canvas');
  var fg = field.getContext && field.getContext('2d');
  var tg = trail.getContext && trail.getContext('2d');
  if (!fg || !tg) return;

  field.className = 'fx-field';
  trail.className = 'fx-trail';
  field.setAttribute('aria-hidden', 'true');
  trail.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(field, document.body.firstChild);
  document.body.appendChild(trail);

  var mqDark = matchMedia('(prefers-color-scheme: dark)');
  var cols = 0, rows = 0;
  var pal = null, isDark = null, styles = [], radii = [], buckets = [];

  // pointer state: show / hot / press ease towards their targets every frame
  var mx = 0, my = 0, inside = false, live = false, broken = false;
  var show = 0, hot = 0, hotT = 0, press = 0, pressT = 0;

  // raw samples of the path, oldest first
  var sx = [], sy = [], st = [];
  // control points of this frame's line (samples + the live pointer)
  var cx = [], cy = [], cl = [], cn = 0;
  // the smoothed line, tail to head, with each vertex's remaining life (0..1)
  var vx = [], vy = [], vl = [], vn = 0, v0 = 0;
  // evenly spaced points along the line that the grid reacts to
  var nx = [], ny = [], ntx = [], nty = [], nw = [], nn = 0;
  var nb = [0, 0, 0, 0];

  var prevCells = null;   // grid cells repainted last frame
  var prevTrail = null;   // rectangle drawn on the trail canvas last frame
  var raf = 0, lastT = 0, dead = false;

  function rgba(c, a) {
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a < 0 ? 0 : a > 1 ? 1 : a).toFixed(3) + ')';
  }

  function theme() {
    var c = root.classList;
    var dark = c.contains('theme-dark') || (!c.contains('theme-light') && mqDark.matches);
    if (dark === isDark) return false;
    isDark = dark;
    pal = dark ? DARK : LIGHT;
    for (var k = 0; k <= LEVELS; k++) {
      var t = k / LEVELS, m = Math.min(1, t * 1.8);
      styles[k] = rgba([
        Math.round(pal.dot[0] + (pal.acc[0] - pal.dot[0]) * m),
        Math.round(pal.dot[1] + (pal.acc[1] - pal.dot[1]) * m),
        Math.round(pal.dot[2] + (pal.acc[2] - pal.dot[2]) * m)
      ], pal.dotA + (pal.litA - pal.dotA) * t);
      radii[k] = 1.2 + 0.5 * t;
      buckets[k] = buckets[k] || [];
    }
    return true;
  }

  // ---------- the dot grid ----------

  // Repaint whole cells i0..i1 x j0..j1: every dot is drawn where the line has
  // pushed it, in the colour the line and the pointer have lent it.
  function paintCells(i0, j0, i1, j1) {
    if (i0 < 0) i0 = 0;
    if (j0 < 0) j0 = 0;
    if (i1 > cols - 1) i1 = cols - 1;
    if (j1 > rows - 1) j1 = rows - 1;
    if (i1 < i0 || j1 < j0) return;
    fg.clearRect(i0 * PITCH, j0 * PITCH, (i1 - i0 + 1) * PITCH, (j1 - j0 + 1) * PITCH);

    var k, b, n;
    for (k = 0; k <= LEVELS; k++) buckets[k].length = 0;

    for (var j = j0; j <= j1; j++) {
      var py = j * PITCH + PITCH / 2;
      for (var i = i0; i <= i1; i++) {
        var px = i * PITCH + PITCH / 2;
        var ox = 0, oy = 0, lit = 0;

        if (nn && px > nb[0] && px < nb[2] && py > nb[1] && py < nb[3]) {
          var sum = 0;
          for (n = 0; n < nn; n++) {
            var dx = px - nx[n];
            if (dx > REACH || dx < -REACH) continue;
            var dy = py - ny[n];
            if (dy > REACH || dy < -REACH) continue;
            var u = 1 - (dx * dx + dy * dy) / REACH2;
            if (u <= 0) continue;
            var f = u * u * nw[n];
            ox += f * (dx * AWAY + ntx[n] * ALONG);
            oy += f * (dy * AWAY + nty[n] * ALONG);
            sum += f;
          }
          var m = Math.sqrt(ox * ox + oy * oy);
          if (m > 0.01) {
            // soft limit: nearly linear for small pushes, never reaches PUSH
            var e2 = Math.exp(2 * m / PUSH), s = PUSH * (e2 - 1) / (e2 + 1) / m;
            ox *= s;
            oy *= s;
          }
          lit = 1 - Math.exp(-sum * GLOW);
        }

        if (show > 0.01) {
          var ex = px - mx, ey = py - my, d2 = ex * ex + ey * ey;
          if (d2 < SPOT2) {
            var q = 1 - Math.sqrt(d2) / SPOT;
            q = q * q * show * 0.7;
            if (q > lit) lit = q;
          }
        }

        k = lit < 0.02 ? 0 : Math.min(LEVELS, Math.ceil(lit * LEVELS));
        if (k === 0 && pal.dotA === 0) continue;
        buckets[k].push(px + ox, py + oy);
      }
    }

    for (k = 0; k <= LEVELS; k++) {
      b = buckets[k];
      if (!b.length) continue;
      var r = radii[k];
      fg.fillStyle = styles[k];
      fg.beginPath();
      for (n = 0; n < b.length; n += 2) {
        fg.moveTo(b[n] + r, b[n + 1]);
        fg.arc(b[n], b[n + 1], r, 0, TAU);
      }
      fg.fill();
    }
  }

  function paintField() {
    var cur = null;
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    if (nn) { x0 = nb[0]; y0 = nb[1]; x1 = nb[2]; y1 = nb[3]; }
    if (show > 0.01) {
      x0 = Math.min(x0, mx - SPOT); y0 = Math.min(y0, my - SPOT);
      x1 = Math.max(x1, mx + SPOT); y1 = Math.max(y1, my + SPOT);
    }
    if (x1 >= x0) {
      cur = [Math.floor(x0 / PITCH), Math.floor(y0 / PITCH), Math.floor(x1 / PITCH), Math.floor(y1 / PITCH)];
    }
    if (cur || prevCells) {
      var a = cur || prevCells, b = prevCells || cur;
      paintCells(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3]));
    }
    prevCells = cur;
  }

  // ---------- the line ----------

  function vert(x, y, l) {
    vx[vn] = x; vy[vn] = y; vl[vn] = l; vn++;
  }

  // straight piece, cut every ~6px so width and alpha can change along it
  function straight(ax, ay, al, bx, by, bl) {
    var k = Math.ceil(Math.sqrt((bx - ax) * (bx - ax) + (by - ay) * (by - ay)) / 6) || 1;
    for (var s = 1; s <= k; s++) {
      var u = s / k;
      vert(ax + (bx - ax) * u, ay + (by - ay) * u, al + (bl - al) * u);
    }
  }

  // Smooth the control points into vx/vy/vl: a quadratic B-spline through the
  // midpoints of the polyline, which irons out sensor jitter and event-rate
  // corners. Then cut the line to MAXLEN, measured back from the head.
  function buildLine(now) {
    var i, n = sx.length;
    cn = 0;
    for (i = 0; i < n; i++) {
      cx[cn] = sx[i]; cy[cn] = sy[i];
      cl[cn] = Math.min(1, 1 - (now - st[i]) / LIFE);
      cn++;
    }
    if (inside && n) {
      var hx = mx - sx[n - 1], hy = my - sy[n - 1];
      if (hx * hx + hy * hy > 0.25) { cx[cn] = mx; cy[cn] = my; cl[cn] = 1; cn++; }
    }

    vn = 0; v0 = 0;
    if (cn < 2) return;
    var last = cn - 1;
    var ax = cx[0], ay = cy[0], al = cl[0];
    vert(ax, ay, al);
    for (i = 1; i < last; i++) {
      var bx = (cx[i] + cx[i + 1]) / 2, by = (cy[i] + cy[i + 1]) / 2, bl = (cl[i] + cl[i + 1]) / 2;
      var len = Math.sqrt((cx[i] - ax) * (cx[i] - ax) + (cy[i] - ay) * (cy[i] - ay)) +
                Math.sqrt((bx - cx[i]) * (bx - cx[i]) + (by - cy[i]) * (by - cy[i]));
      var k = Math.min(12, Math.ceil(len / 5)) || 1;
      for (var s = 1; s <= k; s++) {
        var u = s / k, w0 = (1 - u) * (1 - u), w1 = 2 * u * (1 - u), w2 = u * u;
        vert(w0 * ax + w1 * cx[i] + w2 * bx, w0 * ay + w1 * cy[i] + w2 * by, w0 * al + w1 * cl[i] + w2 * bl);
      }
      ax = bx; ay = by; al = bl;
    }
    straight(ax, ay, al, cx[last], cy[last], cl[last]);

    // length cap: life also runs out with distance from the head
    var run = 0;
    for (i = vn - 1; i >= 0; i--) {
      if (i < vn - 1) {
        run += Math.sqrt((vx[i + 1] - vx[i]) * (vx[i + 1] - vx[i]) + (vy[i + 1] - vy[i]) * (vy[i + 1] - vy[i]));
      }
      var cap = 1 - run / MAXLEN;
      if (cap < vl[i]) vl[i] = cap;
      if (vl[i] <= 0) { vl[i] = 0; v0 = i; break; }
    }
  }

  // Resample the line every NODE px, head first, into the points the grid
  // reacts to. Each carries the line's direction of travel and a weight that
  // fades with the line, so the grid relaxes as the line dies.
  function buildNodes() {
    nn = 0;
    nb[0] = nb[1] = Infinity; nb[2] = nb[3] = -Infinity;
    if (vn - v0 < 2) return;
    var need = NODE / 2;
    for (var i = vn - 1; i > v0; i--) {
      var ax = vx[i], ay = vy[i], bx = vx[i - 1], by = vy[i - 1];
      var seg = Math.sqrt((bx - ax) * (bx - ax) + (by - ay) * (by - ay));
      if (seg < 0.001) continue;
      var tx = (ax - bx) / seg, ty = (ay - by) / seg;   // towards the head
      while (need <= seg) {
        var u = need / seg;
        var l = vl[i] + (vl[i - 1] - vl[i]) * u;
        var x = ax + (bx - ax) * u, y = ay + (by - ay) * u;
        nx[nn] = x; ny[nn] = y; ntx[nn] = tx; nty[nn] = ty;
        nw[nn] = Math.pow(l, 1.2) * NODE / REACH;
        nn++;
        if (x < nb[0]) nb[0] = x;
        if (y < nb[1]) nb[1] = y;
        if (x > nb[2]) nb[2] = x;
        if (y > nb[3]) nb[3] = y;
        need += NODE;
      }
      need -= seg;
    }
    nb[0] -= REACH; nb[1] -= REACH; nb[2] += REACH; nb[3] += REACH;
  }

  function paintTrail() {
    if (prevTrail) tg.clearRect(prevTrail[0], prevTrail[1], prevTrail[2] - prevTrail[0], prevTrail[3] - prevTrail[1]);
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    var a, b, k;

    if (vn - v0 >= 2) {
      tg.lineCap = 'butt';
      tg.lineJoin = 'round';
      // Drawn as short runs so width and alpha follow each stretch's remaining
      // life. Additive blending makes the butt joints between runs seamless
      // (the two half-covered edges sum to exactly one) and lets the wide soft
      // passes of the glow build up into a smooth falloff under the line.
      tg.globalCompositeOperation = 'lighter';
      for (var p = 0; p <= GLOWS.length; p++) {
        var pass = GLOWS[p];
        for (a = v0; a < vn - 1; a += 3) {
          b = Math.min(a + 3, vn - 1);
          var la = vl[a], lb = vl[b], lm = (la + lb) / 2;
          var w = 0.5 + 2.1 * Math.pow(lm, 0.8);
          tg.beginPath();
          tg.moveTo(vx[a], vy[a]);
          for (k = a + 1; k <= b; k++) tg.lineTo(vx[k], vy[k]);
          if (pass) {
            tg.lineWidth = w * pass[0];
            tg.strokeStyle = rgba(pal.acc, pass[1] * pal.glowA * Math.pow(lm, 1.4));
          } else {
            tg.lineWidth = w;
            var gx = vx[b] - vx[a], gy = vy[b] - vy[a];
            if (gx * gx + gy * gy > 1) {
              var g = tg.createLinearGradient(vx[a], vy[a], vx[b], vy[b]);
              g.addColorStop(0, rgba(pal.line, pal.lineA * Math.pow(la, 1.4)));
              g.addColorStop(1, rgba(pal.line, pal.lineA * Math.pow(lb, 1.4)));
              tg.strokeStyle = g;
            } else {
              tg.strokeStyle = rgba(pal.line, pal.lineA * Math.pow(lm, 1.4));
            }
          }
          tg.stroke();
        }
      }
      tg.globalCompositeOperation = 'source-over';
      for (k = v0; k < vn; k++) {
        if (vx[k] < x0) x0 = vx[k];
        if (vy[k] < y0) y0 = vy[k];
        if (vx[k] > x1) x1 = vx[k];
        if (vy[k] > y1) y1 = vy[k];
      }
    }

    if (show > 0.01) {
      paintDot();
      if (mx < x0) x0 = mx;
      if (my < y0) y0 = my;
      if (mx > x1) x1 = mx;
      if (my > y1) y1 = my;
    }

    prevTrail = x1 >= x0 ? [Math.floor(x0 - 24), Math.floor(y0 - 24), Math.ceil(x1 + 24), Math.ceil(y1 + 24)] : null;
  }

  // The pointer: a small lit bead with a soft halo. Over anything clickable
  // the halo opens into a ring; pressing squeezes it.
  function paintDot() {
    var sq = 1 - 0.18 * press;
    var g;
    tg.globalAlpha = show;

    if (hot < 0.99) {
      var hr = 13 * sq;
      g = tg.createRadialGradient(mx, my, 0, mx, my, hr);
      g.addColorStop(0, rgba(pal.acc, pal.haloA * (1 - hot)));
      g.addColorStop(1, rgba(pal.acc, 0));
      tg.fillStyle = g;
      tg.beginPath();
      tg.arc(mx, my, hr, 0, TAU);
      tg.fill();
    }

    if (hot > 0.01) {
      var rr = (5 + 9 * hot * (2 - hot)) * sq;
      tg.beginPath();
      tg.arc(mx, my, rr, 0, TAU);
      tg.fillStyle = rgba(pal.acc, 0.12 * hot);
      tg.fill();
      tg.lineWidth = 3;
      tg.strokeStyle = pal.rim;
      tg.globalAlpha = show * hot * 0.5;
      tg.stroke();
      tg.globalAlpha = show;
      tg.lineWidth = 1.5;
      tg.strokeStyle = rgba(pal.line, 0.95 * hot);
      tg.stroke();
    }

    var cr = (3.3 - 1.1 * hot) * (1 + 0.15 * press);
    tg.beginPath();
    tg.arc(mx, my, cr + 1.1, 0, TAU);
    tg.fillStyle = pal.rim;
    tg.fill();
    g = tg.createRadialGradient(mx - cr * 0.3, my - cr * 0.35, 0, mx, my, cr);
    g.addColorStop(0, rgba(pal.core[0], 1));
    g.addColorStop(1, rgba(pal.core[1], 1));
    tg.fillStyle = g;
    tg.beginPath();
    tg.arc(mx, my, cr, 0, TAU);
    tg.fill();

    tg.globalAlpha = 1;
  }

  // ---------- loop ----------

  function ease(v, target, dt, tau) {
    v = target + (v - target) * Math.exp(-dt / tau);
    return Math.abs(v - target) < 0.004 ? target : v;
  }

  function step(now) {
    var dt = lastT ? Math.min(100, Math.max(0, now - lastT)) : 16;
    lastT = now;

    var gone = 0;
    while (gone < st.length && now - st[gone] >= LIFE) gone++;
    if (gone) { sx.splice(0, gone); sy.splice(0, gone); st.splice(0, gone); }

    var showT = inside ? 1 : 0;
    show = ease(show, showT, dt, inside ? 60 : 140);
    hot = ease(hot, hotT, dt, 70);
    press = ease(press, pressT, dt, 50);

    buildLine(now);
    buildNodes();
    paintField();
    paintTrail();

    if (sx.length || show !== showT || hot !== hotT || press !== pressT) kick();
    else lastT = 0;
  }

  function frame(now) {
    raf = 0;
    if (dead) return;
    try {
      step(now);
    } catch (err) {
      shutdown();
    }
  }

  function kick() {
    if (!raf && !dead) raf = requestAnimationFrame(frame);
  }

  // anything goes wrong: give the visitor their cursor and the CSS grid back
  function shutdown() {
    dead = true;
    root.classList.remove('fx-cursor');
    root.classList.remove('fx-field-on');
    if (field.parentNode) field.parentNode.removeChild(field);
    if (trail.parentNode) trail.parentNode.removeChild(trail);
  }

  function resize() {
    var w = field.clientWidth, h = field.clientHeight;
    if (!w || !h) return;
    var d = Math.min(window.devicePixelRatio || 1, 2);
    field.width = trail.width = Math.round(w * d);
    field.height = trail.height = Math.round(h * d);
    fg.setTransform(field.width / w, 0, 0, field.height / h, 0, 0);
    tg.setTransform(trail.width / w, 0, 0, trail.height / h, 0, 0);
    cols = Math.ceil(w / PITCH);
    rows = Math.ceil(h / PITCH);
    prevCells = null;
    prevTrail = null;
    paintCells(0, 0, cols - 1, rows - 1);
    kick();
  }

  function retheme() {
    if (dead || !theme()) return;
    paintCells(0, 0, cols - 1, rows - 1);
    kick();
  }

  // ---------- input ----------

  function stamp(e) {
    var n = performance.now(), t = e.timeStamp;
    return t > 0 && t <= n + 50 && n - t < 250 ? t : n;
  }

  function sample(x, y, t) {
    var n = sx.length;
    if (n) {
      var dx = x - sx[n - 1], dy = y - sy[n - 1];
      if (dx * dx + dy * dy < 9) return;
    }
    sx.push(x); sy.push(y); st.push(t);
  }

  function leave() {
    inside = false;
    broken = true;
    kick();
  }

  window.addEventListener('pointermove', function (e) {
    if (dead || e.pointerType === 'touch') return;
    var x = e.clientX, y = e.clientY;
    // over a scrollbar the browser shows its own arrow
    if (x >= root.clientWidth || y >= root.clientHeight) { if (inside) leave(); return; }
    if (!live) {
      live = true;
      root.classList.add('fx-cursor');
    }
    if (broken) {
      // the pointer left and came back somewhere else: start a new line
      broken = false;
      sx.length = sy.length = st.length = 0;
    }
    var list = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
    if (list) {
      for (var i = 0; i < list.length; i++) sample(list[i].clientX, list[i].clientY, stamp(list[i]));
    }
    sample(x, y, stamp(e));
    mx = x; my = y;
    inside = true;
    hotT = e.target && e.target.closest && e.target.closest(HOT) ? 1 : 0;
    kick();
  }, { passive: true });

  window.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'touch') { if (inside) leave(); return; }
    pressT = 1;
    kick();
  }, { passive: true });

  function release() { pressT = 0; kick(); }
  window.addEventListener('pointerup', release, { passive: true });
  window.addEventListener('pointercancel', release, { passive: true });

  // pointer left the window, or a native drag took it over
  root.addEventListener('mouseleave', leave);
  window.addEventListener('dragstart', leave);

  window.addEventListener('resize', resize, { passive: true });
  new MutationObserver(retheme).observe(root, { attributes: true, attributeFilter: ['class'] });
  if (mqDark.addEventListener) mqDark.addEventListener('change', retheme);
  else if (mqDark.addListener) mqDark.addListener(retheme);

  theme();
  resize();
  root.classList.add('fx-field-on');
})();
