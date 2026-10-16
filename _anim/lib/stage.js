// Deterministic timeline runner for the teaser animations.
//
//   Stage.build(({ tl, count, type, at }) => { ...gsap tweens on tl... },
//               { duration: 10.5, poster: 8.0 });
//
// URL params:  ?theme=dark|light   colour theme (default: light)
//              ?t=4.2              freeze on one moment (for stills / debugging)
//              ?render             leave the clock to render.py (window.__seek)
// Without ?t / ?render the page plays itself on a loop, so it can be opened
// straight in a browser while authoring.
(function () {
  var qs = new URLSearchParams(location.search);
  var theme = qs.get('theme') === 'dark' ? 'dark' : 'light';
  document.documentElement.classList.add(theme);

  var hooks = [];
  var tl = null;
  var meta = { duration: 10.5, poster: null, fadeIn: 0.35, fadeOut: 0.45 };

  function ease(name) { return gsap.parseEase(name || 'power2.out'); }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function els(sel) {
    if (typeof sel !== 'string') return sel.length !== undefined ? Array.prototype.slice.call(sel) : [sel];
    return Array.prototype.slice.call(document.querySelectorAll(sel));
  }

  // number counter driven straight off the clock (no tween callbacks needed)
  function count(sel, from, to, t0, dur, opts) {
    opts = opts || {};
    var dec = opts.decimals != null ? opts.decimals : 1;
    var pre = opts.prefix || '', suf = opts.suffix || '';
    var e = ease(opts.ease || 'power2.out');
    var targets = els(sel);
    hooks.push(function (t) {
      var v = from + (to - from) * e(clamp01((t - t0) / dur));
      var s = pre + v.toFixed(dec) + suf;
      for (var i = 0; i < targets.length; i++) if (targets[i].textContent !== s) targets[i].textContent = s;
    });
  }

  // typewriter: reveals `text` character by character over [t0, t0+dur]
  function type(sel, text, t0, dur) {
    var targets = els(sel);
    hooks.push(function (t) {
      var n = Math.round(text.length * clamp01((t - t0) / dur));
      var s = text.slice(0, n);
      for (var i = 0; i < targets.length; i++) if (targets[i].textContent !== s) targets[i].textContent = s;
    });
  }

  // arbitrary per-frame hook: fn(t)
  function at(fn) { hooks.push(fn); }

  function seek(t) {
    tl.time(t, false);
    for (var i = 0; i < hooks.length; i++) hooks[i](t);
  }

  // <i data-i="check"></i> → inline SVG icon (stroke = currentColor)
  var ICONS = {
    check: '<path d="M3.2 8.6l3.1 3.1 6.5-7.4"/>',
    cross: '<path d="M4.4 4.4l7.2 7.2M11.6 4.4l-7.2 7.2"/>',
    plus: '<path d="M8 3.5v9M3.5 8h9"/>',
    minus: '<path d="M3.5 8h9"/>',
    arrow: '<path d="M2.5 8h10.5M9 4l4 4-4 4"/>',
    zin: '<circle cx="6.8" cy="6.8" r="4.6"/><path d="M10.2 10.2l3.6 3.6M4.8 6.8h4M6.8 4.8v4"/>',
    zout: '<circle cx="6.8" cy="6.8" r="4.6"/><path d="M10.2 10.2l3.6 3.6M4.8 6.8h4"/>',
    search: '<circle cx="6.8" cy="6.8" r="4.6"/><path d="M10.2 10.2l3.6 3.6"/>',
    warn: '<path d="M8 2.2l6.2 11H1.8z"/><path d="M8 6.5v3M8 11.4v.1"/>',
    shield: '<path d="M8 1.8l5.2 2v4c0 3.2-2.2 5.4-5.2 6.4-3-1-5.2-3.2-5.2-6.4v-4z"/>',
    cursor: '<path d="M3 1.8l9.4 6.1-4.1.9 2.4 4.6-1.9 1-2.4-4.6L3 13z" fill="currentColor" stroke-width="1"/>',
    bolt: '<path d="M9 1.5L3.5 9h4l-1 5.5L12.5 7h-4z" fill="currentColor" stroke-width="1"/>'
  };
  function icons() {
    Array.prototype.forEach.call(document.querySelectorAll('i[data-i]'), function (el) {
      var s = el.getAttribute('data-s') || '14';
      var w = el.getAttribute('data-w') || '2';
      el.outerHTML = '<svg class="ico ' + (el.className || '') + '" viewBox="0 0 16 16" width="' + s + '" height="' + s +
        '" fill="none" stroke="currentColor" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"' +
        (el.id ? ' id="' + el.id + '"' : '') + (el.getAttribute('style') ? ' style="' + el.getAttribute('style') + '"' : '') +
        '>' + ICONS[el.getAttribute('data-i')] + '</svg>';
    });
  }

  function waitAssets() {
    icons();
    var imgs = Array.prototype.slice.call(document.images);
    var bgs = [];
    Array.prototype.forEach.call(document.querySelectorAll('[data-bg]'), function (el) {
      el.style.backgroundImage = 'url("' + el.getAttribute('data-bg') + '")';
      var im = new Image(); im.src = el.getAttribute('data-bg'); bgs.push(im);
    });
    var all = imgs.concat(bgs).map(function (im) {
      return im.decode ? im.decode().catch(function () {}) : Promise.resolve();
    });
    return Promise.all([document.fonts.ready].concat(all));
  }

  function build(fn, opts) {
    for (var k in opts || {}) meta[k] = opts[k];
    waitAssets().then(function () {
      tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out', duration: 0.45 } });
      fn({ tl: tl, count: count, type: type, at: at, D: meta.duration, theme: theme });
      // seamless loop: the whole scene fades up from the bare ground and back
      tl.fromTo('#scene', { opacity: 0 }, { opacity: 1, duration: meta.fadeIn, ease: 'none' }, 0);
      tl.to('#scene', { opacity: 0, duration: meta.fadeOut, ease: 'none' }, meta.duration - meta.fadeOut);
      tl.set({}, {}, meta.duration);

      window.__duration = meta.duration;
      window.__poster = meta.poster != null ? meta.poster : meta.duration * 0.75;
      window.__seek = seek;

      if (qs.has('render')) { seek(0); window.__ready = true; return; }
      if (qs.has('t')) { seek(parseFloat(qs.get('t'))); window.__ready = true; return; }
      var start = performance.now();
      (function loop(now) {
        seek(((now - start) / 1000) % meta.duration);
        requestAnimationFrame(loop);
      })(start);
      window.__ready = true;
    });
  }

  window.Stage = { build: build, theme: theme };
})();
