// Animated publication teasers. Each .teaser-anim holds a light and a dark
// poster <img> (CSS shows the one matching the theme) and one <video> that is
// only given a source once it scrolls near the viewport. The source follows the
// day / night theme; switching themes swaps the file and keeps the playhead, so
// the animation carries on in the other palette. Reduced-motion and Save-Data
// visitors just get the posters.
(function () {
  var items = document.querySelectorAll('.teaser-anim');
  if (!items.length) return;

  var root = document.documentElement;
  var mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saveData = navigator.connection && navigator.connection.saveData;
  if (reduce || saveData || !('IntersectionObserver' in window)) return;

  function theme() {
    if (root.classList.contains('theme-dark')) return 'dark';
    if (root.classList.contains('theme-light')) return 'light';
    return mq && mq.matches ? 'dark' : 'light';
  }

  function srcFor(el, t) {
    return el.getAttribute('data-src').replace('{theme}', t);
  }

  function play(el) {
    var v = el.querySelector('video');
    var p = v.play();
    if (p && p.catch) p.catch(function () {});   // autoplay refused: poster stays
  }

  function load(el, t, at) {
    var v = el.querySelector('video');
    el.classList.remove('is-playing');
    el.setAttribute('data-theme', t);
    v.src = srcFor(el, t);
    if (at) {
      v.addEventListener('loadedmetadata', function seek() {
        v.removeEventListener('loadedmetadata', seek);
        try { v.currentTime = at % (v.duration || at + 1); } catch (e) {}
      });
    }
    if (el.classList.contains('in-view')) play(el);
  }

  Array.prototype.forEach.call(items, function (el) {
    var v = el.querySelector('video');
    v.muted = true;                                // required for autoplay
    v.addEventListener('playing', function () { el.classList.add('is-playing'); });
  });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var el = e.target, v = el.querySelector('video');
      if (e.isIntersecting) {
        el.classList.add('in-view');
        if (!el.getAttribute('data-theme')) load(el, theme());
        else play(el);
      } else {
        el.classList.remove('in-view');
        v.pause();
      }
    });
  }, { rootMargin: '200px 0px' });

  Array.prototype.forEach.call(items, function (el) { io.observe(el); });

  function retheme() {
    var t = theme();
    Array.prototype.forEach.call(items, function (el) {
      var cur = el.getAttribute('data-theme');
      if (!cur || cur === t) return;
      load(el, t, el.querySelector('video').currentTime);
    });
  }

  new MutationObserver(retheme).observe(root, { attributes: true, attributeFilter: ['class'] });
  if (mq) {
    if (mq.addEventListener) mq.addEventListener('change', retheme);
    else if (mq.addListener) mq.addListener(retheme);
  }
})();
