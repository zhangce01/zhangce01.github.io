// Research Interests as a transit map. Each research area is a line, each paper
// a station in order of time; a paper that belongs to two areas is an
// interchange between their lines. Hovering a line or a station dims the rest,
// a station shows its full title, and a click jumps to the publication card.
// The data is the plain list in #ri-map (index.md), which stays as the fallback.
(function () {
  var root = document.getElementById('ri-map');
  if (!root || !document.createElementNS) return;

  var NS = 'http://www.w3.org/2000/svg';
  var lines = [].map.call(root.querySelectorAll('.ri-lines li'), function (li) {
    return { key: li.getAttribute('data-line'), name: li.textContent.replace(/\s+/g, ' ').trim() };
  });
  var stops = [].map.call(root.querySelectorAll('.ri-stops a'), function (a) {
    return {
      name: a.textContent.trim(), href: a.getAttribute('href'), keys: a.getAttribute('data-lines').split(' '),
      year: a.getAttribute('data-year'), venue: a.getAttribute('data-venue') || '', title: a.getAttribute('data-title') || ''
    };
  });
  if (!lines.length || !stops.length) return;

  var row = {};
  lines.forEach(function (l, i) { row[l.key] = i; });

  var stage = document.createElement('div');
  stage.className = 'ri-stage';
  var tip = document.createElement('div');
  tip.className = 'ri-tip';
  tip.setAttribute('aria-hidden', 'true');
  root.appendChild(stage);
  root.classList.add('is-live');

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var animate = !reduce && 'IntersectionObserver' in window;
  var shown = !animate;

  function el(tag, attrs, parent, text) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }

  function focus(keys) {
    [].forEach.call(stage.querySelectorAll('[data-keys]'), function (n) {
      var mine = n.getAttribute('data-keys').split(' ');
      var hit = !keys || mine.some(function (k) { return keys.indexOf(k) > -1; });
      n.classList.toggle('is-dim', !hit);
    });
  }

  function showTip(s, x, top) {
    tip.innerHTML = '';
    var t = document.createElement('div'); t.className = 'ri-tip-title'; t.textContent = s.title; tip.appendChild(t);
    var v = document.createElement('div'); v.className = 'ri-tip-venue'; v.textContent = s.venue; tip.appendChild(v);
    tip.classList.add('is-on');
    var w = tip.offsetWidth, h = tip.offsetHeight, W = stage.clientWidth;
    var left = Math.max(0, Math.min(W - w, x - w / 2));
    var y = top - h - 12;                          // above the station, over the heading if need be
    tip.style.left = left + 'px';
    tip.style.top = y + 'px';
  }

  function hideTip() { tip.classList.remove('is-on'); }

  function draw() {
    var W = stage.clientWidth;
    if (!W) return;
    var vertical = W < 700, n = stops.length;
    stage.innerHTML = '';
    root.classList.toggle('is-vertical', vertical);

    if (vertical) {
      var legend = document.createElement('div');
      legend.className = 'ri-legend';
      lines.forEach(function (l) {
        var chip = document.createElement('span');
        chip.className = 'ri-chip ri-l-' + l.key;
        chip.setAttribute('data-keys', l.key);
        chip.textContent = l.name;
        chip.addEventListener('mouseenter', function () { focus([l.key]); });
        chip.addEventListener('mouseleave', function () { focus(null); });
        legend.appendChild(chip);
      });
      stage.appendChild(legend);
    }

    // along = the time axis, across = one lane per line
    var a0 = vertical ? 20 : 30, step = vertical ? 33 : (W - 92) / (n - 1), tail = vertical ? 30 : 46;
    var lane = vertical ? function (i) { return 15 + i * 22; } : function (i) { return 52 + i * 68; };
    var H = vertical ? a0 + (n - 1) * step + tail + 8 : 226;
    var along = function (i) { return a0 + i * step; };
    var pt = function (a, c) { return vertical ? [c, a] : [a, c]; };

    var svg = el('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Research areas as three lines; each paper is a station on its line' }, null);
    var defs = el('defs', {}, svg);

    // years: a faint divider where a new year starts
    var seen = null;
    stops.forEach(function (s, i) {
      if (s.year === seen) return;
      if (seen !== null) {
        var m = along(i) - step / 2;
        var p1 = pt(m, vertical ? 4 : 20), p2 = pt(m, vertical ? W - 4 : H - 8);
        el('line', { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1], 'class': 'ri-yearline' }, svg);
      }
      seen = s.year;
      if (vertical) el('text', { x: W - 4, y: along(i) - 9, 'text-anchor': 'end', 'class': 'ri-year' }, svg, s.year);
      else el('text', { x: along(i) - 7, y: 14, 'class': 'ri-year' }, svg, s.year);
    });

    // lines
    lines.forEach(function (l, i) {
      var first = -1, c = lane(i);
      stops.forEach(function (s, k) { if (first < 0 && s.keys.indexOf(l.key) > -1) first = k; });
      if (first < 0) return;
      var g = el('g', { 'class': 'ri-line ri-l-' + l.key, 'data-keys': l.key }, svg);
      var s0 = pt(along(first), c), s1 = pt(along(n - 1) + 6, c), s2 = pt(along(n - 1) + tail, c);
      var id = 'ri-fade-' + l.key;
      var grad = el('linearGradient', { id: id, gradientUnits: 'userSpaceOnUse', x1: s1[0], y1: s1[1], x2: s2[0], y2: s2[1] }, defs);
      el('stop', { offset: '0', 'class': 'ri-l-' + l.key + ' ri-fade-a' }, grad);
      el('stop', { offset: '1', 'class': 'ri-l-' + l.key + ' ri-fade-b' }, grad);
      var track = el('path', { d: 'M' + s0 + 'L' + s1, 'class': 'ri-track' }, g);
      el('path', { d: 'M' + s1 + 'L' + s2, 'class': 'ri-tail', stroke: 'url(#' + id + ')' }, g);
      el('path', { d: 'M' + s0 + 'L' + s2, 'class': 'ri-hit' }, g);
      if (!vertical) el('text', { x: s0[0] - 7, y: c - 15, 'class': 'ri-name' }, g, l.name);
      var len = Math.ceil(Math.abs(vertical ? s1[1] - s0[1] : s1[0] - s0[0]));
      track.style.setProperty('--len', len);
      g.addEventListener('mouseenter', function () { focus([l.key]); });
      g.addEventListener('mouseleave', function () { focus(null); });
    });

    // stations
    stops.forEach(function (s, i) {
      var rows = s.keys.map(function (k) { return row[k]; }).sort(function (p, q) { return p - q; });
      var lo = lane(rows[0]), hi = lane(rows[rows.length - 1]), a = along(i);
      var link = el('a', { href: s.href, 'class': 'ri-stop', 'data-keys': s.keys.join(' '), 'aria-label': s.title + ' (' + s.venue + ')' }, svg);
      link.style.setProperty('--i', i);
      var p = pt(a, lo), q = pt(a, hi);
      // a generous hover / tap area: the station and its label
      if (vertical) el('rect', { x: p[0] - 11, y: a - 15, width: W - p[0] + 11, height: 30, 'class': 'ri-area' }, link);
      else el('rect', { x: a - 20, y: lo - 11, width: 40, height: hi - lo + 43, 'class': 'ri-area' }, link);
      if (rows.length > 1) {
        el('rect', { x: Math.min(p[0], q[0]) - 8.5, y: Math.min(p[1], q[1]) - 8.5, width: Math.abs(q[0] - p[0]) + 17, height: Math.abs(q[1] - p[1]) + 17, rx: 8.5, 'class': 'ri-inter' }, link);
        s.keys.forEach(function (k) {
          var d = pt(a, lane(row[k]));
          el('circle', { cx: d[0], cy: d[1], r: 3.4, 'class': 'ri-pip ri-l-' + k }, link);
        });
      } else {
        el('circle', { cx: p[0], cy: p[1], r: 6.2, 'class': 'ri-dot ri-l-' + s.keys[0] }, link);
      }
      if (vertical) {
        var t = el('text', { x: lane(lines.length - 1) + 22, y: a + 4.5, 'class': 'ri-label' }, link, s.name);
        el('tspan', { dx: 8, 'class': 'ri-venue' }, t, s.venue);
      } else {
        el('text', { x: a, y: hi + 26, 'text-anchor': 'middle', 'class': 'ri-label' }, link, s.name);
      }
      var enter = function () {
        focus(s.keys);
        if (vertical) return;                       // the venue is already beside the name
        showTip(s, a, lo - 9);
      };
      var leave = function () { focus(null); hideTip(); };
      link.addEventListener('mouseenter', enter);
      link.addEventListener('mouseleave', leave);
      link.addEventListener('focus', enter);
      link.addEventListener('blur', leave);
    });

    stage.appendChild(svg);
    stage.appendChild(tip);
    if (shown) root.classList.add('is-in');
  }

  if (animate) {
    root.classList.add('ri-anim');
    new IntersectionObserver(function (entries, io) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      shown = true;
      root.classList.add('is-in');
    }, { threshold: 0.35 }).observe(root);
  }

  draw();
  var timer, lastW = stage.clientWidth;
  window.addEventListener('resize', function () {
    clearTimeout(timer);
    timer = setTimeout(function () {
      if (stage.clientWidth === lastW) return;
      lastW = stage.clientWidth;
      root.classList.remove('ri-anim');            // a redraw appears at once
      draw();
    }, 120);
  });
})();
