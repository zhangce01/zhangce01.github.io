// Reading progress: a 2px accent line across the very top of the viewport
// that fills left-to-right as the page scrolls.
(function () {
  var bar = document.createElement('div');
  bar.className = 'scroll-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);

  var ticking = false;
  function update() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var p = max > 0 ? window.pageYOffset / max : 0;
    bar.style.transform = 'scaleX(' + Math.min(Math.max(p, 0), 1) + ')';
    ticking = false;
  }
  function onchange() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }
  window.addEventListener('scroll', onchange, { passive: true });
  window.addEventListener('resize', onchange, { passive: true });
  update();
})();
