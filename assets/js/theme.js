// Day / night mode toggle. The early inline script in <head> applies the
// stored theme class before first paint; this wires up the button.
(function () {
  var root = document.documentElement;
  var btn = document.getElementById('theme-toggle');
  if (!btn) return;

  var MOON = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
  var SUN = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>';

  function isDark() {
    if (root.classList.contains('theme-dark')) return true;
    if (root.classList.contains('theme-light')) return false;
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function refresh() {
    btn.innerHTML = isDark() ? SUN : MOON;
    btn.setAttribute('aria-label', isDark() ? 'Switch to light mode' : 'Switch to dark mode');
  }

  // Safari sometimes leaves fixed / composited layers (blobs, glass bars,
  // body::before) painted with the old theme until the next scroll. Hiding
  // the root for one synchronous layout pass rebuilds every layer.
  function forceRepaint() {
    var y = window.pageYOffset;
    var x = window.pageXOffset;
    root.style.display = 'none';
    void root.offsetHeight;
    root.style.display = '';
    if (window.pageYOffset !== y || window.pageXOffset !== x) {
      // restore instantly — html has scroll-behavior: smooth in CSS
      root.style.scrollBehavior = 'auto';
      window.scrollTo(x, y);
      root.style.scrollBehavior = '';
    }
  }

  function apply(mode) {
    root.classList.remove('theme-dark', 'theme-light');
    if (mode === 'dark' || mode === 'light') root.classList.add('theme-' + mode);
    refresh();
    forceRepaint();
  }

  btn.addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    try { localStorage.setItem('theme', next); } catch (e) {}
    apply(next);
  });

  // theme changed in another tab / page of the site
  window.addEventListener('storage', function (ev) {
    if (ev.key === 'theme') apply(ev.newValue);
  });

  refresh();
})();
