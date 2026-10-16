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
    p = Math.min(Math.max(p, 0), 1);
    // never scaleX(0): with a zero-width layer on top, Chrome drops the
    // avatar's round clip at the very top of the page (it turns square).
    // At the top the bar is hidden instead.
    bar.style.transform = 'scaleX(' + Math.max(p, 0.001) + ')';
    bar.style.visibility = p > 0 ? 'visible' : 'hidden';
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
