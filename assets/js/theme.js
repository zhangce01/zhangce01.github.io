// Day / night mode toggle. The early inline script in <head> applies the
// stored theme class before first paint; this wires up the button.
(function () {
  var root = document.documentElement;
  var btn = document.getElementById('theme-toggle');
  if (!btn) return;

  function isDark() {
    if (root.classList.contains('theme-dark')) return true;
    if (root.classList.contains('theme-light')) return false;
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function refresh() {
    btn.textContent = isDark() ? '☀️' : '🌙';
    btn.setAttribute('aria-label', isDark() ? 'Switch to light mode' : 'Switch to dark mode');
  }

  btn.addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    root.classList.remove('theme-dark', 'theme-light');
    root.classList.add('theme-' + next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    refresh();
  });

  refresh();
})();
