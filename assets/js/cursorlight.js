// Cursor spotlight: eases --mx/--my toward the pointer so the accent-dot
// reveal in .cursor-light trails the mouse with a little inertia.
(function () {
  if (window.matchMedia && matchMedia('(pointer: coarse)').matches) return;
  var el = document.querySelector('.cursor-light');
  if (!el) return;

  var tx = 0, ty = 0, x = 0, y = 0, raf = null, seen = false;

  function tick() {
    x += (tx - x) * 0.16;
    y += (ty - y) * 0.16;
    el.style.setProperty('--mx', x.toFixed(1) + 'px');
    el.style.setProperty('--my', y.toFixed(1) + 'px');
    if (Math.abs(tx - x) > 0.5 || Math.abs(ty - y) > 0.5) {
      raf = requestAnimationFrame(tick);
    } else {
      raf = null;
    }
  }

  window.addEventListener('mousemove', function (e) {
    tx = e.clientX;
    ty = e.clientY;
    if (!seen) {
      seen = true;
      x = tx;
      y = ty;
      el.style.opacity = '1';
    }
    if (!raf) raf = requestAnimationFrame(tick);
  }, { passive: true });

  // fade out when the pointer leaves the window
  document.documentElement.addEventListener('mouseleave', function () {
    el.style.opacity = '0';
  });
  document.documentElement.addEventListener('mouseenter', function () {
    if (seen) el.style.opacity = '1';
  });
})();
