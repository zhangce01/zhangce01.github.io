// Floating back-to-top button: fades in after scrolling down a bit.
(function () {
  var btn = document.getElementById('back-to-top');
  if (!btn) return;

  var ticking = false;
  function update() {
    btn.classList.toggle('show', window.pageYOffset > 480);
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });

  btn.addEventListener('click', function () {
    // older Safari ignores the options-object form of scrollTo
    if ('scrollBehavior' in document.documentElement.style) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo(0, 0);
    }
  });

  update();
})();
