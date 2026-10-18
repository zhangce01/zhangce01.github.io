// Click-to-enlarge for the animated publication teasers. Hovering a teaser shows
// a zoom-in cursor; clicking (or Enter / Space) opens the same animation, in the
// current day / night palette, large in a lightbox from its high-resolution
// <slug>-<theme>-hd.mp4 (see _anim/render.py), picking up where the small one
// was. A click anywhere, the close button or Esc dismisses it. Reduced-motion and
// Save-Data visitors get the video paused with controls instead of autoplay.
(function () {
  var items = document.querySelectorAll('.teaser-anim');
  if (!items.length) return;

  var root = document.documentElement;
  var mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  var still = (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) ||
              (navigator.connection && navigator.connection.saveData);

  function theme() {
    if (root.classList.contains('theme-dark')) return 'dark';
    if (root.classList.contains('theme-light')) return 'light';
    return mq && mq.matches ? 'dark' : 'light';
  }

  var box = null, opener = null;

  function close() {
    if (!box) return;
    var b = box;
    box = null;
    b.classList.remove('is-open');
    document.removeEventListener('keydown', onKey);
    root.classList.remove('teaser-lightbox-lock');
    setTimeout(function () {
      var v = b.querySelector('video');
      if (v) { v.pause(); v.removeAttribute('src'); v.load(); }
      if (b.parentNode) b.parentNode.removeChild(b);
    }, 250);
    if (opener) opener.focus({ preventScroll: true });
  }

  function onKey(e) {
    if (e.key === 'Escape') close();
  }

  function open(el) {
    if (box) return;
    opener = el;
    var t = theme();
    var poster = el.querySelector(t === 'dark' ? '.ta-dark' : '.ta-light');
    var small = el.querySelector('video');

    box = document.createElement('div');
    box.className = 'teaser-lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', poster ? poster.alt : 'Enlarged animation');
    box.innerHTML =
      '<div class="tl-frame"><video loop playsinline disablepictureinpicture></video></div>' +
      '<button type="button" class="tl-close" aria-label="Close"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>';

    var v = box.querySelector('video');
    v.muted = true;
    if (poster) v.poster = poster.currentSrc || poster.src;
    if (still) v.controls = true;
    // the 1440x900 / 60 fps cut of the same animation; the small file if it is missing
    var base = el.getAttribute('data-src').replace('{theme}', t);
    v.src = base.replace(/\.mp4$/, '-hd.mp4');
    v.addEventListener('error', function fallback() {
      v.removeEventListener('error', fallback);
      v.src = base;
      if (!still) { var q = v.play(); if (q && q.catch) q.catch(function () {}); }
    });

    // continue from the small teaser's playhead when it shows the same palette
    var at = small && small.currentSrc && small.currentSrc.indexOf(t + '.mp4') > -1 ? small.currentTime : 0;
    if (at) {
      v.addEventListener('loadedmetadata', function seek() {
        v.removeEventListener('loadedmetadata', seek);
        try { v.currentTime = at % (v.duration || at + 1); } catch (e) {}
      });
    }
    if (!still) {
      var p = v.play();
      // autoplay refused (e.g. Low Power Mode): let the visitor press play
      if (p && p.catch) p.catch(function (err) { if (err && err.name === 'NotAllowedError') v.controls = true; });
    }

    // any click closes, except on a video that is showing its native controls
    box.addEventListener('click', function (e) {
      if (v.controls && e.target === v) return;
      close();
    });

    document.body.appendChild(box);
    root.classList.add('teaser-lightbox-lock');
    document.addEventListener('keydown', onKey);
    box.offsetWidth;                                // commit start state for the fade
    box.classList.add('is-open');
    box.querySelector('.tl-close').focus({ preventScroll: true });
  }

  Array.prototype.forEach.call(items, function (el) {
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    var img = el.querySelector('img');
    el.setAttribute('aria-label', 'Enlarge animation' + (img && img.alt ? ': ' + img.alt : ''));
    el.addEventListener('click', function () { open(el); });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(el); }
    });
  });
})();
